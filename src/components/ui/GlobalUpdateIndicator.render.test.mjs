import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";

import "../../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, cleanup } = await import("@testing-library/react");
const GlobalUpdateIndicator = (await import("./GlobalUpdateIndicator.jsx"))
  .default;

afterEach(() => {
  cleanup();
});

const ANNOUNCEMENT_TEXT = "Forecast updated.";

function getAnnouncement(container) {
  // The announcement region is the last `.sr-only[role=status]` rendered
  // by the indicator subtree. We don't query by role globally because
  // other parts of the indicator carry no status role and we want to be
  // tight about which element we're inspecting.
  return container.querySelector('.sr-only[role="status"]');
}

describe("GlobalUpdateIndicator refresh-completion announcement", () => {
  test("does not announce on initial mount when not refreshing", () => {
    const { container } = render(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: 1_700_000_000_000 },
        nowMs: 1_700_000_000_000,
        onRefresh() {},
        isRefreshing: false,
      })
    );

    const region = getAnnouncement(container);
    assert.ok(region, "announcement region renders");
    assert.equal(region.textContent.trim(), "");
  });

  test("does not announce on initial mount even if isRefreshing starts true", () => {
    const { container } = render(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: 1_700_000_000_000 },
        nowMs: 1_700_000_000_000,
        onRefresh() {},
        isRefreshing: true,
      })
    );

    const region = getAnnouncement(container);
    assert.equal(region.textContent.trim(), "");
  });

  test("announces when isRefreshing flips true → false AND fetch timestamp advances", () => {
    const initialFetchedAt = 1_700_000_000_000;
    const updatedFetchedAt = 1_700_000_300_000;

    const { container, rerender } = render(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: initialFetchedAt },
        nowMs: initialFetchedAt,
        onRefresh() {},
        isRefreshing: true,
      })
    );

    rerender(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: updatedFetchedAt },
        nowMs: updatedFetchedAt,
        onRefresh() {},
        isRefreshing: false,
      })
    );

    const region = getAnnouncement(container);
    assert.equal(region.textContent.trim(), ANNOUNCEMENT_TEXT);
  });

  test("does not announce when refresh ends but the fetch timestamp is unchanged (failed refresh)", () => {
    const fetchedAt = 1_700_000_000_000;

    const { container, rerender } = render(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: fetchedAt },
        nowMs: fetchedAt,
        onRefresh() {},
        isRefreshing: true,
      })
    );

    rerender(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: fetchedAt },
        nowMs: fetchedAt,
        onRefresh() {},
        isRefreshing: false,
      })
    );

    const region = getAnnouncement(container);
    assert.equal(region.textContent.trim(), "");
  });

  test("does not announce when neither isRefreshing nor fetchedAt changed", () => {
    const fetchedAt = 1_700_000_000_000;

    const { container, rerender } = render(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: fetchedAt },
        nowMs: fetchedAt,
        onRefresh() {},
        isRefreshing: false,
      })
    );

    rerender(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: fetchedAt },
        nowMs: fetchedAt + 60_000,
        onRefresh() {},
        isRefreshing: false,
      })
    );

    const region = getAnnouncement(container);
    assert.equal(region.textContent.trim(), "");
  });

  test("announcement region carries aria-live polite + atomic so SR users hear the change", () => {
    const { container } = render(
      React.createElement(GlobalUpdateIndicator, {
        trustMeta: { weatherFetchedAt: 1_700_000_000_000 },
        nowMs: 1_700_000_000_000,
        onRefresh() {},
        isRefreshing: false,
      })
    );

    const region = getAnnouncement(container);
    assert.equal(region.getAttribute("aria-live"), "polite");
    assert.equal(region.getAttribute("aria-atomic"), "true");
    assert.equal(region.getAttribute("role"), "status");
  });
});
