import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createPostgresStorage } from "./postgres-store.js";
import { validateLocalState } from "./database-migration.js";

const dryRun = process.argv.includes("--dry-run");
const file = path.resolve(process.env.DATA_DIR || "data", "observatory.json");
let storage;
try {
  if (!fs.existsSync(file)) throw new Error("No local datastore found to migrate.");
  const document = validateLocalState(JSON.parse(fs.readFileSync(file, "utf8")));
  const count = Object.keys(document.snapshots).length;
  if (dryRun) {
    console.log(`Local datastore validated: ${count} snapshots, ${document.history.length} history entries. No database writes performed.`);
  } else {
    if (!process.env.DATABASE_URL?.trim()) throw new Error("Set DATABASE_URL to your Neon pooled connection string in .env, then rerun npm run db:migrate.");
    storage = createPostgresStorage(process.env.DATABASE_URL);
    const result = await storage.store.migrate(document);
    console.log(`Neon/Postgres migration complete: ${result.added} added, ${result.skipped} already present. Local files preserved.`);
  }
} catch (error) {
  const message = String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database connection]");
  console.error(message);
  process.exitCode = 1;
} finally {
  await storage?.close();
}
