import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { analyzeRain } from "./useRainAnalysis.js";

function buildHourly(overrides = {}) {
  const start = new Date(Date.now() + 60_000);
  start.setSeconds(0, 0);
  const time = Array.from({ length: 24 }, (_, index) =>
    new Date(start.getTime() + index * 60 * 60 * 1000).toISOString()
  );

  return {
    time,
    rainChance: Array.from({ length: 24 }, () => 0),
    rainAmount: Array.from({ length: 24 }, () => 0),
    ...overrides,
  };
}

describe("analyzeRain", () => {
  test("keeps real zero precipitation readings as valid dry data", () => {
    const analysis = analyzeRain(buildHourly());

    assert.equal(analysis.hasData, true);
    assert.equal(analysis.peak.probability, 0);
    assert.equal(analysis.total, 0);
    assert.equal(analysis.missingSlots, 0);
  });

  test("treats all-null precipitation readings as unavailable, not fake zero rain", () => {
    const analysis = analyzeRain(
      buildHourly({
        rainChance: Array.from({ length: 24 }, () => null),
        rainAmount: Array.from({ length: 24 }, () => null),
      })
    );

    assert.equal(analysis.hasData, false);
    assert.equal(analysis.peak, null);
    assert.equal(analysis.total, null);
    assert.equal(analysis.missingSlots, 24);
    assert.equal(
      analysis.hours.every((hour) => hour.missing),
      true
    );
  });

  test("preserves missing slots inside an otherwise usable rain timeline", () => {
    const analysis = analyzeRain(
      buildHourly({
        rainChance: [10, null, 45, ...Array.from({ length: 21 }, () => 0)],
        rainAmount: [0, null, 0.05, ...Array.from({ length: 21 }, () => 0)],
      })
    );

    assert.equal(analysis.hasData, true);
    assert.equal(analysis.missingSlots, 1);
    assert.equal(analysis.hours[1].probability, null);
    assert.equal(analysis.hours[1].amount, null);
    assert.equal(analysis.nextRain.probability, 45);
    assert.equal(analysis.total, 0.05);
  });
});
