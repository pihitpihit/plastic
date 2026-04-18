import { forwardRef } from "react";
import { useDialogContext } from "./DialogContext";
import { titleColor } from "./colors";
import type { DialogTitleProps } from "./Dialog.types";

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  function DialogTitle({ children, className, style, ...rest }, ref) {
    const ctx = useDialogContext();
    return (
      <h2
        ref={ref}
        id={ctx.titleId}
        data-dialog-title=""
        className={className}
        style={{
          margin: 0,
          fontSize: "1.125rem",
          fontWeight: 600,
          lineHeight: "1.5rem",
          color: titleColor[ctx.theme],
          ...style,
        }}
        {...rest}
      >
        {children}
      </h2>
    );
  },
);
