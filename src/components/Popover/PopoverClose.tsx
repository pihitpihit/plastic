import { forwardRef, useState } from "react";
import type { CSSProperties, MouseEventHandler } from "react";
import { usePopoverContext } from "./PopoverContext";
import { popoverCloseHoverBg, popoverCloseText } from "./colors";
import type { PopoverCloseProps } from "./Popover.types";

function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="3" x2="11" y2="11" />
      <line x1="11" y1="3" x2="3" y2="11" />
    </svg>
  );
}

export const PopoverClose = forwardRef<HTMLButtonElement, PopoverCloseProps>(
  function PopoverClose(props, ref) {
    const { children, onClick, className, style, ...rest } = props;
    const ctx = usePopoverContext();
    const [hovered, setHovered] = useState(false);

    const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      ctx.close();
    };

    const baseStyle: CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "1.75rem",
      height: "1.75rem",
      padding: 0,
      border: "none",
      background: hovered ? popoverCloseHoverBg[ctx.theme] : "transparent",
      color: popoverCloseText[ctx.theme],
      borderRadius: "0.25rem",
      cursor: "pointer",
      transition: "background-color 120ms ease",
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={typeof children === "string" ? undefined : "Close"}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={className}
        style={{ ...baseStyle, ...style }}
        {...rest}
      >
        {children ?? <CloseIcon />}
      </button>
    );
  },
);
