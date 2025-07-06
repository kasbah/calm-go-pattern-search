import { type BoardPosition, emptyBoard, SabakiSign } from "@/sabaki-types";

/**
 * Serializes a board position to a compact URL-safe string
 */
export function serializeBoardToUrl(board: BoardPosition): string {
  // Convert 2D array to flat array
  const flatBoard = board.flat();

  // Use run-length encoding for compression
  const encoded: string[] = [];
  let currentValue = flatBoard[0];
  let count = 1;

  for (let i = 1; i < flatBoard.length; i++) {
    if (flatBoard[i] === currentValue) {
      count++;
    } else {
      // Encode current run
      if (count === 1) {
        encoded.push(currentValue.toString());
      } else {
        encoded.push(`${currentValue}x${count}`);
      }
      currentValue = flatBoard[i];
      count = 1;
    }
  }

  // Don't forget the last run
  if (count === 1) {
    encoded.push(currentValue.toString());
  } else {
    encoded.push(`${currentValue}x${count}`);
  }

  return encoded.join(".");
}

/**
 * Deserializes a URL string back to a board position
 */
export function deserializeBoardFromUrl(urlString: string): BoardPosition {
  if (!urlString || urlString === "") {
    return emptyBoard;
  }

  try {
    const parts = urlString.split(".");
    const flatBoard: SabakiSign[] = [];

    for (const part of parts) {
      if (part.includes("x")) {
        // Run-length encoded
        const [value, countStr] = part.split("x");
        const count = parseInt(countStr, 10);
        const signValue = parseInt(value, 10) as SabakiSign;
        for (let i = 0; i < count; i++) {
          flatBoard.push(signValue);
        }
      } else {
        // Single value
        flatBoard.push(parseInt(part, 10) as SabakiSign);
      }
    }

    // Convert flat array back to 2D array (19x19)
    const board: BoardPosition = [];
    for (let y = 0; y < 19; y++) {
      const row: SabakiSign[] = [];
      for (let x = 0; x < 19; x++) {
        const index = y * 19 + x;
        row.push(flatBoard[index] || SabakiSign.Empty);
      }
      board.push(row);
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
  const boardParam = urlParams.get("board");
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
    urlParams.delete("board");
  } else {
    const serialized = serializeBoardToUrl(board);
    urlParams.set("board", serialized);
  }

  const newUrl = `${window.location.pathname}${urlParams.toString() ? "?" + urlParams.toString() : ""}`;
  window.history.replaceState({}, "", newUrl);
}
