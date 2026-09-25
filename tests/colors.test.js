import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GOOGLE_EVENT_COLORS,
  DEFAULT_COLOR,
  getTextContrastColor,
  getEventColor,
} from "../src/colors.js";

test("GOOGLE_EVENT_COLORS contains all 11 Google official event colors", () => {
  assert.equal(Object.keys(GOOGLE_EVENT_COLORS).length, 11);
  for (let i = 1; i <= 11; i++) {
    const key = String(i);
    assert.ok(GOOGLE_EVENT_COLORS[key], `Color ID ${key} should exist`);
    assert.match(GOOGLE_EVENT_COLORS[key].background, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(GOOGLE_EVENT_COLORS[key].name);
  }

  // Check specific colors
  assert.equal(GOOGLE_EVENT_COLORS["1"].name, "Lavender");
  assert.equal(GOOGLE_EVENT_COLORS["1"].background, "#7986CB");

  assert.equal(GOOGLE_EVENT_COLORS["2"].name, "Sage");
  assert.equal(GOOGLE_EVENT_COLORS["2"].background, "#33B679");

  assert.equal(GOOGLE_EVENT_COLORS["5"].name, "Banana");
  assert.equal(GOOGLE_EVENT_COLORS["5"].background, "#F6BF26");
  assert.equal(GOOGLE_EVENT_COLORS["5"].foreground, "#1D1D1D"); // High-contrast dark text

  assert.equal(GOOGLE_EVENT_COLORS["11"].name, "Tomato");
  assert.equal(GOOGLE_EVENT_COLORS["11"].background, "#D50000");
  assert.equal(GOOGLE_EVENT_COLORS["11"].foreground, "#FFFFFF");
});

test("getTextContrastColor correctly chooses between white and dark text", () => {
  // Pure white and bright yellow -> dark text
  assert.equal(getTextContrastColor("#FFFFFF"), "#1D1D1D");
  assert.equal(getTextContrastColor("#FFFF00"), "#1D1D1D");
  assert.equal(getTextContrastColor("#F6BF26"), "#1D1D1D"); // Banana yellow

  // Pure black and dark tones -> white text
  assert.equal(getTextContrastColor("#000000"), "#FFFFFF");
  assert.equal(getTextContrastColor("#7986CB"), "#FFFFFF"); // Lavender
  assert.equal(getTextContrastColor("#D50000"), "#FFFFFF"); // Tomato red
  assert.equal(getTextContrastColor("#3F51B5"), "#FFFFFF"); // Blueberry
});

test("getEventColor correctly resolves colors and overrides", () => {
  // 1. Standard colorId resolution
  const c1 = getEventColor("1");
  assert.equal(c1.background, "#7986CB");
  assert.equal(c1.name, "Lavender");

  const c4 = getEventColor(4); // Numeric input should work
  assert.equal(c4.background, "#E67C73");
  assert.equal(c4.name, "Flamingo");

  // 2. Custom color override takes precedence
  const overrides = { "1": "#FF00FF", default: "#112233" };
  const c1Overridden = getEventColor("1", overrides);
  assert.equal(c1Overridden.background, "#FF00FF");

  // 3. Unspecified colorId with default override
  const cNullWithOverride = getEventColor(null, overrides);
  assert.equal(cNullWithOverride.background, "#112233");

  // 4. Entity fallback color
  const cEntityFallback = getEventColor(null, {}, "#00AA55");
  assert.equal(cEntityFallback.background, "#00AA55");

  // 5. Default fallback
  const cDefault = getEventColor(null);
  assert.equal(cDefault.background, DEFAULT_COLOR.background);
});
