import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { buildHeroData } from "./buildHeroData.js";

const baseLocation = {
  lat: 41.8781,
  lon: -87.6298,
  name: "Chicago",
  country: "United States",
};

const baseWeather = {
  current: {
    temperature: 67.4,
    humidity: 58,
    feelsLike: 68,
    conditionCode: 2,
    windSpeed: 9.8,
    windGust: 14.2,
    windDirection: 220,
    pressure: 1014,
    dewPoint: 52,
    cloudCover: 34,
    visibility: 12000,
  },
  daily: {
    temperatureMax: [70],
    temperatureMin: [55],
    sunrise: ["2026-04-21T06:18:00-05:00"],
    sunset: ["2026-04-21T19:41:00-05:00"],
  },
};

describe("buildHeroData", () => {
  test("returns null when weather is missing", () => {
    assert.equal(
      buildHeroData({ weather: null, location: baseLocation, unit: "F" }),
      null
    );
    assert.equal(
      buildHeroData({ weather: {}, location: baseLocation, unit: "F" }),
      null
    );
  });

  test("returns null when location is missing", () => {
    assert.equal(
      buildHeroData({ weather: baseWeather, location: null, unit: "F" }),
      null
    );
  });

  test("formats real readings with unit suffixes", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: baseLocation,
      unit: "F",
    });

    assert.equal(data.currentTempDisplay, "67");
    assert.equal(data.feelsLikeDisplay, "68°F");
    assert.equal(data.dewPointDisplay, "52°F");
    assert.equal(data.todayHighDisplay, "70°F");
    assert.equal(data.todayLowDisplay, "55°F");
    assert.equal(data.humidityDisplay, "58%");
    assert.equal(data.pressureDisplay, "1014 hPa");
    assert.equal(data.tempUnit, "°F");
    assert.equal(data.isCurrentTempMissing, false);
    assert.equal(data.heroStatsHaveAnyMissing, false);
  });

  test("converts to Celsius on demand", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: baseLocation,
      unit: "C",
    });

    assert.equal(data.currentTempDisplay, "20");
    assert.equal(data.feelsLikeDisplay, "20°C");
    assert.equal(data.tempUnit, "°C");
  });

  test("renders missing placeholders without misleading unit suffixes", () => {
    const data = buildHeroData({
      weather: {
        ...baseWeather,
        current: {
          ...baseWeather.current,
          temperature: null,
          humidity: null,
          pressure: null,
          dewPoint: null,
          feelsLike: null,
        },
      },
      location: baseLocation,
      unit: "F",
    });

    assert.equal(data.currentTempDisplay, "—");
    assert.equal(data.isCurrentTempMissing, true);
    assert.equal(data.feelsLikeDisplay, "—");
    assert.equal(data.dewPointDisplay, "—");
    assert.equal(data.humidityDisplay, "—");
    assert.equal(data.pressureDisplay, "—");
    assert.equal(data.heroStatsHaveAnyMissing, true);
  });

  test("falls back to 'Current location' when location.name is empty", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: { ...baseLocation, name: "  " },
      unit: "F",
    });
    assert.equal(data.safeLocationName, "Current location");
  });

  test("trims location.name and country whitespace", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: { ...baseLocation, name: "  Chicago  ", country: "  USA " },
      unit: "F",
    });
    assert.equal(data.safeLocationName, "Chicago");
    assert.equal(data.safeLocationCountry, "USA");
  });

  test("builds a 'warmer than average' climate message in Fahrenheit", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: baseLocation,
      unit: "F",
      climateComparison: {
        difference: 12.7,
        sampleYears: 30,
        referenceDateLabel: "April 21",
      },
    });
    assert.equal(data.hasClimateComparison, true);
    assert.match(data.climateMessage, /^Today is 13°F warmer than the 30-year/);
    assert.match(data.climateMessage, /Chicago/);
  });

  test("builds a 'colder than average' climate message in Celsius", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: baseLocation,
      unit: "C",
      climateComparison: {
        difference: -9, // 9°F colder ≈ 5°C colder
        sampleYears: 25,
        referenceDateLabel: "April 21",
      },
    });
    assert.equal(data.hasClimateComparison, true);
    assert.match(data.climateMessage, /^Today is 5°C colder than the 25-year/);
  });

  test("falls back to 30-year wording when sampleYears is missing", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: baseLocation,
      unit: "F",
      climateComparison: {
        difference: 4,
        // sampleYears intentionally omitted
        referenceDateLabel: "April 21",
      },
    });
    assert.match(data.climateMessage, /30-year/);
  });

  test("rejects climate comparison when difference is null/non-finite", () => {
    const data = buildHeroData({
      weather: baseWeather,
      location: baseLocation,
      unit: "F",
      climateComparison: { difference: null, sampleYears: 30 },
    });
    assert.equal(data.hasClimateComparison, false);
    assert.equal(data.climateMessage, "");
  });

  test("flags any missing hero stat via heroStatsHaveAnyMissing", () => {
    const data = buildHeroData({
      weather: {
        ...baseWeather,
        current: { ...baseWeather.current, dewPoint: null },
      },
      location: baseLocation,
      unit: "F",
    });
    assert.equal(data.heroStatsHaveAnyMissing, true);
    assert.equal(data.dewPointDisplay, "—");
  });
});
