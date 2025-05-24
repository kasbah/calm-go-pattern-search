//@ts-ignore
import { Point, Color } from "rust-pattern-search";
import React, { useState, useEffect } from "react";
import { useWindowSize } from "@reach/window-size";
import { BoundedGoban } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";

export type BoardPosition = Array<Array<Color>>;

/*prettier-ignore*/
const defaultSignMap = [
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0, /*, */ 0, 0, 0, /*, */ 0, 0, 0, /* */ 0, 0, 0, /* */ 0],
];

export type GobanProps = {
  brushColor: Color;
  onVertexClick: (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    vertex: [number, number],
  ) => void;
  boardPosition: BoardPosition;
};

export default function Goban({
  brushColor,
  onVertexClick,
  boardPosition,
}: GobanProps) {
  const windowSize = useWindowSize();
  const [hoverVertex, setHoverVertex] = useState(null);
  const [signMap, setSignMap] = useState(defaultSignMap);
  const [ghostStoneMap, setGhostStoneMap] = useState([]);

  useEffect(() => {
    const ghostStone = { sign: brushColor == Color.White ? -1 : 1 };
    const g = signMap.map((row, y) =>
      row.map((_, x) =>
        hoverVertex != null && hoverVertex[0] === x && hoverVertex[1] === y
          ? ghostStone
          : null,
      ),
    );
    setGhostStoneMap(g);
  }, [hoverVertex, signMap, brushColor]);

  useEffect(() => {
    const g = signMap.map((row, y) =>
      row.map((_, x) =>
        boardPosition[x]?.[y] != null
          ? boardPosition[x][y] === Color.White
            ? -1
            : 1
          : 0,
      ),
    );
    setSignMap(g);
  }, [boardPosition]);

  return (
    <BoundedGoban
      animateStonePlacement={false}
      fuzzyStonePlacement={false}
      ghostStoneMap={ghostStoneMap}
      maxHeight={windowSize.height - 20}
      maxWidth={windowSize.width * 0.8}
      showCoordinates={true}
      signMap={signMap}
      onVertexClick={onVertexClick}
      onVertexMouseEnter={(e, vertex) => {
        setHoverVertex(vertex);
      }}
      onVertexMouseLeave={(e, vertex) => {
        setHoverVertex((v) => {
          if (v != null && v[0] === vertex[0] && v[1] === vertex[1]) {
            return null;
          }
          return v;
        });
      }}
    />
  );
}
