import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import checker from "vite-plugin-checker";

export default defineConfig({
  optimizeDeps: {
    exclude: ["wasm-search"],
  },
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    checker({ typescript: true }),
  ],
  worker: {
    format: "es",
    plugins: () => [wasm(), topLevelAwait()],
  },
  resolve: {
    alias: [
      { find: "preact/hooks", replacement: "react" },
      { find: "preact", replacement: "react" },
      { find: "@", replacement: path.resolve(__dirname, "./ts") },
    ],
  },
});
