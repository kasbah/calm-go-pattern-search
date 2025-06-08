import { useEffect, useState, useRef } from "react";
import { useWindowSize } from "@reach/window-size";
import GobanEditor from "./GobanEditor";

import GamesList from "./GamesList";
import { emptyBoard, SabakiColor, type BoardPosition } from "./sabaki-types";
import { toWasmSearch, type Game } from "./wasm-search-types";
import GobanViewer from "./GobanViewer";

export default function App() {
  const windowSize = useWindowSize();
  const vertexSize = windowSize.width * 0.02;
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);
  const [games, setGames] = useState<Array<Game>>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [totalNumberOfGames, setTotalNumberOfGames] = useState(0);
  const [nextMoves, setNextMoves] = useState<Array<{ x: number; y: number }>>(
    [],
  );
  const [isSearching, setIsSearching] = useState(false);
  const [brushColor, setBrushColor] = useState<SabakiColor>(SabakiColor.Black);
  const gobanEditorRef = useRef<{
    handleUndo: () => void;
    handleRedo: () => void;
  } | null>(null);
  const gobanViewerRef = useRef<{
    handlePrevMove: () => void;
    handleNextMove: () => void;
  } | null>(null);

  useEffect(() => {
    if (window.wasmSearchWorker !== undefined) {
      const position = toWasmSearch(board);
      const nextColor = brushColor === SabakiColor.Black ? 0 : 1;
      const positionBuf = new TextEncoder().encode(JSON.stringify(position));
      window.wasmSearchWorker.postMessage(
        { type: "search", payload: { positionBuf, nextColor } },
        [positionBuf.buffer],
      );
      setIsSearching(true);
    }
  }, [board, brushColor]);

  useEffect(() => {
    window.wasmSearchWorker.onmessage = (e) => {
      const { type, payload } = e.data;

      if (type === "result") {
        setIsSearching(false);
        const jsonText = new TextDecoder().decode(payload);
        const { num_results, results, next_moves } = JSON.parse(jsonText);
        setGames(results);
        setTotalNumberOfGames(num_results);
        setNextMoves(next_moves);
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
    <div className="flex flex-gap-100 h-screen">
      <div style={{ display: selectedGame != null ? "none" : "block" }}>
        <GobanEditor
          ref={gobanEditorRef}
          onUpdateBoard={setBoard}
          onChangeBrushColor={setBrushColor}
          vertexSize={vertexSize}
          nextMoves={isSearching ? [] : nextMoves}
        />
      </div>
      {selectedGame != null && (
        <div style={{ display: "block" }}>
          <GobanViewer
            ref={gobanViewerRef}
            game={selectedGame}
            vertexSize={vertexSize}
          />
        </div>
      )}
      <GamesList
        games={games}
        totalNumberOfGames={totalNumberOfGames}
        onSelectGame={setSelectedGame}
        selectedGame={selectedGame}
      />
    </div>
  );
}
