import type { CSSProperties } from "react";
import type { ToastPosition } from "./Toast.types";

export const ENTER_DURATION = 300;
export const EXIT_DURATION = 200;

export const ENTER_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EXIT_EASING = "cubic-bezier(0.4, 0, 1, 1)";

export const enterFrom: Record<ToastPosition, CSSProperties> = {
  "top-left": { transform: "translateX(-100%)", opacity: 0 },
  "top-center": { transform: "translateY(-100%)", opacity: 0 },
  "top-right": { transform: "translateX(100%)", opacity: 0 },
  "bottom-left": { transform: "translateX(-100%)", opacity: 0 },
  "bottom-center": { transform: "translateY(100%)", opacity: 0 },
  "bottom-right": { transform: "translateX(100%)", opacity: 0 },
};

export const exitTo: Record<ToastPosition, CSSProperties> = {
  "top-left": { transform: "translateX(-100%)", opacity: 0 },
  "top-center": { transform: "translateY(-100%)", opacity: 0 },
  "top-right": { transform: "translateX(100%)", opacity: 0 },
  "bottom-left": { transform: "translateX(-100%)", opacity: 0 },
  "bottom-center": { transform: "translateY(100%)", opacity: 0 },
  "bottom-right": { transform: "translateX(100%)", opacity: 0 },
};
