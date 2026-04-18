import type { CSSProperties } from "react";
import type { CommandPaletteTheme } from "./CommandPalette.types";

export const overlayBg: Record<CommandPaletteTheme, string> = {
  light: "rgba(0, 0, 0, 0.4)",
  dark: "rgba(0, 0, 0, 0.6)",
};

export const modalBg: Record<CommandPaletteTheme, string> = {
  light: "#ffffff",
  dark: "#1e1e2e",
};

export const modalBorder: Record<CommandPaletteTheme, string> = {
  light: "#e5e7eb",
  dark: "#313244",
};

export const modalShadow: Record<CommandPaletteTheme, string> = {
  light: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  dark: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
};

export const dividerColor: Record<CommandPaletteTheme, string> = {
  light: "#e5e7eb",
  dark: "#313244",
};

export const inputBg: Record<CommandPaletteTheme, string> = {
  light: "#ffffff",
  dark: "#1e1e2e",
};

export const inputText: Record<CommandPaletteTheme, string> = {
  light: "#111827",
  dark: "#cdd6f4",
};

export const placeholderText: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark: "#6c7086",
};

export const iconColor: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark: "#6c7086",
};

export const itemBg: Record<CommandPaletteTheme, string> = {
  light: "transparent",
  dark: "transparent",
};

export const itemActiveBg: Record<CommandPaletteTheme, string> = {
  light: "#eff6ff",
  dark: "rgba(137, 180, 250, 0.12)",
};

export const itemHoverBg: Record<CommandPaletteTheme, string> = {
  light: "#f9fafb",
  dark: "rgba(205, 214, 244, 0.04)",
};

export const itemActiveAccent: Record<CommandPaletteTheme, string> = {
  light: "#3b82f6",
  dark: "#89b4fa",
};

export const itemText: Record<CommandPaletteTheme, string> = {
  light: "#111827",
  dark: "#cdd6f4",
};

export const itemSubtext: Record<CommandPaletteTheme, string> = {
  light: "#6b7280",
  dark: "#a6adc8",
};

export const itemDisabledText: Record<CommandPaletteTheme, string> = {
  light: "#d1d5db",
  dark: "#45475a",
};

export const groupHeaderText: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark: "#6c7086",
};

export const emptyText: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark: "#6c7086",
};

export const loadingText: Record<CommandPaletteTheme, string> = {
  light: "#6b7280",
  dark: "#a6adc8",
};

export const footerBg: Record<CommandPaletteTheme, string> = {
  light: "#f9fafb",
  dark: "#181825",
};

export const footerText: Record<CommandPaletteTheme, string> = {
  light: "#9ca3af",
  dark: "#6c7086",
};

export const chipBg: Record<CommandPaletteTheme, string> = {
  light: "#f3f4f6",
  dark: "#313244",
};

export const chipBorder: Record<CommandPaletteTheme, string> = {
  light: "#e5e7eb",
  dark: "#45475a",
};

export const chipText: Record<CommandPaletteTheme, string> = {
  light: "#374151",
  dark: "#a6adc8",
};

export const highlightBg: Record<CommandPaletteTheme, string> = {
  light: "rgba(59, 130, 246, 0.15)",
  dark: "rgba(137, 180, 250, 0.25)",
};

export const highlightText: Record<CommandPaletteTheme, string> = {
  light: "#1d4ed8",
  dark: "#89b4fa",
};

export const kbdStyle: Record<CommandPaletteTheme, CSSProperties> = {
  light: {
    fontSize: "11px",
    padding: "0 4px",
    borderRadius: "3px",
    border: "1px solid #e5e7eb",
    backgroundColor: "#f9fafb",
    color: "#6b7280",
    lineHeight: "18px",
  },
  dark: {
    fontSize: "11px",
    padding: "0 4px",
    borderRadius: "3px",
    border: "1px solid #45475a",
    backgroundColor: "#313244",
    color: "#a6adc8",
    lineHeight: "18px",
  },
};
