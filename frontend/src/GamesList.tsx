import { useCallback, useEffect, useRef, useState } from "react";
import playerNames from "../../rust/pack-games/python-player-name-aliases/player_names.json";
import TinyViewerGoban from "./TinyViewerGoban";
import { cn } from "./lib/utils";
import type { PlayerAlias, PlayerAliasLanguage } from "./playerSearch";
import type {
  Game,
  GameResult,
  Player,
  Rank,
  Rules,
  SgfDate,
} from "./wasm-search-types";

import badgeInfoIcon from "@/assets/icons/badge-info.svg";
import circleBlackIcon from "@/assets/icons/circle-black.svg";
import circleBlackSlashWhiteIcon from "@/assets/icons/circle-black-slash-white.svg";
import circleWhiteIcon from "@/assets/icons/circle-white.svg";
import flipHorizontalIcon from "@/assets/icons/flip-horizontal.svg";
import trophyCrossedOutIcon from "@/assets/icons/trophy-crossed-out.svg";
import { Separator } from "./components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";

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

function formatDate(date: SgfDate | null): string | null {
  if (!date) return null;
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
  return null;
}

function formatResult(result: GameResult | null): string {
  if (!result) return "Unknown";
  if (result === "Draw") return "Draw";
  if (result === "Void") return "Void";
  if (result.Unknown) return result.Unknown;
  if (result.Player) {
    const [color, score] = result.Player;
    const colorStr = color === "Black" ? "B" : "W";
    if (!score) return `${colorStr}+?`;
    if (score === "Resignation") return `${colorStr}+Resign`;
    if (score === "Timeout") return `${colorStr}+Timeout`;
    if (score === "Forfeit") return `${colorStr}+Forfeit`;
    if (score.Points) return `${colorStr}+${score.Points.toFixed(1)}`;
    return `${colorStr}+?`;
  }
  return "Unknown";
}

function formatRank(rank: Rank | null): string {
  if (!rank) return "(?)";
  if (rank.Kyu) return `${rank.Kyu}k`;
  if (rank.Dan) return `${rank.Dan}d`;
  if (rank.Pro) return `${rank.Pro}P`;
  if (rank.Custom) return `(${rank.Custom})`;
  return "(?)";
}

function formatRules(rules: Rules | null): string {
  if (!rules) return "Unknown";
  if (rules.Chinese) return "Chinese";
  if (rules.Japanese) return "Japanese";
  if (rules.Korean) return "Korean";
  if (rules.Ing) return "Ing";
  if (rules.Custom) return rules.Custom;
  return "Unknown";
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
  onSelectGameAtMove?: (game: Game, moveNumber: number) => void;
  selectedGame: Game | null;
  isSearching: boolean;
  onLoadMore: () => void;
  hasMore: boolean;
  showAllResults: boolean;
  moveNumbers: Record<string, number>;
};

type GameItemProps = {
  game: Game;
  index: number;
  isSelected: boolean;
  onSelect: (game: Game) => void;
  onSelectAtMove?: (game: Game, moveNumber: number) => void;
  showAllResults: boolean;
  moveNumbers: Record<string, number>;
};

function GameItem({
  game,
  index,
  isSelected,
  onSelect,
  onSelectAtMove,
  showAllResults,
  moveNumbers,
}: GameItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShowResult, setShouldShowResult] = useState(showAllResults);
  const [isInfoPopoverOpen, setInfoPopOverOpen] = useState(false);
  const [isInfoPinned, setInfoPinned] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setShouldShowResult(showAllResults);
  }, [showAllResults]);

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

  return (
    <>
      <div ref={itemRef}>
        <div
          data-selected={isSelected}
          className={cn(
            "bg-white hover:bg-gray-50 data-[selected=true]:bg-secondary p-4 pr-6",
          )}
        >
          <div className="flex gap-4">
            <div
              className="flex-shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(game);
              }}
            >
              {isVisible ? (
                <TinyViewerGoban
                  game={game}
                  vertexSize={11}
                  moveNumber={moveNumbers[game.path] ?? game.last_move_matched}
                />
              ) : (
                <div
                  style={{
                    width: 11 * 19 + 8,
                    height: 11 * 19 + 8,
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
            <div className="flex-1 flex flex-col justify-between">
              <div className="text-sm">
                <div className="flex justify-between items-start">
                  <table className="text-lg font-medium">
                    <tbody>
                      <tr className="align-top">
                        <td className="pr-12">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={circleBlackIcon}
                                alt="Black"
                                className="w-5 h-5"
                              />
                              {getPlayerName(game.player_black)}{" "}
                              {formatRank(game.rank_black)}
                            </div>
                            <div className="flex items-center gap-2">
                              <img
                                src={circleWhiteIcon}
                                alt="White"
                                className="w-5 h-5"
                              />
                              {getPlayerName(game.player_white)}{" "}
                              {formatRank(game.rank_white)}
                            </div>
                          </div>
                        </td>
                        <td className="pr-8">
                          {game.event && (
                            <div className="flex flex-col">
                              <div className="font-medium flex items-center gap-2">
                                {game.event}
                                <Popover
                                  open={isInfoPopoverOpen}
                                  onOpenChange={(open) => {
                                    if (!isInfoPinned) {
                                      setInfoPopOverOpen(open);
                                    } else if (!open && isInfoPinned) {
                                      // If someone tries to close a pinned popover, unpin it
                                      setInfoPinned(false);
                                      setInfoPopOverOpen(false);
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <img
                                      src={badgeInfoIcon}
                                      alt="Game details"
                                      className={cn(
                                        "w-5 h-5 cursor-pointer hover:text-gray-800",
                                        isInfoPinned
                                          ? "text-blue-600"
                                          : "text-gray-600",
                                      )}
                                      title={
                                        isInfoPinned
                                          ? "Click to unpin"
                                          : "Hover for details, click to pin"
                                      }
                                      onMouseEnter={() => {
                                        if (!isInfoPinned)
                                          setInfoPopOverOpen(true);
                                      }}
                                      onMouseLeave={() => {
                                        if (!isInfoPinned)
                                          setInfoPopOverOpen(false);
                                      }}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const newPinnedState = !isInfoPinned;
                                        setInfoPinned(newPinnedState);
                                        setInfoPopOverOpen(true);
                                      }}
                                    />
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className={cn("w-64 text-sm")}
                                    align="start"
                                    side="top"
                                    onMouseEnter={() => {
                                      if (!isInfoPinned)
                                        setInfoPopOverOpen(true);
                                    }}
                                    onMouseLeave={() => {
                                      if (!isInfoPinned)
                                        setInfoPopOverOpen(false);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="space-y-1">
                                      <div>
                                        <strong>Komi:</strong>{" "}
                                        {game.komi !== null
                                          ? game.komi
                                          : "Unknown"}
                                      </div>
                                      <div>
                                        <strong>Rules:</strong>{" "}
                                        {formatRules(game.rules)}
                                      </div>
                                      <div>
                                        <strong>SGF Source:</strong> {game.path}
                                      </div>
                                      <div>
                                        <strong>Search Score:</strong>{" "}
                                        {game.score}
                                      </div>
                                      <div>
                                        <strong>Empty correctly within:</strong>{" "}
                                        {game.all_empty_correctly_within}
                                      </div>
                                      <div>
                                        <strong>Rotation:</strong>{" "}
                                        {rotationToString(game.rotation)}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              {game.round && (
                                <div className="text-gray-500 text-sm">
                                  Round: {game.round}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="pr-8"></td>
                      </tr>
                      {(game.date || game.location) && (
                        <tr className="align-top">
                          <td className="pr-8"></td>
                          <td className="pr-8">
                            <div className="flex flex-col gap-1">
                              {game.date && (
                                <div className="font-medium">
                                  {formatDate(game.date)}
                                </div>
                              )}
                              {game.location && (
                                <div className="text-gray-500 text-sm">
                                  Location: {game.location}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="pr-8"></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="flex items-center gap-2">
                    {game.is_mirrored && (
                      <img
                        src={flipHorizontalIcon}
                        alt="Mirrored"
                        className="w-5 h-5 text-gray-600"
                        title="The game is mirrored to match the pattern"
                      />
                    )}
                    {game.is_inverted && (
                      <img
                        src={circleBlackSlashWhiteIcon}
                        alt="Colors inverted"
                        className="w-5 h-5 text-gray-600"
                        title="Colors are inverted to match the pattern"
                      />
                    )}

                    <div className="text-gray-500">{index + 1}</div>
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 text-sm">matched: </span>
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectAtMove) {
                          onSelectAtMove(game, game.last_move_matched);
                        }
                      }}
                      title="Click to view game at this move"
                    >
                      Move {game.last_move_matched + 1}
                    </span>
                    {" / "}
                    <span
                      className="cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectAtMove) {
                          onSelectAtMove(game, game.moves.length);
                        }
                      }}
                    >
                      {game.moves.length}
                    </span>
                  </div>
                  <div className="flex justify-end items-center">
                    <button
                      className="mr-2 flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                      title={`Click to ${
                        shouldShowResult ? "hide" : "reveal"
                      } result`}
                      onClick={() => setShouldShowResult(!shouldShowResult)}
                    >
                      <span className="text-base text-gray-600">Result:</span>
                      {shouldShowResult ||
                      Object.prototype.hasOwnProperty.call(
                        game.result,
                        "Unknown",
                      ) ? (
                        <span className="text-base font-medium">
                          {formatResult(game.result)}
                        </span>
                      ) : (
                        <img
                          src={trophyCrossedOutIcon}
                          alt="Result"
                          className="w-5 h-5 text-gray-600"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Separator />
    </>
  );
}

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

  const handleSelectGame = useCallback(
    (game: Game) => {
      onSelectGame(game);
    },
    [onSelectGame],
  );

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
                game={game}
                index={index}
                isSelected={selectedGame?.path === game.path}
                onSelect={handleSelectGame}
                onSelectAtMove={onSelectGameAtMove}
                showAllResults={showAllResults}
                moveNumbers={moveNumbers}
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
