import initWasm, { WasmSearch } from "../rust/wasm-search/pkg/wasm_search.js";

console.log("Worker: Initializing wasm");

await initWasm();

const wasmSearch = new WasmSearch();

let queue: Uint8Array[] = [];

onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === "search") {
    queue.push(payload);
  }
};

setInterval(async () => {
  if (queue.length > 0) {
    // take the latest query and discard the rest
    const query = queue.pop()!!;
    queue = [];
    const resultsBuf = await wasmSearch.search(query);
    // give the JS event loop a chance to fill the queue
    await new Promise((resolve) => setTimeout(resolve, 0));
    // if there are no new queries, send this result
    if (queue.length === 0) {
      self.postMessage({ type: "result", payload: resultsBuf }, [
        resultsBuf.buffer,
      ]);
    }
  }
}, 100);

console.log("Worker: wasm initialized");
