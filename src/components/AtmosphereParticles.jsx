import { memo, useMemo } from "react";
import "./AtmosphereParticles.css";

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const RAIN_PARTICLE_COUNT = 28;
const SNOW_PARTICLE_COUNT = 40;

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

function buildParticles(kind) {
  const count = kind === "rain" ? RAIN_PARTICLE_COUNT : SNOW_PARTICLE_COUNT;
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

function AtmosphereParticles({ conditionCode, prefersReducedData = false }) {
  const kind = useMemo(() => classifyCondition(conditionCode), [conditionCode]);
  const particles = useMemo(
    () => (kind && !prefersReducedData ? buildParticles(kind) : []),
    [kind, prefersReducedData]
  );

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
