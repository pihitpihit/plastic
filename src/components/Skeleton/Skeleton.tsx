import { SkeletonRoot } from "./SkeletonRoot";
import { SkeletonText } from "./SkeletonText";
import { SkeletonAvatar } from "./SkeletonAvatar";
import { SkeletonCard } from "./SkeletonCard";

const Noop = () => null;

export const Skeleton = {
  Root: SkeletonRoot,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
  Table: Noop,
};
