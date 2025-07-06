import { type BoardPosition, emptyBoard, SabakiSign } from "@/sabaki-types";

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
 * Gets the current board state from URL parameters
 */
export function getBoardFromUrl(): BoardPosition {
  const urlParams = new URLSearchParams(window.location.search);
  const boardParam = urlParams.get("pattern");
  return boardParam ? deserializeBoardFromUrl(boardParam) : emptyBoard;
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
