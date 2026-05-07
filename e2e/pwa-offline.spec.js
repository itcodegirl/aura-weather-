import { test, expect } from "@playwright/test";
import { mockDeniedGeolocation } from "./support/openMeteoMocks";

test.use({ serviceWorkers: "allow" });

async function resetServiceWorkerState(page) {
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
        page.evaluate(async () => {
          const cacheNames = await caches.keys();
          const appShellCacheName = cacheNames.find((cacheName) =>
            cacheName.endsWith("-app-shell")
          );

          if (!appShellCacheName) {
            return false;
          }

          const cache = await caches.open(appShellCacheName);
          const cachedPaths = (await cache.keys()).map(
            (request) => new URL(request.url).pathname
          );

          return (
            cachedPaths.some((path) => /^\/assets\/index-.+\.js$/.test(path)) &&
            cachedPaths.some((path) => /^\/assets\/index-.+\.css$/.test(path)) &&
            cachedPaths.some((path) =>
              /^\/assets\/SupplementalWeatherPanels-.+\.js$/.test(path)
            )
          );
        }),
      {
        message: "production app shell assets are cached",
        timeout: 15_000,
      }
    )
    .toBe(true);
}

test.beforeEach(async ({ context, page }) => {
  await mockDeniedGeolocation(context);
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.__AURA_SW_REGISTRATION_DELAY_MS__ = 0;
  });
});

test("serves the app shell after a production load goes offline", async ({
  context,
  page,
}) => {
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      console.log(`[${message.type()}] ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`[pageerror] ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    console.log(
      `[requestfailed] ${request.resourceType()} ${request.url()} ${request.failure()?.errorText || ""}`
    );
  });

  await resetServiceWorkerState(page);
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
    console.log(await page.content());

    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".hero-location")).toContainText("Sample City");
    await expect(
      page.getByText("Portfolio demo: showing the missing-data trust contract")
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
