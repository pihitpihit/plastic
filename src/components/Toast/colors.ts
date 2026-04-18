import type { ToastTheme, ToastVariant } from "./Toast.types";

export const toastBg: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#ffffff",
    success: "#f0fdf4",
    error: "#fef2f2",
    warning: "#fffbeb",
    info: "#eff6ff",
  },
  dark: {
    default: "#1e293b",
    success: "#052e16",
    error: "#450a0a",
    warning: "#451a03",
    info: "#172554",
  },
};

export const toastBorder: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#e5e7eb",
    success: "#bbf7d0",
    error: "#fecaca",
    warning: "#fde68a",
    info: "#bfdbfe",
  },
  dark: {
    default: "#334155",
    success: "#14532d",
    error: "#7f1d1d",
    warning: "#78350f",
    info: "#1e3a5f",
  },
};

export const iconColor: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#6b7280",
    success: "#16a34a",
    error: "#dc2626",
    warning: "#d97706",
    info: "#2563eb",
  },
  dark: {
    default: "#9ca3af",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  },
};

export const titleColor: Record<ToastTheme, string> = {
  light: "#111827",
  dark: "#f1f5f9",
};

export const descColor: Record<ToastTheme, string> = {
  light: "#6b7280",
  dark: "#94a3b8",
};

export const closeColor: Record<ToastTheme, string> = {
  light: "#9ca3af",
  dark: "#64748b",
};

export const closeHoverBg: Record<ToastTheme, string> = {
  light: "#f3f4f6",
  dark: "#334155",
};

export const actionBorderColor: Record<ToastTheme, string> = {
  light: "#d1d5db",
  dark: "#475569",
};

export const actionTextColor: Record<ToastTheme, string> = {
  light: "#374151",
  dark: "#e2e8f0",
};

export const actionPrimaryBg: Record<ToastTheme, Record<ToastVariant, string>> =
  {
    light: {
      default: "#3b82f6",
      success: "#16a34a",
      error: "#dc2626",
      warning: "#d97706",
      info: "#2563eb",
    },
    dark: {
      default: "#3b82f6",
      success: "#22c55e",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    },
  };

export const progressTrackColor: Record<ToastTheme, string> = {
  light: "#f3f4f6",
  dark: "#1e293b",
};

export const progressBarColor: Record<
  ToastTheme,
  Record<ToastVariant, string>
> = {
  light: {
    default: "#9ca3af",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  },
  dark: {
    default: "#64748b",
    success: "#16a34a",
    error: "#dc2626",
    warning: "#d97706",
    info: "#2563eb",
  },
};
