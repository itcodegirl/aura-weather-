import { memo } from "react";

const CLIMATE_CONTEXT_LABEL_ID = "climate-context-label";

function DisplaySettingsControls({
  id = "display-settings-panel",
  isMobileOpen = false,
  showClimateContext,
  onEnableClimateContext,
  onDisableClimateContext,
  unit,
  onSetUnitF,
  onSetUnitC,
  onClearSavedLocation,
  hasPersistedLocation,
}) {
  return (
    <div
      id={id}
      className={`app-header-secondary ${isMobileOpen ? "is-mobile-open" : ""}`.trim()}
      role="region"
      aria-label="Display settings"
    >
      <div className="header-control-stack">
        <p id={CLIMATE_CONTEXT_LABEL_ID} className="header-control-label">
          Climate Context
        </p>
        <div
          className="toggle-pill glass"
          role="group"
          aria-labelledby={CLIMATE_CONTEXT_LABEL_ID}
        >
          <button
            type="button"
            className={`toggle-pill-btn ${showClimateContext ? "is-active" : ""}`}
            onClick={onEnableClimateContext}
            aria-pressed={showClimateContext}
            aria-label="Show historical climate comparison"
          >
            On
          </button>
          <button
            type="button"
            className={`toggle-pill-btn ${!showClimateContext ? "is-active" : ""}`}
            onClick={onDisableClimateContext}
            aria-pressed={!showClimateContext}
            aria-label="Hide historical climate comparison"
          >
            Off
          </button>
        </div>
      </div>

      <div className="unit-toggle glass" role="group" aria-label="Temperature unit">
        <button
          type="button"
          onClick={onSetUnitF}
          className={`unit-btn ${unit === "F" ? "is-active" : ""}`}
          aria-pressed={unit === "F"}
          aria-label="Show temperatures in Fahrenheit"
        >
          {"\u00B0F"}
        </button>
        <button
          type="button"
          onClick={onSetUnitC}
          className={`unit-btn ${unit === "C" ? "is-active" : ""}`}
          aria-pressed={unit === "C"}
          aria-label="Show temperatures in Celsius"
        >
          {"\u00B0C"}
        </button>
      </div>

      {hasPersistedLocation ? (
        <button
          type="button"
          className="header-secondary-action header-secondary-action--danger"
          onClick={onClearSavedLocation}
          aria-label="Clear saved location preference"
        >
          Clear startup city
        </button>
      ) : null}
    </div>
  );
}

export default memo(DisplaySettingsControls);
