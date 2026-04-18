import { forwardRef, useCallback, useEffect } from "react";
import type { CSSProperties, Ref } from "react";
import { Portal } from "../_shared/Portal";
import { useAnimationState } from "../_shared/useAnimationState";
import { useTooltipContext } from "./TooltipContext";
import { tooltipBg, tooltipBorder, tooltipText } from "./colors";
import type { TooltipContentProps } from "./Tooltip.types";

const ENTER_DURATION = 100;
const EXIT_DURATION = 100;

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (!ref) return;
  if (typeof ref === "function") ref(value);
  else (ref as React.MutableRefObject<T | null>).current = value;
}

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  function TooltipContent(props, forwardedRef) {
    const {
      children,
      multiline = false,
      maxWidth,
      className,
      style,
      onMouseEnter,
      onMouseLeave,
      ...rest
    } = props;

    const ctx = useTooltipContext();
    const {
      open,
      theme,
      floatingRef,
      floatingStyles,
      isPositioned,
      contentId,
      cancelTimers,
      scheduleHide,
    } = ctx;

    const { animationState, isVisible, onTransitionEnd } = useAnimationState({
      open,
      exitDuration: EXIT_DURATION + 50,
    });

    useEffect(() => {
      if (!open) return;
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          ctx.setOpen(false);
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, ctx]);

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
    const scale = isEntering ? 1 : 0.95;

    const baseTransform = floatingStyles.transform ?? "translate(0px, 0px)";
    const combinedTransform = `${baseTransform} scale(${scale})`;

    const effectiveMaxWidth =
      maxWidth ?? (multiline ? 250 : undefined);

    const contentStyle: CSSProperties = {
      ...floatingStyles,
      transform: combinedTransform,
      zIndex: 9999,
      pointerEvents: "none",
      opacity: isPositioned ? opacity : 0,
      transition: `opacity ${isEntering ? ENTER_DURATION : EXIT_DURATION}ms ease, transform ${isEntering ? ENTER_DURATION : EXIT_DURATION}ms ease`,
      background: tooltipBg[theme],
      color: tooltipText[theme],
      border: `1px solid ${tooltipBorder[theme]}`,
      borderRadius: "0.375rem",
      padding: "0.375rem 0.625rem",
      fontSize: "0.8125rem",
      lineHeight: 1.4,
      whiteSpace: multiline ? "normal" : "nowrap",
      ...(effectiveMaxWidth !== undefined ? { maxWidth: effectiveMaxWidth } : {}),
      ...style,
    };

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
      onTransitionEnd(e.propertyName);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(e);
      cancelTimers();
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
      onMouseLeave?.(e);
      scheduleHide();
    };

    return (
      <Portal>
        <div
          ref={mergedRef}
          role="tooltip"
          id={contentId}
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
