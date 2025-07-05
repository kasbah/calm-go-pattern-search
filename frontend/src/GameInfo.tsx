import { type JSX, useEffect, useState } from "react";
import playerNames from "../../rust/pack-games/python-player-name-aliases/player_names.json";
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
import fileDownIcon from "@/assets/icons/file-down.svg";
import flipHorizontalIcon from "@/assets/icons/flip-horizontal.svg";
import trophyCrossedOutIcon from "@/assets/icons/trophy-crossed-out.svg";
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

function formatDate(date: SgfDate | null): JSX.Element | null {
  if (!date) return null;

  const getMonthName = (month: number): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1] || month.toString();
  };

  const getOrdinalDay = (day: number): string => {
    const suffix = (day: number): string => {
      if (day >= 11 && day <= 13) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };
    return `${day}${suffix(day)}`;
  };

  if (date.YearMonthDay) {
    const [year, month, day] = date.YearMonthDay;
    return (
      <>
        <span>
          {getOrdinalDay(day)} of {getMonthName(month)}, {year}
        </span>
      </>
    );
  }

  if (date.YearMonth) {
    const [year, month] = date.YearMonth;
    return (
      <>
        <span>
          {getMonthName(month)}, {year}
        </span>
      </>
    );
  }

  if (date.Year) {
    return <span>{date.Year.toString()}</span>;
  }

  if (date.Custom) {
    return <span>{date.Custom}</span>;
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
  if (rank.Pro) return `${rank.Pro}p`;
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

export type GameInfoProps = {
  game: Game;
  onSelectAtMove?: (game: Game, moveNumber: number) => void;
  showAllResults: boolean;
  vertexSize: number;
};

export default function GameInfo({
  game,
  onSelectAtMove,
  showAllResults,
  vertexSize,
}: GameInfoProps) {
  const [shouldShowResult, setShouldShowResult] = useState(showAllResults);
  const [isInfoPopoverOpen, setInfoPopOverOpen] = useState(false);
  const [isInfoPinned, setInfoPinned] = useState(false);

  useEffect(() => {
    setShouldShowResult(showAllResults);
  }, [showAllResults]);

  return (
    <div
      className="mt-2 text-lg ml-20 overflow-hidden"
      style={{
        width: vertexSize * 19 + 70,
        maxHeight: `calc(95vh - ${vertexSize * 19 + 70}px)`,
      }}
    >
      <div className="flex gap-6 min-w-0">
        {/* Players */}
        <div className="flex flex-col flex-shrink-0 justify-between min-w-0">
          <div className="flex items-center gap-2">
            <img src={circleBlackIcon} alt="Black" className="w-5 h-5" />
            <span className="font-medium truncate">
              {getPlayerName(game.player_black)}, {formatRank(game.rank_black)}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-[6px]">
            <img src={circleWhiteIcon} alt="White" className="w-5 h-5" />
            <span className="font-medium truncate">
              {getPlayerName(game.player_white)}, {formatRank(game.rank_white)}
            </span>
          </div>
        </div>

        {/* Rest of info in two rows */}
        <div className="flex flex-col flex-1 justify-between min-w-0">
          {/* First row - Event/Date and Icons */}
          <div className="flex items-center gap-2 justify-between">
            <div className="flex flex-col min-w-0 flex-1">
              {game.event && (
                <div
                  className="font-medium truncate max-w-full"
                  title={game.event}
                >
                  {game.event}
                </div>
              )}
              <div className="text-gray-500 text-sm">
                {game.round ? `Round: ${game.round}` : "\u00A0"}
              </div>
            </div>
            <div className="flex flex-col text-left justify-left flex-shrink-0">
              {game.date && (
                <div className="font-medium">{formatDate(game.date)}</div>
              )}
              <div className="text-gray-500 text-sm">
                {game.location ? `Location: ${game.location}` : "\u00A0"}
              </div>
            </div>
            <div className="flex items-center gap-2 w-[80px] min-w-[80px] justify-end mr-2">
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
              <Popover
                open={isInfoPopoverOpen}
                onOpenChange={(open) => {
                  if (!isInfoPinned) {
                    setInfoPopOverOpen(open);
                  } else if (!open && isInfoPinned) {
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
                      isInfoPinned ? "text-blue-600" : "text-gray-600",
                    )}
                    title={
                      isInfoPinned
                        ? "Click to unpin"
                        : "Hover for details, click to pin"
                    }
                    onMouseEnter={() => {
                      if (!isInfoPinned) setInfoPopOverOpen(true);
                    }}
                    onMouseLeave={() => {
                      if (!isInfoPinned) setInfoPopOverOpen(false);
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
                  className="w-64 text-sm"
                  align="start"
                  side="top"
                  onMouseEnter={() => {
                    if (!isInfoPinned) setInfoPopOverOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (!isInfoPinned) setInfoPopOverOpen(false);
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    <div>
                      <strong>Komi:</strong>{" "}
                      {game.komi !== null ? game.komi : "Unknown"}
                    </div>
                    <div>
                      <strong>Rules:</strong> {formatRules(game.rules)}
                    </div>
                    <div>
                      <strong>SGF Source:</strong> {game.path}
                    </div>
                    <div>
                      <strong>Search Score:</strong> {game.score}
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
          </div>

          {/* Second row - Move Information and Actions */}
          <div className="flex items-center justify-between gap-4 text-base">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Matched:</span>
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
              <span className="text-gray-300">/</span>
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
            <div className="flex items-center gap-2 text-base">
              <button
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                title={`Click to ${shouldShowResult ? "hide" : "reveal"} result`}
                onClick={() => setShouldShowResult(!shouldShowResult)}
              >
                <span className="text-gray-600">Result:</span>
                {shouldShowResult ||
                Object.prototype.hasOwnProperty.call(game.result, "Unknown") ? (
                  <span className="font-medium">
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
            <div className="flex items-center gap-2">
              <a
                href={`/sgfs/${game.path}.sgf`}
                download={`${game.path}.sgf`}
                className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded justify-end"
                title="Download SGF game record"
              >
                <span className="">SGF</span>
                <img
                  src={fileDownIcon}
                  alt="Download icon"
                  className="w-5 h-5 text-gray-600"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
