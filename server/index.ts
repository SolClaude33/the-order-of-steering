import { buildServer } from './app.ts';
import { loadLocalEnv, readServerConfig } from './config.ts';

loadLocalEnv();
const { app } = await buildServer(readServerConfig());
await app.listen({ host: '127.0.0.1', port: Number(process.env.API_PORT || 5174) });
console.log('Order API ready on http://127.0.0.1:' + String(process.env.API_PORT || 5174));
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
