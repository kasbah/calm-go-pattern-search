import initWasm, {
  WasmSearch,
} from "../../rust/wasm-search/pkg/wasm_search.js";

let wasmInitialized = false;
let queue: Array<{ positionBuf: Uint8Array; nextColor: number }> = [];
let isSearching = false;

onmessage = (e) => {
  const { type, payload } = e.data;
  if (type === "search") {
    queue.push(payload);
    handleQueue();
  }
};

console.info("Worker: Initializing wasm");

await initWasm();

const wasmSearch = new WasmSearch();

wasmInitialized = true;

async function handleQueue() {
  if (queue.length > 0 && !isSearching && wasmInitialized) {
    isSearching = true;
    // take the latest query and discard the rest
    const { positionBuf, nextColor } = queue.pop()!;
    queue = [];
    const results = await wasmSearch.search(positionBuf, nextColor);
    // give the JS event loop a chance to add queries to the queue
    await new Promise((resolve) => setTimeout(resolve, 0));
    // if there are no new queries, send this result
    if (queue.length === 0) {
      //@ts-expect-error postMessage for the worker doesn't have the correct type definition
      self.postMessage({ type: "result", payload: results }, [results.buffer]);
    }
    isSearching = false;
  }
}

setInterval(handleQueue, 10);

console.info("Worker: wasm initialized");
