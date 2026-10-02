import test from 'node:test';
import assert from 'node:assert/strict';
import { privateKeyToAccount } from 'viem/accounts';
import { buildServer } from '../server/app.ts';
import { decrypt, encrypt } from '../server/x.ts';
import { initialState, totalPoints } from '../src/lib/model.ts';
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
    tokenCalls = 0,
    meCalls = 0,
    avatar = 'https://pbs.twimg.com/profile_images/101/member_normal.jpg';
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
    if (new URL(url).pathname === '/2/users/me') {
      meCalls++;
      assert.equal(new URL(url).searchParams.get('user.fields'), 'profile_image_url');
      return Response.json({
        data: {
          id: activeX,
          username: 'member' + activeX,
          name: 'Test Member',
          profile_image_url: avatar,
        },
      });
    }
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
    create: async (database = ':memory:') => {
      const built = await buildServer(
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
      );
      // Example missions are explicit test fixtures; production boards start empty.
      await built.database.transaction(async () => {
        if (!(await built.database.missions()).length) {
          for (const mission of initialState().missions) await built.database.putMission(mission);
        }
      });
      return built;
    },
    setX: (id: string) => {
      activeX = id;
    },
    setPost: (author: string, target = '900', status = 200) => {
      postAuthor = author;
      replyTarget = target;
      xStatus = status;
    },
    tokenCalls: () => tokenCalls,
    meCalls: () => meCalls,
    setAvatar: (url: string) => {
      avatar = url;
    },
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
test('connected X identity is cached, survives session refresh and only updates through the same X account', async () => {
  const f = fixture(),
    built = await f.create();
  try {
    const c = client(built);
    await c.login();
    await c.send('POST', '/api/profile', { name: 'My custom name' });
    await c.link();
    const linked = (await c.send('GET', '/api/session')).json().profile;
    assert.equal(linked.name, 'My custom name');
    assert.equal(linked.x.name, 'Test Member');
    assert.equal(linked.x.username, 'member101');
    assert.equal(linked.x.avatarUrl, 'https://pbs.twimg.com/profile_images/101/member_normal.jpg');
    await c.send('GET', '/api/session');
    assert.equal(f.meCalls(), 1, 'Session refresh must not make additional X API requests');
    f.setAvatar('https://pbs.twimg.com/profile_images/101/updated.jpg');
    await c.link();
    assert.equal(
      (await c.send('GET', '/api/session')).json().profile.x.avatarUrl,
      'https://pbs.twimg.com/profile_images/101/updated.jpg',
    );
    f.setX('202');
    assert.match((await c.link()).headers.location as string, /different/);
    assert.equal((await c.send('GET', '/api/session')).json().profile.x.username, 'member101');
    f.setX('101');
    for (const unsafe of [
      'http://pbs.twimg.com/a.jpg',
      'https://pbs.twimg.com.evil.example/a.jpg',
      'data:image/svg+xml,test',
      'https://user:password@pbs.twimg.com/a.jpg',
      '',
    ]) {
      f.setAvatar(unsafe);
      assert.match((await c.link()).headers.location as string, /success/);
      assert.equal((await c.send('GET', '/api/session')).json().profile.x.avatarUrl, null);
    }
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
test('leaderboard uses approved historical points and public X identity without leaking wallet or evidence', async () => {
  const f = fixture(),
    built = await f.create();
  try {
    const guest = client(built),
      a = client(built),
      k = client(built),
      incomplete = client(built);
    assert.deepEqual((await guest.send('GET', '/api/leaderboard')).json(), { entries: [] });
    await a.login();
    await a.link();
    await k.login(keeper);
    f.setX('202');
    await k.link();
    await incomplete.login(other);
    let entries = (await a.send('GET', '/api/leaderboard')).json().entries;
    assert.equal(entries.length, 2);
    assert.equal(
      entries.find((row: { username: string }) => row.username === 'member101').points,
      0,
    );
    assert.equal(
      entries.find((row: { username: string }) => row.username === 'member101').isYou,
      true,
    );
    const submission = (
      await a.send('POST', '/api/submissions', {
        missionId: 'test-app',
        url: 'https://example.com/private-evidence',
        description: 'An original contribution with evidence for review.',
        points: 999999,
        status: 'verified',
      })
    ).json();
    const id = submission.id || (await a.send('GET', '/api/state')).json().state.submissions[0].id;
    entries = (await a.send('GET', '/api/leaderboard')).json().entries;
    assert.ok(entries.every((row: { points: number }) => row.points === 0));
    assert.equal(
      (
        await k.send('POST', '/api/keepers/review', {
          id,
          status: 'verified',
          reason: 'The evidence satisfies every requirement.',
        })
      ).statusCode,
      200,
    );
    const original = (await built.database.missions()).find(
      (mission) => mission.id === 'test-app',
    )!;
    assert.equal(
      (await k.send('POST', '/api/keepers/missions', { ...original, points: 999 })).statusCode,
      200,
    );
    await k.send('POST', '/api/keepers/archive', { id: original.id, archived: true });
    assert.equal(
      (await k.send('POST', '/api/keepers/delete', { id: original.id })).statusCode,
      200,
    );
    // Other decision states never enter the score, even when their configured points are higher.
    const record = (await built.database.submissions(member.address.toLowerCase()))[0];
    for (const status of ['pending', 'review', 'rejected'] as const) {
      await built.database.putSubmission(
        { ...record, id: randomUUID(), status, points: 1000 },
        member.address.toLowerCase(),
        'ranking-fixture-' + status,
      );
    }
    const calls = [f.meCalls(), f.tokenCalls()];
    const response = await a.send(
      'GET',
      '/api/leaderboard?limit=1000&wallet=' + keeper.address + '&points=999999',
    );
    assert.equal(response.statusCode, 200);
    entries = response.json().entries;
    assert.deepEqual(entries[0], {
      rank: 1,
      name: 'Test Member',
      username: 'member101',
      avatarUrl: 'https://pbs.twimg.com/profile_images/101/member_normal.jpg',
      points: 150,
      isYou: true,
    });
    assert.equal(entries[1].points, 0);
    for (const row of entries)
      assert.deepEqual(Object.keys(row).sort(), [
        'avatarUrl',
        'isYou',
        'name',
        'points',
        'rank',
        'username',
      ]);
    for (const privateValue of [
      member.address,
      member.address.toLowerCase(),
      'private-evidence',
      'test-access-token',
      'tokens',
      'verificationSource',
    ]) {
      assert.equal(response.body.includes(privateValue), false);
    }
    assert.deepEqual([f.meCalls(), f.tokenCalls()], calls);
    assert.ok(
      (await guest.send('GET', '/api/leaderboard'))
        .json()
        .entries.every((row: { isYou: boolean }) => !row.isYou),
    );
    await a.send('POST', '/api/auth/logout');
    assert.ok(
      (await a.send('GET', '/api/leaderboard'))
        .json()
        .entries.every((row: { isYou: boolean }) => !row.isYou),
    );
  } finally {
    await built.app.close();
  }
});

test('leaderboard caps results at 50 and orders ties by join date then wallet deterministically', async () => {
  const built = await fixture().create();
  try {
    await built.database.transaction(async () => {
      for (let i = 54; i >= 0; i--) {
        const wallet = '0x' + (100 + i).toString(16).padStart(40, '0');
        await built.database.db
          .prepare(
            'INSERT INTO members(wallet,name,chain,x_id,x_username,x_name,x_avatar,tokens,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
          )
          .run(
            wallet,
            'Private profile name',
            1,
            String(i),
            'ranked_' + i,
            i === 0 ? null : 'Ranked Member ' + i,
            null,
            'private-encrypted-token',
            '2026-10-01T00:00:00.000Z',
          );
        await built.database.putSubmission(
          {
            id: 'ranking-' + i,
            missionId: 'removed-mission',
            missionTitle: 'Historical contribution',
            points: i === 54 ? 1000 : 10,
            status: 'verified',
            url: 'https://example.com/' + i,
            description: 'Private evidence',
            reason: 'Approved',
            createdAt: '2026-10-02',
            reviewedAt: '2026-10-02',
            decisions: [],
          },
          wallet,
        );
      }
      // The earlier joined profile wins a score tie, independent of insertion order.
      await built.database.db
        .prepare('UPDATE members SET created_at=? WHERE x_username=?')
        .run('2026-09-01T00:00:00.000Z', 'ranked_53');
    });
    const response = await client(built).send('GET', '/api/leaderboard?limit=100');
    const entries = response.json().entries;
    assert.equal(entries.length, 50);
    assert.equal(entries[0].username, 'ranked_54');
    assert.equal(entries[0].points, 1000);
    assert.equal(entries[1].username, 'ranked_53');
    assert.equal(entries[2].username, 'ranked_0');
    assert.equal(entries[2].name, 'ranked_0');
    assert.equal(entries[49].username, 'ranked_47');
    assert.deepEqual(
      entries.map((row: { rank: number }) => row.rank),
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
    assert.deepEqual((await client(built).send('GET', '/api/leaderboard')).json().entries, entries);
    assert.equal(response.body.includes('Private profile name'), false);
    assert.equal(response.body.includes('private-encrypted-token'), false);
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

test('automatic visits enforce identity and a server timer, ignore client rewards and credit each member once', async () => {
  const f = fixture();
  const built = await f.create();
  try {
    const k = client(built),
      a = client(built),
      b = client(built);
    const mission = {
      ...initialState().missions[2],
      id: 'visit-account',
      title: 'Visit our X account',
      verification: 'visit',
      actionUrl: 'https://x.com/orderofsteering',
      points: 100,
    };
    await k.login(keeper);
    await k.link();
    assert.equal(
      (await k.send('POST', '/api/keepers/missions', { ...mission, actionUrl: '' })).statusCode,
      400,
    );
    assert.equal(
      (
        await k.send('POST', '/api/keepers/missions', {
          ...mission,
          actionUrl: 'javascript:alert(1)',
        })
      ).statusCode,
      400,
    );
    assert.equal((await k.send('POST', '/api/keepers/missions', mission)).statusCode, 200);
    await a.login();
    assert.equal(
      (await a.send('POST', '/api/visits/start', { missionId: mission.id })).statusCode,
      403,
    );
    f.setX('202');
    await a.link();
    const start = await a.send('POST', '/api/visits/start', { missionId: mission.id });
    assert.equal(start.statusCode, 200, start.body);
    assert.equal(start.json().url, mission.actionUrl);
    assert.equal(start.json().waitMs, 3000);
    const claim = {
      missionId: mission.id,
      token: start.json().token,
      points: 99999,
      status: 'verified',
      wallet: keeper.address,
      startedAt: 0,
    };
    assert.equal((await a.send('POST', '/api/visits/complete', claim)).statusCode, 409);
    assert.equal(
      (await a.send('POST', '/api/visits/complete', { ...claim, token: '0'.repeat(64) }))
        .statusCode,
      409,
    );
    assert.equal(
      (
        await a.send('POST', '/api/submissions', {
          missionId: mission.id,
          url: mission.actionUrl,
          description: 'Trying to bypass the automatic visit timer.',
        })
      ).statusCode,
      400,
    );
    await b.login(other);
    f.setX('303');
    await b.link();
    assert.equal((await b.send('POST', '/api/visits/complete', claim)).statusCode, 409);
    // Only the fixture database can advance the stored start; client timestamps above are ignored.
    await built.database.db
      .prepare('UPDATE mission_visits SET started_at=? WHERE wallet=?')
      .run(Date.now() - 3100, member.address.toLowerCase());
    const completed = await Promise.all([
      a.send('POST', '/api/visits/complete', claim),
      a.send('POST', '/api/visits/complete', claim),
    ]);
    for (const response of completed) assert.equal(response.statusCode, 200, response.body);
    const state = (await a.send('GET', '/api/state')).json().state;
    assert.equal(state.submissions.length, 1);
    assert.equal(totalPoints(state), 100);
    assert.equal(state.submissions[0].wallet, member.address);
    assert.equal(state.submissions[0].status, 'verified');
    assert.match(state.submissions[0].verificationSource, /server timer/);
    assert.equal(
      (await a.send('POST', '/api/visits/start', { missionId: mission.id })).statusCode,
      409,
    );
    const second = (await b.send('POST', '/api/visits/start', { missionId: mission.id })).json();
    await built.database.db
      .prepare('UPDATE mission_visits SET started_at=? WHERE wallet=?')
      .run(Date.now() - 3100, other.address.toLowerCase());
    assert.equal(
      (await b.send('POST', '/api/visits/complete', { missionId: mission.id, token: second.token }))
        .statusCode,
      200,
    );
    assert.equal(totalPoints((await b.send('GET', '/api/state')).json().state), 100);
    assert.equal(
      (await built.database.db.prepare("SELECT * FROM audit WHERE action='visit_complete'").all())
        .length,
      2,
    );
  } finally {
    await built.app.close();
  }
});

test('automatic visit attempts expire, reject changed missions and cannot reward closed or manual missions', async () => {
  const built = await fixture().create();
  try {
    const a = client(built);
    await a.login();
    await a.link();
    const mission = {
      ...initialState().missions[2],
      id: 'visit-changes',
      verification: 'visit' as const,
      actionUrl: 'https://x.com/orderofsteering',
    };
    await built.database.putMission(mission);
    const start = (await a.send('POST', '/api/visits/start', { missionId: mission.id })).json();
    await built.database.db.prepare('UPDATE mission_visits SET expires=?').run(Date.now() - 1);
    assert.equal(
      (await a.send('POST', '/api/visits/complete', { missionId: mission.id, token: start.token }))
        .statusCode,
      409,
    );
    const next = (await a.send('POST', '/api/visits/start', { missionId: mission.id })).json();
    await built.database.db
      .prepare('UPDATE mission_visits SET started_at=?')
      .run(Date.now() - 3100);
    await built.database.putMission({ ...mission, points: 75 });
    const changed = await a.send('POST', '/api/visits/complete', {
      missionId: mission.id,
      token: next.token,
    });
    assert.equal(changed.statusCode, 409);
    assert.match(changed.json().error, /mission changed/);
    await built.database.putMission({ ...mission, archived: true });
    assert.equal(
      (await a.send('POST', '/api/visits/start', { missionId: mission.id })).statusCode,
      409,
    );
    await built.database.putMission({ ...mission, deadline: '2000-01-01' });
    assert.equal(
      (await a.send('POST', '/api/visits/start', { missionId: mission.id })).statusCode,
      409,
    );
    assert.equal(
      (await a.send('POST', '/api/visits/start', { missionId: 'test-app' })).statusCode,
      400,
    );
    assert.equal((await built.database.submissions()).length, 0);
  } finally {
    await built.app.close();
  }
});

test('a visit started on one API instance completes on another without duplicate credit', async () => {
  mkdirSync('.local', { recursive: true });
  const path = resolve('.local', `visit-instances-${randomUUID()}.sqlite`);
  const f = fixture();
  const first = await f.create(path);
  const second = await f.create(path);
  try {
    const mission = {
      ...initialState().missions[2],
      id: 'visit-persistent',
      verification: 'visit' as const,
      actionUrl: 'https://x.com/orderofsteering',
      points: 100,
    };
    await first.database.putMission(mission);
    const a = client(first),
      b = client(second);
    await a.login();
    await a.link();
    const token = (await a.send('POST', '/api/visits/start', { missionId: mission.id })).json()
      .token;
    await b.login();
    await first.database.db
      .prepare('UPDATE mission_visits SET started_at=?')
      .run(Date.now() - 3100);
    const claim = { missionId: mission.id, token };
    const result = await Promise.all([
      a.send('POST', '/api/visits/complete', claim),
      b.send('POST', '/api/visits/complete', claim),
    ]);
    for (const response of result) assert.equal(response.statusCode, 200, response.body);
    assert.equal(totalPoints((await b.send('GET', '/api/state')).json().state), 100);
    assert.equal((await first.database.submissions()).length, 1);
    assert.equal((await second.database.submissions()).length, 1);
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

test('Keeper deletion preserves points and pending reviews, rejects other roles and cannot be undone by a stale save', async () => {
  const f = fixture(),
    built = await f.create();
  try {
    const guest = client(built),
      a = client(built),
      k = client(built);
    const id = 'test-app';
    const original = (await built.database.missions()).find((m) => m.id === id)!;
    await guest.initialize();
    assert.equal((await guest.send('POST', '/api/keepers/delete', { id })).statusCode, 401);
    await k.login(keeper);
    assert.equal((await k.send('POST', '/api/keepers/delete', { id })).statusCode, 403);
    await k.link();
    await a.login();
    f.setX('202');
    await a.link();
    assert.equal((await a.send('POST', '/api/keepers/delete', { id })).statusCode, 403);
    assert.equal(
      (await k.send('POST', '/api/keepers/delete', { id }, { 'x-csrf-token': 'forged' }))
        .statusCode,
      403,
    );
    assert.equal(
      (
        await a.send('POST', '/api/submissions', {
          missionId: id,
          url: 'https://example.com/deleted-approved',
          description: 'An original contribution that remains part of the member history.',
        })
      ).statusCode,
      200,
    );
    const first = (await a.send('GET', '/api/state')).json().state.submissions[0];
    assert.equal(
      (
        await k.send('POST', '/api/keepers/review', {
          id: first.id,
          status: 'verified',
          reason: 'The evidence meets the mission requirements.',
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await k.send('POST', '/api/submissions', {
          missionId: id,
          url: 'https://example.com/deleted-pending',
          description: 'Another contribution submitted before the mission was deleted.',
        })
      ).statusCode,
      200,
    );
    const pending = (await k.send('GET', '/api/state')).json().state.submissions[0];
    const before = await built.database.submissions(member.address.toLowerCase());
    const deleted = await Promise.all([
      k.send('POST', '/api/keepers/delete', { id }),
      k.send('POST', '/api/keepers/delete', { id }),
    ]);
    for (const response of deleted) assert.equal(response.statusCode, 200, response.body);
    assert.equal(
      (await built.database.missions()).some((m) => m.id === id),
      false,
    );
    assert.deepEqual(await built.database.submissions(member.address.toLowerCase()), before);
    assert.equal(totalPoints((await a.send('GET', '/api/state')).json().state), original.points);
    assert.equal((await k.send('POST', '/api/keepers/missions', original)).statusCode, 409);
    assert.equal(
      (await k.send('POST', '/api/keepers/archive', { id, archived: false })).statusCode,
      404,
    );
    assert.equal(
      (
        await a.send('POST', '/api/submissions', {
          missionId: id,
          url: 'https://example.com/new-after-deletion',
          description: 'No new submission may enter a deleted mission.',
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (
        await k.send('POST', '/api/keepers/review', {
          id: pending.id,
          status: 'verified',
          reason: 'Submitted before deletion and meets the original brief.',
        })
      ).statusCode,
      200,
    );
    const register = (await k.send('POST', '/api/keepers/reward-register')).json();
    assert.equal(
      register.members.find((m: { wallet: string }) => m.wallet === member.address).points,
      original.points,
    );
    assert.equal(
      (
        await built.database.db
          .prepare("SELECT * FROM audit WHERE action='mission_delete' AND subject=?")
          .all(id)
      ).length,
      1,
    );
    assert.equal(
      (await k.send('POST', '/api/keepers/delete', { id: 'missing-mission' })).statusCode,
      404,
    );
  } finally {
    await built.app.close();
  }
});

test('deletion cancels pending visits while keeping completed visit rewards', async () => {
  const f = fixture(),
    built = await f.create();
  try {
    const k = client(built),
      a = client(built);
    await k.login(keeper);
    await k.link();
    await a.login();
    f.setX('202');
    await a.link();
    const mission = {
      ...initialState().missions[2],
      id: 'visit-deletion',
      verification: 'visit' as const,
      actionUrl: 'https://x.com/orderofsteering',
    };
    await built.database.putMission(mission);
    const pending = (await a.send('POST', '/api/visits/start', { missionId: mission.id })).json();
    const approved = (await k.send('POST', '/api/visits/start', { missionId: mission.id })).json();
    await built.database.db
      .prepare('UPDATE mission_visits SET started_at=?')
      .run(Date.now() - 3100);
    assert.equal(
      (
        await k.send('POST', '/api/visits/complete', {
          missionId: mission.id,
          token: approved.token,
        })
      ).statusCode,
      200,
    );
    assert.equal((await k.send('POST', '/api/keepers/delete', { id: mission.id })).statusCode, 200);
    assert.equal(
      (
        await a.send('POST', '/api/visits/complete', {
          missionId: mission.id,
          token: pending.token,
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (await a.send('POST', '/api/visits/start', { missionId: mission.id })).statusCode,
      404,
    );
    assert.equal(
      (
        await k.send('POST', '/api/visits/complete', {
          missionId: mission.id,
          token: approved.token,
        })
      ).statusCode,
      200,
    );
    assert.equal(totalPoints((await k.send('GET', '/api/state')).json().state), mission.points);
    assert.equal(totalPoints((await a.send('GET', '/api/state')).json().state), 0);
    assert.equal(
      (
        await built.database.db
          .prepare('SELECT * FROM mission_visits WHERE mission_id=?')
          .all(mission.id)
      ).length,
      1,
    );
  } finally {
    await built.app.close();
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
    assert.equal(
      login.response.json().profile.x.avatarUrl,
      'https://pbs.twimg.com/profile_images/101/member_normal.jpg',
    );
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
