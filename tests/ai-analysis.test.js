import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildAnalysisInput, validateAIReport, createAIResearch } from "../server/ai-analysis.js";
import { createStore } from "../server/store.js";
import { createApp } from "../server/app.js";
const snapshot = (month, quantity = 10) => ({ fundId: "01", month, complete: true, verification: "official", disclosureDate: month + "-" + (month === "2026-06" ? "30" : "31"),
  holdings: Array.from({ length: 20 }, (_, i) => ({ companyId: `fixture-${i}`, company: `Synthetic company ${i}`, instrument: "equity", quantity: quantity + i, allocation: i + 1, ...(i === 19 ? { reviewReason: "Synthetic disputed position" } : {}) })),
  sources: [{ label: "Synthetic fixture source", url: "https://example.invalid/report.xlsx", disclosureDate: month + "-31", retrievedAt: "2026-10-04T00:00:00Z", sha256: "a".repeat(64) }] });
const state = () => ({ snapshots: Object.fromEntries(["2026-06", "2026-07", "2026-08"].map((month, i) => [month + ":01", snapshot(month, 10 + i * 10)])), history: [] });
function report(input) {
  const evidenceId = "company:2026-08:fixture-0";
  return { title: "Synthetic test analysis", summary: ["Fixture behavior only."], findings: [{ title: "Fixture accumulation", observation: "The synthetic fund added shares.", interpretation: "A pattern to investigate, not a demonstrated motive.", confidence: "medium", evidenceIds: [evidenceId], claims: [{ evidenceId, metric: "netShares", value: input.evidence[evidenceId].metrics.netShares }], followUp: "Check a subsequent disclosure." }], fundBehaviors: [{ fundId: "01", summary: "Synthetic behavior.", evidenceIds: ["fund:2026-08:01"] }], limitations: ["Synthetic fixtures; no investment conclusions."] };
}
test("AI reads all positions and months; retrieval metadata does not invalidate reports", () => {
  const data = state(), input = buildAnalysisInput(data, "2026-08");
  assert.equal(input.payload.snapshots.filter((s) => s.complete).length, 3);
  assert.equal(input.payload.snapshots.find((s) => s.month === "2026-08" && s.fundId === "01").equity.length, 20);
  assert(input.evidence["company:2026-08:fixture-18"]);
  assert.equal(input.evidence["company:2026-08:fixture-19"].trusted, false);
  assert.equal(input.evidence["company:2026-08:fixture-19"].metrics.netShares, null);
  const id = "company:2026-08:fixture-0";
  const packed = input.payload.evidence[id].entries[0];
  assert.deepEqual(Object.fromEntries(input.payload.evidenceEntryColumns.map((column, index) => [column, packed[index]])),
    Object.fromEntries(input.payload.evidenceEntryColumns.map((column) => [column, input.evidence[id].entries[0][column] ?? null])));
  for (const s of Object.values(data.snapshots)) { s.sources[0].retrievedAt = "2026-10-04T01:00:00Z"; s.sources[0].sha256 = "b".repeat(64); }
  assert.equal(buildAnalysisInput(data, "2026-08").datasetHash, input.datasetHash);
  data.snapshots["2026-08:01"].holdings[0].quantity++;
  assert.notEqual(buildAnalysisInput(data, "2026-08").datasetHash, input.datasetHash);
});
test("AI rejects invented figures, unknown/disputed citations and omitted fund behavior", () => {
  const input = buildAnalysisInput(state(), "2026-08");
  assert(validateAIReport(report(input), input));
  const invented = report(input); invented.findings[0].claims[0].value = 999; assert.throws(() => validateAIReport(invented, input), /numerical claim/);
  const unknown = report(input); unknown.findings[0].evidenceIds = ["invented"]; assert.throws(() => validateAIReport(unknown, input), /missing or disputed/);
  const disputed = report(input); disputed.findings[0].evidenceIds = ["company:2026-08:fixture-19"]; assert.throws(() => validateAIReport(disputed, input), /missing or disputed/);
  const missingFund = report(input); missingFund.fundBehaviors = []; assert.throws(() => validateAIReport(missingFund, input), /every comparable fund/);
});
test("Coding reports persist by month, reject stale input and validate before saving", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-ai-"));
  try {
    const store = createStore(dir); store.get().snapshots = state().snapshots;
    const input = buildAnalysisInput(await store.get(), "2026-08");
    const envelope = { preparedBy: { agent: "Test coding agent", model: "test-model" }, month: "2026-08", datasetHash: input.datasetHash, report: report(input) };
    const saved = await store.saveCodingReport(envelope);
    assert.equal(saved.origin, "coding-environment");
    assert.deepEqual(saved.preparedBy, envelope.preparedBy);
    assert.equal(saved.model, "test-model");
    assert.equal((await store.saveCodingReport(envelope)).id, saved.id);
    const service = createAIResearch(createStore(dir));
    assert.equal((await service.latest("2026-08")).id, saved.id);
    assert.equal(await service.latest("2026-07"), null);
    store.get().snapshots["2026-08:01"].holdings[0].quantity++;
    assert.throws(() => store.saveCodingReport(envelope), /changed/);
    assert.equal((await createAIResearch(store).latest("2026-08")).stale, true);
    const bad = { ...envelope, datasetHash: buildAnalysisInput(store.get(), "2026-08").datasetHash, report: { ...report(buildAnalysisInput(store.get(), "2026-08")), fundBehaviors: [] } };
    assert.throws(() => store.saveCodingReport(bad), /every comparable fund/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("AI API is authenticated and read only", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-ai-api-"));
  const store = createStore(dir); store.get().snapshots = state().snapshots;
  const app = createApp({ store, dataDir: dir, secret: "s".repeat(40), password: "test", secure: false, origin: "http://localhost" });
  const server = app.listen(0, "127.0.0.1"); await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const options = { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: "2026-08" }) };
    assert.equal((await fetch(base + "/ai-analysis", options)).status, 401);
    const login = await fetch(base + "/login", { ...options, body: JSON.stringify({ password: "test" }) });
    const cookie = login.headers.get("set-cookie").split(";")[0]; options.headers.cookie = cookie;
    assert.equal((await fetch(base + "/ai-analysis", { ...options, headers: { ...options.headers, Origin: "https://untrusted.invalid" } })).status, 403);
    assert.equal((await fetch(base + "/ai-analysis", options)).status, 405);
    assert.equal((await fetch(base + "/ai-analysis?month=bad", { headers: { cookie } })).status, 400);
    const missing = await fetch(base + "/ai-analysis?month=2026-08", { headers: { cookie } });
    assert.equal(missing.status, 200); assert.equal((await missing.json()).run, null);
    assert.equal(store.get().aiReports?.length || 0, 0);
  } finally { await new Promise((resolve) => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); }
});
