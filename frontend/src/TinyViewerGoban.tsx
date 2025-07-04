import { Goban, type Map, type Marker } from "./shudan";
import "./shudan/css/goban.css";
import SabakiGoBoard from "@sabaki/go-board";
import { useMemo, useState } from "react";
import {
  emptyBoard,
  type BoardPosition,
  type SabakiMove,
} from "./sabaki-types";
import { toSabakiMove, type Game } from "./wasm-search-types";

import "./ViewerGoban.css";
import "./goban-common.css";
import "./TinyViewerGoban.css";

function calculateBoardPosition(
  moves: Array<SabakiMove>,
  moveNumber: number,
): BoardPosition {
  let sgb = new SabakiGoBoard(emptyBoard);
  if (moveNumber < 0) {
    return sgb.signMap;
  }
  for (let i = 0; i <= moveNumber; i++) {
    const move = moves[i];
    if (!move) break;
    sgb = sgb.makeMove(move.color, [move.point.x, move.point.y]);
  }
  return sgb.signMap;
}

type TinyViewerGobanProps = {
  game: Game;
  vertexSize: number;
  moveNumber: number;
};

export default function TinyViewerGoban({
  game,
  vertexSize,
  moveNumber,
}: TinyViewerGobanProps) {
  const [isHovering, setIsHovering] = useState(false);
  const board = useMemo(() => {
    const moves = game.moves_transformed.map(toSabakiMove);
    return calculateBoardPosition(moves, moveNumber);
  }, [game.moves_transformed, moveNumber]);

  const markerMap = useMemo((): Map<Marker | null> => {
    const mm: Map<Marker | null> = emptyBoard.map((row) => row.map(() => null));
    const lastMove = game.moves_transformed[moveNumber];
    if (lastMove !== undefined) {
      mm[lastMove.point.y][lastMove.point.x] = {
        type: "circle",
      } as Marker;
    }
    return mm;
  }, [game.moves_transformed, moveNumber]);

  return (
    <div
      className="TinyGoban ViewerGoban"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-hovering={isHovering}
    >
      <Goban
        vertexSize={vertexSize}
        showCoordinates={false}
        signMap={board}
        markerMap={markerMap}
      />
    </div>
  );
}
