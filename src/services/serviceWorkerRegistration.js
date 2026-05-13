import { toFiniteNumber } from "../utils/numbers.js";

const SERVICE_WORKER_URL = "/sw.js";
const DEFAULT_REGISTRATION_DELAY_MS = 8000;
const REGISTRATION_DELAY_OVERRIDE_KEY = "__AURA_SW_REGISTRATION_DELAY_MS__";
const SKIP_WAITING_MESSAGE_TYPE = "SKIP_WAITING";

function getDefaultProductionFlag() {
  return Boolean(import.meta.env?.PROD);
}

function getBrowserWindow() {
  return typeof window === "undefined" ? null : window;
}

function getBrowserNavigator() {
  return typeof navigator === "undefined" ? null : navigator;
}

export function canRegisterServiceWorker({
  enabled = getDefaultProductionFlag(),
  navigatorRef = getBrowserNavigator(),
  locationRef = getBrowserWindow()?.location,
} = {}) {
  return Boolean(
    enabled &&
      navigatorRef?.serviceWorker &&
      locationRef?.protocol !== "file:"
  );
}

export function getServiceWorkerRegistrationDelay({
  windowRef = getBrowserWindow(),
  delayMs = DEFAULT_REGISTRATION_DELAY_MS,
} = {}) {
  // Strict coercion: a Number()-based check would silently treat null,
  // empty string, false, and true as 0/1, registering the service
  // worker with a fake-zero or fake-one millisecond delay. Reject all
  // of those at the boundary so the override slot only honors a real
  // numeric value (the same trust-contract pattern enforced at the
  // API layer).
  const overrideDelayMs = toFiniteNumber(
    windowRef?.[REGISTRATION_DELAY_OVERRIDE_KEY]
  );

  if (overrideDelayMs !== null && overrideDelayMs >= 0) {
    return overrideDelayMs;
  }

  return delayMs;
}

function addEventListener(target, type, listener, options) {
  if (typeof target?.addEventListener === "function") {
    target.addEventListener(type, listener, options);
    return () => target.removeEventListener?.(type, listener, options);
  }

  const handlerName = `on${type}`;
  const previousHandler = target?.[handlerName];
  if (target) {
    target[handlerName] = listener;
  }

  return () => {
    if (target?.[handlerName] === listener) {
      target[handlerName] = previousHandler || null;
    }
  };
}

function watchForServiceWorkerUpdates({
  registration,
  navigatorRef,
  onUpdateReady,
} = {}) {
  if (!registration || typeof onUpdateReady !== "function") {
    return () => {};
  }

  let lastNotifiedWorker = null;
  let cleanupStateChange = null;

  function notifyIfWaiting() {
    const waitingWorker = registration.waiting;
    const hasActiveController = Boolean(navigatorRef?.serviceWorker?.controller);

    if (!waitingWorker || !hasActiveController || waitingWorker === lastNotifiedWorker) {
      return;
    }

    lastNotifiedWorker = waitingWorker;
    onUpdateReady(registration);
  }

  function watchInstallingWorker() {
    cleanupStateChange?.();
    cleanupStateChange = null;

    const installingWorker = registration.installing;
    if (!installingWorker) {
      notifyIfWaiting();
      return;
    }

    function handleStateChange() {
      if (installingWorker.state === "installed") {
        notifyIfWaiting();
        cleanupStateChange?.();
        cleanupStateChange = null;
      }
    }

    cleanupStateChange = addEventListener(
      installingWorker,
      "statechange",
      handleStateChange
    );
    handleStateChange();
  }

  notifyIfWaiting();
  const cleanupUpdateFound = addEventListener(
    registration,
    "updatefound",
    watchInstallingWorker
  );

  return () => {
    cleanupUpdateFound?.();
    cleanupStateChange?.();
  };
}

function watchForOfflineReady({
  registration,
  navigatorRef,
  onOfflineReady,
} = {}) {
  if (!registration || typeof onOfflineReady !== "function") {
    return () => {};
  }

  const hasActiveController = Boolean(navigatorRef?.serviceWorker?.controller);
  if (hasActiveController) {
    return () => {};
  }

  let didNotify = false;
  let isCleanedUp = false;
  let cleanupStateChange = null;

  function notify(readyRegistration = registration) {
    if (isCleanedUp || didNotify) {
      return;
    }

    didNotify = true;
    cleanupStateChange?.();
    cleanupStateChange = null;
    onOfflineReady(readyRegistration || registration);
  }

  const readyPromise = navigatorRef?.serviceWorker?.ready;
  if (readyPromise && typeof readyPromise.then === "function") {
    readyPromise.then(notify).catch(() => {});
  } else if (registration.active) {
    notify(registration);
  } else {
    const firstInstallWorker = registration.installing || registration.waiting;
    if (firstInstallWorker) {
      function handleStateChange() {
        if (firstInstallWorker.state === "activated") {
          notify(registration);
        }
      }

      cleanupStateChange = addEventListener(
        firstInstallWorker,
        "statechange",
        handleStateChange
      );
      handleStateChange();
    }
  }

  return () => {
    isCleanedUp = true;
    cleanupStateChange?.();
    cleanupStateChange = null;
  };
}

export function activateWaitingServiceWorker({
  registration,
  windowRef = getBrowserWindow(),
  navigatorRef = getBrowserNavigator(),
} = {}) {
  const waitingWorker = registration?.waiting;

  if (!waitingWorker || typeof waitingWorker.postMessage !== "function") {
    return false;
  }

  let didReload = false;
  let cleanupControllerChange = null;
  function reloadOnce() {
    if (didReload) {
      return;
    }

    didReload = true;
    cleanupControllerChange?.();
    windowRef?.location?.reload?.();
  }

  cleanupControllerChange = addEventListener(
    navigatorRef?.serviceWorker,
    "controllerchange",
    reloadOnce,
    { once: true }
  );
  waitingWorker.postMessage({ type: SKIP_WAITING_MESSAGE_TYPE });
  windowRef?.setTimeout?.(reloadOnce, 4000);

  return true;
}

export function registerServiceWorker({
  enabled = getDefaultProductionFlag(),
  serviceWorkerUrl = SERVICE_WORKER_URL,
  windowRef = getBrowserWindow(),
  navigatorRef = getBrowserNavigator(),
  delayMs = DEFAULT_REGISTRATION_DELAY_MS,
  onRegistered,
  onUpdateReady,
  onOfflineReady,
  onError,
} = {}) {
  if (
    !windowRef ||
    !canRegisterServiceWorker({
      enabled,
      navigatorRef,
      locationRef: windowRef.location,
    })
  ) {
    return null;
  }

  let isCleanedUp = false;
  let cleanupUpdateWatcher = null;
  let cleanupOfflineReadyWatcher = null;
  const resolvedDelayMs = getServiceWorkerRegistrationDelay({ windowRef, delayMs });

  async function register() {
    try {
      const registration = await navigatorRef.serviceWorker.register(
        serviceWorkerUrl
      );
      if (isCleanedUp) {
        return registration;
      }

      if (typeof onRegistered === "function") {
        onRegistered(registration);
      }
      cleanupUpdateWatcher?.();
      cleanupOfflineReadyWatcher?.();
      cleanupUpdateWatcher = watchForServiceWorkerUpdates({
        registration,
        navigatorRef,
        onUpdateReady,
      });
      cleanupOfflineReadyWatcher = watchForOfflineReady({
        registration,
        navigatorRef,
        onOfflineReady,
      });
      return registration;
    } catch (error) {
      if (typeof onError === "function") {
        onError(error);
      } else if (typeof console !== "undefined") {
        console.warn("Aura offline support could not start.", error);
      }
      return null;
    }
  }

  function scheduleRegistration() {
    if (resolvedDelayMs <= 0) {
      void register();
      return null;
    }

    let idleId = null;
    const timeoutId = windowRef.setTimeout
      ? windowRef.setTimeout(() => {
          if (typeof windowRef.requestIdleCallback === "function") {
            idleId = windowRef.requestIdleCallback(
              () => {
                void register();
              },
              { timeout: 2000 }
            );
            return;
          }

          void register();
        }, resolvedDelayMs)
      : setTimeout(() => {
          void register();
        }, resolvedDelayMs);

    return () => {
      if (windowRef.clearTimeout) {
        windowRef.clearTimeout(timeoutId);
      } else {
        clearTimeout(timeoutId);
      }
      if (idleId !== null) {
        windowRef.cancelIdleCallback?.(idleId);
      }
    };
  }

  function buildCleanup(cancelScheduledRegistration = null) {
    return () => {
      isCleanedUp = true;
      cancelScheduledRegistration?.();
      cleanupUpdateWatcher?.();
      cleanupOfflineReadyWatcher?.();
      cleanupUpdateWatcher = null;
      cleanupOfflineReadyWatcher = null;
    };
  }

  if (windowRef.document?.readyState === "complete") {
    return buildCleanup(scheduleRegistration());
  }

  let cancelScheduledRegistration = null;
  function handleLoad() {
    cancelScheduledRegistration = scheduleRegistration();
  }

  windowRef.addEventListener("load", handleLoad, { once: true });
  return () => {
    isCleanedUp = true;
    windowRef.removeEventListener("load", handleLoad);
    cancelScheduledRegistration?.();
    cleanupUpdateWatcher?.();
    cleanupOfflineReadyWatcher?.();
    cleanupUpdateWatcher = null;
    cleanupOfflineReadyWatcher = null;
  };
}
