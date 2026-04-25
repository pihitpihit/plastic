import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type ComboboxTheme = "light" | "dark";

export interface ComboboxOption<Meta = unknown> {
  value: string;
  label: string;
  group?: string | undefined;
  disabled?: boolean | undefined;
  keywords?: string[] | undefined;
  meta?: Meta | undefined;
}

export interface ComboboxMatchResult {
  option: ComboboxOption;
  score: number;
  labelMatches: number[];
}

export type ComboboxFilter = (
  query: string,
  options: ComboboxOption[],
) => ComboboxOption[] | ComboboxMatchResult[];

export interface ComboboxRootPropsSingle
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  multiple?: false | undefined;

  value?: string | null | undefined;
  defaultValue?: string | null | undefined;
  onValueChange?: ((next: string | null) => void) | undefined;

  options?: ComboboxOption[] | undefined;

  inputValue?: string | undefined;
  defaultInputValue?: string | undefined;
  onInputValueChange?: ((next: string) => void) | undefined;

  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;

  filter?: ComboboxFilter | undefined;
  onSearch?: ((query: string) => Promise<ComboboxOption[]>) | undefined;
  searchDebounce?: number | undefined;
  minChars?: number | undefined;
  maxResults?: number | undefined;

  freeform?: boolean | undefined;
  strict?: boolean | undefined;

  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  placeholder?: string | undefined;

  theme?: ComboboxTheme | undefined;

  getOptionLabel?: ((value: string) => string) | undefined;

  children?: ReactNode | undefined;
}

export interface ComboboxRootPropsMultiple
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  multiple: true;

  value?: string[] | undefined;
  defaultValue?: string[] | undefined;
  onValueChange?: ((next: string[]) => void) | undefined;

  options?: ComboboxOption[] | undefined;

  inputValue?: string | undefined;
  defaultInputValue?: string | undefined;
  onInputValueChange?: ((next: string) => void) | undefined;

  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;

  filter?: ComboboxFilter | undefined;
  onSearch?: ((query: string) => Promise<ComboboxOption[]>) | undefined;
  searchDebounce?: number | undefined;
  minChars?: number | undefined;
  maxResults?: number | undefined;

  freeform?: boolean | undefined;
  strict?: boolean | undefined;

  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  placeholder?: string | undefined;

  theme?: ComboboxTheme | undefined;

  getOptionLabel?: ((value: string) => string) | undefined;

  children?: ReactNode | undefined;
}

export type ComboboxRootProps =
  | ComboboxRootPropsSingle
  | ComboboxRootPropsMultiple;

export interface ComboboxInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "disabled" | "readOnly"
  > {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  plain?: boolean | undefined;
}

export interface ComboboxContentProps extends HTMLAttributes<HTMLDivElement> {
  maxHeight?: number | string | undefined;
  offset?: number | undefined;
  placement?: "bottom-start" | "top-start" | "auto" | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export interface ComboboxItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  value: string;
  label?: string | undefined;
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxGroupProps extends HTMLAttributes<HTMLDivElement> {
  heading: string;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxEmptyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxLoadingProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
