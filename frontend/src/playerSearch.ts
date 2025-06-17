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
};

type PlayerNamesData = Record<string, PlayerData>;

const playerNames = playerNamesData as PlayerNamesData;

export type PlayerSuggestion = {
  id: number;
  name: string;
  canonicalName: string;
  aliases: string[];
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
      });
    }

    return players;
  }

  search(query: string, limit: number = 10): PlayerSearchResult[] {
    if (!query || query.length < 2) {
      return [];
    }

    const results = this.fuse.search(query, { limit });

    return results.map((result) => ({
      player: result.item,
      score: result.score || 0,
    }));
  }

  getPlayerById(id: number): PlayerSuggestion | undefined {
    return this.players.find((player) => player.id === id);
  }

  getAllPlayers(): PlayerSuggestion[] {
    return this.players;
  }
}

// Export a singleton instance
export const playerSearchEngine = new PlayerSearchEngine();
