import { SkeletonRoot } from "./SkeletonRoot";

const Noop = () => null;

export const Skeleton = {
  Root: SkeletonRoot,
  Text: Noop,
  Avatar: Noop,
  Card: Noop,
  Table: Noop,
};
