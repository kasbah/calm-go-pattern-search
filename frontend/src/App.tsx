import { useWindowSize } from "@reach/window-size";
import { useEffect, useRef, useState } from "react";

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
import ViewerGoban from "./ViewerGoban";
import {
  toWasmSearch,
  type Game,
  type NextMove,
  type SearchReturn,
} from "./wasm-search-types";

import trophyCrossedOutSvg from "./assets/icons/trophy-crossed-out.svg";
import trophySvg from "./assets/icons/trophy.svg";

const emptyGame: Game = {
  path: "",
  score: 0,
  last_move_matched: -1,
  rotation: 0,
  is_inverted: false,
  is_mirrored: false,
  all_empty_correctly_within: 0,
  moves: [],
  moves_transformed: [],
  event: "",
  round: "",
  location: "",
  date: null,
  player_black: { Unknown: "" },
  player_white: { Unknown: "" },
  rank_black: { Custom: "" },
  rank_white: { Custom: "" },
  komi: null,
  rules: null,
  result: "Void",
};

export default function App() {
  const windowSize = useWindowSize();
  const vertexSize = windowSize.width * 0.02;
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);
  const [games, setGames] = useState<Array<Game>>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [totalNumberOfGames, setTotalNumberOfGames] = useState(0);
  const [nextMoves, setNextMoves] = useState<Array<NextMove>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [brushColor, setBrushColor] = useState<SabakiColor>(SabakiColor.Black);
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<number, number>>({});
  const [moveNumbers, setMoveNumbers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const pageSize = 20;

  const tinyVertexSize = 12;

  const editorGobanRef = useRef<{
    undo: () => void;
    redo: () => void;
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
          setGames(results);
        } else {
          setGames((prev) => [...prev, ...results]);
        }
        setTotalNumberOfGames(num_results);
        setNextMoves(next_moves);
        setCurrentPage(current_page);
        setHasMore(current_page < total_pages - 1);
        setPlayerCounts(player_counts);
      }
    };
  }, []);

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
            setSelectedGame(games[0]);
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
              setSelectedGame(games[idx - 1]);
            }
          }
        }
      } else if (selectedGame == null) {
        // If no game is selected and ArrowDown is pressed, select the first game
        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (games.length > 0) {
            setSelectedGame(games[0]);
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
              setSelectedGame(games[idx + 1]);
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
              setSelectedGame(games[idx - 1]);
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedGame, games]);

  const getCurrentMoveNumber = (game: Game | null) => {
    if (!game) return -1;
    return moveNumbers[game.path] ?? game.last_move_matched;
  };

  const handleSetMoveNumber = (game: Game, moveNumber: number) => {
    setMoveNumbers((prev) => ({ ...prev, [game.path]: moveNumber }));
  };

  return (
    <div className="flex flex-gap-100">
      <div className="sticky top-0 h-screen">
        <div className="goban-transition-container">
          <div
            className={`goban-editor-wrapper ${
              selectedGame ? "goban-editor-hidden" : "goban-editor-visible"
            }`}
          >
            <EditorGoban
              ref={editorGobanRef}
              onUpdateBoard={setBoard}
              onChangeBrushColor={setBrushColor}
              onChangeBrushMode={setBrushMode}
              brushMode={brushMode}
              vertexSize={vertexSize}
              nextMoves={isSearching ? [] : nextMoves.map((move) => move.point)}
            />
          </div>
          <div
            className={`goban-viewer-wrapper ${
              selectedGame ? "goban-viewer-visible" : "goban-viewer-hidden"
            }`}
          >
            <ViewerGoban
              ref={viewerGobanRef}
              game={selectedGame || emptyGame}
              vertexSize={vertexSize}
              moveNumber={getCurrentMoveNumber(selectedGame)}
              setMoveNumber={(moveNumber: number) => {
                if (selectedGame) handleSetMoveNumber(selectedGame, moveNumber);
              }}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col ml-4 w-full">
        <div className="sticky top-0 bg-white z-10 pt-4 mr-2">
          <div className="flex justify-between">
            {selectedGame != null ? (
              <div
                className={cn(
                  selectedGame != null
                    ? "tiny-goban-visible"
                    : "next-moves-visible",
                )}
                style={{
                  height: tinyVertexSize * 21,
                  width: tinyVertexSize * 21,
                }}
              >
                <div
                  onClick={() => setSelectedGame(null)}
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
          onSelectGame={setSelectedGame}
          selectedGame={selectedGame}
          isSearching={isSearching}
          onLoadMore={loadMore}
          hasMore={hasMore}
          showAllResults={showResults}
        />
      </div>
    </div>
  );
}
