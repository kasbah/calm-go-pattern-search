import { Button } from "@/ui-primitives/button";
import { Goban, type Map, type Marker, type Vertex } from "./shudan";
import "./shudan/css/goban.css";
import SabakiGoBoard from "@sabaki/go-board";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useImmerReducer } from "use-immer";
import BrushToolbar from "./brush-toolbar";
import {
  boardsEqual,
  BrushMode,
  emptyBoard,
  SabakiColor,
  SabakiSign,
  type BoardPosition,
} from "@/sabaki-types";

import "./editor-goban.css";
import "./goban-common.css";

import redoSvg from "@/assets/icons/redo.svg";
import trashSvg from "@/assets/icons/trash.svg";
import undoSvg from "@/assets/icons/undo.svg";

type HistoryEntry = {
  board: BoardPosition;
  moveSign: SabakiSign;
};

type EditorGobanAction =
  | { type: "SET_BRUSH_MODE"; payload: BrushMode }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "CLEAR_BOARD" }
  | { type: "MOUSE_DOWN"; payload: Vertex }
  | { type: "MOUSE_UP" }
  | { type: "MOUSE_ENTER"; payload: Vertex }
  | { type: "MOUSE_LEAVE"; payload: Vertex }
  | { type: "TOGGLE_ALTERNATE_COLOR" }
  | { type: "SET_BOARD"; payload: BoardPosition };

type EditorGobanState = {
  board: BoardPosition;
  stagingBoard: BoardPosition;
  lastStagedSign: SabakiSign;
  alternateBrushColor: SabakiColor;
  brushMode: BrushMode;
  history: HistoryEntry[];
  historyIndex: number;
  isMouseDown: boolean;
};

const initialState: EditorGobanState = {
  board: emptyBoard,
  stagingBoard: emptyBoard,
  lastStagedSign: SabakiSign.Empty,
  alternateBrushColor: SabakiColor.Black,
  brushMode: BrushMode.Alternate,
  history: [{ board: emptyBoard, moveSign: SabakiSign.Empty }],
  historyIndex: 0,
  isMouseDown: false,
};

function stageVertexChange(state: EditorGobanState, vertex: Vertex) {
  // change the vertex to the right color stone or remove it(brushMode) => onChangeBrushMode(brushMode)
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

function editorGobanReducer(
  state: EditorGobanState,
  action: EditorGobanAction,
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

    case "SET_BOARD": {
      state.board = action.payload;
      state.stagingBoard = action.payload;
      state.history = [{ board: action.payload, moveSign: SabakiSign.Empty }];
      state.historyIndex = 0;
      state.alternateBrushColor = SabakiSign.Black;
      return;
    }
  }
}

export type EditorGobanProps = {
  onUpdateBoard: (board: BoardPosition) => void;
  vertexSize: number;
  nextMoves: Array<{ x: number; y: number }>;
  onChangeBrushColor: (color: SabakiColor) => void;
  onChangeBrushMode: (mode: BrushMode) => void;
  brushMode: BrushMode;
  previewStone?: { x: number; y: number } | null;
  onCommitMove?: (point: { x: number; y: number }) => void;
};

export type EditorGobanRef = {
  undo: () => void;
  redo: () => void;
  commitMove: (point: { x: number; y: number }) => void;
  clearBoard: () => void;
  setBoard: (board: BoardPosition) => void;
};

const EditorGoban = forwardRef<EditorGobanRef, EditorGobanProps>(
  (
    {
      onUpdateBoard,
      vertexSize,
      nextMoves,
      onChangeBrushColor,
      onChangeBrushMode,
      brushMode,
      previewStone,
      onCommitMove,
    },
    ref,
  ) => {
    const [state, dispatch] = useImmerReducer(editorGobanReducer, initialState);
    const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
    const [displayBoard, setDisplayBoard] = useState<BoardPosition>(emptyBoard);
    const [markerMap, setMarkerMap] = useState<Map<Marker | null>>(
      emptyBoard.map((row) => row.map(() => null)),
    );
    const [brushColor, setBrushColor] = useState<SabakiColor>(
      SabakiColor.Black,
    );
    const [isTrashHovering, setIsTrashHovering] = useState(false);

    const markerTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );

    const undo = useCallback(() => {
      dispatch({ type: "UNDO" });
    }, [dispatch]);

    const redo = useCallback(() => {
      dispatch({ type: "REDO" });
    }, [dispatch]);

    const handleCommitMove = useCallback(
      (point: { x: number; y: number }) => {
        const vertex: Vertex = [point.x, point.y];
        dispatch({ type: "MOUSE_DOWN", payload: vertex });
        dispatch({ type: "MOUSE_UP" });
        onCommitMove?.(point);
      },
      [dispatch, onCommitMove],
    );

    const clearBoard = useCallback(() => {
      dispatch({ type: "CLEAR_BOARD" });
    }, [dispatch]);

    const setBoard = useCallback(
      (board: BoardPosition) => {
        dispatch({ type: "SET_BOARD", payload: board });
      },
      [dispatch],
    );

    useImperativeHandle(
      ref,
      () => ({
        undo,
        redo,
        commitMove: handleCommitMove,
        clearBoard,
        setBoard,
      }),
      [undo, redo, handleCommitMove, clearBoard, setBoard],
    );

    useEffect(() => {
      if (
        state.brushMode === BrushMode.Alternate ||
        state.brushMode === BrushMode.Remove
      ) {
        setBrushColor(state.alternateBrushColor);
      } else {
        setBrushColor(
          state.brushMode === BrushMode.Black
            ? SabakiColor.Black
            : SabakiColor.White,
        );
      }
    }, [state.alternateBrushColor, setBrushColor, state.brushMode]);

    useEffect(() => {
      dispatch({ type: "SET_BRUSH_MODE", payload: brushMode });
    }, [brushMode, dispatch]);

    useEffect(() => {
      onChangeBrushColor(brushColor);
    }, [brushColor, onChangeBrushColor]);

    useEffect(() => {
      clearTimeout(markerTimerRef.current);
      const mm: Map<Marker | null> = emptyBoard.map((row) =>
        row.map(() => null),
      );
      if (nextMoves.length === 0) {
        setMarkerMap(mm);
        return;
      }
      nextMoves.forEach(({ x, y }, i) => {
        mm[y][x] = {
          type: "circle-label",
          label: `${i + 1}`,
          tooltip: "x",
          color: brushColor === SabakiColor.Black ? "#9b9b9b" : "whitesmoke",
        };
      });
      markerTimerRef.current = setTimeout(() => {
        setMarkerMap(mm);
      }, 100);
      return () => {
        clearTimeout(markerTimerRef.current);
      };
    }, [nextMoves, state.alternateBrushColor, brushColor]);

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

          // Show preview stone if it's at this position
          if (previewStone && previewStone.x === x && previewStone.y === y) {
            dimmed.push([x, y]);
            return brushColor === SabakiColor.Black
              ? SabakiSign.Black
              : SabakiSign.White;
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
    }, [state.board, state.stagingBoard, previewStone, brushColor]);

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
        const [x, y] = vertex;

        // Check if this is a click on a preview stone
        if (previewStone && previewStone.x === x && previewStone.y === y) {
          handleCommitMove(previewStone);
          return;
        }

        dispatch({ type: "MOUSE_DOWN", payload: vertex });
      },
      [dispatch, previewStone, handleCommitMove],
    );

    const handleClearBoard = useCallback(() => {
      dispatch({ type: "CLEAR_BOARD" });
    }, [dispatch]);

    const maxHeight = Math.min(window.innerHeight, window.innerWidth * 0.5);

    return (
      <div
        className="flex flex-row gap-2 EditorGoban"
        style={{ maxHeight }}
        data-trash-hovering={isTrashHovering}
      >
        <div className="ml-2 mb-2 mt-2">
          <div className="flex flex-col justify-between h-full">
            <BrushToolbar
              brushMode={state.brushMode}
              alternateBrushColor={state.alternateBrushColor}
              onSetBrushMode={onChangeBrushMode}
              onToggleAlternateColor={() =>
                dispatch({ type: "TOGGLE_ALTERNATE_COLOR" })
              }
            />
            <div>
              <div className="flex flex-col gap-1 mb-1">
                <Button
                  size="xl"
                  variant="outline"
                  onClick={undo}
                  disabled={state.historyIndex === 0}
                >
                  <img src={undoSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  onClick={redo}
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
                disabled={boardsEqual(state.board, emptyBoard)}
                onMouseEnter={() => setIsTrashHovering(true)}
                onMouseLeave={() => setIsTrashHovering(false)}
              >
                <img src={trashSvg} width={24} height={24} />
              </Button>
            </div>
          </div>
        </div>
        <div>
          <Goban
            vertexSize={vertexSize}
            showCoordinates={true}
            signMap={displayBoard}
            markerMap={markerMap}
            dimmedVertices={dimmedVertices}
            onVertexMouseEnter={handleVertexMouseEnter}
            onVertexMouseLeave={handleVertexMouseLeave}
            onVertexMouseDown={handleMouseDown}
          />
        </div>
      </div>
    );
  },
);

export default EditorGoban;
