import type {
  PlayerAlias,
  PlayerAliasLanguage,
} from "@/games/filters/player-fuzzy-matcher";
import playerNamesData from "@/../../rust/pack-games/python-player-name-aliases/player_names.json";

type PlayerData = {
  aliases: PlayerAlias[];
  games_count: number;
};

type PlayerNamesData = Record<string, PlayerData>;

const playerNames = playerNamesData as PlayerNamesData;

/**
 * Get locale-aware player name and sorted aliases from player data
 * @param playerId - The player ID as a number
 * @param locale - The locale code (e.g., 'en', 'ko', 'ja')
 * @returns Object containing the preferred name and sorted aliases
 */
export function getPlayerNames(
  playerId: number,
  locale: string,
): { name: string; aliases: string[] } {
  const playerData = playerNames[playerId.toString()];

  const selectedName = findPreferredName(playerData, locale, playerId);
  const remainingAliases = getSortedAliases(playerData, locale, selectedName);

  return { name: selectedName, aliases: remainingAliases };
}

/**
 * Find the preferred player name based on locale fallback logic
 * @param playerData - The player data containing aliases
 * @param locale - The locale code (e.g., 'en', 'ko', 'ja')
 * @param playerId - The player ID for fallback display
 * @returns The preferred player name
 */
function findPreferredName(
  playerData: PlayerData | undefined,
  locale: string,
  playerId: number,
): string {
  if (!playerData) return `Player ${playerId}`;

  // Try to find preferred name in the user's locale
  let preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some(
      (lang: PlayerAliasLanguage) => lang.language === locale && lang.preferred,
    ),
  );
  if (preferredName) {
    return preferredName.name;
  }

  // Try to find any name in the user's locale
  preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some(
      (lang: PlayerAliasLanguage) => lang.language === locale,
    ),
  );
  if (preferredName) {
    return preferredName.name;
  }

  // Fallback to English preferred name
  preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some(
      (lang: PlayerAliasLanguage) => lang.language === "en" && lang.preferred,
    ),
  );
  if (preferredName) {
    return preferredName.name;
  }

  // Fallback to any English name
  preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some((lang: PlayerAliasLanguage) => lang.language === "en"),
  );
  if (preferredName) {
    return preferredName.name;
  }

  // Last resort: first available alias
  if (playerData.aliases.length > 0) {
    return playerData.aliases[0].name;
  }

  return `Player ${playerId}`;
}

/**
 * Get remaining aliases sorted by locale preference
 * @param playerData - The player data containing aliases
 * @param locale - The locale code (e.g., 'en', 'ko', 'ja')
 * @param selectedName - The already selected preferred name to exclude
 * @returns Array of sorted alias names
 */
function getSortedAliases(
  playerData: PlayerData | undefined,
  locale: string,
  selectedName: string,
): string[] {
  if (!playerData) return [];

  return playerData.aliases
    .filter((alias: PlayerAlias) => alias.name !== selectedName)
    .sort((a: PlayerAlias, b: PlayerAlias) => {
      // Sort by locale preference: user locale first, then English, then others
      const aHasUserLocale = a.languages.some(
        (lang: PlayerAliasLanguage) => lang.language === locale,
      );
      const bHasUserLocale = b.languages.some(
        (lang: PlayerAliasLanguage) => lang.language === locale,
      );
      const aHasEnglish = a.languages.some(
        (lang: PlayerAliasLanguage) => lang.language === "en",
      );
      const bHasEnglish = b.languages.some(
        (lang: PlayerAliasLanguage) => lang.language === "en",
      );

      if (aHasUserLocale && !bHasUserLocale) return -1;
      if (!aHasUserLocale && bHasUserLocale) return 1;
      if (aHasEnglish && !bHasEnglish) return -1;
      if (!aHasEnglish && bHasEnglish) return 1;

      // If same locale priority, sort alphabetically
      return a.name.localeCompare(b.name);
    })
    .map((alias: PlayerAlias) => alias.name);
}
