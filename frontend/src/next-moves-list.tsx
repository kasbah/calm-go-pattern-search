import { type NextMove } from "@/wasm-search-types";
import { SabakiColor } from "@/sabaki-types";
import { cn } from "@/utils";

interface NextMovesListProps {
  nextMoves: NextMove[];
  isLoading?: boolean;
  brushColor: SabakiColor;
  onMoveHover?: (point: { x: number; y: number }) => void;
  onMoveUnhover?: () => void;
  onMoveClick?: (point: { x: number; y: number }) => void;
}

export default function NextMovesList({
  nextMoves,
  isLoading = false,
  brushColor,
  onMoveHover,
  onMoveUnhover,
  onMoveClick,
}: NextMovesListProps) {
  const maxGameCount = Math.max(...nextMoves.map((move) => move.game_count));

  return (
    <div
      className={cn(
        "grid grid-flow-col grid-rows-5 h-[252px] max-h-[252px]",
        "w-[334px] max-w-[334px] gap-2",
      )}
    >
      {nextMoves.length > 0 && !isLoading && (
        <div className="text-lg font-bold text-gray-900 flex items-center pl-4">
          Next moves
        </div>
      )}
      {nextMoves.length > 0 &&
        !isLoading &&
        nextMoves.map((move, index) => {
          const color =
            brushColor === SabakiColor.Black ? "#9b9b9b" : "whitesmoke";
          const strokeColor = color === "whitesmoke" ? "grey" : "white";
          const textColor = color === "whitesmoke" ? "black" : "white";

          const svg = `
            <svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="0.484"
                cy="0.484"
                r="0.4"
                vector-effect="non-scaling-stroke"
                fill="${color}"
                stroke="${strokeColor}"
              />
            </svg>
          `;
          const encodedSvg = encodeURIComponent(svg.trim());
          const svgBackground = `url("data:image/svg+xml;charset=utf-8,${encodedSvg}")`;

          const barWidth =
            maxGameCount > 0 ? (move.game_count / maxGameCount) * 100 : 0;

          return (
            <div
              key={index}
              className={cn(
                "relative flex justify-start items-center px-2 py-1",
                "bg-gray-50 rounded hover:bg-gray-100 transition-colors",
                "w-[160px] max-w-[160px] max-h-[42px] cursor-pointer overflow-hidden",
              )}
              onMouseEnter={() => onMoveHover?.(move.point)}
              onMouseLeave={() => onMoveUnhover?.()}
              onClick={() => onMoveClick?.(move.point)}
            >
              <div
                className={cn(
                  "absolute left-0 bottom-0 h-1 bg-gray-200",
                  "rounded-b transition-all duration-300",
                )}
                style={{ width: `${barWidth}%` }}
              />
              <div
                className={cn(
                  "relative w-[24px] h-[24px] flex items-center justify-center z-10",
                )}
                style={{
                  backgroundImage: svgBackground,
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
              >
                <span
                  className="font-medium text-sm"
                  style={{
                    color: textColor,
                    marginTop: "-0.1em",
                    marginLeft: "-0.07em",
                  }}
                >
                  {index + 1}
                </span>
              </div>
              <span
                className={cn(
                  "relative font-medium text-base text-gray-900 ml-1 z-10",
                )}
              >
                {move.game_count} game{move.game_count === 1 ? "" : "s"}
              </span>
            </div>
          );
        })}
    </div>
  );
}
