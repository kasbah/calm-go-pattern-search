import { useWindowSize } from "@reach/window-size";
import { BoundedGoban } from "@sabaki/shudan";

import { useState } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Toggle } from "./components/ui/toggle";
import "./GobanCommon.css";
import "./GobanViewer.css";
import chevronFirstSvg from "./icons/chevron-first.svg";
import chevronLastSvg from "./icons/chevron-last.svg";
import chevronLeftSvg from "./icons/chevron-left.svg";
import chevronRightSvg from "./icons/chevron-right.svg";
import mousePointerClick from "./icons/mouse-pointer-click.svg";
import { emptyBoard } from "./SabakiTypes";

export default function GobanViewer() {
  const windowSize = useWindowSize();
  const [moveNumber, setMoveNumberState] = useState(1);
  const maxHeight = Math.min(windowSize.height, windowSize.width * 0.5);

  const setMoveNumber = (moveNumber: number) => {
    if (moveNumber < 1) {
      moveNumber = 1;
    } else if (moveNumber > 999) {
      moveNumber = 999;
    }
    setMoveNumberState(moveNumber);
  };

  return (
    <div className="flex flex-row gap-2" style={{ maxHeight }}>
      <div>
        <BoundedGoban
          animateStonePlacement={false}
          fuzzyStonePlacement={false}
          maxHeight={windowSize.height}
          maxWidth={windowSize.width * 0.5}
          showCoordinates={true}
          signMap={emptyBoard}
        />
      </div>
      <div className="mt-2 mb-2">
        <div className="flex flex-col justify-between h-full">
          <div className="flex flex-col gap-1">
            <Toggle size="xl" onClick={() => {}} pressed={true}>
              <img src={mousePointerClick} width={32} height={32} />
            </Toggle>
          </div>
          <div>
            <div className="max-w-[60px] mb-1">
              <Input
                type="number"
                min={1}
                max={999}
                step={1}
                value={moveNumber}
                onChange={(e) => setMoveNumber(parseInt(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1 mb-1">
              <Button
                size="xl"
                variant="outline"
                disabled={moveNumber === 1}
                onClick={() => setMoveNumber(1)}
              >
                <img src={chevronFirstSvg} width={24} height={24} />
              </Button>
              <Button
                size="xl"
                variant="outline"
                disabled={moveNumber === 1}
                onClick={() => setMoveNumber(moveNumber - 1)}
              >
                <img src={chevronLeftSvg} width={24} height={24} />
              </Button>
              <Button
                size="xl"
                variant="outline"
                disabled={moveNumber === 999}
                onClick={() => setMoveNumber(moveNumber + 1)}
              >
                <img src={chevronRightSvg} width={24} height={24} />
              </Button>
              <Button
                size="xl"
                variant="outline"
                disabled={moveNumber === 999}
                onClick={() => setMoveNumber(999)}
              >
                <img src={chevronLastSvg} width={24} height={24} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
