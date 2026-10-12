"use strict";

module.exports = {
  testEnvironment: "jsdom",
  collectCoverageFrom: ["app.js"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
};
