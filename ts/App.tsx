import { useEffect, useState } from "react";
import GobanEditor from "./GobanEditor";

import { type BoardPosition, emptyBoard, SabakiSign } from "./SabakiTypes";
import GamesList from "./GamesList";
import type { Game } from "./games";

export default function App() {
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);
  const [games, setGames] = useState<Array<Game>>([]);
  const [totalNumberOfGames, setTotalNumberOfGames] = useState(0);

  useEffect(() => {
    if (window.wasmSearchWorker !== undefined) {
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
    }
  }, [board]);

  useEffect(() => {
    window.wasmSearchWorker.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === "result") {
        let jsonText = new TextDecoder().decode(payload);
        const { num_results, results } = JSON.parse(jsonText);
        setGames(results);
        setTotalNumberOfGames(num_results);
      }
    };
  }, []);

  return (
    <div className="flex flex-gap-100 h-screen">
      <GobanEditor onUpdateBoard={setBoard} />
      <GamesList games={games} totalNumberOfGames={totalNumberOfGames} />
    </div>
  );
}
