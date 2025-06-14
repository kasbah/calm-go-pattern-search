import {
  SabakiSign,
  type BoardPosition,
  type SabakiMove,
} from "./sabaki-types";

export type Point = {
  x: number;
  y: number;
};

export type Placement = {
  color: "Black" | "White";
  point: Point;
};

export type SgfDate = {
  YearMonthDay?: [number, number, number];
  YearMonth?: [number, number];
  Year?: number;
  Custom?: string;
};

export type Score = {
  Resignation?: boolean;
  Timeout?: boolean;
  Forfeit?: boolean;
  Points?: number;
};

export type GameResult = {
  Player?: ["Black" | "White", Score | null, string];
  Draw?: boolean;
  Void?: boolean;
  Unknown?: string;
};

export type Rank = {
  Kyu?: number;
  Dan?: number;
  Pro?: number;
  Custom?: string;
};

export type Rules = {
  Chinese?: boolean;
  Japanese?: boolean;
  Korean?: boolean;
  Ing?: boolean;
  Custom?: string;
};

export type Game = {
  path: string;
  score: number;
  last_move_matched: number;
  rotation: number; // 0: no rotation, 1-3: rotation index
  is_inverted: boolean; // whether the pattern colors were inverted
  is_mirrored: boolean; // whether the pattern was mirrored
  all_empty_correctly_within: number; // distance from moves where all surrounding points are correctly empty
  moves: Placement[]; // game moves
  moves_transformed: Placement[]; // games moves rotated and/or mirrored
  // Game metadata
  event: string;
  round: string;
  location: string;
  date: SgfDate | null;
  player_black: number | null;
  player_white: number | null;
  rank_black: Rank;
  rank_white: Rank;
  komi: number | null;
  rules: Rules | null;
  result: GameResult;
};

export type SearchReturn = {
  num_results: number;
  next_moves: Array<{ x: number; y: number }>;
  results: Array<Game>;
  total_pages: number;
  current_page: number;
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
