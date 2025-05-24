import React, { useState, useEffect } from "react";
import Goban, { BrushMode, BoardPosition, emptyBoard } from "./Goban";
//@ts-ignore
import { Point, Color } from "rust-pattern-search";

export default function App() {
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Goban brushMode={brushMode} onUpdateBoard={setBoard} board={board} />
      </div>
      <div>
        <div>
          <button onClick={() => setBrushMode(BrushMode.Alternate)}>
            Alternate
          </button>
        </div>
        <div>
          <button onClick={() => setBrushMode(BrushMode.Black)}>Black</button>
        </div>
        <div>
          <button onClick={() => setBrushMode(BrushMode.White)}>White</button>
        </div>
        <div>
          <button onClick={() => setBrushMode(BrushMode.Delete)}>Delete</button>
        </div>
        <div>
          <button onClick={() => setBoard(emptyBoard)}>Clear</button>
        </div>
      </div>
    </div>
  );
}
