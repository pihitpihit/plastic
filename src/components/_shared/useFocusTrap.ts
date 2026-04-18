import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]",
].join(",");

export interface UseFocusTrapOptions {
  enabled: boolean;
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  returnFocusTo?: RefObject<HTMLElement | null> | undefined;
  returnFocus?: boolean | undefined;
  onOpenAutoFocus?: ((e: Event) => void) | undefined;
  onCloseAutoFocus?: ((e: Event) => void) | undefined;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions,
) {
  const {
    enabled,
    initialFocus,
    returnFocusTo,
    returnFocus = true,
    onOpenAutoFocus,
    onCloseAutoFocus,
  } = options;

  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    return elements.filter(
      (el) => el.offsetParent !== null && !el.hasAttribute("aria-hidden"),
    );
  }, [containerRef]);

  useEffect(() => {
    if (!enabled) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const focusEvent = new Event("dialog:openfocus", { cancelable: true });
    onOpenAutoFocus?.(focusEvent);

    let rafId: number | undefined;
    if (!focusEvent.defaultPrevented) {
      rafId = requestAnimationFrame(() => {
        if (initialFocus?.current) {
          initialFocus.current.focus();
        } else {
          const focusable = getFocusableElements();
          if (focusable.length > 0) {
            focusable[0]!.focus();
          } else {
            containerRef.current?.focus();
          }
        }
      });
    }

    return () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId);

      const closeEvent = new Event("dialog:closefocus", { cancelable: true });
      onCloseAutoFocus?.(closeEvent);

      if (!closeEvent.defaultPrevented && returnFocus) {
        const returnTarget = returnFocusTo?.current ?? previouslyFocusedRef.current;
        requestAnimationFrame(() => {
          returnTarget?.focus();
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, getFocusableElements]);
}
