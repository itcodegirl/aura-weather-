import { memo, useCallback } from "react";
import { toFiniteNumber } from "../../utils/numbers";

function SavedCitiesStrip({
  savedCities,
  location,
  loadSavedCity,
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
        const cityLat = toFiniteNumber(city.lat);
        const cityLon = toFiniteNumber(city.lon);
        const isActive =
          activeLat !== null &&
          activeLon !== null &&
          activeLat === cityLat &&
          activeLon === cityLon;

        return (
          <div
            key={key}
            className={`saved-city-chip-wrap ${isActive ? "is-active" : ""}`}
            role="listitem"
          >
            <button
              type="button"
              className={`saved-city-chip ${isActive ? "is-active" : ""}`}
              onClick={() => handleLoadSavedCity(city)}
              aria-pressed={isActive}
            >
              {city.name}
            </button>
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
