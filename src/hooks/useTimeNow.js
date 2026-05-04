import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Returns a millisecond timestamp that ticks on a fixed interval (defaults
 * to once per minute). Used by DataTrustMeta to keep "Updated Nm ago"
 * labels fresh.
 *
 * The interval pauses while the document is hidden so background tabs do
 * not churn re-renders, and ticks once on visibility return so the labels
 * are not stale on focus.
 */
export function useTimeNow(intervalMs = DEFAULT_INTERVAL_MS) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    let intervalId = null;

    const startTicking = () => {
      if (intervalId !== null) return;
      setNowMs(Date.now());
      intervalId = setInterval(() => {
        setNowMs(Date.now());
      }, intervalMs);
    };

    const stopTicking = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        startTicking();
      } else {
        stopTicking();
      }
    };

    if (document.visibilityState === "visible") {
      startTicking();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTicking();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs]);

  return nowMs;
}
