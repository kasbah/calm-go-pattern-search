import { type Game } from "./games";

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
    <div>
      {totalNumberOfGames} games found
      <pre>{JSON.stringify(tenGames, null, 2)}</pre>
    </div>
  );
}
