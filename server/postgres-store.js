import pg from "pg";
import session from "express-session";
const initial = () => ({
  snapshots: {},
  history: [],
  lastSuccessfulCheck: null,
});
export function createPostgresStorage(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  let initialization;
  const ready = () =>
    (initialization ??= (async () => {
      await pool.query(
        "CREATE TABLE IF NOT EXISTS observatory_state (id integer PRIMARY KEY CHECK(id=1), document jsonb NOT NULL)",
      );
      await pool.query(
        "INSERT INTO observatory_state (id,document) VALUES (1,$1) ON CONFLICT DO NOTHING",
        [JSON.stringify(initial())],
      );
      await pool.query(
        "CREATE TABLE IF NOT EXISTS observatory_sessions (id text PRIMARY KEY, document jsonb NOT NULL, expires_at timestamptz NOT NULL)",
      );
    })().catch((e) => {
      initialization = null;
      throw e;
    }));
  async function mutate(fn) {
    await ready();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT document FROM observatory_state WHERE id=1 FOR UPDATE",
      );
      const data = rows[0].document,
        result = fn(data);
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
    import(batch, actor) {
      return mutate((d) => {
        const changes = [];
        for (const s of batch.snapshots) {
          const key = s.month + ":" + s.fundId,
            old = d.snapshots[key];
          if (JSON.stringify(old) !== JSON.stringify(s))
            changes.push({
              fundId: s.fundId,
              month: s.month,
              action: old ? "replaced" : "added",
              holdingsBefore: old?.holdings.length ?? null,
              holdingsAfter: s.holdings.length,
              previous: old || null,
            });
          d.snapshots[key] = s;
        }
        d.history.unshift({
          at: new Date().toISOString(),
          result: "success",
          actor,
          note: batch.note,
          changes,
        });
        return changes;
      });
    },
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
  return { store, sessions: new PostgresSessions(), close: () => pool.end() };
}
