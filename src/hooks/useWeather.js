// src/hooks/useWeather.js

import { useState, useEffect, useCallback } from "react";
import { fetchWeather, fetchAirQuality } from "../services/weatherApi";

const DEFAULT_LOCATION = {
  lat: 41.8781,
  lon: -87.6298,
  name: "Chicago",
  country: "United States",
};
const LOCATION_FALLBACK_NOTICE = "Location not available \u2014 showing Chicago";

function getFallbackLocationName(weatherData, lat, lon) {
  const timezoneCity = weatherData?.timezone?.split("/").at(-1)?.replace(/_/g, " ");
  return timezoneCity || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}

export function useWeather(unit = "F") {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [locationNotice, setLocationNotice] = useState(null);

  const loadWeather = useCallback(
    async (
      lat,
      lon,
      name,
      country,
      requestUnit = unit,
      options = {}
    ) => {
      const { fallbackNotice } = options;

      setLoading(true);
      setError(null);
      setLocationNotice(fallbackNotice || null);
      setLastRequest({ lat, lon, name, country, unit: requestUnit });

      try {
        const [weatherData, aqi] = await Promise.all([
          fetchWeather(lat, lon, requestUnit),
          fetchAirQuality(lat, lon),
        ]);

        const resolvedName = name || getFallbackLocationName(weatherData, lat, lon);

        setWeather({ ...weatherData, aqi });
        setLocation({
          lat,
          lon,
          name: resolvedName,
          country: country || "",
        });
      } catch (err) {
        setError(err.message || "Could not load weather");
      } finally {
        setLoading(false);
      }
    },
    [unit]
  );

  const scheduleWeatherLoad = useCallback(
    (lat, lon, name, country, requestUnit = unit, options = {}) => {
      queueMicrotask(() => {
        loadWeather(lat, lon, name, country, requestUnit, options);
      });
    },
    [loadWeather, unit]
  );

  const retryWeather = useCallback(() => {
    const fallbackRequest = lastRequest
      ? lastRequest
      : DEFAULT_LOCATION;

    loadWeather(
      fallbackRequest.lat,
      fallbackRequest.lon,
      fallbackRequest.name,
      fallbackRequest.country,
      fallbackRequest.unit || unit
    );
  }, [lastRequest, loadWeather, unit]);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      scheduleWeatherLoad(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon,
        DEFAULT_LOCATION.name,
        DEFAULT_LOCATION.country,
        unit,
        { fallbackNotice: LOCATION_FALLBACK_NOTICE }
      );
    }, 6000);

    if (!navigator.geolocation) {
      clearTimeout(fallbackTimer);
      scheduleWeatherLoad(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon,
        DEFAULT_LOCATION.name,
        DEFAULT_LOCATION.country,
        unit,
        { fallbackNotice: LOCATION_FALLBACK_NOTICE }
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(fallbackTimer);
        const { latitude, longitude } = pos.coords;
        scheduleWeatherLoad(latitude, longitude, undefined, undefined, unit);
      },
      () => {
        clearTimeout(fallbackTimer);
        scheduleWeatherLoad(
          DEFAULT_LOCATION.lat,
          DEFAULT_LOCATION.lon,
          DEFAULT_LOCATION.name,
          DEFAULT_LOCATION.country,
          unit,
          { fallbackNotice: LOCATION_FALLBACK_NOTICE }
        );
      },
      { timeout: 5000 }
    );

    return () => clearTimeout(fallbackTimer);
  }, [loadWeather, unit]);

  useEffect(() => {
    if (!location) return;

    scheduleWeatherLoad(
      location.lat,
      location.lon,
      location.name,
      location.country,
      unit
    );
  }, [
    unit,
    location?.lat,
    location?.lon,
    location?.name,
    location?.country,
    scheduleWeatherLoad,
  ]);

  return {
    weather,
    location,
    loading,
    error,
    locationNotice,
    loadWeather,
    retryWeather,
  };
}
