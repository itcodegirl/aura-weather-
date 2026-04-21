import { memo } from "react";
import { formatSunClock, formatDaylightLengthLabel } from "../utils/sunlight";
import "./MetricPanels.css";

const SUNLIGHT_LABEL_ID = "metric-sunlight";

function SunlightSection({ sunrise, sunset, style }) {
  const sunriseLabel = formatSunClock(sunrise, { maxFutureDays: 10 });
  const sunsetLabel = formatSunClock(sunset, { maxFutureDays: 10 });
  const dayLengthLabel = formatDaylightLengthLabel(sunrise, sunset);

  return (
    <section
      className="bento-sunlight metric-card glass"
      style={style}
      aria-labelledby={SUNLIGHT_LABEL_ID}
    >
      <div className="metric-head">
        <h2 id={SUNLIGHT_LABEL_ID} className="metric-label">
          Sunlight
        </h2>
        <span className="metric-context">Local</span>
      </div>
      <div className="sun-times" aria-label="Sunrise and sunset times">
        <div className="sun-time-chip">
          <span className="sun-time-label">Sunrise</span>
          <span className="sun-time-value">{sunriseLabel}</span>
        </div>
        <div className="sun-time-chip">
          <span className="sun-time-label">Sunset</span>
          <span className="sun-time-value">{sunsetLabel}</span>
        </div>
      </div>
      {dayLengthLabel ? (
        <div className="metric-sun-length">Daylight {dayLengthLabel}</div>
      ) : (
        <p className="metric-support">Daylight duration is unavailable.</p>
      )}
    </section>
  );
}

export default memo(SunlightSection);
