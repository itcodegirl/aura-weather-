import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { formatSunClock, formatDaylightLengthLabel } from "./sunlight.js";

describe("sunlight formatting utils", () => {
  test("formats a valid sunrise timestamp", () => {
    const label = formatSunClock("2026-04-21T06:15:00Z");
    assert.notEqual(label, "\u2014");
  });

  test("returns fallback for invalid timestamp", () => {
    assert.equal(formatSunClock("not-a-time"), "\u2014");
  });

  test("returns fallback when timestamp exceeds max future days", () => {
    const farFuture = "2099-01-01T08:00:00Z";
    const label = formatSunClock(farFuture, { maxFutureDays: 10 });
    assert.equal(label, "\u2014");
  });

  test("formats daylight duration from sunrise and sunset", () => {
    const daylight = formatDaylightLengthLabel(
      "2026-04-21T06:00:00Z",
      "2026-04-21T18:30:00Z"
    );
    assert.equal(daylight, "12 hr 30 min");
  });

  test("returns custom fallback for invalid daylight input", () => {
    const daylight = formatDaylightLengthLabel(null, "2026-04-21T18:30:00Z", {
      fallback: "unavailable",
    });
    assert.equal(daylight, "unavailable");
  });
});
