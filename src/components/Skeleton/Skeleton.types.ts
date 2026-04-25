import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type SkeletonTheme = "light" | "dark";

export type SkeletonShape = "text" | "rect" | "circle";

export type SkeletonAnimation = "shimmer" | "pulse" | false;

export type SkeletonSize = number | string;

export interface SkeletonRootProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  shape?: SkeletonShape | undefined;
  animation?: SkeletonAnimation | undefined;
  width?: SkeletonSize | undefined;
  height?: SkeletonSize | undefined;
  size?: SkeletonSize | undefined;
  borderRadius?: SkeletonSize | undefined;
  theme?: SkeletonTheme | undefined;
  visible?: boolean | undefined;
  fadeMs?: number | undefined;
  children?: ReactNode | undefined;
  "aria-label"?: string | undefined;
}

export interface SkeletonTextProps {
  lines?: number | undefined;
  lastLineWidth?: SkeletonSize | null | undefined;
  gap?: number | undefined;
  randomize?: boolean | undefined;
  lineHeight?: SkeletonSize | undefined;
  widthRange?: [number, number] | undefined;
  seed?: number | undefined;
  animation?: SkeletonAnimation | undefined;
  theme?: SkeletonTheme | undefined;
  visible?: boolean | undefined;
  fadeMs?: number | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  "aria-label"?: string | undefined;
}

export interface SkeletonAvatarProps {
  shape?: "circle" | "rounded" | "square" | undefined;
  size?: SkeletonSize | undefined;
  animation?: SkeletonAnimation | undefined;
  theme?: SkeletonTheme | undefined;
  visible?: boolean | undefined;
  fadeMs?: number | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  "aria-label"?: string | undefined;
}

export interface SkeletonCardProps {
  hasMedia?: boolean | undefined;
  mediaHeight?: SkeletonSize | undefined;
  hasTitle?: boolean | undefined;
  lines?: number | undefined;
  hasFooter?: boolean | undefined;
  hasAvatar?: boolean | undefined;
  width?: SkeletonSize | undefined;
  padding?: number | undefined;
  animation?: SkeletonAnimation | undefined;
  theme?: SkeletonTheme | undefined;
  visible?: boolean | undefined;
  fadeMs?: number | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  "aria-label"?: string | undefined;
}

export interface SkeletonTableProps {
  rows?: number | undefined;
  cols?: number | undefined;
  hasHeader?: boolean | undefined;
  rowHeight?: SkeletonSize | undefined;
  colWidths?: SkeletonSize[] | undefined;
  animation?: SkeletonAnimation | undefined;
  theme?: SkeletonTheme | undefined;
  visible?: boolean | undefined;
  fadeMs?: number | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  "aria-label"?: string | undefined;
}
