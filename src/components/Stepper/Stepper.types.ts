import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from "react";

export type StepperTheme = "light" | "dark";
export type StepperOrientation = "horizontal" | "vertical";
export type StepperVariant = "default" | "dots" | "progress";

export type StepStatus =
  | "incomplete"
  | "current"
  | "complete"
  | "error"
  | "disabled";

export interface StepMeta {
  index: number;
  status: StepStatus;
  label?: string | undefined;
  description?: string | undefined;
  errorMessage?: string | undefined;
}

export interface StepperRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;

  totalSteps: number;

  activeStep?: number | undefined;
  defaultActiveStep?: number | undefined;
  onStepChange?: ((step: number) => void) | undefined;

  linear?: boolean | undefined;
  onBeforeNext?:
    | ((currentStep: number) => boolean | Promise<boolean>)
    | undefined;
  onBeforePrev?:
    | ((currentStep: number) => boolean | Promise<boolean>)
    | undefined;

  stepErrors?: Record<number, string> | undefined;

  completedSteps?: Set<number> | undefined;

  disabledSteps?: Set<number> | undefined;

  orientation?: StepperOrientation | undefined;
  variant?: StepperVariant | undefined;
  theme?: StepperTheme | undefined;

  onComplete?: (() => void) | undefined;
}

export interface StepperListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface StepperStepProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, "onClick"> {
  index: number;
  label?: string | undefined;
  description?: string | undefined;
  icon?: ReactNode | undefined;
  completedIcon?: ReactNode | undefined;
  errorIcon?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface StepperSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface StepperContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  transitionDuration?: number | undefined;
  disableTransition?: boolean | undefined;
}

export interface StepperPanelProps extends HTMLAttributes<HTMLDivElement> {
  index: number;
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  forceMount?: boolean | undefined;
}

export interface StepperActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface StepperPrevButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  hideOnFirst?: boolean | undefined;
}

export interface StepperNextButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  hideOnLast?: boolean | undefined;
}

export interface StepperCompleteButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  showOnlyOnLast?: boolean | undefined;
}

export interface StepperContextValue {
  activeStep: number;
  totalSteps: number;
  direction: "forward" | "backward";
  isNavigating: boolean;

  getStepStatus: (index: number) => StepStatus;
  stepErrors: Record<number, string>;
  completedSteps: Set<number>;
  disabledSteps: Set<number>;

  goToStep: (index: number) => Promise<void>;
  goNext: () => Promise<void>;
  goPrev: () => Promise<void>;
  complete: () => void;

  orientation: StepperOrientation;
  variant: StepperVariant;
  theme: StepperTheme;
  linear: boolean;

  listId: string;
  getStepId: (index: number) => string;
  getPanelId: (index: number) => string;
}
