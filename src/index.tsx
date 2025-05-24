//@ts-ignore
import init, { WasmSearch } from "wasm-search";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

init().then(() => {
  window.wasm_search = new WasmSearch();
});

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
