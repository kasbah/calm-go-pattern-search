import React, { memo, useMemo } from "react";

// Static styles to avoid recreation
const baseContainerStyle: React.CSSProperties = {
  position: "absolute",
};

const circleLabelContainerStyle: React.CSSProperties = {
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const circleLabelInnerStyle: React.CSSProperties = {
  fontSize: "0.5em",
  lineHeight: "1",
  textAlign: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  marginTop: "-0.1em",
  marginLeft: "-0.07em",
};

const svgContainerProps = {
  viewBox: "0 0 1 1" as const,
};

interface MarkerProps {
  sign: number;
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
  zIndex?: number;
  color?: string | null;
}

const Marker = memo(function Marker({
  sign,
  type,
  label,
  zIndex,
  color,
}: MarkerProps) {
  // Memoize container props to prevent recreation
  const containerProps = useMemo(
    () => ({
      className: "shudan-marker",
      style: {
        ...baseContainerStyle,
        zIndex,
      },
    }),
    [zIndex],
  );

  // Memoize expensive SVG generation for circle-label
  const circleLabelBackground = useMemo(() => {
    if (type !== "circle-label") return undefined;

    const svg = `
      <svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg">
        <circle
          cx="0.484"
          cy="0.484"
          r="0.4"
          vector-effect="non-scaling-stroke"
          fill="${color}"
          stroke="${color === "whitesmoke" ? "grey" : "white"}"
        />
      </svg>
    `;
    const encodedSvg = encodeURIComponent(svg.trim());
    return `url("data:image/svg+xml;charset=utf-8,${encodedSvg}")`;
  }, [type, color]);

  // Memoize circle-label styles
  const circleLabelStyle = useMemo(() => {
    if (type !== "circle-label") return undefined;

    return {
      ...containerProps.style,
      backgroundImage: circleLabelBackground,
      ...circleLabelContainerStyle,
    };
  }, [containerProps.style, circleLabelBackground, type]);

  const circleLabelInnerTextStyle = useMemo(() => {
    if (type !== "circle-label") return undefined;

    return {
      ...circleLabelInnerStyle,
      color: color === "whitesmoke" ? "black" : "white",
    };
  }, [color, type]);

  // Memoize SVG content to prevent recreation
  const svgContent = useMemo(() => {
    if (type === "circle" || type === "loader" || type === "point") {
      return (
        <circle
          cx={0.48}
          cy={0.48}
          r={type === "point" ? 0.18 : 0.25}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    if (type === "square") {
      return (
        <rect
          x={0.25}
          y={0.25}
          width={0.5}
          height={0.5}
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    if (type === "cross") {
      return (
        <>
          {sign === 0 && (
            <rect
              key="cross-bg"
              x={0.25}
              y={0.25}
              width={0.5}
              height={0.5}
              stroke="none"
            />
          )}
          <path
            key="cross-path"
            d="M 0 0 L .5 .5 M .5 0 L 0 .5"
            transform="translate(.25 .25)"
            vectorEffect="non-scaling-stroke"
          />
        </>
      );
    }

    if (type === "triangle") {
      return (
        <path
          d="M 0 .5 L .6 .5 L .3 0 z"
          transform="translate(.2 .2)"
          vectorEffect="non-scaling-stroke"
        />
      );
    }

    return null;
  }, [type, sign]);

  if (type === "circle-label") {
    return (
      <div {...containerProps} style={circleLabelStyle}>
        <div style={circleLabelInnerTextStyle}>{label}</div>
      </div>
    );
  }

  return type === "label" ? (
    <div {...containerProps}>{label}</div>
  ) : (
    <svg {...containerProps} {...svgContainerProps}>
      {svgContent}
    </svg>
  );
});

export default Marker;
