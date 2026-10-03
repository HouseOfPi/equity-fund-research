import { test, expect } from "@playwright/test";
import { funds } from "../../server/funds.js";
async function login(page) {
  await page.goto("/");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Enter observatory" }).click();
  await expect(
    page.getByRole("heading", { name: "See what’s inside." }),
  ).toBeVisible();
  await expect(page.locator(".fund-card")).toHaveCount(20);
}
test("all names, views, minimize focus, themes, pending exact month and mobile", async ({
  page,
}) => {
  await login(page);
  for (const f of funds)
    await expect(
      page.getByRole("heading", { name: f.name, exact: true }),
    ).toBeVisible();
  await page
    .getByRole("button", { name: "↗ Analysis", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "↗ Sources", exact: true })
    .first()
    .click();
  await expect(page.locator(".fund-card.expanded")).toHaveCount(1);
  await expect(
    page.getByText("Comparison pending", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Minimize & return to fund ↑" })
    .click();
  await expect(page.locator(".fund-card.expanded")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: funds[0].name, exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "↗ Analysis", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Minimize ↑", exact: true }).click();
  await expect(page.locator(".fund-card.expanded")).toHaveCount(0);
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
  await page.screenshot({ path: "docs/mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "docs/desktop.png" });
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
        automaticUpdates: false,
        ordering: "SYNTHETIC browser test fixture",
      },
    }),
  );
  await login(page);
  await expect(page.locator(".shared-content")).toHaveCount(0);
  const card = await page
    .locator(".fund-card")
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
  await page.getByRole("button", { name: "Minimize ↑", exact: true }).click();
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
