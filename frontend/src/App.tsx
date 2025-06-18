import { useWindowSize } from "@reach/window-size";
import { useEffect, useRef, useState } from "react";
import GamesList from "./GamesList";
import GobanEditor from "./GobanEditor";
import GobanViewer from "./GobanViewer";
import PlayerSearch from "./PlayerSearch";
import TinyGoban from "./TinyGoban";
import { emptyBoard, SabakiColor, type BoardPosition } from "./sabaki-types";
import {
  toWasmSearch,
  type Game,
  type SearchReturn,
} from "./wasm-search-types";

export default function App() {
  const windowSize = useWindowSize();
  const vertexSize = windowSize.width * 0.02;
  const tinyVertexSize = windowSize.width * 0.007;
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);
  const [games, setGames] = useState<Array<Game>>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [totalNumberOfGames, setTotalNumberOfGames] = useState(0);
  const [nextMoves, setNextMoves] = useState<Array<{ x: number; y: number }>>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [brushColor, setBrushColor] = useState<SabakiColor>(SabakiColor.Black);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [playerCounts, setPlayerCounts] = useState<Record<number, number>>({});
  const pageSize = 20;

  const gobanEditorRef = useRef<{
    handleUndo: () => void;
    handleRedo: () => void;
  } | null>(null);
  const gobanViewerRef = useRef<{
    handlePrevMove: () => void;
    handleNextMove: () => void;
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
        setGames([]);
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
      if (selectedGame === null && gobanEditorRef.current) {
        if (e.key === "ArrowLeft" || (e.ctrlKey && e.key === "z")) {
          e.preventDefault(); // Prevent browser's default undo
          gobanEditorRef.current.handleUndo();
        } else if (e.key === "ArrowRight" || (e.ctrlKey && e.key === "y")) {
          e.preventDefault(); // Prevent browser's default redo
          gobanEditorRef.current.handleRedo();
        }
      } else if (selectedGame !== null && gobanViewerRef.current) {
        if (e.key === "ArrowLeft") {
          gobanViewerRef.current.handlePrevMove();
        } else if (e.key === "ArrowRight") {
          gobanViewerRef.current.handleNextMove();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedGame]);

  return (
    <div className="flex flex-gap-100">
      <div className="sticky top-0 h-screen">
        <div style={{ display: selectedGame ? "none" : "block" }}>
          <GobanEditor
            ref={gobanEditorRef}
            onUpdateBoard={setBoard}
            onChangeBrushColor={setBrushColor}
            vertexSize={vertexSize}
            nextMoves={isSearching ? [] : nextMoves}
          />
        </div>
        {selectedGame != null && (
          <GobanViewer
            ref={gobanViewerRef}
            game={selectedGame}
            vertexSize={vertexSize}
          />
        )}
      </div>
      <div className="flex flex-col ml-4 w-full">
        <div className="sticky top-0 bg-white z-10 pt-4 pb-4 mr-2">
          <div className="flex flex-row">
            <div
              className="mr-10 w-1/3"
              style={{
                minHeight: tinyVertexSize * 21,
                minWidth: tinyVertexSize * 21,
              }}
            >
              {selectedGame != null && (
                <div onClick={() => setSelectedGame(null)}>
                  <TinyGoban vertexSize={tinyVertexSize} board={board} />
                </div>
              )}
            </div>
            <div className="w-full flex flex-col justify-between">
              <PlayerSearch
                onPlayerSelect={setSelectedPlayerIds}
                playerCounts={playerCounts}
                isLoading={isSearching}
              />
              <div className="flex justify-end">{totalNumberOfGames} games</div>
            </div>
          </div>
        </div>
        <GamesList
          games={games}
          onSelectGame={setSelectedGame}
          selectedGame={selectedGame}
          isSearching={isSearching}
          onLoadMore={loadMore}
          hasMore={hasMore}
        />
      </div>
    </div>
  );
}
