"use strict";

const { loadApp } = require("./helpers/dom");

let app;

function imageBlob() {
  return { type: "image/png", text: async () => "" };
}

beforeEach(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:generated");
  global.URL.revokeObjectURL = jest.fn();
  app = loadApp();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  delete global.fetch;
});

describe("fetchImage", () => {
  test("returns the blob on a successful image response", async () => {
    const blob = imageBlob();
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => blob }));
    await expect(app.fetchImage("http://x/y")).resolves.toBe(blob);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://x/y",
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  test("throws with the HTTP status when the response is not ok", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 429 }));
    await expect(app.fetchImage("http://x")).rejects.toThrow("API error 429");
  });

  test("throws with the body text when the response is not an image", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => ({ type: "text/plain", text: async () => "rate limited" }),
    }));
    await expect(app.fetchImage("http://x")).rejects.toThrow("rate limited");
  });

  test("aborts and clears the timeout after settling", async () => {
    const clearSpy = jest.spyOn(global, "clearTimeout");
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => imageBlob() }));
    await app.fetchImage("http://x");
    expect(clearSpy).toHaveBeenCalled();
  });
});

describe("generateJob", () => {
  test("on success: adds to gallery, shows result, records last prompt", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => imageBlob() }));
    const ok = await app.generateJob({ prompt: "a prompt", seed: 5 });
    expect(ok).toBe(true);
    expect(app.state.gallery).toHaveLength(1);
    expect(app.state.gallery[0]).toMatchObject({ prompt: "a prompt", seed: 5 });
    expect(app.state.lastPrompt).toBe("a prompt");
    expect(document.getElementById("result").src).toContain("blob:generated");
    expect(document.getElementById("statusText").textContent).toBe("Done");
  });

  test("on failure: toasts, sets error status, returns false", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn(async () => {
      throw new Error("network down");
    });
    const ok = await app.generateJob({ prompt: "p", seed: 1 });
    expect(ok).toBe(false);
    expect(app.state.gallery).toHaveLength(0);
    expect(document.getElementById("statusText").textContent).toBe("Error");
    expect(document.getElementById("toast").textContent).toContain("network down");
  });
});

// Make the inter-request cooldown a no-op by advancing the mocked clock past
// it on every read, so runQueue never sleeps and tests stay fast.
function skipCooldown() {
  let t = 1_000_000;
  return jest.spyOn(Date, "now").mockImplementation(() => (t += 60_000));
}

describe("runQueue", () => {
  test("processes every queued job and clears the queue", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => imageBlob() }));
    app.state.queue = [
      { prompt: "p1", seed: 1 },
      { prompt: "p2", seed: 2 },
    ];
    app.state.cooldownUntil = 0;
    skipCooldown();

    await app.runQueue();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(app.state.queue).toHaveLength(0);
    expect(app.state.running).toBe(false);
    expect(app.state.gallery).toHaveLength(2);
    expect(document.getElementById("generateBtn").disabled).toBe(false);
  });

  test("waits out an active cooldown before generating", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => imageBlob() }));
    jest.spyOn(Date, "now").mockReturnValue(0);
    app.state.queue = [{ prompt: "p", seed: 1 }];
    app.state.cooldownUntil = 5000; // 5s in the (mocked) future

    const p = app.runQueue();
    await Promise.resolve();
    expect(document.getElementById("statusText").textContent).toContain("Cooldown");

    await jest.advanceTimersByTimeAsync(5000);
    await p;
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("is a no-op when a run is already in progress", async () => {
    global.fetch = jest.fn();
    app.state.running = true;
    app.state.queue = [{ prompt: "p", seed: 1 }];
    await app.runQueue();
    expect(global.fetch).not.toHaveBeenCalled();
    app.state.running = false;
  });
});

describe("startGeneration", () => {
  test("queues `batch` jobs with sequential seeds derived from the seed input", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => imageBlob() }));
    skipCooldown();
    document.getElementById("seed").value = "100";
    document.getElementById("batch").value = "3";

    app.startGeneration();
    // let the async queue drain (no real cooldown thanks to skipCooldown)
    while (app.state.running) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 0));
    }

    const seeds = app.state.gallery.map((g) => g.seed).sort((a, b) => a - b);
    expect(seeds).toEqual([100, 101, 102]);
    expect(app.state.lastConfig).toMatchObject({ batch: 3 });
  });

  test("refuses to start a second run and toasts a warning", () => {
    global.fetch = jest.fn();
    app.state.running = true;
    app.startGeneration();
    expect(document.getElementById("toast").textContent).toContain("already in progress");
    expect(global.fetch).not.toHaveBeenCalled();
    app.state.running = false;
  });
});

describe("regenerate", () => {
  test("queues a single fresh study and runs it", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, blob: async () => imageBlob() }));
    skipCooldown();
    app.regenerate();
    while (app.state.running) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(app.state.gallery).toHaveLength(1);
  });
});

describe("downloadCurrent", () => {
  test("clicks a download anchor for the current image", () => {
    const img = document.getElementById("result");
    img.src = "blob:current";
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    app.downloadCurrent();

    expect(clickSpy).toHaveBeenCalledTimes(1);
    // anchor is removed after clicking
    expect(document.querySelector("a[download]")).toBeNull();
  });

  test("does nothing when there is no current image", () => {
    document.getElementById("result").removeAttribute("src");
    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    app.downloadCurrent();
    expect(clickSpy).not.toHaveBeenCalled();
  });
});
