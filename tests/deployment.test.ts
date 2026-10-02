import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { privateKeyToAccount } from 'viem/accounts';
import { createClient } from '@libsql/client';
import { readServerConfig } from '../server/config.ts';
import { createVercelHandler } from '../server/vercel.ts';
import { buildServer } from '../server/app.ts';
import { OrderDatabase } from '../server/database.ts';

const production = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_URL: 'build.example.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'order.example.vercel.app',
  TURSO_DATABASE_URL: 'libsql://database.example.turso.io',
  TURSO_AUTH_TOKEN: 'test-only-token',
  TOKEN_ENCRYPTION_KEY: '4'.repeat(64),
};

test('Vercel configuration requires persistent storage and a stable encryption key', () => {
  assert.throws(
    () => readServerConfig({ VERCEL: '1', APP_ORIGIN: 'https://example.com' }),
    /TURSO_DATABASE_URL/,
  );
  assert.throws(
    () => readServerConfig({ ...production, TOKEN_ENCRYPTION_KEY: '' }),
    /TOKEN_ENCRYPTION_KEY/,
  );
  assert.throws(
    () => readServerConfig({ ...production, TOKEN_ENCRYPTION_KEY: '4'.repeat(64) + 'xx' }),
    /exactly 64/,
  );
  assert.throws(
    () => readServerConfig({ ...production, TURSO_DATABASE_URL: 'file:database.sqlite' }),
    /libsql/,
  );
  assert.throws(
    () => readServerConfig({ ...production, APP_ORIGIN: 'https://example.com/' }),
    /origin/,
  );
  assert.throws(() => readServerConfig({ ...production, X_CLIENT_ID: 'test-id' }), /both X/);
  assert.throws(() => readServerConfig({ ...production, KEEPER_WALLETS: 'invalid' }), /EVM/);
  assert.equal(readServerConfig(production).origin, 'https://order.example.vercel.app');
  assert.equal(
    readServerConfig({ ...production, VERCEL_ENV: 'preview' }).origin,
    'https://build.example.vercel.app',
  );
  assert.equal(
    readServerConfig({ ...production, APP_ORIGIN: 'https://order.example.com' }).origin,
    'https://order.example.com',
  );
});

test('the Vercel adapter serves raw HTTP bodies, cookies, CSRF and wallet signatures', async () => {
  let initializations = 0;
  const config = {
    origin: 'https://order.example.com',
    database: ':memory:',
    key: Buffer.alloc(32, 4),
    clientId: '',
    clientSecret: '',
    keepers: [],
  };
  const built = await buildServer(config);
  built.app.get('/api/test-query', async (request) => request.query);
  const handler = createVercelHandler(async () => {
    initializations++;
    return built;
  });
  const http = createServer((request, response) => {
    void handler(request, response);
  });
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');
  const address = http.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const checks = await Promise.all([fetch(base + '/api/health'), fetch(base + '/api/health')]);
    assert.deepEqual(await checks[0].json(), { ok: true });
    assert.equal(initializations, 1);
    const rewritten = await fetch(
      base + '/api?__order_route=test-query&state=oauth-state&code=code%2Bvalue',
    );
    assert.deepEqual(await rewritten.json(), { state: 'oauth-state', code: 'code+value' });
    const rewrittenHealth = await fetch(base + '/api?__order_route=health');
    assert.deepEqual(await rewrittenHealth.json(), { ok: true });
    const session = await fetch(base + '/api/session');
    const cookie = session.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /Secure/);
    const { csrf } = (await session.json()) as { csrf: string };
    const headers = {
      origin: config.origin,
      cookie: cookie.split(';')[0],
      'content-type': 'application/json',
      'x-csrf-token': csrf,
    };
    const account = privateKeyToAccount(('0x' + '1'.repeat(64)) as `0x${string}`);
    const challenge = await fetch(base + '/api/auth/challenge', {
      method: 'POST',
      headers,
      body: JSON.stringify({ address: account.address, chainId: 1 }),
    });
    assert.equal(challenge.status, 200);
    const { message } = (await challenge.json()) as { message: string };
    assert.match(message, /order.example.com/);
    const signature = await account.signMessage({ message });
    const login = await fetch(base + '/api/auth/verify', {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, signature }),
    });
    assert.equal(login.status, 200);
    assert.equal(((await login.json()) as { authenticated: boolean }).authenticated, true);
    const wrongOrigin = await fetch(base + '/api/auth/logout', {
      method: 'POST',
      headers: { ...headers, origin: 'https://other.example.com' },
      body: '{}',
    });
    assert.equal(wrongOrigin.status, 403);
  } finally {
    http.closeAllConnections();
    await new Promise<void>((resolve) => http.close(() => resolve()));
    await built.app.close();
  }
});

test('transaction rollback isolates concurrent records on both database transports', async () => {
  const client =
    process.env.ORDER_TEST_STORAGE === 'libsql'
      ? createClient({ url: 'file::memory:' })
      : undefined;
  const database = await OrderDatabase.open(':memory:', undefined, client);
  const statement = 'INSERT INTO sessions(id,wallet,csrf,expires) VALUES(?,?,?,?)';
  try {
    await assert.rejects(
      database.transaction(async () => {
        await database.db.prepare(statement).run('rolled-back', null, 'csrf', Date.now() + 10000);
        await Promise.resolve();
        throw new Error('rollback');
      }),
      /rollback/,
    );
    assert.equal(await database.session('rolled-back'), undefined);
    await Promise.all([
      database.transaction(async () => {
        await database.db.prepare(statement).run('first', null, 'csrf', Date.now() + 10000);
      }),
      database.db.prepare(statement).run('second', null, 'csrf', Date.now() + 10000),
    ]);
    assert.ok(await database.session('first'));
    assert.ok(await database.session('second'));
  } finally {
    database.db.close();
  }
});
