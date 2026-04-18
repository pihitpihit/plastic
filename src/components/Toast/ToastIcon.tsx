import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { iconColor } from "./colors";
import { useToastItemContext } from "./ToastContext";
import type { ToastIconProps, ToastVariant } from "./Toast.types";

const SVG_ATTRS = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function DefaultVariantIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success":
      return (
        <svg {...SVG_ATTRS} aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <polyline points="6.5,10 9,12.5 13.5,7.5" />
        </svg>
      );
    case "error":
      return (
        <svg {...SVG_ATTRS} aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <line x1="7.5" y1="7.5" x2="12.5" y2="12.5" />
          <line x1="12.5" y1="7.5" x2="7.5" y2="12.5" />
        </svg>
      );
    case "warning":
      return (
        <svg {...SVG_ATTRS} aria-hidden="true">
          <path d="M10 2.5 L18.5 16.5 H1.5 Z" />
          <line x1="10" y1="8" x2="10" y2="11.5" />
          <circle cx="10" cy="14" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "info":
      return (
        <svg {...SVG_ATTRS} aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <line x1="10" y1="9" x2="10" y2="14" />
          <circle cx="10" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "default":
    default:
      return (
        <svg {...SVG_ATTRS} aria-hidden="true">
          <path d="M10 2.5 C6.5 2.5 4 5.5 4 8.5 V12 L2.5 14.5 H17.5 L16 12 V8.5 C16 5.5 13.5 2.5 10 2.5 Z" />
          <path d="M8 14.5 C8 15.5 8.9 17 10 17 C11.1 17 12 15.5 12 14.5" />
        </svg>
      );
  }
}

export function SpinnerIcon() {
  return (
    <svg
      {...SVG_ATTRS}
      aria-hidden="true"
      style={{ animation: "plastic-toast-spin 1s linear infinite" }}
    >
      <path d="M10 2.5 A7.5 7.5 0 0 1 17.5 10" />
    </svg>
  );
}

export const ToastIcon = forwardRef<HTMLDivElement, ToastIconProps>(
  function ToastIcon({ children, className, style, ...rest }, ref) {
    const { variant, theme } = useToastItemContext();

    const mergedStyle: CSSProperties = {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "20px",
      height: "20px",
      marginTop: "2px",
      color: iconColor[theme][variant],
      ...style,
    };

    return (
      <div
        ref={ref}
        className={className}
        style={mergedStyle}
        {...rest}
      >
        {children ?? <DefaultVariantIcon variant={variant} />}
      </div>
    );
  },
);
