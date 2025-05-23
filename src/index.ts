//@ts-ignore
import init, { search, Point } from "rust-pattern-search";

init().then(() => {
  console.log("init wasm-pack");
  search(new Point(3, 3));
});
