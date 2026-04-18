import { forwardRef } from "react";
import { useReducedMotion } from "../_shared/useReducedMotion";
import { useDialogContext } from "./DialogContext";
import type { DialogOverlayProps } from "./Dialog.types";

export const DialogOverlay = forwardRef<HTMLDivElement, DialogOverlayProps>(
  function DialogOverlay({ className, style, onClick, ...rest }, ref) {
    const ctx = useDialogContext();
    const prefersReducedMotion = useReducedMotion();
    const isOpenState =
      ctx.animationState === "open" || ctx.animationState === "opening";
    const opacity = isOpenState ? 1 : 0;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (ctx.closeOnOverlayClick) {
        ctx.setOpen(false);
      }
    };

    return (
      <div
        ref={ref}
        data-dialog-overlay=""
        data-state={isOpenState ? "open" : "closed"}
        aria-hidden="true"
        onClick={handleClick}
        className={className}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000 + ctx.nestingLevel * 10,
          background: "rgba(0, 0, 0, 0.5)",
          opacity,
          transition: prefersReducedMotion ? "none" : "opacity 150ms ease",
          ...style,
        }}
        {...rest}
      />
    );
  },
);
