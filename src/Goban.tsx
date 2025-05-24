//@ts-ignore
import React, { useState, useEffect } from "react";
import { useWindowSize } from "@reach/window-size";
import { BoundedGoban, Vertex } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";

export const SabakiColor = Object.freeze({
  Black: 1,
  White: -1,
  Empty: 0,
});

export type SabakiColor = (typeof SabakiColor)[keyof typeof SabakiColor];

export const BrushMode = Object.freeze({
  Alternate: 2,
  Black: 1,
  White: -1,
  Delete: 0,
});

export type BrushMode = (typeof BrushMode)[keyof typeof BrushMode];

export type BoardPosition = Array<Array<SabakiColor>>;

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

export type GobanProps = {
  brushMode: BrushMode;
  onUpdateBoard: (board: BoardPosition) => void;
  board: BoardPosition;
};

function getNextColor(stone: SabakiColor, brushColor: SabakiColor) {
  if (stone === SabakiColor.Empty) {
    return brushColor;
  } else if (stone === SabakiColor.Black) {
    return SabakiColor.White;
  }
  return SabakiColor.Empty;
}

export default function Goban({ brushMode, onUpdateBoard, board }: GobanProps) {
  const windowSize = useWindowSize();
  const [displayBoard, setDisplayBoard] = useState(emptyBoard);
  const [hoverVertex, setHoverVertex] = useState<Vertex | null>(null);
  const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
  const [brushColor, setBrushColor] = useState<SabakiColor>(SabakiColor.Black);

  useEffect(() => {
    onUpdateBoard(board);
  }, [board]);

  useEffect(() => {
    if (hoverVertex == null) {
      setDimmedVertices([]);
    } else {
      setDimmedVertices([[...hoverVertex]]);
    }
  }, [hoverVertex]);

  useEffect(() => {
    const b = board.map((row, y) =>
      row.map((stone, x) => {
        const nextColor = getNextColor(stone, brushColor);
        if (nextColor === SabakiColor.Empty) {
          return stone;
        }
        if (
          hoverVertex != null &&
          hoverVertex[0] === x &&
          hoverVertex[1] === y
        ) {
          return nextColor;
        }
        return stone;
      }),
    );
    setDisplayBoard(b);
  }, [board, hoverVertex]);

  return (
    <BoundedGoban
      animateStonePlacement={false}
      fuzzyStonePlacement={false}
      maxHeight={windowSize.height - 20}
      maxWidth={windowSize.width * 0.8}
      showCoordinates={true}
      signMap={displayBoard}
      dimmedVertices={dimmedVertices}
      onVertexClick={(e, vertex) => {
        setHoverVertex(null);
        const x = vertex[0];
        const y = vertex[1];
        const stone = board[y][x];
        const nextColor = getNextColor(stone, brushColor);
        if (stone === SabakiColor.Empty && brushMode === BrushMode.Alternate) {
          setBrushColor((c) =>
            c === SabakiColor.Black ? SabakiColor.White : SabakiColor.Black,
          );
        }
        const b = board.map((row, y) =>
          row.map((c, x) => {
            if (y === vertex[1] && x === vertex[0]) {
              return nextColor;
            }
            return c;
          }),
        );
        onUpdateBoard(b);
      }}
      onVertexMouseEnter={(e, vertex) => {
        setHoverVertex(vertex);
      }}
      onVertexMouseLeave={(e, vertex) => {
        setHoverVertex((v) => {
          if (v != null && v[0] === vertex[0] && v[1] === vertex[1]) {
            return null;
          }
          return v;
        });
      }}
    />
  );
}
