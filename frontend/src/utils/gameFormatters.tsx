import { type JSX } from "react";
import playerNames from "../../../rust/pack-games/python-player-name-aliases/player_names.json";
import type { PlayerAlias, PlayerAliasLanguage } from "../playerSearch";
import type {
  GameResult,
  Player,
  Rank,
  Rules,
  SgfDate,
} from "../wasm-search-types";

export function rotationToString(rotation: number) {
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

export function formatDate(date: SgfDate | null): JSX.Element | null {
  if (!date) return null;

  const getMonthName = (month: number): string => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return monthNames[month - 1] || month.toString();
  };

  const getOrdinalDay = (day: number): string => {
    const suffix = (day: number): string => {
      if (day >= 11 && day <= 13) return "th";
      switch (day % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };
    return `${day}${suffix(day)}`;
  };

  if (date.YearMonthDay) {
    const [year, month, day] = date.YearMonthDay;
    return (
      <>
        <span>
          {getOrdinalDay(day)} of {getMonthName(month)}, {year}
        </span>
      </>
    );
  }

  if (date.YearMonth) {
    const [year, month] = date.YearMonth;
    return (
      <>
        <span>
          {getMonthName(month)}, {year}
        </span>
      </>
    );
  }

  if (date.Year) {
    return <span>{date.Year.toString()}</span>;
  }

  if (date.Custom) {
    return <span>{date.Custom}</span>;
  }

  return null;
}

export function formatResult(result: GameResult | null): string {
  if (!result) return "Unknown";
  if (result === "Draw") return "Draw";
  if (result === "Void") return "Void";
  if (result.Unknown) return result.Unknown;
  if (result.Player) {
    const [color, score] = result.Player;
    const colorStr = color === "Black" ? "B" : "W";
    if (!score) return `${colorStr}+?`;
    if (score === "Resignation") return `${colorStr}+Resign`;
    if (score === "Timeout") return `${colorStr}+Timeout`;
    if (score === "Forfeit") return `${colorStr}+Forfeit`;
    if (score.Points) return `${colorStr}+${score.Points.toFixed(1)}`;
    return `${colorStr}+?`;
  }
  return "Unknown";
}

export function formatRank(rank: Rank | null): string {
  if (!rank) return "(?)";
  if (rank.Kyu) return `${rank.Kyu}k`;
  if (rank.Dan) return `${rank.Dan}d`;
  if (rank.Pro) return `${rank.Pro}p`;
  if (rank.Custom) return `(${rank.Custom})`;
  return "(?)";
}

export function formatRules(rules: Rules | null): string {
  if (!rules) return "Unknown";
  if (rules.Chinese) return "Chinese";
  if (rules.Japanese) return "Japanese";
  if (rules.Korean) return "Korean";
  if (rules.Ing) return "Ing";
  if (rules.Custom) return rules.Custom;
  return "Unknown";
}

export function getPlayerName(player: Player): string {
  if (player.Id) {
    const playerEntry = Object.entries(playerNames).find(
      ([_, data]) => data.id === player.Id![0],
    );
    if (!playerEntry) return `Player ${player.Id![0]}`;

    const [name, data] = playerEntry;
    const preferredName = data.aliases.find((alias: PlayerAlias) =>
      alias.languages.some(
        (lang: PlayerAliasLanguage) => lang.language === "en" && lang.preferred,
      ),
    );

    return preferredName ? preferredName.name : name;
  }
  return player.Unknown || "Unknown";
}
