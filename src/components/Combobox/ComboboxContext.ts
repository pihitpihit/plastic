import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type {
  ComboboxOption,
  ComboboxMatchResult,
  ComboboxTheme,
} from "./Combobox.types";

export interface ComboboxContextValue {
  listId: string;
  getItemId: (value: string) => string;
  theme: ComboboxTheme;
  disabled: boolean;
  readOnly: boolean;

  multiple: boolean;
  freeform: boolean;
  strict: boolean;

  placeholder: string | undefined;
  minChars: number;
  maxResults: number;

  value: string[] | string | null;
  open: boolean;
  setOpen: (next: boolean) => void;
  inputValue: string;
  setInputValue: (next: string) => void;

  options: ComboboxOption[];
  results: ComboboxOption[];
  matches: Map<string, ComboboxMatchResult>;
  isLoading: boolean;
  activeIndex: number;
  setActiveIndex: (i: number) => void;

  selectOption: (opt: ComboboxOption) => void;
  commitFreeform: (text: string) => void;
  removeValue: (v: string) => void;
  clearAll: () => void;

  inputRef: RefObject<HTMLInputElement | null>;
  anchorRef: RefObject<HTMLDivElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  getOptionLabel: (value: string) => string;

  registerItemNode: (value: string, node: HTMLElement | null) => void;
}

export const ComboboxContext = createContext<ComboboxContextValue | null>(null);

export function useComboboxContext(): ComboboxContextValue {
  const ctx = useContext(ComboboxContext);
  if (ctx === null) {
    throw new Error(
      "Combobox compound components must be used within <Combobox.Root>",
    );
  }
  return ctx;
}
