import { resolve } from "path";
import { defineConfig } from "vite";

// The card is bundled as an ES module into ../www so Home Assistant can load it
// as a frontend resource at /local/ha-google-calendar-card.js.
export default defineConfig(() => ({
  build: {
    target: "es2020",
    outDir: resolve(import.meta.dirname, "../www"),
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
