// src/services/weatherApi.js
// Backward-compatible facade while API modules migrate to src/api/.

export {
  fetchWeather,
  fetchHistoricalTemperatureAverage,
  fetchAirQuality,
  geocodeCity,
} from "../api/openMeteo.js";

export { normalizeTimeZone, normalizeWeatherResponse } from "../api/transforms.js";
