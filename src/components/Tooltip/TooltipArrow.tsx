import { forwardRef, useCallback } from "react";
import type { CSSProperties, Ref } from "react";
import { useTooltipContext } from "./TooltipContext";
import { tooltipArrowBg, tooltipBorder } from "./colors";
import type { TooltipArrowProps } from "./Tooltip.types";

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as React.MutableRefObject<T | null>).current = value;
}

export const TooltipArrow = forwardRef<HTMLDivElement, TooltipArrowProps>(
  function TooltipArrow(props, forwardedRef) {
    const { size = 8, className, style } = props;
    const ctx = useTooltipContext();
    const { arrowRef, arrowPosition, arrowSide, theme } = ctx;

    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        arrowRef.current = node;
        setRef(forwardedRef, node);
      },
      [arrowRef, forwardedRef],
    );

    const positionStyle: CSSProperties = {
      position: "absolute",
      width: size,
      height: size,
      background: tooltipArrowBg[theme],
      borderRight: `1px solid ${tooltipBorder[theme]}`,
      borderBottom: `1px solid ${tooltipBorder[theme]}`,
      transform: "rotate(45deg)",
      pointerEvents: "none",
    };

    const offset = -size / 2;
    switch (arrowSide) {
      case "top":
        positionStyle.top = offset;
        positionStyle.left = arrowPosition.x;
        positionStyle.transform = "rotate(225deg)";
        break;
      case "bottom":
        positionStyle.bottom = offset;
        positionStyle.left = arrowPosition.x;
        positionStyle.transform = "rotate(45deg)";
        break;
      case "left":
        positionStyle.left = offset;
        positionStyle.top = arrowPosition.y;
        positionStyle.transform = "rotate(135deg)";
        break;
      case "right":
        positionStyle.right = offset;
        positionStyle.top = arrowPosition.y;
        positionStyle.transform = "rotate(-45deg)";
        break;
    }

    return (
      <div
        ref={mergedRef}
        className={className}
        aria-hidden="true"
        style={{ ...positionStyle, ...style }}
      />
    );
  },
);
