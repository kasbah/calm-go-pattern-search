import { type Game } from "./games";

export type GamesListProps = {
  games: Array<Game>;
};

export default function GamesList({ games }: GamesListProps) {
  games.sort(
    (r1, r2) =>
      r1.last_move_matched - r1.score - (r2.last_move_matched - r2.score),
  );
  games = games.slice(0, 10);
  return (
    <div>
      <pre>{JSON.stringify(games, null, 2)}</pre>
    </div>
  );
}
