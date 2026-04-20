import { createPortal } from "react-dom";
import { useDialogContext } from "./DialogContext";
import type { DialogPortalProps } from "./Dialog.types";

export function DialogPortal({ children, container }: DialogPortalProps) {
  const ctx = useDialogContext();

  if (typeof document === "undefined") return null;

  const shouldRender = ctx.open || ctx.animationState !== "closed";
  if (!shouldRender) return null;

  const target = container ?? document.body;
  return createPortal(children, target);
}
