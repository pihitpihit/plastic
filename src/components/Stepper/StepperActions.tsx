import type { CSSProperties } from "react";
import { useStepperContext } from "./StepperContext";
import type { StepperActionsProps, StepperTheme } from "./Stepper.types";

const ACTIONS_BORDER: Record<StepperTheme, string> = {
  light: "#e5e7eb",
  dark: "#374151",
};

export function StepperActions(props: StepperActionsProps) {
  const { children, className, style, ...rest } = props;
  const ctx = useStepperContext();

  const containerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTop: `1px solid ${ACTIONS_BORDER[ctx.theme]}`,
    ...style,
  };

  return (
    <div className={className} style={containerStyle} {...rest}>
      {children}
    </div>
  );
}
