import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { api, monthLabel, number, pct, prev } from "./utils.js";
import { useSortedRows, SortHeading } from "./sorting.jsx";
const labels = { shareChangePercent: "Combined share change", grossAddedShares: "Gross additions", grossReducedShares: "Gross reductions", largestAdderSharePercent: "Largest adder share of additions", largestReducerSharePercent: "Largest reducer share of reductions", shareUpWeightDownFunds: "Funds adding shares with falling weight", shareDownWeightUpFunds: "Funds reducing shares with rising weight", previousShares: "Previous shares", currentShares: "Current shares", netShares: "Net shares", addingFunds: "Funds adding", reducingFunds: "Funds reducing", previousHolders: "Previous holders", currentHolders: "Current holders", previousPositions: "Previous equity positions", currentPositions: "Current equity positions", increased: "Positions increased", decreased: "Positions decreased", newPositions: "New positions", exits: "Exits", unchanged: "Unchanged positions", reviewPositions: "Positions needing review", previousTop10Weight: "Previous top 10 weight", currentTop10Weight: "Current top 10 weight", previousEquityWeight: "Previous equity weight", currentEquityWeight: "Current equity weight", shareUpWeightDown: "Share increases with falling weight" };
const metric = (key, value) => /Weight|Percent/.test(key) ? pct(value) : number(value);
function Evidence({ item }) {
  const sorting = useSortedRows(item.entries || [], { key: "fundName", direction: "ascending" });
  const columns = [{ key: "fundName", label: "Fund" }, { key: "previousShares", label: "Previous shares" }, { key: "currentShares", label: "Current shares" }, { key: "netShares", label: "Net shares" }, { key: "previousWeight", label: "Previous weight" }, { key: "currentWeight", label: "Current weight" }];
  const sources = item.sources || item.entries?.flatMap((entry) => entry.sources) || [];
  const uniqueSources = [...new Map(sources.map((source) => [source.url, source])).values()];
  return <div className="ai-evidence"><h4>{item.name} <small>{monthLabel(item.month)}</small></h4>
    <dl className="ai-metrics">{Object.entries(item.metrics).map(([key, value]) => <div key={key}><dt>{labels[key] || key}</dt><dd>{metric(key, value)}</dd></div>)}</dl>
    {!!item.entries?.length && <div className="table-scroll"><table className="ai-evidence-table"><thead><tr>{columns.map((column) => <SortHeading key={column.key} column={column} sorting={sorting} />)}</tr></thead><tbody>{sorting.rows.map((entry) => <tr key={entry.fundId}><td>{entry.fundName}</td><td>{number(entry.previousShares)}</td><td>{number(entry.currentShares)}</td><td>{number(entry.netShares)}</td><td>{pct(entry.previousWeight)}</td><td>{pct(entry.currentWeight)}</td></tr>)}</tbody></table></div>}
    <details className="ai-source-links"><summary>Official disclosure sources</summary>{uniqueSources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.label} · {source.disclosureDate} ↗</a>)}</details>
  </div>;
}
export default function AIReport({ month, onClose }) {
  const [run, setRun] = useState(null), [error, setError] = useState(""), [attempt, setAttempt] = useState(0), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setRun(null); setError(""); setLoading(true);
    api("/ai-analysis?month=" + encodeURIComponent(month), { signal: controller.signal }).then((result) => {
      if (!controller.signal.aborted) setRun(result.run);
    }).catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month, attempt]);
  const failure = error;
  const report = run?.report;
  return <Modal id="ai-report" title="AI portfolio analysis" subtitle={`${monthLabel(prev(month))} → ${monthLabel(month)}`} closeLabel="Close AI report" onClose={onClose} className="ai-report-dialog">
    {failure ? <div className="empty-panel" role="alert"><b>Unable to load the saved report</b><p>{failure}</p><button onClick={() => setAttempt((value) => value + 1)}>Reload report</button></div> : loading ? <div className="ai-loading" role="status"><span className="spinner" /><h3>Loading saved analysis…</h3></div> : !report ? <div className="empty-panel"><b>No saved analysis for {monthLabel(month)}</b><p>Ask Codex in the coding environment to analyze this month and save the report. It will appear here once saved.</p><button onClick={() => setAttempt((value) => value + 1)}>Check for saved report</button></div> : <article className="ai-report">
      {run.stale && <p className="notice">Holdings have changed since this report was saved. Ask Codex in the coding environment to update the analysis.</p>}
      <p className="fine">{run.origin === "coding-environment" ? "Prepared in the coding environment · Saved report" : "Previously generated report · Saved before the coding-environment workflow"}</p>
      <p className="fine">Prepared by: <b>{run.preparedBy?.agent || (run.origin === "coding-environment" ? "Coding agent (not recorded)" : "OpenAI API")}</b> · Model: <b>{run.preparedBy?.model || (run.model && run.model !== "coding-environment" ? run.model : "Not recorded")}</b></p>
      <div className="ai-report-meta"><span>{run.coverage.comparedFunds} funds · {number(run.coverage.companies)} companies · {monthLabel(run.coverage.lookbackMonths[0])}–{monthLabel(month)}</span><span>Generated {new Date(run.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span></div>
      <h2>{report.title}</h2><ul className="ai-summary">{report.summary.map((point, index) => <li key={index}>{point}</li>)}</ul>
      <h3>Patterns worth investigating</h3>{report.findings.map((finding, index) => <section className="ai-finding" key={index}><div className="ai-finding-heading"><h4>{index + 1}. {finding.title}</h4><span>{finding.confidence} confidence</span></div>
        <p>{finding.observation}</p><p><b>What it may mean:</b> {finding.interpretation}</p><p className="ai-followup"><b>Check next:</b> {finding.followUp}</p>
        <details><summary>Supporting data ({finding.evidenceIds.length})</summary><ul className="ai-claims">{finding.claims.map((claim, index) => <li key={index}><b>{run.evidence[claim.evidenceId].name}</b> · {labels[claim.metric] || claim.metric}: {metric(claim.metric, run.evidence[claim.evidenceId].metrics[claim.metric])}</li>)}</ul>{finding.evidenceIds.map((id) => <Evidence key={id} item={run.evidence[id]} />)}</details>
      </section>)}
      <h3>How individual funds behaved</h3><div className="ai-fund-behaviors">{report.fundBehaviors.map((behavior) => { const fund = behavior.evidenceIds.map((id) => run.evidence[id]).find((item) => item.kind === "fund" && item.fundId === behavior.fundId); return <details key={behavior.fundId}><summary>{fund.name}</summary><p>{behavior.summary}</p>{behavior.evidenceIds.map((id) => <Evidence key={id} item={run.evidence[id]} />)}</details>; })}</div>
      <h3>Limits of this analysis</h3><ul>{report.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul><p className="fine">AI interpretations can be wrong. Supporting numbers are checked against saved disclosures; prices, valuations, investor flows and manager intent are not established by these snapshots.</p>
    </article>}
  </Modal>;
}
