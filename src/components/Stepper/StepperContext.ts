import { createContext, useContext } from "react";
import type { StepperContextValue } from "./Stepper.types";

export const StepperContext = createContext<StepperContextValue | null>(null);

export function useStepperContext(): StepperContextValue {
  const ctx = useContext(StepperContext);
  if (ctx === null) {
    throw new Error(
      "Stepper compound components must be used within <Stepper.Root>",
    );
  }
  return ctx;
}
