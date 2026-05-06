// src/components/HeroCard.jsx

import { memo, useMemo } from "react";
import {
  MapPin,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  Sunrise,
  Sunset,
  Sun,
} from "lucide-react";
import { isMissingPlaceholder } from "../utils/numbers";
import WeatherIcon from "./WeatherIcon";
import { DataTrustMeta, Stat } from "./ui";
import { buildHeroData } from "./heroCard/buildHeroData";
import "./HeroCard.css";

function HeroCard({
  weather,
  location,
  unit,
  climateComparison,
  showClimateContext = true,
  climateStatus = "idle",
  style,
  isRefreshing = false,
  lastUpdatedAt,
  climateLastUpdatedAt,
  nowMs,
}) {
  const heroData = useMemo(
    () => buildHeroData({ weather, location, unit, climateComparison }),
    [weather, location, unit, climateComparison]
  );

  if (!heroData) {
    return (
      <section
        className="bento-hero hero-card glass"
        style={style}
        data-refreshing={isRefreshing ? "true" : undefined}
        aria-busy={isRefreshing || undefined}
      >
        <header className="hero-meta">
          <div className="hero-location">
            <MapPin size={14} />
            <span>Location unavailable</span>
          </div>
          <p className="hero-date">Loading weather</p>
        </header>
      </section>
    );
  }

  const {
    current,
    info,
    safeLocationName,
    safeLocationCountry,
    currentTempDisplay,
    isCurrentTempMissing,
    feelsLikeDisplay,
    dewPointDisplay,
    todayHighDisplay,
    todayLowDisplay,
    windDisplay,
    humidityDisplay,
    pressureDisplay,
    heroStatsHaveAnyMissing,
    sunriseValue,
    sunsetValue,
    sunriseLabel,
    sunsetLabel,
    daylightLabel,
    hasClimateComparison,
    climateMessage,
    today,
    tempUnit,
  } = heroData;
  const shouldShowClimateMeta = showClimateContext && climateStatus !== "disabled";
  const climateMetaStatusLabel =
    climateStatus === "loading"
      ? "Loading climate context"
      : climateStatus === "unavailable"
        ? "Climate context unavailable"
        : "";
  const climateMetaTitle =
    climateStatus === "loading"
      ? "Aura Weather is comparing current conditions against the historical Open-Meteo archive."
      : climateStatus === "unavailable"
        ? "The Open-Meteo historical archive did not return a usable response for this comparison."
        : "";
  const climateFallbackMessage =
    climateStatus === "loading"
      ? "Comparing today's conditions with the historical average..."
      : climateStatus === "unavailable"
        ? "Historical comparison is temporarily unavailable."
        : "";

  const isHighMissing = isMissingPlaceholder(todayHighDisplay);
  const isLowMissing = isMissingPlaceholder(todayLowDisplay);

  return (
    <section
      className="bento-hero hero-card glass"
      style={style}
      data-refreshing={isRefreshing ? "true" : undefined}
      aria-busy={isRefreshing || undefined}
    >
      <header className="hero-meta">
        <div className="hero-location-block">
          <div className="hero-location">
            <MapPin size={14} />
            <span>
              {safeLocationName}
              {safeLocationCountry ? `, ${safeLocationCountry}` : ""}
            </span>
          </div>
          <p className="hero-date">{today}</p>
        </div>
        <div
          className="hero-high-low"
          role="group"
          aria-label={
            isHighMissing && isLowMissing
              ? "Today's high and low temperatures unavailable"
              : "Today's high and low temperatures"
          }
        >
          <div className="hero-high-low-item">
            <span className="hero-high-low-label">High</span>
            <span
              className={`hero-high-low-value${
                isHighMissing ? " is-missing" : ""
              }`}
            >
              {isHighMissing ? (
                <span aria-label="No data available">{todayHighDisplay}</span>
              ) : (
                todayHighDisplay
              )}
            </span>
          </div>
          <div className="hero-high-low-item">
            <span className="hero-high-low-label">Low</span>
            <span
              className={`hero-high-low-value${
                isLowMissing ? " is-missing" : ""
              }`}
            >
              {isLowMissing ? (
                <span aria-label="No data available">{todayLowDisplay}</span>
              ) : (
                todayLowDisplay
              )}
            </span>
          </div>
        </div>
      </header>
      <DataTrustMeta
        sourceLabel="Open-Meteo Forecast"
        lastUpdatedAt={lastUpdatedAt}
        nowMs={nowMs}
      />
      {shouldShowClimateMeta && (
        <DataTrustMeta
          sourceLabel="Open-Meteo Archive"
          lastUpdatedAt={
            climateStatus === "ready" ? climateLastUpdatedAt ?? lastUpdatedAt : null
          }
          nowMs={nowMs}
          staleAfterMinutes={120}
          statusLabel={climateMetaStatusLabel}
          titleOverride={climateMetaTitle}
        />
      )}

      <div className="hero-main">
        <div className="hero-temp-block">
          <div className="hero-temp-row">
            <div
              className={`hero-temp${isCurrentTempMissing ? " is-missing" : ""}`}
              role={isCurrentTempMissing ? "img" : undefined}
              aria-label={
                isCurrentTempMissing
                  ? "Current temperature unavailable"
                  : undefined
              }
            >
              {isCurrentTempMissing ? (
                <span aria-hidden="true">{currentTempDisplay}</span>
              ) : (
                currentTempDisplay
              )}
              {!isCurrentTempMissing && (
                <span className="hero-temp-unit">{tempUnit}</span>
              )}
            </div>
            <div className="hero-icon">
              <WeatherIcon code={current.conditionCode} size={124} animated />
            </div>
          </div>
          <div className="hero-condition">{info.label}</div>
          <div className="hero-feels">Feels like {feelsLikeDisplay}</div>
          {hasClimateComparison && (
            <p className="hero-insight">{climateMessage}</p>
          )}
          {!hasClimateComparison && climateFallbackMessage && (
            <p className="hero-insight">{climateFallbackMessage}</p>
          )}
        </div>
      </div>

      <div className="hero-sunlight" role="group" aria-label="Sunlight details">
        <div className="hero-sun-chip">
          <div className="hero-sun-label">
            <Sunrise size={14} />
            <span>Sunrise</span>
          </div>
          <time className="hero-sun-value" dateTime={sunriseValue || undefined}>
            {sunriseLabel}
          </time>
        </div>
        <div className="hero-sun-chip">
          <div className="hero-sun-label">
            <Sunset size={14} />
            <span>Sunset</span>
          </div>
          <time className="hero-sun-value" dateTime={sunsetValue || undefined}>
            {sunsetLabel}
          </time>
        </div>
        <div className="hero-sun-chip hero-sun-chip--daylight">
          <div className="hero-sun-label">
            <Sun size={14} />
            <span>Daylight</span>
          </div>
          <div className="hero-sun-value">{daylightLabel}</div>
        </div>
      </div>

      <div className="hero-stats">
        <Stat
          icon={<Wind size={18} />}
          label="Wind"
          value={windDisplay}
        />
        <Stat
          icon={<Droplets size={18} />}
          label="Humidity"
          value={humidityDisplay}
        />
        <Stat
          icon={<Gauge size={18} />}
          label="Pressure"
          value={pressureDisplay}
        />
        <Stat
          icon={<Thermometer size={18} />}
          label="Dew Point"
          value={dewPointDisplay}
        />
      </div>
      {heroStatsHaveAnyMissing && (
        <p className="hero-stats-note" role="status">
          Some readings are unavailable from the provider. Aura shows
          “—” instead of a fallback value to keep the rest of the
          forecast trustworthy.
        </p>
      )}
    </section>
  );
}

export default memo(HeroCard);
