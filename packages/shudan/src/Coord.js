import { createElement as h, memo, useMemo } from "react";
import { alpha } from "./helper.js";

// Static styles to avoid recreation
const coordXBaseStyle = {
  display: "flex",
  textAlign: "center",
};

const coordYBaseStyle = {
  textAlign: "center",
};

const coordItemStyle = {
  width: "1em",
};

const coordSpanStyle = {
  display: "block",
};

const coordYItemStyle = {
  height: "1em",
};

export const CoordX = memo(function CoordX({
  style,
  xs,
  coordX = (i) => alpha[i] || alpha[alpha.length - 1],
}) {
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
      xs.map((i) =>
        h(
          "div",
          { key: i, style: coordItemStyle },
          h("span", { style: coordSpanStyle }, coordX(i)),
        ),
      ),
    [xs, coordX],
  );

  return h(
    "div",
    {
      className: "shudan-coordx",
      style: containerStyle,
    },
    coordItems,
  );
});

export const CoordY = memo(function CoordY({
  style,
  height,
  ys,
  coordY = (i) => height - i,
}) {
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
      ys.map((i) =>
        h(
          "div",
          { key: i, style: coordYItemStyle },
          h("span", { style: coordSpanStyle }, coordY(i)),
        ),
      ),
    [ys, coordY],
  );

  return h(
    "div",
    {
      className: "shudan-coordy",
      style: containerStyle,
    },
    coordItems,
  );
});
