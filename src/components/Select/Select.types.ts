import type {
  ReactNode,
  CSSProperties,
  HTMLAttributes,
  ButtonHTMLAttributes,
} from "react";
import type { Side, Alignment } from "../_shared/useFloating";

export type SelectTheme = "light" | "dark";

export type SelectValue = string;

export type SelectAlign = Alignment | "center";

export interface SelectRootProps {
  value?: SelectValue | undefined;
  defaultValue?: SelectValue | undefined;
  onValueChange?: ((value: SelectValue) => void) | undefined;

  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;

  placeholder?: string | undefined;

  disabled?: boolean | undefined;

  name?: string | undefined;
  required?: boolean | undefined;

  theme?: SelectTheme | undefined;

  children: ReactNode;
}

export interface SelectTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export interface SelectValueProps {
  placeholder?: string | undefined;
  children?: ((value: SelectValue | undefined) => ReactNode) | ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface SelectIconProps {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface SelectContentProps {
  side?: Side | undefined;
  align?: SelectAlign | undefined;
  sideOffset?: number | undefined;
  alignOffset?: number | undefined;
  maxHeight?: number | undefined;
  matchTriggerWidth?: boolean | undefined;
  minWidth?: number | undefined;
  closeOnOutsideClick?: boolean | undefined;
  closeOnEscape?: boolean | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export interface SelectGroupProps {
  label?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export interface SelectLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface SelectItemProps {
  value: SelectValue;
  disabled?: boolean | undefined;
  textValue?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export interface SelectItemIndicatorProps {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface SelectSeparatorProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
