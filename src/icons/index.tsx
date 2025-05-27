import { Icon, type LucideProps, type IconNode } from "lucide-react";

const circleBlack: IconNode = [
  [
    "circle",
    {
      cx: "12",
      cy: "12",
      r: "7.45",
      fill: "#000000",
      strokeWidth: "1.49",
      key: "circle",
    },
  ],
];

export const CircleBlack = (props: LucideProps) => {
  return <Icon {...props} iconNode={circleBlack} />;
};
const circleWhite: IconNode = [
  [
    "circle",
    { cx: "12", cy: "12", r: "7.45", strokeWidth: "1.49", key: "circle" },
  ],
];

export const CircleWhite = (props: LucideProps) => {
  return <Icon {...props} iconNode={circleWhite} />;
};

const overlappingCirclesBlack: IconNode = [
  [
    "circle",
    { cx: "8.98", cy: "11.92", r: "7.45", strokeWidth: "1.49", key: "circle1" },
  ],
  [
    "circle",
    {
      cx: "15.15",
      cy: "12.08",
      r: "7.45",
      fill: "#000000",
      strokeWidth: "1.49",
      key: "circle2",
    },
  ],
];

export const OverlappingCirclesBlack = (props: LucideProps) => {
  return <Icon {...props} iconNode={overlappingCirclesBlack} />;
};

const overlappingCirclesWhite: IconNode = [
  [
    "circle",
    {
      cx: "8.98",
      cy: "11.8",
      r: "7.45",
      fill: "#000000",
      strokeWidth: "1.49",
      key: "circle1",
    },
  ],
  [
    "circle",
    {
      cx: "15.15",
      cy: "11.96",
      r: "7.45",
      fill: "#ffffff",
      strokeWidth: "1.49",
      key: "circle2",
    },
  ],
];

export const OverlappingCirclesWhite = (props: LucideProps) => {
  return <Icon {...props} iconNode={overlappingCirclesWhite} />;
};
