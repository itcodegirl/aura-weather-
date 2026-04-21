import { useLocalStorageState } from "./useLocalStorageState";

const DEFAULT_UNIT = "F";
const CLIMATE_CONTEXT_DEFAULT = true;

const CLIMATE_CONTEXT_KEY = "aura-weather-climate-context";
const UNIT_PREFERENCE_KEY = "aura-weather-unit-preference";

function deserializeUnitPreference(storedUnit) {
  return storedUnit === "F" || storedUnit === "C" ? storedUnit : DEFAULT_UNIT;
}

function deserializeClimatePreference(storedValue) {
  if (storedValue === "off") return false;
  if (storedValue === "on") return true;
  return CLIMATE_CONTEXT_DEFAULT;
}

function serializeClimatePreference(showClimateContext) {
  return showClimateContext ? "on" : "off";
}

export function useDisplayPreferences() {
  const [unit, setUnit] = useLocalStorageState(
    UNIT_PREFERENCE_KEY,
    DEFAULT_UNIT,
    {
      deserialize: deserializeUnitPreference,
    }
  );

  const [showClimateContext, setShowClimateContext] = useLocalStorageState(
    CLIMATE_CONTEXT_KEY,
    CLIMATE_CONTEXT_DEFAULT,
    {
      deserialize: deserializeClimatePreference,
      serialize: serializeClimatePreference,
    }
  );

  return {
    unit,
    setUnit,
    showClimateContext,
    setShowClimateContext,
  };
}
