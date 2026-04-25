import { useEffect } from "react";
import type { RefObject } from "react";

export interface DismisserOptions {
  enabled: boolean;
  contentRef: RefObject<HTMLElement | null>;
  onDismiss: (
    reason: "outside" | "escape" | "blur" | "scroll" | "resize",
  ) => void;
  onEscape?: () => void;
}

export function useMenuDismisser(opts: DismisserOptions) {
  const { enabled, contentRef, onDismiss, onEscape } = opts;

  useEffect(() => {
    if (!enabled) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const portal = document.querySelector(
        '[data-plastic-portal="context-menu"]',
      );
      if (portal && portal.contains(target)) return;
      onDismiss("outside");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (onEscape) onEscape();
        else onDismiss("escape");
      }
    };
    const onBlur = () => onDismiss("blur");
    const onScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && contentRef.current && contentRef.current.contains(target))
        return;
      onDismiss("scroll");
    };
    const onResize = () => onDismiss("resize");

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, contentRef, onDismiss, onEscape]);
}
