import Fuse from "fuse.js";
import playerNamesData from "../../../rust/pack-games/python-player-name-aliases/player_names.json";

export type PlayerAliasLanguage = {
  language: string;
  preferred?: boolean;
};

export type PlayerAlias = {
  name: string;
  languages: Array<PlayerAliasLanguage>;
};

type PlayerData = {
  id: number;
  aliases: PlayerAlias[];
  games_count: number;
};

type PlayerNamesData = Record<string, PlayerData>;

const playerNames = playerNamesData as PlayerNamesData;

export type PlayerSuggestion = {
  id: number;
  name: string;
  canonicalName: string;
  aliases: Array<string>;
  gamesCount: number;
};

export type PlayerSearchResult = {
  player: PlayerSuggestion;
  score: number;
};

class PlayerSearchEngine {
  private fuse: Fuse<PlayerSuggestion>;
  private players: Array<PlayerSuggestion>;

  constructor() {
    this.players = this.transformPlayerData();

    this.fuse = new Fuse(this.players, {
      keys: [{ name: "aliases", weight: 1.0 }],
      threshold: 0.1, // Lower threshold = more strict matching
      distance: 100,
      minMatchCharLength: 2,
      includeScore: true,
      includeMatches: true,
    });
  }

  private transformPlayerData(): PlayerSuggestion[] {
    const players: PlayerSuggestion[] = [];

    for (const [canonicalName, data] of Object.entries(playerNames)) {
      const id = data.id;

      // Get the preferred English name if available, otherwise use canonical name
      const preferredName = data.aliases.find((alias: PlayerAlias) =>
        alias.languages.some(
          (lang: PlayerAliasLanguage) =>
            lang.language === "en" && lang.preferred,
        ),
      );

      const displayName = preferredName ? preferredName.name : canonicalName;

      data.aliases.sort((a: PlayerAlias, _: PlayerAlias) => {
        if (
          a.languages.some(
            (lang: PlayerAliasLanguage) => lang.language === "en",
          )
        ) {
          return -1;
        }
        return 1;
      });

      // Collect all aliases for searching
      const aliases: string[] = data.aliases.map(
        (alias: PlayerAlias) => alias.name,
      );
      players.push({
        id,
        name: displayName,
        canonicalName,
        aliases,
        gamesCount: data.games_count,
      });
    }

    // Sort players by games count (descending - most games first)
    players.sort((a, b) => b.gamesCount - a.gamesCount);

    return players;
  }

  search(
    query: string,
    limit: number,
    playerCounts?: Record<number, number>,
  ): Array<PlayerSuggestion> {
    let searchResults = [];
    if (!query || query.length < 2) {
      searchResults = this.getAllPlayers();
    } else {
      searchResults = this.fuse.search(query, { limit }).map((result) => ({
        player: result.item,
        score: result.score ?? 1.0,
      }));
    }

    if (playerCounts) {
      searchResults = searchResults.filter((r) => playerCounts[r.player.id]);
      searchResults.sort((a, b) => {
        const countA = playerCounts[a.player.id];
        const countB = playerCounts[b.player.id];

        return countB - countA;
      });
    }

    if (query) {
      searchResults.sort((a, b) => {
        return a.score - b.score;
      });
    }

    return searchResults.map((r) => r.player);
  }

  getPlayerById(id: number): PlayerSuggestion | undefined {
    return this.players.find((player) => player.id === id);
  }

  getAllPlayers(): Array<PlayerSearchResult> {
    return [...this.players]
      .sort((a, b) => b.gamesCount - a.gamesCount)
      .map((player) => ({ score: 0, player }));
  }
}

// Export a singleton instance
export const playerSearchEngine = new PlayerSearchEngine();
