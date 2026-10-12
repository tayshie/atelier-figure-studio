"use strict";

const { loadIndexBody } = require("./helpers/dom");

describe("DOMContentLoaded init", () => {
  test("renders the pose grid, wires events and reports Ready", () => {
    loadIndexBody();
    jest.resetModules();
    // Load without the helper's manual init so the module's own
    // DOMContentLoaded handler runs the initialization.
    require("../app.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(
      document.querySelectorAll('#poseGrid input[name="pose"]').length
    ).toBeGreaterThan(0);
    expect(document.getElementById("statusText").textContent).toBe("Ready");

    // Events are wired: rolling the seed fills the input.
    document.getElementById("seed").value = "";
    document.getElementById("rollSeedBtn").click();
    expect(document.getElementById("seed").value).not.toBe("");
  });
});
