import { useCallback, type CSSProperties } from "react";
import { useStepperContext } from "./StepperContext";
import type {
  StepperCompleteButtonProps,
  StepperTheme,
} from "./Stepper.types";

const COMPLETE_COLORS: Record<
  StepperTheme,
  { bg: string; text: string; hoverBg: string; disabledBg: string; disabledText: string }
> = {
  light: {
    bg: "#22c55e",
    text: "#ffffff",
    hoverBg: "#16a34a",
    disabledBg: "#86efac",
    disabledText: "#ffffff",
  },
  dark: {
    bg: "#16a34a",
    text: "#ffffff",
    hoverBg: "#15803d",
    disabledBg: "#14532d",
    disabledText: "#86efac",
  },
};

export function StepperCompleteButton(props: StepperCompleteButtonProps) {
  const {
    children = "Complete",
    className,
    style,
    showOnlyOnLast = true,
    "aria-label": ariaLabel,
    ...rest
  } = props;
  const ctx = useStepperContext();

  const isLast = ctx.activeStep === ctx.totalSteps - 1;
  const isDisabled = ctx.isNavigating;

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    ctx.complete();
  }, [ctx, isDisabled]);

  if (showOnlyOnLast && !isLast) return null;

  const colors = COMPLETE_COLORS[ctx.theme];

  const buttonStyle: CSSProperties = {
    padding: "8px 20px",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    background: isDisabled ? colors.disabledBg : colors.bg,
    color: isDisabled ? colors.disabledText : colors.text,
    border: "none",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transition: "background-color 150ms ease",
    ...style,
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? (typeof children === "string" ? undefined : "Complete")}
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
