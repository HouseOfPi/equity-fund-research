# Vercel deployment

The project now contains `vercel.json`, `api/index.js`, and a transactional Postgres storage adapter. Vercel hosts the Vite build and the Node API. Local development continues using files when DATABASE_URL is unset. Vercel never stores persistent records in its ephemeral filesystem.

Required deployment access: a Vercel CLI login or VERCEL_TOKEN injected into the execution environment. The connected MCP app can inspect this account, but its deploy tool currently returns `Tool deploy_to_vercel not found`. No deployment has been created as of this preparation.

## Provision and configure

1. Link this directory to a new Vercel project with `npx vercel link`, using the connected account's team.
2. Add Neon Postgres through Vercel Marketplace and connect it to the project. Use its pooled TLS connection URL for `DATABASE_URL`.
3. Set server environment variables in Vercel: `APP_PASSWORD`, `SESSION_SECRET` (32+ random characters), `UPDATER_TOKEN` (separate random credential), `DATABASE_URL`, and `APP_ORIGIN=https://your-project.vercel.app`. Keep credentials out of source and chat. Initial password can be password123 as requested; change it before granting broader access.
4. Run `npx vercel --prod`. No cron is configured.
5. Inspect build logs and verify the actual HTTPS URL. Confirm signed-out portfolio API returns 401, login sets a Secure/HttpOnly/SameSite=Strict cookie, viewer imports return 403, exact-month data is correct and sessions/snapshots survive another deployment.

The database role must be allowed to create tables on first access. Runtime initialization creates state, sessions, fund/month snapshots, holdings, sources, and audit views. Snapshot and history mutations lock the single state row in a transaction. Session cookies reference records shared across function instances; records expire after eight hours. Expired session cleanup should be configured separately by the database operator. No scheduler is claimed enabled.

The auth failure throttle remains per-function-instance; configure Vercel Firewall rate limiting before broad access. PostgreSQL TLS verification follows the provider's connection configuration; use the provider's TLS URL and do not disable certificate validation.

The local build and database integration tests can be run before deployment. Vercel routing and the deployed HTTPS flow require verification after hosting is configured. Do not describe this preparation as a live deployment.

## Background source updates

The serverless handler passes [`waitUntil`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#waituntil) to the disclosure updater so work continues after the HTTP 202 response. `vercel.json` includes the source registry and database schema and sets `maxDuration` to 300 seconds. This remains bounded by the host invocation lifetime. Persisted heartbeats allow an interrupted run to be retried, with saved portfolios preserved. No hosted cron is enabled.
