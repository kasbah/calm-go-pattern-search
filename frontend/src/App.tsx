import { useWindowSize } from "@reach/window-size";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";

import { Label } from "./components/ui/label";
import { Separator } from "./components/ui/separator";
import { Toggle } from "./components/ui/toggle";
import EditorGoban from "./EditorGoban";
import GamesList from "./GamesList";
import { cn } from "./lib/utils";
import NextMovesList from "./NextMovesList";
import PlayerSearch from "./PlayerSearch";
import {
  BrushMode,
  emptyBoard,
  SabakiColor,
  type BoardPosition,
} from "./sabaki-types";
import TinyEditorGoban from "./TinyEditorGoban";
import ViewerGoban, { type GameSelection } from "./ViewerGoban";
import {
  toWasmSearch,
  type Game,
  type NextMove,
  type SearchReturn,
} from "./wasm-search-types";

import trophyCrossedOutSvg from "./assets/icons/trophy-crossed-out.svg";
import trophySvg from "./assets/icons/trophy.svg";

export default function App() {
  const windowSize = useWindowSize();
  const vertexSize = windowSize.width * 0.02;
  const [board, setBoard] = useImmer<BoardPosition>(emptyBoard);
  const [games, setGames] = useImmer<Array<Game>>([]);
  const [gameSelection, setGameSelection] = useImmer<GameSelection>(null);
  const [totalNumberOfGames, setTotalNumberOfGames] = useState(0);
  const [nextMoves, setNextMoves] = useImmer<Array<NextMove>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [brushColor, setBrushColor] = useState<SabakiColor>(SabakiColor.Black);
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useImmer<number[]>([]);
  const [playerCounts, setPlayerCounts] = useImmer<Record<number, number>>({});
  const [moveNumbers, setMoveNumbers] = useImmer<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [previewStone, setPreviewStone] = useImmer<{
    x: number;
    y: number;
  } | null>(null);
  const pageSize = 20;

  const tinyVertexSize = 12;

  const editorGobanRef = useRef<{
    undo: () => void;
    redo: () => void;
    commitMove: (point: { x: number; y: number }) => void;
  } | null>(null);
  const viewerGobanRef = useRef<{
    prevMove: () => void;
    nextMove: () => void;
  } | null>(null);

  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    if (window.wasmSearchWorker !== undefined) {
      setIsSearching(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const position = toWasmSearch(board);
        const nextColor = brushColor === SabakiColor.Black ? 0 : 1;
        const positionBuf = new TextEncoder().encode(JSON.stringify(position));
        window.wasmSearchWorker.postMessage(
          {
            type: "search",
            payload: {
              positionBuf,
              nextColor,
              page: 0,
              pageSize,
              playerIds: selectedPlayerIds,
            },
          },
          [positionBuf.buffer],
        );
        setCurrentPage(0);
        setHasMore(true);
      }, 0);
    }
  }, [board, brushColor, selectedPlayerIds]);

  const loadMore = () => {
    if (window.wasmSearchWorker !== undefined && !isSearching) {
      setIsSearching(true);
      const position = toWasmSearch(board);
      const nextColor = brushColor === SabakiColor.Black ? 0 : 1;
      const positionBuf = new TextEncoder().encode(JSON.stringify(position));
      window.wasmSearchWorker.postMessage(
        {
          type: "search",
          payload: {
            positionBuf,
            nextColor,
            page: currentPage + 1,
            pageSize,
            playerIds: selectedPlayerIds,
          },
        },
        [positionBuf.buffer],
      );
    }
  };

  useEffect(() => {
    window.wasmSearchWorker.onmessage = (e) => {
      const { type, payload } = e.data;

      if (type === "result") {
        setIsSearching(false);
        const jsonText = new TextDecoder().decode(payload);
        const {
          num_results,
          results,
          next_moves,
          total_pages,
          current_page,
          player_counts,
        } = JSON.parse(jsonText) as SearchReturn;
        if (current_page === 0) {
          setGames(() => results);
        } else {
          setGames((draft) => {
            draft.push(...results);
          });
        }
        setTotalNumberOfGames(num_results);
        setNextMoves(() => next_moves);
        setCurrentPage(current_page);
        setHasMore(current_page < total_pages - 1);
        setPlayerCounts(() => player_counts);
      }
    };
  }, [setGames, setNextMoves, setPlayerCounts]);

  const getCurrentMoveNumber = useCallback(
    (game: Game) => {
      return moveNumbers[game.path] ?? game.last_move_matched;
    },
    [moveNumbers],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameSelection === null && editorGobanRef.current) {
        if (e.key === "ArrowLeft" || (e.ctrlKey && e.key === "z")) {
          e.preventDefault(); // Prevent browser's default undo
          editorGobanRef.current.undo();
        } else if (e.key === "ArrowRight" || (e.ctrlKey && e.key === "y")) {
          e.preventDefault(); // Prevent browser's default redo
          editorGobanRef.current.redo();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          // Select the first game if none is selected, or the next one if possible
          if (games.length > 0) {
            setGameSelection(() => ({
              game: games[0],
              moveNumber: getCurrentMoveNumber(games[0]),
            }));
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          // If a game is selected, select the previous one if possible
          if (gameSelection != null && games.length > 0) {
            const idx = games.findIndex(
              // @ts-expect-error ts can't infer the right type for g
              (g: Game) => g.path === gameSelection.game.path,
            );
            if (idx > 0) {
              setGameSelection(() => ({
                game: games[idx - 1],
                moveNumber: getCurrentMoveNumber(games[idx - 1]),
              }));
            }
          }
        }
      } else if (gameSelection == null) {
        // If no game is selected and ArrowDown is pressed, select the first game
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (games.length > 0) {
            setGameSelection(() => ({
              game: games[0],
              moveNumber: getCurrentMoveNumber(games[0]),
            }));
          }
        }
      } else if (gameSelection != null && viewerGobanRef.current) {
        if (e.key === "ArrowLeft") {
          viewerGobanRef.current.prevMove();
        } else if (e.key === "ArrowRight") {
          viewerGobanRef.current.nextMove();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          // Select the next game in the list, if any
          if (gameSelection != null && games.length > 0) {
            const idx = (games as Game[]).findIndex(
              (g) => g.path === gameSelection.game.path,
            );
            if (idx !== -1 && idx < games.length - 1) {
              setGameSelection(() => ({
                game: games[idx + 1],
                moveNumber: getCurrentMoveNumber(games[idx + 1]),
              }));
            }
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          // Select the previous game in the list, if any
          if (gameSelection !== null && games.length > 0) {
            const idx = (games as Game[]).findIndex(
              (g) => g.path === gameSelection.game.path,
            );
            if (idx > 0) {
              setGameSelection(() => ({
                game: games[idx - 1],
                moveNumber: getCurrentMoveNumber(games[idx - 1]),
              }));
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameSelection, games, getCurrentMoveNumber, setGameSelection]);

  const handleSetMoveNumber = (game: Game, moveNumber: number) => {
    setGameSelection(() => ({ game, moveNumber }));
    setMoveNumbers((draft) => {
      draft[game.path] = moveNumber;
    });
  };

  const handleSetGameSelection = (newGameSelection: GameSelection) => {
    setGameSelection(() => newGameSelection);
    if (newGameSelection) {
      setMoveNumbers((draft) => {
        draft[newGameSelection.game.path] = newGameSelection.moveNumber;
      });
    }
  };

  const handleMoveHover = (point: { x: number; y: number }) => {
    setPreviewStone(() => point);
  };

  const handleMoveUnhover = () => {
    setPreviewStone(() => null);
  };

  const handleMoveClick = (point: { x: number; y: number }) => {
    setPreviewStone(() => null);
    if (editorGobanRef.current) {
      editorGobanRef.current.commitMove(point);
    }
  };

  const handleCommitMove = (_point: { x: number; y: number }) => {
    setPreviewStone(() => null);
  };

  return (
    <div className="flex flex-gap-100">
      <div className="sticky top-0 h-screen">
        <div className="goban-transition-container">
          <div
            className={`goban-editor-wrapper ${
              gameSelection ? "goban-editor-hidden" : "goban-editor-visible"
            }`}
          >
            <EditorGoban
              ref={editorGobanRef}
              onUpdateBoard={(board) => setBoard(() => board)}
              onChangeBrushColor={setBrushColor}
              onChangeBrushMode={setBrushMode}
              brushMode={brushMode}
              vertexSize={vertexSize}
              nextMoves={isSearching ? [] : nextMoves.map((move) => move.point)}
              previewStone={previewStone}
              onCommitMove={handleCommitMove}
            />
          </div>
          <div
            className={`goban-viewer-wrapper ${
              gameSelection ? "goban-viewer-visible" : "goban-viewer-hidden"
            }`}
          >
            <ViewerGoban
              ref={viewerGobanRef}
              gameSelection={gameSelection}
              vertexSize={vertexSize}
              setGameSelection={handleSetGameSelection}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col ml-4 w-full">
        <div className="sticky top-0 bg-white z-10 pt-4 mr-2">
          <div className="flex justify-between">
            {gameSelection != null ? (
              <div
                className={cn(
                  gameSelection != null
                    ? "tiny-goban-visible"
                    : "next-moves-visible",
                )}
                style={{
                  height: tinyVertexSize * 21,
                  width: tinyVertexSize * 21,
                }}
              >
                <div
                  onClick={() => setGameSelection(() => null)}
                  className="tiny-goban-clickable"
                >
                  <TinyEditorGoban vertexSize={tinyVertexSize} board={board} />
                </div>
              </div>
            ) : (
              <NextMovesList
                nextMoves={nextMoves}
                isLoading={isSearching}
                brushColor={brushColor}
                onMoveHover={handleMoveHover}
                onMoveUnhover={handleMoveUnhover}
                onMoveClick={handleMoveClick}
              />
            )}
            <div className="flex flex-col justify-between">
              <PlayerSearch
                onPlayerSelect={setSelectedPlayerIds}
                playerCounts={playerCounts}
                isLoading={isSearching}
              />
              <div className="flex items-center justify-end mt-2 space-x-3">
                <Separator orientation="vertical" />
                <div
                  className="flex items-center cursor-pointer min-w-[160px]"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowResults((showResults) => !showResults);
                  }}
                >
                  <div className="min-w-[120px] flex justify-right">
                    <Label htmlFor="results-toggle" className="cursor-pointer">
                      {showResults ? "Results Shown" : "Results Hidden"}
                    </Label>
                  </div>
                  <Toggle
                    id="results-toggle"
                    size="lg"
                    pressed={!showResults}
                    className="cursor-pointer"
                  >
                    <img
                      src={showResults ? trophySvg : trophyCrossedOutSvg}
                      width={24}
                      height={24}
                      alt="Trophy icon"
                    />
                  </Toggle>
                </div>
                <Separator orientation="vertical" />
                <Label className="min-w-[120px]">
                  {totalNumberOfGames} Games
                </Label>
              </div>
            </div>
          </div>
          <Separator className="mt-2" />
        </div>

        <GamesList
          games={games}
          onSelectGame={(game) =>
            game &&
            setGameSelection(() => ({
              game,
              moveNumber: getCurrentMoveNumber(game),
            }))
          }
          onSelectGameAtMove={(game, moveNumber) => {
            handleSetMoveNumber(game, moveNumber);
          }}
          selectedGame={gameSelection?.game || null}
          isSearching={isSearching}
          onLoadMore={loadMore}
          hasMore={hasMore}
          showAllResults={showResults}
          moveNumbers={moveNumbers}
        />
      </div>
    </div>
  );
}
