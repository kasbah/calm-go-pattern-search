import React, { memo, useCallback, useMemo } from "react";
import classnames from "classnames";

import { avg, vertexEvents, signEquals, type Vertex } from "./helper";
import MarkerComponent from "./marker";

const absoluteStyle = (zIndex?: number): React.CSSProperties => ({
  position: "absolute",
  zIndex,
});

const relativeStyle: React.CSSProperties = {
  position: "relative",
};

export interface Marker {
  type?:
    | "circle"
    | "circle-label"
    | "cross"
    | "triangle"
    | "square"
    | "point"
    | "loader"
    | "label"
    | null;
  label?: string | null;
  tooltip?: string | null;
  color?: string | null;
}

export interface GhostStone {
  sign: 0 | -1 | 1;
  type?: "good" | "interesting" | "doubtful" | "bad" | null;
  faint?: boolean | null;
}

export interface HeatVertex {
  strength: number;
  text?: string | null;
}

interface VertexProps {
  positionX: number;
  positionY: number;

  sign?: number;
  heat?: HeatVertex | null;
  paint?: number;
  paintLeft?: number;
  paintRight?: number;
  paintTop?: number;
  paintBottom?: number;
  paintTopLeft?: number;
  paintTopRight?: number;
  paintBottomLeft?: number;
  paintBottomRight?: number;
  dimmed?: boolean;
  marker?: Marker | null;
  ghostStone?: GhostStone | null;
  selected?: boolean;
  selectedLeft?: boolean;
  selectedRight?: boolean;
  selectedTop?: boolean;
  selectedBottom?: boolean;

  // Event handlers
  onClick?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onMouseDown?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onMouseUp?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onMouseMove?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onMouseEnter?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onMouseLeave?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onPointerDown?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onPointerUp?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onPointerMove?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onPointerEnter?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onPointerLeave?: (evt: React.PointerEvent, vertex: Vertex) => void;
}

// Memoize the vertex component to prevent unnecessary re-renders
const VertexComponent = memo(function Vertex(props: VertexProps) {
  const {
    positionX,
    positionY,
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
    selected,
    selectedLeft,
    selectedRight,
    selectedTop,
    selectedBottom,
    // Event handlers
    onClick,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
  } = props;

  // Memoize event handlers to prevent recreation on every render
  const eventHandlers = useMemo(() => {
    const handlers: Record<
      string,
      (evt: React.MouseEvent | React.PointerEvent) => void
    > = {};
    const handlerMap = {
      Click: onClick,
      MouseDown: onMouseDown,
      MouseUp: onMouseUp,
      MouseMove: onMouseMove,
      MouseEnter: onMouseEnter,
      MouseLeave: onMouseLeave,
      PointerDown: onPointerDown,
      PointerUp: onPointerUp,
      PointerMove: onPointerMove,
      PointerEnter: onPointerEnter,
      PointerLeave: onPointerLeave,
    };

    for (const eventName of vertexEvents) {
      const handler = handlerMap[eventName as keyof typeof handlerMap];
      if (handler && typeof handler === "function") {
        handlers[`on${eventName}`] = (
          evt: React.MouseEvent | React.PointerEvent,
        ) => {
          (
            handler as (
              evt: React.MouseEvent | React.PointerEvent,
              vertex: Vertex,
            ) => void
          )(evt, [positionX, positionY]);
        };
      }
    }
    return handlers;
  }, [
    positionX,
    positionY,
    onClick,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
  ]);

  // Memoize event handler props to prevent Object.assign recreation
  const eventHandlerProps = useMemo(() => {
    return vertexEvents.reduce(
      (acc, eventName) => {
        const handlerName = `on${eventName}`;
        if (eventHandlers[handlerName]) {
          acc[handlerName] = eventHandlers[handlerName];
        }
        return acc;
      },
      {} as Record<
        string,
        (evt: React.MouseEvent | React.PointerEvent) => void
      >,
    );
  }, [eventHandlers]);

  // Memoize marker markup to prevent recreation
  const markerMarkup = useCallback(
    (zIndex?: number) =>
      !!marker && (
        <MarkerComponent
          key="marker"
          sign={sign || 0}
          type={marker.type}
          label={marker.label}
          zIndex={zIndex}
          color={marker.color}
        />
      ),
    [marker, sign],
  );

  // Memoize class names to prevent recreation
  const className = useMemo(
    () =>
      classnames(
        "shudan-vertex",

        `shudan-sign_${sign}`,
        {
          [`shudan-heat_${!!heat && heat.strength}`]: !!heat,
          "shudan-dimmed": dimmed,

          [`shudan-paint_${paint && paint > 0 ? 1 : -1}`]: !!paint,
          "shudan-paintedleft":
            !!paint && paintLeft != null && signEquals(paintLeft, paint),
          "shudan-paintedright":
            !!paint && paintRight != null && signEquals(paintRight, paint),
          "shudan-paintedtop":
            !!paint && paintTop != null && signEquals(paintTop, paint),
          "shudan-paintedbottom":
            !!paint && paintBottom != null && signEquals(paintBottom, paint),

          "shudan-selected": selected,
          "shudan-selectedleft": selectedLeft,
          "shudan-selectedright": selectedRight,
          "shudan-selectedtop": selectedTop,
          "shudan-selectedbottom": selectedBottom,

          [`shudan-marker_${marker?.type}`]: !!marker?.type,
          "shudan-smalllabel":
            (marker?.type === "label" || marker?.type === "circle-label") &&
            (marker.label?.includes("\n") || (marker.label?.length ?? 0) >= 3),

          [`shudan-ghost_${ghostStone?.sign}`]: !!ghostStone,
          [`shudan-ghost_${ghostStone?.type}`]: !!ghostStone?.type,
          "shudan-ghost_faint": !!ghostStone?.faint,
        },
      ),
    [
      sign,
      heat,
      dimmed,
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
    if (!paint && !paintLeft && !paintRight && !paintTop && !paintBottom) {
      return null;
    }

    return {
      ...absoluteStyle(3),
      "--shudan-paint-opacity": avg(
        (paint
          ? [paint]
          : [paintLeft, paintRight, paintTop, paintBottom].map((x) =>
              x !== 0 && x != null && !isNaN(x) ? 1 : 0,
            )
        ).map((x) => Math.abs(x || 0) * 0.5),
      ),
      "--shudan-paint-box-shadow": [
        paintLeft != null &&
        paintTop != null &&
        paintTopLeft != null &&
        signEquals(paintLeft, paintTop, paintTopLeft)
          ? [Math.sign(paintTop), "-.5em -.5em"]
          : null,
        paintRight != null &&
        paintTop != null &&
        paintTopRight != null &&
        signEquals(paintRight, paintTop, paintTopRight)
          ? [Math.sign(paintTop), ".5em -.5em"]
          : null,
        paintLeft != null &&
        paintBottom != null &&
        paintBottomLeft != null &&
        signEquals(paintLeft, paintBottom, paintBottomLeft)
          ? [Math.sign(paintBottom), "-.5em .5em"]
          : null,
        paintRight != null &&
        paintBottom != null &&
        paintBottomRight != null &&
        signEquals(paintRight, paintBottom, paintBottomRight)
          ? [Math.sign(paintBottom), ".5em .5em"]
          : null,
      ]
        .filter((x): x is [number, string] => x !== null && x[0] !== 0)
        .map(
          ([sign, translation]) =>
            `${translation} 0 0 var(${
              sign > 0
                ? "--shudan-black-background-color"
                : "--shudan-white-background-color"
            })`,
        )
        .join(","),
    } as React.CSSProperties;
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

  return (
    <div
      data-x={positionX}
      data-y={positionY}
      title={marker?.tooltip ?? marker?.label ?? undefined}
      style={relativeStyle}
      className={className}
      {...eventHandlerProps}
    >
      {!sign && markerMarkup(0)}
      {!sign && !!ghostStone && (
        <div key="ghost" className="shudan-ghost" style={absoluteStyle(1)} />
      )}

      <div key="stone" className="shudan-stone" style={absoluteStyle(2)}>
        {!!sign && (
          <div
            key="inner"
            className={classnames(
              "shudan-inner",
              "shudan-stone-image",

              `shudan-sign_${sign}`,
            )}
            style={absoluteStyle()}
          >
            {sign}
          </div>
        )}

        {!!sign && markerMarkup()}
      </div>

      {paintStyle && (
        <div key="paint" className="shudan-paint" style={paintStyle} />
      )}

      {!!selected && (
        <div
          key="selection"
          className="shudan-selection"
          style={absoluteStyle(4)}
        />
      )}

      <div key="heat" className="shudan-heat" style={absoluteStyle(5)} />
      {heat?.text != null && (
        <div
          key="heatlabel"
          className="shudan-heatlabel"
          style={absoluteStyle(6)}
        >
          {heat.text && heat.text.toString()}
        </div>
      )}
    </div>
  );
});

// Simple shallow equality check
const shallowEquals = (a: unknown, b: unknown): boolean => {
  return a === b;
};

// Custom comparison function for React.memo
function areEqual(prevProps: VertexProps, nextProps: VertexProps): boolean {
  // Simple shallow equality check for all props
  const allProps: (keyof VertexProps)[] = [
    "positionX",
    "positionY",
    "sign",
    "heat",
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
    "marker",
    "ghostStone",
    "selected",
    "selectedLeft",
    "selectedRight",
    "selectedTop",
    "selectedBottom",
    ...(vertexEvents.map((e) => `on${e}`) as (keyof VertexProps)[]),
  ];

  for (const prop of allProps) {
    if (!shallowEquals(prevProps[prop], nextProps[prop])) {
      return false;
    }
  }

  return true;
}

export default memo(VertexComponent, areEqual);
