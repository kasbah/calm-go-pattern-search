import { useLocale } from "@/contexts/locale-context";
import type { Player } from "@/wasm-search-types";
import type {
  PlayerAlias,
  PlayerAliasLanguage,
  PlayerSuggestion,
} from "@/games/filters/player-fuzzy-matcher";
import playerNamesData from "@/../../rust/pack-games/python-player-name-aliases/player_names.json";

type PlayerData = {
  aliases: PlayerAlias[];
  games_count: number;
};

type PlayerNamesData = Record<string, PlayerData>;

const playerNames = playerNamesData as PlayerNamesData;

/**
 * Core function to get locale-aware player name from player data
 */
function getLocaleAwareName(
  playerId: string,
  locale: string,
  fallbackName: string,
): string {
  const playerData = playerNames[playerId];
  if (!playerData) return fallbackName;

  // 1. Try to find preferred name in the user's locale
  let preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some(
      (lang: PlayerAliasLanguage) => lang.language === locale && lang.preferred,
    ),
  );

  if (preferredName) {
    return preferredName.name;
  }

  // 2. Try to find any name marked as preferred: false in the user's locale
  preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some(
      (lang: PlayerAliasLanguage) =>
        lang.language === locale && lang.preferred === false,
    ),
  );

  if (preferredName) {
    return preferredName.name;
  }

  // 3. Try to find any name in the user's locale (no preference specified)
  preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some(
      (lang: PlayerAliasLanguage) => lang.language === locale,
    ),
  );

  if (preferredName) {
    return preferredName.name;
  }

  // 4. Fallback to English preferred name
  preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some(
      (lang: PlayerAliasLanguage) => lang.language === "en" && lang.preferred,
    ),
  );

  if (preferredName) {
    return preferredName.name;
  }

  // 5. Fallback to any English name
  preferredName = playerData.aliases.find((alias: PlayerAlias) =>
    alias.languages.some((lang: PlayerAliasLanguage) => lang.language === "en"),
  );

  if (preferredName) {
    return preferredName.name;
  }

  // 6. Fallback to any name with no locale specified
  preferredName = playerData.aliases.find(
    (alias: PlayerAlias) =>
      alias.languages.length === 0 ||
      alias.languages.some((lang: PlayerAliasLanguage) => !lang.language),
  );

  if (preferredName) {
    return preferredName.name;
  }

  // 7. Last resort: first available alias
  if (playerData.aliases.length > 0) {
    return playerData.aliases[0].name;
  }

  return fallbackName;
}

/**
 * Hook to get locale-aware player name from Player object (used in game info)
 */
export function usePlayerName(player: Player): string {
  const { locale } = useLocale();

  if (player.Id) {
    const playerId = player.Id[0].toString();
    const fallbackName = `Player ${player.Id[0]}`;
    return getLocaleAwareName(playerId, locale, fallbackName);
  }
  return player.Unknown || "Unknown";
}

/**
 * Hook to get locale-aware player name from PlayerSuggestion object (used in filters)
 */
export function usePlayerNameFromSuggestion(
  playerSuggestion: PlayerSuggestion | null,
): string {
  const { locale } = useLocale();

  if (!playerSuggestion) return "";

  const playerId = playerSuggestion.id.toString();
  const fallbackName = playerSuggestion.name;
  return getLocaleAwareName(playerId, locale, fallbackName);
}
