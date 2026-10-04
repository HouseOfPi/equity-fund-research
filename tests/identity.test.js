import { test } from "node:test";
import assert from "node:assert/strict";
import { compare } from "../server/analysis.js";
test("unreconciled identifier changes never assert purchases or sales", () => {
  const a = {
    complete: true,
    holdings: [
      {
        companyId: "old",
        company: "Example Limited",
        instrument: "equity",
        quantity: 100,
        allocation: 2,
      },
    ],
    sources: [],
  };
  const b = {
    ...a,
    holdings: [
      {
        companyId: "new",
        company: "Example Ltd",
        instrument: "equity",
        quantity: 100,
        allocation: 3,
      },
    ],
  };
  const r = compare(a, b);
  assert(r.rows.every((x) => x.movement === "Needs review"));
  assert(r.rows.every((x) => x.net === null));
});
