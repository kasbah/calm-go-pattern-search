import type { Game } from "@/wasm-search-types";
import {
  PlayerDisplay,
  GameIcons,
  GameInfoPopover,
  GameEventInfo,
  GameDateLocation,
  MoveInfo,
  GameResult,
  SGFDownload,
} from "./game-info-components";

export type GameInfoProps = {
  game: Game;
  onSelectAtMove?: (game: Game, moveNumber: number) => void;
  showAllResults: boolean;
  vertexSize: number;
  onPlayerClick?: (playerId: number, color: "Black" | "White" | "Any") => void;
};

export default function GameInfo({
  game,
  onSelectAtMove,
  showAllResults,
  vertexSize,
  onPlayerClick,
}: GameInfoProps) {
  const totalWidth = vertexSize * 19 + 70;
  const maxPlayerWidth = Math.floor(totalWidth * 0.45);

  return (
    <div
      className="mt-2 text-lg ml-20 flex flex-wrap gap-6"
      style={{
        width: vertexSize * 19 + 70,
        maxHeight: `calc(95vh - ${vertexSize * 19 + 70}px)`,
      }}
    >
      {/* Players */}
      <div className="flex flex-col flex-shrink-0 justify-between">
        <PlayerDisplay
          game={game}
          color="Black"
          maxWidth={maxPlayerWidth}
          onPlayerClick={onPlayerClick}
        />
        <PlayerDisplay
          game={game}
          color="White"
          className="mb-[6px]"
          maxWidth={maxPlayerWidth}
          onPlayerClick={onPlayerClick}
        />
      </div>

      {/* Event, Round and Move */}
      <div className="flex flex-col flex-1 justify-between w-50">
        <div className="min-w-0 text-end">
          <GameEventInfo game={game} />
        </div>
        <MoveInfo game={game} onSelectAtMove={onSelectAtMove} />
      </div>

      {/* Date, Location and Result */}
      <div className="flex flex-col flex-1 gap-1 justify-between w-50">
        <GameDateLocation game={game} />
        <div className="flex items-center gap-2 text-base justify-left">
          <GameResult game={game} showAllResults={showAllResults} />
        </div>
      </div>

      {/* Icons and Download */}
      <div className="flex flex-col justify-between items-end">
        <div className="flex items-center gap-2">
          <GameIcons game={game} />
          <GameInfoPopover game={game} />
        </div>
        <div className="flex items-center gap-2">
          <SGFDownload game={game} />
        </div>
      </div>
    </div>
  );
}
