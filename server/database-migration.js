import { snapshotSchema } from "./schema.js";

export function validateLocalState(document) {
  if (!document || typeof document.snapshots !== "object" ||
      document.snapshots === null || Array.isArray(document.snapshots) ||
      !Array.isArray(document.history)) {
    throw new Error("Invalid local datastore: expected snapshots and history.");
  }
  for (const [key, snapshot] of Object.entries(document.snapshots)) {
    snapshotSchema.parse(snapshot);
    if (key !== `${snapshot.month}:${snapshot.fundId}`) {
      throw new Error(`Snapshot key does not match its reporting month/fund: ${key}`);
    }
  }
  const checked = document.lastSuccessfulCheck;
  if (checked != null && (typeof checked !== "string" || !Number.isFinite(Date.parse(checked)))) {
    throw new Error("Invalid last successful check timestamp.");
  }
  return document;
}

export function mergeLocalState(destination, source) {
  validateLocalState(source);
  const added = [];
  // Check every conflict before making any changes. Existing database records win.
  for (const [key, snapshot] of Object.entries(source.snapshots)) {
    const existing = destination.snapshots[key];
    if (existing && !sameJson(existing, snapshot)) {
      throw new Error(`Database already contains different data for ${key}; migration stopped without overwriting it.`);
    }
    if (!existing) added.push(key);
  }
  if (!added.length) return { added: 0, skipped: Object.keys(source.snapshots).length };
  for (const key of added) destination.snapshots[key] = structuredClone(source.snapshots[key]);
  const history = [...destination.history, ...source.history];
  destination.history = [...new Map(history.map((entry) => [JSON.stringify(entry), entry])).values()]
    .sort((a, b) => (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0));
  destination.history.unshift({
    at: new Date().toISOString(), result: "success", actor: "local-database-migration",
    note: `Migrated ${added.length} official/local snapshots and their import history to Postgres.`,
    changes: added.map((key) => ({
      fundId: source.snapshots[key].fundId, month: source.snapshots[key].month,
      action: "added", holdingsBefore: null, holdingsAfter: source.snapshots[key].holdings.length,
      previous: null,
    })),
  });
  destination.history = destination.history.slice(0, 1000);
  if (source.lastSuccessfulCheck &&
      (!destination.lastSuccessfulCheck || Date.parse(source.lastSuccessfulCheck) > Date.parse(destination.lastSuccessfulCheck))) {
    destination.lastSuccessfulCheck = source.lastSuccessfulCheck;
  }
  return { added: added.length, skipped: Object.keys(source.snapshots).length - added.length };
}

// Postgres JSONB may return object properties in a different order.
function sameJson(a, b) {
  const canonical = (value) => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
