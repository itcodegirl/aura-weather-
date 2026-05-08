import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toFiniteNumber } from "../../utils/numbers";

const UNDO_TIMEOUT_MS = 6000;

function SavedCitiesStrip({
  savedCities,
  location,
  loadSavedCity,
  forgetSavedCity,
  restoreSavedCity,
}) {
  const safeSavedCities = Array.isArray(savedCities) ? savedCities : [];
  const [pendingUndo, setPendingUndo] = useState(null);
  const undoTimeoutRef = useRef(null);

  const clearUndoTimer = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearUndoTimer, [clearUndoTimer]);

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

      // Optimistically remove the chip and surface a 6-second undo
      // window. If the user does not act, the deletion is final; if
      // they tap Undo, restoreSavedCity puts the chip back without
      // switching the active forecast.
      clearUndoTimer();
      setPendingUndo(city);
      undoTimeoutRef.current = setTimeout(() => {
        setPendingUndo(null);
        undoTimeoutRef.current = null;
      }, UNDO_TIMEOUT_MS);
    },
    [forgetSavedCity, clearUndoTimer]
  );

  const handleUndo = useCallback(() => {
    if (!pendingUndo || typeof restoreSavedCity !== "function") {
      setPendingUndo(null);
      clearUndoTimer();
      return;
    }
    restoreSavedCity(pendingUndo);
    setPendingUndo(null);
    clearUndoTimer();
  }, [pendingUndo, restoreSavedCity, clearUndoTimer]);

  const handleDismissUndo = useCallback(() => {
    setPendingUndo(null);
    clearUndoTimer();
  }, [clearUndoTimer]);

  if (safeSavedCities.length === 0 && !pendingUndo) {
    return null;
  }

  return (
    <>
      {safeSavedCities.length > 0 && (
        <div
          className="saved-cities-strip"
          role="list"
          aria-label="Saved cities"
        >
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
                  {"×"}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {pendingUndo && (
        <div
          className="saved-city-undo"
          role="status"
          aria-live="polite"
        >
          <span className="saved-city-undo-text">
            Removed <strong>{pendingUndo.name}</strong>
          </span>
          <button
            type="button"
            className="saved-city-undo-action"
            onClick={handleUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="saved-city-undo-dismiss"
            onClick={handleDismissUndo}
            aria-label="Dismiss undo notice"
          >
            {"×"}
          </button>
        </div>
      )}
    </>
  );
}

export default memo(SavedCitiesStrip);
