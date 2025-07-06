import { current, isDraft } from "immer";
import { type Vertex, type Map } from "./helper";

// Immer-aware comparison utilities
export const immerEquals = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  // Handle Immer drafts
  if (isDraft(a) || isDraft(b)) {
    return current(a as object) === current(b as object);
  }

  return false;
};

export const deepImmerEquals = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;

  // Handle Immer drafts
  const actualA = isDraft(a) ? current(a as object) : a;
  const actualB = isDraft(b) ? current(b as object) : b;

  if (actualA === actualB) return true;

  // Handle arrays
  if (Array.isArray(actualA) && Array.isArray(actualB)) {
    if (actualA.length !== actualB.length) return false;
    return actualA.every((item, index) =>
      deepImmerEquals(item, actualB[index]),
    );
  }

  // Handle objects
  if (
    actualA &&
    actualB &&
    typeof actualA === "object" &&
    typeof actualB === "object"
  ) {
    const keysA = Object.keys(actualA);
    const keysB = Object.keys(actualB);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      deepImmerEquals(
        (actualA as Record<string, unknown>)[key],
        (actualB as Record<string, unknown>)[key],
      ),
    );
  }

  return false;
};

export const vertexEqualsImmer = (v1: Vertex, v2: Vertex): boolean => {
  const actualV1 = isDraft(v1) ? current(v1) : v1;
  const actualV2 = isDraft(v2) ? current(v2) : v2;
  return actualV1[0] === actualV2[0] && actualV1[1] === actualV2[1];
};

export const lineEqualsImmer = (
  [v1, w1]: [Vertex, Vertex],
  [v2, w2]: [Vertex, Vertex],
): boolean => vertexEqualsImmer(v1, v2) && vertexEqualsImmer(w1, w2);

export const mapEquals = <T>(mapA: Map<T>, mapB: Map<T>): boolean => {
  if (mapA === mapB) return true;

  const actualA = isDraft(mapA) ? current(mapA) : mapA;
  const actualB = isDraft(mapB) ? current(mapB) : mapB;

  if (actualA === actualB) return true;
  if (!actualA || !actualB) return false;
  if (actualA.length !== actualB.length) return false;

  return actualA.every((row, y) => {
    const rowB = actualB[y];
    if (!row || !rowB) return row === rowB;
    if (row.length !== rowB.length) return false;
    return row.every((cell, x) => cell === rowB[x]);
  });
};
