import { useCallback, useEffect, useId, useMemo, useRef } from "react";
import { useControllable } from "../_shared/useControllable";
import { useFloating } from "../_shared/useFloating";
import { PopoverContext } from "./PopoverContext";
import type { PopoverContextValue } from "./PopoverContext";
import type { PopoverRootProps } from "./Popover.types";

export function PopoverRoot(props: PopoverRootProps) {
  const {
    children,
    placement = "bottom",
    offset = 12,
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    triggerMode = "click",
    showDelay = 200,
    hideDelay = 300,
    theme = "light",
    disabled = false,
    closeOnEscape = true,
    closeOnOutsideClick = true,
    trapFocus = false,
  } = props;

  const [open, setOpen] = useControllable(
    controlledOpen,
    defaultOpen ?? false,
    onOpenChange,
  );

  const contentId = useId();
  const triggerId = useId();

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

  const close = useCallback(() => {
    cancelTimers();
    setOpen(false);
  }, [cancelTimers, setOpen]);

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

  useEffect(() => () => cancelTimers(), [cancelTimers]);

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open, setOpen]);

  const floating = useFloating({
    placement,
    offset,
    enabled: open,
    flip: true,
  });

  const { triggerRef, floatingRef } = floating;

  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current && triggerRef.current.contains(target)) return;
      if (floatingRef.current && floatingRef.current.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, closeOnOutsideClick, close, triggerRef, floatingRef]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeOnEscape, close]);

  const value = useMemo<PopoverContextValue>(
    () => ({
      open,
      setOpen,
      close,
      scheduleShow,
      scheduleHide,
      cancelTimers,
      triggerMode,
      showDelay,
      hideDelay,
      disabled,
      theme,
      closeOnEscape,
      closeOnOutsideClick,
      trapFocus,
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
      triggerId,
    }),
    [
      open,
      setOpen,
      close,
      scheduleShow,
      scheduleHide,
      cancelTimers,
      triggerMode,
      showDelay,
      hideDelay,
      disabled,
      theme,
      closeOnEscape,
      closeOnOutsideClick,
      trapFocus,
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
      triggerId,
    ],
  );

  return (
    <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
  );
}
