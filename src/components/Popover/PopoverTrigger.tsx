import { cloneElement, isValidElement, useCallback } from "react";
import type {
  FocusEventHandler,
  MouseEventHandler,
  ReactElement,
  Ref,
} from "react";
import { usePopoverContext } from "./PopoverContext";
import type { PopoverTriggerProps } from "./Popover.types";

type TriggerChildProps = {
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  onMouseEnter?: MouseEventHandler<HTMLElement> | undefined;
  onMouseLeave?: MouseEventHandler<HTMLElement> | undefined;
  onFocus?: FocusEventHandler<HTMLElement> | undefined;
  onBlur?: FocusEventHandler<HTMLElement> | undefined;
  disabled?: boolean | undefined;
  id?: string | undefined;
  "aria-haspopup"?: string | boolean | undefined;
  "aria-expanded"?: boolean | undefined;
  "aria-controls"?: string | undefined;
  ref?: Ref<HTMLElement> | undefined;
};

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as React.MutableRefObject<T | null>).current = value;
}

export function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const ctx = usePopoverContext();
  const {
    triggerRef,
    triggerMode,
    open,
    setOpen,
    scheduleShow,
    scheduleHide,
    contentId,
    triggerId,
    disabled,
  } = ctx;

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

  const handleClick: MouseEventHandler<HTMLElement> = (e) => {
    child.props.onClick?.(e);
    if (e.defaultPrevented) return;
    if (disabled) return;
    if (triggerMode !== "click") return;
    setOpen(!open);
  };

  const handleMouseEnter: MouseEventHandler<HTMLElement> = (e) => {
    child.props.onMouseEnter?.(e);
    if (triggerMode !== "hover") return;
    if (disabled) return;
    scheduleShow();
  };

  const handleMouseLeave: MouseEventHandler<HTMLElement> = (e) => {
    child.props.onMouseLeave?.(e);
    if (triggerMode !== "hover") return;
    scheduleHide();
  };

  const handleFocus: FocusEventHandler<HTMLElement> = (e) => {
    child.props.onFocus?.(e);
    if (triggerMode !== "hover") return;
    if (disabled) return;
    scheduleShow();
  };

  const handleBlur: FocusEventHandler<HTMLElement> = (e) => {
    child.props.onBlur?.(e);
    if (triggerMode !== "hover") return;
    scheduleHide();
  };

  const existingRef = child.ref;
  const mergedRef: Ref<HTMLElement> = (node) => {
    composedRef(node);
    setRef(existingRef, node);
  };

  const injectedProps: TriggerChildProps = {
    id: child.props.id ?? triggerId,
    onClick: handleClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? contentId : undefined,
    ref: mergedRef,
  };

  if (asChild) {
    return cloneElement<TriggerChildProps>(child, injectedProps);
  }

  return cloneElement<TriggerChildProps>(child, injectedProps);
}
