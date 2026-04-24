import type { ReactNode, CSSProperties } from "react";

export type ProgressTheme = "light" | "dark";
export type ProgressShape = "linear" | "circular";
export type ProgressSize = "sm" | "md" | "lg";
export type ProgressVariant = "default" | "success" | "warning" | "error";
export type ProgressLabelPlacement = "inside" | "outside" | "none";
export type ProgressStrokeLinecap = "butt" | "round";

export interface ProgressCommonProps {
  value?: number | undefined;
  defaultValue?: number | undefined;
  max?: number | undefined;
  indeterminate?: boolean | undefined;
  shape?: ProgressShape | undefined;
  size?: ProgressSize | undefined;
  variant?: ProgressVariant | undefined;
  theme?: ProgressTheme | undefined;

  segments?: number | undefined;
  buffer?: number | undefined;

  striped?: boolean | undefined;
  animated?: boolean | undefined;

  labelPlacement?: ProgressLabelPlacement | undefined;
  formatLabel?: ((value: number, max: number) => ReactNode) | undefined;

  strokeWidth?: number | undefined;
  strokeLinecap?: ProgressStrokeLinecap | undefined;
  trackOpacity?: number | undefined;

  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;
  announce?: boolean | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ProgressProps extends ProgressCommonProps {
  children?: ReactNode | undefined;
}

export interface ProgressRootProps extends ProgressCommonProps {
  children: ReactNode;
}

export interface ProgressTrackProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export interface ProgressIndicatorProps {
  kind?: "primary" | "buffer" | undefined;
  value?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ProgressLabelProps {
  placement?: "inside" | "outside" | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export interface ProgressValueTextProps {
  format?: ((value: number, max: number) => ReactNode) | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
