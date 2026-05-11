import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 60_000;

// Module-level singleton: every consumer subscribes to the same
// interval, so two cards both wanting "minute ticks" do not start
// two timers and two re-render cascades. We bucket subscribers by
// interval so a 60s consumer and a 30s consumer can coexist; in
// practice every caller uses the default minute cadence, but the
// API stays open for future faster pulses.
const buckets = new Map();

function getBucket(intervalMs) {
  let bucket = buckets.get(intervalMs);
  if (!bucket) {
    bucket = {
      intervalMs,
      timerId: null,
      lastNow: Date.now(),
      subscribers: new Set(),
    };
    buckets.set(intervalMs, bucket);
  }
  return bucket;
}

function isDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function tick(bucket) {
  bucket.lastNow = Date.now();
  bucket.subscribers.forEach((notify) => notify(bucket.lastNow));
}

function startTimer(bucket) {
  if (bucket.timerId !== null || bucket.subscribers.size === 0) return;
  if (!isDocumentVisible()) return;
  // The timer carries the cadence; we deliberately do NOT tick here.
  // A new subscriber's useState lazy initializer already captures
  // bucket.lastNow at render time, and ticking on subscribe would
  // schedule an unsynced setState in the parent's commit phase.
  bucket.timerId = setInterval(() => tick(bucket), bucket.intervalMs);
}

function stopTimer(bucket) {
  if (bucket.timerId === null) return;
  clearInterval(bucket.timerId);
  bucket.timerId = null;
}

let visibilityListenerInstalled = false;
function ensureVisibilityListener() {
  if (visibilityListenerInstalled || typeof document === "undefined") return;
  visibilityListenerInstalled = true;
  document.addEventListener("visibilitychange", () => {
    if (isDocumentVisible()) {
      // Returning from a background tab — bump every active bucket
      // immediately so "Updated Nm ago" labels are not frozen at the
      // moment the tab went away. Subscribers re-render with fresh
      // values; the recurring interval also resumes.
      buckets.forEach((bucket) => {
        if (bucket.subscribers.size === 0) return;
        tick(bucket);
        startTimer(bucket);
      });
    } else {
      buckets.forEach((bucket) => stopTimer(bucket));
    }
  });
}

/**
 * Returns a millisecond timestamp that ticks on a fixed interval (defaults
 * to once per minute). Used by trust-meta surfaces to keep "Updated Nm
 * ago" labels fresh.
 *
 * Multiple consumers share a single interval per cadence, and the timer
 * pauses while the document is hidden so background tabs do not churn
 * re-renders. The first render after a visibility return immediately
 * returns the current clock so labels are not stale on focus.
 */
export function useTimeNow(intervalMs = DEFAULT_INTERVAL_MS) {
  const bucket = getBucket(intervalMs);
  const [nowMs, setNowMs] = useState(() => {
    // A dormant bucket (no timer, no subscribers) carries the
    // timestamp of whatever consumer last used it. Read Date.now()
    // directly so a fresh mount lands on the current wall clock
    // instead of a stale earlier value; once the timer is running
    // bucket.lastNow is the source of truth and stays in sync
    // across consumers.
    if (bucket.timerId === null && bucket.subscribers.size === 0) {
      return Date.now();
    }
    return bucket.lastNow;
  });

  useEffect(() => {
    ensureVisibilityListener();
    bucket.subscribers.add(setNowMs);
    // The useState lazy initializer already captured bucket.lastNow at
    // render time, so a freshly mounted consumer is in sync with any
    // existing subscribers. We just need to make sure the timer is
    // running while at least one consumer is subscribed.
    startTimer(bucket);

    return () => {
      bucket.subscribers.delete(setNowMs);
      if (bucket.subscribers.size === 0) {
        stopTimer(bucket);
      }
    };
  }, [bucket]);

  return nowMs;
}
