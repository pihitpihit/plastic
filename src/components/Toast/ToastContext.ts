import { createContext, useContext } from "react";
import type {
  PromiseToastOptions,
  ShowToastOptions,
  ToastData,
  ToastPhase,
  ToastPosition,
  ToastStackOrder,
  ToastTheme,
  ToastVariant,
} from "./Toast.types";

export interface ToastContextValue {
  toasts: ToastData[];
  show: (options: ShowToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  promise: <T>(
    promise: Promise<T>,
    options: PromiseToastOptions<T>,
  ) => Promise<T>;

  position: ToastPosition;
  stackOrder: ToastStackOrder;
  maxToasts: number;
  defaultDuration: number;
  pauseOnHover: boolean;
  swipeDismissible: boolean;
  swipeThreshold: number;
  swipeDirection: "horizontal" | "vertical";
  theme: ToastTheme;
  label: string;

  onDismiss?: ((id: string) => void) | undefined;
  onAutoClose?: ((id: string) => void) | undefined;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast must be used within a <ToastProvider>. Wrap your app with <ToastProvider>.",
    );
  }
  return ctx;
}

export interface ToastItemContextValue {
  id: string;
  variant: ToastVariant;
  phase: ToastPhase;
  duration: number;
  elapsed: number;
  isPaused: boolean;
  dismiss: () => void;
  pause: () => void;
  resume: () => void;
  /** Swipe dismiss: exit 애니메이션 생략하고 즉시 REMOVE */
  swipeDismiss: () => void;
  theme: ToastTheme;
}

export const ToastItemContext = createContext<ToastItemContextValue | null>(
  null,
);

export function useToastItemContext(): ToastItemContextValue {
  const ctx = useContext(ToastItemContext);
  if (!ctx) {
    throw new Error(
      "Toast sub-components must be used within a <Toast.Root>.",
    );
  }
  return ctx;
}
