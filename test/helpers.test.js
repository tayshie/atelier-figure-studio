"use strict";

const { loadApp } = require("./helpers/dom");

let app;
beforeEach(() => {
  app = loadApp();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("radioValue / setRadio", () => {
  test("radioValue returns the checked option's value", () => {
    expect(app.radioValue("gender")).toBe("female"); // default checked in HTML
  });

  test("radioValue returns '' when the group has no selection", () => {
    document
      .querySelectorAll('input[name="gender"]')
      .forEach((el) => (el.checked = false));
    expect(app.radioValue("gender")).toBe("");
  });

  test("radioValue returns '' for an unknown group", () => {
    expect(app.radioValue("does-not-exist")).toBe("");
  });

  test("setRadio checks the matching option and reflects in radioValue", () => {
    app.setRadio("gender", "male");
    expect(
      document.querySelector('input[name="gender"][value="male"]').checked
    ).toBe(true);
    expect(app.radioValue("gender")).toBe("male");
  });

  test("setRadio is a no-op for a value that does not exist", () => {
    expect(() => app.setRadio("gender", "nope")).not.toThrow();
    expect(app.radioValue("gender")).toBe("female");
  });
});

describe("randomOf", () => {
  test("returns an element from the list", () => {
    const list = ["a", "b", "c"];
    for (let i = 0; i < 20; i++) {
      expect(list).toContain(app.randomOf(list));
    }
  });

  test("uses Math.random to index into the list", () => {
    const list = ["a", "b", "c", "d"];
    const spy = jest.spyOn(Math, "random").mockReturnValue(0);
    expect(app.randomOf(list)).toBe("a");
    spy.mockReturnValue(0.99);
    expect(app.randomOf(list)).toBe("d");
    spy.mockRestore();
  });
});

describe("newSeed", () => {
  test("returns an integer in [0, 1e6)", () => {
    for (let i = 0; i < 50; i++) {
      const s = app.newSeed();
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(1e6);
    }
  });
});

describe("sleep", () => {
  test("resolves after the given delay", async () => {
    jest.useFakeTimers();
    const done = jest.fn();
    app.sleep(1000).then(done);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(done).toHaveBeenCalled();
  });
});

describe("toast", () => {
  test("shows a message and hides it after the timeout", () => {
    jest.useFakeTimers();
    const el = document.getElementById("toast");
    app.toast("Hello", 2000);
    expect(el.textContent).toBe("Hello");
    expect(el.classList.contains("hidden")).toBe(false);

    jest.advanceTimersByTime(2000);
    expect(el.classList.contains("hidden")).toBe(true);
  });

  test("resets the hide timer on rapid successive calls", () => {
    jest.useFakeTimers();
    const el = document.getElementById("toast");
    app.toast("first", 3000);
    jest.advanceTimersByTime(2000);
    app.toast("second", 3000);
    jest.advanceTimersByTime(2000); // 4s since first, 2s since second
    expect(el.classList.contains("hidden")).toBe(false);
    expect(el.textContent).toBe("second");
    jest.advanceTimersByTime(1000);
    expect(el.classList.contains("hidden")).toBe(true);
  });
});
