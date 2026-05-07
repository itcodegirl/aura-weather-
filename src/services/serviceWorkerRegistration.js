const SERVICE_WORKER_URL = "/sw.js";

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

export function registerServiceWorker({
  enabled = getDefaultProductionFlag(),
  serviceWorkerUrl = SERVICE_WORKER_URL,
  windowRef = getBrowserWindow(),
  navigatorRef = getBrowserNavigator(),
  delayMs = 8000,
  onRegistered,
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

  async function register() {
    try {
      const registration = await navigatorRef.serviceWorker.register(
        serviceWorkerUrl
      );
      if (typeof onRegistered === "function") {
        onRegistered(registration);
      }
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
    if (delayMs <= 0) {
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
        }, delayMs)
      : setTimeout(() => {
          void register();
        }, delayMs);

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

  if (windowRef.document?.readyState === "complete") {
    return scheduleRegistration();
  }

  let cancelScheduledRegistration = null;
  function handleLoad() {
    cancelScheduledRegistration = scheduleRegistration();
  }

  windowRef.addEventListener("load", handleLoad, { once: true });
  return () => {
    windowRef.removeEventListener("load", handleLoad);
    cancelScheduledRegistration?.();
  };
}
