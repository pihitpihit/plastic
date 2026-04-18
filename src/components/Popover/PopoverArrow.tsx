import { forwardRef, useCallback } from "react";
import type { CSSProperties, Ref } from "react";
import { usePopoverContext } from "./PopoverContext";
import { popoverArrowBg, popoverArrowBorder } from "./colors";
import type { PopoverArrowProps } from "./Popover.types";

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as React.MutableRefObject<T | null>).current = value;
}

export const PopoverArrow = forwardRef<HTMLDivElement, PopoverArrowProps>(
  function PopoverArrow(props, forwardedRef) {
    const { size = 10, className, style } = props;
    const ctx = usePopoverContext();
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
      background: popoverArrowBg[theme],
      pointerEvents: "none",
    };

    const offset = -size / 2;
    switch (arrowSide) {
      case "top":
        positionStyle.top = offset;
        positionStyle.left = arrowPosition.x;
        positionStyle.borderTop = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.borderLeft = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.transform = "rotate(45deg)";
        break;
      case "bottom":
        positionStyle.bottom = offset;
        positionStyle.left = arrowPosition.x;
        positionStyle.borderBottom = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.borderRight = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.transform = "rotate(45deg)";
        break;
      case "left":
        positionStyle.left = offset;
        positionStyle.top = arrowPosition.y;
        positionStyle.borderTop = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.borderLeft = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.transform = "rotate(-45deg)";
        break;
      case "right":
        positionStyle.right = offset;
        positionStyle.top = arrowPosition.y;
        positionStyle.borderTop = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.borderRight = `1px solid ${popoverArrowBorder[theme]}`;
        positionStyle.transform = "rotate(45deg)";
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
