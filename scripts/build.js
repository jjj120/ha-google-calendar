/**
 * Build script for Google Calendar Card.
 * Bundles ES modules from src/ into a single standalone bundle in dist/google-calendar-card.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const srcFiles = [
  "src/colors.js",
  "src/styles.js",
  "src/api/google-direct.js",
  "src/api/ha-backend.js",
  "src/views/agenda.js",
  "src/views/month.js",
  "src/views/week.js",
  "src/views/day.js",
  "src/editor.js",
  "src/google-calendar-card.js",
];

function cleanModuleSyntax(code) {
  return code
    // Remove import statements (multi-line or single-line)
    .replace(/import\s+(?:(?:\*\s+as\s+\w+)|(?:\{[^}]*\})|(?:\w+))?\s*(?:from\s*)?['"][^'"]+['"];?/g, "")
    // Remove export default
    .replace(/export\s+default\s+/g, "")
    // Remove export { ... }
    .replace(/export\s*\{[^}]*\};?/g, "")
    // Remove export keyword from async function, function, const, let, var, class
    .replace(/export\s+(async\s+function|function|const|let|var|class)\s+/g, "$1 ")
    // Remove any remaining standalone export at start of line
    .replace(/^export\s+/gm, "");
}

function build() {
  console.log("Building Google Calendar Card bundle...");

  let bundleContent = `/**
 * Google Calendar Card for Home Assistant Lovelace
 * With individual event colorId support and multi-view layout.
 * https://github.com/jonas/ha-google-calendar
 * License: MIT
 */
(() => {
`;

  // Track defined identifiers to prevent duplicate declarations across view files
  const declaredHelpers = new Set();

  for (const relPath of srcFiles) {
    const fullPath = path.join(rootDir, relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`Error: File not found: ${fullPath}`);
      process.exit(1);
    }

    let code = fs.readFileSync(fullPath, "utf-8");
    code = cleanModuleSyntax(code);

    // Dedup escapeHtml function across files
    if (code.includes("function escapeHtml(")) {
      if (declaredHelpers.has("escapeHtml")) {
        code = code.replace(/function escapeHtml\([^)]*\)\s*\{[\s\S]*?\n\}/g, "");
      } else {
        declaredHelpers.add("escapeHtml");
      }
    }

    bundleContent += `\n// --- ${path.basename(relPath)} ---\n`;
    bundleContent += code.trim() + "\n";
  }

  // Add custom card registration for Home Assistant
  bundleContent += `
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "google-calendar-card")) {
  window.customCards.push({
    type: "google-calendar-card",
    name: "Google Calendar Card",
    description: "Displays Google Calendar events with per-event colorId support, multi-view layout, and rich customization.",
    preview: true,
    documentationURL: "https://github.com/jonas/ha-google-calendar",
  });
}

})();
`;

  const distDir = path.join(rootDir, "dist");
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const distFile = path.join(distDir, "google-calendar-card.js");
  fs.writeFileSync(distFile, bundleContent, "utf-8");
  console.log(`Bundle created successfully: ${distFile} (${(bundleContent.length / 1024).toFixed(1)} KB)`);

  // Copy to custom_components/google_calendar_card/frontend
  const ccFrontendDir = path.join(rootDir, "custom_components", "google_calendar_card", "frontend");
  if (!fs.existsSync(ccFrontendDir)) {
    fs.mkdirSync(ccFrontendDir, { recursive: true });
  }
  fs.copyFileSync(distFile, path.join(ccFrontendDir, "google-calendar-card.js"));
  console.log(`Synced bundle to custom_components/google_calendar_card/frontend/google-calendar-card.js`);

  // Copy to ha-config if directories exist
  try {
    const haCcFrontendDir = path.join(rootDir, "ha-config", "custom_components", "google_calendar_card", "frontend");
    if (fs.existsSync(path.dirname(haCcFrontendDir))) {
      fs.mkdirSync(haCcFrontendDir, { recursive: true });
      fs.copyFileSync(distFile, path.join(haCcFrontendDir, "google-calendar-card.js"));
      console.log(`Synced bundle to ha-config/custom_components/.../frontend/google-calendar-card.js`);
    }

    const haWwwDir = path.join(rootDir, "ha-config", "www");
    if (fs.existsSync(haWwwDir)) {
      fs.copyFileSync(distFile, path.join(haWwwDir, "google-calendar-card.js"));
      console.log(`Synced bundle to ha-config/www/google-calendar-card.js`);
    }
  } catch (err) {
    console.warn(`Note: Could not copy directly to ha-config from host (${err.message}). Sync via docker cp if container is running.`);
  }
}

build();
