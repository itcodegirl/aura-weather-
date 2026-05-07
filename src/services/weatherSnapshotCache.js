import { toFiniteNumber } from "../utils/numbers.js";

const CACHE_KEY = "aura-weather-last-known-forecast-v1";
const CACHE_VERSION = 1;
const MAX_CACHED_LOCATIONS = 8;

function getStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeCoordinates(coordinates) {
  const latitude = toFiniteNumber(coordinates?.latitude);
  const longitude = toFiniteNumber(coordinates?.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function getSnapshotKey(coordinates) {
  const normalized = normalizeCoordinates(coordinates);
  if (!normalized) {
    return null;
  }

  return `${normalized.latitude.toFixed(4)},${normalized.longitude.toFixed(4)}`;
}

function readCachePayload() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== CACHE_VERSION ||
      !parsed.snapshots ||
      typeof parsed.snapshots !== "object"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCachePayload(payload) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can fail in private browsing, quota pressure, or locked-down embeds.
  }
}

function isUsableSnapshot(snapshot) {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      snapshot.version === CACHE_VERSION &&
      snapshot.weather &&
      typeof snapshot.weather === "object" &&
      normalizeCoordinates(snapshot.coordinates)
  );
}

export function readCachedWeatherSnapshot(coordinates) {
  const key = getSnapshotKey(coordinates);
  if (!key) {
    return null;
  }

  const payload = readCachePayload();
  const snapshot = payload?.snapshots?.[key] ?? null;

  if (!isUsableSnapshot(snapshot)) {
    return null;
  }

  return snapshot;
}

export function writeCachedWeatherSnapshot({
  coordinates,
  weather,
  trustMeta,
  cachedAt = Date.now(),
}) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  const key = getSnapshotKey(normalizedCoordinates);

  if (!key || !weather || typeof weather !== "object") {
    return;
  }

  const payload = readCachePayload() ?? {
    version: CACHE_VERSION,
    snapshots: {},
  };

  const nextSnapshots = {
    ...payload.snapshots,
    [key]: {
      version: CACHE_VERSION,
      cachedAt,
      coordinates: normalizedCoordinates,
      weather,
      trustMeta: trustMeta && typeof trustMeta === "object" ? trustMeta : {},
    },
  };

  const entries = Object.entries(nextSnapshots)
    .filter(([, snapshot]) => isUsableSnapshot(snapshot))
    .sort(([, a], [, b]) => {
      const aCachedAt = toFiniteNumber(a.cachedAt) ?? 0;
      const bCachedAt = toFiniteNumber(b.cachedAt) ?? 0;
      return bCachedAt - aCachedAt;
    })
    .slice(0, MAX_CACHED_LOCATIONS);

  writeCachePayload({
    version: CACHE_VERSION,
    snapshots: Object.fromEntries(entries),
  });
}

export const weatherSnapshotCacheInternals = {
  CACHE_KEY,
  CACHE_VERSION,
  getSnapshotKey,
};
