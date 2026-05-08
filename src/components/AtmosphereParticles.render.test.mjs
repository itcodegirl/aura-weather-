import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import "../../scripts/test-render-setup.mjs";

const React = (await import("react")).default;
const { cleanup, render } = await import("@testing-library/react");
const AtmosphereParticles = (
  await import("./AtmosphereParticles.jsx")
).default;

afterEach(() => {
  cleanup();
});

describe("AtmosphereParticles", () => {
  test("renders nothing for clear / cloud condition codes", () => {
    const { container } = render(
      React.createElement(AtmosphereParticles, { conditionCode: 0 })
    );
    assert.equal(container.querySelector(".atmosphere-particles"), null);

    cleanup();
    const overcast = render(
      React.createElement(AtmosphereParticles, { conditionCode: 3 })
    );
    assert.equal(
      overcast.container.querySelector(".atmosphere-particles"),
      null
    );
  });

  test("renders rain particles for rain / drizzle / shower codes", () => {
    const { container } = render(
      React.createElement(AtmosphereParticles, { conditionCode: 63 })
    );
    const layer = container.querySelector(".atmosphere-particles--rain");
    assert.notEqual(layer, null);
    const particles = layer.querySelectorAll(".atmosphere-particle--rain");
    assert.ok(particles.length > 0, "expected rain particles to render");
  });

  test("renders snow particles for snow / snow-shower codes", () => {
    const { container } = render(
      React.createElement(AtmosphereParticles, { conditionCode: 73 })
    );
    const layer = container.querySelector(".atmosphere-particles--snow");
    assert.notEqual(layer, null);
    const particles = layer.querySelectorAll(".atmosphere-particle--snow");
    assert.ok(particles.length > 0, "expected snow particles to render");
  });

  test("renders nothing when prefersReducedData is true even on a rain code", () => {
    const { container } = render(
      React.createElement(AtmosphereParticles, {
        conditionCode: 63,
        prefersReducedData: true,
      })
    );
    assert.equal(container.querySelector(".atmosphere-particles"), null);
  });

  test("particle layout is deterministic across renders", () => {
    // The deterministic seed prevents the rain from "shuffling" on
    // every re-render. Two fresh renders of the same condition code
    // must produce identical inline-style layouts.
    const first = render(
      React.createElement(AtmosphereParticles, { conditionCode: 65 })
    );
    const firstStyles = Array.from(
      first.container.querySelectorAll(".atmosphere-particle--rain")
    ).map((node) => node.getAttribute("style"));
    cleanup();

    const second = render(
      React.createElement(AtmosphereParticles, { conditionCode: 65 })
    );
    const secondStyles = Array.from(
      second.container.querySelectorAll(".atmosphere-particle--rain")
    ).map((node) => node.getAttribute("style"));

    assert.deepEqual(firstStyles, secondStyles);
  });
});
