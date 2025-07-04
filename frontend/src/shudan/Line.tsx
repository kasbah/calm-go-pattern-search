import { memo, useMemo } from "react";
import { vertexEquals, type Vertex } from "./helper";

interface LineProps {
  v1: Vertex;
  v2: Vertex;
  type?: "line" | "arrow";
  vertexSize: number;
}

const Line = memo(function Line({
  v1,
  v2,
  type = "line",
  vertexSize,
}: LineProps) {
  // Memoize expensive calculations
  const calculations = useMemo(() => {
    const [pos1, pos2] = [v1, v2].map((v) => v.map((x) => x * vertexSize));
    const [dx, dy] = pos1.map((x, i) => pos2[i] - x);
    const [left, top] = pos1.map((x, i) => (x + pos2[i] + vertexSize) / 2);

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const length = Math.sqrt(dx * dx + dy * dy);
    const right = left + length;

    return { left, top, angle, length, right };
  }, [v1, v2, vertexSize]);

  // Memoize arrow path calculation
  const arrowPath = useMemo(() => {
    if (type !== "arrow") return "";

    const { right, top } = calculations;
    const [x1, y1] = [right - vertexSize / 2, top - vertexSize / 4];
    const [x2, y2] = [right - vertexSize / 2, top + vertexSize / 4];

    return `L ${x1} ${y1} M ${right} ${top} L ${x2} ${y2}`;
  }, [type, calculations, vertexSize]);

  // Memoize path data
  const pathData = useMemo(() => {
    const { left, top, length } = calculations;
    return `M ${left} ${top} h ${length} ${arrowPath}`;
  }, [calculations, arrowPath]);

  // Memoize transform
  const transform = useMemo(() => {
    const { angle, left, top, length } = calculations;
    return `rotate(${angle} ${left} ${top}) translate(${-length / 2} 0)`;
  }, [calculations]);

  // Early return for same vertices
  if (vertexEquals(v1, v2)) return null;

  return (
    <path className={`shudan-${type}`} d={pathData} transform={transform} />
  );
});

export default Line;
