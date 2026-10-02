import { privateKeyToAccount } from 'viem/accounts';
import { buildServer } from '../../server/app.ts';
// This fake external X transport exists only in the test harness. All HTTP authentication,
// sessions, wallet signatures, authorization and database writes use the real server.
const xFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  if (url.endsWith('/oauth2/token')) {
    const params = new URLSearchParams(String(init?.body));
    const id = params.get('code') || params.get('refresh_token') || '1001';
    return Response.json({
      access_token: id,
      refresh_token: id,
      expires_in: 7200,
      scope: 'users.read tweet.read offline.access',
    });
  }
  if (url.endsWith('/users/me')) {
    const id = String((init?.headers as Record<string, string>).Authorization).replace(
      'Bearer ',
      '',
    );
    return Response.json({ data: { id, username: 'order_member_' + id, name: 'Order Member' } });
  }
  return Response.json({ error: 'No fixture for this endpoint' }, { status: 404 });
}) as typeof fetch;
const keeper = privateKeyToAccount(('0x' + '1'.repeat(64)) as `0x${string}`);
const { app } = await buildServer(
  {
    origin: 'http://127.0.0.1:5180',
    database: ':memory:',
    key: Buffer.alloc(32, 2),
    clientId: 'test-client',
    clientSecret: 'test-secret',
    keepers: [keeper.address],
  },
  xFetch,
);
await app.listen({ host: '127.0.0.1', port: 5181 });
console.log('Isolated test API ready');
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => void app.close().then(() => process.exit(0)));
