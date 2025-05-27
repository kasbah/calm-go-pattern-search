import React from "react";
import { createRoot } from "react-dom/client";
//@ts-ignore
import init, { WasmSearch } from "wasm-search";
import App from "./App";
import { Theme } from "@radix-ui/themes";
import "./index.css";

//init().then(() => {
//  window.wasm_search = new WasmSearch();
//});

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <Theme>
      <App />
    </Theme>
  </React.StrictMode>,
);
