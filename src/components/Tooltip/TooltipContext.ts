import { createContext, useContext } from "react";
import type { CSSProperties, MutableRefObject, RefObject } from "react";
import type {
  ArrowPosition,
  Placement,
  Side,
} from "../_shared/useFloating";
import type { TooltipTheme } from "./Tooltip.types";

export interface TooltipContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  scheduleShow: () => void;
  scheduleHide: () => void;
  cancelTimers: () => void;

  showDelay: number;
  hideDelay: number;
  disabled: boolean;
  theme: TooltipTheme;

  triggerRef: MutableRefObject<HTMLElement | null>;
  floatingRef: RefObject<HTMLDivElement | null>;
  arrowRef: RefObject<HTMLDivElement | null>;
  floatingStyles: CSSProperties;
  arrowPosition: ArrowPosition;
  arrowSide: Side;
  placement: Placement;
  isPositioned: boolean;
  update: () => void;

  contentId: string;
}

export const TooltipContext = createContext<TooltipContextValue | null>(null);

export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (ctx === null) {
    throw new Error(
      "Tooltip compound components must be used within <Tooltip.Root>",
    );
  }
  return ctx;
}
