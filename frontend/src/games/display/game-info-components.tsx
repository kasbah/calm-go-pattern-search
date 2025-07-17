import { useState, useEffect, useCallback, memo, type JSX } from "react";
import { cn } from "@/utils";
import { getPlayerNames } from "../get-player-names";

import {
  useTranslations,
  type TranslationKey,
} from "@/locale/use-translations";

import type {
  Game,
  GameResult,
  Rank,
  Rules,
  SgfDate,
} from "@/wasm-search-types";

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

function rotationToString(
  rotation: number,
  t: (key: TranslationKey) => string,
) {
  if (rotation === 0) {
    return t("rotation.none");
  } else if (rotation === 1) {
    return t("rotation.90");
  } else if (rotation === 2) {
    return t("rotation.180");
  } else {
    return t("rotation.270");
  }
}

export type FormattedDateProps = {
  date: SgfDate | null;
};

export function FormattedDate({
  date,
}: FormattedDateProps): JSX.Element | null {
  const { formatDate, getMonthName } = useTranslations();

  if (!date) return null;

  if (date.YearMonthDay) {
    const [year, month, day] = date.YearMonthDay;
    return (
      <>
        <span>{formatDate(day, month, year)}</span>
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
    return (
      <>
        <span>{date.Year}</span>
      </>
    );
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

function formatRules(
  rules: Rules | null,
  t: (key: TranslationKey) => string,
): string {
  if (!rules) return t("rules.unknown");
  if (rules.Chinese) return t("rules.chinese");
  if (rules.Japanese) return t("rules.japanese");
  if (rules.Korean) return t("rules.korean");
  if (rules.Ing) return t("rules.ing");
  if (rules.Custom) return rules.Custom;
  return t("rules.unknown");
}

export type PlayerDisplayProps = {
  game: Game;
  color: "Black" | "White";
  className?: string;
  maxWidth?: number;
  onPlayerClick?: (playerId: number, color: "Black" | "White" | "Any") => void;
};

export const PlayerDisplay = memo(function PlayerDisplay({
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
  const { t, locale } = useTranslations();
  const alt = isBlack ? t("alt.black") : t("alt.white");

  const { name: playerName, aliases: playerAliases } = player.Id
    ? getPlayerNames(player.Id[0], locale)
    : { name: player.Unknown || "Unknown", aliases: [] };
  const playerRank = formatRank(rank);

  // Get the original name from the game record if different from player_names.json
  const originalName = player.Id?.[1];
  const showOriginalName = originalName && originalName !== playerName;

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
    <div className="flex flex-col">
      <div
        className={cn("flex flex-wrap items-center gap-1", className)}
        style={maxWidth ? { maxWidth } : undefined}
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
              {playerAliases.join(", ")}
            </PopoverContent>
          )}
        </Popover>
        <span className="font-medium truncate min-w-0">{playerRank}</span>
      </div>
      {showOriginalName && (
        <div className="text-xs text-gray-600 leading-tight ml-9">
          ({originalName})
        </div>
      )}
    </div>
  );
});

export type GameIconsProps = {
  game: Game;
  className?: string;
};

export function GameIcons({ game, className }: GameIconsProps) {
  const { t } = useTranslations();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {game.is_mirrored && (
        <img
          src={flipHorizontalIcon}
          alt={t("alt.mirrored")}
          className="w-5 h-5 text-gray-600"
          title={t("tooltip.mirrored")}
        />
      )}
      {game.is_inverted && (
        <img
          src={circleBlackSlashWhiteIcon}
          alt={t("alt.colorsInverted")}
          className="w-5 h-5 text-gray-600"
          title={t("tooltip.colorsInverted")}
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
  const { t } = useTranslations();
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
          title={isInfoPinned ? t("info.clickToUnpin") : t("info.clickToPin")}
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
            <strong>{t("info.komi")}</strong>{" "}
            {game.komi !== null ? game.komi : "Unknown"}
          </div>
          <div>
            <strong>{t("info.rules")}</strong> {formatRules(game.rules, t)}
          </div>
          <div>
            <strong>{t("info.sgfSource")}</strong> {game.path}
          </div>
          <div>
            <strong>{t("info.searchScore")}</strong> {game.score}
          </div>
          <div>
            <strong>{t("info.emptyCorrectly")}</strong>{" "}
            {game.all_empty_correctly_within}
          </div>
          <div>
            <strong>{t("info.rotation")}</strong>{" "}
            {rotationToString(game.rotation, t)}
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
  const { t } = useTranslations();
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
        "flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-0 py-0 rounded",
        className,
      )}
      title={
        shouldShowResult
          ? t("info.clickToToggleResult")
          : t("info.clickToShowResult")
      }
      onClick={handleToggleResult}
    >
      <span className="text-gray-600">{t("info.result")}</span>
      {shouldShowResult ||
      Object.prototype.hasOwnProperty.call(game.result, "Unknown") ? (
        <span className="font-medium">{formatResult(game.result)}</span>
      ) : (
        <img
          src={trophyCrossedOutIcon}
          alt={t("info.result")}
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
  const { t } = useTranslations();

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
    <div
      className={cn("flex items-center gap-2 text-base justify-end", className)}
    >
      <span className="text-gray-500 whitespace-nowrap">
        {t("info.matched")}
      </span>
      <span
        className="cursor-pointer hover:underline whitespace-nowrap"
        onClick={handleMatchedMoveClick}
        title={t("info.clickToView")}
      >
        {t("info.move")} {game.last_move_matched + 1}
      </span>
      <span className="text-gray-300 whitespace-nowrap">/</span>
      <span
        className="cursor-pointer hover:underline whitespace-nowrap"
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
  const { t } = useTranslations();

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
      <span className="text-gray-500">{t("info.matched")} </span>
      <span
        className="cursor-pointer hover:underline"
        onClick={handleMatchedMoveClick}
        title={t("info.clickToView")}
      >
        {t("info.move")} {game.last_move_matched + 1}
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
  const { t } = useTranslations();

  return (
    <a
      href={`/sgfs/${game.path}.sgf`}
      download={`${game.path}.sgf`}
      className={cn(
        "flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded justify-end",
        className,
      )}
      title={t("info.downloadSgf")}
    >
      <span>{t("info.sgf")}</span>
      <img
        src={fileDownIcon}
        alt={t("info.downloadIcon")}
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
  const { t } = useTranslations();

  return (
    <div className={cn("flex flex-col min-w-0 flex-1", className)}>
      {game.event && (
        <div className="font-medium truncate max-w-full" title={game.event}>
          {game.event}
        </div>
      )}
      <div
        className="text-gray-500 text-sm truncate max-w-full"
        title={`${t("info.round")} ${game.round}`}
      >
        {game.round ? `${t("info.round")} ${game.round}` : "\u00A0"}
      </div>
    </div>
  );
}

export type GameDateLocationProps = {
  game: Game;
  className?: string;
};

export function GameDateLocation({ game, className }: GameDateLocationProps) {
  const { t } = useTranslations();

  return (
    <div className={cn("flex flex-col flex-shrink-0", className)}>
      {game.date && (
        <div className="font-medium truncate max-w-full text-left">
          <FormattedDate date={game.date} />
        </div>
      )}
      <div
        className="text-gray-500 text-sm truncate max-w-full text-left"
        title={
          game.location ? `${t("info.location")} ${game.location}` : undefined
        }
      >
        {game.location ? `${t("info.location")} ${game.location}` : "\u00A0"}
      </div>
    </div>
  );
}

export type GameEventInfoListProps = {
  game: Game;
  className?: string;
};

export function GameEventInfoList({ game, className }: GameEventInfoListProps) {
  const { t } = useTranslations();

  return (
    <div className={cn("flex flex-col", className)}>
      {game.event && <div className="text-lg font-medium">{game.event}</div>}
      <div className="text-gray-500 text-sm">
        {game.round ? `${t("info.round")} ${game.round}` : "\u00A0"}
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
  const { t } = useTranslations();

  return (
    <div className={cn("flex flex-col gap-1 truncate", className)}>
      {game.date && (
        <div className="text-lg font-medium">
          <FormattedDate date={game.date} />
        </div>
      )}
      <div
        className="text-gray-500 text-sm truncate w-100"
        title={
          game.location ? `${t("info.location")} ${game.location}` : undefined
        }
      >
        {game.location ? `${t("info.location")} ${game.location}` : "\u00A0"}
      </div>
    </div>
  );
}
