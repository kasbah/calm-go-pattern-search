import path from "node:path";
import { defineConfig } from "vite";
import wasmPack from "./vite-plugin-wasm-pack";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: {
    minify: false,
  },
  plugins: [wasmPack(["./rust/wasm-search"]), react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "preact/hooks", replacement: "react" },
      { find: "preact", replacement: "react" },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
