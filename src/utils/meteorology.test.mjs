import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  calculatePressureTrend,
  classifyComfort,
  classifyStormRisk,
  classifyWind,
  windDirectionName,
} from "./meteorology.js";

function buildHourlyIsoTimes(count, hourOffsetFromNow = 0) {
  const now = Date.now();
  return Array.from({ length: count }, (_, index) => {
    const relativeHours = hourOffsetFromNow - (count - 1 - index);
    return new Date(now + relativeHours * 60 * 60 * 1000).toISOString();
  });
}

describe("meteorology utils", () => {
  test("classifyStormRisk uses CAPE thresholds and storm code override", () => {
    assert.deepEqual(classifyStormRisk(50, 0), {
      level: "Minimal",
      color: "#38bdf8",
      score: 0,
    });
    assert.deepEqual(classifyStormRisk(700, 0), {
      level: "Moderate",
      color: "#eab308",
      score: 2,
    });
    assert.deepEqual(classifyStormRisk(300, 95), {
      level: "Severe",
      color: "#dc2626",
      score: 4,
    });
    assert.deepEqual(classifyStormRisk(null, null), {
      level: "Minimal",
      color: "#38bdf8",
      score: 0,
    });
  });

  test("calculatePressureTrend detects rising/falling/stable signals", () => {
    const times = buildHourlyIsoTimes(8, 0);

    const rising = calculatePressureTrend(
      [1000, 1000, 1000.5, 1001, 1001.5, 1002, 1002.5, 1003],
      times
    );
    assert.equal(rising.direction, "rising");
    assert.equal(rising.interpretation, "Clearing");

    const falling = calculatePressureTrend(
      [1005, 1005, 1004.5, 1004, 1003.5, 1003, 1002.5, 1002],
      times
    );
    assert.equal(falling.direction, "falling");
    assert.equal(falling.interpretation, "Storm possible");

    const steady = calculatePressureTrend(
      [1000, 1000, 1000.2, 1000.4, 1000.5, 1000.4, 1000.5, 1000.4],
      times
    );
    assert.equal(steady.direction, "steady");
    assert.equal(steady.interpretation, "Stable");
  });

  test("calculatePressureTrend returns defaults for invalid input", () => {
    const empty = calculatePressureTrend([], []);
    assert.deepEqual(empty, {
      current: null,
      delta: 0,
      direction: "steady",
      interpretation: "No data",
      sparkline: [],
    });
  });

  test("calculatePressureTrend filters null slots without counting them as 0 hPa", () => {
    const times = buildHourlyIsoTimes(4, 0);
    const result = calculatePressureTrend([null, null, 1010, 1012], times);
    assert.ok(result.sparkline.every((v) => v !== 0), "null slots must not appear as 0 hPa");
    assert.ok(result.sparkline.length > 0, "valid readings should still produce a sparkline");
  });

  test("classifyComfort handles F/C input and invalid values", () => {
    assert.equal(classifyComfort(45, "F").level, "Dry");
    assert.equal(classifyComfort(10, "C").level, "Comfortable");
    assert.equal(classifyComfort(20, "C").level, "Humid");
    assert.equal(classifyComfort("bad", "F").level, "Unknown");
  });

  test("windDirectionName maps headings and handles invalid values", () => {
    assert.equal(windDirectionName(0), "N");
    assert.equal(windDirectionName(45), "NE");
    assert.equal(windDirectionName(225), "SW");
    assert.equal(windDirectionName("bad"), "Variable");
    assert.equal(windDirectionName(null), "Variable");
    assert.equal(windDirectionName(undefined), "Variable");
  });

  test("classifyWind uses mph thresholds and unit conversion", () => {
    assert.equal(classifyWind(2, "F"), "Calm");
    assert.equal(classifyWind(10, "F"), "Light breeze");
    assert.equal(classifyWind(16.0934, "C"), "Light breeze");
    assert.equal(classifyWind("bad", "F"), "Unknown");
    assert.equal(classifyWind(null, "F"), "Unknown");
    assert.equal(classifyWind(undefined, "F"), "Unknown");
  });
});
