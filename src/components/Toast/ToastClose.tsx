import { forwardRef } from "react";
import type { CSSProperties, MouseEvent, PointerEvent } from "react";
import { closeColor, closeHoverBg } from "./colors";
import { useToastItemContext } from "./ToastContext";
import type { ToastCloseProps } from "./Toast.types";

export const ToastClose = forwardRef<HTMLButtonElement, ToastCloseProps>(
  function ToastClose({ children, className, style, ...rest }, ref) {
    const { dismiss, theme } = useToastItemContext();

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      dismiss();
    };

    const handlePointerEnter = (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = closeHoverBg[theme];
    };

    const handlePointerLeave = (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.style.backgroundColor = "transparent";
    };

    const mergedStyle: CSSProperties = {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "24px",
      height: "24px",
      padding: 0,
      border: "none",
      borderRadius: "4px",
      backgroundColor: "transparent",
      color: closeColor[theme],
      cursor: "pointer",
      transition: "background-color 150ms ease, color 150ms ease",
      ...style,
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label="Close notification"
        onClick={handleClick}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className={className}
        style={mergedStyle}
        {...rest}
      >
        {children ?? (
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
        )}
      </button>
    );
  },
);
