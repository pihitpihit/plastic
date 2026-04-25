import type { AccordionTheme } from "./Accordion.types";

export interface AccordionPaletteTokens {
  rootBg: string;
  itemBg: string;
  itemBorder: string;
  headerBg: string;
  headerBgHover: string;
  headerBgActive: string;
  triggerFg: string;
  triggerFgDisabled: string;
  chevronFg: string;
  contentBg: string;
  contentFg: string;
  focusRing: string;
}

export const accordionPalette: Record<AccordionTheme, AccordionPaletteTokens> = {
  light: {
    rootBg: "transparent",
    itemBg: "#ffffff",
    itemBorder: "rgba(0,0,0,0.08)",
    headerBg: "#ffffff",
    headerBgHover: "#f8fafc",
    headerBgActive: "#eef2f7",
    triggerFg: "#0f172a",
    triggerFgDisabled: "rgba(15,23,42,0.35)",
    chevronFg: "rgba(15,23,42,0.55)",
    contentBg: "#ffffff",
    contentFg: "#111827",
    focusRing: "#2563eb",
  },
  dark: {
    rootBg: "transparent",
    itemBg: "#0f172a",
    itemBorder: "rgba(255,255,255,0.08)",
    headerBg: "#0f172a",
    headerBgHover: "#121a2d",
    headerBgActive: "#17213b",
    triggerFg: "#e5e7eb",
    triggerFgDisabled: "rgba(229,231,235,0.35)",
    chevronFg: "rgba(229,231,235,0.7)",
    contentBg: "#0f172a",
    contentFg: "#cbd5e1",
    focusRing: "#60a5fa",
  },
};

export function paletteToCssVars(theme: AccordionTheme): Record<string, string> {
  const p = accordionPalette[theme];
  return {
    "--acc-root-bg": p.rootBg,
    "--acc-item-bg": p.itemBg,
    "--acc-item-border": p.itemBorder,
    "--acc-header-bg": p.headerBg,
    "--acc-header-bg-hover": p.headerBgHover,
    "--acc-header-bg-active": p.headerBgActive,
    "--acc-trigger-fg": p.triggerFg,
    "--acc-trigger-fg-disabled": p.triggerFgDisabled,
    "--acc-chevron-fg": p.chevronFg,
    "--acc-content-bg": p.contentBg,
    "--acc-content-fg": p.contentFg,
    "--acc-focus-ring": p.focusRing,
  };
}
