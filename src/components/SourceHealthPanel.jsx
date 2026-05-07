import { memo, useMemo } from "react";
import {
  Activity,
  CloudSun,
  Database,
  ShieldAlert,
  Wind,
} from "lucide-react";
import { formatLastUpdatedLabel } from "../utils/dataTrust";
import "./SourceHealthPanel.css";

function getForecastSource(trustMeta, nowMs) {
  const weatherFetchedAt = trustMeta?.weatherFetchedAt ?? null;
  const cacheStatus = trustMeta?.cacheStatus ?? "idle";
  const forecastStatus = trustMeta?.forecastStatus ?? "idle";

  if (cacheStatus === "restored") {
    return {
      key: "forecast",
      icon: CloudSun,
      name: "Forecast",
      provider: "Open-Meteo",
      status: "cached",
      label: "Saved",
      detail: weatherFetchedAt
        ? formatLastUpdatedLabel(weatherFetchedAt, nowMs)
        : "Last live update unavailable",
    };
  }

  if (weatherFetchedAt) {
    return {
      key: "forecast",
      icon: CloudSun,
      name: "Forecast",
      provider: "Open-Meteo",
      status: "ready",
      label: "Live",
      detail: formatLastUpdatedLabel(weatherFetchedAt, nowMs),
    };
  }

  return {
    key: "forecast",
    icon: CloudSun,
    name: "Forecast",
    provider: "Open-Meteo",
    status: forecastStatus === "unavailable" ? "unavailable" : "pending",
    label: forecastStatus === "unavailable" ? "Issue" : "Pending",
    detail: "Waiting for current conditions",
  };
}

function getAqiSource(trustMeta, nowMs) {
  const aqiFetchedAt = trustMeta?.aqiFetchedAt ?? null;
  const aqiStatus = trustMeta?.aqiStatus ?? "idle";

  if (aqiFetchedAt) {
    return {
      key: "aqi",
      icon: Wind,
      name: "Air Quality",
      provider: "Open-Meteo AQI",
      status: "ready",
      label: "Live",
      detail: formatLastUpdatedLabel(aqiFetchedAt, nowMs),
    };
  }

  if (aqiStatus === "unavailable") {
    return {
      key: "aqi",
      icon: Wind,
      name: "Air Quality",
      provider: "Open-Meteo AQI",
      status: "unavailable",
      label: "No reading",
      detail: "AQI is missing or unreachable",
    };
  }

  return {
    key: "aqi",
    icon: Wind,
    name: "Air Quality",
    provider: "Open-Meteo AQI",
    status: "pending",
    label: "Pending",
    detail: "Checking after forecast load",
  };
}

function getAlertsSource(trustMeta, nowMs) {
  const alertsFetchedAt = trustMeta?.alertsFetchedAt ?? null;
  const alertsStatus = trustMeta?.alertsStatus ?? "idle";

  if (alertsStatus === "ready") {
    return {
      key: "alerts",
      icon: ShieldAlert,
      name: "Alerts",
      provider: "NOAA / NWS",
      status: "ready",
      label: "Live",
      detail: alertsFetchedAt
        ? formatLastUpdatedLabel(alertsFetchedAt, nowMs)
        : "No active alerts returned",
    };
  }

  if (alertsStatus === "unsupported") {
    return {
      key: "alerts",
      icon: ShieldAlert,
      name: "Alerts",
      provider: "NOAA / NWS",
      status: "limited",
      label: "Not covered",
      detail: "U.S. alerts only",
    };
  }

  if (alertsStatus === "unavailable") {
    return {
      key: "alerts",
      icon: ShieldAlert,
      name: "Alerts",
      provider: "NOAA / NWS",
      status: "unavailable",
      label: "Issue",
      detail: "Provider did not respond",
    };
  }

  return {
    key: "alerts",
    icon: ShieldAlert,
    name: "Alerts",
    provider: "NOAA / NWS",
    status: "pending",
    label: "Checking",
    detail: "Coverage lookup in progress",
  };
}

function getClimateSource(trustMeta, nowMs) {
  const climateFetchedAt = trustMeta?.climateFetchedAt ?? null;
  const climateStatus = trustMeta?.climateStatus ?? "idle";

  if (climateStatus === "ready") {
    return {
      key: "climate",
      icon: Database,
      name: "Climate Context",
      provider: "Open-Meteo Archive",
      status: "ready",
      label: "Live",
      detail: climateFetchedAt
        ? formatLastUpdatedLabel(climateFetchedAt, nowMs)
        : "Archive comparison ready",
    };
  }

  if (climateStatus === "disabled") {
    return {
      key: "climate",
      icon: Database,
      name: "Climate Context",
      provider: "Open-Meteo Archive",
      status: "limited",
      label: "Reduced data",
      detail: "Archive fetch is paused",
    };
  }

  if (climateStatus === "unavailable") {
    return {
      key: "climate",
      icon: Database,
      name: "Climate Context",
      provider: "Open-Meteo Archive",
      status: "unavailable",
      label: "Unavailable",
      detail: "Historical comparison missing",
    };
  }

  return {
    key: "climate",
    icon: Database,
    name: "Climate Context",
    provider: "Open-Meteo Archive",
    status: climateStatus === "loading" ? "pending" : "idle",
    label: climateStatus === "loading" ? "Loading" : "Pending",
    detail: "Historical lookup queued",
  };
}

function SourceHealthPanel({
  trustMeta,
  nowMs,
  style,
  isRefreshing = false,
}) {
  const sources = useMemo(
    () => [
      getForecastSource(trustMeta, nowMs),
      getAqiSource(trustMeta, nowMs),
      getAlertsSource(trustMeta, nowMs),
      getClimateSource(trustMeta, nowMs),
    ],
    [nowMs, trustMeta]
  );

  return (
    <section
      className="bento-source-health source-health-card glass"
      style={style}
      data-refreshing={isRefreshing ? "true" : undefined}
      aria-busy={isRefreshing || undefined}
      aria-labelledby="source-health-title"
    >
      <header className="source-health-header">
        <div>
          <p className="source-health-kicker">Trust layer</p>
          <h3 id="source-health-title" className="source-health-title">
            <Activity size={16} aria-hidden="true" />
            <span>Data Sources</span>
          </h3>
        </div>
        <p className="source-health-summary">
          Forecast, AQI, alerts, and archive checks.
        </p>
      </header>

      <ul className="source-health-list" role="list">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <li
              key={source.key}
              className={`source-health-item source-health-item--${source.status}`}
            >
              <Icon size={17} className="source-health-icon" aria-hidden="true" />
              <div className="source-health-main">
                <p className="source-health-name">{source.name}</p>
                <p className="source-health-provider">{source.provider}</p>
              </div>
              <div className="source-health-state">
                <span className="source-health-pill">{source.label}</span>
                <span className="source-health-detail">{source.detail}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default memo(SourceHealthPanel);
