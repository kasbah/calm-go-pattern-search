import { Theme } from "@radix-ui/themes";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import {
  getBoardFromUrl,
  getPlayerFiltersFromUrl,
  getSelectedGameFromUrl,
  getSortByFromUrl,
} from "@/urls";
import type { PlayerFilter, WasmSearchMessage } from "@/wasm-search-types";

import "./global.css";

let wasmSearchWorker: Worker | undefined;

if (window.Worker) {
  wasmSearchWorker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });
} else {
  console.error("Your browser doesn't support web workers.");
}

const wasmSearchPostMessage = (message: WasmSearchMessage) => {
  if (wasmSearchWorker) {
    if (message.type === "search") {
      wasmSearchWorker.postMessage(message, [
        message.payload.positionBuf.buffer,
      ]);
    } else if (message.type === "getSearchResultByPath") {
      wasmSearchWorker.postMessage(message);
    }
  }
};

const wasmSearchOnMessage = (callback: (e: MessageEvent) => void) => {
  if (wasmSearchWorker) {
    wasmSearchWorker.onmessage = callback;
  }
};

const initialBoard = getBoardFromUrl();
const initialPlayerFilter: PlayerFilter[] = getPlayerFiltersFromUrl();
const initialGame = getSelectedGameFromUrl();
const initialSortBy = getSortByFromUrl();

console.log(initialGame?.path);

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <Theme>
      <App
        initialBoard={initialBoard}
        initialPlayerFilters={initialPlayerFilter}
        initialGame={initialGame}
        initialSortBy={initialSortBy}
        wasmSearchPostMessage={wasmSearchPostMessage}
        wasmSearchOnMessage={wasmSearchOnMessage}
      />
    </Theme>
  </React.StrictMode>,
);
