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

  const runGate = useCallback(
    async (
      gate: ((step: number) => boolean | Promise<boolean>) | undefined,
      fromStep: number,
    ): Promise<boolean> => {
      if (!gate) return true;
      navigatingRef.current = true;
      setIsNavigating(true);
      try {
        const ok = await gate(fromStep);
        return ok;
      } catch {
        return false;
      } finally {
        navigatingRef.current = false;
        setIsNavigating(false);
      }
    },
    [],
  );

  const canNavigateTo = useCallback(
    (index: number): boolean => {
      if (index < 0 || index >= totalSteps) return false;
      if (disabledSteps.has(index)) return false;
      if (index === activeStep) return false;
      if (!linear) return true;

      const forward = index > activeStep;
      if (!forward) return true; // linear 모드라도 뒤로는 자유
      if (index === activeStep + 1) return true; // 다음 단계
      if (completedSteps.has(index)) return true; // 이미 완료한 단계로 복귀
      return false;
    },
    [activeStep, totalSteps, disabledSteps, linear, completedSteps],
  );

  const goToStep = useCallback(
    async (index: number) => {
      if (navigatingRef.current) return;
      if (!canNavigateTo(index)) return;

      const forward = index > activeStep;
      const gate = forward ? onBeforeNext : onBeforePrev;
      const ok = await runGate(gate, activeStep);
      if (!ok) return;

      if (forward) markCompleted(activeStep);
      setDirection(forward ? "forward" : "backward");
      setActiveStep(index);
    },
    [
      activeStep,
      canNavigateTo,
      onBeforeNext,
      onBeforePrev,
      runGate,
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
