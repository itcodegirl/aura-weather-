// src/hooks/useWeather.js

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchWeather,
  fetchAirQuality,
  fetchHistoricalTemperatureAverage,
} from "../services/weatherApi";
import {
  getApiTemperatureUnit,
  getApiWindSpeedUnit,
  getApiPrecipUnit,
  normalizeTemperatureUnit,
  parseCoordinates,
} from "../utils/weatherUnits";

const DEFAULT_LOCATION = {
  lat: 41.8781,
  lon: -87.6298,
  name: "Chicago",
  country: "United States",
};
const LOCATION_FALLBACK_NOTICE =
  "Location not available \u2014 showing Chicago";
const LAST_LOCATION_KEY = "aura-weather-last-location";
const SAVED_LOCATION_NOTICE = "Showing your previously selected location";
const GEOLOCATION_TIMEOUT_MS = 5000;
const LOCATION_FALLBACK_DELAY_MS = GEOLOCATION_TIMEOUT_MS + 1000;
const DEFAULT_DATA_UNIT = "F";
const DEFAULT_WIND_DATA_UNIT = "mph";
const LAST_LOCATION_TTL_DAYS = 30;

function scheduleTask(callback) {
  if (typeof callback !== "function") return;
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  Promise.resolve()
    .then(callback)
    .catch(() => {
      // Keep async scheduling failures from leaking as unhandled rejections.
    });
}

function normalizeLocationName(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function getErrorMessage(error, fallback) {
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (error && typeof error === "object") {
    const maybeMessage = error.message;
    if (typeof maybeMessage === "string") {
      const trimmed = maybeMessage.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return fallback;
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

function getPersistedLocation() {
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
}

function persistLocation(lat, lon, name, country) {
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
}

function getFallbackLocationName(weatherData, lat, lon) {
  const timezoneCity = weatherData?.meta?.timezone
    ?.split("/")
    .at(-1)
    ?.replace(/_/g, " ");
  return (
    timezoneCity ||
    `${Number(lat).toFixed(2)}\u00b0, ${Number(lon).toFixed(2)}\u00b0`
  );
}

export function useWeather(unit = "F", options = {}) {
  const { climateEnabled = true } = options;

  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [weatherDataUnit, setWeatherDataUnit] = useState(DEFAULT_DATA_UNIT);
  const [weatherWindSpeedUnit, setWeatherWindSpeedUnit] = useState(
    DEFAULT_WIND_DATA_UNIT
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationNotice, setLocationNotice] = useState(null);
  const [climateComparison, setClimateComparison] = useState(null);
  const [isLocatingCurrent, setIsLocatingCurrent] = useState(false);
  const lastRequestRef = useRef(null);
  const requestIdRef = useRef(0);
  const inFlightRequestRef = useRef(null);
  const lastRequestedSignatureRef = useRef("");
  const isMountedRef = useRef(false);
  const activeUnitRef = useRef(normalizeTemperatureUnit(unit));
  const previousUnitRef = useRef(unit);
  const previousClimateEnabledRef = useRef(climateEnabled);
  const activeLocationRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    activeUnitRef.current = normalizeTemperatureUnit(unit);
  }, [unit]);

  const abortInFlightRequest = useCallback(() => {
    if (!inFlightRequestRef.current) return;
    inFlightRequestRef.current.abort();
    inFlightRequestRef.current = null;
  }, []);

  const loadWeather = useCallback(
    async (lat, lon, name, country, requestUnit, loadOptions = {}) => {
      if (!isMountedRef.current) return;

      const coordinates = parseCoordinates(lat, lon);
      const {
        fallbackNotice,
        skipIfSignatureMatches = false,
      } = loadOptions;
      if (!coordinates) {
        setError("Invalid location coordinates");
        setLoading(false);
        return;
      }
      const { latitude: safeLat, longitude: safeLon } = coordinates;

      const requestDataUnit = normalizeTemperatureUnit(
        requestUnit ?? activeUnitRef.current
      );
      const apiTemperatureUnit = getApiTemperatureUnit(requestDataUnit);
      const requestWindSpeedUnit = getApiWindSpeedUnit(requestDataUnit);
      const requestName = normalizeLocationName(name);
      const requestCountry = normalizeLocationName(country);
      const requestId = requestIdRef.current + 1;
      const signature = `${safeLat},${safeLon},${requestDataUnit},${climateEnabled ? 1 : 0}`;
      if (
        skipIfSignatureMatches &&
        signature === lastRequestedSignatureRef.current
      ) {
        return;
      }

      requestIdRef.current = requestId;
      abortInFlightRequest();
      const controller = new AbortController();
      inFlightRequestRef.current = controller;
      lastRequestedSignatureRef.current = signature;

      if (!isMountedRef.current) return;
      setLoading(true);
      setError(null);
      setLocationNotice(fallbackNotice ?? null);
      lastRequestRef.current = {
        lat: safeLat,
        lon: safeLon,
        name: requestName,
        country: requestCountry,
        unit: requestDataUnit,
      };
      setClimateComparison(null);

      try {
        const [weatherData, aqi] = await Promise.all([
          fetchWeather(safeLat, safeLon, {
            signal: controller.signal,
            temperatureUnit: apiTemperatureUnit,
            windSpeedUnit: requestWindSpeedUnit,
            precipitationUnit: getApiPrecipUnit(requestDataUnit),
          }),
          fetchAirQuality(safeLat, safeLon, { signal: controller.signal }),
        ]);

        const historicalAverage = climateEnabled
          ? await fetchHistoricalTemperatureAverage(
              safeLat,
              safeLon,
              weatherData?.meta?.timezone,
              {
                signal: controller.signal,
                temperatureUnit: apiTemperatureUnit,
              }
            )
          : null;

        if (requestId !== requestIdRef.current) {
          return;
        }

        const resolvedName =
          requestName || getFallbackLocationName(weatherData, safeLat, safeLon);
        const normalizedName = normalizeLocationName(
          resolvedName,
          DEFAULT_LOCATION.name
        );
        const normalizedCountry = normalizeLocationName(
          requestCountry,
          DEFAULT_LOCATION.country
        );
        if (!isMountedRef.current) return;
        lastRequestRef.current = {
          lat: safeLat,
          lon: safeLon,
          name: normalizedName,
          country: normalizedCountry,
          unit: requestDataUnit,
        };
        const currentTemperature = Number(weatherData?.current?.temperature);
        const historicalTemperature = Number(
          historicalAverage?.averageTemperature
        );
        const climateDelta =
          Number.isFinite(currentTemperature) &&
          Number.isFinite(historicalTemperature)
            ? currentTemperature - historicalTemperature
            : null;

        setWeatherDataUnit(requestDataUnit);
        setWeatherWindSpeedUnit(requestWindSpeedUnit);
        setWeather({ ...weatherData, aqi });
        setLocation({
          lat: safeLat,
          lon: safeLon,
          name: normalizedName,
          country: normalizedCountry,
        });
        persistLocation(
          safeLat,
          safeLon,
          normalizedName,
          normalizedCountry
        );
        if (!isMountedRef.current) return;
        setClimateComparison(
          historicalAverage && Number.isFinite(climateDelta)
            ? {
                ...historicalAverage,
                difference: climateDelta,
                differenceUnit: requestDataUnit,
              }
            : null
        );
      } catch (error) {
        if (
          requestId === requestIdRef.current &&
          isMountedRef.current &&
          error?.name !== "AbortError"
        ) {
          setError(getErrorMessage(error, "Could not load weather"));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          if (isMountedRef.current) {
            setLoading(false);
          }
          if (inFlightRequestRef.current === controller) {
            inFlightRequestRef.current = null;
          }
        }
      }
    },
    [climateEnabled, abortInFlightRequest]
  );

  const scheduleWeatherLoad = useCallback(
    (lat, lon, name, country, requestUnit, options = {}) => {
      if (!isMountedRef.current) return;
      const normalizedRequestUnit = normalizeTemperatureUnit(
        requestUnit ?? activeUnitRef.current
      );
      loadWeather(lat, lon, name, country, normalizedRequestUnit, options);
    },
    [loadWeather]
  );

  const loadDefaultLocation = useCallback(
    (requestUnit, fallbackNotice = LOCATION_FALLBACK_NOTICE) => {
      const normalizedRequestUnit = normalizeTemperatureUnit(
        requestUnit ?? activeUnitRef.current
      );
      scheduleWeatherLoad(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon,
        DEFAULT_LOCATION.name,
        DEFAULT_LOCATION.country,
        normalizedRequestUnit,
        { fallbackNotice }
      );
    },
    [scheduleWeatherLoad]
  );

  const scheduleWeatherLoadAsync = useCallback(
    (lat, lon, name, country, requestUnit, options = {}) => {
      const normalizedRequestUnit = normalizeTemperatureUnit(
        requestUnit ?? activeUnitRef.current
      );
      scheduleTask(() => {
        scheduleWeatherLoad(
          lat,
          lon,
          name,
          country,
          normalizedRequestUnit,
          options
        );
      });
    },
    [scheduleWeatherLoad]
  );

  const requestCurrentPositionWithFallback = useCallback(
    (requestOptions = {}) => {
      const normalizedOptions =
        requestOptions && typeof requestOptions === "object"
          ? requestOptions
          : {};
      const {
        requestUnit = unit,
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
    },
    [unit]
  );

  const loadCurrentLocation = useCallback(
    (options = {}) => {
      const normalizedOptions =
        options && typeof options === "object" ? options : {};
      const requestUnit = normalizeTemperatureUnit(normalizedOptions.unit ?? unit);
      const fallbackNotice = normalizedOptions.fallbackNotice ?? LOCATION_FALLBACK_NOTICE;
      const applyFallback = () => loadDefaultLocation(requestUnit, fallbackNotice);

      requestCurrentPositionWithFallback({
        requestUnit,
        fallbackNotice,
        trackCurrentLookup: true,
        onSuccess: (position, normalizedRequestUnit) => {
          const latitude = Number(position?.latitude);
          const longitude = Number(position?.longitude);
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            applyFallback();
            return;
          }

          scheduleWeatherLoad(
            latitude,
            longitude,
            undefined,
            undefined,
            normalizedRequestUnit
          );
        },
        onFallback: () => {
          applyFallback();
        },
      });
    },
    [scheduleWeatherLoad, loadDefaultLocation, requestCurrentPositionWithFallback, unit]
  );

  const retryWeather = useCallback(() => {
    const fallbackRequest = lastRequestRef.current ?? DEFAULT_LOCATION;
    const retryUnit = normalizeTemperatureUnit(fallbackRequest.unit ?? unit);

    scheduleWeatherLoad(
      fallbackRequest.lat,
      fallbackRequest.lon,
      normalizeLocationName(fallbackRequest.name, DEFAULT_LOCATION.name),
      normalizeLocationName(fallbackRequest.country, DEFAULT_LOCATION.country),
      retryUnit
    );
  }, [scheduleWeatherLoad, unit]);

  useEffect(() => {
    if (location !== null) {
      return;
    }

    const persisted = getPersistedLocation();
    if (persisted) {
      scheduleWeatherLoadAsync(
        persisted.lat,
        persisted.lon,
        normalizeLocationName(persisted.name, DEFAULT_LOCATION.name),
        normalizeLocationName(persisted.country, DEFAULT_LOCATION.country),
        unit,
        {
          fallbackNotice: SAVED_LOCATION_NOTICE,
          skipIfSignatureMatches: true,
        }
      );
    } else {
      const fallbackTimer = setTimeout(() => {
        scheduleWeatherLoadAsync(
          DEFAULT_LOCATION.lat,
          DEFAULT_LOCATION.lon,
          DEFAULT_LOCATION.name,
          DEFAULT_LOCATION.country,
          unit,
          {
            fallbackNotice: LOCATION_FALLBACK_NOTICE,
            skipIfSignatureMatches: true,
          }
        );
      }, LOCATION_FALLBACK_DELAY_MS);

      scheduleTask(() => {
        requestCurrentPositionWithFallback({
          requestUnit: unit,
          fallbackNotice: LOCATION_FALLBACK_NOTICE,
          onSuccess: ({ latitude, longitude }) => {
            clearTimeout(fallbackTimer);
            scheduleWeatherLoadAsync(
              latitude,
              longitude,
              undefined,
              undefined,
              unit,
              { skipIfSignatureMatches: true }
            );
          },
          onFallback: () => {
            clearTimeout(fallbackTimer);
            loadDefaultLocation(unit, LOCATION_FALLBACK_NOTICE);
          },
        });
      });

      return () => {
        clearTimeout(fallbackTimer);
        abortInFlightRequest();
      };
    }
  }, [
    location,
    unit,
    scheduleWeatherLoadAsync,
    abortInFlightRequest,
    requestCurrentPositionWithFallback,
    loadDefaultLocation,
  ]);

  const hasLocation = location !== null;
  const locationLat = location?.lat;
  const locationLon = location?.lon;
  const locationName = location?.name;
  const locationCountry = location?.country;

  useEffect(() => {
    if (!hasLocation) {
      activeLocationRef.current = null;
      return;
    }

    activeLocationRef.current = {
      lat: locationLat,
      lon: locationLon,
      name: locationName,
      country: locationCountry,
    };
  }, [hasLocation, locationLat, locationLon, locationName, locationCountry]);

  useEffect(() => {
    const unitChanged = previousUnitRef.current !== unit;
    const climateChanged = previousClimateEnabledRef.current !== climateEnabled;

    previousUnitRef.current = unit;
    previousClimateEnabledRef.current = climateEnabled;

    if (!hasLocation || (!unitChanged && !climateChanged)) {
      return;
    }

    const activeLocation = activeLocationRef.current;
    if (!activeLocation) {
      return;
    }

    scheduleWeatherLoadAsync(
      activeLocation.lat,
      activeLocation.lon,
      activeLocation.name,
      activeLocation.country,
      unit,
      { skipIfSignatureMatches: true }
    );
  }, [
    unit,
    climateEnabled,
    hasLocation,
    scheduleWeatherLoadAsync,
  ]);

  useEffect(() => {
    return () => {
      abortInFlightRequest();
    };
  }, [abortInFlightRequest]);

  return {
    weather,
    weatherDataUnit,
    weatherWindSpeedUnit,
    location,
    loading,
    error,
    locationNotice,
    loadWeather,
    loadCurrentLocation,
    retryWeather,
    climateComparison,
    isLocatingCurrent,
  };
}
