import { useState, useEffect, useCallback, type JSX } from "react";
import { cn } from "@/utils";
import type {
  Game,
  GameResult,
  Player,
  Rank,
  Rules,
  SgfDate,
} from "@/wasm-search-types";
import type {
  PlayerAlias,
  PlayerAliasLanguage,
} from "@/games/filters/player-fuzzy-matcher";
import playerNamesData from "../../../../rust/pack-games/python-player-name-aliases/player_names.json";

type PlayerData = {
  id: number;
  aliases: PlayerAlias[];
  games_count: number;
};

type PlayerNamesData = Record<string, PlayerData>;

const playerNames = playerNamesData as PlayerNamesData;

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
} from "@/ui-primitives/popover";

// Formatter functions moved from game-formatters.tsx

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

export type FormattedDateProps = {
  date: SgfDate | null;
};

export function FormattedDate({
  date,
}: FormattedDateProps): JSX.Element | null {
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

function getPlayerAliases(player: Player): PlayerAlias[] {
  if (player.Id) {
    const playerEntry = Object.entries(playerNames).find(
      ([_, data]) => data.id === player.Id![0],
    );
    if (!playerEntry) return [];

    const [_, data] = playerEntry;
    return data.aliases || [];
  }
  return [];
}

export type PlayerDisplayProps = {
  game: Game;
  color: "Black" | "White";
  className?: string;
  maxWidth?: number;
  onPlayerClick?: (playerId: number, color: "Black" | "White" | "Any") => void;
};

export function PlayerDisplay({
  game,
  color,
  className,
  maxWidth,
  onPlayerClick,
}: PlayerDisplayProps) {
  const isBlack = color === "Black";
  const player = isBlack ? game.player_black : game.player_white;
  const rank = isBlack ? game.rank_black : game.rank_white;
  const icon = isBlack ? circleBlackIcon : circleWhiteIcon;
  const alt = isBlack ? "Black" : "White";

  const playerName = getPlayerName(player);
  const playerRank = formatRank(rank);
  const playerAliases = getPlayerAliases(player).filter(
    (alias) => alias.name !== playerName,
  );

  const [isCircleHovered, setIsCircleHovered] = useState(false);
  const [isNameHovered, setIsNameHovered] = useState(false);
  const [isAliasPopoverOpen, setAliasPopoverOpen] = useState(false);

  const handleAliasPopoverMouseEnter = useCallback(() => {
    setAliasPopoverOpen(true);
  }, []);

  const handleAliasPopoverMouseLeave = useCallback(() => {
    setAliasPopoverOpen(false);
  }, []);

  const handlePlayerNameClick = useCallback(() => {
    if (onPlayerClick && player.Id) {
      onPlayerClick(player.Id[0], "Any");
    }
  }, [onPlayerClick, player.Id]);

  const handleCircleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onPlayerClick && player.Id) {
        onPlayerClick(player.Id[0], color);
      }
    },
    [onPlayerClick, player.Id, color],
  );

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      <Popover open={isAliasPopoverOpen} onOpenChange={setAliasPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded border",
                isCircleHovered ? "border-gray-400" : "border-transparent",
              )}
            >
              <div
                className={cn(
                  "w-7 h-7 flex-shrink-0 rounded flex items-center justify-center",
                  onPlayerClick && player.Id && "cursor-pointer",
                )}
                onClick={handleCircleClick}
                onMouseEnter={() => {
                  setIsCircleHovered(true);
                  if (playerAliases.length > 0) {
                    setAliasPopoverOpen(true);
                  }
                }}
                onMouseLeave={() => {
                  setIsCircleHovered(false);
                  setAliasPopoverOpen(false);
                }}
              >
                <img src={icon} alt={alt} className="w-6 h-6" />
              </div>
              <span
                className={cn(
                  "font-medium rounded border",
                  isNameHovered ? "border-gray-400" : "border-transparent",
                  onPlayerClick && player.Id && "cursor-pointer",
                )}
                onClick={handlePlayerNameClick}
                onMouseEnter={() => {
                  setIsNameHovered(true);
                  if (playerAliases.length > 0) {
                    setAliasPopoverOpen(true);
                  }
                }}
                onMouseLeave={() => {
                  setIsNameHovered(false);
                  setAliasPopoverOpen(false);
                }}
              >
                {playerName},
              </span>
            </div>
          </div>
        </PopoverTrigger>
        {playerAliases.length > 0 && (
          <PopoverContent
            className="w-80 text-sm"
            side="bottom"
            align="start"
            onMouseEnter={handleAliasPopoverMouseEnter}
            onMouseLeave={handleAliasPopoverMouseLeave}
          >
            {playerAliases.map((alias) => alias.name).join(", ")}
          </PopoverContent>
        )}
      </Popover>
      <span className="font-medium truncate min-w-0">{playerRank}</span>
    </div>
  );
}

export type GameIconsProps = {
  game: Game;
  className?: string;
};

export function GameIcons({ game, className }: GameIconsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
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
    </div>
  );
}

export type GameInfoPopoverProps = {
  game: Game;
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
};

export function GameInfoPopover({
  game,
  className,
  align = "start",
  side = "top",
}: GameInfoPopoverProps) {
  const [isInfoPopoverOpen, setInfoPopOverOpen] = useState(false);
  const [isInfoPinned, setInfoPinned] = useState(false);

  const handleInfoPopoverMouseEnter = useCallback(() => {
    if (!isInfoPinned) setInfoPopOverOpen(true);
  }, [isInfoPinned]);

  const handleInfoPopoverMouseLeave = useCallback(() => {
    if (!isInfoPinned) setInfoPopOverOpen(false);
  }, [isInfoPinned]);

  const handleInfoPopoverClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleInfoClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newPinnedState = !isInfoPinned;
      setInfoPinned(newPinnedState);
      setInfoPopOverOpen(true);
    },
    [isInfoPinned],
  );

  return (
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
            className,
          )}
          title={
            isInfoPinned ? "Click to unpin" : "Hover for details, click to pin"
          }
          onMouseEnter={() => {
            if (!isInfoPinned) setInfoPopOverOpen(true);
          }}
          onMouseLeave={() => {
            if (!isInfoPinned) setInfoPopOverOpen(false);
          }}
          onClick={handleInfoClick}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-64 text-sm"
        align={align}
        side={side}
        onMouseEnter={handleInfoPopoverMouseEnter}
        onMouseLeave={handleInfoPopoverMouseLeave}
        onClick={handleInfoPopoverClick}
      >
        <div className="space-y-1">
          <div>
            <strong>Komi:</strong> {game.komi !== null ? game.komi : "Unknown"}
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
            <strong>Rotation:</strong> {rotationToString(game.rotation)}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type GameResultProps = {
  game: Game;
  showAllResults: boolean;
  className?: string;
};

export function GameResult({
  game,
  showAllResults,
  className,
}: GameResultProps) {
  const [shouldShowResult, setShouldShowResult] = useState(showAllResults);

  useEffect(() => {
    setShouldShowResult(showAllResults);
  }, [showAllResults]);

  const handleToggleResult = useCallback(() => {
    setShouldShowResult(!shouldShowResult);
  }, [shouldShowResult]);

  return (
    <button
      className={cn(
        "flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded",
        className,
      )}
      title={`Click to ${shouldShowResult ? "hide" : "reveal"} result`}
      onClick={handleToggleResult}
    >
      <span className="text-gray-600">Result:</span>
      {shouldShowResult ||
      Object.prototype.hasOwnProperty.call(game.result, "Unknown") ? (
        <span className="font-medium">{formatResult(game.result)}</span>
      ) : (
        <img
          src={trophyCrossedOutIcon}
          alt="Result"
          className="w-5 h-5 text-gray-600"
        />
      )}
    </button>
  );
}

export type MoveInfoProps = {
  game: Game;
  onSelectAtMove?: (game: Game, moveNumber: number) => void;
  className?: string;
};

export function MoveInfo({ game, onSelectAtMove, className }: MoveInfoProps) {
  const handleMatchedMoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSelectAtMove) {
        onSelectAtMove(game, game.last_move_matched);
      }
    },
    [onSelectAtMove, game],
  );

  const handleLastMoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSelectAtMove) {
        onSelectAtMove(game, game.moves.length - 1);
      }
    },
    [onSelectAtMove, game],
  );

  return (
    <div className={cn("flex items-center gap-2 text-base", className)}>
      <span className="text-gray-500">Matched:</span>
      <span
        className="cursor-pointer hover:underline"
        onClick={handleMatchedMoveClick}
        title="Click to view game at this move"
      >
        Move {game.last_move_matched + 1}
      </span>
      <span className="text-gray-300">/</span>
      <span
        className="cursor-pointer hover:underline"
        onClick={handleLastMoveClick}
      >
        {game.moves.length}
      </span>
    </div>
  );
}

export type MoveInfoCompactProps = {
  game: Game;
  onSelectAtMove?: (game: Game, moveNumber: number) => void;
  className?: string;
};

export function MoveInfoCompact({
  game,
  onSelectAtMove,
  className,
}: MoveInfoCompactProps) {
  const handleMatchedMoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSelectAtMove) {
        onSelectAtMove(game, game.last_move_matched);
      }
    },
    [onSelectAtMove, game],
  );

  const handleLastMoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onSelectAtMove) {
        onSelectAtMove(game, game.moves.length - 1);
      }
    },
    [onSelectAtMove, game],
  );

  return (
    <div className={className}>
      <span className="text-gray-500">Matched: </span>
      <span
        className="cursor-pointer hover:underline"
        onClick={handleMatchedMoveClick}
        title="Click to view game at this move"
      >
        Move {game.last_move_matched + 1}
      </span>
      <span
        className="text-gray-300 text-2xl"
        style={{ position: "relative", top: 3 }}
      >
        {" / "}
      </span>
      <span
        className="cursor-pointer hover:underline"
        onClick={handleLastMoveClick}
      >
        {game.moves.length}
      </span>
    </div>
  );
}

export type SGFDownloadProps = {
  game: Game;
  className?: string;
};

export function SGFDownload({ game, className }: SGFDownloadProps) {
  return (
    <a
      href={`/sgfs/${game.path}.sgf`}
      download={`${game.path}.sgf`}
      className={cn(
        "flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded justify-end",
        className,
      )}
      title="Download SGF game record"
    >
      <span>SGF</span>
      <img
        src={fileDownIcon}
        alt="Download icon"
        className="w-5 h-5 text-gray-600"
      />
    </a>
  );
}

export type GameEventInfoProps = {
  game: Game;
  className?: string;
};

export function GameEventInfo({ game, className }: GameEventInfoProps) {
  return (
    <div className={cn("flex flex-col min-w-0 flex-1", className)}>
      {game.event && (
        <div className="font-medium truncate max-w-full" title={game.event}>
          {game.event}
        </div>
      )}
      <div
        className="text-gray-500 text-sm truncate max-w-full"
        title={`Round: ${game.round}`}
      >
        {game.round ? `Round: ${game.round}` : "\u00A0"}
      </div>
    </div>
  );
}

export type GameDateLocationProps = {
  game: Game;
  className?: string;
};

export function GameDateLocation({ game, className }: GameDateLocationProps) {
  return (
    <div
      className={cn(
        "flex flex-col text-left justify-left flex-shrink-0",
        className,
      )}
    >
      {game.date && (
        <div className="font-medium truncate max-w-full">
          <FormattedDate date={game.date} />
        </div>
      )}
      <div className="text-gray-500 text-sm truncate max-w-full">
        {game.location ? `Location: ${game.location}` : "\u00A0"}
      </div>
    </div>
  );
}

export type GameEventInfoListProps = {
  game: Game;
  className?: string;
};

export function GameEventInfoList({ game, className }: GameEventInfoListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {game.event && <div className="text-lg font-medium">{game.event}</div>}
      <div className="text-gray-500 text-sm">
        {game.round ? `Round: ${game.round}` : "\u00A0"}
      </div>
    </div>
  );
}

export type GameDateLocationListProps = {
  game: Game;
  className?: string;
};

export function GameDateLocationList({
  game,
  className,
}: GameDateLocationListProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {game.date && (
        <div className="text-lg font-medium">
          <FormattedDate date={game.date} />
        </div>
      )}
      <div className="text-gray-500 text-sm">
        {game.location ? `Location: ${game.location}` : "\u00A0"}
      </div>
    </div>
  );
}
