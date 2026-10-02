# Deploy to Vercel

The repository includes a Vite frontend and a Node API in `api/index.ts`. Vercel serves both on the same origin. The API uses Turso/libSQL for persistent storage; local development keeps using SQLite unless Turso variables are set.

## 1. Database

Create a Turso database and a read-write authentication token in the [Turso dashboard](https://app.turso.tech/). Copy its `libsql://…` URL and token into the variables below. Prefer a database location near US East: the API region in `vercel.json` is `iad1`.

Tables and the initial Genesis mission board are created automatically on the first API request. Existing missions are preserved on subsequent starts. The development database is not uploaded.

Production images are committed under `public/assets/` and copied to `dist/assets/` by Vite. The build verifies their presence and SHA-256 integrity. Source-only exclusions in `.vercelignore` use root anchors, such as `/assets/`, so they cannot exclude `public/assets/`.

## 2. Vercel project

Import [SolClaude33/the-order-of-steering](https://github.com/SolClaude33/the-order-of-steering). Use the repository root, the **Vite** preset and **Node.js 22.x**. The committed configuration sets:

| Setting           | Value                                  |
| ----------------- | -------------------------------------- |
| Build command     | `npm run build`                        |
| Output directory  | `dist`                                 |
| API function      | `api/index.ts`                         |
| API routing       | `/api/*` rewrites to the Node function |
| Function region   | `iad1`                                 |
| Function duration | 60 seconds                             |

Set the variables before deploying. If credentials change after a deployment, redeploy to apply them.

### Production domain

The canonical production domain is **theorderofsteering.com**. In the Vercel project, open **Settings → Domains**, add that domain and configure the exact DNS records displayed by Vercel at your registrar. Wait for the domain configuration and HTTPS certificate to be valid before switching authentication to it. If adding `www.theorderofsteering.com`, redirect it to `https://theorderofsteering.com`.

Set `APP_ORIGIN=https://theorderofsteering.com` in **Production** and register the matching X callback below. Save the variables and redeploy; then access the app through the canonical domain when signing in. The frontend's asset and API paths are relative, so they use the domain from which the site is opened.

## 3. Environment variables

All variables belong to the **server**. Do not add `VITE_` prefixes. Add these under Vercel → Project → Settings → Environment Variables for **Production**:

| Variable               | Value                                                             | Required                           |
| ---------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `TURSO_DATABASE_URL`   | Database URL beginning with `libsql://` or `https://`             | Yes                                |
| `TURSO_AUTH_TOKEN`     | Read-write token for that database                                | Yes                                |
| `TOKEN_ENCRYPTION_KEY` | Exactly 64 hexadecimal characters, generated from 32 random bytes | Yes                                |
| `X_CLIENT_ID`          | OAuth 2.0 Client ID from the X developer app                      | For X linking and submissions      |
| `X_CLIENT_SECRET`      | Matching OAuth 2.0 Client Secret                                  | For X linking and submissions      |
| `KEEPER_WALLETS`       | Comma-separated EVM addresses of the team; no private keys        | For mission management and reviews |
| `APP_ORIGIN`           | `https://theorderofsteering.com`, with no path or trailing slash  | Required for this custom domain    |

When `APP_ORIGIN` is empty, the API uses Vercel's production project URL. Use that exact URL to access the app and register the X callback. For a custom domain, set `APP_ORIGIN` to that domain and update the X callback together.

`API_PORT` and `DATABASE_PATH` are local-only settings. Vercel supplies `VERCEL`, `VERCEL_ENV`, `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`; do not create them yourself.

Prepare a private import file locally:

```sh
node scripts/prepare-vercel-env.mjs
```

This creates `.local/vercel.env` with all variable names and a generated encryption key. Fill in the blanks, then import it into Vercel's environment-variable form. Running the command again preserves the existing file and key. Neither the file nor its contents are committed. Keep the encryption key with the database's configuration: changing it invalidates the stored X credentials.

Use a separate database and encryption key for Preview if enabling API access there. Preview URLs need their own accepted X callbacks. Leaving Preview variables unset makes its API unavailable while the static landing can still build.

## 4. X developer app

Open the [X Developer Console](https://console.x.com/) and create an app named **The Order of Steering**. Enable **OAuth 2.0** in its user authentication settings and select the **Web App** client type. If the console also asks for OAuth 1.0a permissions, **Read** is enough for this integration. Use the OAuth **Client ID** and **Client Secret** for the variables below.

Suggested app description / data-use explanation:

> The Order of Steering connects user-authorized X accounts to EVM wallet profiles. We use OAuth 2.0 to identify the connected user and read submitted post links to verify authorship and mission requirements. We store the X user ID and username with the profile, and keep OAuth tokens encrypted on our server.

Register the exact production callback:

```text
https://theorderofsteering.com/api/auth/x/callback
```

For the production domain, copy these values exactly:

| X setting               | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| Website URL             | `https://theorderofsteering.com`                     |
| Callback / Redirect URI | `https://theorderofsteering.com/api/auth/x/callback` |

The authorization flow requests `users.read tweet.read offline.access` and uses PKCE. These scopes are requested by the server; there is no need to add write, follow, or direct-message permissions. The X app's API access must permit user lookup and post lookup. The current X API uses usage-based credits; check availability and billing in the console before live account/post verification.

Copy both OAuth credentials directly into Vercel **Production**:

| Variable          | X credential                                           |
| ----------------- | ------------------------------------------------------ |
| `X_CLIENT_ID`     | OAuth 2.0 Client ID                                    |
| `X_CLIENT_SECRET` | OAuth 2.0 Client Secret (use the Secret variable type) |

Both X variables must be set together; they may both be empty while configuring the project. Keep the existing database and encryption-key variables. Redeploy after saving. Then open the production app's **Profile**, authenticate with an EVM wallet, choose **Connect X**, authorize the app, and confirm the returned profile shows the connected account. This test does not require Keeper access. A full mission approval can be checked later, after configuring the team's wallets.

Each Keeper signs in with an allowlisted wallet and connects X before managing missions. An empty `KEEPER_WALLETS` list grants no one Keeper access.

## 5. Release checks

Before upload:

```sh
npm ci
npm run build
npm test
npm run test:libsql
npm run test:e2e
```

After Nicol deploys:

1. Open `/api/health`; expect `{"ok":true}`. A 503 means the server environment or database connection needs correction.
2. Sign in with an EVM browser wallet; check Profile records the correct wallet.
3. Connect X and check the callback returns to Profile successfully.
4. Submit a mission and confirm the record persists after reload.
5. Use an allowlisted Keeper profile to review it; confirm only an approval awards points.

Local tests use cryptographic test wallets and simulated X responses. They exercise both SQLite and the libSQL SDK, including concurrent API instances. The API was also compiled locally with the official Vercel Node builder. Live Turso connectivity and live X authorization must be checked with the configured deployment. Token transfers are outside the implemented mission and points system.

## References

- [Vercel: Vite](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel: Node.js functions](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel: SQLite storage](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)
- [Vercel: custom domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [Turso: TypeScript client](https://docs.turso.tech/sdk/ts/reference)
- [X: OAuth 2.0 authorization code flow](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
- [X: apps and credentials](https://docs.x.com/fundamentals/developer-apps)
- [X: Developer Console and API credits](https://docs.x.com/fundamentals/developer-portal)
