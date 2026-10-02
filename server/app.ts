import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { getAddress, isAddress, verifyMessage } from 'viem';
import { createSiweMessage } from 'viem/siwe';
import { z } from 'zod';
import { OrderDatabase } from './database.ts';
import type { Session } from './database.ts';
import type { Client } from '@libsql/client';
import { decrypt, encrypt, PublicError, XClient } from './x.ts';
import type { XConfig } from './x.ts';
import { reviewSubmission, saveMission, submitEvidence } from '../src/lib/model.ts';
import type { Mission, Status } from '../src/lib/model.ts';
import type { FastifyRequest, FastifyReply } from 'fastify';

export type ServerConfig = {
  origin: string;
  database: string;
  databaseToken?: string;
  key: Buffer;
  clientId: string;
  clientSecret: string;
  keepers: string[];
};
const random = () => randomBytes(32).toString('hex');
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const missionSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(100),
  description: z.string().min(20).max(2000),
  category: z.enum(['Content', 'Community', 'Testing']),
  points: z.number().int().min(1).max(1000),
  effort: z.string().min(1).max(40),
  requirements: z.array(z.string().min(1).max(300)).min(1).max(8),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  archived: z.boolean(),
  verification: z.enum(['manual', 'x_post', 'x_reply']).default('manual'),
  targetPostId: z.string().regex(/^\d+$/).optional(),
  requiredText: z.string().max(100).optional(),
});

export async function buildServer(
  config: ServerConfig,
  xFetch: typeof fetch = fetch,
  databaseClient?: Client,
) {
  const app = Fastify({ logger: false, bodyLimit: 32 * 1024 });
  const database = await OrderDatabase.open(config.database, config.databaseToken, databaseClient);
  const origin = new URL(config.origin);
  const xConfig: XConfig = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    callback: new URL('/api/auth/x/callback', origin).href,
    key: config.key,
  };
  const x = new XClient(xConfig, xFetch);
  const keeperWallets = new Set(config.keepers.map((a) => a.toLowerCase()));
  const refreshes = new Map<string, Promise<string>>();
  await app.register(cookie);
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.addHook('onClose', async () => database.db.close());
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.headers.origin !== origin.origin)
        throw new PublicError('This request came from an unrecognized origin.', 403);
      if (!req.headers['content-type']?.startsWith('application/json'))
        throw new PublicError('Use a JSON request.', 415);
      const session = await getSession(req);
      if (!session || req.headers['x-csrf-token'] !== session.csrf)
        throw new PublicError('Your session changed. Refresh the page and try again.', 403);
    }
  });
  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof PublicError)
      return reply.code(error.status).send({ error: error.message });
    if (error instanceof z.ZodError)
      return reply.code(400).send({ error: 'Check the information and try again.' });
    if ((error as { code?: string }).code?.startsWith('SQLITE_CONSTRAINT'))
      return reply.code(409).send({ error: 'This account or evidence is already registered.' });
    const code = (error as { statusCode?: number }).statusCode;
    return reply.code(code && code < 500 ? code : 500).send({
      error:
        code === 429
          ? 'Too many attempts. Please try again shortly.'
          : 'We could not complete this request. Please try again.',
    });
  });
  async function getSession(req: FastifyRequest) {
    const raw = req.cookies.order_session;
    return raw ? await database.session(digest(raw)) : undefined;
  }
  async function issueSession(reply: FastifyReply, wallet: string | null) {
    const raw = random(),
      id = digest(raw),
      csrf = random();
    await database.prune();
    await database.db
      .prepare('INSERT INTO sessions(id,wallet,csrf,expires) VALUES(?,?,?,?)')
      .run(id, wallet, csrf, Date.now() + sessionLifetime);
    reply.setCookie('order_session', raw, {
      httpOnly: true,
      sameSite: 'lax',
      secure: origin.protocol === 'https:',
      path: '/',
      maxAge: sessionLifetime / 1000,
    });
    return { id, wallet, csrf, expires: Date.now() + sessionLifetime } satisfies Session;
  }
  async function requireMember(req: FastifyRequest, complete = false) {
    const session = await getSession(req);
    if (!session?.wallet) throw new PublicError('Sign in with your wallet to continue.', 401);
    const member = await database.member(session.wallet);
    if (!member) throw new PublicError('Sign in again to continue.', 401);
    if (complete && !member.x_id)
      throw new PublicError('Connect both your wallet and X before submitting a mission.', 403);
    return { session, member };
  }
  async function requireKeeper(req: FastifyRequest) {
    const identity = await requireMember(req, true);
    if (!keeperWallets.has(identity.member.wallet))
      throw new PublicError('This action is available to Keepers only.', 403);
    return identity;
  }
  async function domain<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      throw new PublicError((e as Error).message);
    }
  }
  async function snapshot(session: Session) {
    const member = session.wallet ? await database.member(session.wallet) : undefined;
    return {
      csrf: session.csrf,
      authenticated: !!member,
      ready: !!member?.x_id,
      isKeeper: !!member && keeperWallets.has(member.wallet),
      config: { xConfigured: !!config.clientId, walletType: 'evm' },
      profile: member
        ? {
            wallet: getAddress(member.wallet),
            chainId: member.chain,
            name: member.name,
            createdAt: member.created_at,
            x: member.x_id
              ? {
                  id: member.x_id,
                  username: member.x_username,
                  name: member.x_name,
                  linkedAt: member.linked_at,
                }
              : null,
          }
        : null,
    };
  }
  async function accessToken(wallet: string) {
    const member = await database.member(wallet);
    if (!member?.tokens) throw new PublicError('Reconnect X in your profile.', 401);
    const stored = decrypt(member.tokens, config.key);
    if (stored.expires_at > Date.now() + 60000) return stored.access_token;
    if (!stored.refresh_token)
      throw new PublicError('Your X authorization expired. Reconnect X in your profile.', 401);
    if (refreshes.has(wallet)) return refreshes.get(wallet)!;
    const refresh = (async () => {
      // A database lease also coordinates rotating refresh tokens across Vercel instances.
      const owner = randomUUID();
      const deadline = Date.now() + 21000;
      while (Date.now() < deadline) {
        const lock = await database.db
          .prepare(
            'INSERT INTO token_refresh_locks(wallet,owner,expires) VALUES(?,?,?) ON CONFLICT(wallet) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE token_refresh_locks.expires<? RETURNING owner',
          )
          .get(wallet, owner, Date.now() + 20000, Date.now());
        if (!lock) {
          await delay(200);
          continue;
        }
        try {
          const current = await database.member(wallet);
          if (!current?.tokens) throw new PublicError('Reconnect X in your profile.', 401);
          const latest = decrypt(current.tokens, config.key);
          if (latest.expires_at > Date.now() + 60000) return latest.access_token;
          if (!latest.refresh_token)
            throw new PublicError(
              'Your X authorization expired. Reconnect X in your profile.',
              401,
            );
          const next = await x.token({
            grant_type: 'refresh_token',
            refresh_token: latest.refresh_token,
          });
          next.refresh_token ||= latest.refresh_token;
          // A concurrent OAuth reconnection owns its newer credentials.
          const updated = await database.db
            .prepare('UPDATE members SET tokens=? WHERE wallet=? AND tokens=? RETURNING wallet')
            .get(encrypt(next, config.key), wallet, current.tokens);
          if (updated) return next.access_token;
          const reconnected = await database.member(wallet);
          if (!reconnected?.tokens) throw new PublicError('Reconnect X in your profile.', 401);
          return decrypt(reconnected.tokens, config.key).access_token;
        } finally {
          await database.db
            .prepare('DELETE FROM token_refresh_locks WHERE wallet=? AND owner=?')
            .run(wallet, owner);
        }
      }
      throw new PublicError('X authorization is being renewed. Please try again shortly.', 503);
    })();
    refreshes.set(wallet, refresh);
    try {
      return await refresh;
    } finally {
      refreshes.delete(wallet);
    }
  }
  app.get('/api/health', async () => ({ ok: true }));
  app.get(
    '/api/session',
    async (req, reply) =>
      await snapshot((await getSession(req)) || (await issueSession(reply, null))),
  );
  app.post(
    '/api/auth/challenge',
    { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } },
    async (req) => {
      const body = z
        .object({
          address: z.string().refine((a) => isAddress(a)),
          chainId: z.number().int().min(1).max(2147483647),
        })
        .parse(req.body);
      const session = (await getSession(req))!;
      const expires = Date.now() + 5 * 60 * 1000;
      const message = createSiweMessage({
        address: getAddress(body.address),
        chainId: body.chainId,
        domain: origin.host,
        uri: origin.origin,
        version: '1',
        nonce: random(),
        statement: 'Sign in to The Order of Steering.',
        issuedAt: new Date(),
        expirationTime: new Date(expires),
      });
      await database.db
        .prepare(
          'INSERT INTO challenges(session,message,expires) VALUES(?,?,?) ON CONFLICT(session) DO UPDATE SET message=excluded.message,expires=excluded.expires',
        )
        .run(session.id, message, expires);
      return { message };
    },
  );
  app.post(
    '/api/auth/verify',
    { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = z
        .object({
          message: z.string().max(2500),
          signature: z
            .string()
            .regex(/^0x[0-9a-fA-F]+$/)
            .max(1500),
        })
        .parse(req.body);
      const session = (await getSession(req))!;
      const challenge = await database.db
        .prepare('DELETE FROM challenges WHERE session=? RETURNING message,expires')
        .get(session.id);
      if (
        !challenge ||
        (challenge.expires as number) < Date.now() ||
        challenge.message !== body.message
      )
        throw new PublicError('This sign-in request expired. Request a new signature.', 401);
      // The complete server-issued message is compared above, binding domain, URI, chain, nonce and expiration.
      const lines = body.message.split('\n');
      const address = lines[1];
      if (
        !isAddress(address) ||
        !(await verifyMessage({
          address: getAddress(address),
          message: body.message,
          signature: body.signature as `0x${string}`,
        }))
      )
        throw new PublicError('The wallet signature could not be verified.', 401);
      const wallet = address.toLowerCase();
      const chain = Number(body.message.match(/Chain ID: (\d+)/)?.[1]);
      if (!(await database.session(session.id)))
        throw new PublicError('Your session ended. Request a new signature.', 401);
      await database.db
        .prepare(
          'INSERT INTO members(wallet,name,chain,created_at) VALUES(?,?,?,?) ON CONFLICT(wallet) DO UPDATE SET chain=excluded.chain',
        )
        .run(wallet, 'Acolyte', chain, new Date().toISOString());
      await database.db.prepare('DELETE FROM sessions WHERE id=?').run(session.id);
      const next = await issueSession(reply, wallet);
      await database.audit(wallet, 'sign_in', wallet);
      return await snapshot(next);
    },
  );
  app.post('/api/auth/logout', async (req, reply) => {
    const session = (await getSession(req))!;
    await database.db.prepare('DELETE FROM sessions WHERE id=?').run(session.id);
    return await snapshot(await issueSession(reply, null));
  });
  app.post('/api/auth/x/start', async (req) => {
    const { session, member } = await requireMember(req);
    if (!config.clientId)
      throw new PublicError('X linking is not available yet. Please try again later.', 503);
    const state = random(),
      verifier = random();
    await database.db.prepare('DELETE FROM oauth WHERE session=?').run(session.id);
    await database.db
      .prepare('INSERT INTO oauth(state,session,wallet,verifier,expires) VALUES(?,?,?,?,?)')
      .run(state, session.id, member.wallet, verifier, Date.now() + 10 * 60 * 1000);
    const url = new URL('https://x.com/i/oauth2/authorize');
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: xConfig.callback,
      scope: 'users.read tweet.read offline.access',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return { url: url.href };
  });
  app.get('/api/auth/x/callback', async (req, reply) => {
    const query = z
      .object({
        state: z.string().max(100),
        code: z.string().max(2000).optional(),
        error: z.string().max(200).optional(),
      })
      .safeParse(req.query);
    const session = await getSession(req);
    if (!query.success || !session?.wallet)
      return reply.redirect(origin.origin + '/#/app/profile?connection=expired');
    const pending = await database.db
      .prepare(
        'DELETE FROM oauth WHERE state=? AND session=? AND wallet=? RETURNING verifier,expires',
      )
      .get(query.data.state, session.id, session.wallet);
    if (!pending || (pending.expires as number) < Date.now())
      return reply.redirect(origin.origin + '/#/app/profile?connection=expired');
    if (query.data.error || !query.data.code)
      return reply.redirect(origin.origin + '/#/app/profile?connection=declined');
    try {
      const tokens = await x.token({
        grant_type: 'authorization_code',
        code: query.data.code,
        redirect_uri: xConfig.callback,
        code_verifier: pending.verifier as string,
      });
      const account = await x.me(tokens.access_token);
      const outcome = await database.transaction(async () => {
        const current = (await database.member(session.wallet!))!;
        if (current.x_id && current.x_id !== account.id) return 'different';
        const duplicate = await database.db
          .prepare('SELECT wallet FROM members WHERE x_id=? AND wallet!=?')
          .get(account.id, session.wallet);
        if (duplicate) return 'used';
        // A sign-out or account change during the exchange must invalidate this callback.
        if ((await database.session(session.id))?.wallet !== session.wallet) return 'expired';
        await database.db
          .prepare(
            'UPDATE members SET x_id=?,x_username=?,x_name=?,tokens=?,linked_at=? WHERE wallet=?',
          )
          .run(
            account.id,
            account.username,
            account.name,
            encrypt(tokens, config.key),
            new Date().toISOString(),
            session.wallet!,
          );
        await database.audit(session.wallet!, 'x_link', account.id);
        return 'success';
      });
      return reply.redirect(origin.origin + '/#/app/profile?connection=' + outcome);
    } catch {
      return reply.redirect(origin.origin + '/#/app/profile?connection=failed');
    }
  });
  app.get('/api/state', async (req) => {
    const session = await getSession(req);
    const state = await database.state(session?.wallet || undefined);
    return {
      state,
      keeperSubmissions:
        session?.wallet &&
        keeperWallets.has(session.wallet) &&
        (await database.member(session.wallet))?.x_id
          ? await database.submissions()
          : [],
    };
  });
  app.post('/api/profile', async (req) => {
    const { member } = await requireMember(req);
    const body = z.object({ name: z.string().trim().min(1).max(40) }).parse(req.body);
    await database.db
      .prepare('UPDATE members SET name=? WHERE wallet=?')
      .run(body.name, member.wallet);
    return { ok: true };
  });
  app.post('/api/submissions', async (req) => {
    const { member, session } = await requireMember(req, true);
    const body = z
      .object({
        missionId: z.string().max(80),
        url: z.string().max(2048),
        description: z.string().min(20).max(2000),
      })
      .parse(req.body);
    const mission = (await database.missions()).find((m) => m.id === body.missionId);
    if (!mission) throw new PublicError('Mission not found.', 404);
    // Validate before any paid X lookup. Browser-supplied status and points are never accepted.
    const id = randomUUID();
    const proposed = (
      await domain(async () =>
        submitEvidence(
          await database.state(member.wallet),
          mission.id,
          body.url,
          body.description,
          id,
          new Date().toISOString(),
        ),
      )
    ).submissions[0];
    if (mission.verification && mission.verification !== 'manual') {
      const result = await x.verifyPost(
        mission,
        proposed.url,
        member.x_id!,
        await accessToken(member.wallet),
      );
      proposed.verificationSource = result.source;
      proposed.url = `https://x.com/i/web/status/${result.postId}`;
      proposed.reason =
        'X confirmed the connected author and mission criteria. Awaiting a Keepers quality review.';
    }
    return await database.transaction(async () => {
      if ((await database.session(session.id))?.wallet !== member.wallet)
        throw new PublicError('Your session ended. Sign in again.', 401);
      // Re-read under a write lock after external I/O so concurrent submissions cannot double-credit a mission.
      if (
        JSON.stringify((await database.missions()).find((m) => m.id === mission.id)) !==
        JSON.stringify(mission)
      )
        throw new PublicError(
          'The mission changed during verification. Check its requirements and try again.',
          409,
        );
      const current = (
        await domain(async () =>
          submitEvidence(
            await database.state(member.wallet),
            mission.id,
            proposed.url,
            body.description,
            id,
            new Date().toISOString(),
          ),
        )
      ).submissions[0];
      Object.assign(current, {
        wallet: getAddress(member.wallet),
        xUsername: member.x_username || '',
        verificationSource: proposed.verificationSource,
        reason: proposed.reason,
      });
      try {
        await database.putSubmission(current, member.wallet);
      } catch {
        throw new PublicError('This evidence has already been submitted.', 409);
      }
      await database.audit(member.wallet, 'submit', id);
      return { ok: true };
    });
  });
  app.post('/api/keepers/missions', async (req) => {
    const { member } = await requireKeeper(req);
    const mission = missionSchema.parse(req.body) as Mission;
    if (mission.verification === 'x_reply' && !mission.targetPostId)
      throw new PublicError('Add the target X post ID for a reply mission.');
    return database.transaction(async () => {
      const next = (
        await domain(async () => saveMission(await database.state(), mission))
      ).missions.find((m) => m.id === mission.id)!;
      await database.putMission(next);
      await database.audit(member.wallet, 'mission_save', mission.id);
      return { ok: true };
    });
  });
  app.post('/api/keepers/archive', async (req) => {
    const { member } = await requireKeeper(req);
    const { id, archived } = z
      .object({ id: z.string().max(80), archived: z.boolean() })
      .parse(req.body);
    return database.transaction(async () => {
      const mission = (await database.missions()).find((m) => m.id === id);
      if (!mission) throw new PublicError('Mission not found.', 404);
      await database.putMission({ ...mission, archived });
      await database.audit(member.wallet, 'mission_archive', id);
      return { ok: true };
    });
  });
  app.post('/api/keepers/review', async (req) => {
    const { member } = await requireKeeper(req);
    const body = z
      .object({
        id: z.string().max(80),
        status: z.enum(['verified', 'review', 'rejected']),
        reason: z.string().min(10).max(1000),
      })
      .parse(req.body);
    return await database.transaction(async () => {
      const row = await database.db
        .prepare('SELECT wallet FROM submissions WHERE id=?')
        .get(body.id);
      if (!row) throw new PublicError('Submission not found.', 404);
      const state = await database.state(row.wallet as string);
      const updated = (
        await domain(async () =>
          reviewSubmission(
            state,
            body.id,
            body.status as Exclude<Status, 'pending'>,
            body.reason,
            new Date().toISOString(),
          ),
        )
      ).submissions.find((s) => s.id === body.id)!;
      await database.putSubmission(updated, row.wallet as string);
      await database.audit(member.wallet, 'review_' + body.status, body.id);
      return { ok: true };
    });
  });
  app.post('/api/keepers/reward-register', async (req) => {
    await requireKeeper(req);
    const rows = await database.db
      .prepare('SELECT wallet,name,x_id,x_username FROM members WHERE x_id IS NOT NULL')
      .all();
    return {
      members: await Promise.all(
        rows.map(async (m) => ({
          wallet: getAddress(m.wallet as string),
          name: m.name,
          xId: m.x_id,
          xUsername: m.x_username,
          points: (await database.submissions(m.wallet as string)).reduce(
            (sum, s) => sum + (s.status === 'verified' ? s.points : 0),
            0,
          ),
        })),
      ),
    };
  });
  return { app, database };
}
