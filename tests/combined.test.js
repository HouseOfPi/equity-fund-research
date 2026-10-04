import { test } from "node:test";
import assert from "node:assert/strict";
import { combinedAnalysis } from "../server/combined-analysis.js";
import { topHoldings } from "../server/funds.js";
test("combined quantities cover comparable funds only and suppress uncertain aggregates", () => {
  const row = (net, movement = "Increased share quantity") => ({ id: "a", company: "Fixture equity", previousQuantity: 100, currentQuantity: 100 + net, net, movement });
  const fund = (id, rows) => ({ id, name: "Fixture fund " + id, analysis: { pending: false, rows, sources: [] } });
  const result = combinedAnalysis([fund("01", [row(20)]), fund("02", [row(-10, "Decreased share quantity")]), { analysis: { pending: true } }]);
  assert.equal(result.covered, 2); assert.equal(result.pending, 1);
  assert.equal(result.rows[0].net, 10); assert.equal(result.rows[0].current, 210); assert(result.rows[0].mixed);
  assert.equal(combinedAnalysis([fund("01", [row(20)]), fund("02", [row(0, "Needs review")])]).rows[0].net, null);
});
test("top 15 uses equity weights while full records retain all instruments", () => {
  const holdings = Array.from({ length: 25 }, (_, i) => ({ companyId: String(i), company: String(i), instrument: "equity", allocation: i }));
  holdings.push({ instrument: "cash", allocation: 100 });
  assert.equal(topHoldings({ holdings }).length, 15);
  assert.equal(topHoldings({ holdings })[0].companyId, "24");
  assert.equal(holdings.length, 26);
});

test("combined movement distinguishes new/exited companies from individual fund entries and exits", () => {
  const row = (id, previous, current, movement) => ({ id, company: "Fixture " + id, previousQuantity: previous, currentQuantity: current, net: current - previous, movement });
  const fund = (id, rows) => ({ id, name: "Fixture fund " + id, analysis: { pending: false, rows, sources: [] } });
  const result = combinedAnalysis([
    fund("01", [row("mixed", 100, 120, "Increased share quantity"), row("new", 0, 20, "New position"), row("exit", 20, 0, "Exited position"), row("decrease", 50, 10, "Decreased share quantity"), row("same", 10, 10, "Unchanged"), row("review", 10, 15, "Needs review")]),
    fund("02", [row("mixed", 100, 90, "Decreased share quantity"), row("new", 0, 30, "New position"), row("review", 50, 60, "Increased share quantity")]),
    { id: "03", name: "Missing fund", analysis: { pending: true, reason: "Previous disclosure missing" } },
  ]);
  assert.deepEqual(result.counts, { changed: 5, increased: 1, decreased: 1, new: 1, exited: 1, mixed: 1, all: 6, review: 1 });
  assert.equal(result.rows.find((r) => r.id === "mixed").net, 10);
  assert.equal(result.rows.find((r) => r.id === "new").current, 50);
  assert.equal(result.rows.find((r) => r.id === "review").previous, null);
  assert.equal(result.reviewComparisons, 1);
  assert.equal(result.pendingFunds[0].id, "03");
});
