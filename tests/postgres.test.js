import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pg from "pg";
import { schemaSql, seedFunds, syncSnapshots } from "../server/postgres-projections.js";

test("Postgres projections replace stale rows and roll back invalid imports", {
  skip: process.env.RUN_POSTGRES_TESTS !== "1",
}, async () => {
  // Explicit opt-in only. All fixtures and schema changes are rolled back.
  await import("dotenv/config");
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL required");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, enableChannelBinding: true });
  await client.connect();
  try {
    await client.query("BEGIN");
    const schema = "test_observatory_" + crypto.randomBytes(8).toString("hex");
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query(schemaSql);
    await seedFunds(client);
    const snapshot = (fundId, companyId = "old") => ({
      fundId, month: "2026-08", disclosureDate: "2026-08-31", complete: true,
      verification: "unverified",
      holdings: [{ companyId, company: "Synthetic fixture", instrument: "equity", quantity: null, allocation: 50 }],
      sources: [{ label: "Synthetic fixture", url: "https://example.invalid/fixture", type: "official",
        disclosureDate: "2026-08-31", retrievedAt: "2026-10-03T00:00:00Z", result: "not_checked" }],
    });
    const snapshots = { one: snapshot("01"), two: snapshot("02") };
    await syncSnapshots(client, snapshots);
    snapshots.one = snapshot("01", "new");
    snapshots.one.holdings.push({ companyId: "cash", company: "Net payables", instrument: "cash", quantity: null, allocation: -1 });
    snapshots.one.sources.push({ ...snapshots.one.sources[0], label: "Second source" });
    await syncSnapshots(client, snapshots);
    assert.deepEqual((await client.query("SELECT fund_id, company_id FROM observatory_holdings ORDER BY fund_id, company_id")).rows,
      [{ fund_id: "01", company_id: "cash" }, { fund_id: "01", company_id: "new" }, { fund_id: "02", company_id: "old" }]);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM observatory_sources")).rows[0].n, 3);
    snapshots.one.holdings.push({ companyId: "fractional", company: "Fixture fund unit", instrument: "fund_unit", quantity: 123.4567, allocation: 1 });
    snapshots.one.sources[0].sha256 = "a".repeat(64);
    await syncSnapshots(client, snapshots);
    assert.equal((await client.query("SELECT quantity::text FROM observatory_holdings WHERE company_id='fractional'")).rows[0].quantity, "123.4567");
    assert.equal((await client.query("SELECT sha256 FROM observatory_sources WHERE fund_id='01' AND source_number=1")).rows[0].sha256, "a".repeat(64));
    await client.query("SAVEPOINT fractional_equity");
    snapshots.one.holdings[0].quantity = 1.25;
    await assert.rejects(syncSnapshots(client, snapshots), { code: "23514" });
    await client.query("ROLLBACK TO SAVEPOINT fractional_equity");
    snapshots.one.holdings[0].quantity = null;
    await client.query("SAVEPOINT broken_import");
    snapshots.one.holdings[0].allocation = -1;
    await assert.rejects(syncSnapshots(client, snapshots), { code: "23514" });
    await client.query("ROLLBACK TO SAVEPOINT broken_import");
    assert.equal((await client.query("SELECT allocation::float FROM observatory_holdings WHERE fund_id='01' AND company_id='new'")).rows[0].allocation, 50);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM observatory_holdings")).rows[0].n, 4);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
