import express from "express";
import session from "express-session";
import helmet from "helmet";
import crypto from "node:crypto";
import path from "node:path";
import { createStore, FileSessions } from "./store.js";
import { funds, previousMonth, topFive } from "./funds.js";
import { compare } from "./analysis.js";
import { importSchema } from "./schema.js";
import { createPostgresStorage } from "./postgres-store.js";
const equal = (a, b) => {
  const hash = (x) =>
    crypto
      .createHash("sha256")
      .update(x || "")
      .digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
};
export function createApp(config) {
  const app = express(),
    database = config.databaseUrl
      ? createPostgresStorage(config.databaseUrl)
      : null,
    store = database?.store || config.store || createStore(config.dataDir);
  const wrap = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(express.json({ limit: "10mb" }));
  app.use(
    session({
      name: "observatory.sid",
      secret: config.secret,
      resave: false,
      saveUninitialized: false,
      store: database?.sessions || new FileSessions(config.dataDir),
      cookie: {
        httpOnly: true,
        secure: config.secure,
        sameSite: "strict",
        maxAge: 8 * 60 * 60 * 1000,
      },
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      ["POST", "PUT", "DELETE"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== config.origin
    )
      return res.status(403).json({ error: "Origin rejected" });
    next();
  });
  const auth = (req, res, next) =>
    req.session.viewer
      ? next()
      : res.status(401).json({ error: "Please sign in to continue." });
  const update = (req, res, next) =>
    config.updaterToken &&
    equal(req.headers.authorization, "Bearer " + config.updaterToken)
      ? next()
      : res
          .status(403)
          .json({ error: "A separate updater credential is required." });
  let attempts = new Map();
  app.post("/api/login", (req, res) => {
    const key = req.ip,
      n = attempts.get(key);
    if (n && n.until > Date.now() && n.count >= 10)
      return res
        .status(429)
        .json({ error: "Too many attempts. Try again in 15 minutes." });
    if (
      !equal(
        typeof req.body.password === "string" ? req.body.password : "",
        config.password,
      )
    ) {
      attempts.set(key, {
        count: n?.until > Date.now() ? n.count + 1 : 1,
        until: Date.now() + 900000,
      });
      return res
        .status(401)
        .json({ error: "Incorrect password. Please try again." });
    }
    attempts.delete(key);
    req.session.regenerate((err) => {
      if (err)
        return res.status(500).json({ error: "Could not create session" });
      req.session.viewer = true;
      req.session.save((err) =>
        err
          ? res
              .status(503)
              .json({ error: "Could not persist the session. Please retry." })
          : res.json({ ok: true }),
      );
    });
  });
  app.get("/api/session", (req, res) =>
    res.json({ authenticated: !!req.session.viewer }),
  );
  app.post("/api/logout", auth, (req, res) =>
    req.session.destroy(() => {
      res.clearCookie("observatory.sid", {
        httpOnly: true,
        secure: config.secure,
        sameSite: "strict",
      });
      res.json({ ok: true });
    }),
  );
  app.get(
    "/api/months",
    auth,
    wrap(async (req, res) => {
      const d = await store.get(),
        current = new Date().toISOString().slice(0, 7),
        saved = [
          ...new Set(
            Object.values(d.snapshots)
              .filter((s) => s.holdings.some((h) => h.instrument === "equity"))
              .map((s) => s.month),
          ),
        ]
          .sort()
          .reverse(),
        allSaved = Object.values(d.snapshots).map((s) => s.month);
      res.json({
        months: [...new Set([current, previousMonth(current), ...allSaved])]
          .sort()
          .reverse(),
        defaultMonth: saved[0] || previousMonth(current),
        latestSaved: saved[0] || null,
      });
    }),
  );
  app.get(
    "/api/portfolio",
    auth,
    wrap(async (req, res) => {
      const month = req.query.month;
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || ""))
        return res
          .status(400)
          .json({ error: "Choose a valid reporting month." });
      const d = await store.get();
      let list = funds.map((f) => {
        const s = d.snapshots[month + ":" + f.id],
          p = d.snapshots[previousMonth(month) + ":" + f.id];
        return {
          ...f,
          snapshot: s || null,
          top: topFive(s).map((h) => {
            const before = topFive(p).find((x) => x.companyId === h.companyId);
            return {
              ...h,
              allocationChange: before
                ? h.allocation - before.allocation
                : null,
              newTopFive: !!p?.complete && !before,
            };
          }),
          analysis: compare(p, s),
        };
      });
      const aums = list.filter((f) => f.snapshot?.aum);
      const ordered =
        aums.length > 0 &&
        new Set(aums.map((f) => f.snapshot.aum.date)).size === 1;
      if (ordered)
        list.sort(
          (a, b) =>
            (b.snapshot?.aum?.crore ?? -1) - (a.snapshot?.aum?.crore ?? -1),
        );
      res.json({
        month,
        funds: list,
        ordering: ordered
          ? "Descending verified AUM; unavailable AUM follows. Not a quality ranking."
          : "Shortlist order · comparable verified AUM unavailable",
        aumDate: ordered ? aums[0].snapshot.aum.date : null,
        lastSuccessfulCheck: d.lastSuccessfulCheck,
        automaticUpdates: false,
      });
    }),
  );
  app.get(
    "/api/history",
    auth,
    wrap(async (req, res) =>
      res.json(
        (await store.get()).history.map(({ changes, ...e }) => ({
          ...e,
          changes: changes?.map(({ previous, ...c }) => c),
        })),
      ),
    ),
  );
  const ingest = (batch, actor) => {
    const parsed = importSchema.parse(batch);
    return store.import(parsed, actor);
  };
  app.post(
    "/api/updater/import",
    update,
    wrap(async (req, res) => {
      try {
        res.json({
          ok: true,
          changes: (await ingest(req.body, "authenticated updater")).map(
            ({ previous, ...c }) => c,
          ),
        });
      } catch (e) {
        await store.record({
          at: new Date().toISOString(),
          result: "failed",
          actor: "authenticated updater",
          note: "Import validation failed",
        });
        res
          .status(400)
          .json({
            error:
              e.issues
                ?.map((x) => x.path.join(".") + ": " + x.message)
                .join("; ") || e.message,
          });
      }
    }),
  );
  app.post(
    "/api/updater/check",
    update,
    wrap(async (req, res) => {
      if (!config.manifestUrl)
        return res
          .status(409)
          .json({
            error:
              "No vetted disclosure manifest configured; scheduling remains disabled.",
          });
      try {
        if (!config.manifestUrl.startsWith("https://"))
          throw Error("HTTPS manifest required");
        const response = await fetch(config.manifestUrl, {
          signal: AbortSignal.timeout(30000),
          redirect: "error",
        });
        if (!response.ok) throw Error("Manifest returned " + response.status);
        const text = await response.text();
        if (text.length > 10000000) throw Error("Manifest too large");
        const batch = JSON.parse(text);
        let changes = [];
        if (batch.snapshots?.length)
          changes = await ingest(batch, "hosted check");
        else
          await store.record({
            at: new Date().toISOString(),
            result: "success",
            actor: "hosted check",
            note: "No new disclosures",
            changes: [],
          });
        await store.check();
        res.json({ ok: true, changes: changes.length });
      } catch (e) {
        await store.record({
          at: new Date().toISOString(),
          result: "failed",
          actor: "hosted check",
          note: e.message,
        });
        res
          .status(502)
          .json({ error: "Disclosure check failed: " + e.message });
      }
    }),
  );
  app.use(express.static(path.resolve("dist")));
  app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  app.use((err, req, res, next) =>
    res
      .status(500)
      .json({ error: "Server error. Retry or contact the operator." }),
  );
  return app;
}
