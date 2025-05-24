import React, { useState, useEffect } from "react";
import { useWindowSize } from "@reach/window-size";
import { BoundedGoban } from "@sabaki/shudan";
import "@sabaki/shudan/css/goban.css";
import "./Goban.css";

const defaultSignMap = [
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],

  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],
  [0, 0, 0, /* */ 0, 0, 0, /* */ 0, 0, 0],
];

export default function Goban() {
  const windowSize = useWindowSize();
  const [hoverVertex, setHoverVertex] = useState(null);
  const [signMap, setSignMap] = useState(defaultSignMap);
  const [ghostStoneMap, setGhostStoneMap] = useState([]);

  useEffect(() => {
    // appears as a grey dot when we use sign = 1
    const ghostStone = { sign: 1 };
    const g = signMap.map((row, y) =>
      row.map((_, x) =>
        hoverVertex != null && hoverVertex[0] === x && hoverVertex[1] === y
          ? ghostStone
          : null,
      ),
    );
    setGhostStoneMap(g);
  }, [hoverVertex, signMap]);

  return (
    <BoundedGoban
      animateStonePlacement={true}
      fuzzyStonePlacement={false}
      ghostStoneMap={ghostStoneMap}
      //dimmedVertices={state?.deadStonesMap}
      //markerMap={markerMap}
      maxHeight={windowSize.height - 200}
      maxWidth={windowSize.width - 200}
      signMap={defaultSignMap}
      onVertexClick={(e, vertex) => {
        console.log(vertex);
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
