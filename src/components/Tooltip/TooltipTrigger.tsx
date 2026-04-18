import { cloneElement, isValidElement, useCallback } from "react";
import type {
  FocusEventHandler,
  MouseEventHandler,
  ReactElement,
  Ref,
} from "react";
import { useTooltipContext } from "./TooltipContext";
import type { TooltipTriggerProps } from "./Tooltip.types";

type TriggerChildProps = {
  onMouseEnter?: MouseEventHandler<HTMLElement> | undefined;
  onMouseLeave?: MouseEventHandler<HTMLElement> | undefined;
  onFocus?: FocusEventHandler<HTMLElement> | undefined;
  onBlur?: FocusEventHandler<HTMLElement> | undefined;
  "aria-describedby"?: string | undefined;
  ref?: Ref<HTMLElement> | undefined;
};

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as React.MutableRefObject<T | null>).current = value;
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const ctx = useTooltipContext();
  const { triggerRef, scheduleShow, scheduleHide, open, contentId, disabled } =
    ctx;

  const composedRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node;
    },
    [triggerRef],
  );

  if (!isValidElement(children)) return null;
  const child = children as ReactElement<TriggerChildProps> & {
    ref?: Ref<HTMLElement>;
  };

  const handleMouseEnter: MouseEventHandler<HTMLElement> = (e) => {
    child.props.onMouseEnter?.(e);
    if (disabled) return;
    scheduleShow();
  };

  const handleMouseLeave: MouseEventHandler<HTMLElement> = (e) => {
    child.props.onMouseLeave?.(e);
    scheduleHide();
  };

  const handleFocus: FocusEventHandler<HTMLElement> = (e) => {
    child.props.onFocus?.(e);
    if (disabled) return;
    scheduleShow();
  };

  const handleBlur: FocusEventHandler<HTMLElement> = (e) => {
    child.props.onBlur?.(e);
    scheduleHide();
  };

  const existingRef = child.ref;
  const mergedRef: Ref<HTMLElement> = (node) => {
    composedRef(node);
    setRef(existingRef, node);
  };

  const injectedProps: TriggerChildProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    "aria-describedby": open ? contentId : child.props["aria-describedby"],
    ref: mergedRef,
  };

  if (asChild) {
    return cloneElement<TriggerChildProps>(child, injectedProps);
  }

  return cloneElement<TriggerChildProps>(child, injectedProps);
}
