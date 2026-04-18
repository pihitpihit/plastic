import { forwardRef, useCallback, useEffect, useRef } from "react";
import { useFocusTrap } from "../_shared/useFocusTrap";
import { useScrollLock } from "../_shared/useScrollLock";
import { useDialogContext } from "./DialogContext";
import {
  contentBg,
  contentBorder,
  contentShadow,
  sizeMap,
} from "./colors";
import type { DialogContentProps } from "./Dialog.types";

const ENTER_DURATION = 200;
const EXIT_DURATION = 150;

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  function DialogContent(
    {
      children,
      size = "md",
      className,
      style,
      initialFocus,
      returnFocus = true,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      onKeyDown,
      ...rest
    },
    forwardedRef,
  ) {
    const ctx = useDialogContext();
    const contentRef = useRef<HTMLDivElement | null>(null);
    const mergedRef = mergeRefs(contentRef, forwardedRef);

    const isOpenState =
      ctx.animationState === "open" || ctx.animationState === "opening";

    useScrollLock(isOpenState);

    useFocusTrap(contentRef, {
      enabled: isOpenState,
      initialFocus,
      returnFocusTo: ctx.triggerRef,
      returnFocus,
      onOpenAutoFocus,
      onCloseAutoFocus,
    });

    useEffect(() => {
      if (ctx.open) {
        ctx.setAnimationState("opening");
        const timer = setTimeout(() => ctx.setAnimationState("open"), ENTER_DURATION);
        return () => clearTimeout(timer);
      }
      ctx.setAnimationState((prev) => {
        if (prev === "open" || prev === "opening") return "closing";
        return prev;
      });
      const timer = setTimeout(() => {
        ctx.setAnimationState((prev) => (prev === "closing" ? "closed" : prev));
      }, EXIT_DURATION);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx.open]);

    useEffect(() => {
      if (!isOpenState) return;
      const handlePointerDown = (e: PointerEvent) => {
        const target = e.target as Node | null;
        if (!target || !contentRef.current) return;
        if (contentRef.current.contains(target)) return;

        onPointerDownOutside?.(e);
        if (e.defaultPrevented) return;

        if (ctx.closeOnOverlayClick) {
          ctx.setOpen(false);
        }
      };
      document.addEventListener("pointerdown", handlePointerDown, true);
      return () =>
        document.removeEventListener("pointerdown", handlePointerDown, true);
    }, [isOpenState, ctx, onPointerDownOutside]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        if (e.defaultPrevented) return;

        if (e.key === "Escape") {
          const nativeEvent = e.nativeEvent;
          onEscapeKeyDown?.(nativeEvent);
          if (nativeEvent.defaultPrevented) return;
          if (ctx.closeOnEscape) {
            e.preventDefault();
            ctx.setOpen(false);
          }
        }
      },
      [ctx, onEscapeKeyDown, onKeyDown],
    );

    const role = ctx.variant === "alert" ? "alertdialog" : "dialog";

    return (
      <div
        ref={mergedRef}
        id={ctx.contentId}
        data-dialog-content=""
        data-state={isOpenState ? "open" : "closed"}
        role={role}
        aria-modal="true"
        aria-labelledby={ctx.titleId}
        aria-describedby={ctx.hasDescription ? ctx.descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={className}
        style={{
          position: "fixed",
          zIndex: 1001 + ctx.nestingLevel * 10,
          top: "50%",
          left: "50%",
          transform: isOpenState
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -50%) scale(0.95)",
          width: sizeMap[size],
          maxHeight: "calc(100vh - 4rem)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "0.75rem",
          background: contentBg[ctx.theme],
          border: `1px solid ${contentBorder[ctx.theme]}`,
          boxShadow: contentShadow[ctx.theme],
          opacity: isOpenState ? 1 : 0,
          transition:
            "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1), transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
          outline: "none",
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
