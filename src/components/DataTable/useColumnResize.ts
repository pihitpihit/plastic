import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface UseColumnResizeOptions {
  initialWidths: Record<string, number>;
  minWidths: Record<string, number>;
  maxWidths: Record<string, number>;
}

export interface UseColumnResizeReturn {
  widths: Record<string, number>;
  onResizeStart: (key: string, e: ReactPointerEvent) => void;
  resizingKey: string | null;
}

export function useColumnResize(
  options: UseColumnResizeOptions,
): UseColumnResizeReturn {
  const { initialWidths, minWidths, maxWidths } = options;

  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const keyRef = useRef("");
  const minWidthsRef = useRef(minWidths);
  const maxWidthsRef = useRef(maxWidths);

  useEffect(() => {
    minWidthsRef.current = minWidths;
    maxWidthsRef.current = maxWidths;
  }, [minWidths, maxWidths]);

  useEffect(() => {
    setWidths((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(initialWidths)) {
        if (!(k in next)) next[k] = v;
      }
      return next;
    });
  }, [initialWidths]);

  const cleanup = useCallback(() => {
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const onPointerMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const onPointerUpRef = useRef<() => void>(() => {});

  const onResizeStart = useCallback(
    (key: string, e: ReactPointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      keyRef.current = key;
      startXRef.current = e.clientX;
      startWidthRef.current = widths[key] ?? 150;
      setResizingKey(key);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handleMove = (ev: PointerEvent) => {
        const k = keyRef.current;
        const delta = ev.clientX - startXRef.current;
        const newWidth = startWidthRef.current + delta;
        const min = minWidthsRef.current[k] ?? 50;
        const max = maxWidthsRef.current[k] ?? Infinity;
        const clamped = Math.max(min, Math.min(max, newWidth));
        setWidths((prev) => ({ ...prev, [k]: clamped }));
      };

      const handleUp = () => {
        setResizingKey(null);
        cleanup();
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUp);
      };

      onPointerMoveRef.current = handleMove;
      onPointerUpRef.current = handleUp;

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
    },
    [widths, cleanup],
  );

  useEffect(() => {
    return () => {
      document.removeEventListener("pointermove", onPointerMoveRef.current);
      document.removeEventListener("pointerup", onPointerUpRef.current);
      cleanup();
    };
  }, [cleanup]);

  return { widths, onResizeStart, resizingKey };
}
