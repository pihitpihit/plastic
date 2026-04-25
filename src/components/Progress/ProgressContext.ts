import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type {
  ProgressShape,
  ProgressSize,
  ProgressVariant,
  ProgressTheme,
  ProgressLabelPlacement,
  ProgressStrokeLinecap,
} from "./Progress.types";

export interface ProgressContextValue {
  mode: "determinate" | "indeterminate";
  shape: ProgressShape;
  size: ProgressSize;
  variant: ProgressVariant;
  theme: ProgressTheme;
  value: number | null;
  max: number;
  percent: number | null;
  buffer: number | null;
  bufferPercent: number | null;
  segments: { count: number; filled: number } | null;
  striped: boolean;
  animated: boolean;
  labelPlacement: ProgressLabelPlacement;
  formatLabel: (value: number, max: number) => ReactNode;
  strokeWidth: number;
  strokeLinecap: ProgressStrokeLinecap;
  trackOpacity: number;
  announce: boolean;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

export function useProgressContext(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (ctx === null) {
    throw new Error("Progress.* must be used within <Progress.Root>");
  }
  return ctx;
}
