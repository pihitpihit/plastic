import type { CSSProperties } from "react";
import type { SkeletonTheme } from "./Skeleton.types";

export interface SkeletonPalette {
  bg: string;
  shine: string;
  border: string;
  cardBg: string;
  cardBorder: string;
  rowSep: string;
}

export const skeletonPalette: Record<SkeletonTheme, SkeletonPalette> = {
  light: {
    bg: "#e5e7eb",
    shine: "rgba(255,255,255,0.7)",
    border: "rgba(0,0,0,0.06)",
    cardBg: "#ffffff",
    cardBorder: "rgba(0,0,0,0.08)",
    rowSep: "rgba(0,0,0,0.06)",
  },
  dark: {
    bg: "#334155",
    shine: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.06)",
    cardBg: "#0f172a",
    cardBorder: "rgba(255,255,255,0.08)",
    rowSep: "rgba(255,255,255,0.06)",
  },
};

export function applyPaletteVars(theme: SkeletonTheme): CSSProperties {
  const p = skeletonPalette[theme];
  return {
    ["--sk-bg" as string]: p.bg,
    ["--sk-shine" as string]: p.shine,
  } as CSSProperties;
}
