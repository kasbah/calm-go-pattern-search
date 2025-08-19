import { Goban } from "./shudan";
import "./shudan/css/goban.css";
import { useState, useCallback } from "react";
import type { BoardPosition } from "@/sabaki-types";

import "./editor-goban.css";
import "./goban-common.css";
import "./tiny-editor-goban.css";

type TinyGobanProps = {
  vertexSize: number;
  board: BoardPosition;
  isHovering?: boolean;
  isTrashHovering?: boolean;
};

export default function TinyEditorGoban({
  vertexSize,
  board,
  isHovering: externalHovering = false,
  isTrashHovering = false,
}: TinyGobanProps) {
  const [isLocalHovering, setIsLocalHovering] = useState(false);

  const handleGobanMouseEnter = useCallback(() => {
    setIsLocalHovering(true);
  }, []);

  const handleGobanMouseLeave = useCallback(() => {
    setIsLocalHovering(false);
  }, []);

  return (
    <div
      className="TinyGoban EditorGoban h-full"
      data-hovering={isLocalHovering || externalHovering}
      data-trash-hovering={isTrashHovering}
    >
      <div
        className="tiny-goban-clickable h-full cursor-pointer"
        onMouseEnter={handleGobanMouseEnter}
        onMouseLeave={handleGobanMouseLeave}
      >
        <Goban
          vertexSize={vertexSize}
          showCoordinates={false}
          signMap={board}
        />
      </div>
    </div>
  );
}
