import { Goban, type Map, type Marker } from "@calm-go/shudan";
import "@calm-go/shudan/css/goban.css";
import SabakiGoBoard from "@sabaki/go-board";
import { useMemo } from "react";
import {
  emptyBoard,
  type BoardPosition,
  type SabakiMove,
} from "./sabaki-types";
import { toSabakiMove, type Game } from "./wasm-search-types";

import "./ViewerGoban.css";
import "./goban-common.css";
import "./TinyEditorGoban.css";

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

type TinyGobanViewerProps = {
  game: Game;
  vertexSize: number;
};

export default function TinyGobanViewer({
  game,
  vertexSize,
}: TinyGobanViewerProps) {
  const board = useMemo(() => {
    const moves = game.moves_transformed.map(toSabakiMove);
    return calculateBoardPosition(moves, game.last_move_matched);
  }, [game.moves_transformed, game.last_move_matched]);

  const markerMap = useMemo((): Map<Marker | null> => {
    const mm: Map<Marker | null> = emptyBoard.map((row) => row.map(() => null));
    const lastMove = game.moves_transformed[game.last_move_matched];
    if (lastMove !== undefined) {
      mm[lastMove.point.y][lastMove.point.x] = {
        type: "circle",
      } as Marker;
    }
    return mm;
  }, [game.moves_transformed, game.last_move_matched]);

  return (
    <div className="TinyGoban ViewerGoban">
      <Goban
        animateStonePlacement={false}
        fuzzyStonePlacement={false}
        vertexSize={vertexSize}
        showCoordinates={false}
        signMap={board}
        markerMap={markerMap}
      />
    </div>
  );
}
