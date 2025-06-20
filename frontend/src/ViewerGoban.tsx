import { Goban, type Map, type Marker, type Vertex } from "@calm-go/shudan";
import GoBoard from "@sabaki/go-board";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { useImmerReducer } from "use-immer";
import BrushToolbar from "./BrushToolbar";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  BrushMode,
  emptyBoard,
  SabakiColor,
  SabakiSign,
  type BoardPosition,
  type SabakiMove,
} from "./sabaki-types";
import { toSabakiMove, type Game } from "./wasm-search-types";

import "./goban-common.css";
import "./ViewerGoban.css";

import chevronFirstSvg from "./assets/icons/chevron-first.svg";
import chevronLastSvg from "./assets/icons/chevron-last.svg";
import chevronLeftSvg from "./assets/icons/chevron-left.svg";
import chevronRightSvg from "./assets/icons/chevron-right.svg";

function calculateBoardPosition(
  moves: Array<SabakiMove>,
  moveNumber: number,
): BoardPosition {
  let sgb = new GoBoard(emptyBoard);
  // If moveNumber is -1, return empty board
  if (moveNumber < 0) {
    return sgb.signMap;
  }
  for (let i = 0; i <= moveNumber; i++) {
    const move = moves[i];
    if (!move) break;
    sgb = sgb.makeMove(move.color, [move.point.x, move.point.y]);
  }
  return sgb.signMap;
}

export type ViewerGobanRef = {
  prevMove: () => void;
  nextMove: () => void;
};

const clampMoveNumber = (moveNumber: number, max: number) => {
  if (max === 0) return -1;
  if (moveNumber < 0) return 0;
  if (moveNumber >= max) return max - 1;
  return moveNumber;
};

type ViewerGobanAction =
  | { type: "TOGGLE_ALTERNATE_COLOR" }
  | { type: "SET_BRUSH_MODE"; payload: BrushMode }
  | { type: "SET_MOVE_NUMBER"; payload: number }
  | { type: "UPDATE_BOARD"; payload: BoardPosition }
  | { type: "MOUSE_ENTER"; payload: Vertex }
  | { type: "MOUSE_LEAVE"; payload: Vertex };

type ViewerGobanState = {
  alternateBrushColor: SabakiColor;
  brushMode: BrushMode;
  moveNumber: number;
  stagingBoard: BoardPosition;
  currentBoard: BoardPosition;
};

const initialViewerState: ViewerGobanState = {
  alternateBrushColor: SabakiColor.Black,
  brushMode: BrushMode.Alternate,
  moveNumber: 0,
  stagingBoard: emptyBoard,
  currentBoard: emptyBoard,
};

function getHoverStoneColor(
  brushMode: BrushMode,
  alternateBrushColor: SabakiColor,
): SabakiSign {
  if (brushMode === BrushMode.Alternate) {
    return alternateBrushColor;
  } else if (brushMode === BrushMode.Black) {
    return SabakiSign.Black;
  } else if (brushMode === BrushMode.White) {
    return SabakiSign.White;
  } else if (brushMode === BrushMode.Remove) {
    return SabakiSign.Empty;
  }
  return alternateBrushColor;
}

function stageHoverStone(state: ViewerGobanState, vertex: Vertex) {
  const [x, y] = vertex;
  const stone = state.currentBoard[y][x];

  // For remove mode, show preview even on occupied positions
  if (state.brushMode === BrushMode.Remove) {
    // Create a copy of the current board for staging
    state.stagingBoard = state.currentBoard.map((row) => [...row]);
    state.stagingBoard[y][x] = SabakiSign.Empty;
    return;
  }

  // Only show hover stone on empty positions for other modes
  if (stone !== SabakiSign.Empty) {
    state.stagingBoard = state.currentBoard;
    return;
  }

  // Create a copy of the current board for staging
  state.stagingBoard = state.currentBoard.map((row) => [...row]);

  // Add the hover stone based on brush mode
  const hoverColor = getHoverStoneColor(
    state.brushMode,
    state.alternateBrushColor,
  );
  if (hoverColor !== SabakiSign.Empty) {
    state.stagingBoard[y][x] = hoverColor;
  }
}

function viewerGobanReducer(
  state: ViewerGobanState,
  action: ViewerGobanAction,
): void {
  switch (action.type) {
    case "TOGGLE_ALTERNATE_COLOR": {
      state.alternateBrushColor =
        state.alternateBrushColor === SabakiSign.Black
          ? SabakiSign.White
          : SabakiSign.Black;
      return;
    }
    case "SET_BRUSH_MODE": {
      state.brushMode = action.payload;
      return;
    }
    case "SET_MOVE_NUMBER": {
      state.moveNumber = action.payload;
      return;
    }
    case "UPDATE_BOARD": {
      state.currentBoard = action.payload;
      state.stagingBoard = action.payload;
      return;
    }
    case "MOUSE_ENTER": {
      stageHoverStone(state, action.payload);
      return;
    }
    case "MOUSE_LEAVE": {
      state.stagingBoard = state.currentBoard;
      return;
    }
  }
}

export type ViewerGobanProps = {
  game: Game;
  vertexSize: number;
  moveNumber: number;
  setMoveNumber: (moveNumber: number) => void;
  onChangeBrushMode: (mode: BrushMode) => void;
  brushMode: BrushMode;
};

const ViewerGoban = forwardRef<ViewerGobanRef, ViewerGobanProps>(
  (
    {
      game,
      vertexSize,
      moveNumber,
      setMoveNumber,
      onChangeBrushMode,
      brushMode,
    },
    ref,
  ) => {
    const [state, dispatch] = useImmerReducer(
      viewerGobanReducer,
      initialViewerState,
    );
    const [markerMap, setMarkerMap] = useState<Map<Marker | null>>(
      emptyBoard.map((row) => row.map(() => null)),
    );
    const maxHeight = Math.min(window.innerHeight, window.innerWidth * 0.5);
    const [moves, setMoves] = useState<Array<SabakiMove>>(
      game.moves_transformed.map(toSabakiMove),
    );
    const [board, setBoard] = useState<BoardPosition>(
      calculateBoardPosition(moves, moveNumber),
    );
    const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
    const [displayBoard, setDisplayBoard] = useState<BoardPosition>(emptyBoard);

    useEffect(() => {
      const mm: Map<Marker | null> = emptyBoard.map((row) =>
        row.map(() => null),
      );
      const lastMove = game.moves_transformed[moveNumber];
      if (lastMove !== undefined) {
        mm[lastMove.point.y][lastMove.point.x] = {
          type: "circle",
        };
        setMarkerMap(mm);
      }
    }, [game.moves_transformed, moveNumber]);

    // Clear markers when the game is about to be hidden (game becomes null or empty)
    useEffect(() => {
      if (!game || !game.path) {
        setMarkerMap(emptyBoard.map((row) => row.map(() => null)));
      }
    }, [game]);

    const prevMove = useCallback(() => {
      setMoveNumber(
        clampMoveNumber(moveNumber - 1, game.moves_transformed.length),
      );
    }, [moveNumber, setMoveNumber, game.moves_transformed.length]);

    const nextMove = useCallback(() => {
      setMoveNumber(
        clampMoveNumber(moveNumber + 1, game.moves_transformed.length),
      );
    }, [moveNumber, setMoveNumber, game.moves_transformed.length]);

    useImperativeHandle(
      ref,
      () => ({
        prevMove,
        nextMove,
      }),
      [prevMove, nextMove],
    );

    useEffect(() => {
      setMoves(game.moves_transformed.map(toSabakiMove));
    }, [game, setMoves]);

    useEffect(() => {
      setBoard(calculateBoardPosition(moves, moveNumber));
    }, [moves, moveNumber]);

    useEffect(() => {
      dispatch({ type: "SET_BRUSH_MODE", payload: brushMode });
    }, [brushMode, dispatch]);

    // Update staging board when the main board changes
    useEffect(() => {
      dispatch({ type: "SET_MOVE_NUMBER", payload: moveNumber });
      dispatch({ type: "UPDATE_BOARD", payload: board });

      // Set alternate brush color to opposite of last move
      const lastMove = game.moves_transformed[moveNumber];
      if (lastMove) {
        const nextColor =
          lastMove.color === "Black" ? SabakiSign.White : SabakiSign.Black;
        if (state.alternateBrushColor !== nextColor) {
          dispatch({ type: "TOGGLE_ALTERNATE_COLOR" });
        }
      } else {
        // If no moves or at start, default to black
        if (state.alternateBrushColor !== SabakiSign.Black) {
          dispatch({ type: "TOGGLE_ALTERNATE_COLOR" });
        }
      }
    }, [
      board,
      moveNumber,
      game.moves_transformed,
      dispatch,
      state.alternateBrushColor,
    ]);

    // Update display board and dimmed vertices based on staging
    useEffect(() => {
      const dimmed: Array<Vertex> = [];
      const display: BoardPosition = state.currentBoard.map((row, y) =>
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
    }, [state.currentBoard, state.stagingBoard]);

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

    return (
      <div className="flex flex-row gap-2 ViewerGoban" style={{ maxHeight }}>
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
              <div className="max-w-[60px] mb-1">
                <Input
                  type="number"
                  min={1}
                  max={game.moves_transformed.length}
                  step={1}
                  value={moveNumber + 1}
                  onChange={(e) =>
                    setMoveNumber(
                      clampMoveNumber(
                        parseInt(e.target.value) - 1,
                        game.moves_transformed.length,
                      ),
                    )
                  }
                />
              </div>
              <div className="flex flex-col gap-1 mb-1">
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === 0}
                  onClick={() =>
                    setMoveNumber(
                      clampMoveNumber(0, game.moves_transformed.length),
                    )
                  }
                >
                  <img src={chevronFirstSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === 0}
                  onClick={() =>
                    setMoveNumber(
                      clampMoveNumber(
                        moveNumber - 1,
                        game.moves_transformed.length,
                      ),
                    )
                  }
                >
                  <img src={chevronLeftSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === game.moves_transformed.length - 1}
                  onClick={() =>
                    setMoveNumber(
                      clampMoveNumber(
                        moveNumber + 1,
                        game.moves_transformed.length,
                      ),
                    )
                  }
                >
                  <img src={chevronRightSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === game.moves_transformed.length - 1}
                  onClick={() =>
                    setMoveNumber(
                      clampMoveNumber(
                        game.moves_transformed.length - 1,
                        game.moves_transformed.length,
                      ),
                    )
                  }
                >
                  <img src={chevronLastSvg} width={24} height={24} />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Goban
            animateStonePlacement={false}
            fuzzyStonePlacement={false}
            vertexSize={vertexSize}
            showCoordinates={true}
            signMap={displayBoard}
            markerMap={markerMap}
            dimmedVertices={dimmedVertices}
            onVertexMouseEnter={handleVertexMouseEnter}
            onVertexMouseLeave={handleVertexMouseLeave}
          />
        </div>
      </div>
    );
  },
);

export default ViewerGoban;
