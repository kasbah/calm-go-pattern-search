import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Theme } from "@radix-ui/themes";
import "./index.css";

if (window.Worker) {
  const myWorker = new Worker(new URL("./worker.ts", import.meta.url), {
    type: "module",
  });

  myWorker.postMessage({ number1: 1, number2: 2 });
  console.log("Message posted to worker with numbers 1 and 2.");

  myWorker.onmessage = (e: MessageEvent<number>) => {
    console.log("Message received, sum is: ", e.data);
  };
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
