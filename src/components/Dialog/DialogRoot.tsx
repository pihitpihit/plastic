import { useCallback, useContext, useId, useRef, useState } from "react";
import { useControllable } from "../_shared/useControllable";
import {
  DialogContext,
  DialogNestingContext,
  type DialogContextValue,
} from "./DialogContext";
import type { DialogAnimationState, DialogRootProps } from "./Dialog.types";

export function DialogRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  variant = "default",
  closeOnEscape = true,
  closeOnOverlayClick = true,
  theme = "light",
}: DialogRootProps) {
  const [open, setOpenInternal] = useControllable(
    controlledOpen,
    defaultOpen,
    onOpenChange,
  );

  const [animationState, setAnimationState] = useState<DialogAnimationState>(
    open ? "open" : "closed",
  );
  const [hasDescription, setHasDescription] = useState(false);

  const titleId = useId();
  const descriptionId = useId();
  const contentId = useId();

  const triggerRef = useRef<HTMLElement | null>(null);

  const parentLevel = useContext(DialogNestingContext);
  const nestingLevel = parentLevel;

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenInternal(next);
    },
    [setOpenInternal],
  );

  const ctx: DialogContextValue = {
    open,
    setOpen,
    animationState,
    setAnimationState,
    variant,
    closeOnEscape,
    closeOnOverlayClick,
    theme,
    titleId,
    descriptionId,
    contentId,
    triggerRef,
    hasDescription,
    setHasDescription,
    nestingLevel,
  };

  return (
    <DialogContext.Provider value={ctx}>
      <DialogNestingContext.Provider value={nestingLevel + 1}>
        {children}
      </DialogNestingContext.Provider>
    </DialogContext.Provider>
  );
}
