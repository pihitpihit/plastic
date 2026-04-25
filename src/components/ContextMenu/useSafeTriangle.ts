import { useCallback, useEffect, useRef } from "react";
import { isInsideTriangle } from "./geometry";
import type { XY } from "./geometry";

export interface SafeTriangleHandle {
  onSubTriggerLeave: (pointer: XY, subRect: DOMRect | null) => void;
  onPointerInside: () => void;
  reset: () => void;
}

export interface SafeTriangleOptions {
  onExpired: () => void;
  delayMs?: number;
  maxAgeMs?: number;
  subscribeParentMove: (
    fn: (p: { x: number; y: number }) => void,
  ) => () => void;
}

export function useSafeTriangle(opts: SafeTriangleOptions): SafeTriangleHandle {
  const { onExpired, delayMs = 150, maxAgeMs = 300, subscribeParentMove } = opts;
  const stateRef = useRef<{
    p0: XY;
    p1: XY;
    p2: XY;
    timer: number;
    start: number;
  } | null>(null);

  const clearTimer = useCallback(() => {
    const s = stateRef.current;
    if (s) {
      window.clearTimeout(s.timer);
      stateRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const onSubTriggerLeave = useCallback(
    (pointer: XY, subRect: DOMRect | null) => {
      if (!subRect) {
        onExpired();
        return;
      }
      const p1: XY = { x: subRect.left, y: subRect.top };
      const p2: XY = { x: subRect.left, y: subRect.bottom };
      const timer = window.setTimeout(() => {
        stateRef.current = null;
        onExpired();
      }, delayMs);
      stateRef.current = {
        p0: pointer,
        p1,
        p2,
        timer,
        start: Date.now(),
      };
      const unsub = subscribeParentMove((p) => {
        const s = stateRef.current;
        if (!s) {
          unsub();
          return;
        }
        if (Date.now() - s.start > maxAgeMs) {
          window.clearTimeout(s.timer);
          stateRef.current = null;
          unsub();
          onExpired();
          return;
        }
        if (isInsideTriangle(p, s.p0, s.p1, s.p2)) {
          window.clearTimeout(s.timer);
          const next = window.setTimeout(() => {
            stateRef.current = null;
            unsub();
            onExpired();
          }, delayMs);
          stateRef.current = { ...s, timer: next };
        }
      });
    },
    [delayMs, maxAgeMs, onExpired, subscribeParentMove],
  );

  const onPointerInside = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  return { onSubTriggerLeave, onPointerInside, reset };
}
