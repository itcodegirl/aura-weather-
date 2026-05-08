import { getWeather } from "../../domain/weatherCodes.js";
import {
  formatTemperatureValue,
  formatTemperatureWithUnit,
} from "../../utils/temperature.js";
import {
  isMissingPlaceholder,
  MISSING_VALUE_PLACEHOLDER,
  toFiniteNumber,
} from "../../utils/numbers.js";
import { formatWindSpeed } from "../../domain/wind.js";
import { formatPrecipitation } from "../../utils/weatherUnits.js";
import {
  formatSunClock,
  formatDaylightLengthLabel,
  getSunlightPhase,
} from "../../utils/sunlight.js";

const FALLBACK_LOCATION_NAME = "Current location";
const FALLBACK_DATE_LABEL = "today";
const DEFAULT_SAMPLE_YEARS = 30;
const RAIN_GEAR_CHANCE_THRESHOLD = 55;
const SHOWER_CHANCE_THRESHOLD = 30;
const MEANINGFUL_RAIN_AMOUNT_IN = 0.08;
const BREEZY_WIND_MPH = 18;
const GUSTY_WIND_MPH = 30;

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pickLocationName(location) {
  return trimString(location?.name) || FALLBACK_LOCATION_NAME;
}

function pickLocationCountry(location) {
  return trimString(location?.country);
}

function todayLocaleString(nowMs) {
  // Caller is responsible for passing a real timestamp. We do NOT
  // fall back to Date.now() here because this helper runs inside a
  // useMemo factory in HeroCard.jsx, and reading a mutable global
  // there would violate react-hooks/purity. The HeroCard wrapper
  // already substitutes Date.now() outside the memo when nowMs is
  // missing, then buckets it to one-minute granularity so memos
  // recompute deterministically.
  const referenceTime = toFiniteNumber(nowMs);
  if (referenceTime === null) {
    return "today";
  }
  return new Date(referenceTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Show the climate context line only when today is notably different
// from the historical norm. A 1-degree delta is statistical noise to
// most readers; surface the comparison only when the magnitude crosses
// a threshold that justifies the line.
const CLIMATE_NOTABLE_DELTA_F = 5;

function buildClimateMessage({
  climateComparison,
  unit,
  locationName,
}) {
  if (!climateComparison || typeof climateComparison !== "object") {
    return { hasClimateComparison: false, climateMessage: "" };
  }

  const climateDelta = toFiniteNumber(climateComparison.difference);
  if (climateDelta === null) {
    return { hasClimateComparison: false, climateMessage: "" };
  }

  if (Math.abs(climateDelta) < CLIMATE_NOTABLE_DELTA_F) {
    return { hasClimateComparison: false, climateMessage: "" };
  }

  const sampleYears = toFiniteNumber(climateComparison.sampleYears);
  const climateSource = `${sampleYears ?? DEFAULT_SAMPLE_YEARS}-year`;
  const climateDate =
    trimString(climateComparison.referenceDateLabel) || FALLBACK_DATE_LABEL;
  const climateLocation = locationName || "this location";
  const tempUnit = unit === "C" ? "°C" : "°F";

  const direction = climateDelta > 0 ? "warmer" : "colder";

  // Convert the absolute delta into the user's chosen unit. The raw
  // delta is in Fahrenheit (always); the visible delta should match
  // whatever °F/°C they have selected.
  const absDelta = Math.abs(climateDelta);
  const convertedDelta = unit === "C" ? (absDelta * 5) / 9 : absDelta;
  const climateDeltaDisplay = String(Math.round(convertedDelta));

  return {
    hasClimateComparison: true,
    climateMessage: `Today is ${climateDeltaDisplay}${tempUnit} ${direction} than the ${climateSource} average for ${climateDate} in ${climateLocation}.`,
  };
}

function formatPercent(value) {
  const numeric = toFiniteNumber(value);
  return numeric === null ? "" : `${Math.round(numeric)}%`;
}

function buildRainGuidance(weather) {
  const chance = toFiniteNumber(weather?.daily?.rainChanceMax?.[0]);
  const amount = toFiniteNumber(weather?.daily?.rainAmountTotal?.[0]);
  const chanceLabel = formatPercent(chance);
  const amountLabel = formatPrecipitation(amount, "F", "F");

  if (chance === null && amount === null) {
    return {
      kind: "rain",
      tone: "unavailable",
      label: "Rain",
      value: "Guidance unavailable",
      detail: "Precipitation data did not return",
    };
  }

  if (
    (chance !== null && chance >= RAIN_GEAR_CHANCE_THRESHOLD) ||
    (amount !== null && amount >= MEANINGFUL_RAIN_AMOUNT_IN)
  ) {
    return {
      kind: "rain",
      tone: "watch",
      label: "Rain",
      value: "Bring rain gear",
      detail: chanceLabel
        ? `${chanceLabel} peak chance today`
        : `${amountLabel} expected today`,
    };
  }

  if (
    (chance !== null && chance >= SHOWER_CHANCE_THRESHOLD) ||
    (amount !== null && amount > 0)
  ) {
    return {
      kind: "rain",
      tone: "notice",
      label: "Rain",
      value: "Possible showers",
      detail: chanceLabel
        ? `${chanceLabel} peak chance today`
        : `${amountLabel} expected today`,
    };
  }

  return {
    kind: "rain",
    tone: "calm",
    label: "Rain",
    value: "Dry window",
    detail: chanceLabel ? `${chanceLabel} peak chance today` : "Low rain signal",
  };
}

function buildUvGuidance(weather) {
  const uvIndex = toFiniteNumber(weather?.daily?.uvIndexMax?.[0]);

  if (uvIndex === null) {
    return {
      kind: "uv",
      tone: "unavailable",
      label: "UV",
      value: "UV unavailable",
      detail: "Sun exposure data did not return",
    };
  }

  const uvLabel = `Peak UV ${uvIndex.toFixed(1)}`;
  if (uvIndex >= 8) {
    return {
      kind: "uv",
      tone: "watch",
      label: "UV",
      value: "Very high exposure",
      detail: uvLabel,
    };
  }

  if (uvIndex >= 6) {
    return {
      kind: "uv",
      tone: "notice",
      label: "UV",
      value: "Use sun protection",
      detail: uvLabel,
    };
  }

  if (uvIndex >= 3) {
    return {
      kind: "uv",
      tone: "notice",
      label: "UV",
      value: "Moderate exposure",
      detail: uvLabel,
    };
  }

  return {
    kind: "uv",
    tone: "calm",
    label: "UV",
    value: "Low exposure",
    detail: uvLabel,
  };
}

function buildWindGuidance(weather, unit) {
  const windSpeed = toFiniteNumber(weather?.current?.windSpeed);
  const windGust = toFiniteNumber(weather?.current?.windGust);
  const strongestWind = Math.max(windSpeed ?? 0, windGust ?? 0);

  if (windSpeed === null && windGust === null) {
    return {
      kind: "wind",
      tone: "unavailable",
      label: "Wind",
      value: "Wind unavailable",
      detail: "Surface wind data did not return",
    };
  }

  if (strongestWind >= GUSTY_WIND_MPH) {
    return {
      kind: "wind",
      tone: "watch",
      label: "Wind",
      value: "Gusty conditions",
      detail: `Gusts ${formatWindSpeed(strongestWind, unit)}`,
    };
  }

  if (strongestWind >= BREEZY_WIND_MPH) {
    return {
      kind: "wind",
      tone: "notice",
      label: "Wind",
      value: "Breezy",
      detail: `Up to ${formatWindSpeed(strongestWind, unit)}`,
    };
  }

  return {
    kind: "wind",
    tone: "calm",
    label: "Wind",
    value: "Comfortable wind",
    detail: `Up to ${formatWindSpeed(strongestWind, unit)}`,
  };
}

function buildDailyGuidance(weather, unit) {
  return [
    buildRainGuidance(weather),
    buildUvGuidance(weather),
    buildWindGuidance(weather, unit),
  ];
}

/**
 * Pure data shaping for HeroCard. Returns the full set of display
 * strings the component needs, or null when the inputs cannot
 * support a render. The returned object is plain data (no closures)
 * so it is safe to memo and easy to unit-test.
 */
export function buildHeroData({
  weather,
  location,
  unit,
  climateComparison,
  nowMs,
} = {}) {
  if (!weather?.current || !location) {
    return null;
  }

  const current = weather.current;
  const safeLocationName = pickLocationName(location);
  const safeLocationCountry = pickLocationCountry(location);
  const info = getWeather(current.conditionCode);
  const tempUnit = unit === "C" ? "°C" : "°F";

  const currentTempDisplay = formatTemperatureValue(current.temperature, unit);
  const feelsLikeDisplay = formatTemperatureWithUnit(current.feelsLike, unit);
  const dewPointDisplay = formatTemperatureWithUnit(current.dewPoint, unit);
  const todayHighDisplay = formatTemperatureWithUnit(
    weather?.daily?.temperatureMax?.[0],
    unit
  );
  const todayLowDisplay = formatTemperatureWithUnit(
    weather?.daily?.temperatureMin?.[0],
    unit
  );

  const windDisplay = formatWindSpeed(current.windSpeed, unit);

  const humidityValue = toFiniteNumber(current.humidity);
  const humidityDisplay =
    humidityValue === null
      ? MISSING_VALUE_PLACEHOLDER
      : `${Math.round(humidityValue)}%`;
  const pressureValue = toFiniteNumber(current.pressure);
  const pressureDisplay =
    pressureValue === null
      ? MISSING_VALUE_PLACEHOLDER
      : `${Math.round(pressureValue)} hPa`;

  const sunriseValue = weather?.daily?.sunrise?.[0] ?? "";
  const sunsetValue = weather?.daily?.sunset?.[0] ?? "";
  const sunriseLabel = formatSunClock(sunriseValue);
  const sunsetLabel = formatSunClock(sunsetValue);
  const daylightLabel = formatDaylightLengthLabel(sunriseValue, sunsetValue, {
    fallback: MISSING_VALUE_PLACEHOLDER,
  });
  const sunlightPhase = getSunlightPhase(sunriseValue, sunsetValue, nowMs);

  const { hasClimateComparison, climateMessage } = buildClimateMessage({
    climateComparison,
    unit,
    locationName: safeLocationName,
  });
  const dailyGuidance = buildDailyGuidance(weather, unit);

  const isCurrentTempMissing = isMissingPlaceholder(currentTempDisplay);
  const heroStatsHaveAnyMissing = [
    humidityDisplay,
    pressureDisplay,
    dewPointDisplay,
    windDisplay,
  ].some((value) => isMissingPlaceholder(value));

  return {
    current,
    info,
    tempUnit,
    safeLocationName,
    safeLocationCountry,
    currentTempDisplay,
    isCurrentTempMissing,
    feelsLikeDisplay,
    dewPointDisplay,
    todayHighDisplay,
    todayLowDisplay,
    windDisplay,
    humidityDisplay,
    pressureDisplay,
    heroStatsHaveAnyMissing,
    sunriseValue,
    sunsetValue,
    sunriseLabel,
    sunsetLabel,
    daylightLabel,
    sunlightPhase,
    hasClimateComparison,
    climateMessage,
    dailyGuidance,
    today: todayLocaleString(nowMs),
  };
}
