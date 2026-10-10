import AceInvestors from "./AceInvestors.jsx";
import AIReport from "./AIReport.jsx";
import Combined from "./Combined.jsx";
import React, { useEffect, useState } from "react";
import { api, monthLabel } from "./utils.js";
import { usePreference } from "./preferences.js";
import { Login, Logo, FundListing, Shared, PortfolioSearch, alphabetical } from "./components.jsx";

export default function App() {
  const [authenticated, setAuth] = useState(null),
    [activeSection, setActiveSection] = usePreference("observatory-section", "funds", [
      "funds",
      "ace-investors",
      "ai-report",
    ]),
    [selectedAceInvestor, setSelectedAceInvestor] = usePreference("observatory-ace-investor", "kedia", [
      "kedia",
      "kacholia",
      "agrawal",
      "khanna",
      "damani",
    ]),
    [navOpen, setNavOpen] = useState(false),
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
    setRefreshStarting(true);
    setRefreshError("");
    try {
      const result = await api("/portfolio/refresh", {
        method: "POST",
        body: JSON.stringify({ month }),
      });
      setRefreshRun(result.run);
    } catch (e) {
      setRefreshError(e.message);
    } finally {
      setRefreshStarting(false);
    }
  }

  useEffect(() => {
    if (!authenticated || refreshRun?.status !== "running") return;
    const controller = new AbortController();
    let timer;
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
      } catch (e) {
        if (!controller.signal.aborted) setRefreshError(e.message);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 1500);
    }
    timer = setTimeout(poll, 500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [authenticated, refreshRun?.id, refreshRun?.status]);

  const matchingFunds = data
    ? [...data.funds]
        .sort((a, b) => alphabetical(a.name, b.name))
        .map((fund, index) => ({ ...fund, serialNumber: index + 1 }))
        .filter((fund) => fund.name.toLowerCase().includes(fundSearch.trim().toLowerCase()))
    : [];

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
    function onKeyDown(e) {
      if (e.key === "Escape" && navOpen) setNavOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);



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
      setRefreshRun(null);
      setRefreshError("");
      setAIOpen(false);
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
        <div className="header-left">
          <button
            className={"hamburger-btn " + (navOpen ? "is-active" : "")}
            onClick={() => setNavOpen(!navOpen)}
            aria-label={navOpen ? "Close navigation drawer" : "Open navigation menu"}
            aria-expanded={navOpen}
            aria-controls="app-nav-drawer"
            title="Navigation Menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection("funds");
            }}
          >
            <Logo />
            <span>
              Smallcap
              <small>OBSERVATORY</small>
            </span>
          </a>
        </div>

        <nav className="header-nav-tabs" aria-label="Main Navigation">
          <button
            className={"nav-tab " + (activeSection === "funds" ? "active" : "")}
            onClick={() => setActiveSection("funds")}
            aria-current={activeSection === "funds" ? "page" : undefined}
          >
            <span className="nav-tab-icon">🏢</span>
            <span>Mutual Funds</span>
          </button>
          <button
            className={"nav-tab " + (activeSection === "ace-investors" ? "active" : "")}
            onClick={() => setActiveSection("ace-investors")}
            aria-current={activeSection === "ace-investors" ? "page" : undefined}
          >
            <span className="nav-tab-icon">👑</span>
            <span>Ace Investors</span>
          </button>
          <button
            className={"nav-tab " + (activeSection === "ai-report" ? "active" : "")}
            onClick={() => {
              setActiveSection("ai-report");
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
            aria-current={activeSection === "ai-report" ? "page" : undefined}
          >
            <span className="nav-tab-icon">✦</span>
            <span>AI Intelligence Report</span>
          </button>
        </nav>

        <div className="header-controls">
          <button onClick={signOut}>Sign out ↗</button>
        </div>
      </header>

      {navOpen && (
        <>
          <div
            className="nav-drawer-backdrop"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            id="app-nav-drawer"
            className="nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Application navigation"
          >
            <div className="drawer-header">
              <div className="brand drawer-brand">
                <Logo />
                <span>
                  Smallcap
                  <small>OBSERVATORY</small>
                </span>
              </div>
              <button
                className="drawer-close-btn"
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation drawer"
              >
                ✕
              </button>
            </div>

            <div className="drawer-content">
              <div className="drawer-section">
                <span className="drawer-section-title">Institutional Portfolios</span>
                <button
                  className={"drawer-nav-item " + (activeSection === "funds" ? "active" : "")}
                  onClick={() => {
                    setActiveSection("funds");
                    setNavOpen(false);
                  }}
                >
                  <span className="drawer-item-icon">🏢</span>
                  <div className="drawer-item-text">
                    <b>Small-Cap Mutual Funds</b>
                    <small>20 active schemes & quarterly shifts</small>
                  </div>
                  {activeSection === "funds" && <span className="drawer-active-dot" />}
                </button>
                <button
                  className={"drawer-nav-item " + (activeSection === "ai-report" ? "active" : "")}
                  onClick={() => {
                    setActiveSection("ai-report");
                    setNavOpen(false);
                  }}
                >
                  <span className="drawer-item-icon">✦</span>
                  <div className="drawer-item-text">
                    <b>AI Strategic Research Report</b>
                    <small>Deep possibilities & macro regime audit</small>
                  </div>
                  {activeSection === "ai-report" && <span className="drawer-active-dot" />}
                </button>
              </div>

              <div className="drawer-section">
                <span className="drawer-section-title">Ace Investor Portfolios</span>
                <div className="drawer-investor-list">
                  {[
                    { id: "kedia", name: "Vijay Kedia", firm: "Kedia Securities · 14 Holdings", avatar: "VK" },
                    { id: "kacholia", name: "Ashish Kacholia", firm: "Lucky Securities · 12 Holdings", avatar: "AK" },
                    { id: "agrawal", name: "Mukul Agrawal", firm: "Param Capital · 11 Holdings", avatar: "MA" },
                    { id: "khanna", name: "Dolly Khanna", firm: "Rajiv Khanna · 9 Holdings", avatar: "DK" },
                    { id: "damani", name: "Radhakishan Damani", firm: "Bright Star · 9 Holdings", avatar: "RD" },
                  ].map((inv) => (
                    <button
                      key={inv.id}
                      className={
                        "drawer-investor-item " +
                        (activeSection === "ace-investors" && selectedAceInvestor === inv.id ? "active" : "")
                      }
                      onClick={() => {
                        setSelectedAceInvestor(inv.id);
                        setActiveSection("ace-investors");
                        setNavOpen(false);
                      }}
                    >
                      <span className="drawer-avatar">{inv.avatar}</span>
                      <div className="drawer-investor-info">
                        <b>{inv.name}</b>
                        <small>{inv.firm}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="drawer-signout-btn" onClick={signOut}>
                Sign out ↗
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="workspace">
        {activeSection === "ace-investors" ? (
          <AceInvestors
            selectedInvestor={selectedAceInvestor}
            onSelectInvestor={setSelectedAceInvestor}
          />
        ) : activeSection === "ai-report" ? (
          <div className="ai-report-fullpage-wrapper">
            <div className="fullpage-sticky-toolbar no-print">
              <button
                type="button"
                className="btn-back-nav"
                onClick={() => {
                  setActiveSection("funds");
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
              >
                ← Back to Mutual Funds
              </button>
              <div className="toolbar-center">
                <span className="toolbar-period-label">Reporting Period:</span>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="toolbar-month-select"
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {monthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn-print-report"
                onClick={() => window.print()}
              >
                🖨️ Print / Save as PDF
              </button>
            </div>

            <AIReport
              month={month}
              months={months}
              onSelectMonth={setMonth}
              onBack={() => {
                setActiveSection("funds");
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              isFullPage={true}
            />
          </div>
        ) : (
          <>
        <div className="dashboard-toolbar">
          <div className="dashboard-title-area">
            <span className="eyebrow-chip">✦ Institutional Intelligence</span>
            <h1>Small-cap funds</h1>
            <p className="dashboard-subtitle">Cross-scheme equity shifts & portfolio concentrations across 20 small-cap funds</p>
          </div>
          <div className="dashboard-controls">
            <div className="month-control">
              <label htmlFor="month">Reporting month</label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                disabled={loading || refreshing || !months.length}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="ai-analysis-button"
              disabled={loading || refreshing || !data}
              aria-haspopup="dialog"
              aria-controls="ai-report"
              onClick={() => {
                setActiveSection("ai-report");
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
            >
              ✦ AI analysis
            </button>
            <button
              disabled={loading || refreshing || !month}
              onClick={refreshSources}
              aria-label="Refresh from official sources"
              title="Download official reports and save fresh holdings"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        {refreshError && <p role="alert" className="error">{refreshError}</p>}

        {refreshRun?.month === month && (
          <div className="refresh-feedback" role="status">
            <span>
              {refreshRun.status === "running"
                ? `Refreshing ${monthLabel(refreshRun.month)} from official reports · ${
                    refreshRun.report.filter((entry) => !["pending", "fetching"].includes(entry.status)).length
                  } of 20 funds processed`
                : refreshRun.status === "success"
                  ? `${monthLabel(refreshRun.month)} refreshed · all 20 reports checked and saved`
                  : refreshRun.status === "partial"
                    ? `${monthLabel(refreshRun.month)} refresh finished · ${
                        refreshRun.verified || 0
                      } of 20 reports saved or already up to date. Existing holdings kept for the remaining funds.`
                    : "Refresh could not complete. Existing saved holdings were kept."}
            </span>
            <details className="refresh-results">
              <summary>Fund results</summary>
              <ul>
                {refreshRun.report.map((entry) => (
                  <li key={entry.fundId}>
                    <b>{entry.name}</b>
                    <span>
                      {
                        ({
                          pending: "Waiting",
                          fetching: "Downloading",
                          verified: "Checked · saving",
                          imported: "Saved",
                          unchanged: "Already up to date",
                          failed: "Could not update",
                          unavailable: "Report unavailable",
                        })[entry.status]
                      }
                    </span>
                    {entry.error && <small>{entry.error}</small>}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {!loading && data && (
          <Combined key={"combined:" + month} analysis={data.combined} month={month} />
        )}

        <details className="fund-section section-disclosure" aria-label="Fund listing" open>
          <summary><span>Fund portfolios</span></summary>
          <div className="disclosure-body" id="fund-portfolio-content">
            <div className="section-heading fund-toolbar">
              <p className="fine">Top 15 holdings · % of net assets</p>
              <PortfolioSearch
                id="fund-search"
                label="Search funds"
                value={fundSearch}
                onChange={setFundSearch}
                count={matchingFunds.length}
                total={data?.funds.length ?? 20}
                noun="funds"
                disabled={loading || !data}
              />
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
              matchingFunds.length ? (
                <FundListing funds={matchingFunds} view={view} month={month} />
              ) : (
                <div className="empty-panel">
                  <b>No funds match your search</b>
                  <p>Try another fund name or clear the search.</p>
                </div>
              )
            ) : (
              <p className="empty">
                No records loaded. <button onClick={retry}>Retry</button>
              </p>
            )}
          </div>
        </details>

        {!loading && data && <Shared key={month} funds={data.funds} />}

        </>
        )}

        <footer>
          <span>Smallcap Observatory</span>
          <span>Research workspace · Not investment advice</span>
        </footer>
      </main>

      
    </>
  );
}
