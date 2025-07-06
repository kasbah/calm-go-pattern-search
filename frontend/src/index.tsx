import { Theme } from "@radix-ui/themes";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

import "./global.css";

if (window.Worker) {
  window.wasmSearchWorker = new Worker(
    new URL("./worker.ts", import.meta.url),
    {
      type: "module",
    },
  );
} else {
  console.error("Your browser doesn't support web workers.");
}

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <Theme>
      <App />
    </Theme>
  </React.StrictMode>,
);
