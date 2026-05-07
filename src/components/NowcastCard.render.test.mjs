import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, screen, cleanup } = await import("@testing-library/react");
const NowcastCard = (await import("./NowcastCard.jsx")).default;
const { analyzeNowcast } = await import("./nowcast/analyzeNowcast.js");

afterEach(() => {
  cleanup();
});

function buildNowcast(overrides = {}) {
  const start = new Date(Date.now() + 60_000);
  start.setSeconds(0, 0);
  const time = Array.from({ length: 8 }, (_, index) =>
    new Date(start.getTime() + index * 15 * 60 * 1000).toISOString()
  );

  return {
    time,
    rainChance: Array.from({ length: 8 }, () => 0),
    rainAmount: Array.from({ length: 8 }, () => 0),
    conditionCode: Array.from({ length: 8 }, () => 0),
    ...overrides,
  };
}

describe("analyzeNowcast", () => {
  test("keeps real zero nowcast readings as a valid dry window", () => {
    const analysis = analyzeNowcast(buildNowcast());

    assert.equal(analysis.hasData, true);
    assert.equal(analysis.hasRain, false);
    assert.equal(analysis.peakProbability, 0);
    assert.match(analysis.details, /0%/);
  });

  test("treats all-null nowcast readings as unavailable", () => {
    const analysis = analyzeNowcast(
      buildNowcast({
        rainChance: Array.from({ length: 8 }, () => null),
        rainAmount: Array.from({ length: 8 }, () => null),
        conditionCode: Array.from({ length: 8 }, () => null),
      })
    );

    assert.equal(analysis.hasData, false);
    assert.equal(analysis.hasRain, false);
    assert.equal(analysis.peakProbability, null);
    assert.match(analysis.details, /missing from the provider/);
  });
});

describe("NowcastCard", () => {
  test("renders missing nowcast samples as offline instead of 0%", () => {
    render(
      React.createElement(NowcastCard, {
        weather: {
          nowcast: buildNowcast({
            rainChance: Array.from({ length: 8 }, () => null),
            rainAmount: Array.from({ length: 8 }, () => null),
            conditionCode: Array.from({ length: 8 }, () => null),
          }),
        },
      })
    );

    assert.equal(screen.getAllByText("Nowcast offline").length, 2);
    assert.ok(screen.getByText("Nowcast data is unavailable."));
    assert.ok(screen.getByText("15-minute precipitation readings are missing from the provider."));
    assert.ok(screen.getAllByText("\u2014").length >= 2);
    assert.equal(screen.queryByText("0%"), null);
  });
});
