import { memo, useCallback } from "react";
import CitySearch from "./CitySearch";
import DisplaySettingsControls from "./header/DisplaySettingsControls";
import SavedCitiesStrip from "./header/SavedCitiesStrip";
import SyncAccountPanel from "./header/SyncAccountPanel";
import { toFiniteNumber } from "../utils/numbers";

function HeaderControls({
  citySearchRef,
  loadWeather,
  loadCurrentLocation,
  clearSavedLocation,
  savedCities,
  recentCities,
  location,
  loadSavedCity,
  forgetSavedCity,
  syncConnected,
  syncAccount,
  syncState,
  createSyncAccount,
  connectSyncAccount,
  disconnectSyncAccount,
  syncSavedCitiesNow,
  isLocatingCurrent,
  isGeolocationSupported,
  showClimateContext,
  setShowClimateContext,
  unit,
  setUnit,
  hasPersistedLocation,
}) {
  const safeSavedCities = Array.isArray(savedCities) ? savedCities : [];
  const syncNeedsAttention =
    syncState?.status === "syncing" ||
    (typeof syncState?.error === "string" && Boolean(syncState.error.trim()));
  const shouldShowSyncPanel =
    safeSavedCities.length > 0 || syncConnected || syncNeedsAttention;

  const handleCitySelect = useCallback(
    (city) => {
      // Strict coercion so a city with null lat/lon does not silently
      // route to (0, 0) Null Island — Number(null) is 0 and would pass
      // the legacy Number.isFinite check.
      const lat = toFiniteNumber(city?.lat);
      const lon = toFiniteNumber(city?.lon);
      if (lat === null || lon === null) {
        return;
      }
      loadWeather(lat, lon, city.name, city.country);
    },
    [loadWeather]
  );

  const handleLoadCurrentLocation = useCallback(() => {
    loadCurrentLocation();
  }, [loadCurrentLocation]);

  const handleClearSavedLocation = useCallback(() => {
    if (typeof clearSavedLocation === "function") {
      clearSavedLocation();
    }
  }, [clearSavedLocation]);

  const handleSetClimateContext = useCallback(
    (nextValue) => {
      setShowClimateContext(nextValue);
    },
    [setShowClimateContext]
  );

  const handleEnableClimateContext = useCallback(() => {
    handleSetClimateContext(true);
  }, [handleSetClimateContext]);

  const handleDisableClimateContext = useCallback(() => {
    handleSetClimateContext(false);
  }, [handleSetClimateContext]);

  const handleSetUnit = useCallback(
    (nextUnit) => {
      setUnit(nextUnit);
    },
    [setUnit]
  );

  const handleSetUnitF = useCallback(() => {
    handleSetUnit("F");
  }, [handleSetUnit]);

  const handleSetUnitC = useCallback(() => {
    handleSetUnit("C");
  }, [handleSetUnit]);

  const handleCreateSyncAccount = useCallback(() => {
    if (typeof createSyncAccount === "function") {
      void createSyncAccount();
    }
  }, [createSyncAccount]);

  const handleConnectSyncAccount = useCallback((nextSyncKey) => {
    if (typeof connectSyncAccount === "function") {
      void connectSyncAccount(nextSyncKey);
    }
  }, [connectSyncAccount]);

  const handleDisconnectSyncAccount = useCallback(() => {
    if (typeof disconnectSyncAccount === "function") {
      disconnectSyncAccount();
    }
  }, [disconnectSyncAccount]);

  const handleSyncNow = useCallback(() => {
    if (typeof syncSavedCitiesNow === "function") {
      void syncSavedCitiesNow();
    }
  }, [syncSavedCitiesNow]);

  return (
    <div className="app-header-actions">
      <div className="app-header-primary">
        <div className="app-header-primary-row">
          <CitySearch
            ref={citySearchRef}
            onSelect={handleCitySelect}
            savedCities={safeSavedCities}
            recentCities={recentCities}
          />
          <button
            type="button"
            className="current-location-btn glass"
            onClick={handleLoadCurrentLocation}
            disabled={isLocatingCurrent || !isGeolocationSupported}
            aria-busy={isLocatingCurrent || undefined}
            aria-label={
              isGeolocationSupported
                ? "Use my location"
                : "Location access unavailable in this browser"
            }
            title={
              isGeolocationSupported
                ? undefined
                : "Location access is unavailable in this browser. Search for a city instead."
            }
          >
            {isGeolocationSupported
              ? (isLocatingCurrent ? "Finding..." : "My location")
              : "Unavailable"}
          </button>
        </div>
        <SavedCitiesStrip
          savedCities={safeSavedCities}
          location={location}
          loadSavedCity={loadSavedCity}
          forgetSavedCity={forgetSavedCity}
        />
        {shouldShowSyncPanel ? (
          <SyncAccountPanel
            syncConnected={syncConnected}
            syncAccount={syncAccount}
            syncState={syncState}
            onCreateSyncAccount={handleCreateSyncAccount}
            onConnectSyncAccount={handleConnectSyncAccount}
            onDisconnectSyncAccount={handleDisconnectSyncAccount}
            onSyncNow={handleSyncNow}
          />
        ) : null}
      </div>

      <DisplaySettingsControls
        showClimateContext={showClimateContext}
        onEnableClimateContext={handleEnableClimateContext}
        onDisableClimateContext={handleDisableClimateContext}
        unit={unit}
        onSetUnitF={handleSetUnitF}
        onSetUnitC={handleSetUnitC}
        onClearSavedLocation={handleClearSavedLocation}
        hasPersistedLocation={hasPersistedLocation}
      />
    </div>
  );
}

export default memo(HeaderControls);
