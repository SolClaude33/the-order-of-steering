import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [relative(root, path).replaceAll('\\', '/')];
  });
}
function excluded(paths) {
  const result = spawnSync(
    'git',
    ['-c', 'core.excludesFile=.vercelignore', 'check-ignore', '--no-index', '--stdin', '-z'],
    {
      cwd: root,
      input: paths.join('\0') + '\0',
      encoding: 'utf8',
    },
  );
  assert.ok(
    result.status === 0 || result.status === 1,
    'Could not inspect deployment ignore rules.',
  );
  return result.stdout.split('\0').filter(Boolean);
}

test('Vercel includes every production image and keeps source assets and private data excluded', () => {
  const production = files(join(root, 'public/assets'));
  assert.ok(production.length >= 13, 'Production assets are missing from the checkout.');
  assert.deepEqual(excluded(production), [], 'Vercel must include public/assets at every depth.');
  const source = [
    'package.json',
    'api/index.ts',
    'server/app.ts',
    'src/main.tsx',
    'scripts/check-deploy-assets.mjs',
  ];
  assert.deepEqual(excluded(source), []);
  const privatePaths = [
    '.local/order.sqlite',
    '.local/token-encryption.key',
    '.env',
    '.env.production',
    'assets/branding/pfp-approved-v01.png',
    'assets-src/order-assembly-high-v01.png',
    'node_modules/example/index.js',
    'dist/index.html',
    '.vercel/project.json',
    'tests/server.test.ts',
  ];
  assert.deepEqual(excluded(privatePaths), privatePaths);
});
