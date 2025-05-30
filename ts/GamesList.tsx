import type { Game } from "./games";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export type GamesListProps = {
  games: Array<Game>;
  totalNumberOfGames: number;
};

export default function GamesList({
  games,
  totalNumberOfGames: totalNumberOfGames,
}: GamesListProps) {
  const tenGames = games.slice(0, 10);
  return (
    <div className="h-screen ml-4 w-[45%]">
      {totalNumberOfGames} games
      <ScrollArea className="h-[96.5%] rounded-md border">
        {tenGames.map((game) => (
          <div key={game.path}>
            <div className="text-sm p-2">
              <h2 className="text-xl font-medium mb-2">{game.path}</h2>
              <div className="grid grid-cols-2 gap-2">
                <div>Score: {game.score}</div>
                <div>Last Move Matched: {game.last_move_matched + 1}</div>
                <div>Rotation: {game.rotation}</div>
                <div>Inverted: {game.is_inverted ? "Yes" : "No"}</div>
                <div>Mirrored: {game.is_mirrored ? "Yes" : "No"}</div>
                <div>Empty Within: {game.all_empty_correctly_within}</div>
              </div>
            </div>
            <Separator className="my-2" />
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
