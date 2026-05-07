import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, screen, cleanup } = await import("@testing-library/react");
const RainCard = (await import("./RainCard.jsx")).default;

afterEach(() => {
  cleanup();
});

function buildHourly(overrides = {}) {
  const start = new Date(Date.now() + 60_000);
  start.setSeconds(0, 0);
  const time = Array.from({ length: 24 }, (_, index) =>
    new Date(start.getTime() + index * 60 * 60 * 1000).toISOString()
  );

  return {
    time,
    rainChance: Array.from({ length: 24 }, () => 0),
    rainAmount: Array.from({ length: 24 }, () => 0),
    ...overrides,
  };
}

function getRainStatValue(label) {
  const labelEl = screen.getByText(label);
  const statEl = labelEl.closest(".rain-stat");
  return statEl?.querySelector(".rain-stat-value");
}

describe("RainCard missing precipitation accumulation", () => {
  test("does not turn unknown accumulation into a synthetic 0.00 total", () => {
    const { container } = render(
      React.createElement(RainCard, {
        weather: {
          hourly: buildHourly({
            rainAmount: Array.from({ length: 24 }, () => null),
          }),
        },
        unit: "F",
        dataUnit: "F",
      })
    );

    assert.equal(screen.queryByText("No meaningful rain expected"), null);
    assert.equal(getRainStatValue("Projected 24h total").textContent.trim(), "\u2014");
    assert.equal((container.textContent || "").includes("0.00 in"), false);
  });
});
