import { memo } from "react";
import { CloudOff } from "lucide-react";
import WeatherIcon from "../WeatherIcon";
import "./AppShell.css";

const AppLoadingState = memo(() => {
  return (
    <div className="app app--loading">
      <div
        className="loading-dashboard"
        role="status"
        aria-live="polite"
        aria-label="Loading weather dashboard"
      >
        <div className="loading-dashboard-header">
          <WeatherIcon
            code={0}
            size={42}
            animated={false}
            className="loader-weather-icon"
          />
          <div>
            <p className="loading-dashboard-brand">Aura</p>
            <p className="loader-text">Connecting to weather providers{"\u2026"}</p>
          </div>
        </div>
        <div className="loading-dashboard-grid" aria-hidden="true">
          <div className="loading-skeleton loading-skeleton--hero">
            <div className="loading-skeleton-block loading-skeleton-block--meta" />
            <div className="loading-skeleton-block loading-skeleton-block--temp" />
            <div className="loading-skeleton-block loading-skeleton-block--row" />
          </div>
          <div className="loading-skeleton loading-skeleton--panel">
            <div className="loading-skeleton-block loading-skeleton-block--meta" />
            <div className="loading-skeleton-block loading-skeleton-block--gauge" />
          </div>
          <div className="loading-skeleton loading-skeleton--wide">
            <div className="loading-skeleton-block loading-skeleton-block--meta" />
            <div className="loading-skeleton-bars" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <span
                  key={index}
                  className="loading-skeleton-bar"
                  style={{ animationDelay: `${index * 60}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

const AppErrorState = memo(({ error, onRetry }) => {
  return (
    <div className="app app--error">
      <div className="error-card" role="alert" aria-live="assertive">
        <CloudOff size={42} className="error-card-icon" aria-hidden="true" />
        <h1>We couldn't load weather data</h1>
        <p>{error}</p>
        <button
          type="button"
          className="error-retry"
          onClick={onRetry}
        >
          Reload weather
        </button>
      </div>
    </div>
  );
});

function AppShell({ background, children }) {
  return (
    <div className="app" style={{ background }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="app-inner">{children}</div>
    </div>
  );
}

export { AppLoadingState, AppErrorState };

export default memo(AppShell);
