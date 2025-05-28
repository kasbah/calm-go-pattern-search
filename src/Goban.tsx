//@ts-ignore
import React, { useState, useEffect, useCallback } from "react";
import { useWindowSize } from "@reach/window-size";
import { BoundedGoban, type Vertex } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";
import SabakiGoBoard from "@sabaki/go-board";
import { useImmerReducer } from "use-immer";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

import overlappingCirclesBlackSvg from "./icons/overlapping-circles-black.svg";
import overlappingCirclesWhiteSvg from "./icons/overlapping-circles-white.svg";
import circleBlackSvg from "./icons/circle-black.svg";
import circleWhiteSvg from "./icons/circle-white.svg";
import eraserSvg from "./icons/eraser.svg";
import trashSvg from "./icons/trash.svg";
import undoSvg from "./icons/undo.svg";
import redoSvg from "./icons/redo.svg";

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

function boardsEqual(a: BoardPosition, b: BoardPosition): boolean {
  for (const [y, row] of a.entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell !== b[y][x]) {
        return false;
      }
    }
  }
  return true;
}

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

type HistoryEntry = {
  board: BoardPosition;
  moveSign: SabakiSign;
};

type GobanAction =
  | { type: "SET_BRUSH_MODE"; payload: BrushMode }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_BOARD" }
  | { type: "MOUSE_DOWN"; payload: Vertex }
  | { type: "MOUSE_UP"; payload: Vertex }
  | { type: "MOUSE_ENTER"; payload: Vertex }
  | { type: "MOUSE_LEAVE"; payload: Vertex }
  | { type: "MOUSE_LEAVE_BOARD" };

type GobanState = {
  board: BoardPosition;
  stagingBoard: BoardPosition;
  lastStagedSign: SabakiSign;
  alternateBrushColor: SabakiColor;
  brushMode: BrushMode;
  history: HistoryEntry[];
  historyIndex: number;
  isMouseDown: boolean;
};

const initialState: GobanState = {
  board: emptyBoard,
  stagingBoard: emptyBoard,
  lastStagedSign: SabakiSign.Empty,
  alternateBrushColor: SabakiColor.Black,
  brushMode: BrushMode.Alternate,
  history: [{ board: emptyBoard, moveSign: SabakiSign.Empty }],
  historyIndex: 0,
  isMouseDown: false,
};

function stageVertexChange(state: GobanState, vertex: Vertex) {
  // change the vertex to the right color stone or remove it
  // depending on the brush and the mouse state
  const [x, y] = vertex;
  const stone = state.board[y][x];
  const nextSign = getNextSign(
    stone,
    state.alternateBrushColor,
    state.brushMode,
    state.isMouseDown,
    state.lastStagedSign,
  );

  if (nextSign === SabakiSign.Empty) {
    state.stagingBoard[y][x] = SabakiSign.Empty;
  } else {
    const sgb = new SabakiGoBoard(state.stagingBoard);
    const move = sgb.makeMove(nextSign, vertex);
    state.stagingBoard = move.signMap;
  }
  state.lastStagedSign = nextSign;
}

function getNextSign(
  stone: SabakiSign,
  brushColor: SabakiSign,
  brushMode: BrushMode,
  isDragging: boolean,
  lastStagedSign: SabakiSign,
): SabakiSign {
  if (brushMode === BrushMode.Alternate && !isDragging) {
    if (stone === SabakiSign.Empty) {
      return brushColor;
    } else if (stone === SabakiSign.Black) {
      return SabakiSign.White;
    }
    return SabakiSign.Black;
  } else if (brushMode === BrushMode.Alternate && isDragging) {
    return lastStagedSign;
  } else if (brushMode === BrushMode.Black) {
    return SabakiSign.Black;
  } else if (brushMode === BrushMode.White) {
    return SabakiSign.White;
  } else if (brushMode === BrushMode.Remove) {
    return SabakiSign.Empty;
  }
  throw new Error("Unknown brush mode");
}

function gobanReducer(state: GobanState, action: GobanAction): void {
  switch (action.type) {
    case "MOUSE_DOWN": {
      // needed because we switch color when clicking again without leaving the
      // vertex
      if (state.brushMode === BrushMode.Alternate) {
        stageVertexChange(state, action.payload);
      }
      state.isMouseDown = true;
      return;
    }
    case "MOUSE_UP":
    case "MOUSE_LEAVE_BOARD": {
      state.isMouseDown = false;
      if (boardsEqual(state.board, state.stagingBoard)) {
        return;
      }
      // commit staging board
      state.history.splice(state.historyIndex + 1);
      state.board = state.stagingBoard;
      const moveSign = state.lastStagedSign;
      state.history.push({
        board: state.board,
        moveSign,
      });
      state.historyIndex = state.historyIndex + 1;
      if (moveSign !== SabakiSign.Empty) {
        state.alternateBrushColor =
          moveSign === SabakiColor.Black
            ? SabakiColor.White
            : SabakiColor.Black;
      }
      return;
    }

    case "MOUSE_ENTER": {
      stageVertexChange(state, action.payload);
      return;
    }

    case "MOUSE_LEAVE": {
      if (!state.isMouseDown) {
        const vertex = action.payload;
        const x = vertex[0];
        const y = vertex[1];
        state.stagingBoard[y][x] = state.board[y][x];
      }
      return;
    }

    case "SET_BRUSH_MODE":
      state.brushMode = action.payload;
      return;

    case "UNDO":
      if (state.historyIndex > 0) {
        const { moveSign } = state.history[state.historyIndex];
        state.historyIndex -= 1;
        const { board: newBoard } = state.history[state.historyIndex];
        state.alternateBrushColor =
          moveSign === SabakiSign.Empty ? state.alternateBrushColor : moveSign;
        state.board = newBoard;
        state.stagingBoard = newBoard;
      }
      return;

    case "REDO":
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex += 1;
        const { board: newBoard, moveSign } = state.history[state.historyIndex];
        if (moveSign !== SabakiSign.Empty) {
          state.alternateBrushColor =
            moveSign === SabakiSign.Black
              ? SabakiColor.White
              : SabakiColor.Black;
        }
        state.board = newBoard;
        state.stagingBoard = newBoard;
      }
      return;

    case "CLEAR_BOARD": {
      state.history.splice(state.historyIndex + 1);
      state.history.push({
        board: emptyBoard,
        moveSign: state.alternateBrushColor,
      });
      state.board = emptyBoard;
      state.stagingBoard = emptyBoard;
      state.historyIndex = state.historyIndex + 1;
      state.alternateBrushColor = SabakiSign.Black;
      return;
    }
  }
}

export default function Goban({ onUpdateBoard }: GobanProps) {
  const windowSize = useWindowSize();
  const [state, dispatch] = useImmerReducer(gobanReducer, initialState);
  const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
  const [displayBoard, setDisplayBoard] = useState<BoardPosition>(emptyBoard);

  useEffect(() => {
    onUpdateBoard(state.board);
  }, [state.board]);

  useEffect(() => {
    const dimmed: Array<Vertex> = [];
    const display: BoardPosition = state.board.map((row, y) =>
      row.map((boardStone, x) => {
        const stagingStone = state.stagingBoard[y][x];
        if (stagingStone !== boardStone) {
          dimmed.push([x, y]);
        }
        if (stagingStone !== SabakiSign.Empty) {
          return stagingStone;
        }
        if (boardStone !== SabakiSign.Empty) {
          return boardStone;
        }
        return SabakiSign.Empty;
      }),
    );
    setDisplayBoard(display);
    setDimmedVertices(dimmed);
  }, [state.board, state.stagingBoard]);

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const handleVertexMouseEnter = useCallback((_e: any, vertex: Vertex) => {
    dispatch({ type: "MOUSE_ENTER", payload: vertex });
  }, []);

  const handleVertexMouseLeave = useCallback((_e: any, vertex: Vertex) => {
    dispatch({ type: "MOUSE_LEAVE", payload: vertex });
  }, []);

  const handleMouseDown = useCallback((_e: any, vertex: Vertex) => {
    dispatch({ type: "MOUSE_DOWN", payload: vertex });
  }, []);

  const handleMouseUp = useCallback((_e: any, vertex: Vertex) => {
    dispatch({ type: "MOUSE_UP", payload: vertex });
  }, []);

  const handleBoardMouseLeave = useCallback(() => {
    dispatch({ type: "MOUSE_LEAVE_BOARD" });
  }, []);

  const handleClearBoard = useCallback(() => {
    dispatch({ type: "CLEAR_BOARD" });
  }, []);

  return (
    <div className="flex flex-row gap-2">
      <div onMouseLeave={handleBoardMouseLeave}>
        <BoundedGoban
          animateStonePlacement={false}
          fuzzyStonePlacement={false}
          maxHeight={windowSize.height}
          maxWidth={windowSize.width * 0.5}
          showCoordinates={true}
          signMap={displayBoard}
          dimmedVertices={dimmedVertices}
          onVertexMouseEnter={handleVertexMouseEnter}
          onVertexMouseLeave={handleVertexMouseLeave}
          onVertexMouseDown={handleMouseDown}
          onVertexMouseUp={handleMouseUp}
        />
      </div>
      <div className="mt-2 mb-2">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col gap-1">
            <Toggle
              size="xl"
              onClick={() =>
                dispatch({
                  type: "SET_BRUSH_MODE",
                  payload: BrushMode.Alternate,
                })
              }
              pressed={state.brushMode === BrushMode.Alternate}
            >
              {state.alternateBrushColor === SabakiSign.Black ? (
                <img src={overlappingCirclesBlackSvg} width={32} height={32} />
              ) : (
                <img src={overlappingCirclesWhiteSvg} width={32} height={32} />
              )}
            </Toggle>
            <Toggle
              size="xl"
              onClick={() =>
                dispatch({ type: "SET_BRUSH_MODE", payload: BrushMode.Black })
              }
              pressed={state.brushMode === BrushMode.Black}
            >
              <img src={circleBlackSvg} width={32} height={32} />
            </Toggle>
            <Toggle
              size="xl"
              onClick={() =>
                dispatch({ type: "SET_BRUSH_MODE", payload: BrushMode.White })
              }
              pressed={state.brushMode === BrushMode.White}
            >
              <img src={circleWhiteSvg} width={32} height={32} />
            </Toggle>
            <Toggle
              size="xl"
              onClick={() =>
                dispatch({ type: "SET_BRUSH_MODE", payload: BrushMode.Remove })
              }
              pressed={state.brushMode === BrushMode.Remove}
            >
              <img src={eraserSvg} width={32} height={32} />
            </Toggle>
          </div>
          <div>
            <div className="flex flex-col gap-1 mb-1">
              <Button
                size="xl"
                variant="outline"
                onClick={handleUndo}
                disabled={state.historyIndex === 0}
              >
                <img src={undoSvg} width={24} height={24} />
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={handleRedo}
                disabled={state.historyIndex === state.history.length - 1}
              >
                <img src={redoSvg} width={24} height={24} />
              </Button>
            </div>
            <Button
              size="xl"
              color="red"
              variant="outline"
              onClick={handleClearBoard}
            >
              <img src={trashSvg} width={24} height={24} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
