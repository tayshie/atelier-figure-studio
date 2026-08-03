"use strict";

const { loadApp } = require("./helpers/dom");

let app;
beforeEach(() => {
  app = loadApp();
});

describe("buildUrl", () => {
  function parse(url) {
    const [base, query] = url.split("?");
    return { base, params: new URLSearchParams(query) };
  }

  test("builds a well-formed Pollinations URL with default selections", () => {
    const url = app.buildUrl("a nude figure", 42);
    const { base, params } = parse(url);
    expect(base).toBe(`${app.API_BASE}/${encodeURIComponent("a nude figure")}`);
    expect(params.get("model")).toBe("flux");
    expect(params.get("width")).toBe("768");
    expect(params.get("height")).toBe("1024");
    expect(params.get("seed")).toBe("42");
    expect(params.get("private")).toBe("true");
    expect(params.get("referrer")).toBe(app.REFERRER);
  });

  test("URL-encodes prompts containing spaces and special characters", () => {
    const url = app.buildUrl("figure, front & back", 1);
    expect(url).toContain(encodeURIComponent("figure, front & back"));
    expect(url).not.toContain(" ");
  });

  test.each([
    ["3x4", "768", "1024"],
    ["9x16", "720", "1280"],
    ["square", "896", "896"],
  ])("aspect %s -> %s x %s", (aspect, w, h) => {
    app.setRadio("aspect", aspect);
    const { params } = parse(app.buildUrl("p", 7));
    expect(params.get("width")).toBe(w);
    expect(params.get("height")).toBe(h);
  });

  test("falls back to 3x4 dimensions when aspect is unselected", () => {
    document
      .querySelectorAll('input[name="aspect"]')
      .forEach((el) => (el.checked = false));
    const { params } = parse(app.buildUrl("p", 7));
    expect(params.get("width")).toBe("768");
    expect(params.get("height")).toBe("1024");
  });

  test("uses the selected model", () => {
    app.setRadio("model", "turbo");
    const { params } = parse(app.buildUrl("p", 7));
    expect(params.get("model")).toBe("turbo");
  });

  test("falls back to flux when no model is selected", () => {
    document
      .querySelectorAll('input[name="model"]')
      .forEach((el) => (el.checked = false));
    const { params } = parse(app.buildUrl("p", 7));
    expect(params.get("model")).toBe("flux");
  });

  test("coerces the seed to a string", () => {
    const { params } = parse(app.buildUrl("p", 0));
    expect(params.get("seed")).toBe("0");
  });
});
