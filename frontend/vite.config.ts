import { resolve } from "path";
import { defineConfig } from "vite";

// The card is bundled as an ES module into the integration package so Home
// Assistant can serve it as a frontend resource at
// /local/ha-google-calendar-card.js (registered via async_register_static_paths
// in custom_components/ha_google_calendar/__init__.py). Bundling it into the
// package means a HACS download ships the card too.
export default defineConfig(() => ({
  build: {
    target: "es2020",
    outDir: resolve(
      import.meta.dirname,
      "../custom_components/ha_google_calendar/www",
    ),
    emptyOutDir: false,
    minify: "esbuild",
    lib: {
      entry: resolve(import.meta.dirname, "src/ha-google-calendar-card.ts"),
      name: "HaGoogleCalendarCard",
      formats: ["es"],
      fileName: () => "ha-google-calendar-card.js",
    },
  },
}));
