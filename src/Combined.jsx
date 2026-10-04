import React, { useState } from "react";
import { useSortedRows, SortButton, SortHeading } from "./sorting.jsx";
import { monthLabel, number, pct, prev } from "./utils.js";
const categories = [
  { key: "changed", label: "All changes", match: (row) => row.movement !== "Unchanged" },
  { key: "increased", label: "Net increased", match: (row) => row.movement === "Net increase" },
  { key: "decreased", label: "Net decreased", match: (row) => row.movement === "Net decrease" },
  { key: "new", label: "New", match: (row) => row.movement === "New across funds" },
  { key: "exited", label: "Exited", match: (row) => row.movement === "Exited across funds" },
  { key: "mixed", label: "Mixed directions", match: (row) => row.mixed },
  { key: "all", label: "All companies", match: () => true },
  { key: "review", label: "Needs review", match: (row) => row.review },
];
const signed = (value) => value == null ? "—" : `${value > 0 ? "+" : ""}${number(value)}`;
const direction = (value) => value > 0 ? "positive" : value < 0 ? "negative" : "";
const companyColumns = [
  { key: "company", label: "Company" }, { key: "movement", label: "Combined movement" },
  { key: "increased", label: "Adding" }, { key: "decreased", label: "Reducing" },
  { key: "previous", label: "Previous shares" }, { key: "current", label: "Current shares" },
  { key: "net", label: "Net shares" },
];
const fundColumns = [
  { key: "fundName", label: "Fund" }, { key: "movement", label: "Movement" },
  { key: "previousQuantity", label: "Previous shares" }, { key: "currentQuantity", label: "Current shares" },
  { key: "net", label: "Net shares" }, { key: "allocation", label: "Current allocation" },
];
function CompanyDetails({ row }) {
  const sorting = useSortedRows(row.entries);
  return <div className="combined-fund-details">
    <p className="fine">Change across compared funds: {pct(row.percent)}. Individual allocation percentages are weights in each fund.</p>
    <table className="combined-detail-table"><thead><tr>{fundColumns.map((column) => <SortHeading key={column.key} column={column} sorting={sorting} />)}</tr></thead>
      <tbody>{sorting.rows.map((entry) => <tr key={entry.fundId}>
        <td><b>{entry.fundName}</b>{entry.reason && <small className="warning-text">{entry.reason}</small>}
          <details className="combined-sources"><summary>Disclosure sources</summary>{entry.sources.map((source, index) => <a key={index} href={source.url} target="_blank" rel="noreferrer">{source.disclosureDate} · {source.label} ↗</a>)}</details></td>
        <td>{entry.movement}</td><td className="numeric">{number(entry.previousQuantity)}</td><td className="numeric">{number(entry.currentQuantity)}</td>
        <td className={"numeric " + direction(entry.net)}>{signed(entry.net)}</td><td className="numeric">{pct(entry.allocation)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
export default function Combined({ analysis, month }) {
  const [filter, setFilter] = useState("changed"), [expanded, setExpanded] = useState(new Set());
  const counts = analysis.counts || {}, selected = categories.find((category) => category.key === filter);
  const sorting = useSortedRows(analysis.rows.filter(selected.match), { key: "net", direction: "descending" });
  const rows = sorting.rows;
  function toggle(id) { setExpanded((previous) => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; }); }
  return <details className="combined-section section-disclosure" open>
    <summary><span>Combined portfolio analysis</span><span className="fine">vs {monthLabel(prev(month))}</span></summary>
    <div className="disclosure-body">
      {!analysis.covered ? <div className="empty-panel"><b>Comparison pending</b><p>Complete {monthLabel(prev(month))} and {monthLabel(month)} disclosures are needed to calculate share movements.</p></div> : <>
        <div className="combined-stats">{[
          ["increased", "Net increased", "positive"], ["decreased", "Net decreased", "negative"],
          ["new", "New across funds", "positive"], ["exited", "Exited across funds", "negative"],
        ].map(([key, label, tone]) => <button key={key} className="combined-stat" onClick={() => setFilter(key)} aria-label={`Filter ${label}: ${counts[key] || 0}`} aria-pressed={filter === key}><b className={tone}>{number(counts[key] || 0)}</b><span>{label}</span></button>)}</div>
        {analysis.pending > 0 && <div className="combined-coverage"><b>Partial coverage: {analysis.covered} of 20 funds compared.</b> Totals and new/exited classifications use these funds only.
          <details><summary>{analysis.pending} {analysis.pending === 1 ? "fund awaits" : "funds await"} comparable disclosures</summary><ul>{analysis.pendingFunds?.map((fund) => <li key={fund.id}>{fund.name}</li>)}</ul></details>
        </div>}
        <div className="combined-filters" role="group" aria-label="Combined movement filters">{categories.filter((category) => !["increased", "decreased", "new", "exited"].includes(category.key)).map((category) => <button key={category.key} aria-pressed={filter === category.key} className={filter === category.key ? "selected" : ""} onClick={() => setFilter(category.key)}>{category.label}<span>{number(counts[category.key] || 0)}</span></button>)}<details className="combined-method"><summary>How it works</summary><p>Adding includes increases and new positions; reducing includes decreases and exits. New and exited classifications apply across the compared funds. Affected company totals are withheld when a comparison needs review. Expand a company to see fund details and disclosure sources.</p></details></div>
        <div className="combined-table-scroll" tabIndex="0" role="region" aria-label="Combined company share movements">
          <table className="combined-table"><thead><tr>
            {companyColumns.slice(0, 2).map((column) => <SortHeading key={column.key} column={column} sorting={sorting} />)}
            <th scope="col" aria-sort={["increased", "decreased"].includes(sorting.sort?.key) ? sorting.sort.direction : "none"}>
              <span>Funds</span><div className="combined-count-sort">{companyColumns.slice(2, 4).map((column) => <SortButton key={column.key} column={column} sorting={sorting} />)}</div>
            </th>
            {companyColumns.slice(4).map((column) => <SortHeading key={column.key} column={column} sorting={sorting} />)}
          </tr></thead>
            <tbody>{rows.map((row) => <React.Fragment key={row.id}><tr className={expanded.has(row.id) ? "combined-row-open" : ""}>
              <td><button className="combined-company-toggle" aria-expanded={expanded.has(row.id)} aria-controls={"company-" + encodeURIComponent(row.id)} onClick={() => toggle(row.id)}><span className="combined-chevron" aria-hidden="true">{expanded.has(row.id) ? "⌄" : "›"}</span><span><b>{row.company}</b><small>{row.entries.length} {row.entries.length === 1 ? "fund" : "funds"}{row.mixed && " · Mixed directions"}</small></span></button></td>
              <td><span className={row.review ? "warning-text" : direction(row.net)}>{row.movement}</span></td>
              <td><div className="combined-directions"><span className="positive" title="Funds increasing quantity or opening a position">+ {row.increased}</span><span className="negative" title="Funds decreasing quantity or exiting a position">− {row.decreased}</span></div></td>
              <td className="numeric">{number(row.previous)}</td><td className="numeric">{number(row.current)}</td><td className={"numeric " + direction(row.net)}>{signed(row.net)}</td>
            </tr>{expanded.has(row.id) && <tr><td colSpan="6" id={"company-" + encodeURIComponent(row.id)}><CompanyDetails row={row} /></td></tr>}</React.Fragment>)}</tbody>
          </table>{!rows.length && <p className="empty">No companies in this category.</p>}
        </div>
      </>}
    </div>
  </details>;
}
