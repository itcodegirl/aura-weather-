import { useEffect, useRef } from "react";
import { toFiniteNumber } from "../utils/numbers.js";

/*
 * URL-state sync for the active forecast location.
 *
 * Read path: parseLocationFromUrl() inspects window.location.search
 * once on cold load. If a valid lat/lon pair is present (with
 * optional name + country), it is returned for the initial location
 * resolver in useWeather to seed instead of the persisted-location
 * default. Invalid URL state is ignored — the existing flow takes
 * over.
 *
 * Write path: useUrlLocationSync watches the resolved location and
 * mirrors it into the URL via history.replaceState. We use replace
 * not push so refresh-and-share workflows do not pollute the back
 * stack. Other query params (notably ?mock=missing) are preserved.
 */

const COORDINATE_PRECISION = 4;

function getSearchParams() {
  if (typeof window === "undefined" || !window.location) {
    return null;
  }
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
}

function trimToString(value, max = 80) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
}

export function parseLocationFromUrl() {
  const params = getSearchParams();
  if (!params) {
    return null;
  }

  const lat = toFiniteNumber(params.get("lat"));
  const lon = toFiniteNumber(params.get("lon"));
  if (lat === null || lon === null) {
    return null;
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  return {
    lat,
    lon,
    name: trimToString(params.get("name")) || "Shared location",
    country: trimToString(params.get("country")),
  };
}

function buildLocationSearch(location) {
  const params = getSearchParams() ?? new URLSearchParams();
  params.set("lat", location.lat.toFixed(COORDINATE_PRECISION));
  params.set("lon", location.lon.toFixed(COORDINATE_PRECISION));
  if (typeof location.name === "string" && location.name.trim()) {
    params.set("name", trimToString(location.name));
  } else {
    params.delete("name");
  }
  if (typeof location.country === "string" && location.country.trim()) {
    params.set("country", trimToString(location.country));
  } else {
    params.delete("country");
  }
  return params.toString();
}

export function useUrlLocationSync(location) {
  const lastSyncedRef = useRef("");

  useEffect(() => {
    if (typeof window === "undefined" || !window.history?.replaceState) {
      return;
    }

    const lat = toFiniteNumber(location?.lat);
    const lon = toFiniteNumber(location?.lon);
    if (lat === null || lon === null) {
      return;
    }

    const nextSearch = buildLocationSearch({
      lat,
      lon,
      name: location.name,
      country: location.country,
    });
    if (nextSearch === lastSyncedRef.current) {
      return;
    }
    lastSyncedRef.current = nextSearch;

    const url = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    try {
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // Some embedded contexts (browser extensions, sandboxed iframes)
      // disallow history mutation. URL stays unchanged; the in-app
      // state remains correct.
    }
  }, [location?.lat, location?.lon, location?.name, location?.country]);
}
