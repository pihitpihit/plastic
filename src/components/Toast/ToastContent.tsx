import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { descColor, titleColor } from "./colors";
import { useToastItemContext } from "./ToastContext";
import type { ToastContentProps } from "./Toast.types";

export const ToastContent = forwardRef<HTMLDivElement, ToastContentProps>(
  function ToastContent({ title, description, children, className, style, ...rest }, ref) {
    const { theme } = useToastItemContext();

    const mergedStyle: CSSProperties = {
      flex: 1,
      minWidth: 0,
      ...style,
    };

    return (
      <div ref={ref} className={className} style={mergedStyle} {...rest}>
        {children ?? (
          <>
            {title && (
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: 600,
                  lineHeight: "20px",
                  color: titleColor[theme],
                }}
              >
                {title}
              </p>
            )}
            {description && (
              <p
                style={{
                  margin: title ? "2px 0 0" : 0,
                  fontSize: "13px",
                  fontWeight: 400,
                  lineHeight: "18px",
                  color: descColor[theme],
                }}
              >
                {description}
              </p>
            )}
          </>
        )}
      </div>
    );
  },
);
