import { memo } from "react";
import { RefreshCw } from "lucide-react";
import {
  formatLastUpdatedLabel,
  formatTimestampTitle,
  getAgeMinutes,
} from "../../utils/dataTrust";
import { toFiniteNumber } from "../../utils/numbers";
import "./GlobalUpdateIndicator.css";

const STALE_AFTER_MINUTES = 25;

/*
 * One pill that replaces the eight per-card DataTrustMeta lines that
 * used to clutter every section. Shows the freshest weatherFetchedAt
 * (or the cache-restored timestamp when the live request failed) plus
 * a single status dot. The pill is also a manual refresh button —
 * tapping it re-fetches the current location's forecast.
 */
function GlobalUpdateIndicator({ trustMeta, nowMs, onRefresh, isRefreshing }) {
  if (!trustMeta) {
    return null;
  }

  const cacheStatus = trustMeta.cacheStatus ?? "idle";
  const isCached = cacheStatus === "restored";
  const lastUpdatedAt = isCached
    ? toFiniteNumber(trustMeta.cacheCapturedAt) ?? trustMeta.weatherFetchedAt
    : trustMeta.weatherFetchedAt;

  const parsedNowMs = toFiniteNumber(nowMs);
  const effectiveNowMs =
    parsedNowMs !== null ? parsedNowMs : toFiniteNumber(lastUpdatedAt);
  const ageMinutes = getAgeMinutes(lastUpdatedAt, effectiveNowMs);
  const isStale =
    Number.isFinite(ageMinutes) && ageMinutes >= STALE_AFTER_MINUTES;

  if (toFiniteNumber(lastUpdatedAt) === null) {
    return null;
  }

  const updatedLabel = formatLastUpdatedLabel(lastUpdatedAt, effectiveNowMs);
  const title = formatTimestampTitle(lastUpdatedAt);
  const stateLabel = isCached ? "saved" : isStale ? "stale" : "live";

  const isClickable = typeof onRefresh === "function";

  if (!isClickable) {
    return (
      <p
        className={`global-update-indicator global-update-indicator--${stateLabel}`}
        title={title}
      >
        <span className="global-update-dot" aria-hidden="true" />
        <span className="global-update-text">{updatedLabel}</span>
        <span className="global-update-state">{stateLabel}</span>
      </p>
    );
  }

  return (
    <button
      type="button"
      className={`global-update-indicator global-update-indicator--${stateLabel} global-update-indicator--button`}
      title={`${title}. Tap to refresh.`}
      aria-label={`${updatedLabel}. Tap to refresh weather.`}
      aria-busy={isRefreshing || undefined}
      onClick={onRefresh}
      disabled={isRefreshing}
    >
      <span className="global-update-dot" aria-hidden="true" />
      <span className="global-update-text">{updatedLabel}</span>
      <span className="global-update-state">{stateLabel}</span>
      <RefreshCw
        size={12}
        className={`global-update-refresh${isRefreshing ? " is-spinning" : ""}`}
        aria-hidden="true"
      />
    </button>
  );
}

export default memo(GlobalUpdateIndicator);
