import { memo, useMemo, useSyncExternalStore } from "react";
import "./AtmosphereParticles.css";

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

/*
 * Particle counts scale with viewport. On a phone the rain/snow strip
 * only needs to cover ~360px of width; spawning desktop counts (28/40)
 * means an absolutely-positioned span every ~9px which is wasted DOM
 * and a real cost on low-end Androids running infinite CSS animations.
 * Mobile counts roughly halve the working set.
 */
const RAIN_PARTICLE_COUNT_DESKTOP = 28;
const SNOW_PARTICLE_COUNT_DESKTOP = 40;
const RAIN_PARTICLE_COUNT_MOBILE = 14;
const SNOW_PARTICLE_COUNT_MOBILE = 20;
const MOBILE_BREAKPOINT_PX = 640;

function classifyCondition(code) {
  if (RAIN_CODES.has(code)) {
    return "rain";
  }
  if (SNOW_CODES.has(code)) {
    return "snow";
  }
  return null;
}

// Deterministic pseudo-random in [0, 1) so the particle layout stays
// stable across renders. We do not want the rain to "shuffle" every
// time React re-renders — it would feel uncomfortable.
function deterministicFraction(seed) {
  const value = Math.sin(seed * 1234.567) * 99999;
  return value - Math.floor(value);
}

function buildParticles(kind, count) {
  const baseDuration = kind === "rain" ? 0.85 : 6;
  const durationVariance = kind === "rain" ? 0.45 : 3;
  const delayVariance = kind === "rain" ? 1.2 : 5;

  return Array.from({ length: count }, (_, index) => {
    const x = deterministicFraction(index + 1) * 100;
    const delay = deterministicFraction(index + 1.3) * delayVariance;
    const duration =
      baseDuration + deterministicFraction(index + 2.7) * durationVariance;
    const sizeBoost = deterministicFraction(index + 3.1);
    return {
      key: `${kind}-${index}`,
      style: {
        left: `${x.toFixed(2)}%`,
        animationDuration: `${duration.toFixed(2)}s`,
        animationDelay: `${delay.toFixed(2)}s`,
        "--size-boost": sizeBoost.toFixed(3),
      },
    };
  });
}

function subscribeToMobileViewport(callback) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
  const listener = () => callback();
  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }
  // Older Safari fallback.
  mq.addListener(listener);
  return () => mq.removeListener(listener);
}

function getMobileViewportSnapshot() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
}

function getMobileViewportServerSnapshot() {
  return false;
}

function useIsMobileViewport() {
  return useSyncExternalStore(
    subscribeToMobileViewport,
    getMobileViewportSnapshot,
    getMobileViewportServerSnapshot
  );
}

function AtmosphereParticles({ conditionCode, prefersReducedData = false }) {
  const kind = useMemo(() => classifyCondition(conditionCode), [conditionCode]);
  const isMobile = useIsMobileViewport();
  const particles = useMemo(() => {
    if (!kind || prefersReducedData) {
      return [];
    }
    const count =
      kind === "rain"
        ? isMobile
          ? RAIN_PARTICLE_COUNT_MOBILE
          : RAIN_PARTICLE_COUNT_DESKTOP
        : isMobile
          ? SNOW_PARTICLE_COUNT_MOBILE
          : SNOW_PARTICLE_COUNT_DESKTOP;
    return buildParticles(kind, count);
  }, [kind, prefersReducedData, isMobile]);

  if (!kind || prefersReducedData) {
    return null;
  }

  return (
    <div
      className={`atmosphere-particles atmosphere-particles--${kind}`}
      aria-hidden="true"
    >
      {particles.map((particle) => (
        <span
          key={particle.key}
          className={`atmosphere-particle atmosphere-particle--${kind}`}
          style={particle.style}
        />
      ))}
    </div>
  );
}

export default memo(AtmosphereParticles);
