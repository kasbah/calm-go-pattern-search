import path from "node:path";
import { defineConfig } from "vite";
import topLevelAwait from "vite-plugin-top-level-await";
import wasm from "vite-plugin-wasm";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["wasm-search"],
  },
  plugins: [react(), wasm(), topLevelAwait(), tailwindcss()],
  worker: {
    plugins: () => [wasm(), topLevelAwait()],
    format: "es",
  },
  resolve: {
    alias: [
      { find: "preact/hooks", replacement: "react" },
      { find: "preact", replacement: "react" },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
