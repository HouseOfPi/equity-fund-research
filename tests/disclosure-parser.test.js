import { test } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseDisclosureFile, parseDisclosureRows } from "../server/disclosure-parser.js";
const source = { fundId: "01", month: "2026-08", sheet: "Fixture", url: "https://example.invalid/official.xlsx" };
const stamp = "2026-10-03T00:00:00Z";
const rows = () => [
  ["Nippon India Small Cap Fund", "Portfolio as on 31 August 2026"],
  ["Name of Instrument", "ISIN", "Quantity", "Market Value (Rs. in lakhs)", "% to NAV"],
  ["Equity"], ["Synthetic Equity", "INE000A01010", 10, 80, 80],
  ["Mutual Fund Units"], ["Synthetic Fund Unit", "INF000A01010", 20.125, 15, 15],
  ["Net Receivables / Payables", "", "", 5, 5], ["Grand Total", "", "", 100, 100],
];
test("official workbook parser preserves fractional fund units and checksums", () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows()), "Fixture");
  const snapshot = parseDisclosureFile(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }), source, stamp, "a".repeat(64));
  assert.equal(snapshot.holdings.length, 3);
  assert.equal(snapshot.holdings[1].instrument, "fund_unit");
  assert.equal(snapshot.holdings[1].quantity, 20.125);
  assert.equal(snapshot.aum.crore, 1);
  assert.equal(snapshot.sources[0].sha256, "a".repeat(64));
});
test("wrong date, missing identifiers, fractional shares and incomplete totals fail closed", () => {
  for (const mutate of [
    (r) => r[0][1] = "Portfolio as on 31 July 2026",
    (r) => r[3][1] = "",
    (r) => r[3][2] = 1.5,
    (r) => r[3][3] = 70,
    (r) => r.pop(),
  ]) {
    const input = rows(); mutate(input);
    assert.throws(() => parseDisclosureRows(input, source, stamp));
  }
});
test("percentage fractions, negative net payables and documented tiny weights reconcile", () => {
  const input = rows();
  input[3][3] = 85; input[3][4] = .85;
  input[5][4] = .15; input[6][3] = -0.004; input[6][4] = -.00004;
  input.splice(4, 0, ["Synthetic Tiny Equity", "INE000B01010", 1, .004, "*"]);
  input[input.length - 1][4] = 1;
  input.push(["* Percentage to NAV less than 0.01"]);
  const snapshot = parseDisclosureRows(input, source, stamp);
  assert.equal(snapshot.holdings[1].allocation, .004);
  assert(snapshot.holdings[1].allocationEvidence);
  assert.equal(snapshot.holdings[3].allocation, -.004);
  input.pop(); assert.throws(() => parseDisclosureRows(input, source, stamp));
});
test("explicit cash subtotal reconciliation avoids double counting", () => {
  const input = rows();
  input.splice(6, 1, ["Margin", "", "", 2, 2], ["Net Receivables / Payables", "", "", 3, 3], ["Net Receivables / Payables", "", "", 5, 5]);
  const configured = { ...source, cashAggregate: { label: "Net Receivables / Payables", components: ["Margin"] } };
  assert.equal(parseDisclosureRows(input, configured, stamp).holdings.length, 3);
  input[7][3] = 4;
  assert.throws(() => parseDisclosureRows(input, configured, stamp), /Cash aggregate/);
});

test("exact month-end validation accepts AMC month/year typography without relaxing the date", () => {
  const input = rows(); input[0][1] = "Monthly portfolio statement for the month ended 31 August2026";
  assert.equal(parseDisclosureRows(input, source, stamp).disclosureDate, "2026-08-31");
  input[0][1] = "Monthly portfolio statement for the month ended 30 August2026";
  assert.throws(() => parseDisclosureRows(input, source, stamp));
});
test("audited publisher identifier placeholders remain review flagged", () => {
  const input = rows(); input[3][1] = "INPLACEHOLDER";
  assert.throws(() => parseDisclosureRows(input, source, stamp), /valid ISIN/);
  const snapshot = parseDisclosureRows(input, { ...source, unresolvedIdentifiers: { "Synthetic Equity": "INPLACEHOLDER" } }, stamp);
  assert(snapshot.holdings[0].reviewReason);
  assert(snapshot.holdings[0].companyId.startsWith("unresolved:"));
  assert(snapshot.holdings[0].identifierEvidence.includes("INPLACEHOLDER"));
});
