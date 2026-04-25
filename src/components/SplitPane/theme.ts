import type { SplitPaneTheme } from "./SplitPane.types";

export interface SplitPanePalette {
  dividerBg: string;
  dividerHover: string;
  dividerActive: string;
  dividerHandleFg: string;
  collapseBtnBg: string;
  collapseBtnFg: string;
  collapseBtnBorder: string;
  focusRing: string;
}

export const splitPanePalette: Record<SplitPaneTheme, SplitPanePalette> = {
  light: {
    dividerBg: "rgba(0,0,0,0.08)",
    dividerHover: "rgba(37,99,235,0.35)",
    dividerActive: "#2563eb",
    dividerHandleFg: "rgba(0,0,0,0.35)",
    collapseBtnBg: "#ffffff",
    collapseBtnFg: "#374151",
    collapseBtnBorder: "rgba(0,0,0,0.12)",
    focusRing: "#2563eb",
  },
  dark: {
    dividerBg: "rgba(255,255,255,0.08)",
    dividerHover: "rgba(96,165,250,0.35)",
    dividerActive: "#60a5fa",
    dividerHandleFg: "rgba(255,255,255,0.5)",
    collapseBtnBg: "#1f2937",
    collapseBtnFg: "#e5e7eb",
    collapseBtnBorder: "rgba(255,255,255,0.08)",
    focusRing: "#60a5fa",
  },
};
