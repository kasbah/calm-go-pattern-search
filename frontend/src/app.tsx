import { useWindowSize } from "@reach/window-size";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { Label } from "@/ui-primitives/label";
import { Separator } from "@/ui-primitives/separator";
import { Toggle } from "@/ui-primitives/toggle";
import EditorGoban, { type EditorGobanRef } from "@/goban/editor-goban";
import GameInfo from "@/games/display/game-info";
import GamesList from "@/games/display/games-list";
import { cn } from "@/utils";
import NextMovesList from "@/next-moves-list";
import PlayerFilterInputs, {
  type PlayerColor,
  type PlayerFilterInputsRef,
} from "@/games/filters/player-filter-inputs";
import { BrushMode, SabakiColor, type BoardPosition } from "@/sabaki-types";
import TinyEditorGoban from "@/goban/tiny-editor-goban";
import ViewerGoban, { type GameSelection } from "@/goban/viewer-goban";
import {
  emptyGame,
  toWasmSearch,
  type Game,
  type NextMove,
  type PlayerFilter,
  type SearchReturn,
  type WasmSearchMessage,
} from "@/wasm-search-types";
import {
  updateUrlParams,
  updateUrlWithSelectedGame,
  getSelectedGameFromUrl,
  type GameFromUrl,
} from "@/urls";

import trophyCrossedOutSvg from "./assets/icons/trophy-crossed-out.svg";
import trophySvg from "./assets/icons/trophy.svg";

export type AppProps = {
  initialBoard: BoardPosition;
  initialPlayerFilters: PlayerFilter[];
  initialGame: GameFromUrl | null;
  wasmSearchPostMessage: (message: WasmSearchMessage) => void;
  wasmSearchOnMessage: (callback: (e: MessageEvent) => void) => void;
};

export default function App({
  initialBoard,
  initialPlayerFilters,
  initialGame,
  wasmSearchPostMessage,
  wasmSearchOnMessage,
}: AppProps) {
  const initialGameSelection: GameSelection = initialGame
    ? { game: emptyGame, moveNumber: initialGame?.lastMoveMatched ?? 0 }
    : null;
  const [isLoadingGameSelection, setLoadingGameSelection] = useState(
    initialGame != null,
  );
  const windowSize = useWindowSize();
  const vertexSize = Math.min(
    windowSize.height * 0.04,
    windowSize.width * 0.02,
  );
  const [board, setBoard] = useImmer<BoardPosition>(initialBoard);
  const [games, setGames] = useImmer<Array<Game>>([]);
  const [gameSelection, setGameSelection] =
    useImmer<GameSelection>(initialGameSelection);
  const [totalNumberOfGames, setTotalNumberOfGames] = useState(0);
  const [nextMoves, setNextMoves] = useImmer<Array<NextMove>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isClearingBoard, setIsClearingBoard] = useState(false);
  const [brushColor, setBrushColor] = useState<SabakiColor>(SabakiColor.Black);
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [playerFilters, setPlayerFilters] =
    useImmer<PlayerFilter[]>(initialPlayerFilters);
  const [playerCounts, setPlayerCounts] = useImmer<Record<number, number>>({});
  const [moveNumbers, setMoveNumbers] = useImmer<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [previewStone, setPreviewStone] = useImmer<{
    x: number;
    y: number;
  } | null>(null);
  const pageSize = 40;

  const tinyVertexSize = 12;

  const editorGobanRef = useRef<EditorGobanRef | null>(null);
  const viewerGobanRef = useRef<{
    prevMove: () => void;
    nextMove: () => void;
  } | null>(null);
  const playerFilterInputsRef = useRef<PlayerFilterInputsRef>(null);

  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    updateUrlParams(board, playerFilters);
  }, [board, playerFilters]);

  useEffect(() => {
    if (isLoadingGameSelection) {
      return;
    }
    if (gameSelection) {
      updateUrlWithSelectedGame(
        gameSelection.game.path,
        gameSelection.game.rotation ?? 0,
        gameSelection.game.is_mirrored ?? false,
        gameSelection.game.is_inverted ?? false,
        gameSelection.moveNumber,
      );
    } else {
      updateUrlWithSelectedGame("", 0, false, false, 0);
    }
  }, [gameSelection, isLoadingGameSelection]);

  useEffect(() => {
    if (!isClearingBoard) {
      setIsSearching(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const position = toWasmSearch(board);
        const nextColor = brushColor === SabakiColor.Black ? 0 : 1;
        const positionBuf = new TextEncoder().encode(JSON.stringify(position));
        wasmSearchPostMessage({
          type: "search",
          payload: {
            positionBuf,
            nextColor,
            page: 0,
            pageSize,
            playerFilters,
          },
        });
      }, 500);
    }
  }, [
    board,
    brushColor,
    playerFilters,
    isClearingBoard,
    pageSize,
    wasmSearchPostMessage,
  ]);

  const loadMore = () => {
    if (!isSearching) {
      setIsSearching(true);
      const position = toWasmSearch(board);
      const nextColor = brushColor === SabakiColor.Black ? 0 : 1;
      const positionBuf = new TextEncoder().encode(JSON.stringify(position));
      wasmSearchPostMessage({
        type: "search",
        payload: {
          positionBuf,
          nextColor,
          page: currentPage + 1,
          pageSize,
          playerFilters,
        },
      });
    }
  };

  useEffect(() => {
    if (!initialGame) {
      return;
    }
    wasmSearchPostMessage({
      type: "getSearchResultByPath",
      payload: initialGame,
    });
  }, [initialGame, wasmSearchPostMessage]);

  useEffect(() => {
    const handleWorkerMessage = (e: MessageEvent) => {
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
      if (type === "searchResultByPath") {
        const jsonText = new TextDecoder().decode(payload);
        const game = JSON.parse(jsonText) as Game;

        // Handle both initial game load and back/forward navigation
        const gameFromUrl = getSelectedGameFromUrl();
        const moveNumber =
          gameFromUrl?.lastMoveMatched ?? game.last_move_matched;

        game.last_move_matched = moveNumber;
        setGameSelection(() => ({
          game,
          moveNumber,
        }));
        setMoveNumbers((draft) => {
          draft[game.path] = moveNumber;
        });
        setLoadingGameSelection(false);
      }
    };

    wasmSearchOnMessage(handleWorkerMessage);
  }, [
    setGames,
    setNextMoves,
    setPlayerCounts,
    wasmSearchOnMessage,
    initialGame,
    setGameSelection,
    setMoveNumbers,
    setLoadingGameSelection,
  ]);

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

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const gameFromUrl = getSelectedGameFromUrl();

      if (gameFromUrl) {
        // A game is selected in the URL
        if (
          !gameSelection ||
          gameSelection.game.path !== gameFromUrl.path ||
          gameSelection.moveNumber !== gameFromUrl.lastMoveMatched
        ) {
          // Check if the game is already in the games list
          const existingGame = games.find((g) => g.path === gameFromUrl.path);
          if (existingGame) {
            // Use existing game data
            setGameSelection(() => ({
              game: existingGame,
              moveNumber: gameFromUrl.lastMoveMatched,
            }));
            setMoveNumbers((draft) => {
              draft[existingGame.path] = gameFromUrl.lastMoveMatched;
            });
          } else {
            // Need to load this game from web worker
            wasmSearchPostMessage({
              type: "getSearchResultByPath",
              payload: gameFromUrl,
            });
          }
        }
      } else {
        // No game selected in URL
        if (gameSelection) {
          setGameSelection(() => null);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    gameSelection,
    games,
    wasmSearchPostMessage,
    setGameSelection,
    setMoveNumbers,
  ]);

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

  const handleClearBoard = () => {
    if (editorGobanRef.current) {
      // Set flag to prevent search during clear
      setIsClearingBoard(true);
      editorGobanRef.current.clearBoard();
      // Clear next moves to prevent flash
      setNextMoves([]);
      // Clear preview stone if any
      setPreviewStone(null);
      // Clear games to prevent showing stale results
      setGames([]);
      // Reset flag after a short delay to allow search to proceed
      setTimeout(() => {
        setIsClearingBoard(false);
      }, 100);
    }
  };

  const handlePlayerClick = useCallback(
    (playerId: number, color: PlayerColor) => {
      playerFilterInputsRef.current?.addPlayer(playerId, color);
    },
    [],
  );

  return (
    <div className="flex flex-gap-100">
      <div className="sticky top-0 h-screen pt-3">
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
              initialBoard={initialBoard}
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
            {!isLoadingGameSelection && gameSelection && (
              <GameInfo
                game={gameSelection.game}
                onSelectAtMove={handleSetMoveNumber}
                showAllResults={showResults}
                vertexSize={vertexSize}
                onPlayerClick={handlePlayerClick}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col ml-4 w-full">
        <div className="sticky top-0 bg-white z-10 pt-4 mr-2">
          <div className="flex justify-between">
            {gameSelection != null ? (
              <div className="flex items-center">
                <div
                  className={cn(
                    gameSelection != null
                      ? "tiny-goban-visible"
                      : "next-moves-visible",
                  )}
                  onClick={() => setGameSelection(() => null)}
                >
                  <TinyEditorGoban
                    vertexSize={tinyVertexSize}
                    board={board}
                    onClearBoard={handleClearBoard}
                  />
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
              <PlayerFilterInputs
                ref={playerFilterInputsRef}
                onPlayerSelect={setPlayerFilters}
                playerCounts={playerCounts}
                isLoading={isSearching}
                initialPlayerFilters={initialPlayerFilters}
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
          onSelectGame={(game: Game | null) => {
            if (game) {
              setGameSelection(() => ({
                game,
                moveNumber: getCurrentMoveNumber(game),
              }));
            }
          }}
          onSelectGameAtMove={(game: Game, moveNumber: number) => {
            handleSetMoveNumber(game, moveNumber);
          }}
          selectedGame={gameSelection?.game || null}
          isSearching={isSearching}
          onLoadMore={loadMore}
          hasMore={hasMore}
          showAllResults={showResults}
          moveNumbers={moveNumbers}
          onPlayerClick={handlePlayerClick}
        />
      </div>
    </div>
  );
}
