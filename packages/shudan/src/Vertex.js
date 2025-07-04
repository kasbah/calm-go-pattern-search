import { createElement as h, memo, useCallback, useMemo } from "react";
import classnames from "classnames";

import { avg, vertexEvents, signEquals } from "./helper.js";
import Marker from "./Marker.js";

const absoluteStyle = (zIndex) => ({
  position: "absolute",
  zIndex,
});

const relativeStyle = {
  position: "relative",
};

// Memoize the vertex component to prevent unnecessary re-renders
const Vertex = memo(function Vertex(props) {
  let {
    position,
    shift,
    random,
    sign,
    heat,
    paint,
    paintLeft,
    paintRight,
    paintTop,
    paintBottom,
    paintTopLeft,
    paintTopRight,
    paintBottomLeft,
    paintBottomRight,
    dimmed,
    marker,
    ghostStone,
    animate,
    selected,
    selectedLeft,
    selectedRight,
    selectedTop,
    selectedBottom,
  } = props;

  // Memoize event handlers to prevent recreation on every render
  const eventHandlers = useMemo(() => {
    const handlers = {};
    for (let eventName of vertexEvents) {
      handlers[eventName] = (evt) => {
        props[`on${eventName}`]?.(evt, position);
      };
    }
    return handlers;
  }, [position, ...vertexEvents.map((name) => props[`on${name}`])]);

  // Memoize event handler props to prevent Object.assign recreation
  const eventHandlerProps = useMemo(() => {
    return vertexEvents.reduce((acc, eventName) => {
      acc[`on${eventName}`] = eventHandlers[eventName];
      return acc;
    }, {});
  }, [eventHandlers]);

  // Memoize marker markup to prevent recreation
  const markerMarkup = useCallback(
    (zIndex) =>
      !!marker &&
      h(Marker, {
        key: "marker",
        sign,
        type: marker.type,
        label: marker.label,
        zIndex,
        color: marker.color,
      }),
    [marker, sign],
  );

  // Memoize class names to prevent recreation
  const className = useMemo(
    () =>
      classnames(
        "shudan-vertex",
        `shudan-random_${random}`,
        `shudan-sign_${sign}`,
        {
          [`shudan-shift_${shift}`]: !!shift,
          [`shudan-heat_${!!heat && heat.strength}`]: !!heat,
          "shudan-dimmed": dimmed,
          "shudan-animate": animate,

          [`shudan-paint_${paint > 0 ? 1 : -1}`]: !!paint,
          "shudan-paintedleft": !!paint && signEquals(paintLeft, paint),
          "shudan-paintedright": !!paint && signEquals(paintRight, paint),
          "shudan-paintedtop": !!paint && signEquals(paintTop, paint),
          "shudan-paintedbottom": !!paint && signEquals(paintBottom, paint),

          "shudan-selected": selected,
          "shudan-selectedleft": selectedLeft,
          "shudan-selectedright": selectedRight,
          "shudan-selectedtop": selectedTop,
          "shudan-selectedbottom": selectedBottom,

          [`shudan-marker_${marker?.type}`]: !!marker?.type,
          "shudan-smalllabel":
            (marker?.type === "label" || marker?.type === "circle-label") &&
            (marker.label?.includes("\n") || marker.label.length >= 3),

          [`shudan-ghost_${ghostStone?.sign}`]: !!ghostStone,
          [`shudan-ghost_${ghostStone?.type}`]: !!ghostStone?.type,
          "shudan-ghost_faint": !!ghostStone?.faint,
        },
      ),
    [
      random,
      sign,
      shift,
      heat,
      dimmed,
      animate,
      paint,
      paintLeft,
      paintRight,
      paintTop,
      paintBottom,
      selected,
      selectedLeft,
      selectedRight,
      selectedTop,
      selectedBottom,
      marker,
      ghostStone,
    ],
  );

  // Memoize paint styles to prevent recreation
  const paintStyle = useMemo(() => {
    if (
      !(!!paint || !!paintLeft || !!paintRight || !!paintTop || !!paintBottom)
    ) {
      return null;
    }

    return {
      ...absoluteStyle(3),
      "--shudan-paint-opacity": avg(
        (!!paint
          ? [paint]
          : [paintLeft, paintRight, paintTop, paintBottom].map(
              (x) => x !== 0 && !isNaN(x),
            )
        ).map((x) => Math.abs(x ?? 0) * 0.5),
      ),
      "--shudan-paint-box-shadow": [
        signEquals(paintLeft, paintTop, paintTopLeft)
          ? [Math.sign(paintTop), "-.5em -.5em"]
          : null,
        signEquals(paintRight, paintTop, paintTopRight)
          ? [Math.sign(paintTop), ".5em -.5em"]
          : null,
        signEquals(paintLeft, paintBottom, paintBottomLeft)
          ? [Math.sign(paintBottom), "-.5em .5em"]
          : null,
        signEquals(paintRight, paintBottom, paintBottomRight)
          ? [Math.sign(paintBottom), ".5em .5em"]
          : null,
      ]
        .filter((x) => !!x && x[0] !== 0)
        .map(
          ([sign, translation]) =>
            `${translation} 0 0 var(${
              sign > 0
                ? "--shudan-black-background-color"
                : "--shudan-white-background-color"
            })`,
        )
        .join(","),
    };
  }, [
    paint,
    paintLeft,
    paintRight,
    paintTop,
    paintBottom,
    paintTopLeft,
    paintTopRight,
    paintBottomLeft,
    paintBottomRight,
  ]);

  return h(
    "div",
    {
      "data-x": position[0],
      "data-y": position[1],
      title: marker?.tooltip ?? marker?.label,
      style: relativeStyle,
      className,
      ...eventHandlerProps,
    },

    !sign && markerMarkup(0),
    !sign &&
      !!ghostStone &&
      h("div", {
        key: "ghost",
        className: "shudan-ghost",
        style: absoluteStyle(1),
      }),

    h(
      "div",
      { key: "stone", className: "shudan-stone", style: absoluteStyle(2) },

      !!sign &&
        h(
          "div",
          {
            key: "inner",
            className: classnames(
              "shudan-inner",
              "shudan-stone-image",
              `shudan-random_${random}`,
              `shudan-sign_${sign}`,
            ),
            style: absoluteStyle(),
          },
          sign,
        ),

      !!sign && markerMarkup(),
    ),

    paintStyle &&
      h("div", {
        key: "paint",
        className: "shudan-paint",
        style: paintStyle,
      }),

    !!selected &&
      h("div", {
        key: "selection",
        className: "shudan-selection",
        style: absoluteStyle(4),
      }),

    h("div", {
      key: "heat",
      className: "shudan-heat",
      style: absoluteStyle(5),
    }),
    heat?.text != null &&
      h(
        "div",
        {
          key: "heatlabel",
          className: "shudan-heatlabel",
          style: absoluteStyle(6),
        },
        heat.text && heat.text.toString(),
      ),
  );
});

// Custom comparison function for React.memo
function areEqual(prevProps, nextProps) {
  // Check if position changed (most common case)
  if (
    prevProps.position[0] !== nextProps.position[0] ||
    prevProps.position[1] !== nextProps.position[1]
  ) {
    return false;
  }

  // Check primitive props
  const primitiveProps = [
    "shift",
    "random",
    "sign",
    "paint",
    "paintLeft",
    "paintRight",
    "paintTop",
    "paintBottom",
    "paintTopLeft",
    "paintTopRight",
    "paintBottomLeft",
    "paintBottomRight",
    "dimmed",
    "animate",
    "selected",
    "selectedLeft",
    "selectedRight",
    "selectedTop",
    "selectedBottom",
  ];

  for (const prop of primitiveProps) {
    if (prevProps[prop] !== nextProps[prop]) {
      return false;
    }
  }

  // Check object props with shallow comparison
  const objectProps = ["heat", "marker", "ghostStone"];
  for (const prop of objectProps) {
    const prev = prevProps[prop];
    const next = nextProps[prop];

    if (prev !== next) {
      // If both are objects, do shallow comparison
      if (
        prev &&
        next &&
        typeof prev === "object" &&
        typeof next === "object"
      ) {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);

        if (prevKeys.length !== nextKeys.length) {
          return false;
        }

        for (const key of prevKeys) {
          if (prev[key] !== next[key]) {
            return false;
          }
        }
      } else {
        return false;
      }
    }
  }

  // Check event handlers
  for (const eventName of vertexEvents) {
    if (prevProps[`on${eventName}`] !== nextProps[`on${eventName}`]) {
      return false;
    }
  }

  return true;
}

export default memo(Vertex, areEqual);
