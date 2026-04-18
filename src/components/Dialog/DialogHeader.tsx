import { forwardRef } from "react";
import { useDialogContext } from "./DialogContext";
import { headerBorderColor } from "./colors";
import type { DialogHeaderProps } from "./Dialog.types";

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  function DialogHeader({ children, className, style, ...rest }, ref) {
    const ctx = useDialogContext();
    return (
      <div
        ref={ref}
        data-dialog-header=""
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          borderBottom: `1px solid ${headerBorderColor[ctx.theme]}`,
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
