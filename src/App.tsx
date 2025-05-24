import React, { useState, useEffect } from "react";
import Goban, {
  BrushMode,
  BoardPosition,
  emptyBoard,
  SabakiColor,
} from "./Goban";
//@ts-ignore
import { Point, Color, Placement, Rotation } from "rust-pattern-search";

function toRustPosition(board: BoardPosition): Array<Placement> {
  const position: Array<Placement> = [];
  board.forEach((row, y) => {
    row.forEach((stone, x) => {
      if (stone !== SabakiColor.Empty) {
        const color = stone === SabakiColor.Black ? Color.Black : Color.White;
        const point = new Point(x, y);
        position.push(new Placement(color, point));
      }
    });
  });
  return position;
}

function fromRustPosition(position: Array<Placement>): BoardPosition {
  const board: BoardPosition = emptyBoard.map((row) => [...row]);
  position.forEach((placement) => {
    const x = placement.point.x;
    const y = placement.point.y;
    if (board[y] === undefined) {
      board[y] = [];
    }
    board[y][x] =
      placement.color === Color.Black ? SabakiColor.Black : SabakiColor.White;
  });
  return board;
}

export default function App() {
  const [brushMode, setBrushMode] = useState<BrushMode>(BrushMode.Alternate);
  const [board, setBoard] = useState<BoardPosition>(emptyBoard);
  const [rotatedBoards, setRotatedBoards] = useState<BoardPosition[]>([]);

  useEffect(() => {
    if (window.games !== undefined) {
      (async () => {
        let position = toRustPosition(board);
        const position90 = window.games.get_rotation(position, Rotation.R90);
        const board90 = fromRustPosition(position90);
        position = toRustPosition(board);
        const position180 = window.games.get_rotation(position, Rotation.R180);
        const board180 = fromRustPosition(position180);
        position = toRustPosition(board);
        const position270 = window.games.get_rotation(position, Rotation.R270);
        const board270 = fromRustPosition(position270);
        setRotatedBoards([board90, board180, board270]);
      })();
    }
  }, [board]);

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Goban brushMode={brushMode} onUpdateBoard={setBoard} board={board} />
      </div>
      {rotatedBoards.map((rotatedBoard, i) => (
        <div key={i}>
          <Goban
            brushMode={brushMode}
            onUpdateBoard={() => {}}
            board={rotatedBoard}
          />
        </div>
      ))}
      <div>
        <div>
          <input
            type="radio"
            id="alternate"
            name="brushMode"
            checked={brushMode === BrushMode.Alternate}
            onChange={() => setBrushMode(BrushMode.Alternate)}
          />
          <label htmlFor="alternate">Alternate</label>
        </div>
        <div>
          <input
            type="radio"
            id="black"
            name="brushMode"
            checked={brushMode === BrushMode.Black}
            onChange={() => setBrushMode(BrushMode.Black)}
          />
          <label htmlFor="black">Black</label>
        </div>
        <div>
          <input
            type="radio"
            id="white"
            name="brushMode"
            checked={brushMode === BrushMode.White}
            onChange={() => setBrushMode(BrushMode.White)}
          />
          <label htmlFor="white">White</label>
        </div>
        <div>
          <input
            type="radio"
            id="delete"
            name="brushMode"
            checked={brushMode === BrushMode.Remove}
            onChange={() => setBrushMode(BrushMode.Remove)}
          />
          <label htmlFor="remove">Remove</label>
        </div>
        <div>
          <button onClick={() => setBoard(emptyBoard)}>Clear</button>
        </div>
      </div>
    </div>
  );
}
