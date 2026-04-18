import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from "react";
import type { Placement } from "../_shared/useFloating";

export type PopoverTheme = "light" | "dark";
export type PopoverPlacement = Placement;
export type PopoverTriggerType = "click" | "hover";

export interface PopoverRootProps {
  children: ReactNode;
  placement?: PopoverPlacement | undefined;
  offset?: number | undefined;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  triggerMode?: PopoverTriggerType | undefined;
  showDelay?: number | undefined;
  hideDelay?: number | undefined;
  theme?: PopoverTheme | undefined;
  disabled?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  closeOnOutsideClick?: boolean | undefined;
  trapFocus?: boolean | undefined;
}

export interface PopoverTriggerProps {
  children: ReactElement;
  asChild?: boolean | undefined;
}

export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface PopoverArrowProps {
  size?: number | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface PopoverCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface PopoverHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface PopoverBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
