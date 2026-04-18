import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { usePopoverContext } from "./PopoverContext";
import { popoverHeaderBorderBottom } from "./colors";
import type { PopoverHeaderProps } from "./Popover.types";

export const PopoverHeader = forwardRef<HTMLDivElement, PopoverHeaderProps>(
  function PopoverHeader(props, ref) {
    const { children, className, style, ...rest } = props;
    const ctx = usePopoverContext();

    const baseStyle: CSSProperties = {
      padding: "0.75rem 1rem",
      borderBottom: `1px solid ${popoverHeaderBorderBottom[ctx.theme]}`,
      fontWeight: 600,
      fontSize: "0.9375rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.5rem",
    };

    return (
      <div ref={ref} className={className} style={{ ...baseStyle, ...style }} {...rest}>
        {children}
      </div>
    );
  },
);
