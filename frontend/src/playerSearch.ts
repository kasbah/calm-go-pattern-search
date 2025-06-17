import Fuse from "fuse.js";
import playerNamesData from "../../rust/pack-games/python-player-name-aliases/player_names.json";

// Type definitions for the player names JSON structure
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
  aliases: string[];
  gamesCount: number;
};

export type PlayerSearchResult = {
  player: PlayerSuggestion;
  score: number;
};

class PlayerSearchEngine {
  private fuse: Fuse<PlayerSuggestion>;
  private players: PlayerSuggestion[];

  constructor() {
    // Transform the player names data into a searchable format
    this.players = this.transformPlayerData();

    // Configure Fuse.js for fuzzy searching
    this.fuse = new Fuse(this.players, {
      keys: [
        { name: "name", weight: 1.0 },
        { name: "canonicalName", weight: 0.8 },
        { name: "aliases", weight: 0.6 },
      ],
      threshold: 0.4, // Lower threshold = more strict matching
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

  search(query: string, limit: number = 10): PlayerSearchResult[] {
    if (!query || query.length < 2) {
      return [];
    }

    const results = this.fuse.search(query, { limit });

    const searchResults = results.map((result) => ({
      player: result.item,
      score: result.score || 0,
    }));

    // Sort by search score first, then by games count for ties
    searchResults.sort((a, b) => {
      const scoreDiff = a.score - b.score;
      if (Math.abs(scoreDiff) < 0.01) {
        // If scores are very similar
        return b.player.gamesCount - a.player.gamesCount; // Sort by games count (descending)
      }
      return scoreDiff; // Sort by search score (ascending - lower is better)
    });

    return searchResults;
  }

  getPlayerById(id: number): PlayerSuggestion | undefined {
    return this.players.find((player) => player.id === id);
  }

  getAllPlayers(): PlayerSuggestion[] {
    // Return a copy sorted by games count (already sorted in constructor, but ensuring consistency)
    return [...this.players].sort((a, b) => b.gamesCount - a.gamesCount);
  }
}

// Export a singleton instance
export const playerSearchEngine = new PlayerSearchEngine();
