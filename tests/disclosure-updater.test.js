import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore } from "../server/store.js";
import { createApp } from "../server/app.js";
import { createDisclosureUpdater } from "../server/disclosure-updater.js";
import { funds } from "../server/funds.js";
const snapshot = (fundId, quantity = 10) => ({ fundId, month: "2026-08", disclosureDate: "2026-08-31", complete: true, verification: "official",
  holdings: [{ companyId: "INE000A01010", company: "Synthetic test equity", instrument: "equity", quantity, allocation: 100 }],
  sources: [{ label: "Synthetic official fixture", url: "https://example.invalid/workbook", type: "official", disclosureDate: "2026-08-31", retrievedAt: "2026-10-03T00:00:00Z", result: "agrees" }] });
const catalog = (month) => funds.map((fund) => ({ fundId: fund.id, month, unavailable: !["01", "02"].includes(fund.id) }));
test("partial update persists passing funds and retains failed records; repeat checks are idempotent", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-update-"));
  try {
    const store = createStore(dir); store.import({ note: "fixture", snapshots: [snapshot("02", 50)] }, "test");
    const fetchSource = async (source) => { if (source.fundId === "02") throw Error("Fixture source unavailable"); return snapshot(source.fundId); };
    const updater = createDisclosureUpdater(store, { catalog, fetchSource });
    const first = await store.beginUpdate("2026-08");
    assert.equal((await store.beginUpdate("2026-08")).started, false);
    const result = await updater.run(first.run);
    assert.equal(result.status, "partial"); assert.equal(result.verified, 1);
    const state = createStore(dir).get();
    assert.equal(state.snapshots["2026-08:02"].holdings[0].quantity, 50);
    assert.equal(state.updateRuns[0].report[1].status, "failed");
    // JSONB key order and retrieval metadata never manufacture holding changes.
    const changedOrder = { ...snapshot("01"), sources: [{ ...snapshot("01").sources[0], retrievedAt: "2026-10-03T01:00:00Z", sha256: "b".repeat(64) }] };
    const reordered = Object.fromEntries(Object.entries(changedOrder).reverse());
    assert.equal(store.import({ note: "metadata refresh", snapshots: [reordered] }, "test").length, 0);
    const second = await updater.run((await store.beginUpdate("2026-08")).run);
    assert.equal(second.imported, 0); assert.equal(second.report[0].status, "unchanged");
    assert(store.get().lastSuccessfulCheck);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("dashboard reads never fetch sources; authorized sync coalesces requests and publishes saved data", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-sync-api-"));
  let calls = 0, release;
  const blocked = new Promise((resolve) => { release = resolve; }), tasks = [];
  const seed = createStore(dir);
  seed.import({ note: "Previous-month fixtures", snapshots: ["01", "02"].map((id) => {
    const record = snapshot(id, 5);
    return { ...record, month: "2026-07", disclosureDate: "2026-07-31", sources: record.sources.map((source) => ({ ...source, disclosureDate: "2026-07-31" })) };
  }) }, "test");
  const app = createApp({ dataDir: dir, secret: "s".repeat(40), password: "test", updaterToken: "updater", secure: false, origin: "http://localhost",
    sourceCatalog: catalog, disclosureFetcher: async (source) => { calls++; await blocked; return snapshot(source.fundId, calls > 2 ? 30 : 10); }, defer: (task) => tasks.push(task) });
  const server = app.listen(0, "127.0.0.1"); await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port + "/api";
  try {
    const login = await fetch(base + "/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "test" }) });
    const cookie = login.headers.get("set-cookie").split(";")[0], headers = { cookie, "Content-Type": "application/json" };
    for (const route of ["/months", "/portfolio?month=2026-08", "/updates", "/portfolio?month=2026-08"]) assert.equal((await fetch(base + route, { headers })).status, 200);
    assert.equal(calls, 0);
    const options = { method: "POST", headers, body: JSON.stringify({ month: "2026-08" }) };
    assert.equal((await fetch(base + "/updater/sync", options)).status, 403);
    assert.equal((await fetch(base + "/portfolio/refresh", { ...options, headers: { "Content-Type": "application/json" } })).status, 401);
    assert.equal((await fetch(base + "/portfolio/refresh", { ...options, headers: { ...headers, Origin: "https://untrusted.invalid" } })).status, 403);
    const started = await (await fetch(base + "/portfolio/refresh", options)).json();
    const duplicate = await (await fetch(base + "/portfolio/refresh", options)).json();
    assert.equal(duplicate.started, false); assert.equal(started.run.id, duplicate.run.id);
    release(); await Promise.all(tasks);
    const report = await (await fetch(base + "/updates/" + started.run.id, { headers })).json();
    assert.equal(report.verified, 2);
    const portfolio = await (await fetch(base + "/portfolio?month=2026-08", { headers })).json();
    assert.equal(portfolio.funds.filter((fund) => fund.snapshot).length, 2);
    assert.equal(calls, 2);
    assert.equal(portfolio.combined.covered, 2);
    assert.equal(portfolio.combined.rows[0].net, 10);
    // A later click downloads again and changes both saved holdings and totals.
    await fetch(base + "/portfolio/refresh", options);
    await Promise.all(tasks);
    const refreshed = await (await fetch(base + "/portfolio?month=2026-08", { headers })).json();
    assert.equal(calls, 4);
    assert.equal(refreshed.funds.find((fund) => fund.id === "01").snapshot.holdings[0].quantity, 30);
    assert.equal(refreshed.combined.rows[0].net, 50);
    options.headers = { ...headers, Authorization: "Bearer updater" };
    options.body = JSON.stringify({ month: "2099-08" });
    assert.equal((await fetch(base + "/updater/sync", options)).status, 400);
    assert.equal((await fetch(base + "/portfolio/refresh", options)).status, 400);
  } finally { release(); await Promise.all(tasks); await new Promise((r) => server.close(r)); fs.rmSync(dir, { recursive: true, force: true }); }
});

test("stale interrupted runs can be retried without losing saved portfolios", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-interrupted-"));
  try {
    const store = createStore(dir);
    store.import({ note: "fixture", snapshots: [snapshot("01", 42)] }, "test");
    const first = store.beginUpdate("2026-08");
    store.get().updateRuns[0].heartbeatAt = new Date(Date.now() - 180000).toISOString();
    const retry = store.beginUpdate("2026-08");
    assert(retry.started); assert.notEqual(retry.run.id, first.run.id);
    const restored = createStore(dir).get();
    assert.equal(restored.updateRuns[1].status, "failed");
    assert.equal(restored.snapshots["2026-08:01"].holdings[0].quantity, 42);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
