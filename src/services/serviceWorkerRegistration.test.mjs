import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  canRegisterServiceWorker,
  registerServiceWorker,
} from "./serviceWorkerRegistration.js";

function createWindowStub({ readyState = "loading", protocol = "https:" } = {}) {
  const listeners = new Map();
  return {
    document: { readyState },
    location: { protocol },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    getListener(type) {
      return listeners.get(type);
    },
  };
}

describe("service worker registration", () => {
  test("requires production opt-in, service worker support, and a non-file protocol", () => {
    assert.equal(canRegisterServiceWorker({ enabled: false }), false);
    assert.equal(
      canRegisterServiceWorker({
        enabled: true,
        navigatorRef: {},
        locationRef: { protocol: "https:" },
      }),
      false
    );
    assert.equal(
      canRegisterServiceWorker({
        enabled: true,
        navigatorRef: { serviceWorker: {} },
        locationRef: { protocol: "file:" },
      }),
      false
    );
    assert.equal(
      canRegisterServiceWorker({
        enabled: true,
        navigatorRef: { serviceWorker: {} },
        locationRef: { protocol: "https:" },
      }),
      true
    );
  });

  test("registers after load when the document is still loading", async () => {
    const windowRef = createWindowStub();
    const registeredUrls = [];
    const navigatorRef = {
      serviceWorker: {
        async register(url) {
          registeredUrls.push(url);
          return { scope: "/" };
        },
      },
    };
    const registrations = [];

    const cleanup = registerServiceWorker({
      enabled: true,
      delayMs: 0,
      windowRef,
      navigatorRef,
      serviceWorkerUrl: "/sw.js",
      onRegistered(registration) {
        registrations.push(registration);
      },
    });

    assert.equal(typeof cleanup, "function");
    assert.equal(registeredUrls.length, 0);

    await windowRef.getListener("load")();

    assert.deepEqual(registeredUrls, ["/sw.js"]);
    assert.equal(registrations[0].scope, "/");
    cleanup();
  });

  test("reports registration failures without throwing", async () => {
    const windowRef = createWindowStub();
    const expectedError = new Error("blocked");
    const errors = [];
    const navigatorRef = {
      serviceWorker: {
        async register() {
          throw expectedError;
        },
      },
    };

    registerServiceWorker({
      enabled: true,
      delayMs: 0,
      windowRef,
      navigatorRef,
      onError(error) {
        errors.push(error);
      },
    });

    await windowRef.getListener("load")();

    assert.equal(errors[0], expectedError);
  });

  test("defers registration after load by default", async () => {
    let timeoutHandler = null;
    let timeoutDelay = null;
    const windowRef = {
      ...createWindowStub(),
      setTimeout(handler, delay) {
        timeoutHandler = handler;
        timeoutDelay = delay;
        return 7;
      },
      clearTimeout() {},
    };
    const registeredUrls = [];
    const navigatorRef = {
      serviceWorker: {
        async register(url) {
          registeredUrls.push(url);
          return { scope: "/" };
        },
      },
    };

    registerServiceWorker({
      enabled: true,
      windowRef,
      navigatorRef,
    });

    await windowRef.getListener("load")();

    assert.equal(registeredUrls.length, 0);
    assert.equal(typeof timeoutHandler, "function");
    assert.equal(timeoutDelay, 8000);

    await timeoutHandler();

    assert.deepEqual(registeredUrls, ["/sw.js"]);
  });
});
