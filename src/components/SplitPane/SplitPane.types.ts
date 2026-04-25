import type { CSSProperties, ReactNode } from "react";

export type SplitPaneTheme = "light" | "dark";
export type SplitPaneDirection = "horizontal" | "vertical";
export type SplitPaneSize = number | `${number}%`;
export type SplitPaneCollapsible = "start" | "end" | "both" | "none";

export interface SplitPaneRootProps {
  direction?: SplitPaneDirection | undefined;
  defaultSize?: SplitPaneSize | undefined;
  size?: SplitPaneSize | undefined;
  onSizeChange?: ((sizePx: number, sizePercent: number) => void) | undefined;
  onSizeChangeEnd?: ((sizePx: number, sizePercent: number) => void) | undefined;

  minSize?: SplitPaneSize | undefined;
  maxSize?: SplitPaneSize | undefined;

  snapSize?: SplitPaneSize | undefined;
  snapThreshold?: number | undefined;

  collapsible?: SplitPaneCollapsible | undefined;
  collapsedSize?: number | undefined;
  collapseThreshold?: number | undefined;

  storageKey?: string | undefined;

  theme?: SplitPaneTheme | undefined;

  disabled?: boolean | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;

  "aria-label"?: string | undefined;

  children: ReactNode;
}

export interface SplitPaneProps {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  label?: string | undefined;
}

export interface SplitPaneDividerProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  "aria-label"?: string | undefined;
  children?: ReactNode | undefined;
}

export interface SplitPaneCollapseButtonProps {
  which: "start" | "end";
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
  "aria-label"?: string | undefined;
}
