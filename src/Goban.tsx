//@ts-ignore
import React, { useState, useEffect } from "react";
import { useWindowSize } from "@reach/window-size";
import { BoundedGoban, type Vertex } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";
import SabakiGoBoard, { Sign } from "@sabaki/go-board";
import { produce } from "immer";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

import overlappingCirclesBlackSvg from "./icons/overlapping-circles-black.svg";
import overlappingCirclesWhiteSvg from "./icons/overlapping-circles-white.svg";
import circleBlackSvg from "./icons/circle-black.svg";
import circleWhiteSvg from "./icons/circle-white.svg";
import eraserSvg from "./icons/eraser.svg";
import xSvg from "./icons/x.svg";
import trashSvg from "./icons/trash.svg";

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
  onUpdateBoard: (board: BoardPosition) => void;
};

function getNextColor(
  stone: SabakiColor,
  brushColor: SabakiColor,
  brushMode: BrushMode,
): SabakiColor {
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
  throw new Error("Unknown brush mode");
}

export default function Goban({ onUpdateBoard }: GobanProps) {
  const windowSize = useWindowSize();
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);
  const [displayBoard, setDisplayBoard] = useState(emptyBoard);
  const [hoverVertex, setHoverVertex] = useState<Vertex | null>(null);
  const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
  const [alternateBrushColor, setAlternateBrushColor] = useState<SabakiColor>(
    SabakiColor.Black,
  );
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);

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
  }, [hoverVertex, board, alternateBrushColor, brushMode]);

  useEffect(() => {
    setDisplayBoard(
      produce(board, (draft) => {
        if (hoverVertex != null) {
          const x = hoverVertex[0];
          const y = hoverVertex[1];
          const stone = board[y][x];
          const nextColor = getNextColor(stone, alternateBrushColor, brushMode);
          if (nextColor !== SabakiColor.Empty) {
            draft[y][x] = nextColor;
          }
        }
      }),
    );
  }, [board, hoverVertex, brushMode, alternateBrushColor]);

  const handleBoardUpdate = (newBoard: BoardPosition) => {
    setBoard(newBoard);
    onUpdateBoard(newBoard);
  };

  const handleVertexClick = (_e: any, vertex: Vertex) => {
    setHoverVertex(null);
    const x = vertex[0];
    const y = vertex[1];
    const stone = board[y][x];
    const nextColor = getNextColor(stone, alternateBrushColor, brushMode);

    if (nextColor !== SabakiColor.Empty) {
      const sgb = new SabakiGoBoard(board);
      const move = sgb.makeMove(nextColor as Sign, vertex);
      handleBoardUpdate(move.signMap);
    } else {
      handleBoardUpdate(
        produce(board, (draft) => {
          draft[y][x] = SabakiColor.Empty;
        }),
      );
    }

    if (nextColor !== SabakiColor.Empty) {
      setAlternateBrushColor(
        nextColor === SabakiColor.Black ? SabakiColor.White : SabakiColor.Black,
      );
    }
  };

  return (
    <div className="flex flex-row gap-2">
      <div>
        <BoundedGoban
          animateStonePlacement={false}
          fuzzyStonePlacement={false}
          maxHeight={windowSize.height}
          maxWidth={windowSize.width * 0.5}
          showCoordinates={true}
          signMap={displayBoard}
          dimmedVertices={dimmedVertices}
          onVertexClick={handleVertexClick}
          onVertexMouseEnter={(_e: any, vertex: Vertex) => {
            setHoverVertex(vertex);
          }}
          onVertexMouseLeave={(_e: any, _vertex: Vertex) => {
            setHoverVertex(null);
          }}
        />
      </div>
      <div className="mt-2 mb-2">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col gap-1">
            <Toggle
              size="xl"
              onClick={() => setBrushMode(BrushMode.Alternate)}
              pressed={brushMode === BrushMode.Alternate}
            >
              {alternateBrushColor === SabakiColor.Black ? (
                <img src={overlappingCirclesBlackSvg} width={32} height={32} />
              ) : (
                <img src={overlappingCirclesWhiteSvg} width={32} height={32} />
              )}
            </Toggle>
            <Toggle
              size="xl"
              onClick={() => setBrushMode(BrushMode.Black)}
              pressed={brushMode === BrushMode.Black}
            >
              <img src={circleBlackSvg} width={32} height={32} />
            </Toggle>
            <Toggle
              size="xl"
              onClick={() => setBrushMode(BrushMode.White)}
              pressed={brushMode === BrushMode.White}
            >
              <img src={circleWhiteSvg} width={32} height={32} />
            </Toggle>
            <Toggle
              size="xl"
              onClick={() => setBrushMode(BrushMode.Remove)}
              pressed={brushMode === BrushMode.Remove}
            >
              <img src={eraserSvg} width={32} height={32} />
            </Toggle>
          </div>
          <div>
            <Button
              size="xl"
              color="red"
              variant="outline"
              onClick={() => handleBoardUpdate(emptyBoard)}
            >
              <img src={trashSvg} width={24} height={24} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
