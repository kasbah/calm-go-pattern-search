//@ts-ignore
import init, {Games, Point, Color} from "rust-pattern-search";

init().then(() => {
  console.log("init wasm-pack");

  const games = new Games();

  const x = games.search_point(new Point(3, 3), Color.White);
  console.log(x);

});
