import { memo, useCallback } from "react";
import { toFiniteNumber } from "../../utils/numbers";

function SavedCitiesStrip({
  savedCities,
  location,
  startupLocation,
  loadSavedCity,
  setStartupCity,
  forgetSavedCity,
}) {
  const safeSavedCities = Array.isArray(savedCities) ? savedCities : [];

  const handleLoadSavedCity = useCallback(
    (city) => {
      if (typeof loadSavedCity === "function") {
        loadSavedCity(city);
      }
    },
    [loadSavedCity]
  );

  const handleForgetSavedCity = useCallback(
    (event, city) => {
      event.stopPropagation();
      if (typeof forgetSavedCity === "function") {
        forgetSavedCity(city);
      }
    },
    [forgetSavedCity]
  );

  const handleSetStartupCity = useCallback(
    (event, city) => {
      event.stopPropagation();
      if (typeof setStartupCity === "function") {
        setStartupCity(city);
      }
    },
    [setStartupCity]
  );

  if (safeSavedCities.length === 0) {
    return null;
  }

  return (
    <div className="saved-cities-strip" role="list" aria-label="Saved cities">
      {safeSavedCities.map((city) => {
        const key = `${city.lat}:${city.lon}:${city.name}`;
        // Strict equality through toFiniteNumber so a null/undefined
        // active location does not coerce to 0 and falsely match a
        // saved city with null lat/lon.
        const activeLat = toFiniteNumber(location?.lat);
        const activeLon = toFiniteNumber(location?.lon);
        const startupLat = toFiniteNumber(startupLocation?.lat);
        const startupLon = toFiniteNumber(startupLocation?.lon);
        const cityLat = toFiniteNumber(city.lat);
        const cityLon = toFiniteNumber(city.lon);
        const isActive =
          activeLat !== null &&
          activeLon !== null &&
          activeLat === cityLat &&
          activeLon === cityLon;
        const isStartup =
          startupLat !== null &&
          startupLon !== null &&
          startupLat === cityLat &&
          startupLon === cityLon;

        return (
          <div
            key={key}
            className={`saved-city-chip-wrap ${isActive ? "is-active" : ""} ${isStartup ? "is-startup" : ""}`.trim()}
            role="listitem"
          >
            <button
              type="button"
              className={`saved-city-chip ${isActive ? "is-active" : ""} ${isStartup ? "is-startup" : ""}`.trim()}
              onClick={() => handleLoadSavedCity(city)}
              aria-pressed={isActive}
            >
              {city.name}
            </button>
            {isStartup ? (
              <span className="saved-city-startup-badge">Startup</span>
            ) : (
              <button
                type="button"
                className="saved-city-startup"
                onClick={(event) => handleSetStartupCity(event, city)}
                aria-label={`Make ${city.name} your startup city`}
                title={`Make ${city.name} your startup city`}
              >
                Start
              </button>
            )}
            <button
              type="button"
              className="saved-city-remove"
              onClick={(event) => handleForgetSavedCity(event, city)}
              aria-label={`Remove ${city.name} from saved cities`}
            >
              {"\u00D7"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default memo(SavedCitiesStrip);
