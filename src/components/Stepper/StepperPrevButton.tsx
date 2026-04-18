import { useCallback, type CSSProperties } from "react";
import { useStepperContext } from "./StepperContext";
import type { StepperPrevButtonProps, StepperTheme } from "./Stepper.types";

const SECONDARY_COLORS: Record<
  StepperTheme,
  { bg: string; text: string; hoverBg: string; border: string; disabledText: string }
> = {
  light: {
    bg: "transparent",
    text: "#374151",
    hoverBg: "#f3f4f6",
    border: "#d1d5db",
    disabledText: "#d1d5db",
  },
  dark: {
    bg: "transparent",
    text: "#d1d5db",
    hoverBg: "#374151",
    border: "#4b5563",
    disabledText: "#4b5563",
  },
};

export function StepperPrevButton(props: StepperPrevButtonProps) {
  const {
    children = "Previous",
    className,
    style,
    hideOnFirst = true,
    "aria-label": ariaLabel,
    ...rest
  } = props;
  const ctx = useStepperContext();

  const isFirst = ctx.activeStep === 0;
  const isDisabled = isFirst || ctx.isNavigating;

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    void ctx.goPrev();
  }, [ctx, isDisabled]);

  if (isFirst && hideOnFirst) return null;

  const colors = SECONDARY_COLORS[ctx.theme];

  const buttonStyle: CSSProperties = {
    padding: "8px 18px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    background: colors.bg,
    color: isDisabled ? colors.disabledText : colors.text,
    border: `1px solid ${colors.border}`,
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "background-color 150ms ease, color 150ms ease",
    ...style,
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? (typeof children === "string" ? undefined : "Previous step")}
      className={className}
      style={buttonStyle}
      disabled={isDisabled}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}
