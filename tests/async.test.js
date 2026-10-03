import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/app.js";
test("async persistent storage errors reach API error handling", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "obs-async-"));
  const app = createApp({
    dataDir: dir,
    secret: "x".repeat(40),
    password: "test",
    origin: "http://localhost",
    secure: false,
    store: {
      get: async () => {
        throw Error("database unavailable");
      },
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    const login = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "test" }),
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    for (const route of [
      "/api/months",
      "/api/portfolio?month=2026-09",
      "/api/history",
    ]) {
      const res = await fetch(base + route, { headers: { cookie } });
      assert.equal(res.status, 500);
      assert((await res.json()).error.includes("Server error"));
    }
  } finally {
    await new Promise((r) => server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
