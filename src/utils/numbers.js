/**
 * The single em-dash glyph the dashboard uses everywhere a value is
 * intentionally missing. Centralised so any consumer that needs to
 * detect or render the placeholder references one constant instead of
 * a literal "—" sprinkled across components.
 */
export const MISSING_VALUE_PLACEHOLDER = "—";

/**
 * Returns true when `value` matches the missing placeholder. Tolerates
 * surrounding whitespace.
 */
export function isMissingPlaceholder(value) {
  return (
    typeof value === "string" &&
    value.trim() === MISSING_VALUE_PLACEHOLDER
  );
}

/**
 * Strict numeric coercion used at API and domain boundaries.
 *
 * Plain Number() coercion treats null, undefined, "" and false as 0,
 * which silently turns missing fields into valid-looking 0°F / 0% / 0 hPa
 * readings throughout the dashboard. toFiniteNumber rejects those
 * inputs explicitly and only returns numbers that arrived as a real
 * number, numeric string, or numeric primitive.
 *
 * Returns the parsed number on success or null otherwise.
 */
export function toFiniteNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && value.trim() === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return null;
  }
  if (typeof value === "object") {
    // Arrays and objects coerce in surprising ways (Number([]) === 0,
    // Number([42]) === 42). Reject them so accidental shape mismatches
    // surface as missing data instead of fake readings.
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/**
 * Boolean predicate built on toFiniteNumber. Useful at render sites
 * that branch on "is this a real reading" without needing the value.
 */
export function hasFiniteValue(value) {
  return toFiniteNumber(value) !== null;
}
