import { SkeletonRoot } from "./SkeletonRoot";
import { SkeletonText } from "./SkeletonText";
import { SkeletonAvatar } from "./SkeletonAvatar";

const Noop = () => null;

export const Skeleton = {
  Root: SkeletonRoot,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: Noop,
  Table: Noop,
};
