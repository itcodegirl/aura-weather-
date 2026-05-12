// src/api/reverseGeocode.js
//
// Reverse geocoding for a resolved device-GPS fix. Open-Meteo's
// geocoding API is forward-only (name → coordinates), so this uses
// BigDataCloud's free, key-less, CORS-enabled `reverse-geocode-client`
// endpoint to turn raw coordinates into a human place name.
//
// This is *enrichment only*. The dashboard already renders immediately
// under the generic "Current location" label; any failure here
// (network, timeout, abort, non-OK status, unexpected shape, or simply
// no usable place name in the response) resolves to `null` so the
// generic label stays put. Nothing on the critical path depends on
// this provider being reachable.

import { parseCoordinates } from "../utils/weatherUnits.js";

const ENDPOINT = "https://api.bigdatacloud.net/data/reverse-geocode-client";
// Shorter than the Open-Meteo budget on purpose: a place name is a
// nice-to-have, not worth holding a request open for ten seconds.
const TIMEOUT_MS = 6_000;

function isAbortError(error) {
  return error?.name === "AbortError";
}

function getSignal(externalSignal) {
  const hasAbortSignal = typeof AbortSignal !== "undefined";
  const timeoutSignal =
    hasAbortSignal && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(TIMEOUT_MS)
      : undefined;

  if (!externalSignal) {
    return timeoutSignal;
  }

  if (
    timeoutSignal &&
    hasAbortSignal &&
    typeof AbortSignal.any === "function"
  ) {
    return AbortSignal.any([externalSignal, timeoutSignal]);
  }

  return externalSignal;
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function pickPlaceName(data) {
  // Prefer the most locally meaningful name available, then fall back
  // outward. BigDataCloud's `city` is often empty for rural fixes, so
  // `locality` and the principal subdivision (state / province) backstop
  // it before we give up.
  return (
    cleanString(data?.city) ||
    cleanString(data?.locality) ||
    cleanString(data?.principalSubdivision) ||
    cleanString(data?.localityInfo?.administrative?.[0]?.name) ||
    ""
  );
}

export async function reverseGeocode(latitude, longitude, options = {}) {
  const coordinates = parseCoordinates(latitude, longitude);
  if (!coordinates) {
    return null;
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(coordinates.latitude));
  url.searchParams.set("longitude", String(coordinates.longitude));
  url.searchParams.set("localityLanguage", "en");

  let response;
  try {
    response = await fetch(url, {
      signal: getSignal(options.signal),
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (isAbortError(error)) {
      // Match the openMeteo adapters: an explicit abort propagates so
      // callers can stop a stale enrichment chain. Every other failure
      // is swallowed below.
      throw error;
    }
    return null;
  }

  if (!response.ok) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return null;
  }

  const name = pickPlaceName(data);
  if (!name) {
    return null;
  }

  return {
    name,
    country: cleanString(data?.countryName),
  };
}
