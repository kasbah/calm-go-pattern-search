import React, { memo, useMemo } from "react";
import { type Vertex } from "./helper";

// Static styles to avoid recreation
const svgContainerStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  zIndex: 0,
};

interface GridProps {
  vertexSize: number;
  width: number;
  height: number;
  xs: number[];
  ys: number[];
  hoshis: Vertex[];
}

const Grid = memo(function Grid(props: GridProps) {
  const { vertexSize, width, height, xs, ys, hoshis } = props;
  const halfVertexSize = vertexSize / 2;
  const fl = Math.floor;

  // Memoize horizontal grid lines
  const horizontalLines = useMemo(() => {
    if (xs.length === 0 || ys.length === 0) return [];

    const x = xs[0] === 0 ? halfVertexSize : 0;
    const lineWidth =
      xs[xs.length - 1] === width - 1
        ? (2 * xs.length - 1) * halfVertexSize - x
        : xs.length * vertexSize - x;

    return ys.map((_, i) => (
      <rect
        key={`h${i}`}
        className="shudan-gridline shudan-horizontal"
        x={fl(x)}
        y={fl((2 * i + 1) * halfVertexSize - 0.5)}
        width={lineWidth}
        height={1}
      />
    ));
  }, [xs, ys, vertexSize, halfVertexSize, width, fl]);

  // Memoize vertical grid lines
  const verticalLines = useMemo(() => {
    if (xs.length === 0 || ys.length === 0) return [];

    const y = ys[0] === 0 ? halfVertexSize : 0;
    const lineHeight =
      ys[ys.length - 1] === height - 1
        ? (2 * ys.length - 1) * halfVertexSize - y
        : ys.length * vertexSize - y;

    return xs.map((_, i) => (
      <rect
        key={`v${i}`}
        className="shudan-gridline shudan-vertical"
        x={fl((2 * i + 1) * halfVertexSize - 0.5)}
        y={fl(y)}
        width={1}
        height={lineHeight}
      />
    ));
  }, [xs, ys, vertexSize, halfVertexSize, height, fl]);

  // Memoize hoshi points
  const hoshiPoints = useMemo(() => {
    if (xs.length === 0 || ys.length === 0) return [];

    return hoshis
      .map(([x, y]) => {
        const i = xs.indexOf(x);
        const j = ys.indexOf(y);
        if (i < 0 || j < 0) return null;

        return (
          <circle
            key={[x, y].join("-")}
            className="shudan-hoshi"
            cx={fl((2 * i + 1) * halfVertexSize - 0.5) + 0.5}
            cy={fl((2 * j + 1) * halfVertexSize - 0.5) + 0.5}
            r=".1em"
          />
        );
      })
      .filter(Boolean);
  }, [hoshis, xs, ys, halfVertexSize, fl]);

  if (xs.length === 0 || ys.length === 0) {
    return null;
  }

  return (
    <svg className="shudan-grid" style={svgContainerStyle}>
      {horizontalLines}
      {verticalLines}
      {hoshiPoints}
    </svg>
  );
});

export default Grid;
