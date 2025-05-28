import { useEffect, useState } from "react";
import Goban from "./Goban";

import { type BoardPosition, emptyBoard, SabakiSign } from "./SabakiTypes";
import GamesList from "./GamesList";

export default function App() {
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);

  useEffect(() => {
    if (window.wasmSearchWorker !== undefined) {
      (async () => {
        const position: Array<{
          color: "Black" | "White";
          point: { x: number; y: number };
        }> = [];
        board.forEach((row, y) => {
          row.forEach((stone, x) => {
            if (stone !== SabakiSign.Empty) {
              const color = stone === SabakiSign.Black ? "Black" : "White";
              const point = { x, y };
              position.push({ color, point });
            }
          });
        });
        const positionBuf = new TextEncoder().encode(JSON.stringify(position));
        window.wasmSearchWorker.postMessage(
          { type: "search", payload: positionBuf },
          [positionBuf.buffer],
        );
      })();
    }
  }, [board]);

  useEffect(() => {
    window.wasmSearchWorker.onmessage = (e) => {
      console.log("Message received from wasm");
      const { type, payload } = e.data;
      if (type === "result") {
        let results = new TextDecoder().decode(payload);
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
      }
    };
  }, []);

  return (
    <div className="flex h-screen">
      <Goban onUpdateBoard={setBoard} />
      <GamesList />
    </div>
  );
}
