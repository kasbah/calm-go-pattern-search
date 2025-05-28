import initWasm, { WasmSearch } from "../rust/wasm-search/pkg/wasm_search.js";

console.log("Worker: Initializing wasm");

await initWasm();

const wasmSearch = new WasmSearch();

onmessage = async (e) => {
  console.log("Worker: Message received from main script");

  const { type, payload } = e.data;

  if (type === "search") {
    const resultsBuf = await wasmSearch.search(payload);
    postMessage({ type: "result", payload: resultsBuf }, [resultsBuf.buffer]);
  }
};

console.log("Worker: wasm initialized");
