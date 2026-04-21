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

export function usePanZoom(opts: UsePanZoomOptions): void {
  const { rootRef, viewport, setViewport, interactive } = opts;

  const vpRef = useRef<PipelineGraphViewport | null>(viewport);
  vpRef.current = viewport;

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
      setViewport({ x: nx, y: ny, zoom: nextZoom });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [rootRef, interactive, setViewport]);
}
