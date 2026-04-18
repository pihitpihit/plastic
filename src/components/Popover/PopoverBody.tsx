import { forwardRef } from "react";
import type { CSSProperties } from "react";
import type { PopoverBodyProps } from "./Popover.types";

export const PopoverBody = forwardRef<HTMLDivElement, PopoverBodyProps>(
  function PopoverBody(props, ref) {
    const { children, className, style, ...rest } = props;

    const baseStyle: CSSProperties = {
      padding: "0.75rem 1rem",
      fontSize: "0.875rem",
      lineHeight: 1.5,
      maxHeight: "60vh",
      overflowY: "auto",
    };

    return (
      <div ref={ref} className={className} style={{ ...baseStyle, ...style }} {...rest}>
        {children}
      </div>
    );
  },
);
