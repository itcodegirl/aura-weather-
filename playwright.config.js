import { defineConfig } from "@playwright/test";

const previewPort = Number.parseInt(
  globalThis.process?.env?.PLAYWRIGHT_PREVIEW_PORT || "45173",
  10
);

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  snapshotPathTemplate:
    "{testDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}",
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    // Also write the HTML report (to playwright-report/, which is
    // gitignored). CI uploads that directory as an artifact on failure;
    // without this reporter the directory never exists and the artifact
    // is always empty, so a browser-quality failure is harder to triage.
    // `open: "never"` keeps the run non-interactive.
    ["html", { open: "never" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${previewPort} --strictPort`,
    port: previewPort,
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
