import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export interface PortalProps {
  children: ReactNode;
  container?: HTMLElement | undefined;
}

export function Portal({ children, container }: PortalProps) {
  if (typeof document === "undefined") return null;
  const target = container ?? document.body;
  return createPortal(children, target);
}
