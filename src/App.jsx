import { useRef } from "react";
import "./App.css";
import { useWeather } from "./hooks/useWeather";
import { usePanelPreload, useSearchShortcut } from "./hooks/useAppShellEffects";
import { useDisplayPreferences } from "./hooks/useDisplayPreferences";
import { deriveWeatherScene } from "./domain/weatherScene";
import {
  HourlyPanel,
  PRELOAD_HEAVY_PANELS,
  StormWatchPanel,
} from "./components/lazyPanels";
import {
  AppShell,
  AppLoadingState,
  AppErrorState,
  AppHeader,
  StatusStack,
  WeatherDashboard,
} from "./components/layout";

function App() {
  const { unit, setUnit, showClimateContext, setShowClimateContext } =
    useDisplayPreferences();
  const citySearchRef = useRef(null);
  const {
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
  } = useWeather(unit, { climateEnabled: showClimateContext });

  const {
    showGlobalLoading,
    isBackgroundLoading,
    showGlobalError,
    showRefreshError,
    weatherInfo,
    background,
  } = deriveWeatherScene({ weather, loading, error });

  useSearchShortcut(citySearchRef);
  usePanelPreload(PRELOAD_HEAVY_PANELS);

  if (showGlobalLoading) {
    return <AppLoadingState />;
  }

  if (showGlobalError) {
    return <AppErrorState error={error} onRetry={retryWeather} />;
  }

  return (
    <AppShell background={background}>
      <AppHeader
        citySearchRef={citySearchRef}
        loadWeather={loadWeather}
        loadCurrentLocation={loadCurrentLocation}
        isLocatingCurrent={isLocatingCurrent}
        showClimateContext={showClimateContext}
        setShowClimateContext={setShowClimateContext}
        unit={unit}
        setUnit={setUnit}
      />

      <StatusStack
        locationNotice={locationNotice}
        isBackgroundLoading={isBackgroundLoading}
        showRefreshError={showRefreshError}
        onRetry={retryWeather}
      />

      <WeatherDashboard
        weather={weather}
        location={location}
        unit={unit}
        weatherDataUnit={weatherDataUnit}
        weatherWindSpeedUnit={weatherWindSpeedUnit}
        climateComparison={climateComparison}
        showClimateContext={showClimateContext}
        isBackgroundLoading={isBackgroundLoading}
        weatherInfo={weatherInfo}
        HourlyCardComponent={HourlyPanel}
        StormWatchComponent={StormWatchPanel}
      />
    </AppShell>
  );
}

export default App;
