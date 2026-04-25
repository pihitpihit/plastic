import { cloneElement, isValidElement, useCallback, useRef } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactElement,
  TouchEvent as ReactTouchEvent,
} from "react";
import { useContextMenuRootContext } from "./ContextMenuContext";
import type { ContextMenuTriggerProps } from "./ContextMenu.types";

export function ContextMenuTrigger(props: ContextMenuTriggerProps) {
  const { asChild = false, disabled = false, className, style, children } = props;
  const ctx = useContextMenuRootContext();
  const localRef = useRef<HTMLElement | null>(null);

  const touchStateRef = useRef<{
    tid: number;
    sx: number;
    sy: number;
  } | null>(null);

  const setTriggerRef = useCallback(
    (node: HTMLElement | null) => {
      localRef.current = node;
      ctx.triggerRef.current = node;
    },
    [ctx.triggerRef],
  );

  const effectiveDisabled = disabled || ctx.disabled;

  const onContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      if (effectiveDisabled) return;
      e.preventDefault();
      e.stopPropagation();
      ctx.previousFocusRef.current =
        (document.activeElement as HTMLElement | null) ?? null;
      ctx.setOpen(true, { x: e.clientX, y: e.clientY }, "pointer");
    },
    [effectiveDisabled, ctx],
  );

  const cancelTouch = useCallback(() => {
    const s = touchStateRef.current;
    if (s) {
      window.clearTimeout(s.tid);
      touchStateRef.current = null;
    }
  }, []);

  const onTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      if (effectiveDisabled) return;
      if (ctx.longPressMs <= 0) return;
      const t0 = e.touches[0];
      if (!t0) return;
      const sx = t0.clientX;
      const sy = t0.clientY;
      const tid = window.setTimeout(() => {
        ctx.previousFocusRef.current =
          (document.activeElement as HTMLElement | null) ?? null;
        ctx.setOpen(true, { x: sx, y: sy }, "pointer");
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.vibrate === "function"
        ) {
          try {
            navigator.vibrate(8);
          } catch {
            // ignore
          }
        }
        touchStateRef.current = null;
      }, ctx.longPressMs);
      touchStateRef.current = { tid, sx, sy };
    },
    [effectiveDisabled, ctx],
  );

  const onTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      const s = touchStateRef.current;
      const t = e.touches[0];
      if (!s || !t) return;
      const dx = t.clientX - s.sx;
      const dy = t.clientY - s.sy;
      const d = Math.hypot(dx, dy);
      if (d > ctx.longPressTolerance) cancelTouch();
    },
    [ctx.longPressTolerance, cancelTouch],
  );

  const onTouchEnd = useCallback(() => cancelTouch(), [cancelTouch]);
  const onTouchCancel = useCallback(() => cancelTouch(), [cancelTouch]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (effectiveDisabled) return;
      const isCtxKey =
        e.key === "ContextMenu" || (e.shiftKey && e.key === "F10");
      if (!isCtxKey) return;
      e.preventDefault();
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const r = el.getBoundingClientRect();
      ctx.previousFocusRef.current = el;
      ctx.setOpen(true, { x: r.left, y: r.bottom }, "keyboard");
    },
    [effectiveDisabled, ctx],
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = child.props as Record<string, unknown>;
    const mergedStyle = {
      ...(childProps["style"] as CSSProperties | undefined),
      ...style,
    };
    const existingClass = childProps["className"];
    const mergedClassName =
      [typeof existingClass === "string" ? existingClass : "", className ?? ""]
        .filter(Boolean)
        .join(" ") || undefined;
    const merged: Record<string, unknown> = {
      ref: setTriggerRef,
      onContextMenu,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
      onKeyDown,
      "data-plastic-cm-trigger": "",
    };
    if (mergedClassName) merged["className"] = mergedClassName;
    if (Object.keys(mergedStyle).length > 0) merged["style"] = mergedStyle;
    return cloneElement(child, merged);
  }

  const wrapperStyle: CSSProperties = {
    display: "inline-block",
    ...style,
  };
  return (
    <span
      ref={setTriggerRef as unknown as (n: HTMLSpanElement | null) => void}
      onContextMenu={onContextMenu}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onKeyDown={onKeyDown}
      data-plastic-cm-trigger=""
      tabIndex={effectiveDisabled ? -1 : 0}
      {...(className !== undefined ? { className } : {})}
      style={wrapperStyle}
    >
      {children}
    </span>
  );
}

ContextMenuTrigger.displayName = "ContextMenu.Trigger";
