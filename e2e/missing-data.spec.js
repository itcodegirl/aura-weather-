import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockDeniedGeolocation } from "./support/openMeteoMocks";

test.beforeEach(async ({ page, context }) => {
  await mockDeniedGeolocation(context);
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test("?mock=missing renders 'Data unavailable' instead of synthetic zeros", async ({ page }) => {
  await page.goto("/?mock=missing");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator(".hero-location")).toContainText("Sample City");

  const hero = page.locator(".hero-card");
  await expect(hero).toBeVisible();

  const heroText = (await hero.textContent()) ?? "";
  expect(heroText).not.toMatch(/(^|\s)0%/);
  expect(heroText).not.toMatch(/0\s?hPa/);
  expect(heroText).not.toMatch(/—°F/);
  expect(heroText).not.toMatch(/—°C/);

  // The hero card renders "—" for each unavailable stat and surfaces a
  // note when at least one stat is missing — verify it is present.
  await expect(hero.locator(".hero-stats-note")).toBeVisible();
});

test("?mock=missing surfaces the missing-data trust contract via assistive-tech cues", async ({ page }) => {
  await page.goto("/?mock=missing");
  await expect(page.getByRole("main")).toBeVisible();

  // The helper note is the user-facing explanation for why values are
  // dashed out. It must be a polite live region (role="status") so a
  // screen-reader user hears the explanation when it appears.
  const helperNote = page.locator(".hero-stats-note");
  await expect(helperNote).toBeVisible();
  await expect(helperNote).toHaveAttribute("role", "status");

  // Each missing stat replaces its glyph with a labelled span so AT
  // announces "no data available" instead of speaking the em-dash
  // character literally. At least one of these must be present in the
  // rendered hero card while ?mock=missing is in effect.
  const missingLabels = page
    .locator(".hero-card span[aria-label='No data available']");
  await expect(missingLabels.first()).toBeVisible();
});

test("?mock=missing passes baseline axe-core accessibility checks", async ({ page }) => {
  await page.goto("/?mock=missing");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator(".hero-stats-note")).toBeVisible();

  const report = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const blockingViolations = report.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious"
  );

  expect(
    blockingViolations,
    `Serious a11y issues on ?mock=missing: ${blockingViolations
      .map((issue) => `${issue.id}: ${issue.help}`)
      .join(" | ")}`
  ).toEqual([]);
});
