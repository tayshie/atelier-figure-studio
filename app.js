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

const MODELS = ["flux", "turbo", "stable-diffusion"];
const MAX_SEED = 999999;
const MAX_BATCH = 4;

/* ---------------- DOM helpers ---------------- */

const $ = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function radioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function setRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
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
  const el = $("toast");
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

function buildPrompt() {
  const gender = GENDERS[radioValue("gender")];
  const age = AGES[radioValue("age")];
  const body = BODIES[radioValue("body")];
  const poseId = radioValue("pose");
  const poseDesc = POSES.find(([id]) => id === poseId)?.[1] || "standing in a relaxed pose";
  const view = VIEWS[radioValue("view")];
  const medium = MEDIUMS[radioValue("medium")];
  const line = LINES[radioValue("line")];
  const shade = SHADES[radioValue("shade")];
  const bg = BGS[radioValue("bg")];
  const light = LIGHTS[radioValue("light")];

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
    batch: clampInt($("batch").value, 1, MAX_BATCH, 1),
  };
}

/* ---------------- Rendering ---------------- */

function renderPoseGrid() {
  const grid = $("poseGrid");
  grid.innerHTML = POSES.map(
    ([id, label]) => `
    <label class="chip"><input type="radio" name="pose" value="${escapeHtml(id)}" />
      <span>${escapeHtml(label)}</span></label>`
  ).join("");
  setRadio("pose", "standing");
}

function setStatus(text) {
  $("statusText").textContent = text;
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
        <img src="${escapeHtml(item.url)}" alt="Study ${i + 1}" loading="lazy" />
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
  const [width, height] = ASPECTS[radioValue("aspect")] || ASPECTS["3x4"];
  const requested = radioValue("model");
  const model = MODELS.includes(requested) ? requested : "flux";
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

async function fetchImage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) {
      throw new Error("Non-image response from the image API");
    }
    return blob;
  } finally {
    clearTimeout(timer);
  }
}

async function generateJob(job) {
  showLoader("Studying the figure\u2026");
  setStatus("Generating\u2026");
  const url = buildUrl(job.prompt, job.seed);
  try {
    const blob = await fetchImage(url);
    const imgUrl = URL.createObjectURL(blob);
    state.gallery.unshift({ url: imgUrl, prompt: job.prompt, seed: job.seed });
    renderGallery();
    showResult(imgUrl);
    state.lastPrompt = job.prompt;
    updatePromptPreview();
    return true;
  } catch (err) {
    console.error(err);
    toast("Generation failed: " + (err.message || "unknown error"));
    setStatus("Error");
    return false;
  }
}

async function runQueue() {
  if (state.running) return;
  state.running = true;
  $("generateBtn").disabled = true;
  $("randomizeBtn").disabled = true;

  const total = state.queue.length;
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
      const ok = await generateJob(job);

      const minGap = ok ? ANON_GAP_MS : 8000;
      state.cooldownUntil = Date.now() + minGap;
    }
  } finally {
    state.queue = [];
    state.running = false;
    $("generateBtn").disabled = false;
    $("randomizeBtn").disabled = false;
    $("queueText").textContent = "";
    if (state.gallery.length) setStatus("Idle");
  }
}

function startGeneration() {
  if (state.running) {
    toast("Generation already in progress.");
    return;
  }
  const cfg = readConfig();
  state.lastConfig = cfg;
  const prompt = buildPrompt();
  const batch = cfg.batch;

  const seedInput = $("seed").value.trim();
  const baseSeed = seedInput === "" ? newSeed() : clampInt(seedInput, 0, MAX_SEED, newSeed());
  const jobs = [];
  for (let i = 0; i < batch; i++) {
    jobs.push({ prompt, seed: (baseSeed + i) % 1000000 });
  }
  state.queue = jobs;
  setStatus(`Queueing ${batch} study${batch > 1 ? "s" : ""}\u2026`);
  runQueue();
}

function regenerate() {
  const baseSeed = newSeed();
  state.queue = [{ prompt: buildPrompt(), seed: baseSeed }];
  setStatus("Queueing\u2026");
  runQueue();
}

/* ---------------- Randomize ---------------- */

function surpriseMe() {
  const groups = ["gender", "age", "body", "medium", "line", "shade", "view", "bg", "light", "aspect", "model"];
  for (const g of groups) {
    const opts = $$(`input[name="${g}"]`);
    setRadio(g, randomOf(opts).value);
  }
  setRadio("pose", randomOf(POSES)[0]);
  $("seed").value = newSeed();
  $("batch").value = "1";
  setStatus("Randomized \u2014 ready to generate");
  toast("Randomized all parameters.");
}

function randomPose() {
  setRadio("pose", randomOf(POSES)[0]);
}

/* ---------------- Downloads ---------------- */

function downloadCurrent() {
  const img = $("result");
  if (!img.src) return;
  const a = document.createElement("a");
  a.href = img.src;
  a.download = `figure-study-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
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
      state.lastPrompt = buildPrompt();
      updatePromptPreview();
    }
  });
  $("copyPromptBtn").addEventListener("click", () => {
    navigator.clipboard
      .writeText($("promptText").textContent)
      .then(() => toast("Prompt copied to clipboard."))
      .catch(() => toast("Could not copy."));
  });
  $("downloadBtn").addEventListener("click", downloadCurrent);
  $("regenBtn").addEventListener("click", regenerate);
  $("clearGalleryBtn").addEventListener("click", () => {
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
      const a = document.createElement("a");
      a.href = item.url;
      a.download = `figure-study-${item.seed}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else if (e.target.classList.contains("del")) {
      URL.revokeObjectURL(item.url);
      state.gallery.splice(idx, 1);
      renderGallery();
    }
  });
}

/* ---------------- Init ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  renderPoseGrid();
  wireEvents();
  setStatus("Ready");
});
