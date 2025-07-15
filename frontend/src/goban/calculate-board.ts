import GoBoard from "@sabaki/go-board";
import {
  emptyBoard,
  type BoardPosition,
  type SabakiMove,
} from "@/sabaki-types";

// LRU Cache for memoization
class LRUCache<K, V> {
  private maxSize: number;
  private cache = new Map<K, V>();

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Cache instance for board position calculations
const boardPositionCache = new LRUCache<string, BoardPosition>(1000);

/**
 * Creates a cache key for the given moves and move number
 */
function createCacheKey(moves: Array<SabakiMove>, moveNumber: number): string {
  // Only include moves up to moveNumber for the cache key
  const relevantMoves = moves.slice(0, moveNumber + 1);
  const movesKey = relevantMoves
    .map((move) => `${move.color}:${move.point.x},${move.point.y}`)
    .join("|");
  return `${movesKey}#${moveNumber}`;
}

/**
 * Calculates the board position after playing a sequence of moves up to a given move number.
 * Results are memoized for improved performance on repeated calculations.
 *
 * @param moves - Array of moves in Sabaki format
 * @param moveNumber - The move number to calculate up to (0-based). Use -1 for empty board.
 * @returns The board position as a signMap
 */
export function calculateBoardPosition(
  moves: Array<SabakiMove>,
  moveNumber: number,
): BoardPosition {
  // If moveNumber is -1, return empty board (no caching needed)
  if (moveNumber < 0) {
    const board = new GoBoard(emptyBoard);
    return board.signMap;
  }

  // Check cache first
  const cacheKey = createCacheKey(moves, moveNumber);
  const cachedResult = boardPositionCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  // Calculate the board position
  let board = new GoBoard(emptyBoard);
  for (let i = 0; i <= moveNumber; i++) {
    const move = moves[i];
    if (!move) break;
    board = board.makeMove(move.color, [move.point.x, move.point.y]);
  }

  const result = board.signMap;

  // Store in cache
  boardPositionCache.set(cacheKey, result);

  return result;
}

/**
 * Clears the memoization cache for board position calculations.
 * Useful for memory management or when you want to ensure fresh calculations.
 */
export function clearBoardPositionCache(): void {
  boardPositionCache.clear();
}
