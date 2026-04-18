import { forwardRef } from "react";
import { useDialogContext } from "./DialogContext";
import { footerBg, footerBorderColor } from "./colors";
import type { DialogFooterProps } from "./Dialog.types";

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  function DialogFooter({ children, className, style, ...rest }, ref) {
    const ctx = useDialogContext();
    return (
      <div
        ref={ref}
        data-dialog-footer=""
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "0.5rem",
          padding: "0.75rem 1.5rem",
          borderTop: `1px solid ${footerBorderColor[ctx.theme]}`,
          background: footerBg[ctx.theme],
          borderBottomLeftRadius: "0.75rem",
          borderBottomRightRadius: "0.75rem",
          flexShrink: 0,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
