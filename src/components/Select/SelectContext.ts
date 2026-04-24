import { createContext, useContext } from "react";
import type { CSSProperties, MutableRefObject, RefObject } from "react";
import type {
  Placement,
  Side,
  Alignment,
} from "../_shared/useFloating";
import type { SelectTheme, SelectValue, SelectAlign } from "./Select.types";

export interface RegisteredItem {
  value: SelectValue;
  textValue: string;
  disabled: boolean;
  node: HTMLElement;
  id: string;
}

export interface FloatingOptions {
  side: Side;
  align: SelectAlign;
  sideOffset: number;
  matchTriggerWidth: boolean;
}

export interface SelectContextValue {
  value: SelectValue | undefined;
  setValue: (v: SelectValue) => void;

  open: boolean;
  setOpen: (o: boolean) => void;
  close: (reason: "select" | "escape" | "outside" | "blur" | "tab") => void;

  disabled: boolean;
  theme: SelectTheme;
  placeholder: string | undefined;

  activeValue: SelectValue | null;
  setActiveValue: (v: SelectValue | null) => void;

  registerItem: (item: RegisteredItem) => () => void;
  getItems: () => RegisteredItem[];
  getActiveId: () => string | undefined;

  triggerRef: RefObject<HTMLElement | null>;
  floatingRef: RefObject<HTMLDivElement | null>;
  listboxId: string;
  triggerId: string;

  name: string | undefined;
  required: boolean;

  onTypeAhead: (char: string) => void;

  setFloatingOptions: (opts: FloatingOptions) => void;
  floatingStyles: CSSProperties;
  placement: Placement;
  isPositioned: boolean;
  matchTriggerWidth: boolean;
  alignment: Alignment | undefined;
}

export const SelectContext = createContext<SelectContextValue | null>(null);

export function useSelectContext(): SelectContextValue {
  const ctx = useContext(SelectContext);
  if (ctx === null) {
    throw new Error(
      "Select compound components must be used within <Select.Root>",
    );
  }
  return ctx;
}

interface SelectItemContextValue {
  value: SelectValue;
  isSelected: boolean;
}

export const SelectItemContext = createContext<SelectItemContextValue | null>(
  null,
);

export function useSelectItemContext(): SelectItemContextValue {
  const ctx = useContext(SelectItemContext);
  if (ctx === null) {
    throw new Error("Select.ItemIndicator must be used within <Select.Item>");
  }
  return ctx;
}
