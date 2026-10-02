import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  [
    '--expose-gc',
    '--experimental-strip-types',
    '--test',
    'tests/server.test.ts',
    'tests/deployment.test.ts',
  ],
  { stdio: 'inherit', env: { ...process.env, ORDER_TEST_STORAGE: 'libsql' } },
);
process.exit(result.status ?? 1);
