import { useCallback, useEffect, useRef, useState } from "react";
import {
  activateWaitingServiceWorker,
  registerServiceWorker,
} from "../services/serviceWorkerRegistration";

function getBrowserWindow() {
  return typeof window === "undefined" ? null : window;
}

export function useServiceWorkerUpdate() {
  const registrationRef = useRef(null);
  const dismissedRegistrationRef = useRef(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleUpdateReady = useCallback((registration) => {
    if (!registration || registration === dismissedRegistrationRef.current) {
      return;
    }

    registrationRef.current = registration;
    setUpdateAvailable(true);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    const cleanup = registerServiceWorker({
      onUpdateReady: handleUpdateReady,
    });

    return typeof cleanup === "function" ? cleanup : undefined;
  }, [handleUpdateReady]);

  const refreshUpdate = useCallback(() => {
    setIsRefreshing(true);
    const didStartUpdate = activateWaitingServiceWorker({
      registration: registrationRef.current,
    });

    if (!didStartUpdate) {
      getBrowserWindow()?.location?.reload?.();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    dismissedRegistrationRef.current = registrationRef.current;
    setUpdateAvailable(false);
    setIsRefreshing(false);
  }, []);

  return {
    updateAvailable,
    isRefreshing,
    refreshUpdate,
    dismissUpdate,
  };
}
