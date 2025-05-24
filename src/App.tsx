import React, { useState, useEffect } from "react";
import Goban from "./Goban";
//@ts-ignore
import { Point, Color } from "rust-pattern-search";

const BrushMode = Object.freeze({
  Alternate: -1,
  Black: 0,
  White: 1,
});

type BrushModeT = (typeof BrushMode)[keyof typeof BrushMode];

export default function App() {
  const [brushMode, setBrushMode] = useState<BrushModeT>(BrushMode.Alternate);
  const [brushColor, setBrushColor] = useState(Color.Black);
  const [boardPosition, setBoardPosition] = useState<Array<Array<Color>>>([]);

  useEffect(() => {
    if (brushMode === BrushMode.Black) {
      setBrushColor(Color.Black);
    } else if (brushMode === BrushMode.White) {
      setBrushColor(Color.White);
    }
  }, [brushMode]);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Goban
          brushColor={brushColor}
          onVertexClick={(e, vertex) => {
            if (brushMode === BrushMode.Alternate) {
              setBrushColor((c) => (c === Color.Black ? Color.White : Color.Black));
            }
            setBoardPosition((b) => {
              const x = vertex[0];
              const y = vertex[1];
              if (b[x] == null) {
                b[x] = [];
              }
              b[x][y] = brushColor;
              return [...b];
            });
          }}
          boardPosition={boardPosition}
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
        <div>
          <button onClick={() => setBoardPosition([])}>Clear</button>
        </div>
      </div>
    </div>
  );
}
