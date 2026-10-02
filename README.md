# The Order of Steering

A public website and mission app inspired by Snowmoon. React, TypeScript and Vite provide the interface; Fastify manages profiles, authentication, evidence and Keeper decisions. Storage uses SQLite locally and Turso/libSQL on Vercel.

## Run locally

Requires Node.js 22.16+ within the 22.x release line and Microsoft Edge for browser tests.

```sh
npm ci
npm run dev
```

- Website: http://127.0.0.1:5173/
- Mission board: http://127.0.0.1:5173/#/app
- Member profile: http://127.0.0.1:5173/#/app/profile
- Local API: http://127.0.0.1:5174/api/health

Use `npm.cmd` in PowerShell when its script policy blocks `npm.ps1`. The development command starts the API and website. Copy `.env.example` to `.env` for local configuration.

## Deploy to Vercel

[DEPLOYMENT.md](./DEPLOYMENT.md) contains the complete import, database, environment-variable and X callback setup. The repository includes `vercel.json` and a Node API entry point. Nicol handles deployment.

The canonical production domain is `https://theorderofsteering.com`. Connect it in Vercel and set `APP_ORIGIN` to that exact origin. The production X callback is `https://theorderofsteering.com/api/auth/x/callback`.

Generate a private environment import file with:

```sh
node scripts/prepare-vercel-env.mjs
```

It creates `.local/vercel.env` with the required variable names and a secure encryption key. Fill in the Turso and X credentials, Keeper addresses and production origin before importing it into Vercel. Re-running the command preserves the key. The file is ignored by Git.

## Identity and contributions

Visitors can browse missions without signing in. Submitting evidence requires **a verified EVM wallet and a connected X account**.

The live board starts empty; Keepers publish its missions. The six original examples are retired once, without deleting contribution history. Restarting the API does not recreate them. Example boards used in tests are seeded explicitly by the test harness.

Wallet sign-in uses server-issued [Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361) messages, short-lived nonces and verified signatures. Browser wallets discovered through EIP-6963 or an injected EVM provider are supported, including wallet browsers on mobile.

X identity is linked by its immutable account ID; one X account belongs to one wallet profile. Reconnecting the same account renews authorization. OAuth 2.0 uses PKCE S256 and requests `users.read tweet.read offline.access`. X tokens are encrypted on the server, with refresh coordinated across API instances.

Connecting X saves its display name, handle and profile image for the profile card, sidebar and header avatar. There is no separate display-name editor. These details are read from storage during navigation. Profiles linked before image support was added can use **Reconnect X** once to import the photo; reconnecting also updates changed X profile details. Unavailable photos fall back to the Order avatar.

Keepers create, edit and archive missions, review evidence with a recorded reason and export a reward register containing verified wallet addresses. Approved points come from server records; pending submissions grant no points and final approvals cannot be repeated. Tokens are not transferred by this application.

## Configure X and Keepers locally

1. Create an X developer app with **OAuth 2.0**, **Web App** client type and **Read** permissions.
2. Register `http://127.0.0.1:5173/api/auth/x/callback` as an exact callback.
3. Set `X_CLIENT_ID` and `X_CLIENT_SECRET` in `.env`.
4. Set `KEEPER_WALLETS` to the team's comma-separated EVM addresses.
5. Restart the API, sign in and connect X from Profile. Keepers require both connections.

API access must allow user and post lookup. Supported mission checks are manual review, X author/text verification and X replies to a configured target. Successful post URLs are canonicalized to prevent reuse through X/Twitter aliases. Keepers review contribution quality.

For an account-follow mission, select **Keepers review** and explain the required evidence in the mission requirements. Follow verification is manual. **X reply to target** requires the numeric ID after `/status/` in a post URL; a profile URL cannot be used as its target.

For an introductory link visit, add a HTTPS **Mission link** and select **Visit link — automatic after 3 seconds**. Members open the destination in a new tab; the server records a verified contribution and awards the configured points after three seconds. Wallet and X are required. A visit does not verify a follow and does not call the X API. Visit attempts persist in SQLite/Turso, expire after ten minutes and can award each wallet only once per mission. No additional environment variables are required.

Live X authorization still requires the developer app configuration. Likes, follows, repost verification, WalletConnect QR connections and smart contract wallet signatures are not implemented.

## Storage and secrets

Default local data lives in `.local/order.sqlite`. Without an explicit `TOKEN_ENCRYPTION_KEY`, local development preserves a generated key in `.local/token-encryption.key`. Keep the database and key together. Remote storage requires `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` and a stable 64-character hexadecimal encryption key.

Sessions use HttpOnly cookies, expire after seven days and rotate at sign-in. Mutations require a trusted origin and CSRF token. Keeper permissions are enforced by the API. No server secret uses a `VITE_` variable.

Earlier browser records can be exported from Settings. They are preserved separately from authenticated server records. Appearance preferences remain browser-local.

## Validation

```sh
npm run check
npm test
npm run test:libsql
npm run test:e2e
npm run build
npm run preview
```

Tests cover mission rules, cryptographic signatures, sessions, CSRF, X identity binding, profile isolation, point accounting, restart persistence and concurrent API instances. Deployment tests exercise raw HTTP requests through the Vercel adapter, including rewrites and query strings. The libSQL suite uses the real SDK against isolated local databases; X responses are simulated. Live Turso and X checks follow deployment configuration.

Playwright uses Edge and isolated servers on 5180/5181. Captures and results go to ignored `.local/`; tests do not modify the development database.

The browser build goes to `dist/`. For complete authentication through local preview on 4173, run the API with `APP_ORIGIN=http://127.0.0.1:4173` and register that matching X callback.

## Assets and context

Served media lives in `public/assets/`, with source images and generation metadata in `assets-src/`. Vercel uploads only production media. Preserve the approved PFP.

The landing uses signature purple, ivory, warm stone and lilac, purpose-made Assembly imagery, interactive categories, scroll reveals and a global motion control. All user-facing content is in English.

Read `PROJECT.md` and `AGENTS.md` for product decisions and repository boundaries.
