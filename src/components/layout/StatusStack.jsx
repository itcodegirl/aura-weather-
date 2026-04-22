import { memo } from "react";

function StatusStack({
  locationNotice,
  isBackgroundLoading,
  showRefreshError,
  onRetry,
}) {
  const hasStatusStack = Boolean(
    locationNotice || isBackgroundLoading || showRefreshError
  );

  if (!hasStatusStack) {
    return null;
  }

  return (
    <div className="status-stack">
      {locationNotice && (
        <p className="location-notice">
          <span className="location-notice-label">Location</span>
          <span className="location-notice-text">{locationNotice}</span>
        </p>
      )}
      {isBackgroundLoading && (
        <p className="app-status app-status--loading">
          Updating weather for your current settings...
        </p>
      )}
      {showRefreshError && (
        <div className="app-status app-status--error" role="alert">
          <span className="app-status-message">
            Could not refresh weather right now. Showing last known data.
          </span>
          <button
            type="button"
            className="app-status-retry"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(StatusStack);
