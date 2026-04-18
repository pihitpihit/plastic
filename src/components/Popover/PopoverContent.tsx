import { forwardRef, useCallback } from "react";
import type { CSSProperties, Ref } from "react";
import { Portal } from "../_shared/Portal";
import { useAnimationState } from "../_shared/useAnimationState";
import { useFocusTrap } from "../_shared/useFocusTrap";
import { usePopoverContext } from "./PopoverContext";
import type { PopoverContentProps } from "./Popover.types";
import type { Side } from "../_shared/useFloating";
import {
  popoverBg,
  popoverBorder,
  popoverShadow,
  popoverText,
} from "./colors";

const ENTER_DURATION = 150;
const EXIT_DURATION = 100;

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as React.MutableRefObject<T | null>).current = value;
}

function getSlideTransform(side: Side, entering: boolean): string {
  const d = entering ? 0 : 4;
  switch (side) {
    case "top":
      return `translateY(${d}px)`;
    case "bottom":
      return `translateY(-${d}px)`;
    case "left":
      return `translateX(${d}px)`;
    case "right":
      return `translateX(-${d}px)`;
  }
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent(props, forwardedRef) {
    const {
      children,
      minWidth,
      maxWidth = 360,
      className,
      style,
      onMouseEnter,
      onMouseLeave,
      ...rest
    } = props;

    const ctx = usePopoverContext();
    const {
      open,
      theme,
      floatingRef,
      floatingStyles,
      isPositioned,
      contentId,
      triggerId,
      trapFocus,
      triggerMode,
      cancelTimers,
      scheduleHide,
      placement,
    } = ctx;

    const { animationState, isVisible, onTransitionEnd } = useAnimationState({
      open,
      exitDuration: EXIT_DURATION + 50,
    });

    useFocusTrap(floatingRef, {
      enabled: trapFocus && open && isPositioned,
      returnFocusTo: ctx.triggerRef,
      returnFocus: true,
    });

    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        floatingRef.current = node;
        setRef(forwardedRef, node);
      },
      [floatingRef, forwardedRef],
    );

    if (!isVisible) return null;

    const isEntering = animationState === "entering";
    const opacity = isEntering ? 1 : 0;

    const side: Side = (placement.split("-")[0] as Side) ?? "bottom";
    const slide = getSlideTransform(side, isEntering);

    const baseTransform = floatingStyles.transform ?? "translate(0px, 0px)";
    const combinedTransform = `${baseTransform} ${slide}`;

    const duration = isEntering ? ENTER_DURATION : EXIT_DURATION;
    const easing = isEntering ? "cubic-bezier(0.16, 1, 0.3, 1)" : "ease";

    const contentStyle: CSSProperties = {
      ...floatingStyles,
      transform: combinedTransform,
      zIndex: 9998,
      opacity: isPositioned ? opacity : 0,
      transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
      background: popoverBg[theme],
      color: popoverText[theme],
      border: `1px solid ${popoverBorder[theme]}`,
      borderRadius: "0.5rem",
      boxShadow: popoverShadow[theme],
      ...(minWidth !== undefined ? { minWidth } : {}),
      ...(maxWidth !== undefined ? { maxWidth } : {}),
      ...style,
    };

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
      onTransitionEnd(e.propertyName);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(e);
      if (triggerMode === "hover") cancelTimers();
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseLeave?.(e);
      if (triggerMode === "hover") scheduleHide();
    };

    return (
      <Portal>
        <div
          ref={mergedRef}
          role="dialog"
          id={contentId}
          aria-labelledby={triggerId}
          aria-modal={trapFocus ? true : undefined}
          className={className}
          style={contentStyle}
          onTransitionEnd={handleTransitionEnd}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...rest}
        >
          {children}
        </div>
      </Portal>
    );
  },
);
