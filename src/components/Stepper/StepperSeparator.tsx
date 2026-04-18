import type { CSSProperties } from "react";
import { useStepperContext } from "./StepperContext";
import type { StepperSeparatorProps, StepperTheme } from "./Stepper.types";

const SEPARATOR_TRACK_COLORS: Record<StepperTheme, string> = {
  light: "#e5e7eb",
  dark: "#4b5563",
};

const SEPARATOR_FILL_COLOR = "#3b82f6";

interface SeparatorInternalProps extends StepperSeparatorProps {
  __separatorIndex?: number;
}

export function StepperSeparator(props: StepperSeparatorProps) {
  const {
    className,
    style,
    __separatorIndex,
    ...rest
  } = props as SeparatorInternalProps;
  const ctx = useStepperContext();

  if (ctx.variant === "progress") return null;

  const sepIndex = __separatorIndex ?? -1;
  const isHorizontal = ctx.orientation === "horizontal";

  const isFilled =
    sepIndex >= 0 &&
    (ctx.completedSteps.has(sepIndex) || sepIndex < ctx.activeStep);
  const fill = isFilled ? 100 : 0;

  const trackColor = SEPARATOR_TRACK_COLORS[ctx.theme];

  const trackStyle: CSSProperties = isHorizontal
    ? {
        position: "relative",
        flex: 1,
        height: 2,
        margin: "0 12px",
        alignSelf: "flex-start",
        marginTop: ctx.variant === "dots" ? 6 : 18,
        background: trackColor,
        ...style,
      }
    : {
        position: "relative",
        width: 2,
        height: 40,
        marginLeft: ctx.variant === "dots" ? 5 : 17,
        background: trackColor,
        ...style,
      };

  const fillStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    background: SEPARATOR_FILL_COLOR,
    ...(isHorizontal
      ? { height: "100%", width: `${fill}%`, transition: "width 400ms ease" }
      : { width: "100%", height: `${fill}%`, transition: "height 400ms ease" }),
  };

  return (
    <div
      role="separator"
      aria-hidden="true"
      className={className}
      style={trackStyle}
      {...rest}
    >
      <div style={fillStyle} />
    </div>
  );
}
