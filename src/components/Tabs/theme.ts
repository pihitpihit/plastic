import type { TabsTheme } from "./Tabs.types";

export interface TabsPalette {
  rootBg: string;
  listBorder: string;
  triggerFg: string;
  triggerHoverFg: string;
  triggerHoverBg: string;
  triggerActiveFg: string;
  indicatorBg: string;
  closeHoverBg: string;
  scrollBtnFg: string;
  scrollBtnBg: string;
  scrollBtnHoverBg: string;
  focusRing: string;
  disabledFg: string;
}

export const tabsPalette: Record<TabsTheme, TabsPalette> = {
  light: {
    rootBg: "transparent",
    listBorder: "rgba(0,0,0,0.08)",
    triggerFg: "#6b7280",
    triggerHoverFg: "#111827",
    triggerHoverBg: "rgba(0,0,0,0.03)",
    triggerActiveFg: "#2563eb",
    indicatorBg: "#2563eb",
    closeHoverBg: "rgba(0,0,0,0.08)",
    scrollBtnFg: "#6b7280",
    scrollBtnBg: "rgba(255,255,255,0.85)",
    scrollBtnHoverBg: "rgba(0,0,0,0.05)",
    focusRing: "#2563eb",
    disabledFg: "rgba(0,0,0,0.35)",
  },
  dark: {
    rootBg: "transparent",
    listBorder: "rgba(255,255,255,0.08)",
    triggerFg: "#9ca3af",
    triggerHoverFg: "#f3f4f6",
    triggerHoverBg: "rgba(255,255,255,0.04)",
    triggerActiveFg: "#60a5fa",
    indicatorBg: "#60a5fa",
    closeHoverBg: "rgba(255,255,255,0.1)",
    scrollBtnFg: "#9ca3af",
    scrollBtnBg: "rgba(17,24,39,0.85)",
    scrollBtnHoverBg: "rgba(255,255,255,0.06)",
    focusRing: "#60a5fa",
    disabledFg: "rgba(255,255,255,0.3)",
  },
};
