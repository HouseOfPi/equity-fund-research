import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeLocalState, validateLocalState } from "../server/database-migration.js";

const snapshot = (fundId = "01", allocation = 1) => ({
  fundId, month: "2026-08", disclosureDate: "2026-08-31", complete: true,
  verification: "unverified", sources: [{ label: "Synthetic fixture", url: "https://example.invalid/fixture",
    type: "official", disclosureDate: "2026-08-31", retrievedAt: "2026-10-03T00:00:00Z", result: "not_checked" }],
  holdings: [{ companyId: "synthetic", company: "Synthetic fixture company", instrument: "equity", quantity: 1, allocation }],
});
const empty = () => ({ snapshots: {}, history: [], lastSuccessfulCheck: null });
test("migration preserves other records, local history and last check; rerunning is idempotent", () => {
  const source = { ...empty(), snapshots: { "2026-08:01": snapshot() },
    history: [{ at: "2026-10-03T00:00:00Z", result: "success", note: "Synthetic import" }],
    lastSuccessfulCheck: "2026-10-03T00:00:00Z" };
  const before = structuredClone(source);
  const destination = { ...empty(), snapshots: { "2026-08:02": snapshot("02") } };
  assert.deepEqual(mergeLocalState(destination, source), { added: 1, skipped: 0 });
  assert.equal(Object.keys(destination.snapshots).length, 2);
  assert.equal(destination.history.length, 2);
  assert.equal(destination.lastSuccessfulCheck, source.lastSuccessfulCheck);
  assert.deepEqual(source, before);
  assert.deepEqual(mergeLocalState(destination, source), { added: 0, skipped: 1 });
  assert.equal(destination.history.length, 2);
});
test("migration checks all conflicts before changing the destination", () => {
  const source = { ...empty(), snapshots: { "2026-08:01": snapshot(), "2026-08:02": snapshot("02", 2) } };
  const destination = { ...empty(), snapshots: { "2026-08:02": snapshot("02") } };
  const before = structuredClone(destination);
  assert.throws(() => mergeLocalState(destination, source), /different data/);
  assert.deepEqual(destination, before);
});
test("migration compares JSONB records independently of property ordering", () => {
  const s = snapshot();
  const reordered = Object.fromEntries(Object.entries(s).reverse());
  const destination = { ...empty(), snapshots: { "2026-08:01": reordered } };
  assert.deepEqual(mergeLocalState(destination, { ...empty(), snapshots: { "2026-08:01": s } }), { added: 0, skipped: 1 });
});
test("migration rejects invalid snapshots and mismatched datastore keys", () => {
  assert.throws(() => validateLocalState({ ...empty(), snapshots: { "2026-09:01": snapshot() } }), /Snapshot key/);
  assert.throws(() => validateLocalState({ ...empty(), snapshots: { "2026-08:01": { ...snapshot(), disclosureDate: "2026-09-30" } } }));
});
