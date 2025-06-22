import { useState, useEffect, useRef, useCallback } from "react";
import type {
  Game,
  SgfDate,
  GameResult,
  Rank,
  Rules,
  Player,
} from "./wasm-search-types";
import catRunning from "@/assets/cat_running.webp";
import playerNames from "../../rust/pack-games/python-player-name-aliases/player_names.json";
import TinyGobanViewer from "./TinyGobanViewer";

// Import types from playerSearch.ts to avoid duplication
import type { PlayerAlias, PlayerAliasLanguage } from "./playerSearch";

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

function formatDate(date: SgfDate | null): string {
  if (!date) return "N/A";
  if (date.YearMonthDay) {
    const [year, month, day] = date.YearMonthDay;
    return `${year}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`;
  }
  if (date.YearMonth) {
    const [year, month] = date.YearMonth;
    return `${year}-${month.toString().padStart(2, "0")}`;
  }
  if (date.Year) {
    return date.Year.toString();
  }
  if (date.Custom) {
    return date.Custom;
  }
  return "N/A";
}

function formatResult(result: GameResult | null): string {
  if (!result) return "N/A";
  if (result.Player) {
    const [color, score] = result.Player;
    const colorStr = color === "Black" ? "B" : "W";
    if (!score) return `${colorStr}+R`;
    if (score.Resignation) return `${colorStr}+R`;
    if (score.Timeout) return `${colorStr}+T`;
    if (score.Forfeit) return `${colorStr}+F`;
    if (score.Points) return `${colorStr}+${score.Points.toFixed(1)}`;
    return `${colorStr}+R`;
  }
  if (result.Draw) return "Draw";
  if (result.Void) return "Void";
  if (result.Unknown) return result.Unknown;
  return "N/A";
}

function formatRank(rank: Rank | null): string {
  if (!rank) return "N/A";
  if (rank.Kyu) return `${rank.Kyu}k`;
  if (rank.Dan) return `${rank.Dan}d`;
  if (rank.Pro) return `${rank.Pro}p`;
  if (rank.Custom) return rank.Custom;
  return "N/A";
}

function formatRules(rules: Rules | null): string {
  if (!rules) return "N/A";
  if (rules.Chinese) return "Chinese";
  if (rules.Japanese) return "Japanese";
  if (rules.Korean) return "Korean";
  if (rules.Ing) return "Ing";
  if (rules.Custom) return rules.Custom;
  return "N/A";
}

function getPlayerName(player: Player): string {
  if (player.Id) {
    const playerEntry = Object.entries(playerNames).find(
      ([_, data]) => data.id === player.Id![0],
    );
    if (!playerEntry) return `Player ${player.Id![0]}`;

    const [name, data] = playerEntry;
    const preferredName = data.aliases.find((alias: PlayerAlias) =>
      alias.languages.some(
        (lang: PlayerAliasLanguage) => lang.language === "en" && lang.preferred,
      ),
    );

    return preferredName ? preferredName.name : name;
  }
  return player.Unknown || "Unknown";
}

export type GamesListProps = {
  games: Array<Game>;
  onSelectGame: (game: Game | null) => void;
  selectedGame: Game | null;
  isSearching: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  showResults: boolean;
};

type GameItemProps = {
  game: Game;
  index: number;
  isSelected: boolean;
  onSelect: (game: Game) => void;
  showResults: boolean;
};

function GameItem({
  game,
  index,
  isSelected,
  onSelect,
  showResults,
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
        rootMargin: "100px", // Load slightly before coming into view
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

  return (
    <div ref={itemRef} className="mb-2 mt-5 pr-4 pl-4">
      <div
        data-selected={isSelected}
        className="bg-white hover:bg-gray-50 data-[selected=true]:bg-secondary cursor-default rounded-md border p-2"
        onClick={() => onSelect(game)}
      >
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {isVisible ? (
              <TinyGobanViewer game={game} vertexSize={12} />
            ) : (
              <div
                style={{
                  width: 12 * 19 + 8,
                  height: 12 * 19 + 8,
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
          <div className="flex-1">
            <div className="text-sm p-2">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-medium">
                  {getPlayerName(game.player_black)}{" "}
                  {formatRank(game.rank_black)} (B) vs{" "}
                  {getPlayerName(game.player_white)}{" "}
                  {formatRank(game.rank_white)} (W)
                </h2>
                <div className="text-gray-500">{index + 1}</div>
              </div>

              {showResults && (
                <div className="text-lg font-medium mb-2">
                  Result: {formatResult(game.result)}
                </div>
              )}
            </div>

            {/* Game Metadata */}
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-2">
                <h3 className="font-medium text-lg">{game.event || "N/A"}</h3>
                <h3 className="font-medium text-lg">{formatDate(game.date)}</h3>
                <div>Round: {game.round || "N/A"}</div>
                <div>Location: {game.location || "N/A"}</div>
                <div>Rules: {formatRules(game.rules)}</div>
                <div>Komi: {game.komi?.toFixed(1) || "N/A"}</div>
              </div>
            </div>

            {/* Match Information */}
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-2">
                <div>Matched Within Move: {game.last_move_matched + 1}</div>
                <div>Rotation: {rotationToString(game.rotation)}</div>
                <div>Mirrored: {game.is_mirrored ? "Yes" : "No"}</div>
                <div>Colors Inverted: {game.is_inverted ? "Yes" : "No"}</div>
                <div>Correct Area Size: {game.all_empty_correctly_within}</div>
                <div>Total Moves: {game.moves.length}</div>
              </div>
            </div>
            <div className="text-sm text-gray-500">{game.path}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GamesList({
  games,
  onSelectGame,
  selectedGame,
  isSearching,
  onLoadMore,
  hasMore,
  showResults,
}: GamesListProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayStartTime, setOverlayStartTime] = useState<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const previousSelectedGamePath = useRef<string | null>(null);

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
        rootMargin: "0px",
        threshold: 0.1,
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

  const handleSelectGame = useCallback(
    (game: Game) => {
      onSelectGame(game);
    },
    [onSelectGame],
  );

  return (
    <div className="flex flex-col w-full">
      <div className="space-y-0 pr-2 relative">
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
                game={game}
                index={index}
                isSelected={selectedGame?.path === game.path}
                onSelect={handleSelectGame}
                showResults={showResults}
              />
            </div>
          </div>
        ))}

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
