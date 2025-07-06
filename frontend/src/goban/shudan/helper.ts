export type Vertex = [x: number, y: number];
export type Map<T> = T[][];

export const alpha = "ABCDEFGHJKLMNOPQRSTUVWXYZ";

export const vertexEvents = [
  "Click",
  "MouseDown",
  "MouseUp",
  "MouseMove",
  "MouseEnter",
  "MouseLeave",
  "PointerDown",
  "PointerUp",
  "PointerMove",
  "PointerEnter",
  "PointerLeave",
] as const;

export type VertexEvent = (typeof vertexEvents)[number];

export const avg = (xs: number[]): number =>
  xs.length === 0 ? 0 : xs.reduce((sum, x) => sum + x, 0) / xs.length;

export const range = (n: number): number[] =>
  Array(n)
    .fill(0)
    .map((_, i) => i);

export const vertexEquals = ([x1, y1]: Vertex, [x2, y2]: Vertex): boolean =>
  x1 === x2 && y1 === y2;

export const lineEquals = (
  [v1, w1]: [Vertex, Vertex],
  [v2, w2]: [Vertex, Vertex],
): boolean => vertexEquals(v1, v2) && vertexEquals(w1, w2);

export const signEquals = (...xs: number[]): boolean =>
  xs.length === 0 ? true : xs.every((x) => Math.sign(x) === Math.sign(xs[0]));

export function getHoshis(width: number, height: number): Vertex[] {
  if (Math.min(width, height) <= 6) return [];

  const [nearX, nearY] = [width, height].map((x) => (x >= 13 ? 3 : 2));
  const [farX, farY] = [width - nearX - 1, height - nearY - 1];
  const [middleX, middleY] = [width, height].map((x) => (x - 1) / 2);

  const result: Vertex[] = [
    [nearX, farY],
    [farX, nearY],
    [farX, farY],
    [nearX, nearY],
  ];

  if (width % 2 !== 0 && height % 2 !== 0 && width !== 7 && height !== 7)
    result.push([middleX, middleY]);
  if (width % 2 !== 0 && width !== 7)
    result.push([middleX, nearY], [middleX, farY]);
  if (height % 2 !== 0 && height !== 7)
    result.push([nearX, middleY], [farX, middleY]);

  return result;
}
