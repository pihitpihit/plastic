import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useControllable } from "../_shared/useControllable";
import { StepperContext } from "./StepperContext";
import type {
  StepStatus,
  StepperContextValue,
  StepperRootProps,
} from "./Stepper.types";

export function StepperRoot(props: StepperRootProps) {
  const {
    children,
    totalSteps,

    activeStep: activeStepProp,
    defaultActiveStep,
    onStepChange,

    linear = true,
    onBeforeNext,
    onBeforePrev,

    stepErrors,
    completedSteps: completedStepsProp,
    disabledSteps: disabledStepsProp,

    orientation = "horizontal",
    variant = "default",
    theme = "light",

    onComplete,

    className,
    style,
    ...rest
  } = props;

  const [activeStep, setActiveStep] = useControllable<number>(
    activeStepProp,
    defaultActiveStep ?? 0,
    onStepChange,
  );

  const [internalCompleted, setInternalCompleted] = useState<Set<number>>(
    () => new Set<number>(),
  );
  const completedSteps = completedStepsProp ?? internalCompleted;
  const disabledSteps = disabledStepsProp ?? new Set<number>();
  const errors = stepErrors ?? {};

  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [isNavigating, setIsNavigating] = useState(false);

  const listId = useId();
  const getStepId = useCallback(
    (index: number) => `${listId}-step-${index}`,
    [listId],
  );
  const getPanelId = useCallback(
    (index: number) => `${listId}-panel-${index}`,
    [listId],
  );

  const getStepStatus = useCallback(
    (index: number): StepStatus => {
      if (disabledSteps.has(index)) return "disabled";
      if (errors[index]) return "error";
      if (index === activeStep) return "current";
      if (completedSteps.has(index) || index < activeStep) return "complete";
      return "incomplete";
    },
    [activeStep, completedSteps, disabledSteps, errors],
  );

  const markCompleted = useCallback(
    (index: number) => {
      if (completedStepsProp !== undefined) return;
      setInternalCompleted((prev) => {
        if (prev.has(index)) return prev;
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    },
    [completedStepsProp],
  );

  const navigatingRef = useRef(false);

  const goToStep = useCallback(
    async (index: number) => {
      if (navigatingRef.current) return;
      if (index < 0 || index >= totalSteps) return;
      if (disabledSteps.has(index)) return;
      if (index === activeStep) return;

      const forward = index > activeStep;

      if (linear && forward && index !== activeStep + 1) {
        return;
      }

      if (forward && onBeforeNext) {
        navigatingRef.current = true;
        setIsNavigating(true);
        try {
          const ok = await onBeforeNext(activeStep);
          if (!ok) return;
        } finally {
          navigatingRef.current = false;
          setIsNavigating(false);
        }
      }
      if (!forward && onBeforePrev) {
        navigatingRef.current = true;
        setIsNavigating(true);
        try {
          const ok = await onBeforePrev(activeStep);
          if (!ok) return;
        } finally {
          navigatingRef.current = false;
          setIsNavigating(false);
        }
      }

      if (forward) markCompleted(activeStep);
      setDirection(forward ? "forward" : "backward");
      setActiveStep(index);
    },
    [
      activeStep,
      totalSteps,
      disabledSteps,
      linear,
      onBeforeNext,
      onBeforePrev,
      markCompleted,
      setActiveStep,
    ],
  );

  const goNext = useCallback(async () => {
    await goToStep(activeStep + 1);
  }, [goToStep, activeStep]);

  const goPrev = useCallback(async () => {
    await goToStep(activeStep - 1);
  }, [goToStep, activeStep]);

  const complete = useCallback(() => {
    markCompleted(activeStep);
    onComplete?.();
  }, [activeStep, markCompleted, onComplete]);

  const ctxValue = useMemo<StepperContextValue>(
    () => ({
      activeStep,
      totalSteps,
      direction,
      isNavigating,
      getStepStatus,
      stepErrors: errors,
      completedSteps,
      disabledSteps,
      goToStep,
      goNext,
      goPrev,
      complete,
      orientation,
      variant,
      theme,
      linear,
      listId,
      getStepId,
      getPanelId,
    }),
    [
      activeStep,
      totalSteps,
      direction,
      isNavigating,
      getStepStatus,
      errors,
      completedSteps,
      disabledSteps,
      goToStep,
      goNext,
      goPrev,
      complete,
      orientation,
      variant,
      theme,
      linear,
      listId,
      getStepId,
      getPanelId,
    ],
  );

  const bg = theme === "dark" ? "#0f172a" : "transparent";
  const text = theme === "dark" ? "#f3f4f6" : "#111827";

  return (
    <StepperContext.Provider value={ctxValue}>
      <div
        data-stepper-root=""
        data-orientation={orientation}
        data-variant={variant}
        data-theme={theme}
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          background: bg,
          color: text,
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
}
