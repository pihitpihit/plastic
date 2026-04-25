import { createContext, useContext } from "react";
import type { MutableRefObject } from "react";

export interface MenuItemDescriptor {
  kind: "item" | "checkbox" | "radio" | "sub-trigger" | "separator" | "label";
  disabled: boolean;
  textValue: string;
  node: HTMLElement;
  id: string;
}

export interface ContextMenuRootContextValue {
  open: boolean;
  position: { x: number; y: number } | null;
  setOpen: (
    open: boolean,
    atPosition?: { x: number; y: number },
    mode?: "pointer" | "keyboard",
  ) => void;
  disabled: boolean;
  longPressMs: number;
  longPressTolerance: number;
  openMode: "pointer" | "keyboard" | null;
  typeaheadRef: MutableRefObject<{ buf: string; timer: number | null }>;
  triggerRef: MutableRefObject<HTMLElement | null>;
  previousFocusRef: MutableRefObject<HTMLElement | null>;
}

export const ContextMenuRootContext =
  createContext<ContextMenuRootContextValue | null>(null);

export function useContextMenuRootContext(): ContextMenuRootContextValue {
  const ctx = useContext(ContextMenuRootContext);
  if (ctx === null) {
    throw new Error(
      "ContextMenu compound components must be used within <ContextMenu.Root>",
    );
  }
  return ctx;
}

export interface ContextMenuItemEventInternal {
  preventDefault: () => void;
  defaultPrevented: boolean;
}

export interface ContextMenuContentContextValue {
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  registerItem: (descriptor: MenuItemDescriptor) => () => void;
  getDescriptors: () => MenuItemDescriptor[];
  onItemSelect: (
    userOnSelect: ((e: ContextMenuItemEventInternal) => void) | undefined,
  ) => void;
  closeSelf: () => void;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  isSubContent: boolean;
  onMouseMoveCapture: (e: React.MouseEvent) => void;
  registerSubMouseListener: (fn: (p: { x: number; y: number }) => void) => () => void;
}

export const ContextMenuContentContext =
  createContext<ContextMenuContentContextValue | null>(null);

export function useContextMenuContentContext(): ContextMenuContentContextValue {
  const ctx = useContext(ContextMenuContentContext);
  if (ctx === null) {
    throw new Error(
      "ContextMenu item components must be used within <ContextMenu.Content>",
    );
  }
  return ctx;
}

export interface ContextMenuSubContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: MutableRefObject<HTMLElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  parentContentRef: MutableRefObject<HTMLDivElement | null>;
  parentContentCtx: ContextMenuContentContextValue;
}

export const ContextMenuSubContext =
  createContext<ContextMenuSubContextValue | null>(null);

export function useContextMenuSubContext(): ContextMenuSubContextValue | null {
  return useContext(ContextMenuSubContext);
}

export interface ContextMenuRadioGroupContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
}

export const ContextMenuRadioGroupContext =
  createContext<ContextMenuRadioGroupContextValue | null>(null);

export function useContextMenuRadioGroupContext(): ContextMenuRadioGroupContextValue | null {
  return useContext(ContextMenuRadioGroupContext);
}
