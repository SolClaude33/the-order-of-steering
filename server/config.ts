import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { isAddress } from 'viem';
import type { ServerConfig } from './app.ts';

export function loadLocalEnv() {
  if (!process.env.VERCEL && existsSync('.env')) process.loadEnvFile('.env');
}

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const serverless = env.VERCEL === '1';
  const deploymentHost =
    env.VERCEL_ENV === 'production'
      ? env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL
      : env.VERCEL_URL;
  const origin =
    env.APP_ORIGIN ||
    (serverless && deploymentHost ? 'https://' + deploymentHost : 'http://127.0.0.1:5173');
  const url = new URL(origin);
  if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
    throw new Error('APP_ORIGIN must be an HTTP(S) origin without a path or trailing slash.');
  if (serverless && url.protocol !== 'https:')
    throw new Error('Vercel requires an HTTPS APP_ORIGIN.');
  if (serverless && !deploymentHost && !env.APP_ORIGIN) throw new Error('APP_ORIGIN is required.');

  if (serverless && (!env.TURSO_DATABASE_URL || !env.TURSO_AUTH_TOKEN))
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required on Vercel.');
  if (env.TURSO_DATABASE_URL && !/^(libsql|https):\/\//.test(env.TURSO_DATABASE_URL))
    throw new Error('TURSO_DATABASE_URL must be a libsql:// or https:// URL.');
  if (env.TURSO_DATABASE_URL && !env.TURSO_AUTH_TOKEN)
    throw new Error('TURSO_AUTH_TOKEN is required for the remote database.');
  if (!!env.X_CLIENT_ID !== !!env.X_CLIENT_SECRET)
    throw new Error('Configure both X_CLIENT_ID and X_CLIENT_SECRET.');

  let key: Buffer;
  if (env.TOKEN_ENCRYPTION_KEY) {
    if (!/^[a-fA-F0-9]{64}$/.test(env.TOKEN_ENCRYPTION_KEY))
      throw new Error('TOKEN_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.');
    key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');
  } else {
    if (serverless || env.TURSO_DATABASE_URL)
      throw new Error('TOKEN_ENCRYPTION_KEY is required for a remote database.');
    mkdirSync('.local', { recursive: true });
    const keyFile = resolve('.local/token-encryption.key');
    if (!existsSync(keyFile)) {
      try {
        writeFileSync(keyFile, randomBytes(32), { mode: 0o600, flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
    key = readFileSync(keyFile);
    if (key.length !== 32) throw new Error('The local encryption key must contain 32 bytes.');
  }
  const keepers = (env.KEEPER_WALLETS || '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  if (keepers.some((address) => !isAddress(address)))
    throw new Error('KEEPER_WALLETS must contain valid EVM addresses.');
  return {
    origin,
    key,
    database: env.TURSO_DATABASE_URL || env.DATABASE_PATH || resolve('.local/order.sqlite'),
    databaseToken: env.TURSO_AUTH_TOKEN,
    clientId: env.X_CLIENT_ID || '',
    clientSecret: env.X_CLIENT_SECRET || '',
    keepers: keepers.map((address) => address.toLowerCase()),
  };
}
