import { useState, useCallback } from "react";
import { Toggle } from "@/ui-primitives/toggle";
import { BrushMode, SabakiColor, SabakiSign } from "@/sabaki-types";

import circleBlackSvg from "@/assets/icons/circle-black.svg";
import circleWhiteSvg from "@/assets/icons/circle-white.svg";
import eraserSvg from "@/assets/icons/eraser.svg";
import overlappingCirclesBlackSwitchedSvg from "@/assets/icons/overlapping-circles-black-switched.svg";
import overlappingCirclesBlackSvg from "@/assets/icons/overlapping-circles-black.svg";
import overlappingCirclesWhiteSwitchedSvg from "@/assets/icons/overlapping-circles-white-switched.svg";
import overlappingCirclesWhiteSvg from "@/assets/icons/overlapping-circles-white.svg";

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

  const handleAlternateToggleClick = useCallback(() => {
    if (brushMode === BrushMode.Alternate) {
      onToggleAlternateColor();
    } else {
      onSetBrushMode(BrushMode.Alternate);
    }
    setHoveringAlternateBrush(false);
  }, [brushMode, onToggleAlternateColor, onSetBrushMode]);

  const handleAlternateMouseEnter = useCallback(() => {
    if (brushMode === BrushMode.Alternate) {
      setHoveringAlternateBrush(true);
    }
  }, [brushMode]);

  const handleAlternateMouseLeave = useCallback(() => {
    setHoveringAlternateBrush(false);
  }, []);

  const handleBlackClick = useCallback(() => {
    onSetBrushMode(BrushMode.Black);
  }, [onSetBrushMode]);

  const handleWhiteClick = useCallback(() => {
    onSetBrushMode(BrushMode.White);
  }, [onSetBrushMode]);

  const handleRemoveClick = useCallback(() => {
    onSetBrushMode(BrushMode.Remove);
  }, [onSetBrushMode]);

  return (
    <div className="flex flex-col gap-1">
      <Toggle
        size="xl"
        onClick={handleAlternateToggleClick}
        pressed={brushMode === BrushMode.Alternate}
        onMouseEnter={handleAlternateMouseEnter}
        onMouseLeave={handleAlternateMouseLeave}
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
        onClick={handleBlackClick}
        pressed={brushMode === BrushMode.Black}
      >
        <img src={circleBlackSvg} width={32} height={32} />
      </Toggle>
      <Toggle
        size="xl"
        onClick={handleWhiteClick}
        pressed={brushMode === BrushMode.White}
      >
        <img src={circleWhiteSvg} width={32} height={32} />
      </Toggle>
      <Toggle
        size="xl"
        onClick={handleRemoveClick}
        pressed={brushMode === BrushMode.Remove}
      >
        <img src={eraserSvg} width={32} height={32} />
      </Toggle>
    </div>
  );
}

export default BrushToolbar;
