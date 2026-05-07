import { memo, useCallback, useEffect, useRef, useState } from "react";
import { toFiniteNumber } from "../../utils/numbers";
import "./StatusStack.css";

function normalizeSentence(value, fallback) {
  const message = typeof value === "string" && value.trim() ? value.trim() : fallback;
  return message.replace(/[.!?]+$/, "");
}

function formatCacheCapturedAt(value) {
  const timestamp = toFiniteNumber(value);
  if (timestamp === null) {
    return "";
  }

  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusStack({
  locationNotice,
  showLocationSetupPrompt,
  showPermissionOnboarding,
  onUseCurrentLocation,
  onFocusCitySearch,
  onDismissPermissionOnboarding,
  isLocatingCurrent,
  isGeolocationSupported,
  isBackgroundLoading,
  showRefreshError,
  error = "",
  cacheStatus = "idle",
  cacheCapturedAt = null,
  onRetry,
  showRuntimeStatus = true,
  showSetupPrompts = true,
  className = "",
}) {
  const [isRetryCoolingDown, setIsRetryCoolingDown] = useState(false);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    if (isRetryCoolingDown || typeof onRetry !== "function") {
      return;
    }

    setIsRetryCoolingDown(true);
    onRetry();

    retryTimerRef.current = setTimeout(() => {
      setIsRetryCoolingDown(false);
      retryTimerRef.current = null;
    }, 1400);
  }, [isRetryCoolingDown, onRetry]);

  const hasRuntimeStatus = showRuntimeStatus && Boolean(
    locationNotice ||
    isBackgroundLoading ||
    showRefreshError
  );
  const hasSetupPrompts = showSetupPrompts && Boolean(
    showLocationSetupPrompt || showPermissionOnboarding
  );
  const hasStatusStack = hasRuntimeStatus || hasSetupPrompts;
  const isShowingCachedForecast = cacheStatus === "restored";
  const refreshErrorBase = normalizeSentence(
    error,
    isShowingCachedForecast
      ? "Live weather is unavailable"
      : "Could not refresh weather right now"
  );
  const cacheCapturedLabel = formatCacheCapturedAt(cacheCapturedAt);
  const refreshErrorMessage = isShowingCachedForecast
    ? `${refreshErrorBase}. Showing a saved forecast${cacheCapturedLabel ? ` from ${cacheCapturedLabel}` : ""}.`
    : `${refreshErrorBase}. Showing last known data.`;

  if (!hasStatusStack) {
    return null;
  }

  return (
    <div className={`status-stack ${className}`.trim()}>
      {showRuntimeStatus && locationNotice && !showPermissionOnboarding && !showLocationSetupPrompt && (
        <p className="location-notice" role="status" aria-live="polite">
          <span className="location-notice-label">Location</span>
          <span className="location-notice-text">{locationNotice}</span>
        </p>
      )}
      {showSetupPrompts && showPermissionOnboarding && (
        <section className="permission-onboarding" aria-label="Location onboarding">
          <p className="permission-onboarding-kicker">First-time setup</p>
          <h2 className="permission-onboarding-title">Set your forecast once, then keep moving</h2>
          <p className="permission-onboarding-copy">
            {isGeolocationSupported
              ? "Chicago is already loaded as a starting point. Use your browser location for local conditions right now, or search for any city when you want a different view."
              : "Chicago is already loaded as a starting point. This browser cannot share live location here, so search for any city when you want a different forecast."}
          </p>
          <div className="permission-onboarding-actions">
            {isGeolocationSupported ? (
              <button
                type="button"
                className="location-setup-btn location-setup-btn--primary"
                onClick={onUseCurrentLocation}
                disabled={isLocatingCurrent}
                aria-busy={isLocatingCurrent || undefined}
              >
                {isLocatingCurrent ? "Requesting permission..." : "Allow location access"}
              </button>
            ) : (
              <button
                type="button"
                className="location-setup-btn location-setup-btn--primary"
                onClick={onFocusCitySearch}
              >
                Search a city
              </button>
            )}
            <button
              type="button"
              className="location-setup-btn"
              onClick={onDismissPermissionOnboarding}
            >
              Keep Chicago for now
            </button>
          </div>
        </section>
      )}
      {showSetupPrompts && showLocationSetupPrompt && (
        <section className="location-setup-prompt" aria-label="Location setup">
          <p className="location-setup-title">
            {isGeolocationSupported
              ? "Want something more local? Use your current location or search for a city."
              : "Want something more local? Search for a city. Live browser location is unavailable here."}
          </p>
          <div className="location-setup-actions">
            {isGeolocationSupported ? (
              <button
                type="button"
                className="location-setup-btn location-setup-btn--primary"
                onClick={onUseCurrentLocation}
                disabled={isLocatingCurrent}
                aria-busy={isLocatingCurrent || undefined}
              >
                {isLocatingCurrent ? "Finding your location..." : "Use my location"}
              </button>
            ) : null}
            <button
              type="button"
              className={`location-setup-btn ${isGeolocationSupported ? "" : "location-setup-btn--primary"}`.trim()}
              onClick={onFocusCitySearch}
            >
              Search a city
            </button>
          </div>
        </section>
      )}
      {showRuntimeStatus && isBackgroundLoading && (
        <p className="app-status app-status--loading" role="status" aria-live="polite">
          Updating weather for your current settings...
        </p>
      )}
      {showRuntimeStatus && showRefreshError && (
        <div className="app-status app-status--error" role="alert">
          <span className="app-status-message">
            {refreshErrorMessage}
          </span>
          <button
            type="button"
            className="app-status-retry"
            onClick={handleRetry}
            disabled={isRetryCoolingDown}
            aria-busy={isRetryCoolingDown || undefined}
          >
            {isRetryCoolingDown ? "Retrying..." : "Retry"}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(StatusStack);
