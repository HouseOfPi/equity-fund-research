import { test, expect } from "@playwright/test";
import { funds } from "../../server/funds.js";
async function login(page) {
  await page.goto("/");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign in →" }).click();
  await expect(
    page.getByRole("heading", { name: "Small-cap funds", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".fund-card")).toHaveCount(20);
}
test("all names, views, minimize focus, themes, pending exact month and mobile", async ({
  page,
}) => {
  await login(page);
  for (const f of funds)
    await expect(page.getByRole("heading", { name: f.name, exact: true })).toBeVisible();
  const analysisButton = page.getByRole("button", { name: "↗ Analysis", exact: true }).first();
  await analysisButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText("Comparison pending", { exact: true })).toBeVisible();
  await expect(page.locator(".fund-card.expanded")).toHaveCount(0);
  await page.getByRole("button", { name: "Close fund popup", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(analysisButton).toBeFocused();
  await analysisButton.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const sourceButton = page.getByRole("button", { name: "↗ Sources", exact: true }).first();
  await sourceButton.click();
  await expect(page.getByRole("dialog", { name: "Fund sources", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Disclosure & verification", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close fund popup", exact: true }).click();
  await expect(sourceButton).toBeFocused();
  await page.getByRole("button", { name: "☷ Table", exact: true }).click();
  for (const f of funds)
    await expect(
      page.getByRole("heading", { name: f.name, exact: true }),
    ).toBeVisible();
  await page.reload();
  await expect(page.locator(".fund-table")).toBeVisible();
  for (const theme of ["violet", "emerald", "sunset", "ocean"]) {
    await page.getByLabel("Theme", { exact: true }).selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }
  await page.getByLabel("Theme", { exact: true }).selectOption("violet");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "violet");
  await page.route("**/api/portfolio?*", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  const options = await page
    .locator("#month option")
    .evaluateAll((es) => es.map((e) => e.value));
  await page
    .getByLabel("Reporting month", { exact: true })
    .selectOption(options[0]);
  await expect(page.getByRole("status")).toContainText("Loading");
  await expect(page.locator("#month")).toBeDisabled();
  await expect(page.locator(".fund-table")).toHaveCount(0);
  await expect(page.locator(".fund-table")).toBeVisible();
  await expect(page.getByText("Holdings pending", { exact: true })).toHaveCount(
    20,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "▦ Cards", exact: true }).click();
  await expect(page.locator(".fund-card")).toHaveCount(20);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "test-results/desktop.png" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
});
test("synthetic API fixtures stay separate: identical views, full portfolio and shared collapse", async ({
  page,
}) => {
  const h = (id, q, a) => ({
    companyId: id,
    company: "SYNTHETIC " + id,
    instrument: "equity",
    quantity: q,
    allocation: a,
  });
  const mockFunds = funds.map((f, i) => ({
    ...f,
    snapshot: {
      disclosureDate: "2026-09-30",
      complete: true,
      verification: "unverified",
      sources: [],
    },
    top: i < 2 ? [h("Shared Co", 100, 5.25), h("Second Co", 200, 4.13)] : [],
    analysis: {
      pending: false,
      previousDate: "2026-08-31",
      currentDate: "2026-09-30",
      sources: [],
      counts: { Unchanged: 1, "Increased share quantity": 1 },
      rows: [
        {
          id: "weight",
          company: "SYNTHETIC weight rise",
          movement: "Unchanged",
          previousQuantity: 100,
          currentQuantity: 100,
          net: 0,
          percent: 0,
          allocation: 5,
        },
        {
          id: "sixth",
          company: "SYNTHETIC outside top five",
          movement: "Increased share quantity",
          previousQuantity: 100,
          currentQuantity: 150,
          net: 50,
          percent: 50,
          allocation: 0.2,
        },
      ],
    },
  }));
  await page.route("**/api/portfolio?*", (r) =>
    r.fulfill({
      json: {
        month: "2026-09",
        funds: mockFunds,
        combined: { covered: 0, pending: 20, rows: [] },
        automaticUpdates: false,
        ordering: "SYNTHETIC browser test fixture",
      },
    }),
  );
  await login(page);
  await expect(page.locator(".shared-content")).toHaveCount(0);
  const card = await page
    .locator(".fund-card").filter({ has: page.locator(".holdings") })
    .first()
    .locator(".holdings")
    .innerText();
  await page.getByRole("button", { name: "☷ Table", exact: true }).click();
  expect(await page.locator(".fund-table .holdings").first().innerText()).toBe(
    card,
  );
  await page
    .getByRole("button", { name: "↗ Analysis", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("SYNTHETIC outside top five", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "All companies", exact: true })
    .click();
  await expect(
    page.getByText("SYNTHETIC weight rise", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close fund popup", exact: true }).click();
  await page.locator(".shared-section > summary").click();
  await page.locator(".shared-header").first().click();
  await expect(page.locator(".shared-content").first()).toBeVisible();
  await page
    .locator(".shared-content")
    .first()
    .getByRole("button", { name: "Minimize & return ↑" })
    .click();
  await expect(page.locator(".shared-content")).toHaveCount(0);
  await expect(page.locator(".shared-header").first()).toBeFocused();
});

test("Refresh downloads selected-month reports, polls progress and reloads saved portfolios without tabs", async ({ page }) => {
  const report = funds.map((fund) => ({ fundId: fund.id, name: fund.name, status: "unchanged", holdings: 50 }));
  const finished = { id: "fixture-refresh", month: "2026-08", status: "success", startedAt: "2026-10-04T12:00:00Z", verified: 20, report };
  let starts = 0, complete = false;
  await page.route("**/api/months", (route) => route.fulfill({ json: { months: ["2026-08"], defaultMonth: "2026-08" } }));
  await page.route("**/api/portfolio?*", (route) => route.fulfill({ json: {
    month: "2026-08", combined: { covered: 0, rows: [], counts: {} },
    funds: funds.map((fund) => ({ ...fund, snapshot: complete ? { disclosureDate: "2026-08-31", complete: true } : null,
      top: complete ? [{ companyId: "fixture", company: "Freshly imported company", allocation: 10, quantity: 100 }] : [],
      analysis: { pending: true, reason: "Fixture has no previous month" } })),
  } }));
  await page.route("**/api/portfolio/refresh", async (route) => {
    starts++;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ month: "2026-08" });
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({ status: 202, json: { started: true, run: { ...finished, status: "running", report: report.map((entry) => ({ ...entry, status: "fetching" })) } } });
  });
  await page.route("**/api/updates/fixture-refresh", async (route) => { complete = true; await route.fulfill({ json: finished }); });
  await login(page);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  expect(starts).toBe(0);
  await page.getByRole("button", { name: "Refresh from official sources" }).click();
  await expect(page.getByLabel("Reporting month", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Refresh from official sources" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("all 20 reports checked and saved");
  await expect(page.locator(".fund-card .holdings").getByText("Freshly imported company")).toHaveCount(20);
  expect(starts).toBe(1);
  await page.locator(".refresh-results > summary").click();
  await expect(page.locator(".refresh-results li")).toHaveCount(20);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("combined report shows summaries, filters, quantities and expandable fund evidence", async ({ page }) => {
  const { combinedAnalysis } = await import("../../server/combined-analysis.js");
  const source = { label: "Synthetic test source", url: "https://example.invalid/disclosure.xlsx", disclosureDate: "2026-08-31" };
  const row = (id, previous, current, movement) => ({ id, company: "SYNTHETIC " + id, previousQuantity: previous, currentQuantity: current, net: movement === "Needs review" ? null : current - previous, movement, allocation: 1 });
  const records = funds.map((fund, index) => ({ ...fund, snapshot: null, top: [], analysis: index > 1 ? { pending: true, reason: "Fixture missing disclosure" } : {
    pending: false, sources: [source], counts: {}, rows: index === 0 ? [row("combined increase", 100, 160, "Increased share quantity"), row("exit", 10, 0, "Exited position"), row("uncertain", 10, 15, "Needs review")] : [row("combined increase", 40, 20, "Decreased share quantity"), row("new", 0, 15, "New position")],
  } }));
  const combined = combinedAnalysis(records);
  await page.route("**/api/portfolio?*", (route) => route.fulfill({ json: { month: "2026-08", funds: records, combined, ordering: "SYNTHETIC fixture" } }));
  await login(page);
  const section = page.locator(".combined-section");
  await expect(section).toHaveAttribute("open", "");
  expect(await section.evaluate((element) => !!(element.compareDocumentPosition(document.querySelector('[aria-label="Fund listing"]')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(section.locator(".combined-stat")).toHaveCount(4);
  await expect(section.getByText("Partial coverage: 2 of 20 funds compared.", { exact: true })).toBeVisible();
  await expect(section.locator(".combined-company-toggle")).toHaveCount(4);
  await section.getByRole("button", { name: /SYNTHETIC combined increase/ }).click();
  await expect(section.locator(".combined-fund-details tbody tr")).toHaveCount(2);
  await expect(section.getByRole("cell", { name: "+60", exact: true })).toBeVisible();
  await expect(section.getByRole("cell", { name: "−20", exact: true })).toHaveCount(0);
  await expect(section.getByRole("cell", { name: "-20", exact: true })).toBeVisible();
  await section.locator(".combined-sources summary").first().click();
  await expect(section.getByRole("link", { name: /Synthetic test source/ }).first()).toHaveAttribute("href", source.url);
  const filters = section.getByRole("group", { name: "Combined movement filters" });
  await section.getByRole("button", { name: /^Filter New across funds/ }).click();
  await expect(section.locator(".combined-company-toggle")).toHaveCount(1);
  await expect(section.getByText("SYNTHETIC new", { exact: true })).toBeVisible();
  await filters.getByRole("button", { name: /^Mixed directions/ }).click();
  await expect(section.getByText("SYNTHETIC combined increase", { exact: true })).toBeVisible();
  await filters.getByRole("button", { name: /^Needs review/ }).click();
  await expect(section.locator(".combined-company-toggle")).toHaveCount(1);
  await expect(section.locator(".combined-table > tbody > tr > .numeric")).toHaveText(["—", "—", "—"]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await section.locator(".combined-table-scroll").evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
});

test("AI analysis reads saved reports without generation and explains missing reports", async ({ page }) => {
  const companyId = "company:2026-08:synthetic", fundId = "fund:2026-08:01";
  const source = { label: "SYNTHETIC official source", url: "https://example.invalid/report.xlsx", disclosureDate: "2026-08-31" };
  const evidence = {
    [companyId]: { id: companyId, kind: "company", name: "SYNTHETIC company", month: "2026-08", trusted: true,
      metrics: { previousShares: 100, currentShares: 120, netShares: 20, addingFunds: 1, reducingFunds: 0 },
      entries: [{ fundId: "01", fundName: funds[0].name, previousShares: 100, currentShares: 120, netShares: 20, previousWeight: 1, currentWeight: 1.1, sources: [source] }] },
    [fundId]: { id: fundId, kind: "fund", fundId: "01", name: funds[0].name, month: "2026-08", trusted: true, metrics: { increased: 1 }, sources: [source] },
  };
  const done = { id: "fixture-ai", month: "2026-08", status: "complete", completedAt: "2026-10-04T12:00:00Z", coverage: { comparedFunds: 1, companies: 1, lookbackMonths: ["2026-06", "2026-07", "2026-08"] }, evidence,
    report: { title: "SYNTHETIC AI research fixture", summary: ["Synthetic summary; not real analysis."], findings: [{ title: "Synthetic coordinated move", observation: "A synthetic observation.", interpretation: "A synthetic hypothesis.", confidence: "medium", evidenceIds: [companyId], claims: [{ evidenceId: companyId, metric: "netShares", value: 20 }], followUp: "Check the next synthetic month." }], fundBehaviors: [{ fundId: "01", summary: "Synthetic fund behavior.", evidenceIds: [fundId] }], limitations: ["Test fixtures only."] } };
  let starts = 0;
  await page.route("**/api/months", (route) => route.fulfill({ json: { months: ["2026-08"], defaultMonth: "2026-08" } }));
  await page.route("**/api/ai-analysis?month=*", async (route) => {
    starts++; expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: { run: { ...done, origin: "coding-environment" } } });
  });
  await login(page); expect(starts).toBe(0);
  const button = page.getByRole("button", { name: "✦ AI analysis", exact: true });
  await button.click();
  const dialog = page.getByRole("dialog", { name: "AI portfolio analysis", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "SYNTHETIC AI research fixture" })).toBeVisible();
  await dialog.getByText("Supporting data (1)", { exact: true }).click();
  await expect(dialog.locator(".ai-evidence-table tbody tr")).toHaveCount(1);
  await expect(dialog.getByText("Net shares: 20", { exact: false })).toBeVisible();
  await dialog.getByText("Official disclosure sources", { exact: true }).first().click();
  await expect(dialog.getByRole("link", { name: /SYNTHETIC official source/ })).toHaveAttribute("href", source.url);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(button).toBeFocused();
  await page.unroute("**/api/ai-analysis?month=*");
  await page.route("**/api/ai-analysis?month=*", (route) => route.fulfill({ json: { run: null } }));
  await button.click(); await expect(dialog.getByText("No saved analysis for August 2026")).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "SYNTHETIC AI research fixture" })).toHaveCount(0);
});
