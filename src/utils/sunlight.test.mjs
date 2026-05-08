import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  formatSunClock,
  formatDaylightLengthLabel,
  getSunlightPhase,
} from "./sunlight.js";

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

  test("treats null maxFutureDays as 'no limit' instead of Number(null) === 0", () => {
    // Guard against the Number(null) === 0 trap: a null maxFutureDays
    // should mean "no future-day cap", not "cap at zero days from now"
    // (which would block every future timestamp).
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const label = formatSunClock(tomorrow, { maxFutureDays: null });
    assert.notEqual(label, "\u2014");
  });

  test("ignores boolean maxFutureDays instead of coercing true to 1", () => {
    // Number(true) === 1 would cap at 1 day; toFiniteNumber rejects it
    // so the helper falls through to the unbounded path.
    const farFuture = "2099-01-01T08:00:00Z";
    const label = formatSunClock(farFuture, { maxFutureDays: true });
    assert.notEqual(label, "\u2014");
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

  test("getSunlightPhase returns sunrise within 30 min of sunrise", () => {
    const sunrise = Date.UTC(2026, 3, 21, 11, 0, 0);
    const sunset = Date.UTC(2026, 3, 21, 23, 0, 0);
    const tenMinutesAfterSunrise = sunrise + 10 * 60_000;
    assert.equal(
      getSunlightPhase(sunrise, sunset, tenMinutesAfterSunrise),
      "sunrise"
    );
    assert.equal(
      getSunlightPhase(sunrise, sunset, sunrise - 25 * 60_000),
      "sunrise"
    );
  });

  test("getSunlightPhase returns sunset within 30 min of sunset", () => {
    const sunrise = Date.UTC(2026, 3, 21, 11, 0, 0);
    const sunset = Date.UTC(2026, 3, 21, 23, 0, 0);
    assert.equal(
      getSunlightPhase(sunrise, sunset, sunset + 5 * 60_000),
      "sunset"
    );
  });

  test("getSunlightPhase returns null mid-day and mid-night", () => {
    const sunrise = Date.UTC(2026, 3, 21, 11, 0, 0);
    const sunset = Date.UTC(2026, 3, 21, 23, 0, 0);
    assert.equal(
      getSunlightPhase(sunrise, sunset, Date.UTC(2026, 3, 21, 17, 0, 0)),
      null
    );
    assert.equal(
      getSunlightPhase(sunrise, sunset, Date.UTC(2026, 3, 21, 4, 0, 0)),
      null
    );
  });

  test("getSunlightPhase rejects invalid inputs gracefully", () => {
    assert.equal(getSunlightPhase(null, null, Date.now()), null);
    assert.equal(getSunlightPhase("oops", "oops", Date.now()), null);
    assert.equal(
      getSunlightPhase("2026-04-21T11:00:00Z", "2026-04-21T23:00:00Z", null),
      null
    );
  });
});
