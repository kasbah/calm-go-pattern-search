import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CircleIcon,
  Cross1Icon,
  EraserIcon,
  Half2Icon,
} from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import Goban, {
  BrushMode,
  emptyBoard,
  SabakiColor,
  type BoardPosition,
} from "./Goban";
import circleFilledSvg from "./icons/circle_filled.svg";

export default function App() {
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);
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

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Goban brushMode={brushMode} onUpdateBoard={setBoard} board={board} />
      </div>
      <div style={{ marginLeft: "1em" }}>
        <div>
          <ToggleGroup
            type="single"
            defaultValue={`${BrushMode.Alternate}`}
            onValueChange={(v) => v && setBrushMode(parseInt(v) as BrushMode)}
          >
            <ToggleGroupItem value={`${BrushMode.Alternate}`}>
              <Half2Icon /> 
            </ToggleGroupItem>
            <ToggleGroupItem value={`${BrushMode.Black}`}>
              <img src={circleFilledSvg} /> 
            </ToggleGroupItem>
            <ToggleGroupItem value={`${BrushMode.White}`}>
              <CircleIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value={`${BrushMode.Remove}`}>
              <EraserIcon /> 
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div style={{ marginTop: "1em" }}>
          <Button
            color="red"
            variant="outline"
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
