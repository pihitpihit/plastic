import type { SelectTheme } from "./Select.types";

export interface SelectPalette {
  triggerBg: string;
  triggerBgHover: string;
  triggerBorder: string;
  triggerBorderHover: string;
  triggerFg: string;
  triggerFgMuted: string;
  triggerFocusRing: string;

  contentBg: string;
  contentBorder: string;
  contentShadow: string;

  itemFg: string;
  itemBgHover: string;
  itemBgActive: string;
  itemFgSelected: string;
  itemFgDisabled: string;
  itemIndicatorFg: string;

  labelFg: string;
  separatorBg: string;
}

export const selectPalette: Record<SelectTheme, SelectPalette> = {
  light: {
    triggerBg: "#ffffff",
    triggerBgHover: "#f9fafb",
    triggerBorder: "#d1d5db",
    triggerBorderHover: "#9ca3af",
    triggerFg: "#111827",
    triggerFgMuted: "#9ca3af",
    triggerFocusRing: "#2563eb",

    contentBg: "#ffffff",
    contentBorder: "rgba(0,0,0,0.08)",
    contentShadow: "0 10px 32px rgba(0,0,0,0.12)",

    itemFg: "#111827",
    itemBgHover: "#f3f4f6",
    itemBgActive: "#e5edff",
    itemFgSelected: "#2563eb",
    itemFgDisabled: "#9ca3af",
    itemIndicatorFg: "#2563eb",

    labelFg: "#6b7280",
    separatorBg: "rgba(0,0,0,0.08)",
  },
  dark: {
    triggerBg: "#1f2937",
    triggerBgHover: "#374151",
    triggerBorder: "rgba(255,255,255,0.12)",
    triggerBorderHover: "rgba(255,255,255,0.24)",
    triggerFg: "#e5e7eb",
    triggerFgMuted: "#6b7280",
    triggerFocusRing: "#60a5fa",

    contentBg: "#1f2937",
    contentBorder: "rgba(255,255,255,0.08)",
    contentShadow: "0 10px 32px rgba(0,0,0,0.45)",

    itemFg: "#e5e7eb",
    itemBgHover: "#374151",
    itemBgActive: "#1e3a8a",
    itemFgSelected: "#60a5fa",
    itemFgDisabled: "#6b7280",
    itemIndicatorFg: "#60a5fa",

    labelFg: "#9ca3af",
    separatorBg: "rgba(255,255,255,0.08)",
  },
};
