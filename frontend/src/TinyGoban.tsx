import { Goban } from "@calm-go/shudan";
import "@calm-go/shudan/css/goban.css";
import { useState } from "react";
import type { BoardPosition } from "./sabaki-types";

import "./GobanCommon.css";
import "./GobanEditor.css";
import "./TinyGoban.css";

type TinyGobanProps = {
  vertexSize: number;
  board: BoardPosition;
};

export default function TinyGoban({ vertexSize, board }: TinyGobanProps) {
  const [isHovering, setIsHovering] = useState(false);
  return (
    <div
      className="TinyGoban"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-hovering={isHovering}
    >
      <Goban
        animateStonePlacement={false}
        fuzzyStonePlacement={false}
        vertexSize={vertexSize}
        showCoordinates={false}
        signMap={board}
      />
    </div>
  );
}
