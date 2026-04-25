import { createContext, useContext } from "react";
import type {
  AccordionDisabledFocus,
  AccordionTheme,
  AccordionType,
} from "./Accordion.types";

export interface AccordionTriggerEntry {
  id: string;
  el: HTMLButtonElement | null;
  disabled: boolean;
}

export interface AccordionRootContextValue {
  type: AccordionType;
  value: string | string[] | null;
  toggle: (v: string) => void;
  collapsible: boolean;
  disabled: boolean;
  disabledFocus: AccordionDisabledFocus;
  theme: AccordionTheme;
  reducedMotion: boolean;
  registerTrigger: (
    id: string,
    el: HTMLButtonElement | null,
    disabled: boolean,
  ) => void;
  focusTrigger: (id: string) => void;
  getTriggers: () => AccordionTriggerEntry[];
}

export const AccordionRootContext =
  createContext<AccordionRootContextValue | null>(null);

export function useAccordionRootContext(): AccordionRootContextValue {
  const ctx = useContext(AccordionRootContext);
  if (ctx === null) {
    throw new Error(
      "Accordion sub-components must be used within <Accordion.Root>",
    );
  }
  return ctx;
}

export interface AccordionItemContextValue {
  value: string;
  itemId: string;
  triggerId: string;
  contentId: string;
  isOpen: boolean;
  isDisabled: boolean;
}

export const AccordionItemContext =
  createContext<AccordionItemContextValue | null>(null);

export function useAccordionItemContext(): AccordionItemContextValue {
  const ctx = useContext(AccordionItemContext);
  if (ctx === null) {
    throw new Error(
      "Accordion.Trigger/Content must be used within <Accordion.Item>",
    );
  }
  return ctx;
}
