import { useEffect, useRef } from "react";

import type { PipelineGraphViewport } from "./PipelineGraph.types";
import { clamp } from "./PipelineGraph.utils";

export interface UsePanZoomOptions {
  rootRef: React.RefObject<HTMLElement | null>;
  viewport: PipelineGraphViewport | null;
  setViewport: (v: PipelineGraphViewport) => void;
  interactive: boolean;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

function isBackground(target: EventTarget | null): boolean {
  if (!target) return true;
  if (!(target instanceof Element)) return true;
  return !target.closest(
    "[data-node-id], [data-pg-interactive], [data-edge], button, input, textarea, select, a",
  );
}

export function usePanZoom(opts: UsePanZoomOptions): void {
  const { rootRef, viewport, setViewport, interactive } = opts;

  const vpRef = useRef<PipelineGraphViewport | null>(viewport);
  vpRef.current = viewport;
  const setViewportRef = useRef(setViewport);
  setViewportRef.current = setViewport;
  const spaceDownRef = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !interactive) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = vpRef.current;
      if (!vp) return;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const scale = Math.exp(-e.deltaY * 0.001);
      const nextZoom = clamp(vp.zoom * scale, MIN_ZOOM, MAX_ZOOM);
      if (nextZoom === vp.zoom) return;
      const ratio = nextZoom / vp.zoom;
      const nx = cx - (cx - vp.x) * ratio;
      const ny = cy - (cy - vp.y) * ratio;
      setViewportRef.current({ x: nx, y: ny, zoom: nextZoom });
    };

    let drag: { startX: number; startY: number; vp0: PipelineGraphViewport } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      const vp = vpRef.current;
      if (!vp) return;
      const fromBackground = isBackground(e.target);
      if (!fromBackground && !spaceDownRef.current) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      drag = { startX: e.clientX, startY: e.clientY, vp0: vp };
      el.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      setViewportRef.current({ ...drag.vp0, x: drag.vp0.x + dx, y: drag.vp0.y + dy });
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!drag) return;
      drag = null;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      el.style.cursor = spaceDownRef.current ? "grab" : "";
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  }, [rootRef, interactive]);

  useEffect(() => {
    if (!interactive) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const tgt = document.activeElement;
      if (
        tgt instanceof HTMLInputElement ||
        tgt instanceof HTMLTextAreaElement ||
        (tgt as HTMLElement | null)?.isContentEditable
      )
        return;
      if (!tgt?.closest?.('[data-pg-root="1"]')) return;
      spaceDownRef.current = true;
      const el = rootRef.current;
      if (el) el.style.cursor = "grab";
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceDownRef.current = false;
      const el = rootRef.current;
      if (el) el.style.cursor = "";
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [rootRef, interactive]);
}
