import initWasm, {
  WasmSearch,
} from "../../rust/wasm-search/pkg/wasm_search.js";
import type { PlayerFilter } from "@/wasm-search-types.js";

let wasmInitialized = false;
let queue: Array<{
  positionBuf: Uint8Array;
  nextColor: number;
  page: number;
  pageSize: number;
  playerFilters: PlayerFilter[];
}> = [];
let isSearching = false;

onmessage = async (e) => {
  const { type, payload } = e.data;
  if (type === "search") {
    queue.push(payload);
    handleQueue();
  }
  if (type === "getSearchResultByPath") {
    while (!wasmInitialized) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const { path, rotation, isMirrored } = payload;
    const result = wasmSearch.get_search_result_by_path(
      path,
      rotation,
      isMirrored,
    );
    //@ts-expect-error postMessage for the worker doesn't have the correct type definition
    self.postMessage({ type: "searchResultByPath", payload: result }, [
      result.buffer,
    ]);
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
    const {
      positionBuf,
      nextColor,
      page = 0,
      pageSize = 10,
      playerFilters = [],
    } = queue.pop()!;
    queue = [];
    const playerFiltersJson = new TextEncoder().encode(
      JSON.stringify(playerFilters),
    );
    const results = await wasmSearch.search(
      positionBuf,
      nextColor,
      page,
      pageSize,
      new Uint8Array(playerFiltersJson),
    );
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
