import { memo } from "react";
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
 * a single status dot. Stays out of the way: small, low contrast,
 * does not animate.
 */
function GlobalUpdateIndicator({ trustMeta, nowMs }) {
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

export default memo(GlobalUpdateIndicator);
