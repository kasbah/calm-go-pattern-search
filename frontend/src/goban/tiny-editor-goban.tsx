import { Goban } from "./shudan";
import "./shudan/css/goban.css";
import { useState, useCallback, useEffect } from "react";
import type { BoardPosition } from "@/sabaki-types";

import "./editor-goban.css";
import "./goban-common.css";
import "./tiny-editor-goban.css";

type TinyGobanProps = {
  vertexSize: number;
  board: BoardPosition;
  isHovering?: boolean;
  isTrashHovering?: boolean;
  isBackHovering?: boolean;
  onHoverChange?: (isHovering: boolean) => void;
};

export default function TinyEditorGoban({
  vertexSize,
  board,
  isHovering: externalHovering = false,
  isTrashHovering = false,
  isBackHovering = false,
  onHoverChange,
}: TinyGobanProps) {
  const [isLocalHovering, setIsLocalHovering] = useState(false);

  // Reset local hover state when component unmounts
  useEffect(() => {
    return () => {
      setIsLocalHovering(false);
      onHoverChange?.(false);
    };
  }, [onHoverChange]);

  const handleGobanMouseEnter = useCallback(() => {
    setIsLocalHovering(true);
    onHoverChange?.(true);
  }, [onHoverChange]);

  const handleGobanMouseLeave = useCallback(() => {
    setIsLocalHovering(false);
    onHoverChange?.(false);
  }, [onHoverChange]);

  return (
    <div
      className="TinyGoban EditorGoban h-full"
      data-hovering={isLocalHovering || externalHovering || isBackHovering}
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
