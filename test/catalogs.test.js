"use strict";

const { loadApp } = require("./helpers/dom");

let app;
beforeEach(() => {
  app = loadApp();
});

describe("option catalogs", () => {
  test("POSES entries are [id, description] pairs with unique ids", () => {
    expect(Array.isArray(app.POSES)).toBe(true);
    expect(app.POSES.length).toBeGreaterThanOrEqual(28);

    const ids = new Set();
    for (const entry of app.POSES) {
      expect(entry).toHaveLength(2);
      const [id, desc] = entry;
      expect(typeof id).toBe("string");
      expect(id).not.toEqual("");
      expect(typeof desc).toBe("string");
      expect(desc.trim()).not.toEqual("");
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
  });

  test("POSES includes the default 'standing' pose", () => {
    expect(app.POSES.some(([id]) => id === "standing")).toBe(true);
  });

  test.each([
    ["GENDERS", "female"],
    ["AGES", "young"],
    ["BODIES", "slender"],
    ["MEDIUMS", "pencil"],
    ["LINES", "loose"],
    ["SHADES", "none"],
    ["VIEWS", "front"],
    ["BGS", "white"],
    ["LIGHTS", "none"],
  ])("%s contains the default key '%s'", (catalog, key) => {
    expect(app[catalog]).toHaveProperty(key);
  });

  test("catalog values are strings", () => {
    for (const name of ["GENDERS", "AGES", "BODIES", "MEDIUMS", "LINES", "SHADES", "VIEWS", "BGS", "LIGHTS"]) {
      for (const value of Object.values(app[name])) {
        expect(typeof value).toBe("string");
      }
    }
  });

  test("optional catalogs use empty strings for 'no fragment' values", () => {
    expect(app.BODIES.any).toBe("");
    expect(app.VIEWS.any).toBe("");
    expect(app.LIGHTS.none).toBe("");
  });

  test("ASPECTS map to [width, height] positive integer pairs", () => {
    for (const [key, dims] of Object.entries(app.ASPECTS)) {
      expect(dims).toHaveLength(2);
      const [w, h] = dims;
      expect(Number.isInteger(w)).toBe(true);
      expect(Number.isInteger(h)).toBe(true);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(key).not.toEqual("");
    }
  });

  test("QUALITY_SUFFIX is a non-empty descriptive string", () => {
    expect(typeof app.QUALITY_SUFFIX).toBe("string");
    expect(app.QUALITY_SUFFIX).toContain("full body");
  });

  test("catalog keys match the radio option values in index.html", () => {
    // Every gender/age/etc. radio in the HTML must resolve to a catalog entry.
    const groups = {
      gender: app.GENDERS,
      age: app.AGES,
      body: app.BODIES,
      medium: app.MEDIUMS,
      line: app.LINES,
      shade: app.SHADES,
      view: app.VIEWS,
      bg: app.BGS,
      light: app.LIGHTS,
    };
    for (const [name, catalog] of Object.entries(groups)) {
      const values = Array.from(
        document.querySelectorAll(`input[name="${name}"]`)
      ).map((el) => el.value);
      expect(values.length).toBeGreaterThan(0);
      for (const v of values) {
        expect(catalog).toHaveProperty(v);
      }
    }
  });
});
