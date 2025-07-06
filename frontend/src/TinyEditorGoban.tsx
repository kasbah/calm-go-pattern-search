import { Goban } from "./shudan";
import "./shudan/css/goban.css";
import { useState } from "react";
import type { BoardPosition } from "@/sabaki-types";
import { boardsEqual, emptyBoard } from "@/sabaki-types";
import { Button } from "./ui-primitives/button";
import trashSvg from "./assets/icons/trash.svg";

import "./EditorGoban.css";
import "./goban-common.css";
import "./TinyEditorGoban.css";

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
  return (
    <div
      className="TinyGoban EditorGoban flex items-center h-full"
      data-hovering={isHovering}
      data-trash-hovering={isTrashHovering}
      data-clearing={isClearing}
    >
      <div
        className="tiny-goban-clickable h-full cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <Goban
          vertexSize={vertexSize}
          showCoordinates={false}
          signMap={board}
        />
      </div>
      <div
        className="ml-1 h-[230px]"
        onClick={(e) => {
          if (isBoardEmpty) {
            e.stopPropagation();
          }
        }}
      >
        <Button
          size="xl"
          variant="outline"
          onClick={() => {
            setIsClearing(true);
            onClearBoard();
            setTimeout(() => setIsClearing(false), 50);
          }}
          title="Clear board"
          onMouseEnter={() => setIsTrashHovering(true)}
          onMouseLeave={() => setIsTrashHovering(false)}
          disabled={isBoardEmpty}
        >
          <img src={trashSvg} width={24} height={24} alt="Clear board" />
        </Button>
      </div>
    </div>
  );
}
