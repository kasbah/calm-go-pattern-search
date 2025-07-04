import {
  createElement as h,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import Goban from "./Goban.js";

const BoundedGoban = memo(function BoundedGoban(props) {
  const {
    showCoordinates,
    maxWidth,
    maxHeight,
    maxVertexSize = Infinity,
    rangeX,
    rangeY,
    signMap,
    onResized = () => {},
    innerProps = {},
    style = {},
    ...otherProps
  } = props;

  const [vertexSize, setVertexSize] = useState(1);
  const [visibility, setVisibility] = useState("hidden");
  const elementRef = useRef(null);
  const { ref: innerRef = () => {} } = innerProps;

  // Memoize dependencies for useEffect
  const rangeXString = useMemo(() => JSON.stringify(rangeX), [rangeX]);
  const rangeYString = useMemo(() => JSON.stringify(rangeY), [rangeY]);
  const signMapDimensions = useMemo(
    () => ({
      height: signMap.length,
      width: (signMap[0] || []).length,
    }),
    [signMap],
  );

  // Memoize the resize calculation
  const calculateVertexSize = useCallback(() => {
    if (!elementRef.current) return 1;

    const { offsetWidth, offsetHeight } = elementRef.current;
    const scale = Math.min(maxWidth / offsetWidth, maxHeight / offsetHeight);
    return Math.max(Math.floor(vertexSize * scale), 1);
  }, [maxWidth, maxHeight, vertexSize]);

  // Handle resize and visibility logic
  useEffect(() => {
    const shouldUpdate =
      visibility !== "visible" ||
      (elementRef.current && visibility === "visible");

    if (shouldUpdate && elementRef.current) {
      const newVertexSize = calculateVertexSize();

      if (vertexSize !== newVertexSize) {
        setVertexSize(newVertexSize);
        onResized();
      }

      if (visibility !== "visible") {
        setVisibility("visible");
      }
    }
  }, [
    showCoordinates,
    maxWidth,
    maxHeight,
    maxVertexSize,
    rangeXString,
    rangeYString,
    signMapDimensions.height,
    signMapDimensions.width,
    visibility,
    vertexSize,
    calculateVertexSize,
    onResized,
  ]);

  // Memoize the ref callback
  const refCallback = useCallback(
    (el) => {
      innerRef(el);
      elementRef.current = el;
    },
    [innerRef],
  );

  // Memoize the final style object
  const finalStyle = useMemo(
    () => ({
      visibility,
      ...style,
    }),
    [visibility, style],
  );

  // Memoize the inner props
  const finalInnerProps = useMemo(
    () => ({
      ...innerProps,
      ref: refCallback,
    }),
    [innerProps, refCallback],
  );

  return h(Goban, {
    ...otherProps,
    showCoordinates,
    maxWidth,
    maxHeight,
    maxVertexSize,
    rangeX,
    rangeY,
    signMap,
    onResized,
    innerProps: finalInnerProps,
    style: finalStyle,
    vertexSize: Math.min(vertexSize, maxVertexSize),
  });
});

export default BoundedGoban;
