import type { ProgressTheme, ProgressVariant } from "./Progress.types";

export interface ProgressVariantPalette {
  fill: string;
  buffer: string;
}

export interface ProgressPalette {
  track: string;
  trackSegmented: string;
  labelFg: string;
  valueTextFg: string;
  valueTextFgOut: string;
  variants: Record<ProgressVariant, ProgressVariantPalette>;
}

export const progressPalette: Record<ProgressTheme, ProgressPalette> = {
  light: {
    track: "rgba(0,0,0,0.08)",
    trackSegmented: "rgba(0,0,0,0.05)",
    labelFg: "#374151",
    valueTextFg: "#ffffff",
    valueTextFgOut: "#374151",
    variants: {
      default: { fill: "#2563eb", buffer: "rgba(37,99,235,0.30)" },
      success: { fill: "#16a34a", buffer: "rgba(22,163,74,0.30)" },
      warning: { fill: "#d97706", buffer: "rgba(217,119,6,0.30)" },
      error: { fill: "#dc2626", buffer: "rgba(220,38,38,0.30)" },
    },
  },
  dark: {
    track: "rgba(255,255,255,0.10)",
    trackSegmented: "rgba(255,255,255,0.06)",
    labelFg: "#e5e7eb",
    valueTextFg: "#0b1220",
    valueTextFgOut: "#e5e7eb",
    variants: {
      default: { fill: "#60a5fa", buffer: "rgba(96,165,250,0.30)" },
      success: { fill: "#34d399", buffer: "rgba(52,211,153,0.30)" },
      warning: { fill: "#fbbf24", buffer: "rgba(251,191,36,0.30)" },
      error: { fill: "#f87171", buffer: "rgba(248,113,113,0.30)" },
    },
  },
};
