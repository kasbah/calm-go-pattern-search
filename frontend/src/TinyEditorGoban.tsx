import { Goban } from "./shudan";
import "./shudan/css/goban.css";
import { useState } from "react";
import type { BoardPosition } from "./sabaki-types";

import "./EditorGoban.css";
import "./goban-common.css";
import "./TinyEditorGoban.css";

type TinyGobanProps = {
  vertexSize: number;
  board: BoardPosition;
};

export default function TinyEditorGoban({ vertexSize, board }: TinyGobanProps) {
  const [isHovering, setIsHovering] = useState(false);
  return (
    <div
      className="TinyGoban EditorGoban"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      data-hovering={isHovering}
    >
      <Goban vertexSize={vertexSize} showCoordinates={false} signMap={board} />
    </div>
  );
}
