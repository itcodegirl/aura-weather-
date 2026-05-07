import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, screen, cleanup } = await import("@testing-library/react");
const ForecastCard = (await import("./ForecastCard.jsx")).default;

afterEach(() => {
  cleanup();
});

function todayIsoDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

describe("ForecastCard missing daily readings", () => {
  test("renders missing daily high and rain chance as unavailable, not zero", () => {
    const { container } = render(
      React.createElement(ForecastCard, {
        unit: "F",
        weather: {
          daily: {
            time: [todayIsoDate()],
            conditionCode: [2],
            temperatureMax: [null],
            temperatureMin: [55],
            rainChanceMax: [null],
          },
        },
      })
    );

    assert.ok(screen.getByLabelText("High unavailable"));
    assert.ok(screen.getByLabelText(/High unavailable, low 55 degrees/));
    assert.ok(screen.getByLabelText("Rain chance unavailable"));
    assert.equal(container.textContent.includes("0%"), false);
    assert.equal(container.textContent.includes("\u2014\u00B0"), false);
  });
});
