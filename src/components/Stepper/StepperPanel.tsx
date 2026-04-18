import type { CSSProperties } from "react";
import { useStepperContext } from "./StepperContext";
import { useStepperContentInternal } from "./StepperContentContext";
import type { StepperPanelProps } from "./Stepper.types";

export function StepperPanel(props: StepperPanelProps) {
  const {
    index,
    children,
    className,
    style,
    forceMount = false,
    ...rest
  } = props;

  const ctx = useStepperContext();
  const internal = useStepperContentInternal();

  const displayedStep = internal?.displayedStep ?? ctx.activeStep;
  const exitingStep = internal?.exitingStep ?? null;
  const enterOffset = internal?.enterOffset ?? 0;
  const direction = internal?.direction ?? ctx.direction;
  const transitionDuration = internal?.transitionDuration ?? 300;
  const disableTransition = internal?.disableTransition ?? false;

  const isActive = index === displayedStep;
  const isExiting = index === exitingStep;

  if (!isActive && !isExiting && !forceMount) {
    return null;
  }

  let panelStyle: CSSProperties;

  if (!isActive && !isExiting && forceMount) {
    panelStyle = {
      visibility: "hidden",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      pointerEvents: "none",
      ...style,
    };
  } else if (isExiting) {
    const slideDistance = 30;
    const translateX =
      direction === "forward" ? -slideDistance : slideDistance;
    panelStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      opacity: 0,
      transform: `translateX(${translateX}px)`,
      transition: disableTransition
        ? "none"
        : `opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease`,
      pointerEvents: "none",
      ...style,
    };
  } else if (isActive && exitingStep !== null) {
    panelStyle = {
      position: "relative",
      opacity: enterOffset === 0 ? 1 : 0,
      transform: `translateX(${enterOffset}px)`,
      transition:
        disableTransition || enterOffset !== 0
          ? "none"
          : `opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease`,
      ...style,
    };
  } else {
    panelStyle = {
      position: "relative",
      opacity: 1,
      transform: "translateX(0)",
      ...style,
    };
  }

  return (
    <div
      role="tabpanel"
      id={ctx.getPanelId(index)}
      aria-labelledby={ctx.getStepId(index)}
      tabIndex={isActive ? 0 : -1}
      className={className}
      style={panelStyle}
      {...rest}
    >
      {children}
    </div>
  );
}
