import GoBoard from "@sabaki/go-board";
import {
  emptyBoard,
  type BoardPosition,
  type SabakiMove,
} from "@/sabaki-types";

/**
 * Calculates the board position after playing a sequence of moves up to a given move number.
 *
 * @param moves - Array of moves in Sabaki format
 * @param moveNumber - The move number to calculate up to (0-based). Use -1 for empty board.
 * @returns The board position as a signMap
 */
export function calculateBoardPosition(
  moves: Array<SabakiMove>,
  moveNumber: number,
): BoardPosition {
  let board = new GoBoard(emptyBoard);

  // If moveNumber is -1, return empty board
  if (moveNumber < 0) {
    return board.signMap;
  }

  for (let i = 0; i <= moveNumber; i++) {
    const move = moves[i];
    if (!move) break;
    board = board.makeMove(move.color, [move.point.x, move.point.y]);
  }

  return board.signMap;
}
