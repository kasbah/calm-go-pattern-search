import arrowLeftSvg from "@/icons/arrow-left.svg";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Game } from "./wasm-search-types";

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
};

export default function GamesList({
  games,
  totalNumberOfGames,
  onSelectGame,
  selectedGame,
}: GamesListProps) {
  const tenGames = games.slice(0, 10);
  return (
    <div className="h-screen ml-4 w-[45%]">
      <div
        className="flex"
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
      <ScrollArea className="h-[96.5%] rounded-md border">
        {tenGames.map((game) => (
          <div
            key={game.path}
            data-selected={selectedGame?.path === game.path}
            className="bg-white hover:bg-secondary data-[selected=true]:bg-highlight cursor-default"
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
            <Separator className="my-2" />
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
