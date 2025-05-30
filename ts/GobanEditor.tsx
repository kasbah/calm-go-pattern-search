import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useWindowSize } from "@reach/window-size";
import SabakiGoBoard from "@sabaki/go-board";
import { Goban, type Vertex } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import { useCallback, useEffect, useState } from "react";
import { useImmerReducer } from "use-immer";
import "./GobanCommon.css";
import "./GobanEditor.css";

import circleBlackSvg from "./icons/circle-black.svg";
import circleWhiteSvg from "./icons/circle-white.svg";
import eraserSvg from "./icons/eraser.svg";
import overlappingCirclesBlackSvg from "./icons/overlapping-circles-black.svg";
import overlappingCirclesWhiteSvg from "./icons/overlapping-circles-white.svg";
import redoSvg from "./icons/redo.svg";
import trashSvg from "./icons/trash.svg";
import undoSvg from "./icons/undo.svg";
import {
  boardsEqual,
  BrushMode,
  emptyBoard,
  SabakiColor,
  SabakiSign,
  type BoardPosition,
} from "./sabaki-types";

type HistoryEntry = {
  board: BoardPosition;
  moveSign: SabakiSign;
};

type GobanEditorAction =
  | { type: "SET_BRUSH_MODE"; payload: BrushMode }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_BOARD" }
  | { type: "MOUSE_DOWN"; payload: Vertex }
  | { type: "MOUSE_UP" }
  | { type: "MOUSE_ENTER"; payload: Vertex }
  | { type: "MOUSE_LEAVE"; payload: Vertex }
  | { type: "TOGGLE_ALTERNATE_COLOR" };

type GobanEditorState = {
  board: BoardPosition;
  stagingBoard: BoardPosition;
  lastStagedSign: SabakiSign;
  alternateBrushColor: SabakiColor;
  brushMode: BrushMode;
  history: HistoryEntry[];
  historyIndex: number;
  isMouseDown: boolean;
};

const initialState: GobanEditorState = {
  board: emptyBoard,
  stagingBoard: emptyBoard,
  lastStagedSign: SabakiSign.Empty,
  alternateBrushColor: SabakiColor.Black,
  brushMode: BrushMode.Alternate,
  history: [{ board: emptyBoard, moveSign: SabakiSign.Empty }],
  historyIndex: 0,
  isMouseDown: false,
};

function stageVertexChange(state: GobanEditorState, vertex: Vertex) {
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

function gobanEditorReducer(
  state: GobanEditorState,
  action: GobanEditorAction,
): void {
  switch (action.type) {
    case "MOUSE_DOWN": {
      // needed because we switch color when clicking on a stone again
      if (state.brushMode === BrushMode.Alternate) {
        stageVertexChange(state, action.payload);
      }
      state.isMouseDown = true;
      return;
    }

    case "MOUSE_UP": {
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
        state.stagingBoard = state.board;
      }
      return;
    }

    case "SET_BRUSH_MODE": {
      state.brushMode = action.payload;
      return;
    }

    case "UNDO": {
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
    }

    case "REDO": {
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
    }

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

    case "TOGGLE_ALTERNATE_COLOR": {
      state.alternateBrushColor =
        state.alternateBrushColor === SabakiSign.Black
          ? SabakiSign.White
          : SabakiSign.Black;
      return;
    }
  }
}

export type GobanEditorProps = {
  onUpdateBoard: (board: BoardPosition) => void;
};

export default function GobanEditor({ onUpdateBoard }: GobanEditorProps) {
  const windowSize = useWindowSize();
  const [state, dispatch] = useImmerReducer(gobanEditorReducer, initialState);
  const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
  const [displayBoard, setDisplayBoard] = useState<BoardPosition>(emptyBoard);

  useEffect(() => {
    onUpdateBoard(state.board);
  }, [state.board, onUpdateBoard]);

  useEffect(() => {
    const handleDocumentMouseUp = () => {
      if (state.isMouseDown) {
        dispatch({ type: "MOUSE_UP" });
      }
    };

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [state.isMouseDown, dispatch]);

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
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, [dispatch]);

  const handleVertexMouseEnter = useCallback(
    (_e: React.MouseEvent, vertex: Vertex) => {
      dispatch({ type: "MOUSE_ENTER", payload: vertex });
    },
    [dispatch],
  );

  const handleVertexMouseLeave = useCallback(
    (_e: React.MouseEvent, vertex: Vertex) => {
      dispatch({ type: "MOUSE_LEAVE", payload: vertex });
    },
    [dispatch],
  );

  const handleMouseDown = useCallback(
    (_e: React.MouseEvent, vertex: Vertex) => {
      dispatch({ type: "MOUSE_DOWN", payload: vertex });
    },
    [dispatch],
  );

  const handleClearBoard = useCallback(() => {
    dispatch({ type: "CLEAR_BOARD" });
  }, [dispatch]);

  const maxHeight = Math.min(windowSize.height, windowSize.width * 0.5);

  return (
    <div className="flex flex-row gap-2 GobanEditor" style={{ maxHeight }}>
      <div>
        <Goban
          animateStonePlacement={false}
          fuzzyStonePlacement={false}
          vertexSize={windowSize.width * 0.02}
          showCoordinates={true}
          signMap={displayBoard}
          dimmedVertices={dimmedVertices}
          onVertexMouseEnter={handleVertexMouseEnter}
          onVertexMouseLeave={handleVertexMouseLeave}
          onVertexMouseDown={handleMouseDown}
        />
      </div>
      <div className="mt-2 mb-2">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col gap-1">
            <Toggle
              size="xl"
              onClick={() => {
                if (state.brushMode === BrushMode.Alternate) {
                  dispatch({
                    type: "TOGGLE_ALTERNATE_COLOR",
                  });
                } else {
                  dispatch({
                    type: "SET_BRUSH_MODE",
                    payload: BrushMode.Alternate,
                  });
                }
              }}
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
