import type {
  HTMLAttributes,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
  CSSProperties,
} from "react";

// ── Theme ───────────────────────────────────────────────────
export type PathInputTheme = "light" | "dark";

// ── Validation ──────────────────────────────────────────────
export type ValidationStatus = "valid" | "invalid" | "warning";

export interface ValidationResult {
  status: ValidationStatus;
  message?: string | undefined;
}

export interface ValidationState {
  status: ValidationStatus | "idle";
  message: string;
}

// ── Root Props ──────────────────────────────────────────────
export interface PathInputRootProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  children: ReactNode;

  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;

  disabled?: boolean | undefined;
  accept?: string | undefined;
  multiple?: boolean | undefined;
  directory?: boolean | undefined;

  validate?: ((path: string) => ValidationResult | Promise<ValidationResult>) | undefined;
  validateDebounce?: number | undefined;

  validationStatus?: ValidationStatus | undefined;
  validationMessage?: string | undefined;

  theme?: PathInputTheme | undefined;

  onFilesSelected?: ((files: File[]) => void) | undefined;
}

// ── Input Props ─────────────────────────────────────────────
export interface PathInputInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "disabled" | "type"> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── BrowseButton Props ──────────────────────────────────────
export interface PathInputBrowseButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Status Props ────────────────────────────────────────────
export interface PathInputStatusProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ((state: ValidationState) => ReactNode) | undefined;
}

// ── FileName Props ──────────────────────────────────────────
export interface PathInputFileNameProps extends HTMLAttributes<HTMLSpanElement> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  placeholder?: string | undefined;
  maxWidth?: number | undefined;
}
