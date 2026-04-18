import { forwardRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import {
  actionBorderColor,
  actionPrimaryBg,
  actionTextColor,
} from "./colors";
import { useToastItemContext } from "./ToastContext";
import type { ToastActionProps } from "./Toast.types";

export const ToastAction = forwardRef<HTMLButtonElement, ToastActionProps>(
  function ToastAction(
    { label, onClick, variant = "default", className, style, ...rest },
    ref,
  ) {
    const { variant: toastVariant, theme } = useToastItemContext();
    const isPrimary = variant === "primary";

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onClick();
    };

    const mergedStyle: CSSProperties = {
      flexShrink: 0,
      alignSelf: "center",
      padding: "4px 12px",
      fontSize: "13px",
      fontWeight: 500,
      lineHeight: "20px",
      borderRadius: "6px",
      border: isPrimary ? "none" : `1px solid ${actionBorderColor[theme]}`,
      backgroundColor: isPrimary
        ? actionPrimaryBg[theme][toastVariant]
        : "transparent",
      color: isPrimary ? "#ffffff" : actionTextColor[theme],
      cursor: "pointer",
      transition: "background-color 150ms ease, opacity 150ms ease",
      ...style,
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        onPointerDown={(e) => e.stopPropagation()}
        className={className}
        style={mergedStyle}
        {...rest}
      >
        {label}
      </button>
    );
  },
);
