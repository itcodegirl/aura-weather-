import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeTemperatureUnit, parseCoordinates } from "../utils/weatherUnits";

export const DEFAULT_LOCATION = {
  lat: 41.8781,
  lon: -87.6298,
  name: "Chicago",
  country: "United States",
};
export const LOCATION_FALLBACK_NOTICE =
  "Location not available \u2014 showing Chicago";
export const SAVED_LOCATION_NOTICE = "Showing your previously selected location";
const LAST_LOCATION_KEY = "aura-weather-last-location";
const LAST_LOCATION_TTL_DAYS = 30;
const GEOLOCATION_TIMEOUT_MS = 5000;
export const LOCATION_FALLBACK_DELAY_MS = GEOLOCATION_TIMEOUT_MS + 1000;

export function normalizeLocationName(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function hasValidLastLocationTimestamp(saved) {
  if (!saved?.updatedAt) {
    return false;
  }
  const savedTime = Date.parse(saved.updatedAt);
  if (!Number.isFinite(savedTime)) {
    return false;
  }

  const ageMs = Date.now() - savedTime;
  const maxAgeMs = LAST_LOCATION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

function hasGeolocationSupport() {
  return (
    typeof navigator !== "undefined" &&
    navigator &&
    typeof navigator.geolocation !== "undefined" &&
    navigator.geolocation !== null &&
    typeof navigator.geolocation.getCurrentPosition === "function"
  );
}

export function useLocation(unit = "F") {
  const [location, setLocation] = useState(null);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
  const isMountedRef = useRef(false);
  const activeUnitRef = useRef(normalizeTemperatureUnit(unit));

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeUnitRef.current = normalizeTemperatureUnit(unit);
  }, [unit]);

  const getPersistedLocation = useCallback(() => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const saved = window.localStorage.getItem(LAST_LOCATION_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      if (!hasValidLastLocationTimestamp(parsed)) {
        window.localStorage.removeItem(LAST_LOCATION_KEY);
        return null;
      }

      const coordinates = parseCoordinates(parsed?.lat, parsed?.lon);
      if (!coordinates) {
        window.localStorage.removeItem(LAST_LOCATION_KEY);
        return null;
      }

      return {
        lat: coordinates.latitude,
        lon: coordinates.longitude,
        name: normalizeLocationName(parsed?.name, DEFAULT_LOCATION.name),
        country: normalizeLocationName(parsed?.country, DEFAULT_LOCATION.country),
      };
    } catch {
      try {
        window.localStorage.removeItem(LAST_LOCATION_KEY);
      } catch {
        // localStorage may be unavailable or inaccessible in restricted contexts.
      }
      return null;
    }
  }, []);

  const persistLocation = useCallback((lat, lon, name, country) => {
    const coordinates = parseCoordinates(lat, lon);
    if (!coordinates) return;
    const normalizedName = normalizeLocationName(name, DEFAULT_LOCATION.name);
    const normalizedCountry = normalizeLocationName(
      country,
      DEFAULT_LOCATION.country
    );

    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify({
          lat: coordinates.latitude,
          lon: coordinates.longitude,
          name: normalizedName,
          country: normalizedCountry,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // localStorage may be unavailable in restricted contexts.
    }
  }, []);

  const requestCurrentPositionWithFallback = useCallback((requestOptions = {}) => {
    const normalizedOptions =
      requestOptions && typeof requestOptions === "object"
        ? requestOptions
        : {};
    const {
      requestUnit = activeUnitRef.current,
      fallbackNotice = LOCATION_FALLBACK_NOTICE,
      onSuccess,
      onFallback,
      trackCurrentLookup = false,
    } = normalizedOptions;
    const normalizedRequestUnit = normalizeTemperatureUnit(requestUnit);
    const finishLookup = () => {
      if (!trackCurrentLookup || !isMountedRef.current) {
        return;
      }
      setIsLocatingCurrent(false);
    };
    const finalizeLookup = (handler, ...args) => {
      try {
        handler?.(...args);
      } finally {
        finishLookup();
      }
    };

    if (!hasGeolocationSupport()) {
      finalizeLookup(onFallback, normalizedRequestUnit, fallbackNotice);
      return;
    }

    if (trackCurrentLookup) {
      setIsLocatingCurrent(true);
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMountedRef.current) {
            return;
          }

          const coordinates = parseCoordinates(
            position?.coords?.latitude,
            position?.coords?.longitude
          );
          if (!coordinates) {
            finalizeLookup(onFallback, normalizedRequestUnit, fallbackNotice);
            return;
          }

          finalizeLookup(onSuccess, coordinates, normalizedRequestUnit);
        },
        () => {
          if (!isMountedRef.current) {
            return;
          }
          finalizeLookup(onFallback, normalizedRequestUnit, fallbackNotice);
        },
        { timeout: GEOLOCATION_TIMEOUT_MS }
      );
    } catch {
      if (!isMountedRef.current) {
        finishLookup();
        return;
      }
      finalizeLookup(onFallback, normalizedRequestUnit, fallbackNotice);
    }
  }, []);

  return {
    location,
    setLocation,
    isLocatingCurrent,
    getPersistedLocation,
    persistLocation,
    requestCurrentPositionWithFallback,
  };
}

