import { useEffect, useState } from "react";
import Goban, { emptyBoard, SabakiColor, type BoardPosition } from "./Goban";

export default function App() {
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);

  useEffect(() => {
    if (window.wasm_search !== undefined) {
      (async () => {
        const position: Array<{
          color: "Black" | "White";
          point: { x: number; y: number };
        }> = [];
        board.forEach((row, y) => {
          row.forEach((stone, x) => {
            if (stone !== SabakiColor.Empty) {
              const color = stone === SabakiColor.Black ? "Black" : "White";
              const point = { x, y };
              position.push({ color, point });
            }
          });
        });
        const positionBuf = new TextEncoder().encode(JSON.stringify(position));
        const resultsBuf = await window.wasm_search.search(positionBuf);
        let results = new TextDecoder().decode(resultsBuf);
        results = JSON.parse(results);
        results.sort(
          (r1, r2) =>
            r1.last_move_matched - r1.score - (r2.last_move_matched - r2.score),
        );
        for (const r of results.slice(0, 5)) {
          console.log(
            r.last_move_matched - r.score,
            r.path,
            r.score,
            r.last_move_matched,
          );
        }
        console.log(results.length - 5, "more");
      })();
    }
  }, [board]);

  return <Goban onUpdateBoard={setBoard} />;
}
