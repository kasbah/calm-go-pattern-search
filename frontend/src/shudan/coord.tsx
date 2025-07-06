import React, { memo, useMemo } from "react";
import { alpha } from "./helper";

// Static styles to avoid recreation
const coordXBaseStyle: React.CSSProperties = {
  display: "flex",
  textAlign: "center",
};

const coordYBaseStyle: React.CSSProperties = {
  textAlign: "center",
};

const coordItemStyle: React.CSSProperties = {
  width: "1em",
};

const coordSpanStyle: React.CSSProperties = {
  display: "block",
};

const coordYItemStyle: React.CSSProperties = {
  height: "1em",
};

interface CoordXProps {
  style?: React.CSSProperties;
  xs: number[];
  coordX?: (i: number) => string | number;
}

export const CoordX = memo(function CoordX({
  style,
  xs,
  coordX = (i) => alpha[i] || alpha[alpha.length - 1],
}: CoordXProps) {
  // Memoize the combined style to prevent recreation
  const containerStyle = useMemo(
    () => ({
      ...coordXBaseStyle,
      ...style,
    }),
    [style],
  );

  // Memoize the coordinate items to prevent recreation
  const coordItems = useMemo(
    () =>
      xs.map((i) => (
        <div key={i} style={coordItemStyle}>
          <span style={coordSpanStyle}>{coordX(i)}</span>
        </div>
      )),
    [xs, coordX],
  );

  return (
    <div className="shudan-coordx" style={containerStyle}>
      {coordItems}
    </div>
  );
});

interface CoordYProps {
  style?: React.CSSProperties;
  height: number;
  ys: number[];
  coordY?: (i: number) => string | number;
}

export const CoordY = memo(function CoordY({
  style,
  height,
  ys,
  coordY = (i) => height - i,
}: CoordYProps) {
  // Memoize the combined style to prevent recreation
  const containerStyle = useMemo(
    () => ({
      ...coordYBaseStyle,
      ...style,
    }),
    [style],
  );

  // Memoize the coordinate items to prevent recreation
  const coordItems = useMemo(
    () =>
      ys.map((i) => (
        <div key={i} style={coordYItemStyle}>
          <span style={coordSpanStyle}>{coordY(i)}</span>
        </div>
      )),
    [ys, coordY],
  );

  return (
    <div className="shudan-coordy" style={containerStyle}>
      {coordItems}
    </div>
  );
});
