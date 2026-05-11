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
  serviceWorkerUpdateAvailable = false,
  serviceWorkerOfflineReady = false,
  isServiceWorkerRefreshing = false,
  onRefreshServiceWorkerUpdate,
  onDismissServiceWorkerUpdate,
  onDismissServiceWorkerOfflineReady,
  installPromptAvailable = false,
  isInstallPromptOpening = false,
  onInstallApp,
  onDismissInstallPrompt,
  showRuntimeStatus = true,
  showSetupPrompts = true,
  className = "",
}) {
  const [isRetryCoolingDown, setIsRetryCoolingDown] = useState(false);
  const retryTimerRef = useRef(null);

  // SR-only confirmation when a background refresh completes. Without
  // this, a screen reader user hears "Updating weather…" and then
  // silence — no signal that the new data has arrived. The pill-shaped
  // GlobalUpdateIndicator already confirms refresh visually for sighted
  // users; this adds the same beat for assistive tech.
  const [refreshCompletedMessage, setRefreshCompletedMessage] = useState("");
  const wasBackgroundLoadingRef = useRef(isBackgroundLoading);
  const refreshCompletedTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      if (refreshCompletedTimerRef.current) {
        clearTimeout(refreshCompletedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const wasLoading = wasBackgroundLoadingRef.current;
    wasBackgroundLoadingRef.current = isBackgroundLoading;

    if (!wasLoading || isBackgroundLoading || showRefreshError) {
      return;
    }

    setRefreshCompletedMessage("Weather updated.");
    if (refreshCompletedTimerRef.current) {
      clearTimeout(refreshCompletedTimerRef.current);
    }
    refreshCompletedTimerRef.current = setTimeout(() => {
      setRefreshCompletedMessage("");
      refreshCompletedTimerRef.current = null;
    }, 4000);
  }, [isBackgroundLoading, showRefreshError]);

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
    showRefreshError ||
    serviceWorkerUpdateAvailable ||
    serviceWorkerOfflineReady ||
    installPromptAvailable
  );
  const hasSetupPrompts = showSetupPrompts && Boolean(
    showLocationSetupPrompt || showPermissionOnboarding
  );
  // Keep the wrapper mounted while a "Weather updated" message is
  // in flight so the polite live region inside it can fire even when
  // no other status row is visible. Otherwise the unmount would race
  // the announcement.
  const hasPendingAnnouncement =
    showRuntimeStatus && Boolean(refreshCompletedMessage);
  const hasStatusStack =
    hasRuntimeStatus || hasSetupPrompts || hasPendingAnnouncement;
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
      {showRuntimeStatus && (
        <p className="sr-only" role="status" aria-live="polite">
          {refreshCompletedMessage}
        </p>
      )}
      {showRuntimeStatus && locationNotice && !showPermissionOnboarding && !showLocationSetupPrompt && (
        <p className="location-notice" role="status" aria-live="polite">
          <span className="location-notice-label">Location</span>
          <span className="location-notice-text">{locationNotice}</span>
        </p>
      )}
      {showSetupPrompts && showPermissionOnboarding && (
        <section className="permission-onboarding" aria-label="Location onboarding">
          <p className="permission-onboarding-kicker">Welcome</p>
          <h2 className="permission-onboarding-title">
            Pick a location to make Aura yours
          </h2>
          <p className="permission-onboarding-copy">
            Real-time conditions, hourly outlook, 7-day forecast, and storm
            context — built around the place you actually live. Showing
            Chicago in the meantime.
          </p>
          <div className="permission-onboarding-actions">
            {isGeolocationSupported && (
              <button
                type="button"
                className="location-setup-btn location-setup-btn--primary"
                onClick={onUseCurrentLocation}
                disabled={isLocatingCurrent}
                aria-busy={isLocatingCurrent || undefined}
              >
                {isLocatingCurrent ? "Requesting permission…" : "Use my location"}
              </button>
            )}
            <button
              type="button"
              className={`location-setup-btn ${
                isGeolocationSupported ? "" : "location-setup-btn--primary"
              }`.trim()}
              onClick={onFocusCitySearch}
            >
              Search a city
            </button>
            <button
              type="button"
              className="location-setup-btn location-setup-btn--ghost"
              onClick={onDismissPermissionOnboarding}
            >
              Keep showing Chicago
            </button>
          </div>
        </section>
      )}
      {showSetupPrompts && showLocationSetupPrompt && (
        <section className="location-setup-prompt" aria-label="Location setup">
          <p className="location-setup-title">
            {isGeolocationSupported
              ? "Use your location or search any city."
              : "Search any city. Browser location is unavailable here."}
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
      {showRuntimeStatus && serviceWorkerUpdateAvailable && (
        <div className="app-status app-status--update" role="status" aria-live="polite">
          <span className="app-status-message">
            App update ready. Refresh when you have a moment.
          </span>
          <span className="app-status-actions">
            <button
              type="button"
              className="app-status-action app-status-action--primary"
              onClick={onRefreshServiceWorkerUpdate}
              disabled={isServiceWorkerRefreshing}
              aria-busy={isServiceWorkerRefreshing || undefined}
            >
              {isServiceWorkerRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              className="app-status-action"
              onClick={onDismissServiceWorkerUpdate}
              disabled={isServiceWorkerRefreshing}
            >
              Later
            </button>
          </span>
        </div>
      )}
      {showRuntimeStatus && serviceWorkerOfflineReady && (
        <div className="app-status app-status--ready" role="status" aria-live="polite">
          <span className="app-status-message">
            Offline shell ready. Aura can reopen after the network drops.
          </span>
          <span className="app-status-actions">
            <button
              type="button"
              className="app-status-action"
              onClick={onDismissServiceWorkerOfflineReady}
            >
              Got it
            </button>
          </span>
        </div>
      )}
      {showRuntimeStatus && installPromptAvailable && (
        <div className="app-status app-status--install" role="status" aria-live="polite">
          <span className="app-status-message">
            Install Aura for faster daily access.
          </span>
          <span className="app-status-actions">
            <button
              type="button"
              className="app-status-action app-status-action--primary"
              onClick={onInstallApp}
              disabled={isInstallPromptOpening}
              aria-busy={isInstallPromptOpening || undefined}
            >
              {isInstallPromptOpening ? "Opening..." : "Install"}
            </button>
            <button
              type="button"
              className="app-status-action"
              onClick={onDismissInstallPrompt}
              disabled={isInstallPromptOpening}
            >
              Later
            </button>
          </span>
        </div>
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
