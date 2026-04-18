import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { useControllable } from "../_shared/useControllable";
import { useFloating } from "../_shared/useFloating";
import { TooltipContext } from "./TooltipContext";
import type { TooltipContextValue } from "./TooltipContext";
import type { TooltipRootProps } from "./Tooltip.types";

export function TooltipRoot(props: TooltipRootProps) {
  const {
    children,
    placement = "top",
    offset = 8,
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    showDelay = 300,
    hideDelay = 100,
    theme = "light",
    disabled = false,
  } = props;

  const [open, setOpen] = useControllable(
    controlledOpen,
    defaultOpen ?? false,
    onOpenChange,
  );

  const contentId = useId();
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimers = useCallback(() => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleShow = useCallback(() => {
    if (disabled) return;
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (open) return;
    if (showDelay <= 0) {
      setOpen(true);
      return;
    }
    showTimerRef.current = setTimeout(() => {
      setOpen(true);
      showTimerRef.current = null;
    }, showDelay);
  }, [disabled, open, setOpen, showDelay]);

  const scheduleHide = useCallback(() => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (!open) return;
    if (hideDelay <= 0) {
      setOpen(false);
      return;
    }
    hideTimerRef.current = setTimeout(() => {
      setOpen(false);
      hideTimerRef.current = null;
    }, hideDelay);
  }, [open, setOpen, hideDelay]);

  useEffect(() => {
    return () => {
      cancelTimers();
    };
  }, [cancelTimers]);

  useEffect(() => {
    if (disabled && open) {
      setOpen(false);
    }
  }, [disabled, open, setOpen]);

  const floating = useFloating({
    placement,
    offset,
    enabled: open,
    flip: true,
  });

  const value = useMemo<TooltipContextValue>(
    () => ({
      open,
      setOpen,
      scheduleShow,
      scheduleHide,
      cancelTimers,
      showDelay,
      hideDelay,
      disabled,
      theme,
      triggerRef: floating.triggerRef,
      floatingRef: floating.floatingRef,
      arrowRef: floating.arrowRef,
      floatingStyles: floating.floatingStyles,
      arrowPosition: floating.arrowPosition,
      arrowSide: floating.arrowSide,
      placement: floating.placement,
      isPositioned: floating.isPositioned,
      update: floating.update,
      contentId,
    }),
    [
      open,
      setOpen,
      scheduleShow,
      scheduleHide,
      cancelTimers,
      showDelay,
      hideDelay,
      disabled,
      theme,
      floating.triggerRef,
      floating.floatingRef,
      floating.arrowRef,
      floating.floatingStyles,
      floating.arrowPosition,
      floating.arrowSide,
      floating.placement,
      floating.isPositioned,
      floating.update,
      contentId,
    ],
  );

  return (
    <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
  );
}
