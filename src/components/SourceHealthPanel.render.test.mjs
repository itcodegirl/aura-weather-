import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { cleanup, render, screen } = await import("@testing-library/react");
const SourceHealthPanel = (await import("./SourceHealthPanel.jsx")).default;

afterEach(() => {
  cleanup();
});

describe("SourceHealthPanel", () => {
  test("labels cached forecast, missing AQI, unsupported alerts, and reduced archive data", () => {
    render(
      React.createElement(SourceHealthPanel, {
        nowMs: 1_778_086_800_000,
        trustMeta: {
          weatherFetchedAt: 1_778_083_200_000,
          forecastStatus: "cached",
          cacheStatus: "restored",
          aqiFetchedAt: null,
          aqiStatus: "unavailable",
          alertsFetchedAt: null,
          alertsStatus: "unsupported",
          climateFetchedAt: null,
          climateStatus: "disabled",
        },
      })
    );

    assert.ok(screen.getByRole("heading", { name: /data sources/i }));
    assert.ok(screen.getByText("Saved"));
    assert.ok(screen.getByText("No reading"));
    assert.ok(screen.getByText("Not covered"));
    assert.ok(screen.getByText("Reduced data"));
    assert.ok(screen.getByText("Updated 1h ago"));
  });

  test("renders ready providers as live with individual update times", () => {
    render(
      React.createElement(SourceHealthPanel, {
        nowMs: 1_778_083_260_000,
        trustMeta: {
          weatherFetchedAt: 1_778_083_230_000,
          forecastStatus: "ready",
          cacheStatus: "idle",
          aqiFetchedAt: 1_778_083_200_000,
          aqiStatus: "ready",
          alertsFetchedAt: 1_778_083_140_000,
          alertsStatus: "ready",
          climateFetchedAt: 1_778_083_080_000,
          climateStatus: "ready",
        },
      })
    );

    const liveLabels = screen.getAllByText("Live");
    assert.equal(liveLabels.length, 4);
    assert.ok(screen.getByText("Updated just now"));
    assert.ok(screen.getByText("Updated 1m ago"));
    assert.ok(screen.getByText("Updated 2m ago"));
    assert.ok(screen.getByText("Updated 3m ago"));
  });
});
