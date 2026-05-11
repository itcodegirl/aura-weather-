import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, cleanup } = await import("@testing-library/react");
const HourlyCard = (await import("./HourlyCard.jsx")).default;

afterEach(() => {
  cleanup();
});

function renderHourly({ hourly = null } = {}) {
  return render(
    React.createElement(HourlyCard, {
      unit: "F",
      weather: hourly ? { hourly } : {},
    })
  );
}

describe("HourlyCard aria wiring", () => {
  // Earlier the empty branch left aria-describedby={chartSummaryId} on
  // the section but did not render the matching <p id={chartSummaryId}>.
  // That left an orphan aria reference, which screen readers report as
  // "described by nothing" — confusing for users on assistive tech who
  // are told the chart has a description that is not actually present.
  test("empty branch has no orphan aria-describedby", () => {
    const { container } = renderHourly({ hourly: { time: [], temperature: [] } });
    const section = container.querySelector(".bento-chart");
    assert.ok(section, "expected the empty hourly section to render");

    const describedBy = section.getAttribute("aria-describedby");
    if (describedBy) {
      const target = container.ownerDocument.getElementById(describedBy);
      assert.ok(
        target,
        `aria-describedby="${describedBy}" must point to a real element in the same render`
      );
    }
  });

  test("populated branch wires aria-describedby to a non-empty sr-only summary", () => {
    const now = new Date();
    const hours = Array.from({ length: 6 }, (_, i) => {
      const t = new Date(now.getTime() + i * 60 * 60 * 1000);
      return t.toISOString();
    });
    const { container } = renderHourly({
      hourly: {
        time: hours,
        temperature: [60, 61, 62, 63, 64, 65],
        precipitation: [0, 0, 0, 0, 0, 0],
        rainChance: [10, 10, 10, 10, 10, 10],
      },
    });

    const section = container.querySelector(".bento-chart");
    assert.ok(section, "expected the populated hourly section to render");

    const describedBy = section.getAttribute("aria-describedby");
    assert.ok(describedBy, "populated branch should expose an aria-describedby");

    const target = container.ownerDocument.getElementById(describedBy);
    assert.ok(
      target,
      `aria-describedby="${describedBy}" must resolve to an element in the populated branch`
    );
    assert.ok(
      target.textContent.trim().length > 0,
      "the aria description should not be empty text"
    );
  });
});
