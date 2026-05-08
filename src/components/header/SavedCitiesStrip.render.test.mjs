import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { act, cleanup, render } = await import("@testing-library/react");
const SavedCitiesStrip = (await import("./SavedCitiesStrip.jsx")).default;

const TOKYO = {
  lat: 35.6762,
  lon: 139.6503,
  name: "Tokyo",
  country: "Japan",
};

afterEach(() => {
  cleanup();
});

describe("SavedCitiesStrip undo affordance", () => {
  test("shows an undo banner after a chip is removed", async () => {
    let forgetCalls = 0;
    const view = render(
      React.createElement(SavedCitiesStrip, {
        savedCities: [TOKYO],
        location: { lat: 0, lon: 0 },
        loadSavedCity: () => {},
        forgetSavedCity: () => {
          forgetCalls += 1;
        },
        restoreSavedCity: () => {},
      })
    );

    const removeButton = view.getByRole("button", {
      name: "Remove Tokyo from saved cities",
    });

    await act(async () => {
      removeButton.click();
    });

    assert.equal(forgetCalls, 1);
    const undoButton = view.getByRole("button", { name: "Undo" });
    assert.notEqual(undoButton, null);
    assert.match(view.container.textContent, /Removed/);
    assert.match(view.container.textContent, /Tokyo/);
  });

  test("clicking Undo restores the city via restoreSavedCity", async () => {
    const restored = [];
    const view = render(
      React.createElement(SavedCitiesStrip, {
        savedCities: [TOKYO],
        location: { lat: 0, lon: 0 },
        loadSavedCity: () => {},
        forgetSavedCity: () => {},
        restoreSavedCity: (city) => {
          restored.push(city);
        },
      })
    );

    await act(async () => {
      view
        .getByRole("button", { name: "Remove Tokyo from saved cities" })
        .click();
    });

    await act(async () => {
      view.getByRole("button", { name: "Undo" }).click();
    });

    assert.equal(restored.length, 1);
    assert.equal(restored[0].name, "Tokyo");
  });

  test("dismissing the undo banner closes it without restoring", async () => {
    const restored = [];
    const view = render(
      React.createElement(SavedCitiesStrip, {
        savedCities: [TOKYO],
        location: { lat: 0, lon: 0 },
        loadSavedCity: () => {},
        forgetSavedCity: () => {},
        restoreSavedCity: (city) => {
          restored.push(city);
        },
      })
    );

    await act(async () => {
      view
        .getByRole("button", { name: "Remove Tokyo from saved cities" })
        .click();
    });

    await act(async () => {
      view.getByRole("button", { name: "Dismiss undo notice" }).click();
    });

    assert.equal(restored.length, 0);
    assert.equal(
      view.container.querySelector(".saved-city-undo"),
      null
    );
  });

  test("returns null when there are no saved cities and no pending undo", () => {
    const view = render(
      React.createElement(SavedCitiesStrip, {
        savedCities: [],
        location: null,
        loadSavedCity: () => {},
        forgetSavedCity: () => {},
        restoreSavedCity: () => {},
      })
    );
    assert.equal(view.container.firstChild, null);
  });
});
