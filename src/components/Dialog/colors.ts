import type { DialogTheme } from "./Dialog.types";

export const overlayBg: Record<DialogTheme, string> = {
  light: "rgba(0, 0, 0, 0.5)",
  dark: "rgba(0, 0, 0, 0.7)",
};

export const contentBg: Record<DialogTheme, string> = {
  light: "#ffffff",
  dark: "#1f2937",
};

export const contentBorder: Record<DialogTheme, string> = {
  light: "#e5e7eb",
  dark: "#374151",
};

export const contentShadow: Record<DialogTheme, string> = {
  light: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  dark: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
};

export const headerBorderColor: Record<DialogTheme, string> = {
  light: "#e5e7eb",
  dark: "#374151",
};

export const titleColor: Record<DialogTheme, string> = {
  light: "#111827",
  dark: "#f9fafb",
};

export const descriptionColor: Record<DialogTheme, string> = {
  light: "#6b7280",
  dark: "#9ca3af",
};

export const bodyTextColor: Record<DialogTheme, string> = {
  light: "#374151",
  dark: "#d1d5db",
};

export const footerBorderColor: Record<DialogTheme, string> = {
  light: "#e5e7eb",
  dark: "#374151",
};

export const footerBg: Record<DialogTheme, string> = {
  light: "#f9fafb",
  dark: "#111827",
};

export const closeIconColor: Record<DialogTheme, string> = {
  light: "#9ca3af",
  dark: "#6b7280",
};

export const closeIconHoverBg: Record<DialogTheme, string> = {
  light: "#f3f4f6",
  dark: "#374151",
};

export const sizeMap = {
  sm: "400px",
  md: "500px",
  lg: "640px",
  xl: "800px",
  full: "calc(100vw - 4rem)",
} as const;
