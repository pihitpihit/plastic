import { forwardRef, useEffect, useRef } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { toastBg, toastBorder, titleColor } from "./colors";
import { useToastContext, useToastItemContext } from "./ToastContext";
import { useReducedMotion } from "./useReducedMotion";
import { useToastSwipe } from "./useToastSwipe";
import {
  ENTER_DURATION,
  ENTER_EASING,
  EXIT_DURATION,
  EXIT_EASING,
  enterFrom,
  exitTo,
} from "./animations";
import type { ToastRootProps } from "./Toast.types";

function mergeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

export const ToastRoot = forwardRef<HTMLDivElement, ToastRootProps>(
  function ToastRoot(
    {
      children,
      className,
      style,
      swipeDismissible: swipeDismissibleProp,
      pauseOnHover: pauseOnHoverProp,
      onPointerEnter: userPointerEnter,
      onPointerLeave: userPointerLeave,
      onPointerDown: userPointerDown,
      onPointerMove: userPointerMove,
      onPointerUp: userPointerUp,
      ...rest
    },
    forwardedRef,
  ) {
    const provider = useToastContext();
    const item = useToastItemContext();
    const prefersReducedMotion = useReducedMotion();

    const rootRef = useRef<HTMLDivElement | null>(null);
    const rafRef1 = useRef<number | null>(null);
    const rafRef2 = useRef<number | null>(null);
    const setRef = mergeRefs<HTMLDivElement>(forwardedRef, rootRef);

    const swipeEnabled =
      (swipeDismissibleProp ?? provider.swipeDismissible) &&
      item.phase !== "exiting";
    const pauseOnHover = pauseOnHoverProp ?? provider.pauseOnHover;

    const swipe = useToastSwipe({
      enabled: swipeEnabled,
      threshold: provider.swipeThreshold,
      direction: provider.swipeDirection,
      onDismiss: item.swipeDismiss,
      rootRef,
    });

    // Entering: 2-frame trick (initial offset → transition to rest)
    useEffect(() => {
      if (item.phase !== "entering") return;
      const el = rootRef.current;
      if (!el) return;

      if (prefersReducedMotion) {
        el.style.transform = "translateX(0) translateY(0)";
        el.style.opacity = "1";
        el.style.transition = "none";
        return;
      }

      const from = enterFrom[provider.position];
      el.style.transition = "none";
      el.style.transform = String(from.transform ?? "none");
      el.style.opacity = String(from.opacity ?? 1);

      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          el.style.transition = `transform ${ENTER_DURATION}ms ${ENTER_EASING}, opacity ${ENTER_DURATION}ms ${ENTER_EASING}`;
          el.style.transform = "translateX(0) translateY(0)";
          el.style.opacity = "1";
        });
        rafRef2.current = raf2;
      });
      rafRef1.current = raf1;

      return () => {
        if (rafRef1.current) cancelAnimationFrame(rafRef1.current);
        if (rafRef2.current) cancelAnimationFrame(rafRef2.current);
      };
    }, [item.phase, provider.position, prefersReducedMotion]);

    // Exiting: apply exit transform
    useEffect(() => {
      if (item.phase !== "exiting") return;
      const el = rootRef.current;
      if (!el) return;

      if (prefersReducedMotion) {
        el.style.transition = "none";
        el.style.opacity = "0";
        return;
      }

      const to = exitTo[provider.position];
      el.style.transition = `transform ${EXIT_DURATION}ms ${EXIT_EASING}, opacity ${EXIT_DURATION}ms ${EXIT_EASING}`;
      el.style.transform = String(to.transform ?? "none");
      el.style.opacity = String(to.opacity ?? 0);
    }, [item.phase, provider.position, prefersReducedMotion]);

    const isError = item.variant === "error";
    const shadow =
      provider.theme === "light"
        ? "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)"
        : "0 4px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)";

    const isIdle = item.phase === "idle" || item.phase === "entering";
    const swipeTransform = swipe.isSwiping
      ? provider.swipeDirection === "horizontal"
        ? `translateX(${swipe.offset}px)`
        : `translateY(${swipe.offset}px)`
      : undefined;

    const swipeStyles: CSSProperties = swipe.isSwiping
      ? {
          transform: swipeTransform,
          opacity: swipe.opacity,
          transition: "none",
        }
      : {};

    const mergedStyle: CSSProperties = {
      pointerEvents: "auto",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      padding: "12px 16px",
      borderRadius: "8px",
      boxShadow: shadow,
      border: `1px solid ${toastBorder[provider.theme][item.variant]}`,
      backgroundColor: toastBg[provider.theme][item.variant],
      color: titleColor[provider.theme],
      minWidth: "300px",
      maxWidth: "420px",
      width: "100%",
      position: "relative",
      overflow: "hidden",
      touchAction: swipeEnabled
        ? provider.swipeDirection === "horizontal"
          ? "pan-y"
          : "pan-x"
        : "auto",
      userSelect: "none",
      ...(isIdle && !swipe.isSwiping ? {} : {}),
      ...style,
      ...swipeStyles,
    };

    const handlePointerEnter = (e: ReactPointerEvent<HTMLDivElement>) => {
      userPointerEnter?.(e);
      if (pauseOnHover) item.pause();
    };

    const handlePointerLeave = (e: ReactPointerEvent<HTMLDivElement>) => {
      userPointerLeave?.(e);
      if (pauseOnHover) item.resume();
    };

    const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
      userPointerDown?.(e);
      swipe.handlePointerDown(e);
    };

    const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
      userPointerMove?.(e);
      swipe.handlePointerMove(e);
    };

    const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
      userPointerUp?.(e);
      swipe.handlePointerUp(e);
    };

    return (
      <div
        ref={setRef}
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
        aria-atomic="true"
        data-toast-id={item.id}
        data-variant={item.variant}
        data-phase={item.phase}
        data-swiping={swipe.isSwiping || undefined}
        className={className}
        style={mergedStyle}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
