// src/hooks/useWeather.js

import { useState, useEffect, useCallback, useRef } from "react";
import { normalizeTemperatureUnit } from "../utils/weatherUnits";
import {
  useLocation,
  DEFAULT_LOCATION,
  LOCATION_FALLBACK_NOTICE,
  SAVED_LOCATION_NOTICE,
  LOCATION_FALLBACK_DELAY_MS,
  normalizeLocationName,
} from "./useLocation";
import { useWeatherData } from "./useWeatherData";

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

export function useWeather(unit = "F", options = {}) {
  const { climateEnabled = true } = options;
  const [locationNotice, setLocationNotice] = useState(null);
  const {
    location,
    setLocation,
    isLocatingCurrent,
    getPersistedLocation,
    persistLocation,
    requestCurrentPositionWithFallback,
  } = useLocation(unit);
  const previousUnitRef = useRef(unit);
  const previousClimateEnabledRef = useRef(climateEnabled);
  const activeUnitRef = useRef(normalizeTemperatureUnit(unit));

  useEffect(() => {
    activeUnitRef.current = normalizeTemperatureUnit(unit);
  }, [unit]);

  const handleLocationResolved = useCallback(
    (resolvedLocation) => {
      if (!resolvedLocation || typeof resolvedLocation !== "object") {
        return;
      }

      const normalizedLocation = {
        lat: Number(resolvedLocation.lat),
        lon: Number(resolvedLocation.lon),
        name: normalizeLocationName(resolvedLocation.name, DEFAULT_LOCATION.name),
        country: normalizeLocationName(
          resolvedLocation.country,
          DEFAULT_LOCATION.country
        ),
      };
      setLocation(normalizedLocation);
      persistLocation(
        normalizedLocation.lat,
        normalizedLocation.lon,
        normalizedLocation.name,
        normalizedLocation.country
      );
    },
    [setLocation, persistLocation]
  );

  const {
    weather,
    weatherDataUnit,
    weatherWindSpeedUnit,
    loading,
    error,
    climateComparison,
    loadWeather,
    scheduleWeatherLoad,
    scheduleWeatherLoadAsync,
    retryWeather,
    abortInFlightRequest,
  } = useWeatherData(unit, {
    climateEnabled,
    onLocationNotice: setLocationNotice,
    onLocationResolved: handleLocationResolved,
  });

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

  const loadCurrentLocation = useCallback(
    (loadOptions = {}) => {
      const normalizedOptions =
        loadOptions && typeof loadOptions === "object" ? loadOptions : {};
      const requestUnit = normalizeTemperatureUnit(
        normalizedOptions.unit ?? activeUnitRef.current
      );
      const fallbackNotice =
        normalizedOptions.fallbackNotice ?? LOCATION_FALLBACK_NOTICE;
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
    [requestCurrentPositionWithFallback, loadDefaultLocation, scheduleWeatherLoad]
  );

  useEffect(() => {
    if (location !== null) {
      return;
    }

    const persisted = getPersistedLocation();
    const requestUnit = normalizeTemperatureUnit(activeUnitRef.current);
    if (persisted) {
      scheduleWeatherLoadAsync(
        persisted.lat,
        persisted.lon,
        normalizeLocationName(persisted.name, DEFAULT_LOCATION.name),
        normalizeLocationName(persisted.country, DEFAULT_LOCATION.country),
        requestUnit,
        {
          fallbackNotice: SAVED_LOCATION_NOTICE,
          skipIfSignatureMatches: true,
        }
      );
      return undefined;
    }

    const fallbackTimer = setTimeout(() => {
      scheduleWeatherLoadAsync(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon,
        DEFAULT_LOCATION.name,
        DEFAULT_LOCATION.country,
        requestUnit,
        {
          fallbackNotice: LOCATION_FALLBACK_NOTICE,
          skipIfSignatureMatches: true,
        }
      );
    }, LOCATION_FALLBACK_DELAY_MS);

    scheduleTask(() => {
      requestCurrentPositionWithFallback({
        requestUnit,
        fallbackNotice: LOCATION_FALLBACK_NOTICE,
        onSuccess: ({ latitude, longitude }) => {
          clearTimeout(fallbackTimer);
          scheduleWeatherLoadAsync(
            latitude,
            longitude,
            undefined,
            undefined,
            requestUnit,
            { skipIfSignatureMatches: true }
          );
        },
        onFallback: () => {
          clearTimeout(fallbackTimer);
          loadDefaultLocation(requestUnit, LOCATION_FALLBACK_NOTICE);
        },
      });
    });

    return () => {
      clearTimeout(fallbackTimer);
      abortInFlightRequest();
    };
  }, [
    location,
    getPersistedLocation,
    scheduleWeatherLoadAsync,
    requestCurrentPositionWithFallback,
    loadDefaultLocation,
    abortInFlightRequest,
  ]);

  useEffect(() => {
    const unitChanged = previousUnitRef.current !== unit;
    const climateChanged = previousClimateEnabledRef.current !== climateEnabled;

    previousUnitRef.current = unit;
    previousClimateEnabledRef.current = climateEnabled;

    if (!location || (!unitChanged && !climateChanged)) {
      return;
    }

    scheduleWeatherLoadAsync(
      location.lat,
      location.lon,
      location.name,
      location.country,
      unit,
      { skipIfSignatureMatches: true }
    );
  }, [unit, climateEnabled, location, scheduleWeatherLoadAsync]);

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

