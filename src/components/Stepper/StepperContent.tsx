import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useStepperContext } from "./StepperContext";
import { StepperContentInternalContext } from "./StepperContentContext";
import type { StepperContentProps } from "./Stepper.types";

export function StepperContent(props: StepperContentProps) {
  const {
    children,
    className,
    style,
    transitionDuration = 300,
    disableTransition = false,
    ...rest
  } = props;

  const ctx = useStepperContext();

  const [displayedStep, setDisplayedStep] = useState(ctx.activeStep);
  const [exitingStep, setExitingStep] = useState<number | null>(null);
  const [enterOffset, setEnterOffset] = useState<number>(0);

  const prevStepRef = useRef(ctx.activeStep);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevStepRef.current === ctx.activeStep) return;

    if (disableTransition) {
      setDisplayedStep(ctx.activeStep);
      setExitingStep(null);
      setEnterOffset(0);
      prevStepRef.current = ctx.activeStep;
      return;
    }

    if (cleanupTimerRef.current !== null) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
    if (enterRafRef.current !== null) {
      cancelAnimationFrame(enterRafRef.current);
      enterRafRef.current = null;
    }

    const slideDistance = 30;
    const incoming = ctx.activeStep;
    const outgoing = prevStepRef.current;

    setExitingStep(outgoing);
    setDisplayedStep(incoming);
    setEnterOffset(ctx.direction === "forward" ? slideDistance : -slideDistance);

    enterRafRef.current = requestAnimationFrame(() => {
      setEnterOffset(0);
      enterRafRef.current = null;

      cleanupTimerRef.current = setTimeout(() => {
        setExitingStep(null);
        cleanupTimerRef.current = null;
      }, transitionDuration);
    });

    prevStepRef.current = ctx.activeStep;
  }, [ctx.activeStep, ctx.direction, disableTransition, transitionDuration]);

  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current !== null) clearTimeout(cleanupTimerRef.current);
      if (enterRafRef.current !== null) cancelAnimationFrame(enterRafRef.current);
    };
  }, []);

  const contextValue = {
    displayedStep,
    exitingStep,
    enterOffset,
    direction: ctx.direction,
    transitionDuration,
    disableTransition,
  };

  const containerStyle: CSSProperties = {
    position: "relative",
    overflow: "hidden",
    minHeight: 120,
    ...style,
  };

  return (
    <StepperContentInternalContext.Provider value={contextValue}>
      <div className={className} style={containerStyle} {...rest}>
        {children}
      </div>
    </StepperContentInternalContext.Provider>
  );
}
