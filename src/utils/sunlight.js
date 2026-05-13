import { toFiniteNumber } from "./numbers.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function toValidDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatSunClock(value, options = {}) {
  const { fallback = "\u2014", maxFutureDays } = options;
  const date = toValidDate(value);
  if (!date) {
    return fallback;
  }

  // Strict coercion: a null/undefined/boolean/array maxFutureDays must be
  // treated as "no limit", not silently coerced (Number(null) === 0 would
  // block every future date, Number(true) === 1 would cap at 1 day).
  const maxFutureDaysNumber = toFiniteNumber(maxFutureDays);
  if (maxFutureDaysNumber !== null && maxFutureDaysNumber >= 0) {
    const maxAllowedTime = Date.now() + maxFutureDaysNumber * DAY_MS;
    if (date.getTime() > maxAllowedTime) {
      return fallback;
    }
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/*
 * Returns "sunrise" or "sunset" if the current moment falls within
 * +/- toleranceMinutes of the given sunrise / sunset timestamp; null
 * otherwise. Used by HeroCard to apply an earned warm wash that only
 * surfaces during the actual golden-hour windows of the day —
 * deliberately quiet during the rest.
 */
export function getSunlightPhase(sunrise, sunset, nowMs, options = {}) {
  const { toleranceMinutes = 30 } = options;
  const tolerance = toFiniteNumber(toleranceMinutes);
  if (tolerance === null || tolerance <= 0) {
    return null;
  }

  const now = toFiniteNumber(nowMs);
  if (now === null) {
    return null;
  }

  const toleranceMs = tolerance * 60_000;

  const sunriseDate = toValidDate(sunrise);
  if (sunriseDate && Math.abs(now - sunriseDate.getTime()) <= toleranceMs) {
    return "sunrise";
  }

  const sunsetDate = toValidDate(sunset);
  if (sunsetDate && Math.abs(now - sunsetDate.getTime()) <= toleranceMs) {
    return "sunset";
  }

  return null;
}

export function formatDaylightLengthLabel(
  sunrise,
  sunset,
  options = {}
) {
  const { fallback = null } = options;
  const sunriseDate = toValidDate(sunrise);
  const sunsetDate = toValidDate(sunset);
  if (!sunriseDate || !sunsetDate) {
    return fallback;
  }

  let diffMs = sunsetDate.getTime() - sunriseDate.getTime();
  if (diffMs <= 0) {
    diffMs += DAY_MS;
  }

  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${String(minutes).padStart(2, "0")} min`;
}
