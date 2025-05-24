import React, { useState, useEffect } from "react";
import Goban, { BrushMode } from "./Goban";
//@ts-ignore
import { Point, Color } from "rust-pattern-search";

export default function App() {
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Goban
          brushMode={brushMode}
          onUpdateBoard={(b) => {
            console.log(b);
          }}
        />
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
      </div>
    </div>
  );
}
