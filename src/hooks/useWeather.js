// src/hooks/useWeather.js

import { useState, useEffect, useCallback } from "react";
import {
  fetchWeather,
  fetchAirQuality,
  reverseGeocode,
} from "../services/weatherApi";

// Chicago fallback — Aura's default when geolocation isn't available
const DEFAULT_LOCATION = {
  lat: 41.8781,
  lon: -87.6298,
  name: "Chicago",
  country: "United States",
};

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core fetch function — reusable for any lat/lon
  const loadWeather = useCallback(async (lat, lon, name, country) => {
    setLoading(true);
    setError(null);
    try {
      const [weatherData, aqi] = await Promise.all([
        fetchWeather(lat, lon),
        fetchAirQuality(lat, lon),
      ]);
      setWeather({ ...weatherData, aqi });
      setLocation({ lat, lon, name, country });
    } catch (err) {
      setError(err.message || "Could not load weather");
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: try geolocation, fall back to Chicago
  useEffect(() => {
    // Hard safety net — if geolocation hangs silently, fall back after 6s
    const fallbackTimer = setTimeout(() => {
      loadWeather(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon,
        DEFAULT_LOCATION.name,
        DEFAULT_LOCATION.country
      );
    }, 6000);

    if (!navigator.geolocation) {
      clearTimeout(fallbackTimer);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- idiomatic mount-time data fetch; no user event to respond to
      loadWeather(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon,
        DEFAULT_LOCATION.name,
        DEFAULT_LOCATION.country
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(fallbackTimer);
        const { latitude, longitude } = pos.coords;
        const place = await reverseGeocode(latitude, longitude);
        loadWeather(
          latitude,
          longitude,
          place?.name || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
          place?.country || ""
        );
      },
      () => {
        clearTimeout(fallbackTimer);
        // User denied geolocation — use fallback
        loadWeather(
          DEFAULT_LOCATION.lat,
          DEFAULT_LOCATION.lon,
          DEFAULT_LOCATION.name,
          DEFAULT_LOCATION.country
        );
      },
      { timeout: 5000 }
    );

    return () => clearTimeout(fallbackTimer);
  }, [loadWeather]);

  return { weather, location, loading, error, loadWeather };
}
