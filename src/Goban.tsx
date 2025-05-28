//@ts-ignore
import React, { useState, useEffect, useCallback } from "react";
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
  displayBoard: BoardPosition;
  hoverVertex: Vertex | null;
  dimmedVertices: Array<Vertex>;
  alternateBrushColor: SabakiColor;
  brushMode: BrushMode;
  history: HistoryEntry[];
  historyIndex: number;
  isDragging: boolean;
  pendingStones: Array<Vertex>;
};

type GobanAction =
  | { type: "SET_HOVER_VERTEX"; payload: Vertex | null }
  | { type: "SET_BRUSH_MODE"; payload: BrushMode }
  | { type: "PLACE_STONE"; payload: Vertex }
  | { type: "REMOVE_STONE"; payload: Vertex }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_BOARD" }
  | { type: "SET_DRAGGING"; payload: boolean };

const initialState: GobanState = {
  board: emptyBoard,
  displayBoard: emptyBoard,
  hoverVertex: null,
  dimmedVertices: [],
  alternateBrushColor: SabakiColor.Black,
  brushMode: BrushMode.Alternate,
  history: [{ board: emptyBoard, moveColor: SabakiColor.Empty }],
  historyIndex: 0,
  isDragging: false,
  pendingStones: [],
};

function gobanReducer(state: GobanState, action: GobanAction): GobanState {
  switch (action.type) {
    case "SET_HOVER_VERTEX": {
      const newHoverVertex = action.payload;
      if (newHoverVertex == null) {
        return produce(state, (draft) => {
          draft.displayBoard = draft.board;
          draft.dimmedVertices = [];
        });
      }
      const x = newHoverVertex[0];
      const y = newHoverVertex[1];
      const stone = state.board[y][x];
      const nextColor = getNextColor(
        stone,
        state.alternateBrushColor,
        state.brushMode,
      );
      return produce(state, (draft) => {
        draft.displayBoard = produce(state.board, (board) => {
          board[y][x] = nextColor;
        });
        draft.dimmedVertices = [[x, y]];
      });
    }

    case "SET_BRUSH_MODE":
      return produce(state, (draft) => {
        draft.brushMode = action.payload;
      });

    case "REMOVE_STONE": {
      const vertex = action.payload;
      const x = vertex[0];
      const y = vertex[1];
      return produce(state, (draft) => {
        draft.board[y][x] = SabakiColor.Empty;
        draft.displayBoard = draft.board;
        draft.history.splice(state.historyIndex + 1);
        draft.history.push({
          board: draft.board,
          moveColor: state.history[state.historyIndex].moveColor,
        });
        draft.historyIndex = state.historyIndex + 1;
      });
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

      // Only proceed if we're placing a stone
      if (nextColor !== SabakiColor.Empty) {
        const sgb = new SabakiGoBoard(state.board);
        const move = sgb.makeMove(nextColor as Sign, vertex);

        const newBoard = move.signMap;

        // If dragging, add to pending stones instead of updating history
        if (state.isDragging) {
          return produce(state, (draft) => {
            draft.board = newBoard;
            draft.displayBoard = newBoard;
            draft.pendingStones.push(vertex);
          });
        }

        const newAlternateBrushColor =
          nextColor === SabakiColor.Black
            ? SabakiColor.White
            : SabakiColor.Black;

        return produce(state, (draft) => {
          draft.board = newBoard;
          draft.displayBoard = newBoard;
          draft.history.splice(state.historyIndex + 1);
          draft.history.push({
            board: newBoard,
            moveColor: nextColor,
          });
          draft.historyIndex = state.historyIndex + 1;
          draft.alternateBrushColor = newAlternateBrushColor;
        });
      }

      return state;
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

        return produce(state, (draft) => {
          draft.board = newBoard;
          draft.displayBoard = newBoard;
          draft.historyIndex = newIndex;
          draft.alternateBrushColor = newAlternateBrushColor;
        });
      }
      return state;

    case "REDO":
      if (state.historyIndex < state.history.length - 1) {
        const { moveColor } = state.history[state.historyIndex];
        const newIndex = state.historyIndex + 1;
        const { board: newBoard } = state.history[newIndex];
        const newAlternateBrushColor =
          moveColor === SabakiColor.Empty
            ? state.alternateBrushColor
            : moveColor;

        return produce(state, (draft) => {
          draft.board = newBoard;
          draft.displayBoard = newBoard;
          draft.historyIndex = newIndex;
          draft.alternateBrushColor = newAlternateBrushColor;
        });
      }
      return state;

    case "CLEAR_BOARD": {
      const newHistory = produce(state.history, (historyDraft) => {
        historyDraft.splice(state.historyIndex + 1);
        historyDraft.push({
          board: emptyBoard,
          moveColor: state.alternateBrushColor,
        });
      });

      return produce(state, (draft) => {
        draft.board = emptyBoard;
        draft.displayBoard = emptyBoard;
        draft.history = newHistory;
        draft.historyIndex = state.historyIndex + 1;
        draft.alternateBrushColor = SabakiColor.Black;
      });
    }

    case "SET_DRAGGING":
      return produce(state, (draft) => {
        const wasDragging = state.isDragging;
        const isDragging = action.payload;

        // If we're releasing the drag and have pending stones, commit them
        if (wasDragging && !isDragging && draft.pendingStones.length > 0) {
          draft.history.splice(state.historyIndex + 1);
          draft.history.push({
            board: draft.board,
            moveColor:
              state.brushMode === BrushMode.Black
                ? SabakiColor.Black
                : SabakiColor.White,
          });
          draft.historyIndex = state.historyIndex + 1;
          draft.pendingStones = [];
        }

        draft.isDragging = isDragging;
      });

    default:
      return state;
  }
}

export default function Goban({ onUpdateBoard }: GobanProps) {
  const windowSize = useWindowSize();
  const [state, dispatch] = React.useReducer(gobanReducer, initialState);

  useEffect(() => {
    onUpdateBoard(state.board);
  }, [state.board]);

  const handleUndo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const handleVertexMouseEnter = useCallback(
    (_e: any, vertex: Vertex) => {
      dispatch({ type: "SET_HOVER_VERTEX", payload: vertex });

      // If dragging and using black or white brush, place a stone
      if (
        state.isDragging &&
        (state.brushMode === BrushMode.Black ||
          state.brushMode === BrushMode.White)
      ) {
        dispatch({ type: "PLACE_STONE", payload: vertex });
      }
    },
    [state.isDragging, state.brushMode, state.board],
  );

  const handleVertexMouseLeave = useCallback((_e: any, _vertex: Vertex) => {
    dispatch({ type: "SET_HOVER_VERTEX", payload: null });
  }, []);

  const handleMouseDown = useCallback(
    (_e: any, vertex: Vertex) => {
      if (
        state.brushMode === BrushMode.Black ||
        state.brushMode === BrushMode.White
      ) {
        dispatch({ type: "SET_DRAGGING", payload: true });
        dispatch({ type: "PLACE_STONE", payload: vertex });
      }
    },
    [state.brushMode, state.board],
  );

  const handleMouseUp = useCallback(
    (_e: any, vertex: Vertex) => {
      dispatch({ type: "SET_DRAGGING", payload: false });

      dispatch({ type: "SET_HOVER_VERTEX", payload: null });

      if (state.brushMode === BrushMode.Remove) {
        dispatch({ type: "REMOVE_STONE", payload: vertex });
      } else {
        dispatch({ type: "PLACE_STONE", payload: vertex });
      }
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
          signMap={state.displayBoard}
          dimmedVertices={state.dimmedVertices}
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
