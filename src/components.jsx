import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { useSortedRows, SortButton, SortHeading } from "./sorting.jsx";
import { api, monthLabel, number, pct, prev, exportCsv } from "./utils.js";
export const alphabetical = (a, b) => a.localeCompare(b, "en", { sensitivity: "base", numeric: true });
export function PortfolioSearch({ id, label, value, onChange, count, total, noun, disabled = false }) {
  return <div className="portfolio-search">
    <div className="portfolio-search-field">
      <label className="visually-hidden" htmlFor={id}>{label}</label>
      <input id={id} type="search" placeholder={label + "…"} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} aria-describedby={id + "-results"} />
    </div>
    {value && <button disabled={disabled} onClick={() => onChange("")} aria-label={"Clear " + label.toLowerCase()}>Clear</button>}
    <span id={id + "-results"} className={value.trim() ? "fine" : "visually-hidden"} aria-live="polite" aria-atomic="true">{value.trim() ? `${count} of ${total} ${noun}` : ""}</span>
  </div>;
}
export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4v16h16M8 16v-4m5 4V8m5 8V5" strokeLinecap="round" /></svg>
    </span>
  );
}
export function Login({ onLogin }) {
  const [password, set] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  return (
    <main className="login">
      <div className="login-card">
        <div className="brand login-brand"><Logo /><span>Smallcap<small>OBSERVATORY</small></span></div>
        <h1>Your fund dashboard</h1>
        <p className="muted">Enter your password to view the funds.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/login", {
                method: "POST",
                body: JSON.stringify({ password }),
              });
              onLogin();
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label htmlFor="password">Password</label>
          <div className="password-field"><input
            id="password"
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => set(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          /><button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? "Hide" : "Show"}</button></div>
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in →"}
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
        <p className="fine">Private access · Source-led research</p>
      </div>
    </main>
  );
}
function Sources({ snapshot }) {
  return (
    <section>
      <h3>Disclosure & verification</h3>
      {!snapshot ? (
        <p className="muted">
          No disclosure has been imported for this exact reporting month. Source
          links will appear with the imported record.
        </p>
      ) : (
        <>
          <div className="metadata">
            <span>
              As of <b>{snapshot.disclosureDate}</b>
            </span>
            <span>
              Verification{" "}
              <b>
                {
                  {
                    official: "Official evidence recorded",
                    provider_agreement: "Third-party agreement",
                    unverified: "Needs verification",
                    conflict: "Unresolved conflict",
                  }[snapshot.verification]
                }
              </b>
            </span>
            <span>
              Coverage{" "}
              <b>
                {snapshot.complete
                  ? "Complete disclosure"
                  : "Partial disclosure"}
              </b>
            </span>
          </div>
          <ul className="sources">
            {snapshot.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label} ↗
                </a>
                <span>
                  {s.type} · {s.result.replace("_", " ")} · as of{" "}
                  {s.disclosureDate}
                </span>
                <small>
                  Retrieved {s.retrievedAt}
                  {s.feed && " · Feed: " + s.feed}
                </small>
              </li>
            ))}
          </ul>
          {snapshot.aum && (
            <p>
              Verified scheme AUM: ₹{number(snapshot.aum.crore)} crore ·{" "}
              {snapshot.aum.date} ·{" "}
              <a href={snapshot.aum.sourceUrl} target="_blank" rel="noreferrer">
                AUM source ↗
              </a>
            </p>
          )}
        </>
      )}
      <p className="fine">
        Official AMC monthly disclosures are preferred. Cross-checks must use
        the same month. Providers can share a common data feed; agreement alone
        is not independent official verification.
      </p>
    </section>
  );
}
const filters = {
  "All changes": (r) => r.movement !== "Unchanged",
  Increased: (r) => r.movement === "Increased share quantity",
  Decreased: (r) => r.movement === "Decreased share quantity",
  New: (r) => r.movement === "New position",
  Exited: (r) => r.movement === "Exited position",
  "All companies": () => true,
  "Needs review": (r) => r.movement === "Needs review",
};
function Analysis({ analysis, month }) {
  const [filter, setFilter] = useState("All changes");
  const sorting = useSortedRows(analysis.pending ? [] : analysis.rows.filter(filters[filter]));
  if (analysis.pending)
    return (
      <section>
        <h3>Whole-portfolio comparison</h3>
        <div className="pending-detail">
          <span>◷</span>
          <div>
            <b>Comparison pending</b>
            <p>{analysis.reason} Missing records are never treated as zero.</p>
          </div>
        </div>
        <p className="fine">
          Compares {monthLabel(prev(month))} → {monthLabel(month)}. The
          comparison includes all disclosed company equity, including unlisted
          equity, and excludes cash, TREPS, derivatives, debt and fund units.
        </p>
      </section>
    );
  const rows = sorting.rows;
  return (
    <section>
      <h3>Whole-portfolio comparison</h3>
      <p className="muted">
        {analysis.previousDate} → {analysis.currentDate} · Complete
        company-equity disclosures
      </p>
      <div className="counts">
        {Object.entries(analysis.counts).map(([name, n]) => (
          <span key={name}>
            <b>{n}</b> {name}
          </span>
        ))}
      </div>
      <div
        className="filters"
        role="group"
        aria-label="Portfolio movement filters"
      >
        {Object.keys(filters).map((f) => (
          <button
            key={f}
            className={f === filter ? "selected" : ""}
            onClick={() => setFilter(f)}
            aria-pressed={f === filter}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="table-scroll">
        <table className="analysis-table">
          <thead>
            <tr>
              {[
                { key: "company", label: "Company" }, { key: "movement", label: "Movement" },
                { key: "previousQuantity", label: "Previous shares" }, { key: "currentQuantity", label: "Current shares" },
                { key: "net", label: "Net shares" }, { key: "percent", label: "Share change" },
                { key: "allocation", label: "Current weight" },
              ].map((column) => <SortHeading key={column.key} column={column} sorting={sorting} />)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.company}
                  {r.reason && (
                    <small className="warning-text">{r.reason}</small>
                  )}
                </td>
                <td>
                  <span
                    className={
                      "movement " +
                      (r.movement.startsWith("Increased")
                        ? "positive"
                        : r.movement.startsWith("Decreased")
                          ? "negative"
                          : "")
                    }
                  >
                    {r.movement}
                  </span>
                </td>
                <td>{number(r.previousQuantity)}</td>
                <td>{number(r.currentQuantity)}</td>
                <td>{number(r.net)}</td>
                <td>{pct(r.percent)}</td>
                <td>{pct(r.allocation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="empty">No companies in this category.</p>
        )}
      </div>
      <p className="fine">
        Method: match stable canonical company IDs and compare disclosed shares.
        Allocation changes are separate from share changes. Corporate actions or
        uncertain identifiers need review. New/exited classifications require
        complete adjacent disclosures; imports must consolidate supported
        identifier changes with evidence.
      </p>
      <details>
        <summary>Comparison sources</summary>
        <ul className="sources">
          {analysis.sources.map((s, i) => (
            <li key={i}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label} · {s.disclosureDate} ↗
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
function FundHoldingsTable({ fund, onClose }) {
  const [holdingSort, setHoldingSort] = useState({ key: "allocation", direction: "descending" });

  if (!fund.top?.length) {
    return (
      <div className="pending-holdings">
        <span className="pending-icon">◷</span>
        <b>Holdings pending</b>
        <span>Awaiting this month's disclosure</span>
      </div>
    );
  }

  const sortedHoldings = [...fund.top]
    .map((h, i) => ({ ...h, defaultRank: i + 1 }))
    .sort((a, b) => {
      let left = a[holdingSort.key];
      let right = b[holdingSort.key];
      if (left == null || right == null) return left == null ? (right == null ? 0 : 1) : -1;
      if (typeof left === "string") {
        return holdingSort.direction === "ascending"
          ? left.localeCompare(right)
          : right.localeCompare(left);
      }
      return holdingSort.direction === "ascending" ? left - right : right - left;
    });

  const toggleSort = (key) => {
    setHoldingSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "ascending" ? "descending" : "ascending",
    }));
  };

  const maxAllocation = Math.max(...fund.top.map((h) => h.allocation || 0), 3);
  const totalAllocation = fund.top.reduce((sum, h) => sum + (h.allocation || 0), 0);

  return (
    <div className="fund-holdings-container">
      <div className="fund-holdings-header">
        <div className="fund-holdings-title">
          <h4>Top {fund.top.length} Equity Holdings · {fund.name}</h4>
          <span className="fund-holdings-summary">
            Combined concentration: <b>{pct(totalAllocation)}</b> of net assets
          </span>
        </div>
        {onClose && (
          <button className="fund-holdings-close" onClick={onClose} aria-label="Collapse holdings breakdown">
            ✕ Collapse
          </button>
        )}
      </div>

      <div className="fund-holdings-table-wrap">
        <table className="fund-holdings-table">
          <thead>
            <tr>
              <th scope="col" onClick={() => toggleSort("defaultRank")} className="cursor-pointer">
                <span>#</span>
                <span className="sort-indicator">{holdingSort.key === "defaultRank" ? (holdingSort.direction === "ascending" ? "▲" : "▼") : "↕"}</span>
              </th>
              <th scope="col" onClick={() => toggleSort("company")} className="cursor-pointer">
                <span>Company Name</span>
                <span className="sort-indicator">{holdingSort.key === "company" ? (holdingSort.direction === "ascending" ? "▲" : "▼") : "↕"}</span>
              </th>
              <th scope="col" onClick={() => toggleSort("allocation")} className="numeric cursor-pointer">
                <span>Weight (%)</span>
                <span className="sort-indicator">{holdingSort.key === "allocation" ? (holdingSort.direction === "ascending" ? "▲" : "▼") : "↕"}</span>
              </th>
              <th scope="col" className="col-bar-head">Allocation Scale</th>
              <th scope="col" onClick={() => toggleSort("allocationChange")} className="cursor-pointer">
                <span>MoM Shift</span>
                <span className="sort-indicator">{holdingSort.key === "allocationChange" ? (holdingSort.direction === "ascending" ? "▲" : "▼") : "↕"}</span>
              </th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((h) => {
              const barPercent = Math.min(100, Math.round(((h.allocation || 0) / maxAllocation) * 100));
              const isPositive = h.allocationChange != null && h.allocationChange > 0;
              const isNegative = h.allocationChange != null && h.allocationChange < 0;

              return (
                <tr key={h.companyId || h.company}>
                  <td className="rank-cell">
                    <span className="rank-pill">{h.defaultRank}</span>
                  </td>
                  <td className="company-cell">
                    <b>{h.company}</b>
                  </td>
                  <td className="numeric weight-cell">
                    <b>{pct(h.allocation)}</b>
                  </td>
                  <td className="bar-cell">
                    <div className="micro-bar-bg" title={pct(h.allocation)}>
                      <div className="micro-bar-fill" style={{ width: String(barPercent) + "%" }} />
                    </div>
                  </td>
                  <td className="shift-cell">
                    {h.allocationChange != null ? (
                      <span className={"pill-shift " + (isPositive ? "positive" : isNegative ? "negative" : "neutral")}>
                        {isPositive ? "+" : ""}{h.allocationChange.toFixed(2)} pp
                      </span>
                    ) : h.newTop15 ? (
                      <span className="pill-shift new">New to top 15</span>
                    ) : (
                      <span className="pill-shift neutral">—</span>
                    )}
                  </td>
                  <td className="status-cell">
                    {h.newTop15 ? (
                      <span className="status-badge new">✦ Fresh Entry</span>
                    ) : isPositive ? (
                      <span className="status-badge positive">↑ Accumulating</span>
                    ) : isNegative ? (
                      <span className="status-badge negative">↓ Trimming</span>
                    ) : (
                      <span className="status-badge neutral">= Unchanged</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FundCard({ fund, totalAllocation, onOpenModal }) {
  const [showAll, setShowAll] = useState(false);
  const topHoldings = showAll ? fund.top : fund.top.slice(0, 5);

  return (
    <article className="fund-card" key={fund.id}>
      <div className="fund-card-header">
        <div className="fund-card-serial-wrap">
          <span className="fund-card-serial">#{String(fund.serialNumber).padStart(2, "0")}</span>
          {fund.snapshot?.verification && (
            <span className={fund.snapshot.verification === "official" ? "badge verified" : "badge warning"}>
              {fund.snapshot.verification === "official" ? "Official Evidence" : "Needs Review"}
            </span>
          )}
        </div>
        <h3 className="fund-card-title">{fund.name}</h3>
        <p className="fund-card-date">
          {fund.snapshot?.disclosureDate ? "Disclosure as of " + fund.snapshot.disclosureDate : "Disclosure unavailable"}
        </p>
      </div>

      <div className="fund-card-metric">
        <div className="fund-metric-label">
          <span>Top 15 Concentration</span>
          <b>{totalAllocation}</b>
        </div>
        <div className="fund-metric-bar">
          <div
            className="fund-metric-bar-fill"
            style={{ width: Math.min(100, Math.round(((parseFloat(totalAllocation) || 0) / 40) * 100)) + "%" }}
          />
        </div>
      </div>

      <div className="fund-card-holdings">
        <div className="fund-card-holdings-head">
          <span className="fine">Holdings ({showAll ? fund.top.length : Math.min(5, fund.top.length)} of {fund.top.length})</span>
          <span className="fine">Weight & MoM Shift</span>
        </div>
        <ol className="card-holdings-list">
          {topHoldings.map((h, idx) => (
            <li key={h.companyId || h.company} className="card-holding-item">
              <span className="card-holding-rank">{idx + 1}</span>
              <span className="card-holding-name">{h.company}</span>
              <div className="card-holding-stat">
                <b>{pct(h.allocation)}</b>
                {h.allocationChange != null ? (
                  <span className={"chip-shift " + (h.allocationChange > 0 ? "positive" : h.allocationChange < 0 ? "negative" : "")}>
                    {h.allocationChange > 0 ? "+" : ""}{h.allocationChange.toFixed(2)} pp
                  </span>
                ) : h.newTop15 ? (
                  <span className="chip-shift new">New</span>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {fund.top.length > 5 && (
          <button
            className="card-expand-btn"
            onClick={() => setShowAll(!showAll)}
            aria-expanded={showAll}
          >
            {showAll ? "Show Top 5 Only ▴" : "View all " + fund.top.length + " holdings (" + (fund.top.length - 5) + " more) ▾"}
          </button>
        )}
      </div>

      <div className="fund-card-footer">
        <button
          className="fund-action-btn primary"
          aria-haspopup="dialog"
          onClick={() => onOpenModal(fund.id, "analysis")}
        >
          ↗ Analysis
        </button>
        <button
          className="fund-action-btn secondary"
          aria-haspopup="dialog"
          onClick={() => onOpenModal(fund.id, "sources")}
        >
          ↗ Sources
        </button>
      </div>
    </article>
  );
}

function FundDialog({ fund, panel, month, onClose }) {
  return (
    <Modal
      id="fund-dialog"
      title={panel === "analysis" ? "Fund analysis" : "Fund sources"}
      subtitle={fund.name}
      closeLabel="Close fund popup"
      onClose={onClose}
    >
      {panel === "analysis" ? <Analysis analysis={fund.analysis} month={month} /> : <Sources snapshot={fund.snapshot} />}
    </Modal>
  );
}

export function FundListing({ funds, view, month }) {
  const [popup, setPopup] = useState(null);
  const [expandedFundId, setExpandedFundId] = useState(null);

  const enrichedFunds = funds.map((fund) => {
    const totalAlloc = fund.top.length
      ? fund.top.reduce((sum, holding) => sum + holding.allocation, 0)
      : null;
    return {
      ...fund,
      totalAllocation: totalAlloc,
      disclosureDate: fund.snapshot?.disclosureDate ?? null,
      topCompany: fund.top[0]?.company ?? null,
      topWeight: fund.top[0]?.allocation ?? null,
      topChange: fund.top[0]?.allocationChange ?? null,
    };
  });

  const sorting = useSortedRows(enrichedFunds, { key: "name", direction: "ascending" });

  const fundColumns = [
    { key: "serialNumber", label: "#" },
    { key: "name", label: "Fund Name" },
    { key: "disclosureDate", label: "Disclosure Date" },
    { key: "topCompany", label: "#1 Top Holding" },
    { key: "totalAllocation", label: "Top 15 Weight" },
  ];

  const selected = popup && funds.find((fund) => fund.id === popup.id);

  const toggleExpand = (fundId) => {
    setExpandedFundId((prev) => (prev === fundId ? null : fundId));
  };

  const total = (fund) =>
    fund.top.length
      ? pct(fund.top.reduce((sum, holding) => sum + holding.allocation, 0))
      : "—";

  const handleExportCsv = () => {
    const headers = [
      "Rank",
      "Fund Name",
      "Disclosure Date",
      "Verification",
      "Top Holding",
      "Top Holding Weight (%)",
      "Top Holding Change (pp)",
      "Top 15 Combined Weight (%)",
    ];
    const rows = sorting.rows.map((f) => [
      f.serialNumber,
      f.name,
      f.disclosureDate || "",
      f.snapshot?.verification || "unverified",
      f.top[0]?.company || "",
      f.top[0]?.allocation ? f.top[0].allocation.toFixed(2) : "",
      f.top[0]?.allocationChange != null ? f.top[0].allocationChange.toFixed(2) : "",
      f.totalAllocation ? f.totalAllocation.toFixed(2) : "",
    ]);
    exportCsv("smallcap-funds-" + month + ".csv", headers, rows);
  };

  return (
    <>
      <div className="fund-listing-toolbar">
        <div className="fund-listing-meta">
          <span className="fund-count-pill">{sorting.rows.length} Funds Disclosed</span>
          <span className="fine">Click any fund row or 'Holdings' to inspect the full portfolio breakdown</span>
        </div>
        <button
          className="export-csv-btn"
          onClick={handleExportCsv}
          title="Download current fund comparison as CSV"
          aria-label="Export CSV"
        >
          ↓ Export CSV
        </button>
      </div>

      {view === "cards" ? (
        <div className="fund-grid">
          {sorting.rows.map((fund) => (
            <FundCard
              key={fund.id}
              fund={fund}
              totalAllocation={total(fund)}
              onOpenModal={(id, panel) => setPopup({ id, panel })}
            />
          ))}
        </div>
      ) : (
        <div className="fund-table-wrap">
          <table className="fund-table">
            <thead>
              <tr>
                <SortHeading column={fundColumns[0]} sorting={sorting} />
                <SortHeading column={fundColumns[1]} sorting={sorting} />
                <SortHeading column={fundColumns[2]} sorting={sorting} />
                <SortHeading column={fundColumns[3]} sorting={sorting} />
                <th scope="col" className="col-preview">Top 2-3 Highlights</th>
                <SortHeading column={fundColumns[4]} sorting={sorting} />
                <th scope="col" className="col-toggle">Holdings Breakdown</th>
                <th scope="col" className="col-actions">Research</th>
              </tr>
            </thead>
            <tbody>
              {sorting.rows.map((fund) => {
                const isExpanded = expandedFundId === fund.id;
                const top1 = fund.top[0];
                const top2 = fund.top[1];
                const top3 = fund.top[2];
                const totalAlloc = total(fund);

                return (
                  <React.Fragment key={fund.id}>
                    <tr
                      className={"fund-row " + (isExpanded ? "is-expanded" : "")}
                      onClick={(e) => {
                        if (e.target.closest("button") || e.target.closest("a")) return;
                        toggleExpand(fund.id);
                      }}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleExpand(fund.id);
                        }
                      }}
                      role="button"
                      aria-expanded={isExpanded}
                      aria-label={fund.name + ", click to toggle holdings"}
                    >
                      <td className="col-num">
                        <span className="serial-pill">{String(fund.serialNumber).padStart(2, "0")}</span>
                      </td>

                      <td className="col-fund">
                        <div className="fund-identity">
                          <b className="fund-name-text">{fund.name}</b>
                          <div className="fund-badge-line">
                            {fund.snapshot?.verification && (
                              <span className={fund.snapshot.verification === "official" ? "badge verified" : "badge warning"}>
                                {fund.snapshot.verification === "official" ? "Official Evidence" : "Needs Review"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="col-date">
                        <span className="date-text">
                          {fund.snapshot?.disclosureDate || "—"}
                        </span>
                      </td>

                      <td className="col-top">
                        {top1 ? (
                          <div className="top-holding-cell">
                            <span className="top-stock-name">{top1.company}</span>
                            <div className="top-stock-metrics">
                              <b className="top-stock-weight">{pct(top1.allocation)}</b>
                              {top1.allocationChange != null ? (
                                <span className={"pill-mini-shift " + (top1.allocationChange >= 0 ? "positive" : "negative")}>
                                  {top1.allocationChange >= 0 ? "+" : ""}{top1.allocationChange.toFixed(2)} pp
                                </span>
                              ) : top1.newTop15 ? (
                                <span className="pill-mini-shift new">New</span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>

                      <td className="col-preview">
                        <div className="chips-container">
                          {top2 && (
                            <span className="holding-chip" title={top2.company + ": " + pct(top2.allocation)}>
                              <span className="chip-name">{top2.company.split(" ")[0]}</span>
                              <b>{pct(top2.allocation)}</b>
                            </span>
                          )}
                          {top3 && (
                            <span className="holding-chip" title={top3.company + ": " + pct(top3.allocation)}>
                              <span className="chip-name">{top3.company.split(" ")[0]}</span>
                              <b>{pct(top3.allocation)}</b>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="col-weight numeric">
                        <div className="weight-cell-wrapper">
                          <b className="total-weight-text">{totalAlloc}</b>
                          <div className="concentration-bar-bg" title={totalAlloc + " of portfolio"}>
                            <div
                              className="concentration-bar-fill"
                              style={{ width: Math.min(100, Math.round(((fund.totalAllocation || 0) / 40) * 100)) + "%" }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="col-toggle">
                        <button
                          className={"holdings-accordion-btn " + (isExpanded ? "active" : "")}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(fund.id);
                          }}
                          aria-expanded={isExpanded}
                        >
                          <span>{fund.top.length} Holdings</span>
                          <span className="chevron-icon">{isExpanded ? "▴" : "▾"}</span>
                        </button>
                      </td>

                      <td className="col-actions">
                        <div className="fund-actions">
                          <button
                            className="fund-btn-analysis"
                            aria-haspopup="dialog"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopup({ id: fund.id, panel: "analysis" });
                            }}
                          >
                            ↗ Analysis
                          </button>
                          <button
                            className="fund-btn-sources"
                            aria-haspopup="dialog"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPopup({ id: fund.id, panel: "sources" });
                            }}
                          >
                            ↗ Sources
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="fund-expanded-row">
                        <td colSpan={8}>
                          <FundHoldingsTable
                            fund={fund}
                            onClose={() => toggleExpand(fund.id)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <FundDialog
          key={selected.id + ":" + popup.panel}
          fund={selected}
          panel={popup.panel}
          month={month}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  );
}
function SharedEntries({ entries }) {
  const sorting = useSortedRows(entries, { key: "name", direction: "ascending" });
  return <><div className="list-sort" role="group" aria-label="Sort shared fund allocations">{[{ key: "name", label: "Fund" }, { key: "allocation", label: "Weight" }].map((column) => <SortButton key={column.key} column={column} sorting={sorting} />)}</div>{sorting.rows.map((entry) => <div className="shared-entry" key={entry.name}><span>{entry.name}</span><b>{pct(entry.allocation)}</b></div>)}</>;
}
export function Shared({ funds }) {
  const groups = new Map();
  for (const f of funds)
    for (const h of f.top) {
      if (!groups.has(h.companyId))
        groups.set(h.companyId, {
          id: h.companyId,
          company: h.company,
          entries: [],
        });
      groups
        .get(h.companyId)
        .entries.push({ name: f.name, allocation: h.allocation });
    }
  const shared = [...groups.values()]
    .filter((g) => g.entries.length > 1)
    .sort((a, b) => alphabetical(a.company, b.company));
  const [open, setOpen] = useState({}), [search, setSearch] = useState("");
  const matching = shared.filter((group) => group.company.toLowerCase().includes(search.trim().toLowerCase()));
  const sorting = useSortedRows(matching.map((group) => ({ ...group, fundCount: group.entries.length })), { key: "company", direction: "ascending" });
  const refs = useRef({});
  function close(id, bottom) {
    setOpen((s) => ({ ...s, [id]: false }));
    if (bottom)
      requestAnimationFrame(() => {
        refs.current[id]?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
        refs.current[id]?.focus();
      });
  }
  return (
    <details className="shared-section section-disclosure"><summary>Shared holdings</summary><div className="disclosure-body">
      <div className="shared-toolbar"><p className="fine">Companies shared by funds’ top 15 holdings</p>
        <div className="list-sort" role="group" aria-label="Sort shared companies">{[{ key: "company", label: "Company" }, { key: "fundCount", label: "Funds" }].map((column) => <SortButton key={column.key} column={column} sorting={sorting} />)}</div>
        <PortfolioSearch id="shared-search" label="Search shared companies" value={search} onChange={setSearch} count={matching.length} total={shared.length} noun="companies" />
      </div>
      {matching.length ? (
        <div className="shared-grid">
          {sorting.rows.map((g) => (
            <article className="shared-card" key={g.id}>
              <button
                className="shared-header"
                ref={(el) => (refs.current[g.id] = el)}
                aria-expanded={!!open[g.id]}
                onClick={() => setOpen((s) => ({ ...s, [g.id]: !s[g.id] }))}
              >
                <b>{g.company}</b>
                <span>
                  {g.entries.length} funds{" "}
                  <span aria-hidden="true">{open[g.id] ? "−" : "+"}</span>
                </span>
              </button>
              {open[g.id] && (
                <div className="shared-content">
                  <button onClick={() => close(g.id, false)}>Minimize ↑</button>
                  <SharedEntries entries={g.entries} />
                  <button onClick={() => close(g.id, true)}>
                    Minimize & return ↑
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : shared.length ? (
        <div className="empty-panel"><b>No shared companies match your search</b><p>Try another company name or clear the search.</p></div>
      ) : (
        <div className="empty-panel">
          <b>
            {funds.some((f) => f.top.length)
              ? "No shared top-15 holdings"
              : "Shared holdings pending"}
          </b>
          <p>
            Matching companies will appear here when this month’s disclosures
            are available.
          </p>
        </div>
      )}
    </div></details>
  );
}
