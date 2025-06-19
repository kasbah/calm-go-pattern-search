import { Goban, type Marker, type Map } from "@calm-go/shudan";
import GoBoard from "@sabaki/go-board";
import {
  forwardRef,
  useCallback,
  useEffect,
  useState,
  useImperativeHandle,
} from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import "./GobanCommon.css";
import "./GobanViewer.css";
import chevronFirstSvg from "./assets/icons/chevron-first.svg";
import chevronLastSvg from "./assets/icons/chevron-last.svg";
import chevronLeftSvg from "./assets/icons/chevron-left.svg";
import chevronRightSvg from "./assets/icons/chevron-right.svg";
import {
  emptyBoard,
  type BoardPosition,
  type SabakiMove,
} from "./sabaki-types";
import { toSabakiMove, type Game } from "./wasm-search-types";

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

export type GobanViewerProps = {
  game: Game;
  vertexSize: number;
  moveNumber: number;
  setMoveNumber: (moveNumber: number) => void;
};

export type GobanViewerRef = {
  handlePrevMove: () => void;
  handleNextMove: () => void;
};

const clampMoveNumber = (moveNumber: number, max: number) => {
  if (max === 0) return -1;
  if (moveNumber < 0) return 0;
  if (moveNumber >= max) return max - 1;
  return moveNumber;
};

const GobanViewer = forwardRef<GobanViewerRef, GobanViewerProps>(
  ({ game, vertexSize, moveNumber, setMoveNumber }, ref) => {
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

    const handlePrevMove = useCallback(() => {
      setMoveNumber(
        clampMoveNumber(moveNumber - 1, game.moves_transformed.length),
      );
    }, [moveNumber, setMoveNumber, game.moves_transformed.length]);

    const handleNextMove = useCallback(() => {
      setMoveNumber(
        clampMoveNumber(moveNumber + 1, game.moves_transformed.length),
      );
    }, [moveNumber, setMoveNumber, game.moves_transformed.length]);

    useImperativeHandle(
      ref,
      () => ({
        handlePrevMove,
        handleNextMove,
      }),
      [handlePrevMove, handleNextMove],
    );

    useEffect(() => {
      setMoves(game.moves_transformed.map(toSabakiMove));
    }, [game, setMoves]);

    useEffect(() => {
      setBoard(calculateBoardPosition(moves, moveNumber));
    }, [moves, moveNumber]);

    return (
      <div className="flex flex-row gap-2 GobanViewer" style={{ maxHeight }}>
        <div className="ml-2 mb-2 mt-2">
          <div className="flex flex-col justify-between h-full">
            <div className="flex flex-col gap-1"></div>
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
            signMap={board}
            markerMap={markerMap}
          />
        </div>
      </div>
    );
  },
);

export default GobanViewer;
