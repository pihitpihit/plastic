import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { progressBarColor, progressTrackColor } from "./colors";
import { useToastItemContext } from "./ToastContext";
import { useReducedMotion } from "./useReducedMotion";
import type { ToastProgressProps } from "./Toast.types";

export const ToastProgress = forwardRef<HTMLDivElement, ToastProgressProps>(
  function ToastProgress({ variant, className, style, ...rest }, ref) {
    const item = useToastItemContext();
    const prefersReducedMotion = useReducedMotion();

    if (item.duration === Infinity) return null;

    const effectiveVariant = variant ?? item.variant;
    const progress =
      item.duration > 0 ? Math.min(item.elapsed / item.duration, 1) : 0;
    const remainingPercent = Math.max(0, (1 - progress) * 100);
    const progressPercent = Math.round(progress * 100);

    const trackStyle: CSSProperties = {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "3px",
      backgroundColor: progressTrackColor[item.theme],
      overflow: "hidden",
      borderRadius: "0 0 8px 8px",
      ...style,
    };

    const barStyle: CSSProperties = {
      height: "100%",
      width: `${remainingPercent}%`,
      backgroundColor: progressBarColor[item.theme][effectiveVariant],
      transition:
        item.isPaused || prefersReducedMotion ? "none" : "width 100ms linear",
    };

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        className={className}
        style={trackStyle}
        {...rest}
      >
        <div style={barStyle} />
      </div>
    );
  },
);
