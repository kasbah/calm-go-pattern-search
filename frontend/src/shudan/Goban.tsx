import React, { Component, memo } from "react";
import classnames from "classnames";
import { produce } from "immer";

import {
  vertexEquals,
  vertexEvents,
  range,
  getHoshis,
  type Vertex,
  type Map,
} from "./helper";

import { CoordX, CoordY } from "./Coord";
import Grid from "./Grid";
import VertexComponent, {
  type Marker,
  type GhostStone,
  type HeatVertex,
} from "./Vertex";
import Line from "./Line";

// Static styles to avoid recreation
const contentStyle: React.CSSProperties = {
  position: "relative",
};

const verticesStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
};

const linesStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
  zIndex: 2,
};

export interface LineMarker {
  v1: Vertex;
  v2: Vertex;
  type?: "line" | "arrow";
}

export interface GobanProps {
  id?: string;
  class?: string;
  className?: string;
  style?: React.CSSProperties;
  innerProps?: React.HTMLAttributes<HTMLDivElement>;

  busy?: boolean;
  vertexSize?: number;
  rangeX?: [start: number, stop: number];
  rangeY?: [start: number, stop: number];

  showCoordinates?: boolean;
  coordX?: (x: number) => string | number;
  coordY?: (y: number) => string | number;

  signMap?: Map<0 | 1 | -1>;
  markerMap?: Map<Marker | null>;
  paintMap?: Map<0 | 1 | -1>;
  ghostStoneMap?: Map<GhostStone | null>;
  heatMap?: Map<HeatVertex | null>;

  selectedVertices?: Vertex[];
  dimmedVertices?: Vertex[];
  lines?: LineMarker[];

  onVertexClick?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onVertexMouseUp?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onVertexMouseDown?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onVertexMouseMove?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onVertexMouseEnter?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onVertexMouseLeave?: (evt: React.MouseEvent, vertex: Vertex) => void;
  onVertexPointerUp?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onVertexPointerDown?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onVertexPointerMove?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onVertexPointerEnter?: (evt: React.PointerEvent, vertex: Vertex) => void;
  onVertexPointerLeave?: (evt: React.PointerEvent, vertex: Vertex) => void;
}

interface GobanState {
  signMap: Map<0 | 1 | -1>;
  width: number;
  height: number;
  rangeX: [number, number];
  rangeY: [number, number];

  xs: number[];
  ys: number[];
  hoshis: Vertex[];
}

class GobanComponent extends Component<GobanProps, GobanState> {
  constructor(props: GobanProps) {
    super(props);

    this.state = {
      signMap: [],
      width: 0,
      height: 0,
      rangeX: [0, Infinity],
      rangeY: [0, Infinity],

      xs: [],
      ys: [],
      hoshis: [],
    };
  }

  // Memoize vertex event handlers to prevent recreation
  createVertexEventHandlers = (eventHandlers: GobanProps) => {
    return vertexEvents.reduce(
      (acc, eventName) => {
        const handlerName = `onVertex${eventName}` as keyof GobanProps;
        const handler = eventHandlers[handlerName];
        if (handler) {
          acc[`on${eventName}`] = handler;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
  };

  // Memoize vertex creation to prevent unnecessary re-renders
  createVertex = (
    x: number,
    y: number,
    props: {
      signMap?: Map<0 | 1 | -1>;
      paintMap?: Map<0 | 1 | -1>;
      heatMap?: Map<HeatVertex | null>;
      markerMap?: Map<Marker | null>;
      ghostStoneMap?: Map<GhostStone | null>;
      selectedVertices: Vertex[];
      dimmedVertices: Vertex[];
    },
  ) => {
    const {
      signMap,
      paintMap,
      heatMap,
      markerMap,
      ghostStoneMap,
      selectedVertices,
      dimmedVertices,
    } = props;

    const equalsVertex = (v: Vertex) => vertexEquals(v, [x, y]);
    const selected = selectedVertices.some(equalsVertex);

    return {
      key: [x, y].join("-"),
      position: [x, y] as Vertex,

      sign: signMap?.[y]?.[x],

      heat: heatMap?.[y]?.[x],
      marker: markerMap?.[y]?.[x],
      ghostStone: ghostStoneMap?.[y]?.[x],
      dimmed: dimmedVertices.some(equalsVertex),

      paint: paintMap?.[y]?.[x],
      paintLeft: paintMap?.[y]?.[x - 1],
      paintRight: paintMap?.[y]?.[x + 1],
      paintTop: paintMap?.[y - 1]?.[x],
      paintBottom: paintMap?.[y + 1]?.[x],
      paintTopLeft: paintMap?.[y - 1]?.[x - 1],
      paintTopRight: paintMap?.[y - 1]?.[x + 1],
      paintBottomLeft: paintMap?.[y + 1]?.[x - 1],
      paintBottomRight: paintMap?.[y + 1]?.[x + 1],

      selected,
      selectedLeft:
        selected && selectedVertices.some((v) => vertexEquals(v, [x - 1, y])),
      selectedRight:
        selected && selectedVertices.some((v) => vertexEquals(v, [x + 1, y])),
      selectedTop:
        selected && selectedVertices.some((v) => vertexEquals(v, [x, y - 1])),
      selectedBottom:
        selected && selectedVertices.some((v) => vertexEquals(v, [x, y + 1])),
    };
  };

  render() {
    const { width, height, rangeX, rangeY, xs, ys, hoshis } = this.state;

    const {
      innerProps = {},
      vertexSize = 24,
      coordX,
      coordY,
      busy,
      signMap,
      paintMap,
      heatMap,
      markerMap,
      ghostStoneMap,
      showCoordinates = false,
      lines = [],
      selectedVertices = [],
      dimmedVertices = [],
    } = this.props;

    // Memoize event handlers
    const eventHandlers = this.createVertexEventHandlers(this.props);

    // Memoize container style
    const containerStyle: React.CSSProperties = {
      display: "inline-grid",
      gridTemplateRows: showCoordinates ? "1em 1fr 1em" : "1fr",
      gridTemplateColumns: showCoordinates ? "1em 1fr 1em" : "1fr",
      fontSize: vertexSize,
      lineHeight: "1em",
      ...(this.props.style ?? {}),
    };

    // Memoize content style
    const currentContentStyle: React.CSSProperties = {
      ...contentStyle,
      width: `${xs.length}em`,
      height: `${ys.length}em`,
      gridRow: showCoordinates ? "2" : "1",
      gridColumn: showCoordinates ? "2" : "1",
    };

    // Memoize vertices style
    const currentVerticesStyle: React.CSSProperties = {
      ...verticesStyle,
      display: "grid",
      gridTemplateColumns: `repeat(${xs.length}, 1em)`,
      gridTemplateRows: `repeat(${ys.length}, 1em)`,
    };

    const createVertexProps = {
      signMap,
      paintMap,
      heatMap,
      markerMap,
      ghostStoneMap,
      selectedVertices,
      dimmedVertices,
    };

    return (
      <div
        {...innerProps}
        id={this.props.id}
        className={classnames(
          "shudan-goban",
          "shudan-goban-image",
          {
            "shudan-busy": busy,
            "shudan-coordinates": showCoordinates,
          },
          this.props.class ?? this.props.className,
        )}
        style={containerStyle}
      >
        {showCoordinates && (
          <CoordX
            xs={xs}
            style={{ gridRow: "1", gridColumn: "2" }}
            coordX={coordX}
          />
        )}
        {showCoordinates && (
          <CoordY
            height={height}
            ys={ys}
            style={{ gridRow: "2", gridColumn: "1" }}
            coordY={coordY}
          />
        )}

        <div className="shudan-content" style={currentContentStyle}>
          <Grid
            vertexSize={vertexSize}
            width={width}
            height={height}
            xs={xs}
            ys={ys}
            hoshis={hoshis}
          />

          <div className="shudan-vertices" style={currentVerticesStyle}>
            {ys.map((y) =>
              xs.map((x) => {
                const vertexData = this.createVertex(x, y, createVertexProps);
                const { key, ...restVertexProps } = vertexData;
                return (
                  <VertexComponent
                    key={key}
                    {...restVertexProps}
                    {...eventHandlers}
                  />
                );
              }),
            )}
          </div>

          <svg className="shudan-lines" style={linesStyle}>
            <g
              transform={`translate(-${rangeX[0] * vertexSize} -${
                rangeY[0] * vertexSize
              })`}
            >
              {lines.map(({ v1, v2, type }, i) => (
                <Line
                  key={i}
                  v1={v1}
                  v2={v2}
                  type={type}
                  vertexSize={vertexSize}
                />
              ))}
            </g>
          </svg>
        </div>

        {showCoordinates && (
          <CoordY
            height={height}
            ys={ys}
            style={{ gridRow: "2", gridColumn: "3" }}
            coordY={coordY}
          />
        )}
        {showCoordinates && (
          <CoordX
            xs={xs}
            style={{ gridRow: "3", gridColumn: "2" }}
            coordX={coordX}
          />
        )}
      </div>
    );
  }

  static getDerivedStateFromProps(
    props: GobanProps,
    state: GobanState,
  ): Partial<GobanState> | null {
    const {
      signMap = [],
      rangeX = [0, Infinity],
      rangeY = [0, Infinity],
    } = props;

    const width = signMap.length === 0 ? 0 : signMap[0].length;
    const height = signMap.length;

    if (state.width === width && state.height === height) {
      return produce(state, (draft) => {
        draft.signMap = signMap;

        if (
          !vertexEquals(state.rangeX as Vertex, rangeX as Vertex) ||
          !vertexEquals(state.rangeY as Vertex, rangeY as Vertex)
        ) {
          // Range changed
          draft.rangeX = rangeX;
          draft.rangeY = rangeY;
          draft.xs = range(width).slice(rangeX[0], rangeX[1] + 1);
          draft.ys = range(height).slice(rangeY[0], rangeY[1] + 1);
        }
      });
    }

    // Board size changed
    return produce({} as GobanState, (draft) => {
      draft.signMap = signMap;
      draft.width = width;
      draft.height = height;
      draft.rangeX = rangeX;
      draft.rangeY = rangeY;
      draft.xs = range(width).slice(rangeX[0], rangeX[1] + 1);
      draft.ys = range(height).slice(rangeY[0], rangeY[1] + 1);
      draft.hoshis = getHoshis(width, height);
    });
  }
}

// Simple shallow equality check
const shallowEquals = (a: unknown, b: unknown): boolean => {
  return a === b;
};

// Memoize the component to prevent unnecessary re-renders
const Goban = memo(
  GobanComponent,
  (prevProps: GobanProps, nextProps: GobanProps) => {
    // Simple shallow equality check for all props
    const allProps: (keyof GobanProps)[] = [
      "busy",
      "vertexSize",
      "showCoordinates",
      "id",
      "class",
      "className",
      "rangeX",
      "rangeY",
      "lines",
      "selectedVertices",
      "dimmedVertices",
      "signMap",
      "markerMap",
      "paintMap",
      "ghostStoneMap",
      "heatMap",
      "style",
      "innerProps",
      "coordX",
      "coordY",
      ...vertexEvents.map((e) => `onVertex${e}`),
    ] as (keyof GobanProps)[];

    for (const prop of allProps) {
      if (!shallowEquals(prevProps[prop], nextProps[prop])) {
        return false;
      }
    }

    return true;
  },
);

export default Goban;
