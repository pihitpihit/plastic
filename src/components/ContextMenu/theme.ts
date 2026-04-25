import type { ContextMenuTheme } from "./ContextMenu.types";

export interface ContextMenuPaletteTokens {
  contentBg: string;
  contentFg: string;
  contentBorder: string;
  contentShadow: string;
  itemHoverBg: string;
  itemActiveBg: string;
  itemDisabledFg: string;
  itemDangerFg: string;
  itemDangerBg: string;
  separatorBg: string;
  labelFg: string;
  shortcutFg: string;
  checkFg: string;
  radioFg: string;
  focusRing: string;
}

export const contextMenuPalette: Record<ContextMenuTheme, ContextMenuPaletteTokens> = {
  light: {
    contentBg: "#ffffff",
    contentFg: "#111827",
    contentBorder: "rgba(0,0,0,0.08)",
    contentShadow:
      "0 12px 32px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)",
    itemHoverBg: "rgba(37,99,235,0.08)",
    itemActiveBg: "rgba(37,99,235,0.14)",
    itemDisabledFg: "rgba(17,24,39,0.35)",
    itemDangerFg: "#dc2626",
    itemDangerBg: "rgba(220,38,38,0.08)",
    separatorBg: "rgba(0,0,0,0.08)",
    labelFg: "rgba(17,24,39,0.55)",
    shortcutFg: "rgba(17,24,39,0.50)",
    checkFg: "#2563eb",
    radioFg: "#2563eb",
    focusRing: "#2563eb",
  },
  dark: {
    contentBg: "#1f2937",
    contentFg: "#e5e7eb",
    contentBorder: "rgba(255,255,255,0.08)",
    contentShadow:
      "0 12px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)",
    itemHoverBg: "rgba(96,165,250,0.12)",
    itemActiveBg: "rgba(96,165,250,0.20)",
    itemDisabledFg: "rgba(229,231,235,0.40)",
    itemDangerFg: "#f87171",
    itemDangerBg: "rgba(248,113,113,0.15)",
    separatorBg: "rgba(255,255,255,0.08)",
    labelFg: "rgba(229,231,235,0.55)",
    shortcutFg: "rgba(229,231,235,0.50)",
    checkFg: "#60a5fa",
    radioFg: "#60a5fa",
    focusRing: "#60a5fa",
  },
};
