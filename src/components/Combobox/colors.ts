import type { ComboboxTheme } from "./Combobox.types";

export interface ComboboxPalette {
  anchorBg: string;
  anchorBorder: string;
  anchorBorderHover: string;
  anchorBorderFocus: string;
  anchorFg: string;
  placeholderFg: string;
  triggerFg: string;

  contentBg: string;
  contentBorder: string;
  contentShadow: string;
  itemBg: string;
  itemBgActive: string;
  itemBgHover: string;
  itemFg: string;
  itemFgDisabled: string;
  itemMarkFg: string;

  groupHeadingFg: string;

  chipBg: string;
  chipBorder: string;
  chipFg: string;
  chipRemoveFg: string;

  emptyFg: string;
  loadingFg: string;
  focusRing: string;
}

export const comboboxPalette: Record<ComboboxTheme, ComboboxPalette> = {
  light: {
    anchorBg: "#ffffff",
    anchorBorder: "rgba(0,0,0,0.12)",
    anchorBorderHover: "rgba(0,0,0,0.24)",
    anchorBorderFocus: "#2563eb",
    anchorFg: "#111827",
    placeholderFg: "#9ca3af",
    triggerFg: "#6b7280",

    contentBg: "#ffffff",
    contentBorder: "rgba(0,0,0,0.08)",
    contentShadow:
      "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
    itemBg: "transparent",
    itemBgActive: "#eff6ff",
    itemBgHover: "#f3f4f6",
    itemFg: "#111827",
    itemFgDisabled: "#9ca3af",
    itemMarkFg: "#2563eb",

    groupHeadingFg: "#6b7280",

    chipBg: "#eff6ff",
    chipBorder: "#bfdbfe",
    chipFg: "#1e40af",
    chipRemoveFg: "#1e3a8a",

    emptyFg: "#6b7280",
    loadingFg: "#6b7280",
    focusRing: "#2563eb",
  },
  dark: {
    anchorBg: "#1f2937",
    anchorBorder: "rgba(255,255,255,0.10)",
    anchorBorderHover: "rgba(255,255,255,0.20)",
    anchorBorderFocus: "#60a5fa",
    anchorFg: "#e5e7eb",
    placeholderFg: "#6b7280",
    triggerFg: "#9ca3af",

    contentBg: "#1f2937",
    contentBorder: "rgba(255,255,255,0.08)",
    contentShadow:
      "0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3)",
    itemBg: "transparent",
    itemBgActive: "rgba(59,130,246,0.18)",
    itemBgHover: "rgba(255,255,255,0.05)",
    itemFg: "#e5e7eb",
    itemFgDisabled: "#6b7280",
    itemMarkFg: "#93c5fd",

    groupHeadingFg: "#9ca3af",

    chipBg: "rgba(59,130,246,0.15)",
    chipBorder: "rgba(96,165,250,0.3)",
    chipFg: "#93c5fd",
    chipRemoveFg: "#60a5fa",

    emptyFg: "#9ca3af",
    loadingFg: "#9ca3af",
    focusRing: "#60a5fa",
  },
};
