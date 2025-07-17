import { Goban } from "./shudan";
import "./shudan/css/goban.css";
import { useState, useCallback } from "react";
import type { BoardPosition } from "@/sabaki-types";
import { boardsEqual, emptyBoard } from "@/sabaki-types";
import { Button } from "@/ui-primitives/button";
import trashSvg from "@/assets/icons/trash.svg";

import "./editor-goban.css";
import "./goban-common.css";
import "./tiny-editor-goban.css";

type TinyGobanProps = {
  vertexSize: number;
  board: BoardPosition;
  onClearBoard: () => void;
};

export default function TinyEditorGoban({
  vertexSize,
  board,
  onClearBoard,
}: TinyGobanProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isTrashHovering, setIsTrashHovering] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isBoardEmpty = boardsEqual(board, emptyBoard);

  const handleGobanMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleGobanMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (isBoardEmpty) {
        e.stopPropagation();
      }
    },
    [isBoardEmpty],
  );

  const handleClearClick = useCallback(() => {
    setIsClearing(true);
    onClearBoard();
    setTimeout(() => setIsClearing(false), 50);
  }, [onClearBoard]);

  const handleTrashMouseEnter = useCallback(() => {
    setIsTrashHovering(true);
  }, []);

  const handleTrashMouseLeave = useCallback(() => {
    setIsTrashHovering(false);
  }, []);
  return (
    <div
      className="TinyGoban EditorGoban flex items-center h-full"
      data-hovering={isHovering}
      data-trash-hovering={isTrashHovering}
      data-clearing={isClearing}
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
      <div className="ml-1 h-[220px]" onClick={handleContainerClick}>
        <Button
          size="xl"
          variant="outline"
          onClick={handleClearClick}
          title="Clear board"
          onMouseEnter={handleTrashMouseEnter}
          onMouseLeave={handleTrashMouseLeave}
          disabled={isBoardEmpty}
        >
          <img src={trashSvg} width={24} height={24} alt="Clear board" />
        </Button>
      </div>
    </div>
  );
}
