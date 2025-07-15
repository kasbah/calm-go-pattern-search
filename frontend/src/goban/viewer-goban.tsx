import { Goban, type Map, type Marker } from "./shudan";

import { forwardRef, useCallback, useEffect, useImperativeHandle } from "react";
import { useImmer } from "use-immer";

import { Button } from "@/ui-primitives/button";
import { Input } from "@/ui-primitives/input";
import { emptyBoard, type BoardPosition } from "@/sabaki-types";
import { toSabakiMove, type Game } from "@/wasm-search-types";
import { calculateBoardPosition } from "./calculate-board";

export type GameSelection = {
  game: Game;
  moveNumber: number;
} | null;

import "./goban-common.css";
import "./viewer-goban.css";

import chevronFirstSvg from "@/assets/icons/chevron-first.svg";
import chevronLastSvg from "@/assets/icons/chevron-last.svg";
import chevronLeftSvg from "@/assets/icons/chevron-left.svg";
import chevronRightSvg from "@/assets/icons/chevron-right.svg";

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

export type ViewerGobanProps = {
  gameSelection: GameSelection;
  vertexSize: number;
  setGameSelection: (gameSelection: GameSelection) => void;
};

const ViewerGoban = forwardRef<ViewerGobanRef, ViewerGobanProps>(
  ({ gameSelection, vertexSize, setGameSelection }, ref) => {
    const [currentBoard, setCurrentBoard] = useImmer<BoardPosition>(emptyBoard);
    const [markerMap, setMarkerMap] = useImmer<Map<Marker | null>>(
      emptyBoard.map((row) => row.map(() => null)),
    );
    const maxHeight = Math.min(window.innerHeight, window.innerWidth * 0.5);

    useEffect(() => {
      setMarkerMap((draft) => {
        // Clear all markers first
        draft.forEach((row, y) => {
          row.forEach((_, x) => {
            draft[y][x] = null;
          });
        });

        if (gameSelection) {
          const lastMove =
            gameSelection.game.moves_transformed[gameSelection.moveNumber];
          if (lastMove !== undefined) {
            draft[lastMove.point.y][lastMove.point.x] = {
              type: "circle",
            };
          }
        }
      });
    }, [gameSelection, setMarkerMap]);

    // Clear markers when the game is about to be hidden (gameSelection becomes null or empty)
    useEffect(() => {
      if (!gameSelection || !gameSelection.game.path) {
        setMarkerMap((draft) => {
          draft.forEach((row, y) => {
            row.forEach((_, x) => {
              draft[y][x] = null;
            });
          });
        });
      }
    }, [gameSelection, setMarkerMap]);

    const prevMove = useCallback(() => {
      if (gameSelection) {
        const newMoveNumber = clampMoveNumber(
          gameSelection.moveNumber - 1,
          gameSelection.game.moves_transformed.length,
        );
        setGameSelection({
          game: gameSelection.game,
          moveNumber: newMoveNumber,
        });
      }
    }, [gameSelection, setGameSelection]);

    const nextMove = useCallback(() => {
      if (gameSelection) {
        const newMoveNumber = clampMoveNumber(
          gameSelection.moveNumber + 1,
          gameSelection.game.moves_transformed.length,
        );
        setGameSelection({
          game: gameSelection.game,
          moveNumber: newMoveNumber,
        });
      }
    }, [gameSelection, setGameSelection]);

    useImperativeHandle(
      ref,
      () => ({
        prevMove,
        nextMove,
      }),
      [prevMove, nextMove],
    );

    useEffect(() => {
      const moves =
        gameSelection?.game.moves_transformed.map(toSabakiMove) || [];
      const newBoard = calculateBoardPosition(
        moves,
        gameSelection?.moveNumber ?? -1,
      );
      setCurrentBoard(() => newBoard);
    }, [gameSelection, setCurrentBoard]);

    return (
      <div className="flex flex-row gap-2 ViewerGoban" style={{ maxHeight }}>
        <div className="ml-2 mb-2 mt-2">
          <div className="flex flex-col justify-between h-full">
            <div></div>
            <div>
              <div className="max-w-[60px] mb-1">
                <Input
                  type="number"
                  min={1}
                  max={gameSelection?.game.moves_transformed.length || 0}
                  step={1}
                  value={(gameSelection?.moveNumber ?? -1) + 1}
                  onChange={(e) => {
                    if (gameSelection) {
                      const newMoveNumber = clampMoveNumber(
                        parseInt(e.target.value) - 1,
                        gameSelection.game.moves_transformed.length,
                      );
                      setGameSelection({
                        game: gameSelection.game,
                        moveNumber: newMoveNumber,
                      });
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1 mb-1">
                <Button
                  size="xl"
                  variant="outline"
                  disabled={!gameSelection || gameSelection.moveNumber === 0}
                  onClick={() => {
                    if (gameSelection) {
                      const newMoveNumber = clampMoveNumber(
                        0,
                        gameSelection.game.moves_transformed.length,
                      );
                      setGameSelection({
                        game: gameSelection.game,
                        moveNumber: newMoveNumber,
                      });
                    }
                  }}
                  title="Go to first move"
                >
                  <img src={chevronFirstSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={!gameSelection || gameSelection.moveNumber === 0}
                  onClick={() => {
                    if (gameSelection) {
                      const newMoveNumber = clampMoveNumber(
                        gameSelection.moveNumber - 1,
                        gameSelection.game.moves_transformed.length,
                      );
                      setGameSelection({
                        game: gameSelection.game,
                        moveNumber: newMoveNumber,
                      });
                    }
                  }}
                  title="Go to previous move"
                >
                  <img src={chevronLeftSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={
                    !gameSelection ||
                    gameSelection.moveNumber ===
                      gameSelection.game.moves_transformed.length - 1
                  }
                  onClick={() => {
                    if (gameSelection) {
                      const newMoveNumber = clampMoveNumber(
                        gameSelection.moveNumber + 1,
                        gameSelection.game.moves_transformed.length,
                      );
                      setGameSelection({
                        game: gameSelection.game,
                        moveNumber: newMoveNumber,
                      });
                    }
                  }}
                  title="Go to next move"
                >
                  <img src={chevronRightSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={
                    !gameSelection ||
                    gameSelection.moveNumber ===
                      gameSelection.game.moves_transformed.length - 1
                  }
                  onClick={() => {
                    if (gameSelection) {
                      const newMoveNumber = clampMoveNumber(
                        gameSelection.game.moves_transformed.length - 1,
                        gameSelection.game.moves_transformed.length,
                      );
                      setGameSelection({
                        game: gameSelection.game,
                        moveNumber: newMoveNumber,
                      });
                    }
                  }}
                  title="Go to last move"
                >
                  <img src={chevronLastSvg} width={24} height={24} />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Goban
            vertexSize={vertexSize}
            showCoordinates={true}
            signMap={currentBoard}
            markerMap={markerMap}
          />
        </div>
      </div>
    );
  },
);

export default ViewerGoban;
