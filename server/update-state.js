import crypto from "node:crypto";
import { funds } from "./funds.js";

// Retrieval timestamps and checksums are evidence metadata, not holding changes.
function comparable(snapshot) {
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort()
      .filter((key) => !["retrievedAt", "sha256"].includes(key)).map((key) => [key, canonical(value[key])]));
    return value;
  }
  return JSON.stringify(canonical(snapshot));
}
export function applyImport(data, batch, actor) {
  const changes = [];
  for (const snapshot of batch.snapshots) {
    const key = snapshot.month + ":" + snapshot.fundId, previous = data.snapshots[key];
    if (!previous || comparable(previous) !== comparable(snapshot)) changes.push({ fundId: snapshot.fundId, month: snapshot.month,
      action: previous ? "replaced" : "added", holdingsBefore: previous?.holdings.length ?? null,
      holdingsAfter: snapshot.holdings.length, previous: previous || null });
    data.snapshots[key] = snapshot;
  }
  data.history.unshift({ at: new Date().toISOString(), result: "success", actor, note: batch.note, changes });
  data.history = data.history.slice(0, 1000);
  return changes;
}
export function beginUpdate(data, month) {
  data.updateRuns ??= [];
  const now = new Date().toISOString();
  for (const run of data.updateRuns.filter((run) => run.status === "running")) {
    if (Date.now() - Date.parse(run.heartbeatAt || run.startedAt) > 120000) {
      run.status = "failed"; run.completedAt = now; run.error = "Update interrupted. Saved portfolios are preserved; retry the update.";
    } else if (run.month === month) return { started: false, run };
  }
  const run = { id: crypto.randomUUID(), month, status: "running", startedAt: now, heartbeatAt: now,
    report: funds.map((fund) => ({ fundId: fund.id, name: fund.name, status: "pending" })) };
  data.updateRuns.unshift(run); data.updateRuns = data.updateRuns.slice(0, 50);
  return { started: true, run };
}
export function progressUpdate(data, id, report) {
  const run = data.updateRuns?.find((run) => run.id === id);
  if (!run || run.status !== "running") return;
  run.heartbeatAt = new Date().toISOString();
  if (report) run.report = report;
}
export function finishUpdate(data, id, batch, report, error) {
  const run = data.updateRuns?.find((run) => run.id === id);
  if (!run || run.status !== "running") throw Error("Update is no longer active");
  const changes = batch?.snapshots.length ? applyImport(data, batch, "official disclosure updater") : [];
  const changed = new Set(changes.map((change) => change.fundId));
  run.report = report.map((entry) => entry.status === "verified" ? { ...entry, status: changed.has(entry.fundId) ? "imported" : "unchanged" } : entry);
  const verified = run.report.filter((entry) => ["imported", "unchanged"].includes(entry.status)).length;
  run.status = error || verified === 0 ? "failed" : verified === funds.length ? "success" : "partial";
  run.completedAt = new Date().toISOString(); run.heartbeatAt = run.completedAt;
  run.imported = changes.length; run.verified = verified;
  if (error) run.error = error;
  if (verified) data.lastSuccessfulCheck = run.completedAt;
  if (!batch?.snapshots.length) {
    data.history.unshift({ at: run.completedAt, result: "failed", actor: "official disclosure updater", note: error || "No source passed validation", changes: [] });
    data.history = data.history.slice(0, 1000);
  }
  return run;
}

export function publicUpdate(run) {
  if (run.status === "running" && Date.now() - Date.parse(run.heartbeatAt || run.startedAt) > 120000)
    return { ...run, status: "failed", error: "Update interrupted. Saved portfolios are preserved; retry the update." };
  return run;
}
