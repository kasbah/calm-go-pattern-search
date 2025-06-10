export const SabakiSign = Object.freeze({
  Black: 1,
  White: -1,
  Empty: 0,
});

export type SabakiSign = (typeof SabakiSign)[keyof typeof SabakiSign];

export const SabakiColor = Object.freeze({
  Black: 1,
  White: -1,
});

export type SabakiColor = (typeof SabakiSign)[keyof typeof SabakiSign];

export const BrushMode = Object.freeze({
  Alternate: 2,
  Black: 1,
  White: -1,
  Remove: 0,
});

export type BrushMode = (typeof BrushMode)[keyof typeof BrushMode];

export type BoardPosition = Array<Array<SabakiSign>>;

export type SabakiMove = {
  color: SabakiColor;
  point: { x: number; y: number };
};

/* prettier-ignore */
export const emptyBoard: BoardPosition = [
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],

  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],

  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],

  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
  [0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0, 0, /* */ 0, 0, 0, 0],
];

export function boardsEqual(a: BoardPosition, b: BoardPosition): boolean {
  for (const [y, row] of a.entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell !== b[y][x]) {
        return false;
      }
    }
  }
  return true;
}
