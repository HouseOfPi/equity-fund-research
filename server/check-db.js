import "dotenv/config";
import { createPostgresStorage } from "./postgres-store.js";
let storage;
try {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("Set DATABASE_URL to your Neon pooled connection string in .env first.");
  storage = createPostgresStorage(process.env.DATABASE_URL);
  const document = await storage.store.get();
  const counts = await storage.stats();
  console.log(`Database connected: ${counts.funds} funds, ${counts.snapshots} snapshots, ${counts.holdings} holdings, ${counts.sources} sources, ${document.history.length} import history entries. Schema ready.`);
} catch (error) {
  console.error(String(error.message).replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database connection]"));
  process.exitCode = 1;
} finally {
  await storage?.close();
}
