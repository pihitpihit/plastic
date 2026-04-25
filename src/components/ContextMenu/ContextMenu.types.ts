import type { CSSProperties, ReactNode } from "react";

export type ContextMenuTheme = "light" | "dark";

export interface ContextMenuRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: { x: number; y: number };
  disabled?: boolean;
  longPressMs?: number;
  longPressTolerance?: number;
  children: ReactNode;
}

export interface ContextMenuTriggerProps {
  asChild?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface ContextMenuContentProps {
  theme?: ContextMenuTheme;
  className?: string;
  style?: CSSProperties;
  minWidth?: number;
  maxWidth?: number;
  "aria-label"?: string;
  children: ReactNode;
}

export interface ContextMenuItemEvent {
  preventDefault: () => void;
  defaultPrevented: boolean;
}

export interface ContextMenuItemProps {
  onSelect?: (event: ContextMenuItemEvent) => void;
  disabled?: boolean;
  textValue?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  [dataAttr: `data-${string}`]: unknown;
}

export interface ContextMenuCheckboxItemProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: ContextMenuItemEvent) => void;
  disabled?: boolean;
  textValue?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  [dataAttr: `data-${string}`]: unknown;
}

export interface ContextMenuRadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export interface ContextMenuRadioItemProps {
  value: string;
  onSelect?: (event: ContextMenuItemEvent) => void;
  disabled?: boolean;
  textValue?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  [dataAttr: `data-${string}`]: unknown;
}

export interface ContextMenuSubProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export interface ContextMenuSubTriggerProps {
  disabled?: boolean;
  textValue?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  [dataAttr: `data-${string}`]: unknown;
}

export interface ContextMenuSubContentProps {
  className?: string;
  style?: CSSProperties;
  minWidth?: number;
  maxWidth?: number;
  children: ReactNode;
}

export interface ContextMenuSeparatorProps {
  className?: string;
  style?: CSSProperties;
}

export interface ContextMenuLabelProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface ContextMenuShortcutProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}
