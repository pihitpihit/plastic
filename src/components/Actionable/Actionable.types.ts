import type { HTMLAttributes, ReactNode, CSSProperties } from "react";

// ── Trigger variant ─────────────────────────────────────────────────────
export type ActionableTrigger =
  | "icon"
  | "icon-confirm"
  | "swipe"
  | "fade"
  | "checkbox"
  | "drag-out"
  | "reveal";

// ── Action visual variant ───────────────────────────────────────────────
export type ActionVariant = "default" | "danger" | "warning";

// ── Dismiss animation ───────────────────────────────────────────────────
export type DismissAnimation =
  | "slide-left"
  | "slide-right"
  | "fade"
  | "collapse"
  | "none";

// ── Theme ───────────────────────────────────────────────────────────────
export type ActionableTheme = "light" | "dark";

// ── Action definition ───────────────────────────────────────────────────
export interface ActionableAction {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: ActionVariant;
  confirm?: boolean | string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  style?: CSSProperties;
}

// ── Internal phase (not exported from package) ──────────────────────────
export type ActionablePhase =
  | "idle"
  | "confirming"
  | "executing"
  | "dismissing";

// ── Shared trigger props (internal) ─────────────────────────────────────
export interface TriggerChildProps {
  children: ReactNode;
  actions: ActionableAction[];
  theme: ActionableTheme;
  phase: ActionablePhase;
  disabled: boolean;
  onExecuteAction: (actionKey: string) => void;
}

// ── Component props ─────────────────────────────────────────────────────
export interface ActionableProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  actions: ActionableAction[];
  trigger: ActionableTrigger;
  theme?: ActionableTheme;

  // ── Dismiss ─────────────────────────────────────────────────
  dismissAnimation?: DismissAnimation;
  dismissDuration?: number;
  onDismiss?: (actionKey: string) => void;
  onAction?: (actionKey: string) => void | false | Promise<void | false>;

  // ── icon / icon-confirm ─────────────────────────────────────
  iconPosition?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left";
  iconShowOnHover?: boolean;

  // ── icon-confirm ────────────────────────────────────────────
  confirmTimeout?: number;
  confirmingAction?: string | null;
  onConfirmChange?: (actionKey: string | null) => void;

  // ── swipe ───────────────────────────────────────────────────
  swipeOpen?: boolean;
  onSwipeOpenChange?: (open: boolean) => void;
  swipeThreshold?: number;
  swipeDirection?: "left" | "right";

  // ── checkbox ────────────────────────────────────────────────
  selected?: boolean;
  defaultSelected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  checkboxPosition?: "left" | "right";

  // ── drag-out ────────────────────────────────────────────────
  dragThreshold?: number;
  onDragThreshold?: (crossed: boolean) => void;
  dragZoneLabel?: string;

  // ── fade ────────────────────────────────────────────────────
  fadeDuration?: number;
  fadePosition?: "top" | "bottom" | "center";

  // ── reveal ─────────────────────────────────────────────────
  revealOpen?: boolean;
  onRevealOpenChange?: (open: boolean) => void;
  revealDirection?: "left" | "right";
  revealTriggerIndex?: number;
  revealTriggerRender?: (action: ActionableAction) => ReactNode;
  revealOverlayWidth?: number;
  revealPanelWidth?: number;
  revealAnimationDuration?: number;

  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}
