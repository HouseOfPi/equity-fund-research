import AIReport from "./AIReport.jsx";
import Combined from "./Combined.jsx";
import React, { useEffect, useState } from "react";
import { api, monthLabel } from "./utils.js";
import { usePreference } from "./preferences.js";
import { Login, Logo, FundListing, Shared, PortfolioSearch, alphabetical } from "./components.jsx";
export default function App() {
  const [authenticated, setAuth] = useState(null),
    [theme, setTheme] = usePreference("observatory-theme", "violet", [
      "ocean",
      "violet",
      "emerald",
      "sunset",
    ]),
    [view, setView] = usePreference("observatory-view", "cards", [
      "cards",
      "table",
    ]),
    [months, setMonths] = useState([]),
    [month, setMonth] = useState(""),
    [data, setData] = useState(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0),
    [fundSearch, setFundSearch] = useState(""),
    [refreshRun, setRefreshRun] = useState(null),
    [refreshStarting, setRefreshStarting] = useState(false),
    [refreshError, setRefreshError] = useState(""),
    [aiOpen, setAIOpen] = useState(false);
  const refreshing = refreshStarting || refreshRun?.status === "running";
  async function refreshSources() {
    setRefreshStarting(true); setRefreshError("");
    try {
      const result = await api("/portfolio/refresh", { method: "POST", body: JSON.stringify({ month }) });
      setRefreshRun(result.run);
    } catch (e) { setRefreshError(e.message); }
    finally { setRefreshStarting(false); }
  }
  useEffect(() => {
    if (!authenticated || refreshRun?.status !== "running") return;
    const controller = new AbortController(); let timer;
    async function poll() {
      try {
        const current = await api("/updates/" + refreshRun.id, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setRefreshRun(current);
        if (current.status !== "running") {
          setReload((r) => r + 1);
          api("/months").then((m) => setMonths(m.months)).catch((e) => setRefreshError(e.message));
          return;
        }
      } catch (e) { if (!controller.signal.aborted) setRefreshError(e.message); }
      if (!controller.signal.aborted) timer = setTimeout(poll, 1500);
    }
    timer = setTimeout(poll, 500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [authenticated, refreshRun?.id, refreshRun?.status]);
  const matchingFunds = data ? [...data.funds]
    .sort((a, b) => alphabetical(a.name, b.name))
    .map((fund, index) => ({ ...fund, serialNumber: index + 1 }))
    .filter((fund) => fund.name.toLowerCase().includes(fundSearch.trim().toLowerCase())) : [];
  function retry() {
    if (!month)
      api("/months")
        .then((m) => {
          setMonths(m.months);
          setMonth(m.defaultMonth);
        })
        .catch((e) => setError(e.message));
    else setReload((r) => r + 1);
  }
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    api("/session")
      .then((s) => setAuth(s.authenticated))
      .catch((e) => {
        setError(e.message);
        setAuth(false);
      });
  }, []);
  useEffect(() => {
    if (authenticated)
      api("/months")
        .then((m) => {
          setMonths(m.months);
          setMonth(m.defaultMonth);
        })
        .catch((e) => setError(e.message));
  }, [authenticated]);
  useEffect(() => {
    if (!authenticated || !month) return;
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    api("/portfolio?month=" + month, { signal: controller.signal })
      .then((result) => {
        setData(result);
        if (result.latestUpdate?.status === "running") setRefreshRun(result.latestUpdate);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(e.message);
          if (e.status === 401) setAuth(false);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, reload, authenticated]);
  async function signOut() {
    try {
      await api("/logout", { method: "POST" });
      setAuth(false);
      setData(null);
      setMonth("");
      setFundSearch("");
      setRefreshRun(null); setRefreshError(""); setAIOpen(false);
    } catch (e) {
      setError(e.message);
    }
  }
  if (authenticated === null)
    return <div className="initial-loading">Opening observatory…</div>;
  if (!authenticated) return <Login onLogin={() => setAuth(true)} />;
  return (
    <>
      <header className="app-header">
        <a className="brand" href="#">
          <Logo />
          <span>
            Smallcap
            <small>OBSERVATORY</small>
          </span>
        </a>
        <div className="header-controls">
          <label className="theme-label">
            Theme
            <select
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              {["ocean", "violet", "emerald", "sunset"].map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={signOut}>Sign out ↗</button>
        </div>
      </header>
      <main className="workspace">
            <div className="dashboard-toolbar">
              <h1>Small-cap funds</h1>
              <div className="dashboard-controls">
                <div className="month-control">
                  <label htmlFor="month">Reporting month</label>
                  <select id="month" value={month} onChange={(e) => setMonth(e.target.value)} disabled={loading || refreshing || !months.length}>
                    {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                </div>
                <button className="ai-analysis-button" disabled={loading || refreshing || !data} aria-haspopup="dialog" aria-controls="ai-report" onClick={() => setAIOpen(true)}>✦ AI analysis</button>
                <button disabled={loading || refreshing || !month} onClick={refreshSources} aria-label="Refresh from official sources" title="Download official reports and save fresh holdings">{refreshing ? "Refreshing…" : "↻ Refresh"}</button>
              </div>
            </div>
            {refreshError && <p role="alert" className="error">{refreshError}</p>}
            {refreshRun?.month === month && <div className="refresh-feedback" role="status">
              <span>{refreshRun.status === "running" ? `Refreshing ${monthLabel(refreshRun.month)} from official reports · ${refreshRun.report.filter((entry) => !["pending", "fetching"].includes(entry.status)).length} of 20 funds processed` : refreshRun.status === "success" ? `${monthLabel(refreshRun.month)} refreshed · all 20 reports checked and saved` : refreshRun.status === "partial" ? `${monthLabel(refreshRun.month)} refresh finished · ${refreshRun.verified || 0} of 20 reports saved or already up to date. Existing holdings kept for the remaining funds.` : "Refresh could not complete. Existing saved holdings were kept."}</span>
              <details className="refresh-results"><summary>Fund results</summary><ul>{refreshRun.report.map((entry) => <li key={entry.fundId}><b>{entry.name}</b><span>{({ pending: "Waiting", fetching: "Downloading", verified: "Checked · saving", imported: "Saved", unchanged: "Already up to date", failed: "Could not update", unavailable: "Report unavailable" })[entry.status]}</span>{entry.error && <small>{entry.error}</small>}</li>)}</ul></details>
            </div>}
            {!loading && data && (
              <Combined key={"combined:" + month} analysis={data.combined} month={month} />
            )}
            <details className="fund-section section-disclosure" aria-label="Fund listing" open>
              <summary><span>Fund portfolios</span></summary>
              <div className="disclosure-body" id="fund-portfolio-content">
              <div className="section-heading fund-toolbar">
                <p className="fine">Top 15 holdings · % of net assets</p>
                <PortfolioSearch id="fund-search" label="Search funds" value={fundSearch} onChange={setFundSearch} count={matchingFunds.length} total={data?.funds.length ?? 20} noun="funds" disabled={loading || !data} />
                  <div
                  className="view-switch"
                  role="group"
                  aria-label="Fund view"
                >
                  <button
                    aria-pressed={view === "cards"}
                    className={view === "cards" ? "selected" : ""}
                    onClick={() => setView("cards")}
                  >
                    ▦ Cards
                  </button>
                  <button
                    aria-pressed={view === "table"}
                    className={view === "table" ? "selected" : ""}
                    onClick={() => setView("table")}
                  >
                    ☷ Table
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="loading-panel" role="status">
                  <span className="spinner" />
                  <b>Loading {monthLabel(month)} holdings…</b>
                </div>
              ) : error ? (
                <div className="error-panel" role="alert">
                  <b>Unable to load holdings</b>
                  <p>{error}</p>
                  <button onClick={retry}>Retry</button>
                </div>
              ) : data ? (
                matchingFunds.length ? <FundListing funds={matchingFunds} view={view} month={month} /> : <div className="empty-panel"><b>No funds match your search</b><p>Try another fund name or clear the search.</p></div>
              ) : (
                <p className="empty">
                  No records loaded. <button onClick={retry}>Retry</button>
                </p>
              )}
              </div>
            </details>
            {!loading && data && <Shared key={month} funds={data.funds} />}
            <footer>
              <span>Smallcap Observatory · Evidence before inference.</span>
              <span>Research workspace · Not investment advice</span>
            </footer>
      </main>
      {aiOpen && <AIReport month={month} onClose={() => setAIOpen(false)} />}
    </>
  );
}
