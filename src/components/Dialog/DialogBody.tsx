import { forwardRef } from "react";
import { useDialogContext } from "./DialogContext";
import { bodyTextColor } from "./colors";
import type { DialogBodyProps } from "./Dialog.types";

export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  function DialogBody({ children, className, style, ...rest }, ref) {
    const ctx = useDialogContext();
    return (
      <div
        ref={ref}
        data-dialog-body=""
        className={className}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          color: bodyTextColor[ctx.theme],
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
