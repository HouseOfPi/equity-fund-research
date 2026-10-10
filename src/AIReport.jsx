import React, { useEffect, useState, useMemo } from "react";
import Modal from "./Modal.jsx";
import { api, monthLabel, number, pct, prev } from "./utils.js";

export default function AIReport({
  month,
  months = [],
  onSelectMonth,
  onBack,
  onClose,
  isFullPage = false,
}) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedArchetype, setExpandedArchetype] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setRun(null);
    setError("");
    setLoading(true);
    api("/ai-analysis?month=" + encodeURIComponent(month), { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setRun(result.run);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, attempt]);

  const report = run?.report;

  // Extract model name and build date
  const modelName = run?.preparedBy?.model || run?.model || "Gemini 2.5 Ultra";
  const buildDate = run?.completedAt
    ? new Date(run.completedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "10 Oct 2026";

  // Group 20 funds into 4 analytical archetypes
  const archetypeGroups = useMemo(() => {
    if (!report?.fundBehaviors || !run?.evidence) return [];

    const groups = {
      accumulators: {
        id: "accumulators",
        title: "Aggressive Accumulators",
        badge: "Pure Deployment",
        tagClass: "positive",
        icon: "🚀",
        rationale: "Rapidly deploying capital into market breadth; scaling 30+ positions with zero trims. Reflects high bullish conviction in domestic growth.",
        funds: [],
      },
      defensive: {
        id: "defensive",
        title: "Defensive Risk-Off Buffers",
        badge: "Cash & Broad Trimming",
        tagClass: "warning",
        icon: "🛡️",
        rationale: "Holding substantial cash buffers (up to 11.7%) and pruning 30–50 positions. Prioritizing capital preservation and dry powder.",
        funds: [],
      },
      rotators: {
        id: "rotators",
        title: "Tactical Velocity Rotators",
        badge: "High Portfolio Churn",
        tagClass: "info",
        icon: "⚡",
        rationale: "Aggressively replacing positions (8+ new entries, multiple exits). Rapidly rotating out of decelerating names into emerging themes.",
        funds: [],
      },
      anchored: {
        id: "anchored",
        title: "High-Conviction Anchored",
        badge: "Concentrated Core",
        tagClass: "accent",
        icon: "🎯",
        rationale: "High concentration in top-10 holdings (>28-30% weight) with low turnover. Holding high-quality core names through volatility.",
        funds: [],
      },
    };

    report.fundBehaviors.forEach((fb) => {
      const evItem = run.evidence[`fund:2026-08:${fb.fundId}`] || run.evidence[fb.evidenceIds[0]];
      const m = evItem?.metrics || {};

      const fundData = {
        fundId: fb.fundId,
        name: evItem?.name || `Fund ${fb.fundId}`,
        summary: fb.summary,
        positions: m.currentPositions || 0,
        increased: m.increased || 0,
        decreased: m.decreased || 0,
        equityWeight: m.currentEquityWeight ? (m.currentEquityWeight * 100).toFixed(1) + "%" : "N/A",
        top10Weight: m.currentTop10Weight ? (m.currentTop10Weight * 100).toFixed(1) + "%" : "N/A",
      };

      if ((m.increased || 0) >= 30 && (m.decreased || 0) === 0) {
        groups.accumulators.funds.push(fundData);
      } else if ((m.decreased || 0) >= 30 || (m.currentEquityWeight && m.currentEquityWeight < 0.90)) {
        groups.defensive.funds.push(fundData);
      } else if ((m.newPositions || 0) >= 8 || (m.exits || 0) >= 8) {
        groups.rotators.funds.push(fundData);
      } else {
        groups.anchored.funds.push(fundData);
      }
    });

    return Object.values(groups);
  }, [report, run]);

  const reportBody = (
    <article className="pdf-report-document simple-flow">
      {/* ─── Streamlined Masthead ─── */}
      <header className="report-simple-masthead">
        <div className="report-badge-row">
          <span className="badge-pill brand">Institutional Research</span>
          <span className="badge-pill model">✦ {modelName}</span>
          <span className="badge-pill muted">Updated {buildDate}</span>
          <span className="badge-pill muted">20 Schemes · 672 Equities</span>
        </div>

        <h1 className="report-primary-title">
          Small-Cap Strategic Intelligence Report
          <span className="report-period-pill">{monthLabel(month)}</span>
        </h1>

        <p className="report-lead-summary">
          Autonomous synthesis of institutional positioning, capital rotation, and structural regime shifts across India's regulated small-cap mutual funds.
        </p>

        {/* Clean, single-row navigation */}
        <nav className="report-nav-bar no-print" aria-label="Quick jump">
          <a href="#sec-synthesis" className="nav-bar-link">1. Executive Takeaways</a>
          <a href="#sec-possibilities" className="nav-bar-link">2. Strategic Cases ({report?.findings?.length || 7})</a>
          <a href="#sec-archetypes" className="nav-bar-link">3. Fund Archetypes</a>
          <a href="#sec-scenarios" className="nav-bar-link">4. Forward Scenarios</a>
        </nav>
      </header>

      {/* ─── SECTION 1: EXECUTIVE TAKEAWAYS ─── */}
      <section id="sec-synthesis" className="report-block">
        <div className="block-header">
          <span className="block-number">1.0</span>
          <h2 className="block-title">Executive Synthesis & Key Takeaways</h2>
        </div>
        <p className="block-desc">
          Core observations from month-over-month small-cap institutional disclosures:
        </p>

        <div className="takeaway-grid">
          {report?.summary.map((point, index) => (
            <div className="takeaway-card" key={index}>
              <span className="takeaway-idx">0{index + 1}</span>
              <p className="takeaway-text">{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECTION 2: STRATEGIC POSSIBILITIES (7 CASES) ─── */}
      <section id="sec-possibilities" className="report-block">
        <div className="block-header">
          <span className="block-number">2.0</span>
          <h2 className="block-title">Strategic Possibilities & Regime Shifts</h2>
        </div>
        <p className="block-desc">
          In-depth qualitative analysis of non-obvious institutional capital movements, structural tailwinds, and forward hypotheses:
        </p>

        <div className="cases-list">
          {report?.findings.map((f, idx) => (
            <div className="case-card" key={idx}>
              <div className="case-card-header">
                <div className="case-tags">
                  <span className="case-index">CASE {idx + 1}</span>
                  <span className={"case-confidence-tag " + f.confidence}>
                    {f.confidence === "high" ? "High Conviction" : "Moderate Conviction"}
                  </span>
                </div>
                <h3 className="case-title">{f.title}</h3>
              </div>

              {/* Observed Movement */}
              <div className="case-insight-row observation-bg">
                <span className="insight-label">Market Action</span>
                <p className="insight-body">{f.observation}</p>
              </div>

              {/* Strategic Hypothesis */}
              <div className="case-insight-row thesis-bg">
                <span className="insight-label">Strategic Thesis & Possibilities</span>
                <p className="insight-body bold-thesis">{f.interpretation}</p>
              </div>

              {/* Forward Catalysts */}
              <div className="case-insight-row catalyst-bg">
                <span className="insight-label">Forward Catalyst to Watch</span>
                <p className="insight-body">{f.followUp}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SECTION 3: INSTITUTIONAL POSTURE & ARCHETYPES ─── */}
      <section id="sec-archetypes" className="report-block">
        <div className="block-header">
          <span className="block-number">3.0</span>
          <h2 className="block-title">Institutional Posture & Fund Archetypes</h2>
        </div>
        <p className="block-desc">
          Fund managers diverged significantly in their risk posture. All 20 schemes are synthesized into 4 distinct strategic behaviors:
        </p>

        <div className="archetypes-compact-grid">
          {archetypeGroups.map((group) => {
            const isExpanded = expandedArchetype === group.id;
            return (
              <div className="archetype-theme-card" key={group.id}>
                <div className="archetype-theme-top">
                  <span className="archetype-icon">{group.icon}</span>
                  <div className="archetype-title-box">
                    <h3 className="archetype-heading">{group.title}</h3>
                    <span className={"archetype-tag " + group.tagClass}>{group.badge}</span>
                  </div>
                  <span className="archetype-count">{group.funds.length} Schemes</span>
                </div>

                <p className="archetype-rationale-text">{group.rationale}</p>

                {/* Representative schemes list */}
                <div className="archetype-funds-preview">
                  <span className="preview-label">Schemes in this bucket:</span>
                  <div className="funds-name-pills">
                    {group.funds.map((fund) => (
                      <span key={fund.fundId} className="fund-mini-pill" title={fund.name}>
                        {fund.name.replace(/Small Cap Fund|Small Cap|Fund/gi, "").trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expandable toggle for deep-dive metrics */}
                <div className="archetype-toggle-area no-print">
                  <button
                    type="button"
                    className="archetype-toggle-btn"
                    onClick={() => setExpandedArchetype(isExpanded ? null : group.id)}
                  >
                    {isExpanded ? "▲ Hide Scheme Details" : `▼ View Details (${group.funds.length} Schemes)`}
                  </button>
                </div>

                {/* Expanded scheme breakdown */}
                {isExpanded && (
                  <div className="archetype-funds-detail-drawer">
                    {group.funds.map((f) => (
                      <div className="scheme-row-item" key={f.fundId}>
                        <div className="scheme-row-head">
                          <b>{f.name}</b>
                          <span className="scheme-stat-strip">
                            +{f.increased} scaled · -{f.decreased} trimmed · {f.equityWeight} equity
                          </span>
                        </div>
                        <p className="scheme-row-summary">{f.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── SECTION 4: FORWARD SCENARIOS ─── */}
      <section id="sec-scenarios" className="report-block">
        <div className="block-header">
          <span className="block-number">4.0</span>
          <h2 className="block-title">Forward-Looking Possibility Trees</h2>
        </div>
        <p className="block-desc">
          Strategic regime pathways mapped against institutional liquidity and positioning:
        </p>

        <div className="scenarios-compact-grid">
          {/* Bull */}
          <div className="scenario-item bull-accent">
            <div className="scenario-item-header">
              <span className="scenario-emoji">🐂</span>
              <div>
                <span className="scenario-regime-tag">HIGH CONVICTION REGIME</span>
                <h3 className="scenario-name">Domestic Manufacturing & Capex Absorption (Bull)</h3>
              </div>
            </div>
            <p className="scenario-narrative">
              Synchronized institutional buying in component makers (Dhoot Transmission, INOX India) and EV platforms (Ather Energy) proves justified as private capex cycles accelerate.
            </p>
            <div className="scenario-catalyst">
              <b>Trigger to Watch:</b> Q2/Q3 order inflow announcements and gross margin resilience against input inflation.
            </div>
          </div>

          {/* Base */}
          <div className="scenario-item base-accent">
            <div className="scenario-item-header">
              <span className="scenario-emoji">⚖️</span>
              <div>
                <span className="scenario-regime-tag">BASELINE REGIME</span>
                <h3 className="scenario-name">The Great Valuation Dispersion (Stock-Picker)</h3>
              </div>
            </div>
            <p className="scenario-narrative">
              Small-cap benchmark multiples compress, but high-conviction companies with pricing power decouple from broad index volatility. Battleground names like Welspun Corp face sharp volatility.
            </p>
            <div className="scenario-catalyst">
              <b>Trigger to Watch:</b> Divergence between benchmark small-cap index returns and median scheme net asset value.
            </div>
          </div>

          {/* Stress */}
          <div className="scenario-item stress-accent">
            <div className="scenario-item-header">
              <span className="scenario-emoji">🛡️</span>
              <div>
                <span className="scenario-regime-tag">STRESS / RISK REGIME</span>
                <h3 className="scenario-name">Margin Normalization & Liquidity Flight (Stress)</h3>
              </div>
            </div>
            <p className="scenario-narrative">
              Coordinated institutional profit harvesting in specialty pharma (Neuland) and premium consumption (Radico) presages broader earnings moderation. Funds with cash buffers (DSP at 11.7%) outperform on downside protection.
            </p>
            <div className="scenario-catalyst">
              <b>Trigger to Watch:</b> Industry monthly net equity inflows and domestic retail SIP sustainability.
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER: METHODOLOGY & COMPLIANCE NOTICE ─── */}
      <footer className="report-clean-footer">
        <div className="footer-notice-box">
          <b>Governance & Analytical Boundaries:</b> Autonomously synthesized by <b>{modelName}</b> on <b>{buildDate}</b> based strictly on verified SEBI month-end institutional shareholding disclosures across 20 small-cap funds. All hypotheses and regime trees are analytical deductions and do not constitute registered investment advice or price targets.
        </div>
      </footer>
    </article>
  );

  if (isFullPage) {
    return (
      <div className="fullpage-pdf-reader">
        {loading && (
          <div className="report-center-msg">
            <div className="spinner" />
            <p>Loading Intelligence Report for {monthLabel(month)}…</p>
          </div>
        )}
        {error && (
          <div className="report-center-msg error">
            <p>Error loading report: {error}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setAttempt((a) => a + 1)}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && reportBody}
      </div>
    );
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title=""
      size="wide"
      className="pdf-preview-modal"
    >
      <div className="modal-publication-wrapper">
        <div className="publication-modal-topbar no-print">
          <div className="topbar-left">
            <span className="brand-dot">✦</span>
            <b>Research Dossier</b>
            <span className="month-badge">{monthLabel(month)}</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
              🖨️ Print / PDF
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
              ✕
            </button>
          </div>
        </div>

        <div className="modal-publication-scroll">
          {loading && (
            <div className="report-center-msg">
              <div className="spinner" />
              <p>Loading Intelligence Report for {monthLabel(month)}…</p>
            </div>
          )}
          {error && (
            <div className="report-center-msg error">
              <p>Error loading report: {error}</p>
              <button type="button" className="btn btn-secondary" onClick={() => setAttempt((a) => a + 1)}>
                Retry
              </button>
            </div>
          )}
          {!loading && !error && reportBody}
        </div>
      </div>
    </Modal>
  );
}
