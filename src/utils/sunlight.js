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

  const maxFutureDaysNumber = Number(maxFutureDays);
  if (Number.isFinite(maxFutureDaysNumber) && maxFutureDaysNumber >= 0) {
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
