import { useState, useEffect } from "react";
import { cn } from "./lib/utils";
import type { Game } from "./wasm-search-types";
import {
  formatDate,
  formatResult,
  formatRank,
  formatRules,
  getPlayerName,
  rotationToString,
} from "./utils/gameFormatters";

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

export type PlayerDisplayProps = {
  game: Game;
  color: "black" | "white";
  className?: string;
};

export function PlayerDisplay({ game, color, className }: PlayerDisplayProps) {
  const isBlack = color === "black";
  const player = isBlack ? game.player_black : game.player_white;
  const rank = isBlack ? game.rank_black : game.rank_white;
  const icon = isBlack ? circleBlackIcon : circleWhiteIcon;
  const alt = isBlack ? "Black" : "White";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img src={icon} alt={alt} className="w-5 h-5" />
      <span className="font-medium truncate">
        {getPlayerName(player)}, {formatRank(rank)}
      </span>
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
        align={align}
        side={side}
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

  return (
    <button
      className={cn(
        "flex items-center gap-1 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded",
        className,
      )}
      title={`Click to ${shouldShowResult ? "hide" : "reveal"} result`}
      onClick={() => setShouldShowResult(!shouldShowResult)}
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
  return (
    <div className={cn("flex items-center gap-2", className)}>
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
            onSelectAtMove(game, game.moves.length - 1);
          }
        }}
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
  return (
    <div className={className}>
      <span className="text-gray-500">Matched: </span>
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
      <span
        className="text-gray-300 text-2xl"
        style={{ position: "relative", top: 3 }}
      >
        {" / "}
      </span>
      <span
        className="cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectAtMove) {
            onSelectAtMove(game, game.moves.length - 1);
          }
        }}
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
      <div className="text-gray-500 text-sm">
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
      {game.date && <div className="font-medium">{formatDate(game.date)}</div>}
      <div className="text-gray-500 text-sm">
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
        <div className="text-lg font-medium">{formatDate(game.date)}</div>
      )}
      <div className="text-gray-500 text-sm">
        {game.location ? `Location: ${game.location}` : "\u00A0"}
      </div>
    </div>
  );
}
