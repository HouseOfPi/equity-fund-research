import React, { useEffect, useRef, useState } from "react";
import { api, monthLabel } from "./utils.js";
import { usePreference } from "./preferences.js";
import { Login, Logo, FundListing, Shared, Updater } from "./components.jsx";
export default function App() {
  const [authenticated, setAuth] = useState(null),
    [theme, setTheme] = usePreference("observatory-theme", "ocean", [
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
    [page, setPage] = useState("funds");
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
      .then(setData)
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
      setPage("funds");
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
        <a className="brand" href="#" onClick={() => setPage("funds")}>
          <Logo />
          <span>
            Smallcap Observatory<span className="accent">.</span>
            <small>INDIAN MUTUAL FUND RESEARCH</small>
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
      <nav className="navigation" aria-label="Main navigation">
        <button
          className={page === "funds" ? "active" : ""}
          onClick={() => setPage("funds")}
        >
          Fund comparison
        </button>
        <button
          className={page === "updater" ? "active" : ""}
          onClick={() => setPage("updater")}
        >
          Updater & history
        </button>
        <span className="nav-note">
          <i /> Monthly disclosures
        </span>
      </nav>
      <main className="workspace">
        {page === "updater" ? (
          <Updater />
        ) : (
          <>
            <div className="page-title">
              <div>
                <p className="eyebrow">THE SMALL-CAP LENS</p>
                <h1>See what’s inside.</h1>
                <p className="muted">
                  Compare holdings. Follow share movements. Check the evidence.
                </p>
              </div>
              <span className="universe-label">
                20 curated funds
                <br />
                <small>Actively managed small-cap schemes</small>
              </span>
            </div>
            <div className="report-bar">
              <div className="month-control">
                <label htmlFor="month">Reporting month</label>
                <select
                  id="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  disabled={loading || !months.length}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="report-caption">
                <b>{month ? monthLabel(month) : "Loading reporting months…"}</b>
                <span>
                  Exact-month disclosures · no older-month substitution
                </span>
              </div>
              <button
                disabled={loading}
                onClick={() => {
                  setReload((r) => r + 1);
                  api("/months")
                    .then((m) => setMonths(m.months))
                    .catch((e) => setError(e.message));
                }}
              >
                ↻ Reload
              </button>
            </div>
            <div className="notice">
              <span>ⓘ</span>
              <p>
                Current-month holdings become available after month-end
                disclosure. A small-cap scheme can also hold companies outside
                the small-cap segment.
              </p>
            </div>
            <div className="stats">
              <div>
                <span>Fund universe</span>
                <b>
                  20<small>small-cap schemes</small>
                </b>
              </div>
              <div>
                <span>Disclosures available</span>
                <b>
                  {data?.funds.filter((f) => f.snapshot).length ?? "—"}
                  <small>for {monthLabel(month)}</small>
                </b>
              </div>
              <div>
                <span>Last successful check</span>
                <b className="status-value">
                  {data?.lastSuccessfulCheck
                    ? new Date(data.lastSuccessfulCheck).toLocaleString(
                        "en-IN",
                        { timeZone: "Asia/Kolkata" },
                      )
                    : "Not yet checked"}
                  <small>
                    {data?.lastSuccessfulCheck
                      ? "IST · daily checks, monthly holdings"
                      : "No successful source check recorded"}
                  </small>
                </b>
              </div>
              <div>
                <span>Automatic updates</span>
                <b className="status-value">
                  Disabled<small>Hosted scheduler not configured</small>
                </b>
              </div>
            </div>
            <section aria-label="Fund listing">
              <div className="section-heading">
                <div>
                  <h2>
                    Fund portfolios <span className="count-label">20</span>
                  </h2>
                  <p className="fine">
                    {data?.ordering ||
                      "Shortlist order · comparable verified AUM unavailable"}
                    {data?.aumDate && " · As of " + data.aumDate}
                  </p>
                </div>
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
                <FundListing funds={data.funds} view={view} month={month} />
              ) : (
                <p className="empty">
                  No records loaded. <button onClick={retry}>Retry</button>
                </p>
              )}
            </section>
            {!loading && data && <Shared key={month} funds={data.funds} />}
            <footer>
              <span>Smallcap Observatory · Evidence before inference.</span>
              <span>Research workspace · Not investment advice</span>
            </footer>
          </>
        )}
      </main>
    </>
  );
}
