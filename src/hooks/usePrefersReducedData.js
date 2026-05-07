import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-data: reduce)";

function getConnection() {
  const navigatorLike =
    typeof window !== "undefined" ? window.navigator : globalThis.navigator;
  return navigatorLike?.connection ?? navigatorLike?.mozConnection ?? navigatorLike?.webkitConnection;
}

export function readReducedDataPreference() {
  const connection = getConnection();
  if (connection?.saveData === true) {
    return true;
  }

  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  try {
    return window.matchMedia(QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * True when the user-agent reports the prefers-reduced-data media
 * query. Used to skip non-essential network calls (for example the
 * historical-archive comparison) when the user has asked the browser
 * to conserve bandwidth.
 *
 * Subscribes to media-query changes so the value updates if the user
 * toggles the OS-level preference mid-session.
 */
export function usePrefersReducedData() {
  const [prefersReducedData, setPrefersReducedData] = useState(
    readReducedDataPreference
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const cleanups = [];
    const handleChange = () => {
      setPrefersReducedData(readReducedDataPreference());
    };

    if (typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia(QUERY);
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handleChange);
        cleanups.push(() => mediaQuery.removeEventListener("change", handleChange));
      } else if (typeof mediaQuery.addListener === "function") {
        mediaQuery.addListener(handleChange);
        cleanups.push(() => mediaQuery.removeListener(handleChange));
      }
    }

    const connection = getConnection();
    if (typeof connection?.addEventListener === "function") {
      connection.addEventListener("change", handleChange);
      cleanups.push(() => connection.removeEventListener("change", handleChange));
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return prefersReducedData;
}
