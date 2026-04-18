import { useStepperContext } from "./StepperContext";
import type { StepStatus } from "./Stepper.types";

export interface UseStepperReturn {
  activeStep: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  isNavigating: boolean;
  goNext: () => Promise<void>;
  goPrev: () => Promise<void>;
  goToStep: (index: number) => Promise<void>;
  complete: () => void;
  getStepStatus: (index: number) => StepStatus;
}

export function useStepper(): UseStepperReturn {
  const ctx = useStepperContext();
  return {
    activeStep: ctx.activeStep,
    totalSteps: ctx.totalSteps,
    isFirst: ctx.activeStep === 0,
    isLast: ctx.activeStep === ctx.totalSteps - 1,
    isNavigating: ctx.isNavigating,
    goNext: ctx.goNext,
    goPrev: ctx.goPrev,
    goToStep: ctx.goToStep,
    complete: ctx.complete,
    getStepStatus: ctx.getStepStatus,
  };
}
