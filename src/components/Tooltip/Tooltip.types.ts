import type { CSSProperties, HTMLAttributes, ReactElement, ReactNode } from "react";
import type { Placement } from "../_shared/useFloating";

export type TooltipTheme = "light" | "dark";
export type TooltipPlacement = Placement;

export interface TooltipRootProps {
  children: ReactNode;
  placement?: TooltipPlacement | undefined;
  offset?: number | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  showDelay?: number | undefined;
  hideDelay?: number | undefined;
  theme?: TooltipTheme | undefined;
  disabled?: boolean | undefined;
}

export interface TooltipTriggerProps {
  children: ReactElement;
  asChild?: boolean | undefined;
}

export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  multiline?: boolean | undefined;
  maxWidth?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface TooltipArrowProps {
  size?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
