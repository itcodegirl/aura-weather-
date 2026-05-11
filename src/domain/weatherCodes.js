import { toFiniteNumber } from "../utils/numbers.js";

/**
 * WMO weather interpretation codes from Open-Meteo.
 */
/*
 * Each descriptor's gradient is a 3-stop sky palette (horizon-warm top
 * → mid → cooler base) painted full-bleed behind the frosted-glass UI,
 * matching the bright daylight-weather aesthetic. Storms still darken
 * the scene for mood, but stop short of true black so the white UI
 * stays legible.
 */
export const weatherCodes = {
  0: { label: "Clear", icon: "clear", gradient: ["#5398d7", "#82b785", "#4d92d3"] },
  1: { label: "Mostly Clear", icon: "mostly_clear", gradient: ["#5b9ed6", "#88b98a", "#5295cf"] },
  2: { label: "Partly Cloudy", icon: "partly_cloudy", gradient: ["#7aaace", "#a4bcc2", "#6f9ec6"] },
  3: { label: "Overcast", icon: "overcast", gradient: ["#9aaeba", "#8a9ba7", "#76858f"] },
  45: { label: "Foggy", icon: "fog", gradient: ["#bdc7cc", "#aab4ba", "#929da4"] },
  48: { label: "Rime Fog", icon: "fog", gradient: ["#c2cbd0", "#aeb8bd", "#96a0a7"] },
  51: { label: "Light Drizzle", icon: "drizzle", gradient: ["#7d9fb6", "#67889c", "#52707f"] },
  53: { label: "Drizzle", icon: "drizzle", gradient: ["#6f93ac", "#5b7d92", "#496776"] },
  55: { label: "Heavy Drizzle", icon: "drizzle", gradient: ["#647f93", "#516b7d", "#3f5663"] },
  56: { label: "Freezing Drizzle", icon: "drizzle", gradient: ["#8fb6c6", "#6f9aac", "#5a8496"] },
  57: { label: "Heavy Freezing Drizzle", icon: "drizzle", gradient: ["#7da6b6", "#62909e", "#4d7886"] },
  61: { label: "Light Rain", icon: "rain", gradient: ["#6a8499", "#54697c", "#3f5161"] },
  63: { label: "Rain", icon: "rain", gradient: ["#5a7388", "#46596b", "#33424f"] },
  65: { label: "Heavy Rain", icon: "rain", gradient: ["#4f6577", "#3c4d5c", "#2b3743"] },
  66: { label: "Freezing Rain", icon: "rain", gradient: ["#7aa3b3", "#5d8494", "#48677a"] },
  67: { label: "Heavy Freezing Rain", icon: "rain", gradient: ["#6b95a4", "#527684", "#3f5d6b"] },
  71: { label: "Light Snow", icon: "snow", gradient: ["#d6e7f1", "#c2d6e6", "#aec8dc"] },
  73: { label: "Snow", icon: "snow", gradient: ["#cbe1ee", "#b4cfe2", "#9fc2da"] },
  75: { label: "Heavy Snow", icon: "snow", gradient: ["#bfd9e9", "#a6c6da", "#8eb5cf"] },
  77: { label: "Snow Grains", icon: "snow", gradient: ["#d2e3ef", "#bdd3e4", "#a8c5db"] },
  80: { label: "Rain Showers", icon: "showers", gradient: ["#6f8ea6", "#58748a", "#445e6e"] },
  81: { label: "Showers", icon: "showers", gradient: ["#647f97", "#506a7e", "#3d5362"] },
  82: { label: "Heavy Showers", icon: "showers", gradient: ["#566c7e", "#42535f", "#313e48"] },
  85: { label: "Light Snow Showers", icon: "showers", gradient: ["#c9def0", "#b1cce2", "#9bc0d9"] },
  86: { label: "Heavy Snow Showers", icon: "showers", gradient: ["#bcd6ea", "#a3c4da", "#8bb3cf"] },
  95: { label: "Thunderstorm", icon: "thunderstorm", gradient: ["#4d5867", "#3a4452", "#2b333d"] },
  96: { label: "Storm with Hail", icon: "severe", gradient: ["#454f5d", "#333c47", "#262d36"] },
  99: { label: "Severe Storm", icon: "severe", gradient: ["#3b4350", "#2c333d", "#20262e"] },
};

export function getWeather(code) {
  const numericCode = toFiniteNumber(code);
  if (numericCode === null) {
    return weatherCodes[0];
  }

  const normalizedCode = Math.trunc(numericCode);
  return weatherCodes[normalizedCode] || weatherCodes[0];
}

export function gradientCss(gradient) {
  if (!Array.isArray(gradient) || gradient.length < 3) {
    return "linear-gradient(180deg, #5398d7 0%, #82b785 50%, #4d92d3 100%)";
  }

  return `linear-gradient(180deg, ${gradient[0]} 0%, ${gradient[1]} 50%, ${gradient[2]} 100%)`;
}

