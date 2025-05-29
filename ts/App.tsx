import { useEffect, useState } from "react";
import Goban from "./Goban";

import { type BoardPosition, emptyBoard, SabakiSign } from "./SabakiTypes";
import GamesList from "./GamesList";
import type { Game } from "./games";

export default function App() {
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);
  const [games, setGames] = useState<Array<Game>>([]);

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
      const { type, payload } = e.data;
      if (type === "result") {
        let jsonText = new TextDecoder().decode(payload);
        const rs: Array<Game> = JSON.parse(jsonText);
        setGames(rs);
      }
    };
  }, []);

  return (
    <div className="flex h-screen">
      <Goban onUpdateBoard={setBoard} />
      <GamesList games={games} />
    </div>
  );
}
