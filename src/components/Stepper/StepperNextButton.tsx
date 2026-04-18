import { useCallback, type CSSProperties } from "react";
import { useStepperContext } from "./StepperContext";
import type { StepperNextButtonProps, StepperTheme } from "./Stepper.types";

const PRIMARY_COLORS: Record<
  StepperTheme,
  { bg: string; text: string; hoverBg: string; disabledBg: string; disabledText: string }
> = {
  light: {
    bg: "#3b82f6",
    text: "#ffffff",
    hoverBg: "#2563eb",
    disabledBg: "#93c5fd",
    disabledText: "#ffffff",
  },
  dark: {
    bg: "#3b82f6",
    text: "#ffffff",
    hoverBg: "#2563eb",
    disabledBg: "#1e40af",
    disabledText: "#93c5fd",
  },
};

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{
        animation: "plastic-stepper-spin 900ms linear infinite",
        marginRight: 6,
        verticalAlign: "middle",
      }}
    >
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
      <path
        d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SPIN_KEYFRAMES = `@keyframes plastic-stepper-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

function ensureSpinKeyframes() {
  if (typeof document === "undefined") return;
  const id = "plastic-stepper-spin-keyframes";
  if (document.getElementById(id)) return;
  const styleEl = document.createElement("style");
  styleEl.id = id;
  styleEl.textContent = SPIN_KEYFRAMES;
  document.head.appendChild(styleEl);
}

export function StepperNextButton(props: StepperNextButtonProps) {
  const {
    children = "Next",
    className,
    style,
    hideOnLast = true,
    "aria-label": ariaLabel,
    ...rest
  } = props;
  const ctx = useStepperContext();

  const isLast = ctx.activeStep === ctx.totalSteps - 1;
  const isDisabled = isLast || ctx.isNavigating;

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    ensureSpinKeyframes();
    void ctx.goNext();
  }, [ctx, isDisabled]);

  if (isLast && hideOnLast) return null;

  const colors = PRIMARY_COLORS[ctx.theme];

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
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? (typeof children === "string" ? undefined : "Next step")}
      className={className}
      style={buttonStyle}
      disabled={isDisabled}
      onClick={handleClick}
      {...rest}
    >
      {ctx.isNavigating ? <Spinner /> : null}
      {children}
    </button>
  );
}
