import type { CalendarTheme } from "./Calendar.types";

export interface CalendarThemeTokens {
  bg: string;
  border: string;

  navBtn: string;
  navBtnHover: string;
  navBtnHoverBg: string;
  monthLabel: string;

  weekdayFg: string;

  dayFg: string;
  dayBg: string;
  dayBgHover: string;
  dayFgMuted: string;
  dayFgToday: string;
  dayBorderToday: string;
  dayBgSelected: string;
  dayFgSelected: string;
  dayBgRange: string;
  dayBgRangePreview: string;
  dayFgDisabled: string;
  dayBgDisabled: string;
  dayBgFocused: string;

  disabledOpacity: number;
}

export const calendarThemes: Record<CalendarTheme, CalendarThemeTokens> = {
  light: {
    bg: "#ffffff",
    border: "rgba(0,0,0,0.08)",

    navBtn: "#6b7280",
    navBtnHover: "#111827",
    navBtnHoverBg: "#f3f4f6",
    monthLabel: "#111827",

    weekdayFg: "#9ca3af",

    dayFg: "#111827",
    dayBg: "transparent",
    dayBgHover: "#eef2ff",
    dayFgMuted: "#cbd5e1",
    dayFgToday: "#2563eb",
    dayBorderToday: "#2563eb",
    dayBgSelected: "#2563eb",
    dayFgSelected: "#ffffff",
    dayBgRange: "rgba(37,99,235,0.10)",
    dayBgRangePreview: "rgba(37,99,235,0.05)",
    dayFgDisabled: "#cbd5e1",
    dayBgDisabled: "transparent",
    dayBgFocused: "rgba(37,99,235,0.18)",

    disabledOpacity: 0.5,
  },
  dark: {
    bg: "#1f2937",
    border: "rgba(255,255,255,0.08)",

    navBtn: "#9ca3af",
    navBtnHover: "#e5e7eb",
    navBtnHoverBg: "#334155",
    monthLabel: "#e5e7eb",

    weekdayFg: "#6b7280",

    dayFg: "#e5e7eb",
    dayBg: "transparent",
    dayBgHover: "#334155",
    dayFgMuted: "#4b5563",
    dayFgToday: "#60a5fa",
    dayBorderToday: "#60a5fa",
    dayBgSelected: "#60a5fa",
    dayFgSelected: "#0f172a",
    dayBgRange: "rgba(96,165,250,0.18)",
    dayBgRangePreview: "rgba(96,165,250,0.10)",
    dayFgDisabled: "#4b5563",
    dayBgDisabled: "transparent",
    dayBgFocused: "rgba(96,165,250,0.28)",

    disabledOpacity: 0.5,
  },
};
