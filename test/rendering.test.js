"use strict";

const { loadApp } = require("./helpers/dom");

let app;
beforeEach(() => {
  app = loadApp();
});

describe("renderPoseGrid", () => {
  test("renders a radio chip per pose and selects 'standing'", () => {
    const grid = document.getElementById("poseGrid");
    const inputs = grid.querySelectorAll('input[name="pose"]');
    expect(inputs).toHaveLength(app.POSES.length);
    expect(app.radioValue("pose")).toBe("standing");
  });

  test("each pose chip carries its id as the value and label text", () => {
    const grid = document.getElementById("poseGrid");
    for (const [id, label] of app.POSES) {
      const input = grid.querySelector(`input[value="${id}"]`);
      expect(input).not.toBeNull();
      expect(input.closest("label").textContent).toContain(label);
    }
  });
});

describe("setStatus", () => {
  test("writes text into #statusText", () => {
    app.setStatus("Working");
    expect(document.getElementById("statusText").textContent).toBe("Working");
  });
});

describe("viewer state transitions", () => {
  test("showResult reveals the image and action buttons", () => {
    app.showResult("blob:abc");
    const img = document.getElementById("result");
    expect(img.src).toContain("blob:abc");
    expect(img.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("placeholder").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("loader").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("downloadBtn").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("statusText").textContent).toBe("Done");
  });

  test("showLoader displays the loader with given text", () => {
    app.showLoader("Studying...");
    expect(document.getElementById("loaderText").textContent).toBe("Studying...");
    expect(document.getElementById("loader").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("result").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("placeholder").classList.contains("hidden")).toBe(true);
  });

  test("showPlaceholder hides result/loader and download button", () => {
    app.showResult("blob:abc"); // move away from placeholder first
    app.showPlaceholder();
    expect(document.getElementById("placeholder").classList.contains("hidden")).toBe(false);
    expect(document.getElementById("loader").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("result").classList.contains("hidden")).toBe(true);
    expect(document.getElementById("downloadBtn").classList.contains("hidden")).toBe(true);
  });
});

describe("renderGallery", () => {
  test("shows the empty message when the gallery is empty", () => {
    app.state.gallery = [];
    app.renderGallery();
    const el = document.getElementById("gallery");
    expect(el.querySelector(".gallery-empty")).not.toBeNull();
    expect(el.querySelectorAll(".gallery-item")).toHaveLength(0);
  });

  test("renders one item per gallery entry with view/save/delete actions", () => {
    app.state.gallery = [
      { url: "blob:1", prompt: "p1", seed: 11 },
      { url: "blob:2", prompt: "p2", seed: 22 },
    ];
    app.renderGallery();
    const items = document.querySelectorAll("#gallery .gallery-item");
    expect(items).toHaveLength(2);
    expect(items[0].dataset.i).toBe("0");
    expect(items[0].querySelector("img").src).toContain("blob:1");
    expect(items[0].querySelector(".view")).not.toBeNull();
    expect(items[0].querySelector(".dl")).not.toBeNull();
    expect(items[0].querySelector(".del")).not.toBeNull();
  });
});

describe("updatePromptPreview", () => {
  test("does nothing while there is no lastPrompt", () => {
    app.state.lastPrompt = "";
    app.updatePromptPreview();
    expect(document.getElementById("promptBox").classList.contains("hidden")).toBe(true);
  });

  test("reveals the prompt box and writes the last prompt", () => {
    app.state.lastPrompt = "my prompt";
    app.updatePromptPreview();
    expect(document.getElementById("promptText").textContent).toBe("my prompt");
    expect(document.getElementById("promptBox").classList.contains("hidden")).toBe(false);
  });
});
