import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ["wasm-search"],
  },
  plugins: [react(), tailwindcss()],
  worker: {
    format: "iife",
  },
  resolve: {
    alias: [
      { find: "preact/hooks", replacement: "react" },
      { find: "preact", replacement: "react" },
      { find: "@", replacement: path.resolve(__dirname, "./ts") },
    ],
  },
});
