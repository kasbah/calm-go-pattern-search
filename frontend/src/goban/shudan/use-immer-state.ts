import { useCallback } from "react";
import { useImmer } from "use-immer";
import { produce, type Draft } from "immer";
import { type Vertex, type Map } from "./helper";

// Hook for managing Immer state with Shudan-specific utilities
export function useImmerGobanState<T>(initialState: T) {
  const [state, updateState] = useImmer(initialState);

  const setState = useCallback(
    (updater: (draft: Draft<T>) => void | T) => {
      updateState(updater);
    },
    [updateState],
  );

  const resetState = useCallback(() => {
    updateState(initialState);
  }, [updateState, initialState]);

  return [state, setState, resetState] as const;
}

// Utility for updating a map at a specific vertex
export function updateMapAtVertex<T>(
  map: Map<T>,
  vertex: Vertex,
  value: T,
): Map<T> {
  return produce(map, (draft) => {
    const [x, y] = vertex;
    if (!draft[y]) {
      draft[y] = [];
    }
    draft[y][x] = value as Draft<T>;
  });
}

// Utility for updating multiple vertices in a map
export function updateMapAtVertices<T>(
  map: Map<T>,
  updates: Array<{ vertex: Vertex; value: T }>,
): Map<T> {
  return produce(map, (draft) => {
    updates.forEach(({ vertex, value }) => {
      const [x, y] = vertex;
      if (!draft[y]) {
        draft[y] = [];
      }
      draft[y][x] = value as Draft<T>;
    });
  });
}

// Utility for clearing a map at specific vertices
export function clearMapAtVertices<T>(
  map: Map<T>,
  vertices: Vertex[],
  defaultValue: T,
): Map<T> {
  return produce(map, (draft) => {
    vertices.forEach(([x, y]) => {
      if (draft[y]) {
        draft[y][x] = defaultValue as Draft<T>;
      }
    });
  });
}

// Utility for resizing a map
export function resizeMap<T>(
  map: Map<T>,
  width: number,
  height: number,
  defaultValue: T,
): Map<T> {
  return produce(map, (draft) => {
    // Adjust height
    while (draft.length < height) {
      draft.push([]);
    }
    draft.length = height;

    // Adjust width for each row
    for (let y = 0; y < height; y++) {
      if (!draft[y]) {
        draft[y] = [];
      }
      while (draft[y].length < width) {
        draft[y].push(defaultValue as Draft<T>);
      }
      draft[y].length = width;
    }
  });
}

// Utility for batch updating multiple maps
export function batchUpdateMaps<T>(
  maps: { [key: string]: Map<T> },
  updates: Array<{
    mapKey: string;
    vertex: Vertex;
    value: T;
  }>,
): { [key: string]: Map<T> } {
  return produce(maps, (draft) => {
    updates.forEach(({ mapKey, vertex, value }) => {
      if (!draft[mapKey]) {
        draft[mapKey] = [];
      }
      const [x, y] = vertex;
      if (!draft[mapKey][y]) {
        draft[mapKey][y] = [];
      }
      draft[mapKey][y][x] = value as Draft<T>;
    });
  });
}

// Hook for managing selected vertices with Immer
export function useImmerSelection(initialSelection: Vertex[] = []) {
  const [selection, updateSelection] = useImmer(initialSelection);

  const toggleVertex = useCallback(
    (vertex: Vertex) => {
      updateSelection((draft) => {
        const index = draft.findIndex(
          ([x, y]) => x === vertex[0] && y === vertex[1],
        );
        if (index >= 0) {
          draft.splice(index, 1);
        } else {
          draft.push(vertex as Draft<Vertex>);
        }
      });
    },
    [updateSelection],
  );

  const addVertex = useCallback(
    (vertex: Vertex) => {
      updateSelection((draft) => {
        const exists = draft.some(
          ([x, y]) => x === vertex[0] && y === vertex[1],
        );
        if (!exists) {
          draft.push(vertex as Draft<Vertex>);
        }
      });
    },
    [updateSelection],
  );

  const removeVertex = useCallback(
    (vertex: Vertex) => {
      updateSelection((draft) => {
        const index = draft.findIndex(
          ([x, y]) => x === vertex[0] && y === vertex[1],
        );
        if (index >= 0) {
          draft.splice(index, 1);
        }
      });
    },
    [updateSelection],
  );

  const clearSelection = useCallback(() => {
    updateSelection([]);
  }, [updateSelection]);

  const isSelected = useCallback(
    (vertex: Vertex) => {
      return selection.some(([x, y]) => x === vertex[0] && y === vertex[1]);
    },
    [selection],
  );

  return {
    selection,
    toggleVertex,
    addVertex,
    removeVertex,
    clearSelection,
    isSelected,
  };
}

// Hook for managing ranges with Immer
export function useImmerRange(
  initialRangeX: [number, number] = [0, Infinity],
  initialRangeY: [number, number] = [0, Infinity],
) {
  const [rangeX, setRangeX] = useImmer(initialRangeX);
  const [rangeY, setRangeY] = useImmer(initialRangeY);

  const updateRangeX = useCallback(
    (start: number, end: number) => {
      setRangeX([start, end]);
    },
    [setRangeX],
  );

  const updateRangeY = useCallback(
    (start: number, end: number) => {
      setRangeY([start, end]);
    },
    [setRangeY],
  );

  const resetRanges = useCallback(() => {
    setRangeX(initialRangeX);
    setRangeY(initialRangeY);
  }, [setRangeX, setRangeY, initialRangeX, initialRangeY]);

  return {
    rangeX,
    rangeY,
    updateRangeX,
    updateRangeY,
    resetRanges,
  };
}
