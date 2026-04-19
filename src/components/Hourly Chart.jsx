// src/components/HourlyChart.jsx

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { LineChart as LineIcon } from "lucide-react";
import { getWeather } from "../utils/weatherCodes";

/**
 * Builds a clean array of { time, temp, code } for the next 24 hours,
 * starting from the current hour.
 */
function buildHourlyData(hourly, convertTemp) {
  const now = new Date();
  const startIdx = hourly.time.findIndex((t) => new Date(t) >= now);
  const idx = startIdx === -1 ? 0 : startIdx;

  return hourly.time.slice(idx, idx + 24).map((t, i) => {
    const date = new Date(t);
    return {
      time: date,
      label: date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      shortLabel: date.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }).replace(" ", ""),
      temp: convertTemp(hourly.temperature_2m[idx + i]),
      code: hourly.weather_code[idx + i],
    };
  });
}

/**
 * Custom tooltip shown on hover.
 * Much cleaner than Recharts' default styling.
 */
function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const info = getWeather(data.code);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-time">{data.label}</div>
      <div className="chart-tooltip-temp">
        {data.temp}°{unit}
      </div>
      <div className="chart-tooltip-condition">{info.label}</div>
    </div>
  );
}

export default function HourlyChart({ weather, unit, convertTemp }) {
  const data = buildHourlyData(weather.hourly, convertTemp);

  // Only show every 3rd X-axis label for breathing room
  const xTicks = data.filter((_, i) => i % 3 === 0).map((d) => d.label);

  // Compute min/max so Y-axis padding looks intentional
  const temps = data.map((d) => d.temp);
  const minTemp = Math.floor(Math.min(...temps) - 2);
  const maxTemp = Math.ceil(Math.max(...temps) + 2);

  // Current hour marker — always the first data point
  const nowLabel = data[0]?.label;

  return (
    <section className="bento-chart hourly-chart">
      <header className="chart-header">
        <div className="chart-title">
          <LineIcon size={16} />
          <span>Hourly Temperature</span>
        </div>
        <span className="chart-subtitle">Next 24 hours</span>
      </header>

      <div className="chart-body">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 20, right: 16, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="label"
              ticks={xTicks}
              interval={0}
              stroke="rgba(255,255,255,0.35)"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.65)" }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              domain={[minTemp, maxTemp]}
              stroke="rgba(255,255,255,0.35)"
              tick={{ fontSize: 10, fill: "rgba(255,255,255,0.65)" }}
              axisLine={false}
              tickLine={false}
              width={32}
              tickFormatter={(v) => `${v}°`}
            />

            <Tooltip
              content={<ChartTooltip unit={unit} />}
              cursor={{
                stroke: "rgba(255,255,255,0.3)",
                strokeDasharray: "4 4",
              }}
            />

            <ReferenceLine
              x={nowLabel}
              stroke="rgba(255,255,255,0.4)"
              strokeDasharray="3 3"
              label={{
                value: "Now",
                position: "top",
                fill: "rgba(255,255,255,0.75)",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            <Area
              type="monotone"
              dataKey="temp"
              stroke="#fbbf24"
              strokeWidth={2.5}
              fill="url(#tempGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#fff",
                stroke: "#fbbf24",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}