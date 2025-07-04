import { createElement as h, memo, useMemo } from "react";

// Static styles to avoid recreation
const baseContainerStyle = {
  position: "absolute",
};

const circleLabelContainerStyle = {
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const circleLabelInnerStyle = {
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
  viewBox: "0 0 1 1",
};

const Marker = memo(function Marker({ sign, type, label, zIndex, color }) {
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
    if (type !== "circle-label") return null;

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
    if (type !== "circle-label") return null;

    return {
      ...containerProps.style,
      backgroundImage: circleLabelBackground,
      ...circleLabelContainerStyle,
    };
  }, [containerProps.style, circleLabelBackground, type]);

  const circleLabelInnerTextStyle = useMemo(() => {
    if (type !== "circle-label") return null;

    return {
      ...circleLabelInnerStyle,
      color: color === "whitesmoke" ? "black" : "white",
    };
  }, [color, type]);

  if (type === "circle-label") {
    return h(
      "div",
      {
        ...containerProps,
        style: circleLabelStyle,
      },
      h(
        "div",
        {
          style: circleLabelInnerTextStyle,
        },
        label,
      ),
    );
  }

  // Memoize SVG content to prevent recreation
  const svgContent = useMemo(() => {
    if (type === "circle" || type === "loader" || type === "point") {
      return h("circle", {
        cx: 0.484,
        cy: 0.484,
        r: type === "point" ? 0.18 : 0.25,
        "vector-effect": "non-scaling-stroke",
      });
    }

    if (type === "square") {
      return h("rect", {
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.5,
        "vector-effect": "non-scaling-stroke",
      });
    }

    if (type === "cross") {
      return [
        sign === 0 &&
          h("rect", {
            key: "cross-bg",
            x: 0.25,
            y: 0.25,
            width: 0.5,
            height: 0.5,
            stroke: "none",
          }),
        h("path", {
          key: "cross-path",
          d: "M 0 0 L .5 .5 M .5 0 L 0 .5",
          transform: "translate(.25 .25)",
          "vector-effect": "non-scaling-stroke",
        }),
      ];
    }

    if (type === "triangle") {
      return h("path", {
        d: "M 0 .5 L .6 .5 L .3 0 z",
        transform: "translate(.2 .2)",
        "vector-effect": "non-scaling-stroke",
      });
    }

    return null;
  }, [type, sign]);

  return type === "label"
    ? h("div", containerProps, label)
    : h(
        "svg",
        {
          ...containerProps,
          ...svgContainerProps,
        },
        svgContent,
      );
});

export default Marker;
