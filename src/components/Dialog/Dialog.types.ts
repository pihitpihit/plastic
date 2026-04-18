import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
  RefObject,
} from "react";

// ── Shared types ────────────────────────────────────────────
export type DialogTheme = "light" | "dark";
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
export type DialogVariant = "default" | "alert";
export type DialogAnimationState = "closed" | "opening" | "open" | "closing";

// ── Root Props ──────────────────────────────────────────────
export interface DialogRootProps {
  children: ReactNode;
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  variant?: DialogVariant | undefined;
  closeOnEscape?: boolean | undefined;
  closeOnOverlayClick?: boolean | undefined;
  theme?: DialogTheme | undefined;
}

// ── Trigger Props ───────────────────────────────────────────
export interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean | undefined;
}

// ── Portal Props ────────────────────────────────────────────
export interface DialogPortalProps {
  children: ReactNode;
  container?: HTMLElement | undefined;
}

// ── Overlay Props ───────────────────────────────────────────
export interface DialogOverlayProps extends HTMLAttributes<HTMLDivElement> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Content Props ───────────────────────────────────────────
export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: DialogSize | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;

  initialFocus?: RefObject<HTMLElement | null> | undefined;
  returnFocus?: boolean | undefined;

  onOpenAutoFocus?: ((e: Event) => void) | undefined;
  onCloseAutoFocus?: ((e: Event) => void) | undefined;
  onEscapeKeyDown?: ((e: KeyboardEvent) => void) | undefined;
  onPointerDownOutside?: ((e: PointerEvent) => void) | undefined;
}

// ── Section Props ───────────────────────────────────────────
export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface DialogBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Title / Description Props ───────────────────────────────
export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface DialogDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Close Props ─────────────────────────────────────────────
export interface DialogCloseProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
  asChild?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
