import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const path = '.local/vercel.env';
mkdirSync('.local', { recursive: true });
if (existsSync(path)) {
  console.log('Preserved .local/vercel.env. No encryption key was changed.');
} else {
  const content = [
    '# Private Vercel import file. Fill in the blank values before importing.',
    '# Keep this file and its encryption key outside Git and chat.',
    'TURSO_DATABASE_URL=',
    'TURSO_AUTH_TOKEN=',
    `TOKEN_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
    'X_CLIENT_ID=',
    'X_CLIENT_SECRET=',
    'KEEPER_WALLETS=',
    '# Optional: canonical HTTPS production origin, no trailing slash.',
    'APP_ORIGIN=',
    '',
  ].join('\n');
  writeFileSync(path, content, { flag: 'wx', mode: 0o600 });
  console.log('Created .local/vercel.env with a new private encryption key.');
}
