"use strict";

const { loadApp } = require("./helpers/dom");

let app;
beforeEach(() => {
  app = loadApp();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("surpriseMe", () => {
  test("selects a valid option in every randomized group", () => {
    const groups = ["gender", "age", "body", "medium", "line", "shade", "view", "bg", "light", "aspect", "model"];
    app.surpriseMe();
    for (const g of groups) {
      const value = app.radioValue(g);
      const allowed = Array.from(
        document.querySelectorAll(`input[name="${g}"]`)
      ).map((el) => el.value);
      expect(allowed).toContain(value);
    }
    expect(app.radioValue("pose")).not.toBe("");
  });

  test("sets a numeric seed and resets batch to 1", () => {
    document.getElementById("batch").value = "4";
    app.surpriseMe();
    const seed = Number(document.getElementById("seed").value);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(document.getElementById("batch").value).toBe("1");
  });

  test("updates the status line", () => {
    app.surpriseMe();
    expect(document.getElementById("statusText").textContent).toContain("Randomized");
  });

  test("picks the first option when Math.random is 0", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    app.surpriseMe();
    expect(app.radioValue("gender")).toBe("female"); // first gender option
    expect(app.radioValue("pose")).toBe(app.POSES[0][0]);
  });
});

describe("randomPose", () => {
  test("selects one of the catalog poses", () => {
    app.randomPose();
    const value = app.radioValue("pose");
    expect(app.POSES.some(([id]) => id === value)).toBe(true);
  });
});
