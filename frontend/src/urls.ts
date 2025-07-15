import { type BoardPosition, emptyBoard, SabakiSign } from "@/sabaki-types";
import { type PlayerFilter } from "@/wasm-search-types";
import { SortBy } from "../../rust/wasm-search/pkg/wasm_search";

/**
 * Serializes a board position to a compact URL-safe string
 * Only encodes non-empty positions in format "A19b" where A19 is position and b/w is stone color
 */
export function serializeBoardToUrl(board: BoardPosition): string {
  const nonEmptyPositions: string[] = [];
  const columns = "ABCDEFGHJKLMNOPQRST"; // Go board columns (no I)

  for (let y = 0; y < board.length; y++) {
    for (let x = 0; x < board[y].length; x++) {
      if (board[y][x] !== SabakiSign.Empty) {
        const col = columns[x];
        const row = (19 - y).toString(); // Go coordinates are bottom-up
        const value = board[y][x] === SabakiSign.Black ? "b" : "w";
        nonEmptyPositions.push(`${col}${row}${value}`);
      }
    }
  }

  return nonEmptyPositions.join("-");
}

/**
 * Deserializes a URL string back to a board position
 */
export function deserializeBoardFromUrl(urlString: string): BoardPosition {
  if (!urlString || urlString === "") {
    return emptyBoard;
  }

  try {
    // Start with empty board
    const board: BoardPosition = Array(19)
      .fill(null)
      .map(() => Array(19).fill(SabakiSign.Empty));

    const columns = "ABCDEFGHJKLMNOPQRST"; // Go board columns (no I)

    // Parse positions separated by dashes
    const positions = urlString.split("-");
    for (const position of positions) {
      if (position.trim()) {
        const col = position[0];
        const x = columns.indexOf(col);

        if (x === -1) continue;

        // Extract row number and value (last character is value)
        const rowStr = position.slice(1, -1);
        const valueStr = position.slice(-1);

        const row = parseInt(rowStr, 10);
        const value =
          valueStr === "b"
            ? SabakiSign.Black
            : valueStr === "w"
              ? SabakiSign.White
              : SabakiSign.Empty;
        const y = 19 - row; // Convert to 0-based, top-down

        if (
          row >= 1 &&
          row <= 19 &&
          x >= 0 &&
          x < 19 &&
          (value === SabakiSign.Black || value === SabakiSign.White)
        ) {
          board[y][x] = value;
        }
      }
    }

    return board;
  } catch (error) {
    console.warn("Failed to deserialize board from URL:", error);
    return emptyBoard;
  }
}

/**
 * Serializes player filters to a URL-safe string
 * Format: "123b[vs]456w[vs]789a" where 123 is player_id, b/w/a is color (black/white/any)
 */
export function serializePlayerFiltersToUrl(filters: PlayerFilter[]): string {
  if (!filters || filters.length === 0) {
    return "";
  }

  return filters
    .map((filter) => {
      const colorCode =
        filter.color === "Black" ? "b" : filter.color === "White" ? "w" : "a";
      return `${filter.player_id}${colorCode}`;
    })
    .join("[vs]");
}

/**
 * Deserializes player filters from a URL string
 */
export function deserializePlayerFiltersFromUrl(
  urlString: string,
): PlayerFilter[] {
  if (!urlString || urlString === "") {
    return [];
  }

  try {
    const filters: PlayerFilter[] = [];
    const parts = urlString.split("[vs]");

    for (const part of parts) {
      if (part.trim()) {
        const colorCode = part.slice(-1);
        const playerIdStr = part.slice(0, -1);

        const playerId = parseInt(playerIdStr, 10);
        if (isNaN(playerId)) continue;

        const color =
          colorCode === "b" ? "Black" : colorCode === "w" ? "White" : null;
        filters.push({ player_id: playerId, color });
      }
    }

    return filters;
  } catch (error) {
    console.warn("Failed to deserialize player filters from URL:", error);
    return [];
  }
}

/**
 * Gets the current board state from URL parameters
 */
export function getBoardFromUrl(): BoardPosition {
  const urlParams = new URLSearchParams(window.location.search);
  const boardParam = urlParams.get("pattern");
  return boardParam ? deserializeBoardFromUrl(boardParam) : emptyBoard;
}

/**
 * Gets player filters from URL parameters
 */
export function getPlayerFiltersFromUrl(): PlayerFilter[] {
  const urlParams = new URLSearchParams(window.location.search);
  const playerFiltersParam = urlParams.get("players");
  return playerFiltersParam
    ? deserializePlayerFiltersFromUrl(playerFiltersParam)
    : [];
}

/**
 * Updates the URL with the current board state
 */
export function updateUrlWithBoard(board: BoardPosition): void {
  const urlParams = new URLSearchParams(window.location.search);

  // Check if board is empty
  const isEmpty = board.every((row) =>
    row.every((cell) => cell === SabakiSign.Empty),
  );

  if (isEmpty) {
    urlParams.delete("pattern");
  } else {
    const serialized = serializeBoardToUrl(board);
    urlParams.set("pattern", serialized);
  }

  const newUrl = `${window.location.pathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}`;
  window.history.replaceState({}, "", newUrl);
}

/**
 * Updates the URL with player filters
 */
export function updateUrlWithPlayerFilters(filters: PlayerFilter[]): void {
  const urlParams = new URLSearchParams(window.location.search);

  if (!filters || filters.length === 0) {
    urlParams.delete("players");
  } else {
    const serialized = serializePlayerFiltersToUrl(filters);
    urlParams.set("players", serialized);
  }

  const newUrl = `${window.location.pathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}`;
  window.history.replaceState({}, "", newUrl);
}

/**
 * Updates the URL with both board state and player filters
 */
export function updateUrlParams(
  board: BoardPosition,
  filters: PlayerFilter[],
  sortBy: SortBy,
): void {
  const urlParams = new URLSearchParams(window.location.search);

  // Handle board state
  const isEmpty = board.every((row) =>
    row.every((cell) => cell === SabakiSign.Empty),
  );

  if (isEmpty) {
    urlParams.delete("pattern");
  } else {
    const serialized = serializeBoardToUrl(board);
    urlParams.set("pattern", serialized);
  }

  // Handle player filters
  if (!filters || filters.length === 0) {
    urlParams.delete("players");
  } else {
    const serialized = serializePlayerFiltersToUrl(filters);
    urlParams.set("players", serialized);
  }

  if (sortBy === SortBy.BestMatch) {
    urlParams.delete("sort_by");
  } else {
    urlParams.set("sort_by", "least_moves");
  }

  const newUrl = `${window.location.pathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}`;
  window.history.replaceState({}, "", newUrl);
}

export type GameFromUrl = {
  path: string;
  rotation: number;
  isMirrored: boolean;
  isInverted: boolean;
  lastMoveMatched: number;
  moveNumber: number;
};

/**
 * Gets the selected game path, rotation, is_mirrored, colors inverted, last move matched, and move number from URL
 */
export function getSelectedGameFromUrl(): GameFromUrl | null {
  console.log("getSelectedGameFromUrl");
  const urlParams = new URLSearchParams(window.location.search);
  const path = window.location.pathname.startsWith("/game/")
    ? window.location.pathname.replace(/^\/game\//, "")
    : null;
  const rotation = parseInt(urlParams.get("rotation") || "0", 10);
  const isMirrored = urlParams.get("mirrored") === "1";
  const isInverted = urlParams.get("inverted") === "1";
  const lastMoveMatched = parseInt(urlParams.get("matched_move") || "1", 10);
  const moveNumber = parseInt(
    urlParams.get("move") || urlParams.get("matched_move") || "1",
    10,
  );
  if (path == null) {
    return null;
  }
  return {
    path,
    rotation: isNaN(rotation) ? 0 : rotation,
    isMirrored,
    isInverted,
    lastMoveMatched: isNaN(lastMoveMatched) ? 0 : lastMoveMatched - 1,
    moveNumber: isNaN(moveNumber) ? 0 : moveNumber - 1,
  };
}

/**
 * Updates the URL with the selected game path, rotation, is_mirrored, colors inverted, last move matched, and move number
 */
export function updateUrlWithSelectedGame(
  path: string,
  rotation: number,
  isMirrored: boolean,
  isInverted: boolean,
  lastMoveMatched: number,
  moveNumber: number,
): void {
  const urlParams = new URLSearchParams(window.location.search);
  const originalPathname = window.location.pathname;

  let newPathname = "/";
  if (path) {
    newPathname = `/game/${path}`;

    // Set query parameters when a game is selected
    urlParams.set("rotation", rotation.toString());
    urlParams.set("mirrored", isMirrored ? "1" : "0");
    urlParams.set("inverted", isInverted ? "1" : "0");
    urlParams.set("matched_move", (lastMoveMatched + 1).toString());
    urlParams.set("move", (moveNumber + 1).toString());
  } else {
    // Clear game-related query parameters when no game is selected
    urlParams.delete("rotation");
    urlParams.delete("mirrored");
    urlParams.delete("inverted");
    urlParams.delete("matched_move");
    urlParams.delete("move");
  }

  const newUrl = `${newPathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}`;

  if (newPathname !== originalPathname) {
    window.history.pushState({}, "", newUrl);
  } else {
    window.history.replaceState({}, "", newUrl);
  }
}

export function getSortByFromUrl(): SortBy {
  const urlParams = new URLSearchParams(window.location.search);
  const sortByParam = urlParams.get("sort_by");
  if (sortByParam === "least_moves") {
    return SortBy.LeastMoves;
  }
  return SortBy.BestMatch;
}
