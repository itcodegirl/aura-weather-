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
import { Stat } from "./ui";
import { buildHeroData } from "./heroCard/buildHeroData";
import "./HeroCard.css";

const GUIDANCE_ICONS = {
  rain: Droplets,
  uv: Sun,
  wind: Wind,
};

function HeroCard({
  weather,
  location,
  unit,
  climateComparison,
  climateStatus = "idle",
  style,
  isRefreshing = false,
  nowMs,
}) {
  // Bucket the timestamp to one-minute granularity so the memo only
  // recomputes when the day actually rolls over (or when the user
  // crosses a minute boundary that affects sun-clock labels). The
  // hero "today" string would otherwise stay frozen at first render
  // and silently show yesterday's day name across midnight. nowMs is
  // sourced from useTimeNow in the parent, so a missing value is a
  // programming error rather than a runtime concern.
  const nowBucket = Number.isFinite(nowMs) ? Math.floor(nowMs / 60_000) : null;
  const heroData = useMemo(
    () =>
      buildHeroData({
        weather,
        location,
        unit,
        climateComparison,
        nowMs: nowBucket === null ? null : nowBucket * 60_000,
      }),
    [weather, location, unit, climateComparison, nowBucket]
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
          <div className="hero-location" aria-label="Location unavailable">
            <MapPin size={14} aria-hidden="true" />
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
    sunlightPhase,
    hasClimateComparison,
    climateMessage,
    dailyGuidance,
    today,
    tempUnit,
  } = heroData;
  const climateFallbackMessage =
    climateStatus === "loading"
      ? "Comparing today's conditions with the historical average..."
      : climateStatus === "unavailable"
        ? "Historical comparison is temporarily unavailable."
        : "";

  const isHighMissing = isMissingPlaceholder(todayHighDisplay);
  const isLowMissing = isMissingPlaceholder(todayLowDisplay);

  const sunlightPhaseClass = sunlightPhase
    ? ` hero-card--phase-${sunlightPhase}`
    : "";

  return (
    <section
      className={`bento-hero hero-card glass${sunlightPhaseClass}`}
      style={style}
      data-refreshing={isRefreshing ? "true" : undefined}
      data-sunlight-phase={sunlightPhase || undefined}
      aria-busy={isRefreshing || undefined}
    >
      <header className="hero-meta">
        <div className="hero-location-block">
          <div
            className="hero-location"
            aria-label={`Location: ${safeLocationName}${safeLocationCountry ? `, ${safeLocationCountry}` : ""}`}
          >
            <MapPin size={14} aria-hidden="true" />
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
                <span role="img" aria-label="No data available">
                  {todayHighDisplay}
                </span>
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
                <span role="img" aria-label="No data available">
                  {todayLowDisplay}
                </span>
              ) : (
                todayLowDisplay
              )}
            </span>
          </div>
        </div>
      </header>
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

      {Array.isArray(dailyGuidance) && dailyGuidance.length > 0 && (
        <div className="hero-guidance" role="list" aria-label="Daily guidance">
          {dailyGuidance.map((item) => {
            const Icon = GUIDANCE_ICONS[item.kind] ?? Sun;
            return (
              <div
                key={item.kind}
                className={`hero-guidance-item hero-guidance-item--${item.tone}`}
                role="listitem"
              >
                <div className="hero-guidance-icon">
                  <Icon size={15} aria-hidden="true" />
                </div>
                <div className="hero-guidance-copy">
                  <span className="hero-guidance-label">{item.label}</span>
                  <strong className="hero-guidance-value">{item.value}</strong>
                  <span className="hero-guidance-detail">{item.detail}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
