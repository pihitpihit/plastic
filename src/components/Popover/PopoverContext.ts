import { createContext, useContext } from "react";
import type { CSSProperties, MutableRefObject } from "react";
import type {
  ArrowPosition,
  Placement,
  Side,
} from "../_shared/useFloating";
import type { PopoverTheme, PopoverTriggerType } from "./Popover.types";

export interface PopoverContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  close: () => void;
  scheduleShow: () => void;
  scheduleHide: () => void;
  cancelTimers: () => void;

  triggerMode: PopoverTriggerType;
  showDelay: number;
  hideDelay: number;
  disabled: boolean;
  theme: PopoverTheme;
  closeOnEscape: boolean;
  closeOnOutsideClick: boolean;
  trapFocus: boolean;

  triggerRef: MutableRefObject<HTMLElement | null>;
  floatingRef: MutableRefObject<HTMLDivElement | null>;
  arrowRef: MutableRefObject<HTMLDivElement | null>;
  floatingStyles: CSSProperties;
  arrowPosition: ArrowPosition;
  arrowSide: Side;
  placement: Placement;
  isPositioned: boolean;
  update: () => void;

  contentId: string;
  triggerId: string;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export function usePopoverContext(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (ctx === null) {
    throw new Error(
      "Popover compound components must be used within <Popover.Root>",
    );
  }
  return ctx;
}
