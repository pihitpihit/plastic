import { createContext, useContext } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  DialogAnimationState,
  DialogTheme,
  DialogVariant,
} from "./Dialog.types";

export interface DialogContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  animationState: DialogAnimationState;
  setAnimationState: Dispatch<SetStateAction<DialogAnimationState>>;

  variant: DialogVariant;
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;

  theme: DialogTheme;

  titleId: string;
  descriptionId: string;
  contentId: string;

  triggerRef: MutableRefObject<HTMLElement | null>;

  hasDescription: boolean;
  setHasDescription: Dispatch<SetStateAction<boolean>>;

  nestingLevel: number;
}

export const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (ctx === null) {
    throw new Error(
      "Dialog compound components must be used within <Dialog.Root>",
    );
  }
  return ctx;
}

export const DialogNestingContext = createContext<number>(0);
