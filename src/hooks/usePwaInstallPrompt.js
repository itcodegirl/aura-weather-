import { useCallback, useEffect, useRef, useState } from "react";

function getBrowserWindow() {
  return typeof window === "undefined" ? null : window;
}

function isPromiseLike(value) {
  return value && typeof value.then === "function";
}

export function usePwaInstallPrompt({ windowRef = getBrowserWindow() } = {}) {
  const promptEventRef = useRef(null);
  const didDismissPromptRef = useRef(false);
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [isInstallPromptOpening, setIsInstallPromptOpening] = useState(false);

  useEffect(() => {
    if (!windowRef?.addEventListener) {
      return undefined;
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault?.();
      promptEventRef.current = event;

      if (!didDismissPromptRef.current) {
        setInstallPromptAvailable(true);
      }
    }

    function handleAppInstalled() {
      promptEventRef.current = null;
      didDismissPromptRef.current = true;
      setInstallPromptAvailable(false);
      setIsInstallPromptOpening(false);
    }

    windowRef.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    windowRef.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      windowRef.removeEventListener?.(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      windowRef.removeEventListener?.("appinstalled", handleAppInstalled);
    };
  }, [windowRef]);

  const promptInstall = useCallback(async () => {
    const promptEvent = promptEventRef.current;
    if (!promptEvent || typeof promptEvent.prompt !== "function") {
      setInstallPromptAvailable(false);
      return false;
    }

    setIsInstallPromptOpening(true);

    try {
      await promptEvent.prompt();
      const userChoice = isPromiseLike(promptEvent.userChoice)
        ? await promptEvent.userChoice
        : null;

      promptEventRef.current = null;
      didDismissPromptRef.current = true;
      setInstallPromptAvailable(false);

      return userChoice?.outcome === "accepted";
    } catch {
      promptEventRef.current = null;
      setInstallPromptAvailable(false);
      return false;
    } finally {
      setIsInstallPromptOpening(false);
    }
  }, []);

  const dismissInstallPrompt = useCallback(() => {
    didDismissPromptRef.current = true;
    setInstallPromptAvailable(false);
  }, []);

  return {
    installPromptAvailable,
    isInstallPromptOpening,
    promptInstall,
    dismissInstallPrompt,
  };
}
