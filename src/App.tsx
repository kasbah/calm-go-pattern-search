import React, { useState, useEffect } from "react";
import Goban, {
  BrushMode,
  BoardPosition,
  emptyBoard,
  SabakiColor,
} from "./Goban";
//@ts-ignore
import { Point, Color, Placement } from "wasm-search";

export default function App() {
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);

  useEffect(() => {
    if (window.wasm_search !== undefined) {
      (async () => {
        const position: Array<Placement> = [];
        board.forEach((row, y) => {
          row.forEach((stone, x) => {
            if (stone !== SabakiColor.Empty) {
              const color =
                stone === SabakiColor.Black ? Color.Black : Color.White;
              const point = new Point(x, y);
              position.push(new Placement(color, point));
            }
          });
        });
        let results = await window.wasm_search.search(position);
        results.sort((r1, r2) => r2.score - r1.score);
        results = results.map((r) => [r.score, r.path]);
        console.log(results);
      })();
    }
  }, [board]);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Goban brushMode={brushMode} onUpdateBoard={setBoard} board={board} />
      </div>
      <div>
        <div>
          <input
            type="radio"
            id="alternate"
            name="brushMode"
            checked={brushMode === BrushMode.Alternate}
            onChange={() => setBrushMode(BrushMode.Alternate)}
          />
          <label htmlFor="alternate">Alternate</label>
        </div>
        <div>
          <input
            type="radio"
            id="black"
            name="brushMode"
            checked={brushMode === BrushMode.Black}
            onChange={() => setBrushMode(BrushMode.Black)}
          />
          <label htmlFor="black">Black</label>
        </div>
        <div>
          <input
            type="radio"
            id="white"
            name="brushMode"
            checked={brushMode === BrushMode.White}
            onChange={() => setBrushMode(BrushMode.White)}
          />
          <label htmlFor="white">White</label>
        </div>
        <div>
          <input
            type="radio"
            id="delete"
            name="brushMode"
            checked={brushMode === BrushMode.Remove}
            onChange={() => setBrushMode(BrushMode.Remove)}
          />
          <label htmlFor="remove">Remove</label>
        </div>
        <div>
          <button onClick={() => setBoard(emptyBoard)}>Clear</button>
        </div>
      </div>
    </div>
  );
}
