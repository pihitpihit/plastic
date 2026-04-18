import { cloneElement, isValidElement, useCallback } from "react";
import type { MouseEventHandler, ReactElement, Ref } from "react";
import { useDialogContext } from "./DialogContext";
import type { DialogTriggerProps } from "./Dialog.types";

type TriggerChildProps = {
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  disabled?: boolean | undefined;
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

export function DialogTrigger({ children, asChild }: DialogTriggerProps) {
  const ctx = useDialogContext();
  const { setOpen, triggerRef } = ctx;

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
    if (child.props.disabled) return;
    setOpen(true);
  };

  const existingRef = child.ref;
  const mergedRef: Ref<HTMLElement> = (node) => {
    composedRef(node);
    setRef(existingRef, node);
  };

  if (asChild) {
    return cloneElement<TriggerChildProps>(child, {
      onClick: handleClick,
      "aria-haspopup": "dialog",
      "aria-expanded": ctx.open,
      "aria-controls": ctx.contentId,
      ref: mergedRef,
    });
  }

  return cloneElement<TriggerChildProps>(child, {
    onClick: handleClick,
    "aria-haspopup": "dialog",
    "aria-expanded": ctx.open,
    "aria-controls": ctx.contentId,
    ref: mergedRef,
  });
}
