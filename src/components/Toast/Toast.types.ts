import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";

// ── Theme & Variant ─────────────────────────────────────────
export type ToastTheme = "light" | "dark";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastStackOrder = "newest-first" | "oldest-first";

export type ToastPhase = "entering" | "idle" | "exiting" | "swiping";

// ── ToastData (internal state) ──────────────────────────────
export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | undefined;
}

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string | undefined;
  duration: number;
  action?: ToastAction | undefined;
  render?: ((api: { dismiss: () => void }) => ReactNode) | undefined;
  pauseOnHover?: boolean | undefined;
  swipeDismissible?: boolean | undefined;
  createdAt: number;
  ariaLive?: "polite" | "assertive" | undefined;
}

// ── Provider Props ──────────────────────────────────────────
export interface ToastProviderProps {
  children: ReactNode;

  position?: ToastPosition | undefined;
  stackOrder?: ToastStackOrder | undefined;
  maxToasts?: number | undefined;

  defaultDuration?: number | undefined;
  pauseOnHover?: boolean | undefined;
  swipeDismissible?: boolean | undefined;

  theme?: ToastTheme | undefined;

  swipeThreshold?: number | undefined;
  swipeDirection?: "horizontal" | "vertical" | undefined;

  onDismiss?: ((id: string) => void) | undefined;
  onAutoClose?: ((id: string) => void) | undefined;

  label?: string | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
  toastClassName?: string | undefined;
  toastStyle?: CSSProperties | undefined;
}

// ── useToast() return type ──────────────────────────────────
export interface ShowToastOptions {
  title: string;
  description?: string | undefined;
  variant?: ToastVariant | undefined;
  duration?: number | undefined;
  action?: ToastAction | undefined;
  render?: ((api: { dismiss: () => void }) => ReactNode) | undefined;
  pauseOnHover?: boolean | undefined;
  swipeDismissible?: boolean | undefined;
  ariaLive?: "polite" | "assertive" | undefined;
}

export interface PromiseToastOptions<T> {
  loading: Omit<ShowToastOptions, "variant" | "duration">;
  success:
    | Omit<ShowToastOptions, "variant">
    | ((data: T) => Omit<ShowToastOptions, "variant">);
  error:
    | Omit<ShowToastOptions, "variant">
    | ((err: unknown) => Omit<ShowToastOptions, "variant">);
}

export interface UseToastReturn {
  show: (options: ShowToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  promise: <T>(
    promise: Promise<T>,
    options: PromiseToastOptions<T>,
  ) => Promise<T>;
  toasts: readonly ToastData[];
}

// ── Sub-component Props ─────────────────────────────────────
export interface ToastRootProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant | undefined;
  duration?: number | undefined;
  pauseOnHover?: boolean | undefined;
  swipeDismissible?: boolean | undefined;
  onDismiss?: (() => void) | undefined;

  /** @internal */
  toastId?: string | undefined;
  /** @internal */
  phase?: ToastPhase | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export interface ToastIconProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ToastContentProps extends HTMLAttributes<HTMLDivElement> {
  title?: string | undefined;
  description?: string | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ToastActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ToastCloseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ToastProgressProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ToastVariant | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
