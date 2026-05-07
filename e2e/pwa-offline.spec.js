import { test, expect } from "@playwright/test";
import { mockDeniedGeolocation } from "./support/openMeteoMocks";

test.use({ serviceWorkers: "allow" });

const REQUIRED_APP_SHELL_ASSET_PATTERNS = [
  "^/assets/index-.+\\.js$",
  "^/assets/index-.+\\.css$",
  "^/assets/lucide-.+\\.js$",
  "^/assets/HourlyCard-.+\\.js$",
  "^/assets/HourlyCard-.+\\.css$",
  "^/assets/StormWatch-.+\\.js$",
  "^/assets/StormWatch-.+\\.css$",
  "^/assets/SupplementalWeatherPanels-.+\\.js$",
  "^/assets/SupplementalWeatherPanels-.+\\.css$",
];

async function resetServiceWorkerState(context, page) {
  const cleanupPath = "/__aura-sw-cleanup__";
  await page.route(`**${cleanupPath}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Aura service worker cleanup</title>",
    });
  });

  await page.goto(cleanupPath);
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }
  });
  await page.unroute(`**${cleanupPath}`);
  await page.close();
  return context.newPage();
}

async function waitForActiveServiceWorker(page) {
  await page.waitForFunction(
    async () => {
      if (!("serviceWorker" in navigator)) {
        return false;
      }

      await navigator.serviceWorker.ready;
      return Boolean(navigator.serviceWorker.controller);
    },
    null,
    { timeout: 20_000 }
  );
}

async function waitForCachedAppShellAssets(page) {
  await expect
    .poll(
      async () =>
        page.evaluate(async (requiredAssetPatterns) => {
          const cacheNames = await caches.keys();
          const appShellCacheName = cacheNames.find((cacheName) =>
            cacheName.endsWith("-app-shell")
          );

          if (!appShellCacheName) {
            return requiredAssetPatterns;
          }

          const cache = await caches.open(appShellCacheName);
          const cachedPaths = (await cache.keys()).map(
            (request) => new URL(request.url).pathname
          );

          return requiredAssetPatterns.filter((pattern) => {
            const expression = new RegExp(pattern);
            return !cachedPaths.some((path) => expression.test(path));
          });
        }, REQUIRED_APP_SHELL_ASSET_PATTERNS),
      {
        message: "production app shell assets are cached",
        timeout: 15_000,
      }
    )
    .toEqual([]);
}

test.beforeEach(async ({ context }) => {
  await mockDeniedGeolocation(context);
  await context.addInitScript(() => {
    window.localStorage.clear();
    window.__AURA_SW_REGISTRATION_DELAY_MS__ = 0;
  });
});

test("serves the app shell after a production load goes offline", async ({
  context,
  page,
}) => {
  test.setTimeout(75_000);
  page = await resetServiceWorkerState(context, page);
  await page.goto("/?mock=missing");

  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator(".hero-location")).toContainText("Sample City");
  await expect(
    page.getByText("Portfolio demo: showing the missing-data trust contract")
  ).toBeVisible();

  await waitForActiveServiceWorker(page);
  await waitForCachedAppShellAssets(page);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "load" });

    await expect(page.getByRole("main")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".hero-location")).toContainText("Sample City");
    await expect(
      page.getByText("Portfolio demo: showing the missing-data trust contract")
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
