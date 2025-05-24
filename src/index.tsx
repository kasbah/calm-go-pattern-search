//@ts-ignore
import init, { Games, Point, Color } from "rust-pattern-search";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

//init().then(() => {
//  console.log("init wasm-pack");
//
//  const games = new Games();
//
//  const x = games.search_point(new Point(3, 3), Color.White);
//  console.log(x);
//});

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
