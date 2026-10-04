import "dotenv/config";
import path from "node:path";
import { createStore } from "./store.js";
import { createPostgresStorage } from "./postgres-store.js";
import { createDisclosureUpdater } from "./disclosure-updater.js";
import { previousMonth } from "./funds.js";
const args = process.argv.slice(2), index = args.indexOf("--month");
const month = index >= 0 ? args[index + 1] : previousMonth(new Date().toISOString().slice(0, 7));
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "") || month > new Date().toISOString().slice(0, 7)) throw Error("Use --month YYYY-MM with a current or past reporting month");
const database = process.env.DATABASE_URL ? createPostgresStorage(process.env.DATABASE_URL) : null;
try {
  const store = database?.store || createStore(path.resolve(process.env.DATA_DIR || "data"));
  const update = await store.beginUpdate(month);
  if (!update.started) throw Error("An update is already running for this month. Follow its progress in the dashboard.");
  const run = await createDisclosureUpdater(store).run(update.run);
  console.log(JSON.stringify({ month, status: run.status, verified: run.verified, changed: run.imported,
    report: run.report.map(({ fundId, name, status, holdings, error }) => ({ fundId, name, status, holdings, error })) }, null, 2));
  if (run.status !== "success") process.exitCode = 1;
} finally { await database?.close(); }
