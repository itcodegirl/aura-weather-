import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, screen, cleanup } = await import("@testing-library/react");
const StormWatch = (await import("./StormWatch.jsx")).default;

afterEach(() => {
  cleanup();
});

function buildHourlyTime(start = new Date("2026-04-21T12:00:00Z").getTime()) {
  // Six 1-hour timestamps so the pressure trend has something to chew on
  // without driving any branch in StormWatch's title logic.
  return Array.from({ length: 6 }, (_, i) =>
    new Date(start + i * 60 * 60 * 1000).toISOString()
  );
}

function buildWeather({ cape, conditionCode = 2 } = {}) {
  return {
    current: {
      conditionCode,
      windSpeed: 8,
      windGust: 12,
      windDirection: 180,
      pressure: 1014,
      dewPoint: 52,
    },
    hourly: {
      time: buildHourlyTime(),
      cape: [cape],
      pressure: [1012, 1013, 1013, 1014, 1014, 1015],
    },
  };
}

describe("StormWatch dynamic title", () => {
  test("titles itself 'Atmosphere' when CAPE is below the storm-risk threshold", () => {
    render(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 50 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    const heading = screen.getByRole("heading", { name: "Atmosphere" });
    assert.ok(heading, "heading reads 'Atmosphere' on a calm-air-mass day");
    assert.equal(
      screen.queryByRole("heading", { name: "Storm watch" }),
      null,
      "must not surface storm-watch heading when there's no storm signal"
    );
  });

  test("titles itself 'Storm watch' when CAPE clears the storm-risk threshold", () => {
    render(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 600 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    const heading = screen.getByRole("heading", { name: "Storm watch" });
    assert.ok(heading);
    assert.equal(
      screen.queryByRole("heading", { name: "Atmosphere" }),
      null,
      "must not double up — the heading is one identity per render"
    );
  });

  test("treats a missing CAPE reading as a calm 'Atmosphere' rather than promoting to storm-watch", () => {
    // No CAPE means no storm signal — the panel should not invent one.
    // Promotion to 'Storm watch' is gated on hasOverviewCape && score > 0.
    render(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: null }),
        unit: "F",
        isRefreshing: false,
      })
    );

    assert.ok(screen.getByRole("heading", { name: "Atmosphere" }));
  });

  test("data-storm-active attribute mirrors the active-signal state", () => {
    const { container, rerender } = render(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 50 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    const calmSection = container.querySelector(".bento-storm");
    assert.equal(
      calmSection.getAttribute("data-storm-active"),
      null,
      "data-storm-active is absent on the calm path"
    );

    rerender(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 600 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    const activeSection = container.querySelector(".bento-storm");
    assert.equal(activeSection.getAttribute("data-storm-active"), "true");
  });

  test("does not render the dropped storm-snapshot row at any signal level", () => {
    // The audit's redundancy fix removed the 3-chip snapshot row above
    // the four-module grid. This test pins the absence so a future
    // refactor doesn't accidentally restore the duplicate.
    const { container, rerender } = render(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 50 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    assert.equal(container.querySelector(".storm-snapshot"), null);
    assert.equal(container.querySelector(".storm-snapshot-chip"), null);

    rerender(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 600 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    assert.equal(container.querySelector(".storm-snapshot"), null);
    assert.equal(container.querySelector(".storm-snapshot-chip"), null);
  });

  test("hides the CAPE J/kg readout on the calm path so daily users see no meteorologist jargon", () => {
    render(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 50 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    // The Storm Risk module's bottom Stat carried "{N} J/kg" before the
    // audit; on the All-Clear / calm path it now renders nothing or a
    // missing-data placeholder rather than the raw J/kg value.
    const matches = screen.queryAllByText(/J\/kg/);
    assert.equal(
      matches.length,
      0,
      "calm path must not render any J/kg reading"
    );
  });

  test("surfaces CAPE J/kg only when the risk score is non-zero", () => {
    render(
      React.createElement(StormWatch, {
        weather: buildWeather({ cape: 600 }),
        unit: "F",
        isRefreshing: false,
      })
    );

    const matches = screen.queryAllByText(/J\/kg/);
    assert.ok(
      matches.length >= 1,
      "active risk path renders the CAPE detail for the curious"
    );
  });
});
