import { useState } from "react";
import { Toggle } from "./components/ui/toggle";
import { BrushMode, SabakiColor, SabakiSign } from "./sabaki-types";

import circleBlackSvg from "./assets/icons/circle-black.svg";
import circleWhiteSvg from "./assets/icons/circle-white.svg";
import eraserSvg from "./assets/icons/eraser.svg";
import overlappingCirclesBlackSwitchedSvg from "./assets/icons/overlapping-circles-black-switched.svg";
import overlappingCirclesBlackSvg from "./assets/icons/overlapping-circles-black.svg";
import overlappingCirclesWhiteSwitchedSvg from "./assets/icons/overlapping-circles-white-switched.svg";
import overlappingCirclesWhiteSvg from "./assets/icons/overlapping-circles-white.svg";

export type BrushToolbarProps = {
  brushMode: BrushMode;
  alternateBrushColor: SabakiColor;
  onSetBrushMode: (brushMode: BrushMode) => void;
  onToggleAlternateColor: () => void;
};

function BrushToolbar({
  brushMode,
  alternateBrushColor,
  onSetBrushMode,
  onToggleAlternateColor,
}: BrushToolbarProps) {
  const [isHoveringAlternateBrush, setHoveringAlternateBrush] =
    useState<boolean>(false);

  return (
    <div className="flex flex-col gap-1">
      <Toggle
        size="xl"
        onClick={() => {
          if (brushMode === BrushMode.Alternate) {
            onToggleAlternateColor();
          } else {
            onSetBrushMode(BrushMode.Alternate);
          }
          setHoveringAlternateBrush(false);
        }}
        pressed={brushMode === BrushMode.Alternate}
        onMouseEnter={() =>
          brushMode === BrushMode.Alternate && setHoveringAlternateBrush(true)
        }
        onMouseLeave={() => setHoveringAlternateBrush(false)}
      >
        <img
          src={
            isHoveringAlternateBrush
              ? alternateBrushColor === SabakiSign.Black
                ? overlappingCirclesBlackSwitchedSvg
                : overlappingCirclesWhiteSwitchedSvg
              : alternateBrushColor === SabakiSign.Black
                ? overlappingCirclesBlackSvg
                : overlappingCirclesWhiteSvg
          }
          width={32}
          height={32}
        />
      </Toggle>
      <Toggle
        size="xl"
        onClick={() => onSetBrushMode(BrushMode.Black)}
        pressed={brushMode === BrushMode.Black}
      >
        <img src={circleBlackSvg} width={32} height={32} />
      </Toggle>
      <Toggle
        size="xl"
        onClick={() => onSetBrushMode(BrushMode.White)}
        pressed={brushMode === BrushMode.White}
      >
        <img src={circleWhiteSvg} width={32} height={32} />
      </Toggle>
      <Toggle
        size="xl"
        onClick={() => onSetBrushMode(BrushMode.Remove)}
        pressed={brushMode === BrushMode.Remove}
      >
        <img src={eraserSvg} width={32} height={32} />
      </Toggle>
    </div>
  );
}

export default BrushToolbar;
