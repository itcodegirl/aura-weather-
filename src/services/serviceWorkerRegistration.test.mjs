import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  activateWaitingServiceWorker,
  canRegisterServiceWorker,
  getServiceWorkerRegistrationDelay,
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

function createEventTargetStub(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
    emit(type) {
      listeners.get(type)?.();
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

  test("uses a safe browser override for the registration delay", () => {
    assert.equal(getServiceWorkerRegistrationDelay({ delayMs: 1200 }), 1200);
    assert.equal(
      getServiceWorkerRegistrationDelay({
        delayMs: 1200,
        windowRef: { __AURA_SW_REGISTRATION_DELAY_MS__: 0 },
      }),
      0
    );
    assert.equal(
      getServiceWorkerRegistrationDelay({
        delayMs: 1200,
        windowRef: { __AURA_SW_REGISTRATION_DELAY_MS__: -1 },
      }),
      1200
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

  test("announces an already-waiting update on controlled pages", async () => {
    const windowRef = createWindowStub();
    const waitingWorker = {};
    const registration = createEventTargetStub({
      scope: "/",
      waiting: waitingWorker,
    });
    const navigatorRef = {
      serviceWorker: {
        controller: {},
        async register() {
          return registration;
        },
      },
    };
    const updateReadyRegistrations = [];

    registerServiceWorker({
      enabled: true,
      delayMs: 0,
      windowRef,
      navigatorRef,
      onUpdateReady(updateReadyRegistration) {
        updateReadyRegistrations.push(updateReadyRegistration);
      },
    });

    await windowRef.getListener("load")();

    assert.deepEqual(updateReadyRegistrations, [registration]);
  });

  test("announces newly installed updates after updatefound", async () => {
    const windowRef = createWindowStub();
    const installingWorker = createEventTargetStub({ state: "installing" });
    const registration = createEventTargetStub({
      scope: "/",
      installing: installingWorker,
      waiting: null,
    });
    const navigatorRef = {
      serviceWorker: {
        controller: {},
        async register() {
          return registration;
        },
      },
    };
    const updateReadyRegistrations = [];

    registerServiceWorker({
      enabled: true,
      delayMs: 0,
      windowRef,
      navigatorRef,
      onUpdateReady(updateReadyRegistration) {
        updateReadyRegistrations.push(updateReadyRegistration);
      },
    });

    await windowRef.getListener("load")();
    registration.emit("updatefound");

    assert.equal(updateReadyRegistrations.length, 0);

    registration.waiting = installingWorker;
    installingWorker.state = "installed";
    installingWorker.emit("statechange");

    assert.deepEqual(updateReadyRegistrations, [registration]);
  });

  test("does not show first-install updates before a page is controlled", async () => {
    const windowRef = createWindowStub();
    const registration = createEventTargetStub({
      scope: "/",
      waiting: {},
    });
    const navigatorRef = {
      serviceWorker: {
        controller: null,
        async register() {
          return registration;
        },
      },
    };
    const updateReadyRegistrations = [];

    registerServiceWorker({
      enabled: true,
      delayMs: 0,
      windowRef,
      navigatorRef,
      onUpdateReady(updateReadyRegistration) {
        updateReadyRegistrations.push(updateReadyRegistration);
      },
    });

    await windowRef.getListener("load")();

    assert.deepEqual(updateReadyRegistrations, []);
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

  test("activates a waiting service worker and reloads after controller change", () => {
    let postedMessage = null;
    let reloadCount = 0;
    let controllerChangeHandler = null;
    const navigatorRef = {
      serviceWorker: {
        addEventListener(type, listener) {
          if (type === "controllerchange") {
            controllerChangeHandler = listener;
          }
        },
      },
    };
    const windowRef = {
      location: {
        reload() {
          reloadCount += 1;
        },
      },
      setTimeout() {},
    };

    const didActivate = activateWaitingServiceWorker({
      registration: {
        waiting: {
          postMessage(message) {
            postedMessage = message;
          },
        },
      },
      windowRef,
      navigatorRef,
    });

    assert.equal(didActivate, true);
    assert.deepEqual(postedMessage, { type: "SKIP_WAITING" });
    assert.equal(reloadCount, 0);

    controllerChangeHandler();

    assert.equal(reloadCount, 1);
  });

  test("does not activate when no worker is waiting", () => {
    assert.equal(
      activateWaitingServiceWorker({ registration: { waiting: null } }),
      false
    );
  });
});
