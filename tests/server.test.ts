import test from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { buildServer } from '../server/app.ts';
import { decrypt, encrypt } from '../server/x.ts';
import { initialState } from '../src/lib/model.ts';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
const origin = 'http://127.0.0.1:5173';
const keeper = privateKeyToAccount(('0x' + '1'.repeat(64)) as `0x${string}`);
const member = privateKeyToAccount(('0x' + '2'.repeat(64)) as `0x${string}`);
const other = privateKeyToAccount(('0x' + '3'.repeat(64)) as `0x${string}`);
type Built = Awaited<ReturnType<typeof buildServer>>;
function fixture(xConfigured = true) {
  let activeX = '101',
    postAuthor = '101',
    replyTarget = '900',
    xStatus = 200,
    tokenCalls = 0;
  const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith('/oauth2/token')) {
      tokenCalls++;
      if (String(init?.body).includes('refresh_token=')) await delay(50);
      assert.ok(
        String(init?.body).includes('code_verifier=') ||
          String(init?.body).includes('refresh_token='),
      );
      return Response.json({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 7200,
        scope: 'users.read tweet.read offline.access',
      });
    }
    if (url.endsWith('/users/me'))
      return Response.json({
        data: { id: activeX, username: 'member' + activeX, name: 'Test Member' },
      });
    if (url.includes('/tweets/'))
      return Response.json(
        {
          data: {
            id: '800',
            author_id: postAuthor,
            text: 'An original contribution to The Order of Steering',
            referenced_tweets: [{ type: 'replied_to', id: replyTarget }],
          },
        },
        { status: xStatus },
      );
    throw new Error('Unexpected X test request ' + url);
  }) as typeof fetch;
  return {
    create: (database = ':memory:') =>
      buildServer(
        {
          origin,
          database,
          key: Buffer.alloc(32, 4),
          clientId: xConfigured ? 'test-client' : '',
          clientSecret: 'test-secret',
          keepers: [keeper.address],
        },
        fakeFetch,
        process.env.ORDER_TEST_STORAGE === 'libsql'
          ? createClient({
              url:
                database === ':memory:' ? 'file::memory:' : pathToFileURL(resolve(database)).href,
            })
          : undefined,
      ),
    setX: (id: string) => {
      activeX = id;
    },
    setPost: (author: string, target = '900', status = 200) => {
      postAuthor = author;
      replyTarget = target;
      xStatus = status;
    },
    tokenCalls: () => tokenCalls,
  };
}
function client(built: Built) {
  let cookie = '',
    csrf = '';
  async function send(
    method: 'GET' | 'POST',
    url: string,
    payload?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await built.app.inject({
      method,
      url,
      headers: {
        cookie,
        origin,
        'x-csrf-token': csrf,
        ...(method === 'POST' ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      payload: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
    });
    const set = response.cookies.find((c) => c.name === 'order_session');
    if (set) cookie = 'order_session=' + set.value;
    if (response.headers['content-type']?.includes('application/json')) {
      const body = response.json();
      if (body.csrf) csrf = body.csrf;
    }
    return response;
  }
  return {
    send,
    async initialize() {
      await send('GET', '/api/session');
    },
    async login(account = member) {
      await this.initialize();
      const challenge = (
        await send('POST', '/api/auth/challenge', { address: account.address, chainId: 1 })
      ).json();
      const signature = await account.signMessage({ message: challenge.message });
      const response = await send('POST', '/api/auth/verify', {
        message: challenge.message,
        signature,
      });
      assert.equal(response.statusCode, 200, response.body);
      return { message: challenge.message, signature, response };
    },
    async link() {
      const start = await send('POST', '/api/auth/x/start');
      assert.equal(start.statusCode, 200, start.body);
      const url = new URL(start.json().url);
      assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
      const response = await send(
        'GET',
        '/api/auth/x/callback?state=' + url.searchParams.get('state') + '&code=test-code',
      );
      return response;
    },
  };
}
test('SIWE establishes an HttpOnly session; domain tampering, invalid signatures and replays are rejected', async () => {
  const built = await fixture().create();
  try {
    const c = client(built);
    const signed = await c.login();
    assert.match(signed.response.headers['set-cookie'] as string, /HttpOnly/);
    assert.match(signed.response.headers['set-cookie'] as string, /SameSite=Lax/);
    assert.equal(signed.response.json().profile.wallet, member.address);
    assert.equal(signed.response.json().ready, false);
    const replay = await c.send('POST', '/api/auth/verify', {
      message: signed.message,
      signature: signed.signature,
    });
    assert.equal(replay.statusCode, 401);
    const challenge = (
      await c.send('POST', '/api/auth/challenge', { address: member.address, chainId: 1 })
    ).json();
    const message = challenge.message.replace('127.0.0.1:5173', 'evil.example');
    assert.equal(
      (
        await c.send('POST', '/api/auth/verify', {
          message,
          signature: await member.signMessage({ message }),
        })
      ).statusCode,
      401,
    );
    const another = (
      await c.send('POST', '/api/auth/challenge', { address: member.address, chainId: 1 })
    ).json();
    assert.equal(
      (
        await c.send('POST', '/api/auth/verify', {
          message: another.message,
          signature: await other.signMessage({ message: another.message }),
        })
      ).statusCode,
      401,
    );
  } finally {
    await built.app.close();
  }
});
test('CSRF, missing wallet, missing X and missing Keeper role block writes', async () => {
  const built = await fixture(false).create();
  try {
    const c = client(built);
    await c.initialize();
    const body = {
      missionId: 'test-app',
      url: 'https://example.com/report',
      description: 'An original report with enough detail.',
    };
    assert.equal((await c.send('POST', '/api/submissions', body)).statusCode, 401);
    assert.equal(
      (
        await c.send(
          'POST',
          '/api/auth/challenge',
          { address: member.address, chainId: 1 },
          { origin: 'https://evil.example' },
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await c.send(
          'POST',
          '/api/auth/challenge',
          { address: member.address, chainId: 1 },
          { 'x-csrf-token': 'forged' },
        )
      ).statusCode,
      403,
    );
    await c.login();
    assert.equal((await c.send('POST', '/api/submissions', body)).statusCode, 403);
    assert.equal((await c.send('POST', '/api/auth/x/start')).statusCode, 503);
    assert.equal(
      (await c.send('POST', '/api/keepers/missions', initialState().missions[0])).statusCode,
      403,
    );
  } finally {
    await built.app.close();
  }
});
test('OAuth is bound to session and state, is single use, and prevents X account reuse between wallets', async () => {
  const f = fixture();
  const built = await f.create();
  try {
    const a = client(built),
      b = client(built);
    await a.login();
    await b.login(other);
    const start = new URL((await a.send('POST', '/api/auth/x/start')).json().url);
    const state = start.searchParams.get('state');
    const attack = await b.send('GET', '/api/auth/x/callback?state=' + state + '&code=test-code');
    assert.match(attack.headers.location as string, /expired/);
    assert.equal(f.tokenCalls(), 0);
    const linked = await a.send('GET', '/api/auth/x/callback?state=' + state + '&code=test-code');
    assert.match(linked.headers.location as string, /success/);
    assert.equal((await a.send('GET', '/api/session')).json().profile.x.id, '101');
    assert.equal(f.tokenCalls(), 1);
    assert.match(
      (await a.send('GET', '/api/auth/x/callback?state=' + state + '&code=test-code')).headers
        .location as string,
      /expired/,
    );
    assert.equal(f.tokenCalls(), 1);
    assert.match((await b.link()).headers.location as string, /used/);
    assert.equal((await b.send('GET', '/api/session')).json().ready, false);
    const stored = (await built.database.member(member.address.toLowerCase()))!.tokens!;
    assert.ok(!stored.includes('test-access-token'));
    assert.equal(decrypt(stored, Buffer.alloc(32, 4)).access_token, 'test-access-token');
  } finally {
    await built.app.close();
  }
});
test('profile data is isolated; approved points and reward recipients are server controlled and cannot be double credited', async () => {
  const f = fixture(),
    built = await f.create();
  try {
    const a = client(built),
      k = client(built),
      b = client(built);
    await a.login();
    await a.link();
    await k.login(keeper);
    f.setX('202');
    await k.link();
    await b.login(other);
    f.setX('303');
    await b.link();
    const body = {
      missionId: 'test-app',
      url: 'https://example.com/contribution',
      description: 'A thoughtful original contribution with clear evidence.',
      points: 99999,
      status: 'verified',
      wallet: keeper.address,
    };
    assert.equal((await a.send('POST', '/api/submissions', body)).statusCode, 200);
    const state = (await a.send('GET', '/api/state')).json().state;
    assert.equal(state.submissions[0].points, 150);
    assert.equal(state.submissions[0].status, 'pending');
    assert.equal(state.submissions[0].wallet, member.address);
    assert.equal((await b.send('GET', '/api/state')).json().state.submissions.length, 0);
    assert.equal(
      (
        await a.send('POST', '/api/keepers/review', {
          id: state.submissions[0].id,
          status: 'verified',
          reason: 'All requirements have been checked.',
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await k.send('POST', '/api/keepers/review', {
          id: state.submissions[0].id,
          status: 'verified',
          reason: 'All requirements have been checked.',
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await k.send('POST', '/api/keepers/review', {
          id: state.submissions[0].id,
          status: 'verified',
          reason: 'Trying to repeat the point award.',
        })
      ).statusCode,
      400,
    );
    const register = (await k.send('POST', '/api/keepers/reward-register')).json();
    assert.equal(
      register.members.find((m: { wallet: string }) => m.wallet === member.address).points,
      150,
    );
    assert.equal((await a.send('POST', '/api/submissions', body)).statusCode, 400);
    assert.equal((await b.send('POST', '/api/submissions', body)).statusCode, 409);
    await a.send('POST', '/api/auth/logout');
    assert.equal((await a.send('GET', '/api/state')).json().state.submissions.length, 0);
    await a.login();
    assert.equal(
      (await a.send('GET', '/api/state')).json().state.submissions[0].status,
      'verified',
    );
  } finally {
    await built.app.close();
  }
});
test('X verification checks the immutable account ID, reply target and required text, and never accepts an API failure as evidence', async () => {
  const f = fixture(),
    built = await f.create();
  try {
    const c = client(built);
    await c.login();
    await c.link();
    const mission = {
      ...initialState().missions[0],
      id: 'x-reply',
      verification: 'x_reply' as const,
      targetPostId: '900',
      requiredText: 'Order of Steering',
    };
    await built.database.putMission(mission);
    const body = {
      missionId: mission.id,
      url: 'https://x.com/someone/status/800',
      description: 'I wrote a considered reply to the mission target.',
    };
    f.setPost('999');
    assert.equal((await c.send('POST', '/api/submissions', body)).statusCode, 400);
    f.setPost('101', '901');
    assert.equal((await c.send('POST', '/api/submissions', body)).statusCode, 400);
    f.setPost('101', '900', 429);
    assert.equal((await c.send('POST', '/api/submissions', body)).statusCode, 503);
    assert.equal((await built.database.submissions()).length, 0);
    f.setPost('101');
    assert.equal((await c.send('POST', '/api/submissions', body)).statusCode, 200);
    const submission = (await built.database.submissions())[0];
    assert.equal(submission.status, 'pending');
    assert.match(submission.verificationSource!, /author 101/);
    assert.equal(submission.url, 'https://x.com/i/web/status/800');
    await built.database.putMission({ ...mission, id: 'another-social-mission' });
    assert.equal(
      (
        await c.send('POST', '/api/submissions', {
          ...body,
          missionId: 'another-social-mission',
          url: 'https://twitter.com/another-name/status/800',
        })
      ).statusCode,
      400,
    );
    assert.equal((await built.database.submissions()).length, 1);
    const invalid = {
      ...mission,
      id: 'x-post',
      verification: 'x_post' as const,
      requiredText: 'This phrase is missing',
    };
    await built.database.putMission(invalid);
    assert.equal(
      (
        await c.send('POST', '/api/submissions', {
          ...body,
          missionId: invalid.id,
          url: 'https://x.com/someone/status/801',
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await c.send('POST', '/api/submissions', {
          ...body,
          missionId: invalid.id,
          url: 'https://evil.example/status/801',
        })
      ).statusCode,
      400,
    );
  } finally {
    await built.app.close();
  }
});
test('two API instances coordinate X refresh and concurrent evidence on shared storage', async () => {
  mkdirSync('.local', { recursive: true });
  const path = resolve('.local', `concurrency-test-${randomUUID()}.sqlite`);
  const f = fixture();
  const first = await f.create(path);
  const second = await f.create(path);
  try {
    const a = client(first),
      b = client(second);
    await a.login();
    await a.link();
    await b.login();
    const wallet = member.address.toLowerCase();
    await first.database.db
      .prepare('UPDATE members SET tokens=? WHERE wallet=?')
      .run(
        encrypt(
          { access_token: 'expired', refresh_token: 'rotating-token', expires_at: 0 },
          Buffer.alloc(32, 4),
        ),
        wallet,
      );
    const before = f.tokenCalls();
    const body = {
      missionId: 'tell-order',
      url: 'https://x.com/member101/status/800',
      description: 'An original contribution to The Order of Steering with clear evidence.',
    };
    const mission = initialState().missions.find((m) => m.verification === 'x_post')!;
    body.missionId = mission.id;
    const responses = await Promise.all([
      a.send('POST', '/api/submissions', body),
      b.send('POST', '/api/submissions', body),
    ]);
    assert.equal(f.tokenCalls() - before, 1);
    assert.equal(
      responses.filter((r) => r.statusCode === 200).length,
      1,
      responses.map((r) => r.body).join('\n'),
    );
    assert.equal(responses.filter((r) => [400, 409].includes(r.statusCode)).length, 1);
    assert.equal((await first.database.submissions(wallet)).length, 1);
    assert.equal((await second.database.submissions(wallet))[0].status, 'pending');
  } finally {
    await first.app.close();
    await second.app.close();
    if (process.env.ORDER_TEST_STORAGE === 'libsql') {
      global.gc?.();
      await delay(50);
    }
    for (const file of [path, path + '-wal', path + '-shm']) if (existsSync(file)) unlinkSync(file);
  }
});

test('OAuth token encryption detects tampering', () => {
  const key = Buffer.alloc(32, 3);
  const tokens = { access_token: 'secret', refresh_token: 'refresh', expires_at: 200000 };
  const stored = encrypt(tokens, key);
  assert.deepEqual(decrypt(stored, key), tokens);
  const raw = Buffer.from(stored, 'base64');
  raw[15] ^= 1;
  assert.throws(() => decrypt(raw.toString('base64'), key));
});

test('wallet identity, encrypted X tokens and contribution records survive a database restart', async () => {
  mkdirSync('.local', { recursive: true });
  const path = resolve('.local', `persistence-test-${randomUUID()}.sqlite`);
  const f = fixture();
  let built = await f.create(path);
  try {
    const c = client(built);
    await c.login();
    await c.link();
    await c.send('POST', '/api/profile', { name: 'Persistent Member' });
    assert.equal(
      (
        await c.send('POST', '/api/submissions', {
          missionId: 'test-app',
          url: 'https://example.com/persistent-report',
          description: 'An original testing report with clear reproduction steps.',
        })
      ).statusCode,
      200,
    );
    const record = (await built.database.submissions())[0];
    await built.app.close();
    built = await f.create(path);
    const next = client(built);
    const login = await next.login();
    assert.equal(login.response.json().profile.name, 'Persistent Member');
    assert.equal(login.response.json().ready, true);
    assert.equal(login.response.json().profile.x.id, '101');
    const state = (await next.send('GET', '/api/state')).json().state;
    assert.equal(state.submissions[0].id, record.id);
    assert.equal(state.submissions[0].points, 150);
    const tokens = (await built.database.member(member.address.toLowerCase()))!.tokens!;
    assert.equal(decrypt(tokens, Buffer.alloc(32, 4)).access_token, 'test-access-token');
  } finally {
    await built.app.close();
    // Native libSQL on Windows releases cached statements after GC; HTTP Turso
    // and node:sqlite do not need this test-only cleanup step.
    if (process.env.ORDER_TEST_STORAGE === 'libsql') {
      global.gc?.();
      await delay(50);
    }
    for (const file of [path, path + '-wal', path + '-shm']) if (existsSync(file)) unlinkSync(file);
  }
});
