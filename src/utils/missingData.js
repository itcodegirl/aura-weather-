import { toFiniteNumber as toStrictFiniteNumber } from "./numbers.js";

export const MISSING_VALUE_DASH = "—";
export const MISSING_VALUE_LABEL = "Data unavailable";

// Delegate to the canonical strict helper. The previous local copy
// allowed booleans and objects through, which silently masked shape
// mismatches in upstream API payloads.
export function toFiniteNumber(value, fallback = null) {
  const numeric = toStrictFiniteNumber(value);
  return numeric === null ? fallback : numeric;
}

export function hasFiniteValue(value) {
  return toStrictFiniteNumber(value) !== null;
}

export function formatMissingValue({ unavailable = false } = {}) {
  return unavailable ? MISSING_VALUE_LABEL : MISSING_VALUE_DASH;
}
