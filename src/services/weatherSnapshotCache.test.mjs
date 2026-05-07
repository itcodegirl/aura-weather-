import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  readCachedWeatherSnapshot,
  writeCachedWeatherSnapshot,
  weatherSnapshotCacheInternals,
} from "./weatherSnapshotCache.js";

const store = new Map();

function createLocalStorageMock() {
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

function installWindow() {
  globalThis.window = { localStorage: createLocalStorageMock() };
}

function restoreWindow() {
  delete globalThis.window;
}

function buildWeather(label = "cached") {
  return {
    meta: { timezone: "America/Chicago" },
    current: {
      temperature: 67,
      conditionCode: 2,
    },
    daily: {
      time: ["2026-04-21"],
      temperatureMax: [70],
      temperatureMin: [55],
    },
    label,
  };
}

function readRawCache() {
  return JSON.parse(store.get(weatherSnapshotCacheInternals.CACHE_KEY));
}

afterEach(() => {
  store.clear();
  restoreWindow();
});

describe("weather snapshot cache", () => {
  test("writes and reads a forecast snapshot by rounded coordinates", () => {
    installWindow();

    writeCachedWeatherSnapshot({
      coordinates: { latitude: 41.8781123, longitude: -87.6298123 },
      weather: buildWeather(),
      trustMeta: { weatherFetchedAt: 1_700_000_000_000 },
      cachedAt: 1_700_000_000_123,
    });

    const snapshot = readCachedWeatherSnapshot({
      latitude: 41.8781,
      longitude: -87.6298,
    });

    assert.equal(snapshot.cachedAt, 1_700_000_000_123);
    assert.equal(snapshot.weather.current.temperature, 67);
    assert.equal(snapshot.trustMeta.weatherFetchedAt, 1_700_000_000_000);
  });

  test("returns null for missing storage, corrupt JSON, invalid version, or bad coordinates", () => {
    assert.equal(
      readCachedWeatherSnapshot({ latitude: 41.8781, longitude: -87.6298 }),
      null
    );

    installWindow();
    store.set(weatherSnapshotCacheInternals.CACHE_KEY, "{not-json");
    assert.equal(
      readCachedWeatherSnapshot({ latitude: 41.8781, longitude: -87.6298 }),
      null
    );

    store.set(
      weatherSnapshotCacheInternals.CACHE_KEY,
      JSON.stringify({ version: 999, snapshots: {} })
    );
    assert.equal(
      readCachedWeatherSnapshot({ latitude: 41.8781, longitude: -87.6298 }),
      null
    );

    writeCachedWeatherSnapshot({
      coordinates: { latitude: null, longitude: -87.6298 },
      weather: buildWeather(),
    });
    assert.equal(
      readCachedWeatherSnapshot({ latitude: null, longitude: -87.6298 }),
      null
    );
  });

  test("keeps only the newest cached locations", () => {
    installWindow();

    for (let index = 0; index < 10; index += 1) {
      writeCachedWeatherSnapshot({
        coordinates: {
          latitude: 40 + index,
          longitude: -80 - index,
        },
        weather: buildWeather(`cached-${index}`),
        cachedAt: 1_700_000_000_000 + index,
      });
    }

    const payload = readRawCache();
    const snapshots = Object.values(payload.snapshots);

    assert.equal(snapshots.length, 8);
    assert.equal(
      snapshots.some((snapshot) => snapshot.weather.label === "cached-0"),
      false
    );
    assert.equal(
      snapshots.some((snapshot) => snapshot.weather.label === "cached-9"),
      true
    );
  });
});
