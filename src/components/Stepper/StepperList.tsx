import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import { useStepperContext } from "./StepperContext";
import { StepperSeparator } from "./StepperSeparator";
import type { StepperListProps } from "./Stepper.types";

export function StepperList(props: StepperListProps) {
  const { children, className, style, onKeyDown, ...rest } = props;
  const ctx = useStepperContext();

  const isHorizontal = ctx.orientation === "horizontal";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;

      const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
      const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

      const listEl = e.currentTarget;
      const stepButtons = Array.from(
        listEl.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]:not([aria-disabled="true"])',
        ),
      );
      if (stepButtons.length === 0) return;

      const currentIndex = stepButtons.findIndex(
        (btn) => btn === document.activeElement,
      );

      let nextIndex: number | null = null;

      switch (e.key) {
        case nextKey:
          nextIndex =
            currentIndex < 0 || currentIndex + 1 >= stepButtons.length
              ? 0
              : currentIndex + 1;
          break;
        case prevKey:
          nextIndex =
            currentIndex <= 0 ? stepButtons.length - 1 : currentIndex - 1;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = stepButtons.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      stepButtons[nextIndex]?.focus();
    },
    [onKeyDown, isHorizontal],
  );

  if (ctx.variant === "progress") {
    const progress =
      ctx.totalSteps <= 1
        ? 100
        : Math.round((ctx.activeStep / (ctx.totalSteps - 1)) * 100);

    const trackBg = ctx.theme === "dark" ? "#374151" : "#e5e7eb";
    const fillBg = "#3b82f6";

    return (
      <div
        role="progressbar"
        aria-valuenow={ctx.activeStep}
        aria-valuemin={0}
        aria-valuemax={ctx.totalSteps - 1}
        aria-label={`Step ${ctx.activeStep + 1} of ${ctx.totalSteps}`}
        className={className}
        style={{
          width: "100%",
          height: 8,
          borderRadius: 4,
          background: trackBg,
          overflow: "hidden",
          ...style,
        }}
        {...rest}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 4,
            width: `${progress}%`,
            background: fillBg,
            transition: "width 400ms ease",
          }}
        />
      </div>
    );
  }

  let separatorCounter = 0;
  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type === StepperSeparator) {
      const injected: Record<string, unknown> = {
        __separatorIndex: separatorCounter++,
      };
      return cloneElement(child as ReactElement<Record<string, unknown>>, injected);
    }
    return child;
  });

  const listStyle: CSSProperties = isHorizontal
    ? {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
      }
    : {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 0,
      };

  return (
    <div
      role="tablist"
      aria-label="Progress"
      aria-orientation={ctx.orientation}
      className={className}
      style={{ ...listStyle, ...style }}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {enhancedChildren}
    </div>
  );
}
