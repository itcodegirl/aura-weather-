import { useState, useCallback } from "react";
import "./App.css";
import { useWeather } from "./hooks/useWeather";
import { getWeather, gradientCss } from "./utils/weatherCodes";
import HeroCard from "./components/HeroCard";
import RainCard from "./components/RainCard";
import ForecastCard from "./components/ForecastCard";
import StormWatch from "./components/StormWatch";
import HourlyCard from "./components/HourlyCard";
import CitySearch from "./components/CitySearch";
import WeatherIcon from "./components/WeatherIcon";

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(Math.max(numeric, min), max);
}

function polarToCartesian(cx, cy, r, angle) {
  const rad = (Math.PI / 180) * angle;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function ArcGauge({
  value,
  min = 0,
  max,
  statusColor = "#f97316",
  label,
  decimals = 0,
}) {
  const safe = clamp(value, min, max);
  const span = clamp(max - min, 0.0001, Number.POSITIVE_INFINITY);
  const progress = (safe - min) / span;
  const cx = 58;
  const cy = 60;
  const r = 44;
  const start = -140;
  const end = 100;
  const safeValue = Number.isFinite(value) ? value.toFixed(decimals) : "\u2014";

  return (
    <div className="metric-gauge" aria-label={`${label} ${safeValue}`}>
      <svg className="metric-gauge-svg" viewBox="0 0 116 120" role="img">
        <path
          className="metric-gauge-track"
          d={arcPath(cx, cy, r, start, end)}
        />
        <path
          className="metric-gauge-fill"
          d={arcPath(cx, cy, r, start, start + (end - start) * progress)}
          stroke={statusColor}
        />
      </svg>
      <div className="metric-gauge-value">{safeValue}</div>
    </div>
  );
}

function App() {
  const [unit, setUnit] = useState("F");
  const {
    weather,
    location,
    loading,
    error,
    locationNotice,
    loadWeather,
    retryWeather,
  } = useWeather(unit);

  const convertTemp = useCallback(
    (f) => (unit === "F" ? Math.round(f) : Math.round(((f - 32) * 5) / 9)),
    [unit]
  );

  const getAqiStatus = (aqi) => {
    if (aqi === null || aqi === undefined) {
      return { label: "", color: "rgba(148, 163, 184, 0.92)" };
    }
    if (aqi <= 50) {
      return { label: "Good", color: "#22c55e" };
    }
    if (aqi <= 100) {
      return { label: "Moderate", color: "#eab308" };
    }
    return { label: "Unhealthy", color: "#ef4444" };
  };

  const getUvStatus = (uv) => {
    if (uv === null || uv === undefined) {
      return { label: "", color: "rgba(148, 163, 184, 0.92)" };
    }
    if (uv <= 2) {
      return { label: "Low", color: "#22c55e" };
    }
    if (uv <= 5) {
      return { label: "Moderate", color: "#eab308" };
    }
    if (uv <= 7) {
      return { label: "High", color: "#f97316" };
    }
    if (uv <= 10) {
      return { label: "Very High", color: "#f43f5e" };
    }
    return { label: "Extreme", color: "#7f1d1d" };
  };

  if (loading) {
    return (
      <div className="app app--loading">
        <div
          className="loader"
          role="status"
          aria-live="polite"
          aria-label="Loading weather data"
        >
          <WeatherIcon
            code={0}
            size={80}
            className="loader-weather-icon"
          />
          <p className="loader-text">Fetching atmosphere{"\u2026"}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app app--error">
        <div className="error-card">
          <h1>Something went sideways</h1>
          <p>{error}</p>
          <button
            type="button"
            className="error-retry"
            onClick={retryWeather}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const weatherInfo = getWeather(weather.current.weather_code);
  const background = gradientCss(weatherInfo.gradient);
  const uvToday = weather.daily?.uv_index_max?.[0];
  const aqiStatus = getAqiStatus(weather.aqi);
  const uvStatus = getUvStatus(uvToday);

  return (
    <div className="app" style={{ background }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="ambient-blob ambient-blob--tl" />
      <div className="ambient-blob ambient-blob--br" />

      <div className="app-inner">
        <header className="app-header">
          <div>
            <h1 className="brand">Aura</h1>
            <p className="tagline">Atmospheric Intelligence</p>
          </div>

          <div className="app-header-actions">
            <CitySearch
              onSelect={(city) =>
                loadWeather(city.lat, city.lon, city.name, city.country)
              }
            />

            <div className="unit-toggle" role="group" aria-label="Temperature unit">
              <button
                onClick={() => setUnit("F")}
                className={`unit-btn ${unit === "F" ? "is-active" : ""}`}
                aria-pressed={unit === "F"}
              >
                {"\u00B0F"}
              </button>
              <button
                onClick={() => setUnit("C")}
                className={`unit-btn ${unit === "C" ? "is-active" : ""}`}
                aria-pressed={unit === "C"}
              >
                {"\u00B0C"}
              </button>
            </div>
          </div>
        </header>

        {locationNotice && (
          <p className="location-notice" role="status" aria-live="polite">
            {locationNotice}
          </p>
        )}

        <main className="bento" id="main-content">
          <HeroCard
            weather={weather}
            location={location}
            unit={unit}
            convertTemp={convertTemp}
            style={{ "--i": 0 }}
          />

          <section className="bento-aqi metric-card" style={{ "--i": 1 }}>
            <span className="metric-label">Air Quality</span>
            <ArcGauge
              value={weather.aqi}
              max={300}
              statusColor={aqiStatus.color}
              decimals={0}
              label="Air quality index"
            />
            {aqiStatus.label && (
              <span className="metric-pill" style={{ "--status-color": aqiStatus.color }}>
                <span className="metric-dot" />
                <span>{aqiStatus.label}</span>
              </span>
            )}
          </section>

          <section className="bento-uv metric-card" style={{ "--i": 2 }}>
            <span className="metric-label">UV Index</span>
            <ArcGauge
              value={uvToday}
              max={11}
              statusColor={uvStatus.color}
              decimals={1}
              label="UV index"
            />
            {uvStatus.label && (
              <span className="metric-pill" style={{ "--status-color": uvStatus.color }}>
                <span className="metric-dot" />
                <span>{uvStatus.label}</span>
              </span>
            )}
          </section>

          <RainCard weather={weather} style={{ "--i": 3 }} />
          <HourlyCard
            weather={weather}
            unit={unit}
            convertTemp={convertTemp}
            chartTopColor={weatherInfo?.gradient?.[0]}
            chartBottomColor={weatherInfo?.gradient?.[1]}
            style={{ "--i": 4 }}
          />
          <StormWatch
            weather={weather}
            unit={unit}
            convertTemp={convertTemp}
            style={{ "--i": 5 }}
          />
          <ForecastCard
            weather={weather}
            unit={unit}
            convertTemp={convertTemp}
          />
        </main>
      </div>
    </div>
  );
}

export default App;

