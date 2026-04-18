import { createContext, useContext } from "react";

export interface StepperContentInternalState {
  displayedStep: number;
  exitingStep: number | null;
  enterOffset: number;
  direction: "forward" | "backward";
  transitionDuration: number;
  disableTransition: boolean;
}

export const StepperContentInternalContext =
  createContext<StepperContentInternalState | null>(null);

export function useStepperContentInternal(): StepperContentInternalState | null {
  return useContext(StepperContentInternalContext);
}
