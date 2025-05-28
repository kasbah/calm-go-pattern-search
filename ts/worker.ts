import("wasm-search").then((wasmSearch) => {
  console.log("Worker: wasm-search loaded");
});

console.log("Worker: Initializing wasm-search");

onmessage = (e) => {
  console.log("Worker: Message received from main script");

  const result = e.data[0] * e.data[1];

  if (isNaN(result)) {
    postMessage("Please write two numbers");
  } else {
    const workerResult = "Result: " + result;
    console.log("Worker: Posting message back to main script");
    postMessage(workerResult);
  }
};
