import { useWindowSize } from "@reach/window-size";
import { useCallback, useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { Separator } from "@/ui-primitives/separator";

import EditorGoban, { type EditorGobanRef } from "@/goban/editor-goban";
import GameInfo from "@/games/display/game-info";
import GamesList from "@/games/display/games-list";
import { useTranslations } from "@/locale/use-translations";
import LanguageSelector from "@/locale/language-selector";
import { cn } from "@/utils";
import NextMovesList from "@/next-moves-list";
import ResultsControls from "@/results-controls";
import PlayerFilterInputs, {
  type PlayerColor,
  type PlayerFilterInputsRef,
} from "@/games/filters/player-filter-inputs";
import { BrushMode, SabakiColor, type BoardPosition } from "@/sabaki-types";
import TinyEditorGoban from "@/goban/tiny-editor-goban";
import ViewerGoban, { type GameSelection } from "@/goban/viewer-goban";
import {
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
import { SortBy } from "../../rust/wasm-search/pkg/wasm_search";

export type AppProps = {
  initialBoard: BoardPosition;
  initialPlayerFilters: PlayerFilter[];
  initialGame: GameFromUrl | null;
  initialSortBy: SortBy;
  wasmSearchPostMessage: (message: WasmSearchMessage) => void;
  wasmSearchOnMessage: (callback: (e: MessageEvent) => void) => void;
};

export default function App({
  initialBoard,
  initialPlayerFilters,
  initialGame,
  initialSortBy,
  wasmSearchPostMessage,
  wasmSearchOnMessage,
}: AppProps) {
  const initialMoveNumber = initialGame?.moveNumber ?? 0;
  const [isLoadingGameSelection, setLoadingGameSelection] = useState(
    initialGame != null,
  );
  const [gameNotFound, setGameNotFound] = useState(false);
  const windowSize = useWindowSize();
  const [board, setBoard] = useImmer<BoardPosition>(initialBoard);
  const [games, setGames] = useImmer<Array<Game>>([]);
  const [selectedGame, setSelectedGame] = useImmer<Game | null>(null);
  const [selectedMoveNumber, setSelectedMoveNumber] =
    useState(initialMoveNumber);
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
  const [sortResultsBy, setSortResultsBy] = useState<SortBy>(initialSortBy);
  const { t } = useTranslations();

  const pageSize = 40;

  const vertexSize = Math.max(
    12,
    Math.min(Math.min(windowSize.height * 0.04, windowSize.width * 0.02), 40),
  );
  const tinyVertexSize = Math.min(
    windowSize.height * 0.011,
    windowSize.width * 0.011,
  );

  const editorGobanRef = useRef<EditorGobanRef | null>(null);
  const viewerGobanRef = useRef<{
    prevMove: () => void;
    nextMove: () => void;
  } | null>(null);
  const playerFilterInputsRef = useRef<PlayerFilterInputsRef>(null);

  const timer = useRef<NodeJS.Timeout | undefined>(undefined);
  const prevSelectedGame = useRef<Game | null>(null);
  const prevSelectedMoveNumber = useRef<number>(initialMoveNumber);

  useEffect(() => {
    updateUrlParams(board, playerFilters, sortResultsBy);
  }, [board, playerFilters, sortResultsBy]);

  useEffect(() => {
    if (isLoadingGameSelection) {
      return;
    }

    if (selectedGame) {
      updateUrlWithSelectedGame(
        selectedGame.path,
        selectedGame.rotation ?? 0,
        selectedGame.is_mirrored ?? false,
        selectedGame.is_inverted ?? false,
        selectedGame.last_move_matched,
        selectedMoveNumber,
      );
    } else {
      updateUrlWithSelectedGame("", 0, false, false, 0, 0);
    }

    // Update the previous game selection reference
    prevSelectedGame.current = selectedGame;
    prevSelectedMoveNumber.current = selectedMoveNumber;
  }, [selectedGame, selectedMoveNumber, isLoadingGameSelection]);

  useEffect(() => {
    if (!isClearingBoard) {
      setIsSearching(true);
      setGameNotFound(false);
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
            sortBy: sortResultsBy,
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
    sortResultsBy,
  ]);

  const loadMore = useCallback(() => {
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
          sortBy: sortResultsBy,
        },
      });
    }
  }, [
    isSearching,
    board,
    brushColor,
    currentPage,
    pageSize,
    playerFilters,
    sortResultsBy,
    wasmSearchPostMessage,
  ]);

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
        // Check if payload is empty (game not found)
        if (payload.length === 0) {
          console.warn(t("error.gameNotFound"));
          setGameNotFound(true);
          setLoadingGameSelection(false);
          return;
        }

        try {
          const jsonText = new TextDecoder().decode(payload);
          const game = JSON.parse(jsonText) as Game;

          // Handle both initial game load and back/forward navigation
          const gameFromUrl = getSelectedGameFromUrl();
          const moveNumber = gameFromUrl?.moveNumber ?? game.last_move_matched;

          setSelectedGame(() => game);
          setSelectedMoveNumber(moveNumber);
          setMoveNumbers((draft) => {
            draft[game.path] = moveNumber;
          });
          setLoadingGameSelection(false);
          setGameNotFound(false);
        } catch (error) {
          console.error("Failed to parse game data:", error);
          setGameNotFound(true);
          setLoadingGameSelection(false);
          setSelectedGame(() => null);
          setSelectedMoveNumber(0);
        }
      }
    };

    wasmSearchOnMessage(handleWorkerMessage);
  }, [
    setGames,
    setNextMoves,
    setPlayerCounts,
    wasmSearchOnMessage,
    initialGame,
    setSelectedGame,
    setSelectedMoveNumber,
    setMoveNumbers,
    setLoadingGameSelection,
    t,
  ]);

  useEffect(() => {
    if (selectedGame) {
      setSelectedMoveNumber(
        moveNumbers[selectedGame.path] ?? selectedGame.last_move_matched,
      );
    } else {
      setSelectedMoveNumber(0);
    }
  }, [selectedGame, setSelectedMoveNumber, moveNumbers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedGame === null && editorGobanRef.current) {
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
            setSelectedGame(() => games[0]);
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          // If a game is selected, select the previous one if possible
          if (selectedGame != null && games.length > 0) {
            const idx = games.findIndex(
              // @ts-expect-error ts can't infer the right type for g
              (g: Game) => g.path === selectedGame.path,
            );
            if (idx > 0) {
              setSelectedGame(() => games[idx - 1]);
            }
          }
        }
      } else if (selectedGame == null) {
        // If no game is selected and ArrowDown is pressed, select the first game
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (games.length > 0) {
            setSelectedGame(() => games[0]);
          }
        }
      } else if (selectedGame != null && viewerGobanRef.current) {
        if (e.key === "ArrowLeft") {
          viewerGobanRef.current.prevMove();
        } else if (e.key === "ArrowRight") {
          viewerGobanRef.current.nextMove();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          // Select the next game in the list, if any
          if (selectedGame != null && games.length > 0) {
            const idx = (games as Game[]).findIndex(
              (g) => g.path === selectedGame.path,
            );
            if (idx !== -1 && idx < games.length - 1) {
              setSelectedGame(() => games[idx + 1]);
            }
          }
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          // Select the previous game in the list, if any
          if (selectedGame !== null && games.length > 0) {
            const idx = (games as Game[]).findIndex(
              (g) => g.path === selectedGame.path,
            );
            if (idx > 0) {
              setSelectedGame(() => games[idx - 1]);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedGame,
    selectedMoveNumber,
    games,
    setSelectedGame,
    setSelectedMoveNumber,
  ]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const gameFromUrl = getSelectedGameFromUrl();

      if (gameFromUrl) {
        // A game is selected in the URL
        if (
          !selectedGame ||
          selectedGame.path !== gameFromUrl.path ||
          selectedMoveNumber !== gameFromUrl.moveNumber
        ) {
          // Check if the game is already in the games list
          const existingGame = games.find((g) => g.path === gameFromUrl.path);
          if (existingGame) {
            // Use existing game data
            setSelectedGame(() => existingGame);
            setSelectedMoveNumber(gameFromUrl.moveNumber);
            setMoveNumbers((draft) => {
              draft[existingGame.path] = gameFromUrl.moveNumber;
            });
            setGameNotFound(false);
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
        if (selectedGame) {
          setSelectedGame(() => null);
          setSelectedMoveNumber(0);
        }
        setGameNotFound(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [
    selectedGame,
    selectedMoveNumber,
    games,
    wasmSearchPostMessage,
    setSelectedGame,
    setSelectedMoveNumber,
    setMoveNumbers,
  ]);

  const handleSetMoveNumber = useCallback(
    (game: Game, moveNumber: number) => {
      setSelectedGame(() => game);
      setSelectedMoveNumber(moveNumber);
      setMoveNumbers((draft) => {
        draft[game.path] = moveNumber;
      });
      setGameNotFound(false);
    },
    [setSelectedGame, setSelectedMoveNumber, setMoveNumbers],
  );

  const handleSetGameSelection = useCallback(
    (newGameSelection: GameSelection) => {
      if (newGameSelection) {
        setSelectedGame(() => newGameSelection.game);
        setSelectedMoveNumber(newGameSelection.moveNumber);
        setMoveNumbers((draft) => {
          draft[newGameSelection.game.path] = newGameSelection.moveNumber;
        });
        setGameNotFound(false);
      } else {
        setSelectedGame(() => null);
      }
    },
    [setSelectedGame, setSelectedMoveNumber, setMoveNumbers],
  );

  const handleMoveHover = useCallback(
    (point: { x: number; y: number }) => {
      setPreviewStone(() => point);
    },
    [setPreviewStone],
  );

  const handleMoveUnhover = useCallback(() => {
    setPreviewStone(() => null);
  }, [setPreviewStone]);

  const handleMoveClick = useCallback(
    (point: { x: number; y: number }) => {
      setPreviewStone(() => null);
      if (editorGobanRef.current) {
        editorGobanRef.current.commitMove(point);
      }
    },
    [setPreviewStone],
  );

  const handleCommitMove = useCallback(
    (_point: { x: number; y: number }) => {
      setPreviewStone(() => null);
    },
    [setPreviewStone],
  );

  const handleClearBoard = useCallback(() => {
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
  }, [setNextMoves, setPreviewStone, setGames]);

  const handlePlayerClick = useCallback(
    (playerId: number, color: PlayerColor) => {
      playerFilterInputsRef.current?.addPlayer(playerId, color);
    },
    [],
  );

  const handleUpdateBoard = useCallback(
    (board: BoardPosition) => setBoard(() => board),
    [setBoard],
  );

  const handleClearGameSelection = useCallback(() => {
    setSelectedGame(() => null);
  }, [setSelectedGame]);

  const handlePlayerFiltersSelect = useCallback(
    (filters: PlayerFilter[]) => setPlayerFilters(() => filters),
    [setPlayerFilters],
  );

  const handleToggleShowResults = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setShowResults((showResults) => !showResults);
    },
    [setShowResults],
  );

  const handleSelectGame = useCallback(
    (game: Game | null) => {
      if (game) {
        setSelectedGame(() => game);
        setGameNotFound(false);
      }
    },
    [setSelectedGame, setGameNotFound],
  );

  const handleSelectGameAtMove = useCallback(
    (game: Game, moveNumber: number) => {
      handleSetMoveNumber(game, moveNumber);
      setGameNotFound(false);
    },
    [handleSetMoveNumber],
  );

  return (
    <div className="flex flex-gap-100 relative w-full max-w-full">
      {/* Floating language selector */}
      <div className="sticky top-0 h-screen pt-3 flex-shrink-0">
        <div className="goban-transition-container">
          <div
            className={`goban-editor-wrapper ${
              selectedGame ? "goban-editor-hidden" : "goban-editor-visible"
            }`}
          >
            <EditorGoban
              ref={editorGobanRef}
              onUpdateBoard={handleUpdateBoard}
              onChangeBrushColor={setBrushColor}
              onChangeBrushMode={setBrushMode}
              brushMode={brushMode}
              vertexSize={vertexSize}
              nextMoves={isSearching ? [] : nextMoves.map((move) => move.point)}
              previewStone={previewStone}
              onCommitMove={handleCommitMove}
              initialBoard={initialBoard}
              isVisible={selectedGame === null}
            />
          </div>
          <div
            className={`goban-viewer-wrapper ${
              selectedGame ? "goban-viewer-visible" : "goban-viewer-hidden"
            }`}
          >
            <ViewerGoban
              ref={viewerGobanRef}
              gameSelection={
                selectedGame
                  ? { game: selectedGame, moveNumber: selectedMoveNumber }
                  : null
              }
              vertexSize={vertexSize}
              setGameSelection={handleSetGameSelection}
            />
            {!isLoadingGameSelection && !gameNotFound && selectedGame && (
              <GameInfo
                game={selectedGame}
                onSelectAtMove={handleSetMoveNumber}
                showAllResults={showResults}
                vertexSize={vertexSize}
                onPlayerClick={handlePlayerClick}
              />
            )}
            {!isLoadingGameSelection && gameNotFound && (
              <div className="p-4 text-red-500 ml-20 text-lg">
                Game not found: The requested game could not be loaded.
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col ml-4 flex-1 min-w-0">
        <div className="sticky top-0 bg-white z-10 pt-4 mr-2">
          <div className="absolute top-4 right-4 z-50">
            <LanguageSelector />
          </div>
          <div className="flex justify-between">
            <div className="h-[252px] w-[334px]">
              {selectedGame != null ? (
                <div className="flex items-center h-full">
                  <div
                    className={cn(
                      selectedGame != null
                        ? "tiny-goban-visible"
                        : "next-moves-visible",
                    )}
                    onClick={handleClearGameSelection}
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
            </div>
            <PlayerFilterInputs
              ref={playerFilterInputsRef}
              onPlayerSelect={handlePlayerFiltersSelect}
              playerCounts={playerCounts}
              isLoading={isSearching}
              initialPlayerFilters={initialPlayerFilters}
            />
          </div>
          <ResultsControls
            sortResultsBy={sortResultsBy}
            onSortByChange={setSortResultsBy}
            showResults={showResults}
            onToggleShowResults={handleToggleShowResults}
            totalNumberOfGames={totalNumberOfGames}
          />
          <Separator className="mt-2" />
        </div>

        <GamesList
          games={games}
          onSelectGame={handleSelectGame}
          onSelectGameAtMove={handleSelectGameAtMove}
          selectedGame={selectedGame}
          isSearching={isSearching}
          onLoadMore={loadMore}
          hasMore={hasMore}
          showAllResults={showResults}
          moveNumbers={moveNumbers}
          onPlayerClick={handlePlayerClick}
          tinyVertexSize={tinyVertexSize}
        />
      </div>
    </div>
  );
}
