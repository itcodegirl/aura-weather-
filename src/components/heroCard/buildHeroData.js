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
import {
  formatSunClock,
  formatDaylightLengthLabel,
} from "../../utils/sunlight.js";

const FALLBACK_LOCATION_NAME = "Current location";
const FALLBACK_DATE_LABEL = "today";
const DEFAULT_SAMPLE_YEARS = 30;

function trimString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pickLocationName(location) {
  return trimString(location?.name) || FALLBACK_LOCATION_NAME;
}

function pickLocationCountry(location) {
  return trimString(location?.country);
}

function todayLocaleString(now = new Date()) {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

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

  const sampleYears = toFiniteNumber(climateComparison.sampleYears);
  const climateSource = `${sampleYears ?? DEFAULT_SAMPLE_YEARS}-year`;
  const climateDate =
    trimString(climateComparison.referenceDateLabel) || FALLBACK_DATE_LABEL;
  const climateLocation = locationName || "this location";
  const tempUnit = unit === "C" ? "°C" : "°F";

  const direction =
    climateDelta > 0 ? "warmer" : climateDelta < 0 ? "colder" : "about the same";

  if (direction === "about the same") {
    return {
      hasClimateComparison: true,
      climateMessage: `Today is about the same as the ${climateSource} average for ${climateDate} in ${climateLocation}, from the Open-Meteo historical archive.`,
    };
  }

  // Convert the absolute delta into the user's chosen unit. The raw
  // delta is in Fahrenheit (always); the visible delta should match
  // whatever °F/°C they have selected.
  const absDelta = Math.abs(climateDelta);
  const convertedDelta = unit === "C" ? (absDelta * 5) / 9 : absDelta;
  const climateDeltaDisplay = String(Math.round(convertedDelta));

  return {
    hasClimateComparison: true,
    climateMessage: `Today is ${climateDeltaDisplay}${tempUnit} ${direction} than the ${climateSource} average for ${climateDate} in ${climateLocation}, from the Open-Meteo historical archive.`,
  };
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

  const { hasClimateComparison, climateMessage } = buildClimateMessage({
    climateComparison,
    unit,
    locationName: safeLocationName,
  });

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
    hasClimateComparison,
    climateMessage,
    today: todayLocaleString(),
  };
}
