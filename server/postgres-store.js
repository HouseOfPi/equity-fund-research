import { beginAIReport, finishAIReport, saveCodingReport } from "./ai-analysis.js";
import { applyImport, beginUpdate, progressUpdate, finishUpdate } from "./update-state.js";
import pg from "pg";
import session from "express-session";
import { mergeLocalState } from "./database-migration.js";
import { schemaSql, seedFunds, syncSnapshots } from "./postgres-projections.js";
const initial = () => ({
  snapshots: {},
  history: [],
  lastSuccessfulCheck: null,
});
export function createPostgresStorage(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    enableChannelBinding: true,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  pool.on("error", (err) => {
    console.warn("Postgres idle pool client error (handled):", err.message);
  });
  let initialization;
  const ready = () =>
    (initialization ??= (async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(73102601)");
        await client.query(schemaSql);
        await client.query(
          "INSERT INTO observatory_state (id,document) VALUES (1,$1) ON CONFLICT DO NOTHING",
          [JSON.stringify(initial())],
        );
        await seedFunds(client);
        const { rows } = await client.query("SELECT document FROM observatory_state WHERE id=1 FOR UPDATE");
        await syncSnapshots(client, rows[0].document.snapshots);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })().catch((e) => {
      initialization = null;
      throw e;
    }));
  async function mutate(fn, updateSnapshots = false) {
    await ready();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT document FROM observatory_state WHERE id=1 FOR UPDATE",
      );
      const data = rows[0].document,
        result = fn(data);
      if (updateSnapshots) await syncSnapshots(client, data.snapshots);
      await client.query(
        "UPDATE observatory_state SET document=$1 WHERE id=1",
        [JSON.stringify(data)],
      );
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  const store = {
    migrate(document) {
      return mutate((data) => mergeLocalState(data, document), true);
    },
    async get() {
      await ready();
      return (
        await pool.query("SELECT document FROM observatory_state WHERE id=1")
      ).rows[0].document;
    },
    record(entry) {
      return mutate((d) => {
        d.history.unshift(entry);
        d.history = d.history.slice(0, 1000);
      });
    },
    check() {
      return mutate((d) => {
        d.lastSuccessfulCheck = new Date().toISOString();
      });
    },
    import(batch, actor) { return mutate((data) => applyImport(data, batch, actor), true); },
    saveCodingReport(envelope) { return mutate((data) => saveCodingReport(data, envelope)); },
    beginAIReport(metadata) { return mutate((data) => beginAIReport(data, metadata)); },
    finishAIReport(id, result) { return mutate((data) => finishAIReport(data, id, result)); },
    beginUpdate(month) { return mutate((data) => beginUpdate(data, month)); },
    progressUpdate(id, report) { return mutate((data) => progressUpdate(data, id, report)); },
    finishUpdate(id, batch, report, error) { return mutate((data) => finishUpdate(data, id, batch, report, error), true); },
  };
  class PostgresSessions extends session.Store {
    get(id, cb) {
      ready()
        .then(() =>
          pool.query(
            "SELECT document FROM observatory_sessions WHERE id=$1 AND expires_at>now()",
            [id],
          ),
        )
        .then((r) => cb(null, r.rows[0]?.document || null), cb);
    }
    set(id, value, cb) {
      ready()
        .then(() =>
          pool.query(
            "INSERT INTO observatory_sessions(id,document,expires_at) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET document=EXCLUDED.document,expires_at=EXCLUDED.expires_at",
            [id, JSON.stringify(value), value.cookie.expires],
          ),
        )
        .then(
          () => cb?.(),
          (e) => cb?.(e),
        );
    }
    destroy(id, cb) {
      ready()
        .then(() =>
          pool.query("DELETE FROM observatory_sessions WHERE id=$1", [id]),
        )
        .then(
          () => cb?.(),
          (e) => cb?.(e),
        );
    }
  }
  return {
    store,
    sessions: new PostgresSessions(),
    async stats() {
      await ready();
      return (await pool.query(`SELECT
        (SELECT count(*)::int FROM observatory_funds) AS funds,
        (SELECT count(*)::int FROM observatory_snapshots) AS snapshots,
        (SELECT count(*)::int FROM observatory_holdings) AS holdings,
        (SELECT count(*)::int FROM observatory_sources) AS sources
      `)).rows[0];
    },
    close: () => pool.end(),
  };
}
