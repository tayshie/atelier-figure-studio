"use strict";

const fs = require("fs");
const path = require("path");

const INDEX_HTML = fs.readFileSync(
  path.join(__dirname, "..", "..", "index.html"),
  "utf8"
);

/**
 * Extract the <body> markup from index.html (minus the <script> tag so we can
 * control when app.js is loaded) and install it into the current jsdom document.
 */
function loadIndexBody() {
  const bodyMatch = INDEX_HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : "";
  body = body.replace(/<script[\s\S]*?<\/script>/gi, "");
  document.body.innerHTML = body;
}

/**
 * Load index.html into the DOM, require a fresh copy of app.js, and run its
 * init logic (pose grid + event wiring). We invoke the init functions directly
 * rather than dispatching DOMContentLoaded: jsdom keeps one document per test
 * file, so each require would otherwise leave a lingering DOMContentLoaded
 * listener and re-fire init for every previously loaded copy.
 * Returns the app module (exported functions/state).
 */
function loadApp({ init = true } = {}) {
  loadIndexBody();
  jest.resetModules();
  const app = require("../../app.js");
  if (init) {
    app.renderPoseGrid();
    app.wireEvents();
  }
  return app;
}

module.exports = { INDEX_HTML, loadIndexBody, loadApp };
