import {
  SabakiSign,
  type BoardPosition,
  type SabakiMove,
} from "./sabaki-types";

export type Placement = {
  color: "Black" | "White";
  point: { x: number; y: number };
};

export type Game = {
  path: string;
  score: number;
  last_move_matched: number;
  rotation: number; // 0: no rotation, 1-3: rotation index
  is_inverted: boolean; // whether the pattern colors were inverted
  is_mirrored: boolean; // whether the pattern was mirrored
  all_empty_correctly_within: number; // distance from moves where all surrounding points are correctly empty
  moves: Array<Placement>;
};

export function toWasmSearch(board: BoardPosition): Array<Placement> {
  const position: Array<Placement> = [];
  board.forEach((row, y) => {
    row.forEach((stone, x) => {
      if (stone !== SabakiSign.Empty) {
        const color = stone === SabakiSign.Black ? "Black" : "White";
        const point = { x, y };
        position.push({ color, point });
      }
    });
  });
  return position;
}

export function toSabakiMove(move: Placement): SabakiMove {
  return {
    color: move.color === "Black" ? SabakiSign.Black : SabakiSign.White,
    point: move.point,
  };
}

declare global {
  interface Window {
    wasmSearchWorker: Worker;
  }
}
