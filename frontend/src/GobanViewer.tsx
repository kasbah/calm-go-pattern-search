import { Goban } from "@calm-go/shudan";
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
import chevronFirstSvg from "./icons/chevron-first.svg";
import chevronLastSvg from "./icons/chevron-last.svg";
import chevronLeftSvg from "./icons/chevron-left.svg";
import chevronRightSvg from "./icons/chevron-right.svg";
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
  for (let i = 0; i <= moveNumber; i++) {
    const move = moves[i];
    sgb = sgb.makeMove(move.color, [move.point.x, move.point.y]);
  }
  return sgb.signMap;
}

export type GobanViewerProps = {
  game: Game;
  vertexSize: number;
};

export type GobanViewerRef = {
  handlePrevMove: () => void;
  handleNextMove: () => void;
};

const GobanViewer = forwardRef<GobanViewerRef, GobanViewerProps>(
  ({ game, vertexSize }, ref) => {
    const [moveNumber, setMoveNumberState] = useState(game.last_move_matched);
    const maxHeight = Math.min(window.innerHeight, window.innerWidth * 0.5);
    const [moves, setMoves] = useState<Array<SabakiMove>>(
      game.moves_transformed.map(toSabakiMove),
    );
    const [board, setBoard] = useState<BoardPosition>(
      calculateBoardPosition(moves, moveNumber),
    );

    const setMoveNumber = useCallback(
      (moveNumber: number) => {
        if (moveNumber < 0) {
          moveNumber = 0;
        } else if (moveNumber >= game.moves_transformed.length) {
          moveNumber = game.moves_transformed.length - 1;
        }
        setMoveNumberState(moveNumber);
      },
      [setMoveNumberState, game.moves_transformed.length],
    );

    const handlePrevMove = useCallback(() => {
      setMoveNumber(moveNumber - 1);
    }, [moveNumber, setMoveNumber]);

    const handleNextMove = useCallback(() => {
      setMoveNumber(moveNumber + 1);
    }, [moveNumber, setMoveNumber]);

    useImperativeHandle(
      ref,
      () => ({
        handlePrevMove,
        handleNextMove,
      }),
      [handlePrevMove, handleNextMove],
    );

    useEffect(() => {
      setMoveNumber(game.last_move_matched);
      setMoves(game.moves_transformed.map(toSabakiMove));
    }, [game, setMoveNumber, setMoves]);

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
                  onChange={(e) => setMoveNumber(parseInt(e.target.value) - 1)}
                />
              </div>
              <div className="flex flex-col gap-1 mb-1">
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === 0}
                  onClick={() => setMoveNumber(0)}
                >
                  <img src={chevronFirstSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === 0}
                  onClick={() => setMoveNumber(moveNumber - 1)}
                >
                  <img src={chevronLeftSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === game.moves_transformed.length - 1}
                  onClick={() => setMoveNumber(moveNumber + 1)}
                >
                  <img src={chevronRightSvg} width={24} height={24} />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  disabled={moveNumber === 999}
                  onClick={() => setMoveNumber(999)}
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
          />
        </div>
      </div>
    );
  },
);

export default GobanViewer;
