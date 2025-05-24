//@ts-ignore
import { Point, Color } from "rust-pattern-search";
import React, { useState, useEffect } from "react";
import { useWindowSize } from "@reach/window-size";
import { BoundedGoban, Vertex } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";

export type BoardPosition = Array<Array<Color>>;

const SabakiColor = Object.freeze({
  Black: 1,
  White: -1,
  Empty: 0,
});

type SabakiColorT = (typeof SabakiColor)[keyof typeof SabakiColor];

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
  const brush =
    brushColor === Color.Black
      ? SabakiColor.Black
      : brushColor === Color.White
        ? SabakiColor.White
        : SabakiColor.Empty;

  const board = defaultSignMap.map((row, y) =>
    row.map((_, x) =>
      boardPosition[x]?.[y] == null
        ? SabakiColor.Empty
        : boardPosition[x][y] === Color.White
          ? SabakiColor.White
          : SabakiColor.Black,
    ),
  );

  const windowSize = useWindowSize();
  const [hoverVertex, setHoverVertex] = useState<Vertex | null>(null);
  const [signMap, setSignMap] = useState(defaultSignMap);
  const [ghostStoneMap, setGhostStoneMap] = useState([]);
  const [dimmedVertices, setDimmedVertices] = useState<Array<Vertex>>([]);
  const [hoverSignMap, setHoverSignMap] = useState(defaultSignMap);

  useEffect(() => {
    if (hoverVertex == null) {
      setDimmedVertices([]);
    } else {
      setDimmedVertices([[...hoverVertex]]);
    }
  }, [hoverVertex]);

  useEffect(() => {}, [dimmedVertices]);

  useEffect(() => {
    const g = board.map((row, y) =>
      row.map((currentColor, x) => {
        let nextColor: SabakiColorT = currentColor;
        if (
          hoverVertex != null &&
          hoverVertex[0] === x &&
          hoverVertex[1] === y
        ) {
          if (currentColor !== SabakiColor.Empty) {
            nextColor =
              currentColor === SabakiColor.Black
                ? SabakiColor.White
                : SabakiColor.Black;
          } else {
            nextColor = brush;
          }
        }
        return nextColor;
      }),
    );
    setSignMap(g);
  }, [board, hoverVertex]);

  return (
    <BoundedGoban
      animateStonePlacement={false}
      fuzzyStonePlacement={false}
      ghostStoneMap={ghostStoneMap}
      maxHeight={windowSize.height - 20}
      maxWidth={windowSize.width * 0.8}
      showCoordinates={true}
      signMap={signMap}
      dimmedVertices={dimmedVertices}
      onVertexClick={(e, vertex) => {
        setHoverVertex(null);
        onVertexClick(e, vertex);
      }}
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
