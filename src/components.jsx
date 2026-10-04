import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { useSortedRows, SortButton, SortHeading } from "./sorting.jsx";
import { api, monthLabel, number, pct, prev } from "./utils.js";
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
function HoldingList({ fund }) {
  const sorting = useSortedRows(fund.top.map((holding, index) => ({ ...holding, rank: index + 1 })), { key: "allocation", direction: "descending" });
  return fund.top.length ? (<>
    <div className="holding-sort" role="group" aria-label={`Sort holdings for ${fund.name}`}>
      {[{ key: "rank", label: "Rank" }, { key: "company", label: "Company" }, { key: "allocation", label: "Weight" }, { key: "allocationChange", label: "Weight change" }].map((column) => <SortButton key={column.key} column={column} sorting={sorting} />)}
    </div>
    <ol className="holdings">
      {sorting.rows.map((h) => (
        <li key={h.companyId}>
          <span className="holding-name">
            <span className="rank">{h.rank}</span>
            {h.company}
          </span>
          <span className="holding-value">
            <b>{pct(h.allocation)}</b>
            {h.allocationChange != null ? (
              <small
                className={h.allocationChange >= 0 ? "positive" : "negative"}
              >
                {h.allocationChange >= 0 ? "+" : ""}
                {h.allocationChange.toFixed(2)} pp
              </small>
            ) : h.newTop15 ? (
              <small>New to top 15</small>
            ) : null}
          </span>
        </li>
      ))}
    </ol></>
  ) : (
    <div className="pending-holdings">
      <span className="pending-icon">◷</span>
      <b>Holdings pending</b>
      <span>Awaiting this month’s disclosure</span>
    </div>
  );
}
function FundDialog({ fund, panel, month, onClose }) {
  return <Modal id="fund-dialog" title={panel === "analysis" ? "Fund analysis" : "Fund sources"} subtitle={fund.name} closeLabel="Close fund popup" onClose={onClose}>{panel === "analysis" ? <Analysis analysis={fund.analysis} month={month} /> : <Sources snapshot={fund.snapshot} />}</Modal>;
}
export function FundListing({ funds, view, month }) {
  const [popup, setPopup] = useState(null);
  const sorting = useSortedRows(funds.map((fund) => ({ ...fund,
    totalAllocation: fund.top.length ? fund.top.reduce((sum, holding) => sum + holding.allocation, 0) : null,
    disclosureDate: fund.snapshot?.disclosureDate ?? null,
    topCompany: fund.top[0]?.company ?? null,
  })), { key: "name", direction: "ascending" });
  const fundColumns = [{ key: "serialNumber", label: "Number" }, { key: "name", label: "Fund" }, { key: "disclosureDate", label: "Disclosure date" }, { key: "totalAllocation", label: "Combined weight" }, { key: "topCompany", label: "Top company" }];
  const selected = popup && funds.find((fund) => fund.id === popup.id);
  const controls = (fund) => <div className="fund-actions">
    <button aria-haspopup="dialog" aria-controls="fund-dialog" onClick={() => setPopup({ id: fund.id, panel: "analysis" })}>↗ Analysis</button>
    <button aria-haspopup="dialog" aria-controls="fund-dialog" onClick={() => setPopup({ id: fund.id, panel: "sources" })}>↗ Sources</button>
  </div>;
  const title = (fund) => <>
    <div className="fund-title-line"><span className="fund-serial" aria-label={`Fund number ${fund.serialNumber}`}>{fund.serialNumber}.</span><h3>{fund.name}</h3></div>
    <div className="fund-date">{fund.snapshot ? "Disclosure as of " + fund.snapshot.disclosureDate : "Disclosure unavailable"}
      {fund.snapshot && <span className={fund.snapshot.verification === "official" ? "verified badge" : "warning badge"}>{fund.snapshot.verification === "official" ? "Official evidence" : "Needs review"}</span>}
    </div>
  </>;
  const total = (fund) => fund.top.length ? pct(fund.top.reduce((sum, holding) => sum + holding.allocation, 0)) : "—";
  return <>
    {view === "cards" && <div className="list-sort" role="group" aria-label="Sort funds">{fundColumns.map((column) => <SortButton key={column.key} column={column} sorting={sorting} />)}</div>}
    {view === "cards" ? <div className="fund-grid">{sorting.rows.map((fund) => <article className="fund-card" key={fund.id}>
      <div className="fund-card-head"><div>{title(fund)}</div></div>
      <HoldingList fund={fund} />
      <div className="fund-footer"><div><span>Combined top 15</span><b>{total(fund)}</b></div>{controls(fund)}</div>
    </article>)}</div> : <div className="table-scroll fund-table-wrap"><table className="fund-table">
      <thead><tr><th scope="col" aria-sort={["serialNumber", "name", "disclosureDate"].includes(sorting.sort.key) ? sorting.sort.direction : "none"}><div className="list-sort">{fundColumns.slice(0, 3).map((column) => <SortButton key={column.key} column={column} sorting={sorting} />)}</div></th><SortHeading column={fundColumns[4]} sorting={sorting} /><SortHeading column={fundColumns[3]} sorting={sorting} /><th>Research</th></tr></thead>
      <tbody>{sorting.rows.map((fund) => <tr key={fund.id}><td>{title(fund)}</td><td><HoldingList fund={fund} /></td><td className="numeric"><b>{total(fund)}</b></td><td>{controls(fund)}</td></tr>)}</tbody>
    </table></div>}
    {selected && <FundDialog key={`${selected.id}:${popup.panel}`} fund={selected} panel={popup.panel} month={month} onClose={() => setPopup(null)} />}
  </>;
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
