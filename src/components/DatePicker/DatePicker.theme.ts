import type { DatePickerTheme } from "./DatePicker.types";

export interface DatePickerPalette {
  bg: string;
  border: string;
  inputBg: string;
  inputFg: string;
  inputPlaceholder: string;
  inputFocusRing: string;
  inputError: string;

  calendarBg: string;
  calendarBorder: string;
  calendarShadow: string;

  weekdayFg: string;

  dayFg: string;
  dayBg: string;
  dayHoverBg: string;
  dayOutsideFg: string;

  todayRing: string;
  selectedBg: string;
  selectedFg: string;

  rangeBg: string;
  rangeFg: string;
  rangePreviewBg: string;

  disabledFg: string;

  navFg: string;
  navHoverBg: string;

  footerBorder: string;
  ghostHoverBg: string;
  ghostFg: string;
}

export const datePickerPalette: Record<DatePickerTheme, DatePickerPalette> = {
  light: {
    bg: "#ffffff",
    border: "rgba(0,0,0,0.12)",
    inputBg: "#ffffff",
    inputFg: "#111827",
    inputPlaceholder: "#9ca3af",
    inputFocusRing: "#2563eb",
    inputError: "#dc2626",

    calendarBg: "#ffffff",
    calendarBorder: "rgba(0,0,0,0.12)",
    calendarShadow: "0 8px 24px rgba(0,0,0,0.12)",

    weekdayFg: "#6b7280",

    dayFg: "#111827",
    dayBg: "transparent",
    dayHoverBg: "#eef2ff",
    dayOutsideFg: "#9ca3af",

    todayRing: "#2563eb",
    selectedBg: "#2563eb",
    selectedFg: "#ffffff",

    rangeBg: "#dbeafe",
    rangeFg: "#111827",
    rangePreviewBg: "rgba(37,99,235,0.12)",

    disabledFg: "#d1d5db",

    navFg: "#374151",
    navHoverBg: "#f3f4f6",

    footerBorder: "rgba(0,0,0,0.08)",
    ghostHoverBg: "#f3f4f6",
    ghostFg: "#374151",
  },
  dark: {
    bg: "#0f172a",
    border: "rgba(255,255,255,0.08)",
    inputBg: "#1f2937",
    inputFg: "#e5e7eb",
    inputPlaceholder: "#6b7280",
    inputFocusRing: "#60a5fa",
    inputError: "#f87171",

    calendarBg: "#1f2937",
    calendarBorder: "rgba(255,255,255,0.08)",
    calendarShadow: "0 8px 24px rgba(0,0,0,0.4)",

    weekdayFg: "#9ca3af",

    dayFg: "#e5e7eb",
    dayBg: "transparent",
    dayHoverBg: "#334155",
    dayOutsideFg: "#6b7280",

    todayRing: "#60a5fa",
    selectedBg: "#60a5fa",
    selectedFg: "#0f172a",

    rangeBg: "#1e3a8a",
    rangeFg: "#e5e7eb",
    rangePreviewBg: "rgba(96,165,250,0.18)",

    disabledFg: "#4b5563",

    navFg: "#e5e7eb",
    navHoverBg: "#334155",

    footerBorder: "rgba(255,255,255,0.08)",
    ghostHoverBg: "#334155",
    ghostFg: "#e5e7eb",
  },
};
