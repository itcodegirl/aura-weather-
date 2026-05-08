import { lazy, memo, Suspense } from "react";
import HeroCard from "../HeroCard";
import RainCard from "../RainCard";
import ExposureSection from "../ExposureSection";
import SourceHealthPanel from "../SourceHealthPanel";
import { CardFallback } from "../ui";
import { useDeferredMount } from "../../hooks/useDeferredMount";
import { usePanelPreload } from "../../hooks/useAppShellEffects";
import { useTimeNow } from "../../hooks/useTimeNow";
import { PRELOAD_HEAVY_PANELS } from "../lazyPanels";
import "./WeatherDashboard.css";
const SupplementalWeatherPanels = lazy(() => import("./SupplementalWeatherPanels"));

const CARD_STYLE_VARIABLES = [
  { "--i": 0 },
  { "--i": 1 },
  { "--i": 2 },
  { "--i": 3 },
  { "--i": 4 },
  { "--i": 5 },
  { "--i": 6 },
  { "--i": 7 },
  { "--i": 8 },
];

const GROUP_LABEL_STYLE_VARIABLES = [
  { "--group-i": 0 },
  { "--group-i": 1 },
  { "--group-i": 2 },
  { "--group-i": 3 },
  { "--group-i": 4 },
];

const GROUP_LABEL_IDS = {
  currentConditions: "group-current-conditions",
  nearTermOutlook: "group-near-term-outlook",
  riskSignals: "group-risk-signals",
  weekAhead: "group-week-ahead",
};

function WeatherDashboard({
  weather,
  location,
  unit,
  weatherDataUnit,
  climateComparison,
  showClimateContext,
  isBackgroundLoading,
  weatherInfo,
  trustMeta,
  prefersReducedData = false,
}) {
  const nowMs = useTimeNow();
  const showSupplementalPanels = useDeferredMount(Boolean(weather));

  usePanelPreload(PRELOAD_HEAVY_PANELS, {
    enabled: !prefersReducedData,
  });

  const weatherFetchedAt = trustMeta?.weatherFetchedAt ?? null;
  const aqiFetchedAt = trustMeta?.aqiFetchedAt ?? null;
  const aqiStatus = trustMeta?.aqiStatus ?? "idle";
  const climateFetchedAt = trustMeta?.climateFetchedAt ?? null;
  const climateStatus = trustMeta?.climateStatus ?? "idle";

  return (
    <main
      className="bento"
      id="main-content"
      aria-busy={isBackgroundLoading}
      tabIndex={-1}
    >
      <h2
        id={GROUP_LABEL_IDS.currentConditions}
        className="bento-group-label"
        style={GROUP_LABEL_STYLE_VARIABLES[0]}
      >
        Current Conditions
      </h2>
      <HeroCard
        weather={weather}
        location={location}
        unit={unit}
        climateComparison={climateComparison}
        showClimateContext={showClimateContext}
        climateStatus={climateStatus}
        style={CARD_STYLE_VARIABLES[0]}
        isRefreshing={isBackgroundLoading}
        lastUpdatedAt={weatherFetchedAt}
        nowMs={nowMs}
        climateLastUpdatedAt={climateFetchedAt}
      />

      <ExposureSection
        aqi={weather?.aqi}
        aqiStatus={aqiStatus}
        uvIndex={weather?.daily?.uvIndexMax?.[0]}
        style={CARD_STYLE_VARIABLES[1]}
        isRefreshing={isBackgroundLoading}
        lastUpdatedAt={aqiFetchedAt ?? weatherFetchedAt}
        nowMs={nowMs}
      />

      <h2
        id={GROUP_LABEL_IDS.nearTermOutlook}
        className="bento-group-label"
        style={GROUP_LABEL_STYLE_VARIABLES[1]}
      >
        Near-Term Outlook
      </h2>
      <RainCard
        weather={weather}
        unit={unit}
        dataUnit={weatherDataUnit}
        style={CARD_STYLE_VARIABLES[2]}
        isRefreshing={isBackgroundLoading}
        lastUpdatedAt={weatherFetchedAt}
        nowMs={nowMs}
      />
      {showSupplementalPanels ? (
        <Suspense
          fallback={(
            <CardFallback
              className="bento-supplemental-loading"
              style={CARD_STYLE_VARIABLES[3]}
              title="Loading extended weather details..."
              isRefreshing={isBackgroundLoading}
            />
          )}
        >
          <SupplementalWeatherPanels
            weather={weather}
            unit={unit}
            weatherInfo={weatherInfo}
            trustMeta={trustMeta}
            cardStyleVariables={CARD_STYLE_VARIABLES}
            groupLabelStyleVariables={GROUP_LABEL_STYLE_VARIABLES}
            groupLabelIds={GROUP_LABEL_IDS}
            nowMs={nowMs}
            isBackgroundLoading={isBackgroundLoading}
          />
        </Suspense>
      ) : (
        <CardFallback
          className="bento-supplemental-loading"
          style={CARD_STYLE_VARIABLES[3]}
          title="Loading extended weather details..."
          isRefreshing={isBackgroundLoading}
        />
      )}
      <details className="data-status-disclosure">
        <summary className="data-status-summary">
          <span className="data-status-summary-label">Data status</span>
          <span className="data-status-summary-hint">
            Forecast, AQI, alerts, and archive checks
          </span>
        </summary>
        <SourceHealthPanel
          trustMeta={trustMeta}
          nowMs={nowMs}
          style={CARD_STYLE_VARIABLES[8]}
          isRefreshing={isBackgroundLoading}
        />
      </details>
    </main>
  );
}

function areWeatherDashboardPropsEqual(prevProps, nextProps) {
  return (
    prevProps.weather === nextProps.weather &&
    prevProps.location === nextProps.location &&
    prevProps.unit === nextProps.unit &&
    prevProps.weatherDataUnit === nextProps.weatherDataUnit &&
    prevProps.climateComparison === nextProps.climateComparison &&
    prevProps.showClimateContext === nextProps.showClimateContext &&
    prevProps.isBackgroundLoading === nextProps.isBackgroundLoading &&
    prevProps.weatherInfo === nextProps.weatherInfo &&
    prevProps.trustMeta === nextProps.trustMeta &&
    prevProps.prefersReducedData === nextProps.prefersReducedData
  );
}

export default memo(WeatherDashboard, areWeatherDashboardPropsEqual);
