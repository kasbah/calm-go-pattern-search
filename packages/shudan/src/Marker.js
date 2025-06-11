import { createElement as h } from "react";

export default function Marker({ sign, type, label, zIndex, color }) {
  let containerProps = {
    className: "shudan-marker",
    style: {
      position: "absolute",
      zIndex,
    },
  };

  if (type === "circle-label") {
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
    const svgBackground = `url("data:image/svg+xml;charset=utf-8,${encodedSvg}")`;

    return h(
      "div",
      {
        ...containerProps,
        style: {
          ...containerProps.style,
          backgroundImage: svgBackground,
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      h(
        "div",
        {
          style: {
            fontSize: "0.5em",
            lineHeight: "1",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            color: color === "whitesmoke" ? "black" : "white",
            marginTop: "-0.1em",
            marginLeft: "-0.07em",
          },
        },
        label,
      ),
    );
  }

  return type === "label"
    ? h("div", containerProps, label)
    : h(
        "svg",
        {
          ...containerProps,
          viewBox: "0 0 1 1",
        },

        type === "circle" || type === "loader" || type === "point"
          ? h("circle", {
              cx: 0.484,
              cy: 0.484,
              r: type === "point" ? 0.18 : 0.25,
              "vector-effect": "non-scaling-stroke",
            })
          : type === "square"
            ? h("rect", {
                x: 0.25,
                y: 0.25,
                width: 0.5,
                height: 0.5,
                "vector-effect": "non-scaling-stroke",
              })
            : type === "cross"
              ? [
                  sign === 0 &&
                    h("rect", {
                      x: 0.25,
                      y: 0.25,
                      width: 0.5,
                      height: 0.5,
                      stroke: "none",
                    }),
                  h("path", {
                    d: "M 0 0 L .5 .5 M .5 0 L 0 .5",
                    transform: "translate(.25 .25)",
                    "vector-effect": "non-scaling-stroke",
                  }),
                ]
              : type === "triangle"
                ? h("path", {
                    d: "M 0 .5 L .6 .5 L .3 0 z",
                    transform: "translate(.2 .2)",
                    "vector-effect": "non-scaling-stroke",
                  })
                : null,
      );
}
