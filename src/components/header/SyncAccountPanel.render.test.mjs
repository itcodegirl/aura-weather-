import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";

import "../../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { render, screen, fireEvent, cleanup } = await import(
  "@testing-library/react"
);
const SyncAccountPanel = (await import("./SyncAccountPanel.jsx")).default;

afterEach(() => {
  cleanup();
});

function noop() {}

describe("SyncAccountPanel default-collapsed contract", () => {
  test("starts collapsed when sync is connected — no auto-expanded body", () => {
    render(
      React.createElement(SyncAccountPanel, {
        syncConnected: true,
        syncAccount: { syncKey: "abc-123" },
        syncState: { status: "idle" },
        onCreateSyncAccount: noop,
        onConnectSyncAccount: noop,
        onDisconnectSyncAccount: noop,
        onSyncNow: noop,
      })
    );

    const toggle = screen.getByRole("button", {
      name: /expand cloud sync controls/i,
    });
    assert.equal(toggle.getAttribute("aria-expanded"), "false");

    // The disconnect / sync-now buttons live inside the body — they
    // must NOT be in the DOM when the body is collapsed.
    assert.equal(
      screen.queryByRole("button", { name: "Disconnect" }),
      null,
      "body controls must not render before the user opens the panel"
    );
    assert.equal(
      screen.queryByRole("button", { name: "Sync now" }),
      null,
      "Sync-now must not render before the user opens the panel"
    );
  });

  test("starts collapsed when sync is disconnected", () => {
    render(
      React.createElement(SyncAccountPanel, {
        syncConnected: false,
        syncAccount: null,
        syncState: { status: "idle" },
        onCreateSyncAccount: noop,
        onConnectSyncAccount: noop,
        onDisconnectSyncAccount: noop,
        onSyncNow: noop,
      })
    );

    const toggle = screen.getByRole("button", {
      name: /expand cloud sync controls/i,
    });
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.equal(
      screen.queryByRole("button", { name: "Create sync key" }),
      null
    );
  });

  test("force-opens when sync has a live error so the user can act on it", () => {
    render(
      React.createElement(SyncAccountPanel, {
        syncConnected: false,
        syncAccount: null,
        syncState: {
          status: "error",
          error: "Could not load synced locations",
        },
        onCreateSyncAccount: noop,
        onConnectSyncAccount: noop,
        onDisconnectSyncAccount: noop,
        onSyncNow: noop,
      })
    );

    // Body is force-rendered when an error exists; the connect form
    // appears even though the user did not tap the toggle.
    assert.ok(
      screen.getByRole("button", { name: "Create sync key" }),
      "create-sync-key button is reachable when an error forces the body open"
    );
    assert.ok(
      screen.getByText("Could not load synced locations"),
      "error text is visible alongside the body"
    );
  });

  test("force-opens while a sync is actively in flight", () => {
    render(
      React.createElement(SyncAccountPanel, {
        syncConnected: true,
        syncAccount: { syncKey: "abc-123" },
        syncState: { status: "syncing" },
        onCreateSyncAccount: noop,
        onConnectSyncAccount: noop,
        onDisconnectSyncAccount: noop,
        onSyncNow: noop,
      })
    );

    const syncNowButton = screen.getByRole("button", { name: "Sync now" });
    assert.ok(syncNowButton);
    assert.equal(syncNowButton.getAttribute("aria-busy"), "true");
  });

  test("clicking the toggle reveals the body and exposes the disconnect control", () => {
    render(
      React.createElement(SyncAccountPanel, {
        syncConnected: true,
        syncAccount: { syncKey: "abc-123" },
        syncState: { status: "idle" },
        onCreateSyncAccount: noop,
        onConnectSyncAccount: noop,
        onDisconnectSyncAccount: noop,
        onSyncNow: noop,
      })
    );

    const toggle = screen.getByRole("button", {
      name: /expand cloud sync controls/i,
    });
    fireEvent.click(toggle);

    assert.ok(
      screen.getByRole("button", { name: "Disconnect" }),
      "disconnect control appears once the user opens the panel"
    );
  });
});
