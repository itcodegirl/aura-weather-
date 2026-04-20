import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { formatDayLabel, formatShortDate, parseLocalDate } from "./dates.js";

function toIsoLocalDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("dates utils", () => {
  test("parseLocalDate parses valid ISO date at local midnight", () => {
    const parsed = parseLocalDate("2026-04-20");
    assert.ok(parsed instanceof Date);
    assert.equal(parsed.getHours(), 0);
    assert.equal(parsed.getMinutes(), 0);
  });

  test("parseLocalDate returns null for invalid input", () => {
    assert.equal(parseLocalDate(""), null);
    assert.equal(parseLocalDate("2026/04/20"), null);
    assert.equal(parseLocalDate("not-a-date"), null);
  });

  test("formatDayLabel returns Today and Tomorrow where expected", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    assert.equal(formatDayLabel(toIsoLocalDate(today)), "Today");
    assert.equal(formatDayLabel(toIsoLocalDate(tomorrow)), "Tomorrow");
  });

  test("formatDayLabel and formatShortDate return fallback for invalid values", () => {
    assert.equal(formatDayLabel("bad-input"), "\u2014");
    assert.equal(formatShortDate("bad-input"), "\u2014");
  });

  test("formatShortDate matches locale short month/day output", () => {
    const target = new Date();
    target.setDate(target.getDate() + 3);
    target.setHours(0, 0, 0, 0);
    const iso = toIsoLocalDate(target);

    const expected = target.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    assert.equal(formatShortDate(iso), expected);
  });
});
