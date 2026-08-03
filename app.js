"use strict";

/* ================================================================
   Atelier - Figure Study Studio
   Free artistic figure-drawing reference generator.
   Backed by Pollinations.ai (no API key required).
   ================================================================ */

const API_BASE = "https://image.pollinations.ai/prompt";
const REFERRER = "atelier-figure-studio"; // set to your GitHub Pages URL
const ANON_GAP_MS = 15000; // anonymous tier: ~1 request / 15s
const FETCH_TIMEOUT_MS = 180000;

/* ---------------- Option catalogs ---------------- */

const POSES = [
  ["standing", "standing upright, weight shifted to one hip"],
  ["contrapposto", "standing in a relaxed contrapposto pose, weight on one leg"],
  ["standing-arms", "standing with one arm raised overhead, the other relaxed at the hip"],
  ["seated", "seated on a low stool, legs together, hands folded"],
  ["seat-edge", "perched on the edge of a chair, leaning slightly forward"],
  ["cross-legged", "sitting cross-legged on the floor, hands resting on knees"],
  ["sitting-ground", "sitting on the floor, legs stretched forward, leaning back on the hands"],
  ["kneeling", "kneeling upright, arms relaxed at the sides"],
  ["kneeling-reach", "kneeling with one arm reaching forward"],
  ["squatting", "in a deep squat, elbows resting on knees"],
  ["reclining", "reclining on the floor, propped up on one elbow"],
  ["lying-prone", "lying flat on the stomach, head turned to the side"],
  ["lying-back", "lying on the back with knees bent"],
  ["fetal", "curled on the side in a fetal position"],
  ["walking", "caught mid-stride, walking with a natural swing"],
  ["running", "caught mid-run, arms and legs driving forward"],
  ["stretching", "in a deep stretch, reaching both arms high overhead"],
  ["reaching-up", "reaching upward with both arms extended"],
  ["reaching-out", "leaning forward and reaching out with one arm"],
  ["lunging", "in a deep forward lunge, arms extended"],
  ["twisting", "twisting at the waist, looking back over the shoulder"],
  ["dancing", "in a fluid, dynamic dancing pose"],
  ["yoga", "in a standing yoga pose with arms outstretched"],
  ["balance", "balancing on one leg, the other lifted behind"],
  ["arching", "arching the back in a deep backbend"],
  ["crouching", "crouching low, arms wrapped around the knees"],
  ["leaning", "leaning to one side, weight resting on one leg"],
  ["lifting", "in a lifting posture, arms bent and braced"],
];

const GENDERS = {
  female: "a nude female figure",
  male: "a nude male figure",
  androgynous: "a nude androgynous figure",
  any: "a nude human figure",
};

const AGES = {
  young: "young adult, early twenties",
  adult: "adult figure, early thirties",
  middle: "middle-aged figure, early fifties",
  mature: "mature figure, mid-seventies",
};

const BODIES = {
  slender: "slender, petite body proportions",
  athletic: "lean, athletic body with toned musculature",
  average: "average, natural body proportions",
  curvy: "curvy hourglass body proportions",
  muscular: "muscular, powerfully built body",
  plus: "fuller, soft body proportions",
  lean: "lean, androgynous body proportions",
  any: "",
};

const MEDIUMS = {
  pencil: "graphite pencil sketch, soft tonal shading, visible pencil strokes",
  charcoal: "charcoal sketch, rich deep blacks, smudged tonal gradations",
  sanguine: "red sanguine conté chalk sketch, warm terracotta linework",
  ink: "bold ink line drawing, confident contour lines, minimal shading",
  crosshatch: "pen-and-ink crosshatch drawing, dense hatched tonal shading",
  gesture: "loose rapid gesture drawing, expressive sketchy lines, motion implied",
  chalk: "white chalk figure drawing on dark toned paper",
};

const LINES = {
  loose: "loose gestural linework",
  medium: "confident medium-weight contour lines",
  tight: "tight carefully studied contour lines",
};

const SHADES = {
  none: "no shading, pure contour drawing",
  light: "light soft tonal shading",
  heavy: "heavy dramatic tonal shading with strong contrast",
};

const VIEWS = {
  front: "front view",
  threequarter: "three-quarter view",
  side: "profile view from the side",
  back: "back view",
  any: "",
};

const BGS = {
  white: "plain white paper background",
  toned: "warm toned paper background",
  dark: "dark charcoal gray paper background",
  plain: "minimal empty studio backdrop",
};

const LIGHTS = {
  none: "",
  soft: "soft diffused studio lighting",
  side: "strong directional side lighting",
  window: "natural window lighting from the side",
  chiaroscuro: "dramatic chiaroscuro lighting",
};

const ASPECTS = {
  "3x4": [768, 1024],
  "9x16": [720, 1280],
  square: [896, 896],
};

const QUALITY_SUFFIX =
  "fine art life drawing, academic anatomy study, elegant natural proportions, " +
  "full body visible head to toe, figure centered on the page, " +
  "no text, no watermark, no signature, no background objects";

/* ---------------- Errors ---------------- */

/** A failure reported by (or while talking to) the image API. */
class ApiError extends Error {
  constructor(message, { status = null, cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (cause) this.cause = cause;
  }
}

/** Invalid or incomplete UI configuration - the user can fix it. */
class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

function messageOf(err) {
  if (err instanceof ApiError || err instanceof ConfigError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return String(err ?? "unknown error");
}

/** Surface an error we did not expect instead of letting it vanish. */
function reportUnexpected(context, err) {
  console.error(`${context}:`, err);
  toast(`${context}: ${messageOf(err)}`);
  setStatus("Error");
}

/* ---------------- DOM helpers ---------------- */

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing required element #${id}`);
  return el;
}

const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function radioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function setRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (!el) {
    console.warn(`No "${name}" option with value "${value}"`);
    return false;
  }
  el.checked = true;
  return true;
}

function randomOf(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function newSeed() {
  return Math.floor(Math.random() * 1e6);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toast(msg, ms = 3200) {
  // Deliberately does not use $(): toast is the error channel itself, so a
  // missing node must not raise a second error on top of the first one.
  const el = document.getElementById("toast");
  if (!el) {
    console.warn(`toast (no #toast element): ${msg}`);
    return;
  }
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), ms);
}

/* ---------------- State ---------------- */

const state = {
  running: false,
  queue: [], // jobs: { prompt, seed }
  lastPrompt: "",
  lastConfig: null,
  gallery: [], // { url, prompt, seed }
  cooldownUntil: 0,
};

/* ---------------- Prompt building ---------------- */

/**
 * Look up the prompt fragment for a radio group.
 * Required groups raise ConfigError rather than quietly dropping a fragment
 * and sending a prompt that is missing its subject or medium.
 */
function promptFragment(map, group, label, { required = false } = {}) {
  const value = radioValue(group);
  if (!Object.prototype.hasOwnProperty.call(map, value)) {
    if (required) {
      throw new ConfigError(
        value === "" ? `Choose a ${label} before generating.` : `Unknown ${label}: "${value}".`
      );
    }
    console.warn(`Ignoring unknown "${group}" value ${JSON.stringify(value)}`);
    return "";
  }
  return map[value];
}

function buildPrompt() {
  const gender = promptFragment(GENDERS, "gender", "gender", { required: true });
  const age = promptFragment(AGES, "age", "age range");
  const body = promptFragment(BODIES, "body", "body type");
  const poseId = radioValue("pose");
  const pose = POSES.find(([id]) => id === poseId);
  if (!pose) throw new ConfigError(poseId === "" ? "Choose a pose before generating." : `Unknown pose: "${poseId}".`);
  const poseDesc = pose[1];
  const view = promptFragment(VIEWS, "view", "view angle");
  const medium = promptFragment(MEDIUMS, "medium", "sketch medium", { required: true });
  const line = promptFragment(LINES, "line", "line handling");
  const shade = promptFragment(SHADES, "shade", "shading");
  const bg = promptFragment(BGS, "bg", "background");
  const light = promptFragment(LIGHTS, "light", "lighting");

  const parts = [
    "Artistic figure drawing study,",
    gender,
    age,
    body,
    "full body,",
    poseDesc + ",",
    view,
    medium,
    line,
    shade,
    bg,
    light,
    QUALITY_SUFFIX,
  ];

  return parts.filter((p) => p && p.trim() !== "").join(" ");
}

function readConfig() {
  return {
    gender: radioValue("gender"),
    age: radioValue("age"),
    body: radioValue("body"),
    pose: radioValue("pose"),
    view: radioValue("view"),
    medium: radioValue("medium"),
    line: radioValue("line"),
    shade: radioValue("shade"),
    bg: radioValue("bg"),
    light: radioValue("light"),
    model: radioValue("model"),
    aspect: radioValue("aspect"),
    batch: readBatch(),
  };
}

const MAX_BATCH = 4;

function readBatch() {
  const raw = $("batch").value;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    console.warn(`Unreadable batch size ${JSON.stringify(raw)}, falling back to 1`);
    return 1;
  }
  const clamped = Math.min(MAX_BATCH, Math.max(1, n));
  if (clamped !== n) {
    console.warn(`Batch size ${n} out of range, clamped to ${clamped}`);
    toast(`Batch size limited to ${clamped}.`);
  }
  return clamped;
}

/** Parse the seed field; throws ConfigError on anything unusable. */
function readSeed() {
  const raw = $("seed").value.trim();
  if (raw === "") return newSeed();
  if (!/^\d+$/.test(raw)) {
    throw new ConfigError("Seed must be a whole number between 0 and 999999 (leave blank for random).");
  }
  return Number.parseInt(raw, 10) % 1000000;
}

/* ---------------- Rendering ---------------- */

function renderPoseGrid() {
  const grid = $("poseGrid");
  grid.innerHTML = POSES.map(
    ([id, label]) => `
    <label class="chip"><input type="radio" name="pose" value="${id}" />
      <span>${label}</span></label>`
  ).join("");
  if (!setRadio("pose", "standing")) {
    throw new Error("pose grid rendered without its default pose");
  }
}

function setStatus(text) {
  const el = document.getElementById("statusText");
  if (!el) {
    console.warn(`status (no #statusText element): ${text}`);
    return;
  }
  el.textContent = text;
}

function showResult(imgUrl) {
  const img = $("result");
  img.src = imgUrl;
  img.classList.remove("hidden");
  $("placeholder").classList.add("hidden");
  $("loader").classList.add("hidden");
  $("downloadBtn").classList.remove("hidden");
  $("regenBtn").classList.remove("hidden");
  setStatus("Done");
}

function showLoader(text) {
  $("loaderText").textContent = text;
  $("result").classList.add("hidden");
  $("placeholder").classList.add("hidden");
  $("loader").classList.remove("hidden");
}

function showPlaceholder() {
  $("loader").classList.add("hidden");
  $("result").classList.add("hidden");
  $("downloadBtn").classList.add("hidden");
  $("regenBtn").classList.remove("hidden");
  $("placeholder").classList.remove("hidden");
}

function renderGallery() {
  const el = $("gallery");
  if (state.gallery.length === 0) {
    el.innerHTML = `<p class="gallery-empty">No studies yet this session. Generate one to begin.</p>`;
    return;
  }
  el.innerHTML = state.gallery
    .map(
      (item, i) => `
      <div class="gallery-item" data-i="${i}">
        <img src="${item.url}" alt="Study ${i + 1}" loading="lazy" />
        <div class="gallery-actions">
          <button class="view" type="button">View</button>
          <button class="dl" type="button">Save</button>
          <button class="del" type="button">Delete</button>
        </div>
      </div>`
    )
    .join("");
}

function updatePromptPreview() {
  const box = $("promptBox");
  if (state.lastPrompt) {
    $("promptText").textContent = state.lastPrompt;
    box.classList.remove("hidden");
  }
}

/* ---------------- API ---------------- */

function buildUrl(prompt, seed) {
  const aspect = radioValue("aspect");
  if (!Object.prototype.hasOwnProperty.call(ASPECTS, aspect)) {
    console.warn(`Unknown aspect ${JSON.stringify(aspect)}, using 3x4`);
  }
  const [width, height] = ASPECTS[aspect] || ASPECTS["3x4"];
  const model = radioValue("model") || "flux";
  const params = new URLSearchParams({
    model,
    width: String(width),
    height: String(height),
    seed: String(seed),
    private: "true",
    referrer: REFERRER,
  });
  return `${API_BASE}/${encodeURIComponent(prompt)}?${params.toString()}`;
}

function httpErrorMessage(status) {
  if (status === 429) return "Rate limited by Pollinations - wait a moment before generating again.";
  if (status === 402 || status === 401 || status === 403) {
    return `The image service refused the request (HTTP ${status}).`;
  }
  if (status === 404) return "The image endpoint could not be found (HTTP 404).";
  if (status >= 500) return `The image service is unavailable right now (HTTP ${status}).`;
  return `The image service rejected the request (HTTP ${status}).`;
}

async function fetchImage(url) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  try {
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } catch (err) {
      if (timedOut) {
        throw new ApiError(
          `The request timed out after ${Math.round(FETCH_TIMEOUT_MS / 1000)}s.`,
          { cause: err }
        );
      }
      if (err && err.name === "AbortError") throw new ApiError("The request was cancelled.", { cause: err });
      throw new ApiError("Could not reach the image service - check your connection.", { cause: err });
    }

    if (!res.ok) throw new ApiError(httpErrorMessage(res.status), { status: res.status });

    let blob;
    try {
      blob = await res.blob();
    } catch (err) {
      throw new ApiError("The image download was interrupted.", { status: res.status, cause: err });
    }

    if (!blob.type.startsWith("image/")) {
      // The API answers some failures with a 200 + text/plain body; read it so
      // the real reason reaches the user instead of a generic failure.
      let detail = "";
      try {
        detail = (await blob.text()).trim();
      } catch (err) {
        console.error("Could not read non-image response body:", err);
      }
      throw new ApiError(detail.slice(0, 200) || `Unexpected response type "${blob.type || "unknown"}".`, {
        status: res.status,
      });
    }

    if (blob.size === 0) throw new ApiError("The image service returned an empty image.", { status: res.status });

    return blob;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve once the browser can actually decode the blob URL. */
function decodeImage(imgUrl) {
  return new Promise((resolve, reject) => {
    const probe = new Image();
    probe.onload = () => resolve();
    probe.onerror = () => reject(new Error("the browser could not decode the returned image data"));
    probe.src = imgUrl;
  });
}

/**
 * Run a single job.
 * Returns { ok: true } or { ok: false, error } - never throws, so one failed
 * study does not abort the rest of the queue, but the error is both logged
 * and handed back to the caller for the batch summary.
 */
async function generateJob(job) {
  showLoader("Studying the figure\u2026");
  setStatus("Generating\u2026");
  let imgUrl = null;
  try {
    const url = buildUrl(job.prompt, job.seed);
    const blob = await fetchImage(url);
    imgUrl = URL.createObjectURL(blob);
    try {
      await decodeImage(imgUrl);
    } catch (err) {
      throw new ApiError("The generated image could not be displayed.", { cause: err });
    }
    state.gallery.unshift({ url: imgUrl, prompt: job.prompt, seed: job.seed });
    renderGallery();
    showResult(imgUrl);
    state.lastPrompt = job.prompt;
    updatePromptPreview();
    return { ok: true };
  } catch (err) {
    if (imgUrl) URL.revokeObjectURL(imgUrl); // never leak a URL we did not keep
    console.error(`Study with seed ${job.seed} failed:`, err);
    toast("Generation failed: " + messageOf(err));
    setStatus("Error");
    return { ok: false, error: err };
  }
}

async function runQueue() {
  if (state.running) return;
  state.running = true;
  $("generateBtn").disabled = true;
  $("randomizeBtn").disabled = true;

  const total = state.queue.length;
  let failures = 0;
  let lastError = null;
  try {
    for (let i = 0; i < total; i++) {
      const remaining = total - i;
      $("queueText").textContent =
        remaining > 1 ? `${remaining} studies queued \u2014 waiting between requests` : "";

      const wait = state.cooldownUntil - Date.now();
      if (wait > 0) {
        setStatus(`Cooldown ${Math.ceil(wait / 1000)}s\u2026`);
        await sleep(wait);
      }

      const job = state.queue[i];
      const result = await generateJob(job);
      if (!result.ok) {
        failures++;
        lastError = result.error;
      }

      const minGap = result.ok ? ANON_GAP_MS : 8000;
      state.cooldownUntil = Date.now() + minGap;
    }
  } catch (err) {
    // generateJob handles its own failures, so anything here is a bug or a
    // broken DOM - report it instead of ending the run silently.
    reportUnexpected("Generation stopped unexpectedly", err);
  } finally {
    state.queue = [];
    state.running = false;
    $("generateBtn").disabled = false;
    $("randomizeBtn").disabled = false;
    $("queueText").textContent = "";
    if (failures === 0) {
      if (state.gallery.length) setStatus("Idle");
    } else {
      setStatus(failures === total ? "Error" : `Finished with ${failures} failed`);
      if (total > 1) {
        toast(`${failures} of ${total} studies failed: ${messageOf(lastError)}`, 5000);
      }
    }
  }
}

/** Start the queue without leaving an unobserved promise behind. */
function startQueue() {
  runQueue().catch((err) => reportUnexpected("Generation queue crashed", err));
}

function startGeneration() {
  if (state.running) {
    toast("Generation already in progress.");
    return;
  }
  let cfg;
  let prompt;
  let baseSeed;
  try {
    cfg = readConfig();
    prompt = buildPrompt();
    baseSeed = readSeed();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.warn("Invalid generation settings:", err);
      toast(err.message);
      setStatus("Check your settings");
      return;
    }
    reportUnexpected("Could not prepare the generation", err);
    return;
  }

  state.lastConfig = cfg;
  const batch = cfg.batch;
  const jobs = [];
  for (let i = 0; i < batch; i++) {
    jobs.push({ prompt, seed: (baseSeed + i) % 1000000 });
  }
  state.queue = jobs;
  setStatus(`Queueing ${batch} study${batch > 1 ? "s" : ""}\u2026`);
  startQueue();
}

function regenerate() {
  if (state.running) {
    toast("Generation already in progress.");
    return;
  }
  let prompt;
  try {
    prompt = buildPrompt();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.warn("Invalid generation settings:", err);
      toast(err.message);
      setStatus("Check your settings");
      return;
    }
    reportUnexpected("Could not prepare the generation", err);
    return;
  }
  state.queue = [{ prompt, seed: newSeed() }];
  setStatus("Queueing\u2026");
  startQueue();
}

/* ---------------- Randomize ---------------- */

function surpriseMe() {
  const groups = ["gender", "age", "body", "medium", "line", "shade", "view", "bg", "light", "aspect", "model"];
  const skipped = [];
  for (const g of groups) {
    const opts = $$(`input[name="${g}"]`);
    if (opts.length === 0) {
      skipped.push(g);
      continue;
    }
    if (!setRadio(g, randomOf(opts).value)) skipped.push(g);
  }
  if (!setRadio("pose", randomOf(POSES)[0])) skipped.push("pose");
  if (skipped.length > 0) {
    console.error(`Randomize could not set: ${skipped.join(", ")}`);
    toast(`Could not randomize: ${skipped.join(", ")}.`);
    setStatus("Randomize incomplete");
    return;
  }
  $("seed").value = newSeed();
  $("batch").value = "1";
  setStatus("Randomized \u2014 ready to generate");
  toast("Randomized all parameters.");
}

function randomPose() {
  setRadio("pose", randomOf(POSES)[0]);
}

/* ---------------- Downloads ---------------- */

function saveUrl(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
  }
}

function downloadCurrent() {
  const img = $("result");
  if (!img.src || img.classList.contains("hidden")) {
    toast("Nothing to download yet - generate a study first.");
    return;
  }
  try {
    saveUrl(img.src, `figure-study-${Date.now()}.png`);
  } catch (err) {
    reportUnexpected("Download failed", err);
  }
}

function copyPrompt() {
  const text = $("promptText").textContent;
  if (!text) {
    toast("No prompt to copy yet.");
    return;
  }
  // navigator.clipboard is undefined on insecure origins (e.g. file://).
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    console.warn("Clipboard API unavailable (needs a secure context such as https:// or localhost)");
    toast("Clipboard unavailable here - select the prompt and copy manually.", 5000);
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast("Prompt copied to clipboard."))
    .catch((err) => {
      console.error("Clipboard write failed:", err);
      toast(`Could not copy: ${messageOf(err)}`);
    });
}

/* ---------------- Events ---------------- */

function wireEvents() {
  $("generateBtn").addEventListener("click", startGeneration);
  $("randomizeBtn").addEventListener("click", surpriseMe);
  $("randomPoseBtn").addEventListener("click", randomPose);
  $("rollSeedBtn").addEventListener("click", () => {
    $("seed").value = newSeed();
  });
  $("togglePromptBtn").addEventListener("click", () => {
    const box = $("promptBox");
    box.classList.toggle("hidden");
    if (!box.classList.contains("hidden") && !state.lastPrompt) {
      try {
        state.lastPrompt = buildPrompt();
      } catch (err) {
        if (!(err instanceof ConfigError)) throw err;
        console.warn("Cannot preview prompt:", err);
        $("promptText").textContent = err.message;
        toast(err.message);
        return;
      }
      updatePromptPreview();
    }
  });

  // A blob URL can be revoked while it is still displayed (gallery cleared or
  // item deleted); without this the viewer would just show a broken image.
  $("result").addEventListener("error", () => {
    const src = $("result").getAttribute("src");
    if (!src) return;
    console.error("Result image failed to render:", src);
    toast("That image is no longer available.");
    setStatus("Error");
  });
  $("copyPromptBtn").addEventListener("click", copyPrompt);
  $("downloadBtn").addEventListener("click", downloadCurrent);
  $("regenBtn").addEventListener("click", regenerate);
  $("clearGalleryBtn").addEventListener("click", () => {
    $("result").removeAttribute("src");
    state.gallery.forEach((item) => URL.revokeObjectURL(item.url));
    state.gallery = [];
    renderGallery();
    showPlaceholder();
    setStatus("Gallery cleared");
  });

  $("gallery").addEventListener("click", (e) => {
    const itemEl = e.target.closest(".gallery-item");
    if (!itemEl) return;
    const idx = parseInt(itemEl.dataset.i, 10);
    const item = state.gallery[idx];
    if (!item) return;

    if (e.target.classList.contains("view")) {
      $("result").src = item.url;
      $("result").classList.remove("hidden");
      $("placeholder").classList.add("hidden");
      $("loader").classList.add("hidden");
      $("downloadBtn").classList.remove("hidden");
      $("regenBtn").classList.remove("hidden");
      setStatus("Viewing from gallery");
    } else if (e.target.classList.contains("dl")) {
      try {
        saveUrl(item.url, `figure-study-${item.seed}.png`);
      } catch (err) {
        reportUnexpected("Download failed", err);
      }
    } else if (e.target.classList.contains("del")) {
      const viewer = $("result");
      if (viewer.getAttribute("src") === item.url) {
        viewer.removeAttribute("src");
        showPlaceholder();
      }
      URL.revokeObjectURL(item.url);
      state.gallery.splice(idx, 1);
      renderGallery();
    }
  });
}

/* ---------------- Init ---------------- */

/** Last-resort net for errors that escape a handler or an async task. */
function installGlobalErrorHandlers() {
  window.addEventListener("error", (e) => {
    console.error("Uncaught error:", e.error || e.message);
    toast(`Something went wrong: ${messageOf(e.error || e.message)}`, 5000);
  });
  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise rejection:", e.reason);
    toast(`Something went wrong: ${messageOf(e.reason)}`, 5000);
  });
}

function showFatal(err) {
  console.error("Atelier failed to start:", err);
  const banner = document.createElement("p");
  banner.className = "fatal-error";
  banner.setAttribute("role", "alert");
  banner.textContent = `Atelier failed to start: ${messageOf(err)}. Try reloading the page.`;
  document.body.prepend(banner);
}

document.addEventListener("DOMContentLoaded", () => {
  installGlobalErrorHandlers();
  try {
    renderPoseGrid();
    wireEvents();
  } catch (err) {
    // Without this the page would look normal but no button would respond.
    showFatal(err);
    setStatus("Failed to start");
    return;
  }
  setStatus("Ready");
});
