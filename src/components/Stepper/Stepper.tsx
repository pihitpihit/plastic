import { StepperRoot } from "./StepperRoot";
import { StepperList } from "./StepperList";
import { StepperStep } from "./StepperStep";
import { StepperSeparator } from "./StepperSeparator";
import { StepperContent } from "./StepperContent";
import { StepperPanel } from "./StepperPanel";
import { StepperActions } from "./StepperActions";
import { StepperPrevButton } from "./StepperPrevButton";
import { StepperNextButton } from "./StepperNextButton";
import { StepperCompleteButton } from "./StepperCompleteButton";

export const Stepper = Object.assign(StepperRoot, {
  Root: StepperRoot,
  List: StepperList,
  Step: StepperStep,
  Separator: StepperSeparator,
  Content: StepperContent,
  Panel: StepperPanel,
  Actions: StepperActions,
  PrevButton: StepperPrevButton,
  NextButton: StepperNextButton,
  CompleteButton: StepperCompleteButton,
});
