import { useState, useEffect, useRef } from "react";
import arrowLeftSvg from "@/assets/icons/arrow-left.svg";
import type { Game } from "./wasm-search-types";
import catRunning from "@/assets/cat_running.webp";

function rotationToString(rotation: number) {
  if (rotation === 0) {
    return "None";
  } else if (rotation === 1) {
    return "90°";
  } else if (rotation === 2) {
    return "180°";
  } else {
    return "-90°";
  }
}

export type GamesListProps = {
  games: Array<Game>;
  totalNumberOfGames: number;
  onSelectGame: (game: Game | null) => void;
  selectedGame: Game | null;
  isSearching: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
};

export default function GamesList({
  games,
  totalNumberOfGames,
  onSelectGame,
  selectedGame,
  isSearching,
  onLoadMore,
  hasMore,
}: GamesListProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStartTime, setOverlayStartTime] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let showTimer: NodeJS.Timeout;
    let hideTimer: NodeJS.Timeout;

    if (isSearching) {
      showTimer = setTimeout(() => {
        setShowOverlay(true);
        setOverlayStartTime(Date.now());
      }, 1000);
    } else if (showOverlay && overlayStartTime) {
      const elapsed = Date.now() - overlayStartTime;
      const remainingTime = Math.max(0, 1000 - elapsed);

      hideTimer = setTimeout(() => {
        setShowOverlay(false);
        setOverlayStartTime(null);
      }, remainingTime);
    } else {
      setShowOverlay(false);
      setOverlayStartTime(null);
    }

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [isSearching, showOverlay, overlayStartTime]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isSearching) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [hasMore, isSearching, onLoadMore]);

  return (
    <div className="flex flex-col h-screen ml-4 w-full">
      <div
        className="flex mb-4 flex-shrink-0"
        style={{ cursor: selectedGame != null ? "pointer" : "default" }}
        onClick={() => onSelectGame(null)}
      >
        {selectedGame != null && (
          <div>
            <img src={arrowLeftSvg} />
          </div>
        )}
        {totalNumberOfGames} games
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 relative">
        {games.map((game) => (
          <div
            key={game.path}
            data-selected={selectedGame?.path === game.path}
            className="bg-white hover:bg-secondary data-[selected=true]:bg-highlight cursor-default rounded-md border"
            onClick={() => onSelectGame(game)}
          >
            <div className="text-sm p-2">
              <h2 className="text-xl font-medium mb-2">{game.path}</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>Score: {game.score}</div>
                <div>Matched Within Move: {game.last_move_matched + 1}</div>
                <div>Rotation: {rotationToString(game.rotation)}</div>
                <div>Mirrored: {game.is_mirrored ? "Yes" : "No"}</div>
                <div>Colors Inverted: {game.is_inverted ? "Yes" : "No"}</div>
                <div>Correct Area Size: {game.all_empty_correctly_within}</div>
                <div>Moves: {game.moves.length}</div>
              </div>
            </div>
          </div>
        ))}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="h-4" />

        {/* Search overlay */}
        {showOverlay && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
          >
            <img
              src={catRunning}
              alt="Loading..."
              className="w-64 h-64 object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
