import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";

import { parseLocationFromUrl } from "./useUrlLocationSync.js";

function setLocationSearch(search) {
  globalThis.window = {
    location: { search, pathname: "/", hash: "" },
    history: {
      replaceState: () => {},
    },
  };
}

afterEach(() => {
  delete globalThis.window;
});

describe("parseLocationFromUrl", () => {
  test("returns null when no window or no params present", () => {
    delete globalThis.window;
    assert.equal(parseLocationFromUrl(), null);

    setLocationSearch("");
    assert.equal(parseLocationFromUrl(), null);
  });

  test("parses a valid lat/lon pair with optional name + country", () => {
    setLocationSearch(
      "?lat=35.6762&lon=139.6503&name=Tokyo&country=Japan"
    );
    const result = parseLocationFromUrl();
    assert.equal(result.lat, 35.6762);
    assert.equal(result.lon, 139.6503);
    assert.equal(result.name, "Tokyo");
    assert.equal(result.country, "Japan");
  });

  test("falls back to a generic name when 'name' is omitted", () => {
    setLocationSearch("?lat=51.5074&lon=-0.1278");
    const result = parseLocationFromUrl();
    assert.equal(result.name, "Shared location");
    assert.equal(result.country, "");
  });

  test("rejects non-numeric coordinates", () => {
    setLocationSearch("?lat=abc&lon=xyz");
    assert.equal(parseLocationFromUrl(), null);
  });

  test("rejects coordinates outside the valid Earth range", () => {
    setLocationSearch("?lat=200&lon=0");
    assert.equal(parseLocationFromUrl(), null);

    setLocationSearch("?lat=0&lon=400");
    assert.equal(parseLocationFromUrl(), null);
  });

  test("ignores extra unrelated params", () => {
    setLocationSearch(
      "?lat=41.8781&lon=-87.6298&mock=missing&utm_source=x"
    );
    const result = parseLocationFromUrl();
    assert.equal(result.lat, 41.8781);
    assert.equal(result.lon, -87.6298);
  });

  test("trims excessively long name strings to prevent spoofed long copy", () => {
    const longName = "x".repeat(500);
    setLocationSearch(`?lat=0.5&lon=0.5&name=${longName}`);
    const result = parseLocationFromUrl();
    assert.equal(result.name.length, 80);
  });
});
