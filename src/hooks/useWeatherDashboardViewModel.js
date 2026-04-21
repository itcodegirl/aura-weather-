import { useRef } from "react";
import { PRELOAD_HEAVY_PANELS } from "../components/lazyPanels";
import { deriveWeatherScene } from "../domain/weatherScene";
import { usePanelPreload, useSearchShortcut } from "./useAppShellEffects";
import { useDisplayPreferences } from "./useDisplayPreferences";
import { useWeather } from "./useWeather";

export function useWeatherDashboardViewModel() {
  const { unit, setUnit, showClimateContext, setShowClimateContext } =
    useDisplayPreferences();
  const citySearchRef = useRef(null);

  const weatherState = useWeather(unit, { climateEnabled: showClimateContext });
  const scene = deriveWeatherScene({
    weather: weatherState.weather,
    loading: weatherState.loading,
    error: weatherState.error,
  });

  useSearchShortcut(citySearchRef);
  usePanelPreload(PRELOAD_HEAVY_PANELS);

  return {
    ...weatherState,
    ...scene,
    citySearchRef,
    unit,
    setUnit,
    showClimateContext,
    setShowClimateContext,
  };
}
