import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, cleanup, act, waitFor } = await import("@testing-library/react");
const {
  CURRENT_LOCATION_NAME,
  CURRENT_LOCATION_NOTICE,
  useLocation,
} = await import("./useLocation.js");

const originalGeolocation = navigator.geolocation;

function setGeolocation(value) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value,
  });
}

function LocationProbe({ onReady, onResolved }) {
  const locationApi = useLocation(onResolved);

  React.useEffect(() => {
    onReady(locationApi);
  }, [locationApi, onReady]);

  return null;
}

afterEach(() => {
  cleanup();
  setGeolocation(originalGeolocation);
});

describe("useLocation", () => {
  test("labels GPS coordinates as device location instead of a fallback city", async () => {
    let locationApi = null;
    const resolvedLocations = [];

    setGeolocation({
      getCurrentPosition(onSuccess) {
        onSuccess({
          coords: {
            latitude: 42.1234,
            longitude: -88.5678,
          },
        });
      },
    });

    render(
      React.createElement(LocationProbe, {
        onReady: (api) => {
          locationApi = api;
        },
        onResolved: (...args) => {
          resolvedLocations.push(args);
        },
      })
    );

    await waitFor(() => assert.ok(locationApi));

    await act(async () => {
      locationApi.loadCurrentLocation();
    });

    await waitFor(() => {
      const latest = resolvedLocations.at(-1);
      assert.equal(latest?.[2], CURRENT_LOCATION_NAME);
    });

    const latest = resolvedLocations.at(-1);
    assert.equal(latest[0], 42.1234);
    assert.equal(latest[1], -88.5678);
    assert.equal(latest[2], CURRENT_LOCATION_NAME);
    assert.equal(latest[3], "");
    assert.equal(latest[4], CURRENT_LOCATION_NOTICE);
  });
});
