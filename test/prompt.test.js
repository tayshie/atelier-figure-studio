"use strict";

const { loadApp } = require("./helpers/dom");

let app;
beforeEach(() => {
  app = loadApp();
});

describe("buildPrompt", () => {
  test("builds a prompt from the default selections", () => {
    const prompt = app.buildPrompt();
    expect(prompt.startsWith("Artistic figure drawing study,")).toBe(true);
    expect(prompt).toContain(app.GENDERS.female);
    expect(prompt).toContain(app.AGES.young);
    expect(prompt).toContain(app.BODIES.slender);
    expect(prompt).toContain(app.MEDIUMS.pencil);
    expect(prompt).toContain(app.QUALITY_SUFFIX);
  });

  test("reflects updated selections", () => {
    app.setRadio("gender", "male");
    app.setRadio("medium", "charcoal");
    const prompt = app.buildPrompt();
    expect(prompt).toContain(app.GENDERS.male);
    expect(prompt).toContain(app.MEDIUMS.charcoal);
    expect(prompt).not.toContain(app.MEDIUMS.pencil);
  });

  test("uses the pose description matching the selected pose id", () => {
    app.setRadio("pose", "running");
    const desc = app.POSES.find(([id]) => id === "running")[1];
    expect(app.buildPrompt()).toContain(desc);
  });

  test("falls back to a default pose description when pose is unselected", () => {
    document
      .querySelectorAll('input[name="pose"]')
      .forEach((el) => (el.checked = false));
    expect(app.buildPrompt()).toContain("standing in a relaxed pose");
  });

  test("omits empty fragments (e.g. body=any, view=any, light=none)", () => {
    app.setRadio("body", "any");
    app.setRadio("view", "any");
    app.setRadio("light", "none");
    const prompt = app.buildPrompt();
    // No doubled spaces means empty parts were filtered before joining.
    expect(prompt).not.toMatch(/\s{2,}/);
    expect(prompt).not.toContain("undefined");
  });

  test("never contains 'undefined' from a missing catalog lookup", () => {
    // Selecting nothing anywhere still produces a clean string.
    document
      .querySelectorAll('input[type="radio"]')
      .forEach((el) => (el.checked = false));
    const prompt = app.buildPrompt();
    expect(prompt).not.toContain("undefined");
    expect(prompt.startsWith("Artistic figure drawing study,")).toBe(true);
  });
});

describe("readConfig", () => {
  test("returns all current selections plus batch", () => {
    const cfg = app.readConfig();
    expect(cfg).toMatchObject({
      gender: "female",
      age: "young",
      body: "slender",
      pose: "standing",
      view: "front",
      medium: "pencil",
      line: "loose",
      shade: "none",
      bg: "white",
      light: "none",
      model: "flux",
      aspect: "3x4",
    });
    expect(cfg.batch).toBe(1);
  });

  test("parses the batch select value as an integer", () => {
    document.getElementById("batch").value = "3";
    expect(app.readConfig().batch).toBe(3);
  });

  test("defaults batch to 1 when the value is not a number", () => {
    const batch = document.getElementById("batch");
    const opt = document.createElement("option");
    opt.value = "";
    batch.appendChild(opt);
    batch.value = "";
    expect(app.readConfig().batch).toBe(1);
  });
});
