import type { Game } from "./wasm-search-types";
import {
  PlayerDisplay,
  GameIcons,
  GameInfoPopover,
  GameEventInfo,
  GameDateLocation,
  MoveInfo,
  GameResult,
  SGFDownload,
} from "./GameDisplayComponents";

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
  const totalWidth = vertexSize * 19 + 70;
  const maxPlayerWidth = Math.floor(totalWidth * 0.45);

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
          <PlayerDisplay game={game} color="black" maxWidth={maxPlayerWidth} />
          <PlayerDisplay
            game={game}
            color="white"
            className="mb-[6px]"
            maxWidth={maxPlayerWidth}
          />
        </div>

        {/* Rest of info in two rows */}
        <div className="flex flex-col flex-1 justify-between min-w-0">
          {/* First row - Event/Date and Icons */}
          <div className="flex items-center gap-2 justify-between">
            <GameEventInfo game={game} />
            <GameDateLocation game={game} />
            <div className="flex items-center gap-2 w-[80px] min-w-[80px] justify-end mr-2">
              <GameIcons game={game} />
              <GameInfoPopover game={game} />
            </div>
          </div>

          {/* Second row - Move Information and Actions */}
          <div className="flex items-center justify-between gap-4 text-base">
            <MoveInfo game={game} onSelectAtMove={onSelectAtMove} />
            <div className="flex items-center gap-2 text-base">
              <GameResult game={game} showAllResults={showAllResults} />
            </div>
            <div className="flex items-center gap-2">
              <SGFDownload game={game} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
