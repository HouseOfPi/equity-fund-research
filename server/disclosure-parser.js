import * as XLSX from "xlsx";
import { unzipSync } from "fflate";
import { funds } from "./funds.js";
import { snapshotSchema } from "./schema.js";

const normalized = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, "");
const round = (value) => Math.round(value * 1e8) / 1e8;
export function numeric(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const cleaned = typeof value === "string" ? value.replace(/[, %]/g, "").replace(/^\$(?=\d)/, "") : value;
  const result = Number(cleaned);
  return Number.isFinite(result) ? result : null;
}
// Excel dates have no timezone. Preserve the worksheet's calendar date.
const text = (value) => value instanceof Date
  ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
  : String(value ?? "").trim();
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parseDisclosureRows(input, source, retrievedAt, sha256) {
  const scheme = funds.find((fund) => fund.id === source.fundId)?.name;
  if (!scheme) throw Error("Unknown fund");
  let rows = input;
  if (source.layout === "uti-consolidated") {
    const starts = rows.flatMap((row, index) => text(row[0]) === "SCHEME: " + scheme ? [index] : []);
    if (starts.length !== 1) throw Error("Expected exactly one matching UTI scheme block");
    const next = rows.findIndex((row, index) => index > starts[0] && text(row[0]).startsWith("SCHEME:"));
    rows = rows.slice(starts[0], next < 0 ? undefined : next);
  }
  const title = rows.slice(0, 18).flat().map(text).join(" ");
  const notes = rows.flat().map(text).join(" ");
  if (!normalized(title).includes(normalized(scheme))) throw Error("Workbook scheme does not match " + scheme);
  const [year, month] = source.month.split("-").map(Number);
  const date = new Date(Date.UTC(year, month, 0));
  const day = date.getUTCDate(), disclosureDate = date.toISOString().slice(0, 10);
  const full = date.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const monthPattern = `${full.slice(0, 3)}(?:${full.slice(3)})?`;
  const dates = [escape(disclosureDate), `${monthPattern}\\s*${day},?\\s*${year}`,
    `${day}(?:st|nd|rd|th)?[\\s/-]+${monthPattern}[\\s,/-]*${year}`, `${day}[./-]0?${month}[./-]${year}`];
  if (!dates.some((pattern) => new RegExp(pattern, "i").test(title))) throw Error("Workbook does not attest the requested month-end date");
  const header = rows.findIndex((row, index) => index < 25 && row.some((value) => /^isin/i.test(text(value))) && row.some((value) => /quantity/i.test(text(value))));
  if (header < 0) throw Error("Instrument table header missing");
  const labels = rows[header].map((value) => text(value).toLowerCase().replace(/\s+/g, " "));
  const column = (match) => {
    const index = labels.findIndex(match);
    if (index < 0) throw Error("Required portfolio column missing");
    return index;
  };
  const nc = column((value) => /name/.test(value) && /instrument/.test(value));
  const ic = column((value) => /^isin/.test(value)), qc = column((value) => /quantity/.test(value));
  const ac = column((value) => /%/.test(value) && /nav|net asset|aum/.test(value));
  const vc = column((value) => /value/.test(value) && /market|fair|mkt/.test(value));
  const isGrand = (value) => /^grand\s*total(?:\s*\(aum\))?$/i.test(text(value)) ||
    source.layout === "uti-consolidated" && new RegExp(`^TOTAL\\s*:\\s*${escape(scheme)}$`, "i").test(text(value));
  const totalIndex = rows.findIndex((row, index) => index > header && isGrand(row[nc]));
  if (totalIndex < 0) throw Error("Grand total missing; disclosure may be incomplete");
  const total = rows[totalIndex], totalValue = numeric(total[vc]);
  let grand = numeric(total[ac]);
  if (grand === null && source.layout === "uti-consolidated") grand = 100;
  const scale = grand !== null && Math.abs(grand - 1) < 0.01 ? 100 : 1;
  if (grand === null || Math.abs(grand * scale - 100) > 0.1 || !totalValue || totalValue < 0) throw Error("Unexpected total or percentage units");
  const skipped = new Set();
  if (source.cashAggregate) {
    const config = source.cashAggregate;
    const matches = rows.flatMap((row, index) => index > header && index < totalIndex && text(row[nc]) === config.label && numeric(row[vc]) !== null ? [index] : []);
    if (matches.length !== 2) throw Error("Cash aggregate layout changed");
    const components = rows.flatMap((row, index) => index > header && index < matches[1] && config.components.includes(text(row[nc])) && numeric(row[vc]) !== null ? [index] : []);
    if (components.length !== config.components.length || Math.abs([...components, matches[0]].reduce((n, i) => n + numeric(rows[i][vc]), 0) - numeric(rows[matches[1]][vc])) > 0.02) throw Error("Cash aggregate does not reconcile");
    for (const index of [...components, matches[0]]) skipped.add(index);
  }
  const holdings = new Map();
  let section = "equity", marketSum = 0;
  for (let index = header + 1; index < totalIndex; index++) {
    if (skipped.has(index)) continue;
    const row = rows[index], name = text(row[nc]), low = name.toLowerCase(), isin = text(row[ic]).toUpperCase();
    if (/^(sub\s*total|total)(\s|:|$)/i.test(name)) continue;
    const value = numeric(row[vc]), raw = text(row[ac]);
    let allocation = numeric(row[ac]), allocationEvidence;
    if (allocation === null && value !== null && /^#0(?:\.0+)?%$/.test(raw) && /#.*?less\s*than\s*0\.005/i.test(notes)) {
      allocation = 0;
      allocationEvidence = "AMC displays #0.00%, defined as less than 0.005%; published rounded weight retained.";
    }
    if (allocation === null && value !== null && ((raw === "*" && /Percentage\s+to\s+NAV\s+less\s+than\s+0\.01/i.test(notes)) || (raw === "#" && /#\s*percentage\s+to\s+NAV.*?less\s+than\s+0\.01/i.test(notes)))) {
      allocation = value / totalValue * 100 / scale;
      allocationEvidence = "AMC reports a weight below 0.01%; allocation calculated from disclosed market value / disclosed net assets × 100.";
    }
    if (allocation === null || value === null) {
      if (/equity/.test(low)) section = "equity";
      else if (/treps|triparty|tri-party|reverse repo/.test(low)) section = "treps";
      else if (/money market|debt|commercial paper|certificate of deposit|treasury bill/.test(low)) section = "debt";
      else if (/fund units|mutual fund|reit|invit/.test(low)) section = "fund_unit";
      else if (/cash|short term deposit|term deposits/.test(low)) section = "cash";
      else if (/derivative/.test(low)) section = "derivative";
      if (value !== null && value !== 0) throw Error("Valued row has an unrecognized allocation: " + name);
      continue;
    }
    if (!name) {
      if (value === 0 && allocation === 0 && !isin && numeric(row[qc]) === null) continue;
      throw Error("Unrecognized valued row");
    }
    const instrument = /treps|triparty|tri-party|reverse repo/.test(low) ? "treps" : /cash|margin|receiv|payable|net current/.test(low) ? "cash" : section;
    const unresolved = instrument === "equity" && !/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin);
    if (unresolved && (isin ? source.unresolvedIdentifiers?.[name] !== isin : !source.missingIsinNames?.includes(name)))
      throw Error("Equity row lacks a valid ISIN: " + name);
    const quantity = numeric(row[qc]);
    if (quantity !== null && (quantity < 0 || quantity > Number.MAX_SAFE_INTEGER || instrument === "equity" && !Number.isSafeInteger(quantity))) throw Error("Invalid quantity: " + name);
    const companyId = unresolved ? `unresolved:${source.fundId}:${normalized(name)}` : isin || `${instrument}:${normalized(name)}`;
    const holding = { companyId, company: source.layout === "uti-consolidated" ? name.replace(/^EQ\s*-\s*/, "") : name, instrument, quantity, allocation: round(allocation * scale) };
    if (isin) holding.identifierEvidence = "ISIN in official monthly portfolio: " + isin;
    if (unresolved) {
      holding.reviewReason = isin
        ? "Official workbook uses an identifier placeholder; reconcile identity before comparing share movements."
        : "Official workbook leaves the ISIN blank; reconcile identity before comparing share movements.";
      holding.identifierEvidence = "Official name and quantity retained with a fund-scoped unresolved identifier." + (isin ? " AMC identifier: " + isin : "");
    }
    if (allocationEvidence) holding.allocationEvidence = allocationEvidence;
    if (/@/.test(name) && /Hindustan Dorr.Oliver.*?delisted.*?liquidation/i.test(notes)) holding.reviewReason = "Official footnote: delisted following liquidation and written off; quantity movements require review.";
    if (holdings.has(companyId)) {
      const before = holdings.get(companyId);
      if (before.instrument !== instrument) throw Error("Ambiguous duplicate ISIN: " + isin);
      before.allocation = round(before.allocation + holding.allocation);
      before.quantity = before.quantity === null || quantity === null ? null : before.quantity + quantity;
    } else holdings.set(companyId, holding);
    marketSum += value;
  }
  if (Math.abs(marketSum - totalValue) > Math.max(2, holdings.size * 0.02)) throw Error(`Market values do not reconcile: ${marketSum.toFixed(2)} vs ${totalValue.toFixed(2)}`);
  const allocationTotal = [...holdings.values()].reduce((n, holding) => n + holding.allocation, 0);
  if (Math.abs(allocationTotal - 100) > 0.5) throw Error("Net-asset allocations do not reconcile");
  if (![...holdings.values()].some((holding) => holding.instrument === "equity")) throw Error("No equity holdings");
  const evidence = { label: scheme + " — official monthly portfolio", url: source.url, type: "official", disclosureDate, retrievedAt, result: "agrees" };
  if (sha256) evidence.sha256 = sha256;
  const snapshot = { fundId: source.fundId, month: source.month, disclosureDate, complete: true, verification: "official", sources: [evidence], holdings: [...holdings.values()] };
  if (/lakh|lac/.test(labels[vc]) || source.layout === "uti-consolidated" && /market value in lacs/i.test(title)) snapshot.aum = { crore: totalValue / 100, date: disclosureDate, sourceUrl: source.url, verified: true };
  return snapshotSchema.parse(snapshot);
}

export function parseDisclosureFile(bytes, source, retrievedAt, sha256) {
  let payload = bytes;
  if (source.member) {
    const files = unzipSync(new Uint8Array(bytes), { filter: (file) => file.name === source.member && file.originalSize < 40_000_000 });
    payload = files[source.member];
    if (!payload) throw Error("Expected workbook missing from disclosure archive");
  }
  const workbook = XLSX.read(payload, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[source.sheet];
  if (!sheet) throw Error("Expected scheme sheet missing: " + source.sheet);
  return parseDisclosureRows(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }), source, retrievedAt, sha256);
}
