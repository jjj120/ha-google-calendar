import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist/google-calendar-card.js");

test("bundle file exists and is valid JavaScript bundle", () => {
  assert.ok(fs.existsSync(distPath), "dist/google-calendar-card.js should exist");
  const content = fs.readFileSync(distPath, "utf-8");
  assert.ok(content.length > 10000, `Bundle should be substantial (actual length: ${content.length})`);
});

test("bundle registers google-calendar-card and google-calendar-card-editor custom elements", () => {
  const content = fs.readFileSync(distPath, "utf-8");
  assert.ok(
    content.includes('customElements.define("google-calendar-card"'),
    "Bundle must define google-calendar-card custom element"
  );
  assert.ok(
    content.includes('customElements.define("google-calendar-card-editor"'),
    "Bundle must define google-calendar-card-editor custom element"
  );
});

test("bundle registers in window.customCards for Lovelace UI card picker", () => {
  const content = fs.readFileSync(distPath, "utf-8");
  assert.ok(
    content.includes("window.customCards"),
    "Bundle must check/push to window.customCards"
  );
  assert.ok(
    content.includes('type: "google-calendar-card"'),
    "customCards metadata must have type google-calendar-card"
  );
});

test("bundle includes <ha-form> native HA editor with domain calendar selector", () => {
  const content = fs.readFileSync(distPath, "utf-8");
  assert.ok(
    content.includes("<ha-form"),
    "Editor should render <ha-form>"
  );
  assert.ok(
    content.includes('domain: "calendar"'),
    "Editor schema should filter entities by domain: calendar"
  );
  assert.ok(
    content.includes("multiple: true"),
    "Editor schema should support multiple calendar entities"
  );
});

test("bundle includes all 11 Google colorId definitions and contrast helper", () => {
  const content = fs.readFileSync(distPath, "utf-8");
  for (let i = 1; i <= 11; i++) {
    assert.ok(
      content.includes(`"${i}":`),
      `Bundle should contain color definition for colorId ${i}`
    );
  }
  assert.ok(
    content.includes("getTextContrastColor"),
    "Bundle should contain contrast calculation function"
  );
});

test("bundle includes proper 2-line clamp truncation and grid column styles", () => {
  const content = fs.readFileSync(distPath, "utf-8");
  assert.ok(
    content.includes("grid-template-columns: repeat(7, minmax(0, 1fr));"),
    "Bundle must define grid tracks with minmax(0, 1fr) to prevent content-based expansion"
  );
  assert.ok(
    content.includes("-webkit-line-clamp: 2;"),
    "Bundle must include 2-line clamping for event chips and cards"
  );
  assert.ok(
    content.includes("overflow-wrap: anywhere;"),
    "Bundle must include overflow-wrap: anywhere to allow breaking long words across lines"
  );
});

test("bundle has zero syntax errors (validates cleanly with node -c)", () => {
  const result = execFileSync(process.execPath, ["-c", distPath], { encoding: "utf-8" });
  assert.equal(result, "");
});

