import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { act, cleanup, render } = await import("@testing-library/react");
const PanelErrorBoundary = (await import("./PanelErrorBoundary.jsx")).default;

let throwOnRender = true;

function FlakyChild() {
  if (throwOnRender) {
    throw new Error("kaboom");
  }
  return React.createElement("p", { "data-testid": "ok" }, "Loaded");
}

afterEach(() => {
  cleanup();
  throwOnRender = true;
});

describe("PanelErrorBoundary", () => {
  test("renders the labelled fallback with a Try again button when a child throws", () => {
    // Suppress the expected console.error from the boundary's catch.
    const originalError = console.error;
    console.error = () => {};

    const view = render(
      React.createElement(
        PanelErrorBoundary,
        { label: "Hourly outlook" },
        React.createElement(FlakyChild)
      )
    );

    assert.match(
      view.container.textContent,
      /Hourly outlook is unavailable/
    );
    const retryButton = view.getByRole("button", { name: "Try again" });
    assert.notEqual(retryButton, null);

    console.error = originalError;
  });

  test("retry remounts children so a now-stable child renders successfully", async () => {
    const originalError = console.error;
    console.error = () => {};

    const view = render(
      React.createElement(
        PanelErrorBoundary,
        { label: "Storm watch" },
        React.createElement(FlakyChild)
      )
    );

    assert.match(view.container.textContent, /Storm watch is unavailable/);

    // Flip the flag so the next render of FlakyChild succeeds, then
    // click "Try again" to remount.
    throwOnRender = false;
    const retryButton = view.getByRole("button", { name: "Try again" });

    await act(async () => {
      retryButton.click();
    });

    const ok = view.queryByTestId("ok");
    assert.notEqual(ok, null);
    assert.equal(ok.textContent, "Loaded");

    console.error = originalError;
  });
});
