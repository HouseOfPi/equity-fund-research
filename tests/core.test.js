import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compare } from "../server/analysis.js";
import { importSchema } from "../server/schema.js";
import { createApp } from "../server/app.js";
import { createStore } from "../server/store.js";
import { funds, topFive } from "../server/funds.js";
const holding = (companyId, quantity, allocation = 1, extra = {}) => ({
  companyId,
  company: "Synthetic Company " + companyId,
  instrument: "equity",
  quantity,
  allocation,
  ...extra,
});
const snapshot = (month, holdings, extra = {}) => ({
  fundId: "01",
  month,
  disclosureDate: month + "-28",
  complete: true,
  verification: "unverified",
  sources: [
    {
      label: "Synthetic test source",
      url: "https://example.invalid/fixture",
      type: "official",
      disclosureDate: month + "-28",
      retrievedAt: "2026-10-03T00:00:00Z",
      result: "not_checked",
    },
  ],
  holdings,
  ...extra,
});
test("shortlist preserves all 20 schemes and Quantum", () => {
  assert.equal(funds.length, 20);
  assert(funds.some((f) => f.name === "Quantum Small Cap Fund"));
  assert(
    !funds.some((f) =>
      /HDFC|Axis|ICICI|Tata|Franklin|Quant Small/.test(f.name),
    ),
  );
});
test("compares entire equity portfolio, never infers purchases from weights", () => {
  const a = snapshot("2026-08", [
    holding("a", 100, 1),
    holding("b", 100),
    holding("exit", 10),
    holding("review", 100),
    holding("missing", null),
    holding("cash", 10, 1, { instrument: "cash" }),
  ]);
  const b = snapshot("2026-09", [
    holding("a", 100, 5),
    holding("b", 80),
    holding("new", 12),
    holding("review", 200, 1, {
      reviewReason: "Stock split; quantity not directly comparable",
    }),
    holding("missing", null),
    holding("inc", 150),
  ]);
  const c = compare(a, b);
  assert.equal(c.rows.find((r) => r.id === "a").movement, "Unchanged");
  assert.equal(c.rows.find((r) => r.id === "b").net, -20);
  assert.equal(c.rows.find((r) => r.id === "new").movement, "New position");
  assert.equal(c.rows.find((r) => r.id === "exit").movement, "Exited position");
  assert.equal(c.rows.find((r) => r.id === "review").movement, "Needs review");
  assert.equal(c.rows.find((r) => r.id === "missing").movement, "Needs review");
  assert(!c.rows.some((r) => r.id === "cash"));
  assert.equal(c.rows.length, 7);
});
test("missing, partial and conflicting disclosure never becomes zero", () => {
  const s = snapshot("2026-09", [holding("a", 100)]);
  assert(compare(null, s).pending);
  assert(compare({ ...s, complete: false }, s).pending);
  assert(compare({ ...s, verification: "conflict" }, s).pending);
});
test("top five is ordered by net asset allocation", () =>
  assert.deepEqual(
    topFive(
      snapshot("2026-09", [holding("a", 10, 1), holding("b", 10, 9)]),
    ).map((h) => h.companyId),
    ["b", "a"],
  ));
test("schema rejects mismatched months, duplicate IDs and invented verification without evidence", () => {
  const s = snapshot("2026-09", [holding("a", 10)]);
  assert(importSchema.safeParse({ note: "test only", snapshots: [s] }).success);
  for (const bad of [
    { ...s, disclosureDate: "2026-08-28" },
    { ...s, verification: "official" },
    { ...s, holdings: [holding("a", 1), holding("a", 2)] },
  ])
    assert(!importSchema.safeParse({ note: "test", snapshots: [bad] }).success);
});
test("persistent history and snapshots survive restart", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-"));
  try {
    const store = createStore(dir);
    store.import(
      { note: "test", snapshots: [snapshot("2026-08", [holding("a", 1)])] },
      "test",
    );
    store.import(
      { note: "test", snapshots: [snapshot("2026-09", [holding("a", 2)])] },
      "test",
    );
    assert.equal(Object.keys(createStore(dir).get().snapshots).length, 2);
    assert.equal(createStore(dir).get().history.length, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("login, exact-month API, viewer write rejection, updater authentication, session logout", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-api-"));
  const app = createApp({
    dataDir: dir,
    secret: "x".repeat(40),
    password: "password123",
    updaterToken: "test-updater",
    origin: "http://localhost",
    secure: false,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const request = (url, options = {}) => fetch(base + "/api" + url, options);
  try {
    assert.equal((await request("/portfolio?month=2026-09")).status, 401);
    assert.equal(
      (
        await request("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: "wrong" }),
        })
      ).status,
      401,
    );
    const login = await request("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "password123" }),
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    assert(login.headers.get("set-cookie").includes("HttpOnly"));
    assert(login.headers.get("set-cookie").includes("SameSite=Strict"));
    const batch = {
      note: "synthetic test only",
      snapshots: [snapshot("2026-08", [holding("a", 100)])],
    };
    assert.equal(
      (
        await request("/updater/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookie },
          body: JSON.stringify(batch),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("/updater/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-updater",
          },
          body: JSON.stringify(batch),
        })
      ).status,
      200,
    );
    const p = await (
      await request("/portfolio?month=2026-09", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(p.funds.length, 20);
    assert(p.funds.every((f) => f.snapshot === null));
    assert(p.funds.every((f) => f.analysis.pending));
    const saved = await (
      await request("/portfolio?month=2026-08", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(saved.funds[0].top[0].quantity, 100);
    const months = await (
      await request("/months", { headers: { Cookie: cookie } })
    ).json();
    assert.equal(months.defaultMonth, "2026-08");
    assert.equal(
      (
        await request("/updater/check", {
          method: "POST",
          headers: { Authorization: "Bearer test-updater" },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request("/logout", {
          method: "POST",
          headers: { Cookie: cookie },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await request("/portfolio?month=2026-08", {
          headers: { Cookie: cookie },
        })
      ).status,
      401,
    );
  } finally {
    await new Promise((r) => server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
