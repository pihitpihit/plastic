import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type {
  SplitPaneCollapsible,
  SplitPaneDirection,
} from "./SplitPane.types";
import { DIVIDER_PX, clamp, toPct } from "./SplitPane.utils";

interface DragState {
  startClient: number;
  startSize: number;
  pointerId: number;
}

interface UsePaneResizeOptions {
  direction: SplitPaneDirection;
  disabled: boolean;
  rtl: boolean;
  sizePx: number;
  containerPx: number;
  minPx: number;
  maxPx: number;
  snapPx: number | null;
  snapThreshold: number;
  collapsible: SplitPaneCollapsible;
  collapsedSize: number;
  collapseThreshold: number;
  dividerRef: MutableRefObject<HTMLDivElement | null>;
  commitSize: (next: number) => void;
  onSizeChangeEnd?: ((sizePx: number, sizePercent: number) => void) | undefined;
  toggleCollapse: (which: "start" | "end") => void;
}

export interface UsePaneResizeResult {
  onDividerPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDividerKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  isDragging: boolean;
}

export function usePaneResize(opts: UsePaneResizeOptions): UsePaneResizeResult {
  const {
    direction,
    disabled,
    rtl,
    sizePx,
    containerPx,
    minPx,
    maxPx,
    snapPx,
    snapThreshold,
    collapsible,
    collapsedSize,
    collapseThreshold,
    dividerRef,
    commitSize,
    onSizeChangeEnd,
    toggleCollapse,
  } = opts;

  const [isDragging, setIsDragging] = useState(false);

  const sizePxRef = useRef(sizePx);
  sizePxRef.current = sizePx;
  const containerPxRef = useRef(containerPx);
  containerPxRef.current = containerPx;
  const minPxRef = useRef(minPx);
  minPxRef.current = minPx;
  const maxPxRef = useRef(maxPx);
  maxPxRef.current = maxPx;
  const snapPxRef = useRef(snapPx);
  snapPxRef.current = snapPx;
  const snapThresholdRef = useRef(snapThreshold);
  snapThresholdRef.current = snapThreshold;
  const collapsibleRef = useRef(collapsible);
  collapsibleRef.current = collapsible;
  const collapsedSizeRef = useRef(collapsedSize);
  collapsedSizeRef.current = collapsedSize;
  const collapseThresholdRef = useRef(collapseThreshold);
  collapseThresholdRef.current = collapseThreshold;
  const directionRef = useRef(direction);
  directionRef.current = direction;
  const rtlRef = useRef(rtl);
  rtlRef.current = rtl;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const commitSizeRef = useRef(commitSize);
  commitSizeRef.current = commitSize;
  const onSizeChangeEndRef = useRef(onSizeChangeEnd);
  onSizeChangeEndRef.current = onSizeChangeEnd;
  const toggleCollapseRef = useRef(toggleCollapse);
  toggleCollapseRef.current = toggleCollapse;

  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number>(0);
  const pendingNextRef = useRef<number | null>(null);

  const computeClamped = useCallback((raw: number): number => {
    const curMin = minPxRef.current;
    const curMax = maxPxRef.current;
    const curSnap = snapPxRef.current;
    const curSnapThr = snapThresholdRef.current;
    const curCollapsible = collapsibleRef.current;
    const curCollapsed = collapsedSizeRef.current;
    const curCollapseThr = collapseThresholdRef.current;
    const curContainer = containerPxRef.current;

    let next = raw;

    if (curSnap != null && Math.abs(next - curSnap) < curSnapThr) {
      next = curSnap;
    }

    if (curCollapsible === "start" || curCollapsible === "both") {
      if (next < curCollapseThr) {
        return curCollapsed;
      }
    }
    if (curCollapsible === "end" || curCollapsible === "both") {
      const endSize = curContainer - next - DIVIDER_PX;
      if (endSize < curCollapseThr) {
        return curContainer - curCollapsed - DIVIDER_PX;
      }
    }

    return clamp(next, curMin, curMax);
  }, []);

  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabledRef.current) return;
      e.preventDefault();
      e.stopPropagation();

      const startClient =
        directionRef.current === "horizontal" ? e.clientX : e.clientY;
      dragRef.current = {
        startClient,
        startSize: sizePxRef.current,
        pointerId: e.pointerId,
      };
      const div = dividerRef.current;
      if (div && typeof div.setPointerCapture === "function") {
        try {
          div.setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      }
      setIsDragging(true);
      document.body.style.cursor =
        directionRef.current === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        const cur =
          directionRef.current === "horizontal" ? ev.clientX : ev.clientY;
        const signFlip =
          rtlRef.current && directionRef.current === "horizontal" ? -1 : 1;
        const delta = (cur - dragRef.current.startClient) * signFlip;
        const raw = dragRef.current.startSize + delta;
        const next = computeClamped(raw);

        pendingNextRef.current = next;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            if (pendingNextRef.current != null) {
              commitSizeRef.current(pendingNextRef.current);
              pendingNextRef.current = null;
            }
          });
        }
      };

      const finish = (ev: PointerEvent) => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = 0;
          if (pendingNextRef.current != null) {
            commitSizeRef.current(pendingNextRef.current);
            pendingNextRef.current = null;
          }
        }
        dragRef.current = null;
        const d = dividerRef.current;
        if (d && typeof d.releasePointerCapture === "function") {
          try {
            d.releasePointerCapture(ev.pointerId);
          } catch {
            /* noop */
          }
        }
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", finish);

        const finalPx = sizePxRef.current;
        const pct = toPct(finalPx, containerPxRef.current);
        onSizeChangeEndRef.current?.(finalPx, pct);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", finish);
    },
    [dividerRef, computeClamped],
  );

  const onDividerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabledRef.current) return;
      const step = e.shiftKey ? 100 : 10;
      const horz = directionRef.current === "horizontal";
      let sign = 0;
      if (horz) {
        if (e.key === "ArrowRight") sign = 1;
        else if (e.key === "ArrowLeft") sign = -1;
        if (rtlRef.current) sign = -sign;
      } else {
        if (e.key === "ArrowDown") sign = 1;
        else if (e.key === "ArrowUp") sign = -1;
      }
      if (sign !== 0) {
        e.preventDefault();
        const next = clamp(
          sizePxRef.current + sign * step,
          minPxRef.current,
          maxPxRef.current,
        );
        commitSizeRef.current(next);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        commitSizeRef.current(minPxRef.current);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        commitSizeRef.current(maxPxRef.current);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        if (collapsibleRef.current === "none") return;
        e.preventDefault();
        const which: "start" | "end" =
          collapsibleRef.current === "both"
            ? sizePxRef.current < containerPxRef.current / 2
              ? "start"
              : "end"
            : collapsibleRef.current;
        toggleCollapseRef.current(which);
        return;
      }
      if (e.key === "Escape" && dragRef.current) {
        e.preventDefault();
        const start = dragRef.current.startSize;
        commitSizeRef.current(start);
        dragRef.current = null;
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  return { onDividerPointerDown, onDividerKeyDown, isDragging };
}
