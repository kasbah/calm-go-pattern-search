//@ts-ignore
import init, { Games } from "rust-pattern-search";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

init().then(() => {
  window.games = new Games();
});

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
