import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import { readReducedDataPreference } from "./usePrefersReducedData.js";

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

function setGlobalProperty(name, value) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

function restoreGlobalProperty(name, descriptor) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    delete globalThis[name];
  }
}

afterEach(() => {
  restoreGlobalProperty("window", originalWindowDescriptor);
  restoreGlobalProperty("navigator", originalNavigatorDescriptor);
});

describe("readReducedDataPreference", () => {
  test("returns false when no browser preference APIs are available", () => {
    restoreGlobalProperty("window", null);
    restoreGlobalProperty("navigator", null);

    assert.equal(readReducedDataPreference(), false);
  });

  test("returns true when prefers-reduced-data matches", () => {
    setGlobalProperty("window", {
      matchMedia: () => ({ matches: true }),
      navigator: {},
    });

    assert.equal(readReducedDataPreference(), true);
  });

  test("honors navigator.connection.saveData even without media query support", () => {
    setGlobalProperty("window", {
      navigator: {
        connection: { saveData: true },
      },
    });

    assert.equal(readReducedDataPreference(), true);
  });

  test("falls back to false when matchMedia throws", () => {
    setGlobalProperty("window", {
      matchMedia: () => {
        throw new Error("unsupported");
      },
      navigator: {},
    });

    assert.equal(readReducedDataPreference(), false);
  });
});
