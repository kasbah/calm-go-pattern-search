import { useCallback, useEffect, useRef, useState, memo } from "react";
import TinyViewerGoban from "@/goban/tiny-viewer-goban";
import { cn } from "@/utils";
import type { Game } from "@/wasm-search-types";
import {
  PlayerDisplay,
  GameIcons,
  GameInfoPopover,
  MoveInfoCompact,
  GameResult,
  SGFDownload,
  GameEventInfoList,
  GameDateLocationList,
} from "./game-info-components";

import { Separator } from "@/ui-primitives/separator";

export type GamesListProps = {
  games: Array<Game>;
  onSelectGame: (game: Game | null) => void;
  onSelectGameAtMove?: (game: Game, moveNumber: number) => void;
  selectedGame: Game | null;
  isSearching: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  showAllResults: boolean;
  moveNumbers: Record<string, number>;
  onPlayerClick?: (playerId: number, color: "Black" | "White" | "Any") => void;
};

type GameItemProps = {
  game: Game;
  index: number;
  isSelected: boolean;
  onSelect: (game: Game) => void;
  onSelectAtMove?: (game: Game, moveNumber: number) => void;
  showAllResults: boolean;
  moveNumber: number;
  onPlayerClick?: (playerId: number, color: "Black" | "White" | "Any") => void;
};

const GameItem = memo(function GameItem({
  game,
  index,
  isSelected,
  onSelect,
  onSelectAtMove,
  showAllResults,
  moveNumber,
  onPlayerClick,
}: GameItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsVisible(entry.isIntersecting);
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0,
      },
    );

    const currentRef = itemRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  const handleGobanClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(game);
    },
    [onSelect, game],
  );

  return (
    <>
      <div ref={itemRef}>
        <div
          data-selected={isSelected}
          className={cn(
            "bg-white hover:bg-accent/25 data-[selected=true]:bg-secondary p-4 pr-6 flex flex-row gap-3 overflow-hidden",
          )}
        >
          {/* 1st child: tiny viewer goban */}
          <div
            className="flex-shrink-0 cursor-pointer self-start"
            onClick={handleGobanClick}
          >
            {isVisible ? (
              <TinyViewerGoban
                game={game}
                vertexSize={11}
                moveNumber={moveNumber}
              />
            ) : (
              <div
                style={{
                  width: 11 * 19 + 7.5,
                  height: 11 * 19 + 9.75,
                  backgroundColor: "#f3f4f6",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                  fontSize: "12px",
                }}
              />
            )}
          </div>

          {/* 2nd child: player display and moves matched */}
          <div className="flex flex-col justify-between flex-[2] min-w-0">
            <div className="flex flex-col gap-2 text-lg font-medium">
              <PlayerDisplay
                game={game}
                color="Black"
                className="truncate"
                onPlayerClick={onPlayerClick}
              />
              <PlayerDisplay
                game={game}
                color="White"
                className="truncate"
                onPlayerClick={onPlayerClick}
              />
            </div>
            <MoveInfoCompact
              game={game}
              onSelectAtMove={onSelectAtMove}
              className="truncate"
            />
          </div>

          {/* 3rd child: event, round, date, location and result */}
          <div className="flex flex-col gap-2 items-end text-right justify-between ml-auto flex-1 min-w-0 max-w-[200px]">
            <GameEventInfoList game={game} />
            <GameDateLocationList game={game} />
            <GameResult
              game={game}
              showAllResults={showAllResults}
              className="text-base"
            />
          </div>

          {/* 4th child: icons and result number and SGF download button */}
          <div className="flex flex-col justify-between items-end min-w-[100px] flex-shrink-0">
            <div className="flex items-center gap-2">
              <GameIcons game={game} />
              <GameInfoPopover game={game} />
              <div className="text-gray-500">{index + 1}</div>
            </div>
            <div className="flex justify-end">
              <SGFDownload game={game} />
            </div>
          </div>
        </div>
      </div>
      <Separator />
    </>
  );
});

export default function GamesList({
  games,
  onSelectGame,
  onSelectGameAtMove,
  selectedGame,
  isSearching,
  onLoadMore,
  hasMore,
  showAllResults,
  moveNumbers,
  onPlayerClick,
}: GamesListProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStartTime, setOverlayStartTime] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const previousSelectedGamePath = useRef<string | null>(null);
  const previousGamesLength = useRef<number>(0);
  const previousFirstGamePath = useRef<string | null>(null);

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
        rootMargin: "1000px",
        threshold: 0.5,
      },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isSearching, onLoadMore]);

  // Scroll to top when games list changes (new search), but not for infinite scroll
  useEffect(() => {
    const currentFirstGamePath = games.length > 0 ? games[0].path : null;
    const isNewSearch =
      games.length < previousGamesLength.current ||
      (games.length > 0 &&
        currentFirstGamePath !== previousFirstGamePath.current);

    if (isNewSearch && games.length > 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    previousGamesLength.current = games.length;
    previousFirstGamePath.current = currentFirstGamePath;
  }, [games]);

  useEffect(() => {
    if (!selectedGame) {
      previousSelectedGamePath.current = null;
      return;
    }

    // Only scroll if the selected game actually changed
    if (selectedGame.path !== previousSelectedGamePath.current) {
      previousSelectedGamePath.current = selectedGame.path;
      const idx = games.findIndex((g) => g.path === selectedGame.path);
      if (idx !== -1 && itemRefs.current[idx]) {
        itemRefs.current[idx]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [selectedGame, games]);

  return (
    <div className="flex flex-col w-full">
      <div className="relative min-h-[600px]">
        {games.map((game, index) => (
          <div key={game.path}>
            {index === games.length - 5 && (
              <div ref={loadMoreRef} className="h-0" />
            )}
            <div
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
            >
              <GameItem
                key={game.path}
                game={game}
                index={index}
                isSelected={selectedGame?.path === game.path}
                onSelect={onSelectGame}
                onSelectAtMove={onSelectGameAtMove}
                showAllResults={showAllResults}
                moveNumber={moveNumbers[game.path] ?? game.last_move_matched}
                onPlayerClick={onPlayerClick}
              />
            </div>
          </div>
        ))}
        {showOverlay && (
          <div
            className="absolute inset-0 flex items-center justify-center z-[5]"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
          >
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
