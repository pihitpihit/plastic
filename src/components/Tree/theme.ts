import type { TreeTheme } from "./Tree.types";

export interface TreePalette {
  rowHover: string;
  rowSelected: string;
  rowSelectedText: string;
  textPrimary: string;
  textSecondary: string;
  focus: string;
  guide: string;
  toggleFg: string;
  checkboxBorder: string;
  checkboxChecked: string;
  disabledFg: string;
  loadingFg: string;
  errorFg: string;
}

export const treePalette: Record<TreeTheme, TreePalette> = {
  light: {
    rowHover: "rgba(0,0,0,0.04)",
    rowSelected: "rgba(37,99,235,0.10)",
    rowSelectedText: "#1d4ed8",
    textPrimary: "#111827",
    textSecondary: "#6b7280",
    focus: "#2563eb",
    guide: "rgba(0,0,0,0.10)",
    toggleFg: "#6b7280",
    checkboxBorder: "rgba(0,0,0,0.25)",
    checkboxChecked: "#2563eb",
    disabledFg: "rgba(0,0,0,0.40)",
    loadingFg: "#9ca3af",
    errorFg: "#dc2626",
  },
  dark: {
    rowHover: "rgba(255,255,255,0.06)",
    rowSelected: "rgba(96,165,250,0.18)",
    rowSelectedText: "#bfdbfe",
    textPrimary: "#e5e7eb",
    textSecondary: "#9ca3af",
    focus: "#60a5fa",
    guide: "rgba(255,255,255,0.10)",
    toggleFg: "#9ca3af",
    checkboxBorder: "rgba(255,255,255,0.25)",
    checkboxChecked: "#60a5fa",
    disabledFg: "rgba(255,255,255,0.40)",
    loadingFg: "#6b7280",
    errorFg: "#f87171",
  },
};
