import React, { useEffect, useRef, useState } from "react";
import { api, monthLabel, number, pct, prev } from "./utils.js";
export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      ◉
    </span>
  );
}
export function Login({ onLogin }) {
  const [password, set] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <div className="login-card">
        <Logo />
        <p className="eyebrow">MONTHLY PORTFOLIO INTELLIGENCE</p>
        <h1>
          Smallcap
          <br />
          Observatory<span className="accent">.</span>
        </h1>
        <p className="muted">A clearer view of Indian small-cap funds.</p>
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
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => set(e.target.value)}
            autoComplete="current-password"
            required
            autoFocus
          />
          <button className="primary" disabled={busy}>
            {busy ? "Signing in…" : "Enter observatory →"}
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
  const rows = analysis.rows.filter(filters[filter]);
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
                "Company",
                "Movement",
                "Previous shares",
                "Current shares",
                "Net shares",
                "Share change",
                "Current weight",
              ].map((s) => (
                <th key={s}>{s}</th>
              ))}
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
  return fund.top.length ? (
    <ol className="holdings">
      {fund.top.map((h, i) => (
        <li key={h.companyId}>
          <span className="holding-name">
            <span className="rank">{i + 1}</span>
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
            ) : h.newTopFive ? (
              <small>New to top 5</small>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  ) : (
    <div className="pending-holdings">
      <span className="pending-icon">◷</span>
      <b>Holdings pending</b>
      <span>Awaiting this month’s disclosure</span>
    </div>
  );
}
function FundDetails({ fund, panels, close, month }) {
  return (
    <div className="fund-details">
      <div className="details-top">
        <span className="eyebrow">RESEARCH DETAILS</span>
        <button onClick={() => close(false)}>Minimize ↑</button>
      </div>
      {panels.analysis && <Analysis analysis={fund.analysis} month={month} />}{" "}
      {panels.sources && <Sources snapshot={fund.snapshot} />}
      <button className="bottom-minimize" onClick={() => close(true)}>
        Minimize & return to fund ↑
      </button>
    </div>
  );
}
export function FundListing({ funds, view, month }) {
  const [expanded, setExpanded] = useState({});
  const headers = useRef({});
  useEffect(() => setExpanded({}), [month, view]);
  function toggle(id, p) {
    setExpanded((e) => ({ ...e, [id]: { ...e[id], [p]: !e[id]?.[p] } }));
  }
  function close(id, bottom) {
    setExpanded((e) => ({ ...e, [id]: {} }));
    if (bottom)
      requestAnimationFrame(() => {
        headers.current[id]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        headers.current[id]?.focus({ preventScroll: true });
      });
  }
  const controls = (f) => (
    <div className="fund-actions">
      <button
        aria-expanded={!!expanded[f.id]?.analysis}
        onClick={() => toggle(f.id, "analysis")}
      >
        ↗ Analysis
      </button>
      <button
        aria-expanded={!!expanded[f.id]?.sources}
        onClick={() => toggle(f.id, "sources")}
      >
        ↗ Sources
      </button>
    </div>
  );
  const title = (f) => (
    <>
      <h3 tabIndex="-1" ref={(el) => (headers.current[f.id] = el)}>
        {f.name}
      </h3>
      <div className="fund-date">
        {f.snapshot
          ? "Disclosure as of " + f.snapshot.disclosureDate
          : "Disclosure unavailable"}
        {f.snapshot && (
          <span
            className={
              f.snapshot.verification === "official"
                ? "verified badge"
                : "warning badge"
            }
          >
            {f.snapshot.verification === "official"
              ? "Official evidence"
              : "Needs review"}
          </span>
        )}
      </div>
    </>
  );
  const total = (f) =>
    f.top.length ? pct(f.top.reduce((n, h) => n + h.allocation, 0)) : "—";
  return view === "cards" ? (
    <div className="fund-grid">
      {funds.map((f, i) => {
        const open = expanded[f.id]?.analysis || expanded[f.id]?.sources;
        return (
          <article
            className={"fund-card " + (open ? "expanded" : "")}
            key={f.id}
          >
            <div className="fund-card-head">
              <span className={"fund-mark mark-" + (i % 4)}>
                {f.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </span>
              <div>{title(f)}</div>
            </div>
            <HoldingList fund={f} />
            <div className="fund-footer">
              <div>
                <span>Combined top five</span>
                <b>{total(f)}</b>
              </div>
              {controls(f)}
            </div>
            {open && (
              <FundDetails
                fund={f}
                panels={expanded[f.id]}
                close={(bottom) => close(f.id, bottom)}
                month={month}
              />
            )}
          </article>
        );
      })}
    </div>
  ) : (
    <div className="table-scroll fund-table-wrap">
      <table className="fund-table">
        <thead>
          <tr>
            <th>Fund & disclosure</th>
            <th>Top five companies · % of net assets</th>
            <th>Combined</th>
            <th>Research</th>
          </tr>
        </thead>
        <tbody>
          {funds.map((f) => (
            <React.Fragment key={f.id}>
              <tr>
                <td>{title(f)}</td>
                <td>
                  <HoldingList fund={f} />
                </td>
                <td className="numeric">
                  <b>{total(f)}</b>
                </td>
                <td>{controls(f)}</td>
              </tr>
              {(expanded[f.id]?.analysis || expanded[f.id]?.sources) && (
                <tr>
                  <td colSpan="4">
                    <FundDetails
                      fund={f}
                      panels={expanded[f.id]}
                      close={(bottom) => close(f.id, bottom)}
                      month={month}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
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
    .sort(
      (a, b) =>
        b.entries.length - a.entries.length ||
        a.company.localeCompare(b.company),
    );
  const [open, setOpen] = useState({});
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
    <section className="shared-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">WHERE PORTFOLIOS MEET</p>
          <h2>Shared holdings</h2>
        </div>
        <span className="pill">Top five only</span>
      </div>
      <p className="muted">
        Companies appearing in more than one fund’s top five. This is not a
        full-portfolio overlap comparison.
      </p>
      {shared.length ? (
        <div className="shared-grid">
          {shared.map((g) => (
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
                  {g.entries
                    .sort((a, b) => b.allocation - a.allocation)
                    .map((e) => (
                      <div className="shared-entry" key={e.name}>
                        <span>{e.name}</span>
                        <b>{pct(e.allocation)}</b>
                      </div>
                    ))}
                  <button onClick={() => close(g.id, true)}>
                    Minimize & return ↑
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <b>
            {funds.some((f) => f.top.length)
              ? "No shared top-five holdings"
              : "Shared holdings pending"}
          </b>
          <p>
            Matching companies will appear here when this month’s disclosures
            are available.
          </p>
        </div>
      )}
    </section>
  );
}
export function Updater() {
  const [token, setToken] = useState(""),
    [text, setText] = useState(""),
    [result, setResult] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState([]);
  useEffect(() => {
    api("/history")
      .then(setHistory)
      .catch(() => {});
  }, []);
  async function run(type) {
    setBusy(true);
    setResult("");
    try {
      let body;
      if (type === "import") body = JSON.stringify(JSON.parse(text));
      const r = await api("/updater/" + type, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body,
      });
      setResult("Successful " + type + ". " + JSON.stringify(r));
      setHistory(await api("/history"));
    } catch (e) {
      setResult(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="updater">
      <h2>Disclosure updater</h2>
      <p className="muted">
        Viewer sessions cannot change holdings. A separate server-configured
        updater token is required. Credentials are kept in memory only.
      </p>
      <label>
        Updater token
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      </label>
      <label>
        Monthly snapshot JSON
        <textarea
          rows="10"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"note":"Validated official disclosure","snapshots":[…]}'
        />
      </label>
      <div className="toolbar">
        <button
          className="primary"
          disabled={busy || !token || !text}
          onClick={() => run("import")}
        >
          Validate & import
        </button>
        <button disabled={busy || !token} onClick={() => run("check")}>
          Check configured source
        </button>
      </div>
      {result && (
        <p role="status" className="notice">
          {result}
        </p>
      )}
      <h3>Update history</h3>
      {history.length ? (
        history.map((h, i) => (
          <div className="history-row" key={i}>
            <b>{h.result}</b>
            <span>
              {h.at} · {h.note}
            </span>
            <small>{h.changes?.length ?? 0} material snapshot changes</small>
          </div>
        ))
      ) : (
        <p className="muted">No updates recorded.</p>
      )}
    </section>
  );
}
