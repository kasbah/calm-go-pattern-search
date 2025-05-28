//@ts-ignore
import React, { useState, useEffect, useCallback } from "react";
import { useWindowSize } from "@reach/window-size";
import { BoundedGoban, type Vertex } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";
import SabakiGoBoard, { type Sign } from "@sabaki/go-board";
import { useImmerReducer } from "use-immer";
import { produce } from "immer";
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

type HistoryEntry = {
  board: BoardPosition;
  moveColor: SabakiColor;
};

type GobanState = {
  board: BoardPosition;
  stagingBoard: BoardPosition;
  hoverVertex: Vertex | null;
  alternateBrushColor: SabakiColor;
  brushMode: BrushMode;
  history: HistoryEntry[];
  historyIndex: number;
  isDragging: boolean;
};

type GobanAction =
  | { type: "SET_HOVER_VERTEX"; payload: Vertex | null }
  | { type: "SET_BRUSH_MODE"; payload: BrushMode }
  | { type: "PLACE_STONE"; payload: Vertex }
  | { type: "PLACE_DRAGGING_STONE"; payload: Vertex }
  | { type: "REMOVE_STONE"; payload: Vertex }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_BOARD" }
  | { type: "SET_DRAGGING"; payload: boolean };

const initialState: GobanState = {
  board: emptyBoard,
  stagingBoard: emptyBoard,
  hoverVertex: null,
  alternateBrushColor: SabakiColor.Black,
  brushMode: BrushMode.Alternate,
  history: [{ board: emptyBoard, moveColor: SabakiColor.Empty }],
  historyIndex: 0,
  isDragging: false,
};

function calculateDimmedVertices(
  board: BoardPosition,
  displayBoard: BoardPosition,
): Array<Vertex> {
  const dimmed: Array<Vertex> = [];
  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] !== displayBoard[y][x]) {
        dimmed.push([x, y]);
      }
    }
  }
  return dimmed;
}

function gobanReducer(state: GobanState, action: GobanAction): void {
  switch (action.type) {
    case "SET_HOVER_VERTEX": {
      const newHoverVertex = action.payload;
      state.hoverVertex = newHoverVertex;
      if (state.isDragging) {
        return;
      }
      if (newHoverVertex == null) {
        state.stagingBoard = state.board;
        return;
      }
      const x = newHoverVertex[0];
      const y = newHoverVertex[1];
      const stone = state.board[y][x];
      const nextColor = getNextColor(
        stone,
        state.alternateBrushColor,
        state.brushMode,
      );
      // we need to make a modified copy of state.board here, without modifying
      // state.board itself, so we need this extra `produce` call even though
      // we are using useImmerReducer
      state.stagingBoard = produce(state.board, (draft) => {
        draft[y][x] = nextColor;
      });
      return;
    }

    case "SET_BRUSH_MODE":
      state.brushMode = action.payload;
      return;

    case "REMOVE_STONE": {
      const vertex = action.payload;
      const x = vertex[0];
      const y = vertex[1];
      state.board[y][x] = SabakiColor.Empty;
      state.stagingBoard = state.board;
      state.history.splice(state.historyIndex + 1);
      state.history.push({
        board: state.board,
        moveColor: state.history[state.historyIndex].moveColor,
      });
      state.historyIndex = state.historyIndex + 1;
      return;
    }

    case "PLACE_DRAGGING_STONE": {
      const vertex = action.payload;
      const x = vertex[0];
      const y = vertex[1];
      const stone = state.board[y][x];
      const nextColor = getNextColor(
        stone,
        state.alternateBrushColor,
        state.brushMode,
      );

      const sgb = new SabakiGoBoard(state.stagingBoard);
      const move = sgb.makeMove(nextColor as Sign, vertex);

      state.stagingBoard = move.signMap;
      return;
    }

    case "PLACE_STONE": {
      const vertex = action.payload;
      const x = vertex[0];
      const y = vertex[1];
      const stone = state.board[y][x];
      const nextColor = getNextColor(
        stone,
        state.alternateBrushColor,
        state.brushMode,
      );

      if (nextColor !== SabakiColor.Empty) {
        const sgb = new SabakiGoBoard(state.board);
        const move = sgb.makeMove(nextColor as Sign, vertex);
        const newBoard = move.signMap;

        const newAlternateBrushColor =
          nextColor === SabakiColor.Black
            ? SabakiColor.White
            : SabakiColor.Black;

        state.board = newBoard;
        state.stagingBoard = newBoard;
        state.history.splice(state.historyIndex + 1);
        state.history.push({
          board: newBoard,
          moveColor: nextColor,
        });
        state.historyIndex = state.historyIndex + 1;
        state.alternateBrushColor = newAlternateBrushColor;
      }
      return;
    }

    case "UNDO":
      if (state.historyIndex > 0) {
        const { moveColor } = state.history[state.historyIndex];
        const newIndex = state.historyIndex - 1;
        const { board: newBoard } = state.history[newIndex];
        const newAlternateBrushColor =
          moveColor === SabakiColor.Empty
            ? state.alternateBrushColor
            : moveColor;

        state.board = newBoard;
        state.stagingBoard = newBoard;
        state.historyIndex = newIndex;
        state.alternateBrushColor = newAlternateBrushColor;
      }
      return;

    case "REDO":
      if (state.historyIndex < state.history.length - 1) {
        const { moveColor } = state.history[state.historyIndex];
        const newIndex = state.historyIndex + 1;
        const { board: newBoard } = state.history[newIndex];
        const newAlternateBrushColor =
          moveColor === SabakiColor.Empty
            ? state.alternateBrushColor
            : moveColor;

        state.board = newBoard;
        state.stagingBoard = newBoard;
        state.historyIndex = newIndex;
        state.alternateBrushColor = newAlternateBrushColor;
      }
      return;

    case "CLEAR_BOARD": {
      state.history.splice(state.historyIndex + 1);
      state.history.push({
        board: emptyBoard,
        moveColor: state.alternateBrushColor,
      });

      state.board = emptyBoard;
      state.stagingBoard = emptyBoard;
      state.historyIndex = state.historyIndex + 1;
      state.alternateBrushColor = SabakiColor.Black;
      return;
    }

    case "SET_DRAGGING": {
      const wasDragging = state.isDragging;
      const isDragging = action.payload;

      // If we're releasing the drag and have pending stones, commit them
      if (wasDragging && !isDragging) {
        state.history.splice(state.historyIndex + 1);
        state.board = state.stagingBoard;
        state.history.push({
          board: state.board,
          moveColor:
            state.brushMode === BrushMode.Black
              ? SabakiColor.Black
              : SabakiColor.White,
        });
        state.historyIndex = state.historyIndex + 1;
      }

      state.isDragging = isDragging;
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
        if (stagingStone !== SabakiColor.Empty) {
          return stagingStone;
        }
        if (boardStone !== SabakiColor.Empty) {
          return boardStone;
        }
        return SabakiColor.Empty;
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

  const handleVertexMouseEnter = useCallback(
    (_e: any, vertex: Vertex) => {
      // If dragging and using black or white brush, place a stone
      if (state.isDragging) {
        if (
          state.brushMode === BrushMode.Black ||
          state.brushMode === BrushMode.White
        ) {
          dispatch({ type: "PLACE_DRAGGING_STONE", payload: vertex });
        }
      } else {
        dispatch({ type: "SET_HOVER_VERTEX", payload: vertex });
      }
    },
    [state.isDragging, state.brushMode],
  );

  const handleVertexMouseLeave = useCallback(
    (_e: any, _vertex: Vertex) => {
      if (!state.isDragging) {
        dispatch({ type: "SET_HOVER_VERTEX", payload: null });
      }
    },
    [state.isDragging],
  );

  const handleMouseDown = useCallback(
    (_e: any, vertex: Vertex) => {
      if (
        state.brushMode === BrushMode.Black ||
        state.brushMode === BrushMode.White
      ) {
        dispatch({ type: "SET_DRAGGING", payload: true });
        dispatch({ type: "PLACE_DRAGGING_STONE", payload: vertex });
      }
    },
    [state.brushMode, state.board],
  );

  const handleMouseUp = useCallback(
    (_e: any, vertex: Vertex) => {
      if (state.brushMode === BrushMode.Remove) {
        dispatch({ type: "REMOVE_STONE", payload: vertex });
      } else if (!state.isDragging && state.brushMode === BrushMode.Alternate) {
        dispatch({ type: "PLACE_STONE", payload: vertex });
      }
      dispatch({ type: "SET_DRAGGING", payload: false });
      dispatch({ type: "SET_HOVER_VERTEX", payload: null });
    },
    [state.board, state.brushMode],
  );

  const handleBoardMouseLeave = useCallback(() => {
    if (state.isDragging) {
      dispatch({ type: "SET_DRAGGING", payload: false });
    }
  }, [state.isDragging]);

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
              {state.alternateBrushColor === SabakiColor.Black ? (
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
