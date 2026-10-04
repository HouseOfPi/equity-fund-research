# Smallcap Observatory

Complete React 19 / Vite / JavaScript application with an Express backend. Requires Node 22+ (tested on Node 24). It covers exactly the requested 20 actively managed small-cap schemes, including Quantum. Official disclosures can be downloaded and imported with the supplied ingestion script. Runtime data and source archives are excluded from Git. Empty months show pending; historical records are never used as substitutes. Synthetic data exists only in automated tests, never in the production datastore.

## Install and develop

```bash
npm ci
npm run setup
# Generates local .env with random session and updater secrets.
npm run dev
```

Run these commands on the computer running your browser. A cloud-workspace localhost link does not reach your Mac. Keep the terminal running. Open http://localhost:5173 and use `password123` initially. The password comes only from server `APP_PASSWORD`. Vite proxies `/api` to Node on port 3001. Set `APP_ORIGIN` to the exact origin used in your browser (including port); default is http://localhost:5173. Generate secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never use `VITE_` variables for secrets.

For Neon storage, set `DATABASE_URL` in `.env`, run `npm run db:check` and
`npm run db:migrate`, then restart the app. See [Neon setup and migration](docs/neon-database.md).

## Commands

- `npm run build`: production frontend.
- `npm start`: serve production frontend and API on port 3001.
- `npm test`: comparison, import validation, persistence, access control and exact-month API tests.
- `npm run data:sync -- --month 2026-08`: fetch, validate, and save official AMC disclosures.
- `npm run db:check`: connect to Neon/Postgres, initialize the schema, and report table counts.
- `npm run db:migrate`: validate and merge the existing local datastore into Neon/Postgres.
- `npm run test:browser`: Chromium UI tests, including synthetic fixtures intercepted only in the test browser. Run `npx playwright install chromium` first, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for an existing installation. The tests serve the production build on a separate port and explicitly disable Neon. Browser tests use a separate `/tmp/observatory-browser-tests` datastore.

## Architecture and storage

`src/main.jsx` mounts `App.jsx`; `src/components.jsx` defines reusable Login, FundListing, FundDetails, HoldingList, Analysis, Sources, Shared components. `src/Updater.jsx` implements official-source updates and progress, and `src/Combined.jsx` implements aggregate share comparisons. CSS uses a single set of theme variables and responsive layouts. `server/postgres-store.js` provides transactional hosted Postgres storage; `server/app.js` implements authentication and protected APIs; `schema.js` is the authoritative strict runtime schema; `analysis.js` compares complete equity disclosures.

With `DATABASE_URL` set, Neon/Postgres stores application state, import history,
login sessions, and queryable fund/month/holding/source tables. Imports update
state and relational tables in one transaction. See [database structure](docs/neon-database.md).

Without `DATABASE_URL`, monthly snapshots are keyed by `YYYY-MM:fundId` in
`DATA_DIR/observatory.json`, and session files live under `DATA_DIR/sessions`.
Use one server instance with a persistent disk for file storage. Update history
retains material changes and prior versions; viewer history strips prior records.
Sessions expire after eight hours. Back up the active database or data directory.

## Authentication and configuration

| Variable                | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| APP_PASSWORD            | Password-only viewer login; initial example `password123`         |
| SESSION_SECRET          | Random 32+ character cookie signing secret                        |
| UPDATER_TOKEN           | Separate operator-only bearer credential                          |
| APP_ORIGIN              | Exact frontend origin permitted for browser mutations             |
| COOKIE_SECURE           | `true` for HTTPS production cookies; `false` only for local HTTP  |
| NODE_ENV                | `production` requires secure cookies and changed initial password |
| PORT                    | Node listener; default 3001                                       |
| DATA_DIR                | Persistent disk path; default `./data`                            |
| DATABASE_URL            | Neon pooled Postgres URL; blank uses local files                  |
| DISCLOSURE_MANIFEST_URL | Optional vetted HTTPS JSON disclosure pipeline                    |
| API_URL                 | Optional URL for import/check CLI; default http://localhost:3001  |

Cookies are HttpOnly, SameSite Strict, with Secure enabled in production. Viewer login cannot grant updater permissions. Password comparison uses fixed-length hashes and timing-safe comparison. Login throttles after ten failures per IP for 15 minutes. Helmet headers and origin validation are enabled. Put the service behind a trusted reverse proxy, blocking direct access to its upstream listener; `trust proxy=1` assumes one trusted proxy. Use a distributed limiter if scaling. Server deployment secrets belong in the host's secret manager, never source control or browser storage. Rotate the updater token separately. HTTPS is mandatory for production.

## Import actual disclosures

See [data schema](docs/data-schema.md) and [import workflow](docs/import-workflow.md). Signed-in users can click **Refresh** on the portfolio page to download and save the selected month again, or run `npm run data:sync -- --month YYYY-MM`. See [official disclosure updates](docs/disclosure-updates.md) for source coverage, validation, and progress history. Neither dashboard loads nor reloads fetch AMC files. Manual JSON batches still require the separate updater key and can be imported with:

```bash
node server/import-cli.js /absolute/path/to/validated-snapshots.json
```

Every source link, disclosure as-of date, retrieval timestamp and verification claim must come from actual evidence. Validation enforces structural consistency; it cannot establish that an operator's submitted evidence is true. Corporate actions and identifier changes require human reconciliation. The viewer never receives the updater credential.

For the audited AMC workbook URLs in `scripts/disclosure-sources.json`:

```bash
python3 -m venv .venv
.venv/bin/pip install -r scripts/disclosure-requirements.txt
.venv/bin/python scripts/sync-disclosures.py --month 2026-08 --no-import
# Inspect data/disclosures/sync-report.json and verified-batch.json, then import:
node server/import-cli.js data/disclosures/verified-batch.json
```

The script checks workbook scheme/date, identifiers, quantities, percentage units,
and portfolio totals. Downloads and SHA-256 evidence are archived in
`data/disclosures`. Omit `--no-import` to import passing snapshots automatically.
A failure exits with status 1 while preserving passing snapshots and their report;
failed funds remain pending. The registry contains exact August URLs, not automatic
discovery of future disclosures. Independent provider comparison and corporate
action reconciliation still require separate evidence.

## Deployment

Use a Node-capable host with a persistent volume, such as a single VM, Render persistent-disk service, or a container platform supporting persistent disks. Vercel is supported with the supplied serverless API and a persistent Postgres database; see [Vercel deployment](docs/vercel-deployment.md). Filesystem storage must never be used on serverless infrastructure.

1. Run `npm ci && npm run build`, or build the supplied Dockerfile.
2. Mount persistent storage at `DATA_DIR` (`/app/data` for Docker), writable by the Node user.
3. Configure server secrets. Change `APP_PASSWORD`, set `NODE_ENV=production`, `COOKIE_SECURE=true`, and `APP_ORIGIN=https://your-domain`.
4. Start `npm start` or the container; forward HTTPS through one trusted proxy to port 3001.
5. Verify login, cookie Secure/HttpOnly/SameSite flags, signed-out API rejection, persistence across restarts and import access before granting users access.

Example image build: `docker build -t smallcap-observatory .`. Supply runtime secrets through your hosting provider, and mount a persistent volume. Never bake `.env` into the image. Actual hosting was not configured or deployed in this workspace.

## Optional daily hosted check

Automatic scheduling is **disabled**. The dashboard’s Refresh button runs explicit source checks and reloads the saved portfolio and combined analysis. No laptop timer or page-open timer is used. Monthly snapshots remain monthly even when checks run daily.

A host-operated ingestion pipeline can expose a vetted HTTPS manifest matching the import batch schema. Configure `DISCLOSURE_MANIFEST_URL`; the authenticated check route validates and imports it, records success/failure and updates the last-successful-check time. An empty `snapshots` array signifies a successful check with no new disclosures. It does not scrape arbitrary AMC files, independently verify claims, or invent data when a publisher is unavailable.

After deploying, manually run `node server/check-cli.js`, confirm evidence, history, persistence and host logs. Then configure a real hosted scheduler to run that command daily (e.g. 02:00 UTC) with injected `API_URL` and `UPDATER_TOKEN`, alerts on failures, and no secrets in logs. Keep scheduling disabled until that hosted setup is tested. The app deliberately reports disabled until a verified scheduler integration is implemented; do not flip a flag to imply verification. No scheduler is claimed configured by this delivery.

## Verification

Browser tests cover all 20 full names in both views, identical fixture allocations, native section collapse controls, fund Analysis/Sources popups and keyboard focus restoration, month loading with previous results hidden, exact-month pending states, theme/view persistence, shared cards collapsed initially, whole-portfolio rows outside the top 15 and desktop/mobile page overflow. Server tests cover quantity versus weight changes, exclusions, pending comparisons, validation, persistence and API protections. Tests never write synthetic records into the ordinary application data directory.

See `docs/verification.md` for the actual execution results and remaining operational limitations.

## AI portfolio analysis

The **AI analysis** button displays reports saved by Codex from the coding environment. No OpenAI API key or browser generation is used. Ask Codex to analyze a month and save it; use `analysis:export` and `analysis:save` for the local workflow. Reports persist in Neon and remain available when holdings change, with a stale-data notice. See [analysis workflow](docs/ai-analysis.md).
