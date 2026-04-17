import { useRef, useCallback } from "react";

interface PointerOptions {
  onStart?: (e: PointerEvent) => boolean;
  onMove: (e: PointerEvent, delta: { dx: number; dy: number }) => void;
  onEnd: (e: PointerEvent, delta: { dx: number; dy: number }) => void;
  axis?: "x" | "y" | "both";
  axisLockThreshold?: number;
}

export function useActionablePointer(options: PointerOptions) {
  const startPos = useRef({ x: 0, y: 0 });
  const locked = useRef<"x" | "y" | "both" | null>(null);
  const active = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!active.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const opts = optionsRef.current;
    const threshold = opts.axisLockThreshold ?? 8;

    if (!locked.current && opts.axis !== "both") {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold) return;
      const angle = Math.abs(Math.atan2(dy, dx));
      if (opts.axis === "x") {
        if (angle > Math.PI / 4 && angle < (3 * Math.PI) / 4) {
          active.current = false;
          return;
        }
        locked.current = "x";
      } else if (opts.axis === "y") {
        if (angle < Math.PI / 4 || angle > (3 * Math.PI) / 4) {
          active.current = false;
          return;
        }
        locked.current = "y";
      }
    }

    if (!locked.current && opts.axis === "both") {
      locked.current = "both";
    }

    opts.onMove(e, { dx, dy });
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (!active.current) return;
    active.current = false;
    locked.current = null;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    optionsRef.current.onEnd(e, { dx, dy });
    (e.target as Element)?.releasePointerCapture?.(e.pointerId);
    e.target?.removeEventListener("pointermove", handlePointerMove as EventListener);
    e.target?.removeEventListener("pointerup", handlePointerUp as EventListener);
    e.target?.removeEventListener("pointercancel", handlePointerUp as EventListener);
  }, [handlePointerMove]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const opts = optionsRef.current;
      if (opts.onStart && !opts.onStart(e.nativeEvent)) return;

      startPos.current = { x: e.clientX, y: e.clientY };
      locked.current = null;
      active.current = true;

      (e.target as Element).setPointerCapture(e.pointerId);
      e.target.addEventListener("pointermove", handlePointerMove as EventListener);
      e.target.addEventListener("pointerup", handlePointerUp as EventListener);
      e.target.addEventListener("pointercancel", handlePointerUp as EventListener);
    },
    [handlePointerMove, handlePointerUp],
  );

  return { onPointerDown };
}
