# Neon database

Paste the **pooled** connection string from your Neon project's **Connect** dialog
into the existing `.env` file:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@ep-YOUR-ENDPOINT-pooler.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

Use the real URL Neon provides, including its TLS parameters. This is a server-only
variable. `.env` is ignored by Git. Leave it blank until you have your connection
string; the running local app continues using `DATA_DIR` in the meantime.

After saving the real connection string:

```bash
npm run db:check
npm run db:migrate
```

Restart `npm run dev` to switch the running app to Neon. Portfolios, monthly
snapshots, import history, and login sessions then use the existing Postgres
adapter. Tables are created automatically on first connection; the database role
needs permission to create tables. New imports go straight into Neon through the
existing updater API and import CLI.

Migration validates local snapshots and merges them in a transaction. It preserves
local files and database records for other months/funds. Identical records are
skipped; differing existing records stop the migration without overwriting them.
Run `npm run db:migrate -- --dry-run` to validate local data without connecting.
Existing browser sessions stay in local files; sign in again after switching.

The schema in `server/postgres-schema.sql` creates:

| Structure | Contents |
| --- | --- |
| `observatory_funds` | The 20 curated funds |
| `observatory_snapshots` | Fund/month disclosure status, verification, and AUM |
| `observatory_holdings` | Company identifiers, instruments, quantities, allocations, and review evidence |
| `observatory_sources` | Official/provider URLs, disclosure dates, retrieval times, agreement status, and SHA-256 checksums |
| `observatory_update_runs` (view) | Per-month source update progress, status, and failure reports |
| `observatory_import_history` (view) | Import and migration audit entries |
| `observatory_state` | Application state and version history as JSONB |
| `observatory_sessions` | Login sessions and expiration |

The state document is the application's authoritative record. Snapshot, holding,
and source tables are queryable projections maintained in the same transaction
as imports and migrations; edit data through the import API. Initialization also
backfills these tables from any existing state. Primary/foreign keys, validation
constraints, and month/company indexes protect and support queries. A snapshot
replacement removes outdated holdings and source evidence atomically.

For example, query the largest equity holdings for August:

```sql
SELECT f.name, h.company, h.quantity, h.allocation
FROM observatory_holdings h
JOIN observatory_funds f ON f.id = h.fund_id
WHERE h.month = '2026-08' AND h.instrument = 'equity'
ORDER BY f.name, h.allocation DESC;
```

Switching to Neon does not enable a scheduler or create missing disclosures.

To verify snapshot replacement and transaction rollback against Postgres, run
`RUN_POSTGRES_TESTS=1 npm test`. Database fixtures use an isolated schema inside
a transaction that is rolled back, leaving application data untouched.

References: [Neon connection guide](https://neon.com/docs/get-started-with-neon/connect-neon)
and [node-postgres TLS support](https://node-postgres.com/features/ssl).

Official workbook downloads can now be run with the portfolio page’s **Refresh** button or `npm run data:sync -- --month YYYY-MM`. See [update workflow](disclosure-updates.md).
