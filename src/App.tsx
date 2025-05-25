import React, { useState, useEffect } from "react";
import Goban, {
  BrushMode,
  BoardPosition,
  emptyBoard,
  SabakiColor,
} from "./Goban";
//@ts-ignore
import { Point, Color, Placement } from "wasm-search";
import { RadioCards, Button, Box, Container } from "@radix-ui/themes";
import {
  CircleIcon,
  Half2Icon,
  EraserIcon,
  Cross1Icon,
} from "@radix-ui/react-icons";
import circleFilledSvg from "./icons/circle_filled.svg";

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
        for (const r of results.slice(0, 5)) {
          console.log(r.score, r.path, r.last_move_matched);
        }
        console.log(results.length - 5, "more");
      })();
    }
  }, [board]);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Goban brushMode={brushMode} onUpdateBoard={setBoard} board={board} />
      </div>
      <div style={{ marginLeft: "1em" }}>
        <div>
          <RadioCards.Root
            highContrast
            defaultValue={`${BrushMode.Alternate}`}
            onValueChange={(v) => setBrushMode(parseInt(v) as BrushMode)}
          >
            <RadioCards.Item value={`${BrushMode.Alternate}`}>
              <Half2Icon /> Alternate
            </RadioCards.Item>
            <RadioCards.Item value={`${BrushMode.Black}`}>
              <img src={circleFilledSvg} /> Black
            </RadioCards.Item>
            <RadioCards.Item value={`${BrushMode.White}`}>
              <CircleIcon /> White
            </RadioCards.Item>
            <RadioCards.Item value={`${BrushMode.Remove}`}>
              <EraserIcon /> Eraser
            </RadioCards.Item>
          </RadioCards.Root>
        </div>
        <div style={{ marginTop: "1em" }}>
          <Button
            size="3"
            color="red"
            variant="outline"
            highContrast
            onClick={() => setBoard(emptyBoard)}
          >
            <Cross1Icon />
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
