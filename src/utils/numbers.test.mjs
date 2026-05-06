import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { toFiniteNumber, hasFiniteValue } from "./numbers.js";

describe("toFiniteNumber", () => {
  test("returns finite numbers as-is", () => {
    assert.equal(toFiniteNumber(42), 42);
    assert.equal(toFiniteNumber(-3.14), -3.14);
    assert.equal(toFiniteNumber(0), 0);
  });

  test("parses numeric strings", () => {
    assert.equal(toFiniteNumber("42"), 42);
    assert.equal(toFiniteNumber("-3.14"), -3.14);
    assert.equal(toFiniteNumber("0"), 0);
  });

  test("rejects null and undefined explicitly", () => {
    // The whole point of this helper: Number(null) is 0, which would
    // surface as a fake 0°F reading. The helper must return null.
    assert.equal(toFiniteNumber(null), null);
    assert.equal(toFiniteNumber(undefined), null);
  });

  test("rejects empty and whitespace-only strings", () => {
    assert.equal(toFiniteNumber(""), null);
    assert.equal(toFiniteNumber("   "), null);
  });

  test("rejects booleans", () => {
    // Number(true) is 1 and Number(false) is 0; neither is meaningful
    // weather data and we don't want them silently coerced.
    assert.equal(toFiniteNumber(true), null);
    assert.equal(toFiniteNumber(false), null);
  });

  test("rejects non-numeric strings", () => {
    assert.equal(toFiniteNumber("not a number"), null);
    assert.equal(toFiniteNumber("65.5°F"), null);
  });

  test("rejects NaN and Infinity", () => {
    assert.equal(toFiniteNumber(NaN), null);
    assert.equal(toFiniteNumber(Infinity), null);
    assert.equal(toFiniteNumber(-Infinity), null);
  });

  test("rejects objects and arrays", () => {
    assert.equal(toFiniteNumber({}), null);
    assert.equal(toFiniteNumber([]), null);
    assert.equal(toFiniteNumber([42]), null);
  });
});

describe("hasFiniteValue", () => {
  test("returns true for finite numbers and numeric strings", () => {
    assert.equal(hasFiniteValue(0), true);
    assert.equal(hasFiniteValue(42), true);
    assert.equal(hasFiniteValue(-3.14), true);
    assert.equal(hasFiniteValue("12"), true);
  });

  test("returns false for the same inputs toFiniteNumber rejects", () => {
    assert.equal(hasFiniteValue(null), false);
    assert.equal(hasFiniteValue(undefined), false);
    assert.equal(hasFiniteValue(""), false);
    assert.equal(hasFiniteValue("nope"), false);
    assert.equal(hasFiniteValue(true), false);
    assert.equal(hasFiniteValue(NaN), false);
    assert.equal(hasFiniteValue(Infinity), false);
    assert.equal(hasFiniteValue({}), false);
  });
});
