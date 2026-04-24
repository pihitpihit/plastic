import { SkeletonRoot } from "./SkeletonRoot";
import { SkeletonText } from "./SkeletonText";

const Noop = () => null;

export const Skeleton = {
  Root: SkeletonRoot,
  Text: SkeletonText,
  Avatar: Noop,
  Card: Noop,
  Table: Noop,
};
