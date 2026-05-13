import { useState, useCallback, useEffect, useRef } from "react";
import {
  CURRENT_LOCATION_NAME,
  CURRENT_LOCATION_NOTICE,
  DEFAULT_LOCATION,
  useLocation,
  persistLocation,
  clearPersistedLocation,
  getPersistedLocation,
  getRecentCities,
  getSavedCities,
  upsertSavedCity,
  upsertRecentCity,
  removeSavedCity,
  LOCATION_FALLBACK_NOTICE,
  SAVED_LOCATION_NOTICE,
} from "./useLocation";
import { useSavedLocationsSync } from "./useSavedLocationsSync";
import { useWeatherData } from "./useWeatherData";
import { reverseGeocodeCoordinates } from "../api";
import {
  hasMatchingCoordinates,
  toLocationPayload,
} from "./locationHelpers";

function buildCurrentLocationNotice(placeName) {
  const trimmedPlaceName =
    typeof placeName === "string" ? placeName.trim() : "";
  if (!trimmedPlaceName || trimmedPlaceName === CURRENT_LOCATION_NAME) {
    return CURRENT_LOCATION_NOTICE;
  }

  return `Showing your device location near ${trimmedPlaceName}`;
}

function getInitialLocationState() {
  const persistedLocation = getPersistedLocation();
  if (persistedLocation) {
    return {
      location: persistedLocation,
      notice: SAVED_LOCATION_NOTICE,
      hasPersistedLocation: true,
    };
  }

  return {
    location: DEFAULT_LOCATION,
    notice: LOCATION_FALLBACK_NOTICE,
    hasPersistedLocation: false,
  };
}

export function useWeather(options = {}) {
  const { climateEnabled = true, weatherEnabled = true } = options;
  const [initialLocationState] = useState(() => getInitialLocationState());
  const [location, setLocation] = useState(initialLocationState.location);
  const [locationNotice, setLocationNotice] = useState(initialLocationState.notice);
  const [hasPersistedLocation, setHasPersistedLocation] = useState(
    initialLocationState.hasPersistedLocation
  );
  const [savedCities, setSavedCities] = useState(() => getSavedCities());
  const [recentCities, setRecentCities] = useState(() => getRecentCities());
  const locationRef = useRef(location);
  const locationNoticeRef = useRef(locationNotice);
  const reverseGeocodeAbortRef = useRef(null);
  const reverseGeocodeRequestIdRef = useRef(0);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    locationNoticeRef.current = locationNotice;
  }, [locationNotice]);

  const abortReverseGeocode = useCallback(() => {
    if (!reverseGeocodeAbortRef.current) {
      return;
    }

    reverseGeocodeAbortRef.current.abort();
    reverseGeocodeAbortRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      abortReverseGeocode();
    };
  }, [abortReverseGeocode]);

  const persistLocationPayload = useCallback((nextLocation) => {
    persistLocation(
      nextLocation.lat,
      nextLocation.lon,
      nextLocation.name,
      nextLocation.country
    );
    setHasPersistedLocation(true);
  }, []);

  const applyLocation = useCallback(
    (nextLocation, notice = null, options = {}) => {
      const {
        saveCity = true,
        persistLocation: shouldPersistLocation = true,
        saveRecent = false,
      } = options;
      const currentLocation = locationRef.current;
      const hasSameLocation =
        currentLocation &&
        currentLocation.lat === nextLocation.lat &&
        currentLocation.lon === nextLocation.lon &&
        currentLocation.name === nextLocation.name &&
        currentLocation.country === nextLocation.country;
      const hasSameNotice = locationNoticeRef.current === notice;

      if (shouldPersistLocation) {
        persistLocationPayload(nextLocation);
      }

      if (saveCity) {
        const updatedSavedCities = upsertSavedCity(
          nextLocation.lat,
          nextLocation.lon,
          nextLocation.name,
          nextLocation.country
        );
        setSavedCities(updatedSavedCities);
      }

      if (saveRecent) {
        const updatedRecentCities = upsertRecentCity(
          nextLocation.lat,
          nextLocation.lon,
          nextLocation.name,
          nextLocation.country
        );
        setRecentCities(updatedRecentCities);
      }

      if (hasSameLocation && hasSameNotice) {
        return;
      }

      if (!hasSameLocation) {
        setLocation(nextLocation);
        locationRef.current = nextLocation;
      }

      if (!hasSameNotice) {
        setLocationNotice(notice);
        locationNoticeRef.current = notice;
      }
    },
    [persistLocationPayload]
  );

  const resolveFriendlyCurrentLocation = useCallback(
    async (lat, lon) => {
      abortReverseGeocode();

      const requestId = reverseGeocodeRequestIdRef.current + 1;
      reverseGeocodeRequestIdRef.current = requestId;
      const controller = new AbortController();
      reverseGeocodeAbortRef.current = controller;

      try {
        const language =
          typeof navigator !== "undefined" &&
          typeof navigator.language === "string"
            ? navigator.language
            : "";
        const resolvedPlace = await reverseGeocodeCoordinates(lat, lon, {
          signal: controller.signal,
          language,
        });

        if (requestId !== reverseGeocodeRequestIdRef.current) {
          return;
        }

        const nextLocation = toLocationPayload(
          lat,
          lon,
          resolvedPlace?.name,
          resolvedPlace?.country
        );
        if (!nextLocation || !nextLocation.name) {
          return;
        }

        const activeLocation = locationRef.current;
        if (
          !activeLocation ||
          activeLocation.lat !== nextLocation.lat ||
          activeLocation.lon !== nextLocation.lon
        ) {
          return;
        }

        applyLocation(nextLocation, buildCurrentLocationNotice(nextLocation.name), {
          saveCity: true,
          persistLocation: true,
          saveRecent: true,
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          return;
        }
      } finally {
        if (
          reverseGeocodeRequestIdRef.current === requestId &&
          reverseGeocodeAbortRef.current === controller
        ) {
          reverseGeocodeAbortRef.current = null;
        }
      }
    },
    [abortReverseGeocode, applyLocation]
  );

  const handleLocationResolved = useCallback(
    (lat, lon, name, country, notice = null) => {
      const nextLocation = toLocationPayload(lat, lon, name, country);
      if (!nextLocation) {
        return;
      }

      if (notice === CURRENT_LOCATION_NOTICE) {
        applyLocation(nextLocation, buildCurrentLocationNotice(nextLocation.name), {
          saveCity: true,
          persistLocation: true,
          saveRecent: true,
        });
        void resolveFriendlyCurrentLocation(nextLocation.lat, nextLocation.lon);
        return;
      }

      applyLocation(nextLocation, notice, {
        saveCity: false,
        persistLocation: false,
        saveRecent: false,
      });
    },
    [applyLocation, resolveFriendlyCurrentLocation]
  );

  const { isLocatingCurrent, isGeolocationSupported, loadCurrentLocation } = useLocation(
    handleLocationResolved
  );

  const {
    weather,
    weatherDataUnit,
    loading,
    error,
    climateComparison,
    retryWeather,
    trustMeta,
  } = useWeatherData(location, {
    climateEnabled,
    enabled: weatherEnabled,
  });

  // Shared entrypoint used by both the search bar (loadWeather, called
  // with positional args) and the saved-cities strip (loadSavedCity,
  // called with a city object). Both flows resolve to the same
  // applyLocation invocation; keeping a single body makes it impossible
  // for the two to drift.
  const applyResolvedLocation = useCallback(
    (lat, lon, name, country) => {
      const nextLocation = toLocationPayload(lat, lon, name, country);
      if (!nextLocation) {
        return;
      }
      abortReverseGeocode();
      applyLocation(nextLocation, null, {
        saveCity: true,
        persistLocation: true,
        saveRecent: true,
      });
    },
    [abortReverseGeocode, applyLocation]
  );

  const loadWeather = useCallback(
    (lat, lon, name, country) => applyResolvedLocation(lat, lon, name, country),
    [applyResolvedLocation]
  );

  const loadSavedCity = useCallback(
    (city) =>
      applyResolvedLocation(city?.lat, city?.lon, city?.name, city?.country),
    [applyResolvedLocation]
  );

  const forgetSavedCity = useCallback((city) => {
    const updatedSavedCities = removeSavedCity(city?.lat, city?.lon);
    setSavedCities(updatedSavedCities);

    const persistedLocation = getPersistedLocation();
    if (!hasMatchingCoordinates(persistedLocation, city)) {
      return;
    }

    clearPersistedLocation();
    setHasPersistedLocation(false);
    const removedSavedLocationNotice =
      "Saved startup location removed. Aura will open to Chicago next time.";
    setLocationNotice(removedSavedLocationNotice);
    locationNoticeRef.current = removedSavedLocationNotice;
  }, []);
  const {
    syncConnected,
    syncAccount,
    syncState,
    createSyncAccount,
    connectSyncAccount,
    disconnectSyncAccount,
    syncSavedCitiesNow,
  } = useSavedLocationsSync(savedCities, setSavedCities);

  const clearSavedLocation = useCallback(() => {
    clearPersistedLocation();
    setHasPersistedLocation(false);
    setLocationNotice("Saved location removed for future sessions.");
    locationNoticeRef.current = "Saved location removed for future sessions.";
  }, []);

  return {
    weather,
    weatherDataUnit,
    location,
    loading,
    error,
    locationNotice,
    loadWeather,
    loadCurrentLocation,
    retryWeather,
    climateComparison,
    trustMeta,
    isLocatingCurrent,
    isGeolocationSupported,
    hasPersistedLocation,
    clearSavedLocation,
    savedCities,
    recentCities,
    loadSavedCity,
    forgetSavedCity,
    syncConnected,
    syncAccount,
    syncState,
    createSyncAccount,
    connectSyncAccount,
    disconnectSyncAccount,
    syncSavedCitiesNow,
  };
}
