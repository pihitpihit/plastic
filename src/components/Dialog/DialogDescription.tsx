import { forwardRef, useEffect } from "react";
import { useDialogContext } from "./DialogContext";
import { descriptionColor } from "./colors";
import type { DialogDescriptionProps } from "./Dialog.types";

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(function DialogDescription({ children, className, style, ...rest }, ref) {
  const ctx = useDialogContext();
  const { setHasDescription } = ctx;

  useEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);

  return (
    <p
      ref={ref}
      id={ctx.descriptionId}
      data-dialog-description=""
      className={className}
      style={{
        margin: 0,
        fontSize: "0.875rem",
        lineHeight: "1.25rem",
        color: descriptionColor[ctx.theme],
        ...style,
      }}
      {...rest}
    >
      {children}
    </p>
  );
});
