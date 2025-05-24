//@ts-ignore
import React, {useState, useEffect} from "react";
import {useWindowSize} from "@reach/window-size";
import {BoundedGoban, Vertex} from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";
import SabakiGoBoard, {Sign} from "@sabaki/go-board";

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
  Remove: 0,
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

function getNextColor(
  stone: SabakiColor,
  brushColor: SabakiColor,
  brushMode: BrushMode,
) {
  if (brushMode === BrushMode.Alternate) {
    if (stone === SabakiColor.Empty) {
      return brushColor;
    } else if (stone === SabakiColor.Black) {
      return SabakiColor.White;
    }
    return SabakiColor.Black;
  } else if (brushMode === BrushMode.Black) {
    return SabakiColor.Black;
  } else if (brushMode === BrushMode.White) {
    return SabakiColor.White;
  } else if (brushMode === BrushMode.Remove) {
    return SabakiColor.Empty;
  }
}

export default function Goban({brushMode, onUpdateBoard, board}: GobanProps) {
  const windowSize = useWindowSize();
  const [displayBoard, setDisplayBoard] = useState(emptyBoard);
  const [hoverVertex, setHoverVertex] = useState<Vertex | null>(null);
  const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
  const [alternateBrushColor, setAlternateBrushColor] = useState<SabakiColor>(
    SabakiColor.Black,
  );

  useEffect(() => {
    if (board.every((row) => row.every((c) => c === SabakiColor.Empty))) {
      setAlternateBrushColor(SabakiColor.Black);
    }
  }, [board]);

  useEffect(() => {
    if (hoverVertex == null) {
      setDimmedVertices([]);
    } else {
      const x = hoverVertex[0];
      const y = hoverVertex[1];
      const stone = board[y][x];
      const nextColor = getNextColor(stone, alternateBrushColor, brushMode);
      if (nextColor !== stone) {
        setDimmedVertices([[...hoverVertex]]);
      } else {
        setDimmedVertices([]);
      }
    }
  }, [hoverVertex]);

  useEffect(() => {
    const b: BoardPosition = board.map((row, y) =>
      row.map((stone, x) => {
        const nextColor = getNextColor(stone, alternateBrushColor, brushMode);
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
  }, [board, hoverVertex, brushMode]);

  return (
    <BoundedGoban
      animateStonePlacement={false}
      fuzzyStonePlacement={false}
      maxHeight={windowSize.height - 20}
      maxWidth={windowSize.width * 0.8}
      showCoordinates={true}
      signMap={displayBoard}
      dimmedVertices={dimmedVertices}
      onVertexClick={(_e, vertex) => {
        setHoverVertex(null);
        const x = vertex[0];
        const y = vertex[1];
        const stone = board[y][x];
        const nextColor = getNextColor(stone, alternateBrushColor, brushMode);
        if (nextColor !== SabakiColor.Empty) {
          const sgb = new SabakiGoBoard(board);
          const move = sgb.makeMove(nextColor as Sign, vertex);
          onUpdateBoard(move.signMap);
        } else {
          const b = board.map((row, u) =>
            row.map((c, v) => {
              if (u === y && v === x) {
                return SabakiColor.Empty;
              }
              return c;
            }),
          );
          onUpdateBoard(b);
        }
        if (nextColor !== SabakiColor.Empty) {
          setAlternateBrushColor(
            nextColor === SabakiColor.Black
              ? SabakiColor.White
              : SabakiColor.Black,
          );
        }
      }}
      onVertexMouseEnter={(_e, vertex) => {
        setHoverVertex(vertex);
      }}
      onVertexMouseLeave={(_e, _vertex) => {
        setHoverVertex(null);
      }}
    />
  );
}
