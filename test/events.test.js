"use strict";

const { loadApp } = require("./helpers/dom");

let app;
beforeEach(() => {
  // jsdom does not implement object URLs; stub them for the gallery handlers.
  global.URL.createObjectURL = jest.fn(() => "blob:stub");
  global.URL.revokeObjectURL = jest.fn();
  app = loadApp(); // wires events via DOMContentLoaded
});

afterEach(() => {
  jest.restoreAllMocks();
});

function click(id) {
  document.getElementById(id).click();
}

describe("wired button events", () => {
  test("Random pose button selects a pose", () => {
    document
      .querySelectorAll('input[name="pose"]')
      .forEach((el) => (el.checked = false));
    click("randomPoseBtn");
    expect(app.radioValue("pose")).not.toBe("");
  });

  test("Roll seed button fills the seed input", () => {
    document.getElementById("seed").value = "";
    click("rollSeedBtn");
    expect(document.getElementById("seed").value).not.toBe("");
  });

  test("Toggle prompt button reveals the prompt box and populates it", () => {
    const box = document.getElementById("promptBox");
    expect(box.classList.contains("hidden")).toBe(true);
    click("togglePromptBtn");
    expect(box.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("promptText").textContent).toContain(
      "Artistic figure drawing study,"
    );
  });

  test("Copy prompt writes the preview text to the clipboard", async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    document.getElementById("promptText").textContent = "the prompt";
    click("copyPromptBtn");
    expect(writeText).toHaveBeenCalledWith("the prompt");
    await Promise.resolve();
    expect(document.getElementById("toast").textContent).toContain("copied");
  });

  test("Copy prompt reports failure when the clipboard rejects", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn(() => Promise.reject(new Error("nope"))) },
      configurable: true,
    });
    click("copyPromptBtn");
    await Promise.resolve();
    await Promise.resolve();
    expect(document.getElementById("toast").textContent).toContain("Could not copy");
  });

  test("Clear gallery empties state and revokes object URLs", () => {
    app.state.gallery = [
      { url: "blob:1", prompt: "p", seed: 1 },
      { url: "blob:2", prompt: "p", seed: 2 },
    ];
    app.renderGallery();
    click("clearGalleryBtn");
    expect(app.state.gallery).toHaveLength(0);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(document.getElementById("statusText").textContent).toBe("Gallery cleared");
  });
});

describe("gallery item delegation", () => {
  beforeEach(() => {
    app.state.gallery = [
      { url: "blob:1", prompt: "p1", seed: 11 },
      { url: "blob:2", prompt: "p2", seed: 22 },
    ];
    app.renderGallery();
  });

  test("View loads the selected image into the viewer", () => {
    document.querySelector('#gallery .gallery-item[data-i="1"] .view').click();
    expect(document.getElementById("result").src).toContain("blob:2");
    expect(document.getElementById("statusText").textContent).toBe("Viewing from gallery");
  });

  test("Save triggers a download of the selected image", () => {
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    document.querySelector('#gallery .gallery-item[data-i="1"] .dl').click();
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  test("Delete removes the item and revokes its URL", () => {
    document.querySelector('#gallery .gallery-item[data-i="0"] .del').click();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:1");
    expect(app.state.gallery).toHaveLength(1);
    expect(app.state.gallery[0].seed).toBe(22);
  });

  test("clicking empty gallery space is a no-op", () => {
    expect(() => document.getElementById("gallery").click()).not.toThrow();
    expect(app.state.gallery).toHaveLength(2);
  });
});
