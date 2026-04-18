import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";

export interface UseToastSwipeOptions {
  enabled: boolean;
  threshold: number;
  direction: "horizontal" | "vertical";
  onDismiss: () => void;
  rootRef: RefObject<HTMLDivElement | null>;
}

export interface UseToastSwipeReturn {
  offset: number;
  opacity: number;
  isSwiping: boolean;
  handlePointerDown: (e: ReactPointerEvent) => void;
  handlePointerMove: (e: ReactPointerEvent) => void;
  handlePointerUp: (e: ReactPointerEvent) => void;
}

interface SwipeState {
  startX: number;
  startY: number;
  isSwiping: boolean;
  pointerId: number | null;
}

const INITIAL_SWIPE_STATE: SwipeState = {
  startX: 0,
  startY: 0,
  isSwiping: false,
  pointerId: null,
};

const DETECT_THRESHOLD_PX = 10;
const DETECT_AXIS_RATIO = 1.5;
const MIN_OPACITY = 0.5;

/**
 * 수평/수직 스와이프 dismiss 제스처 hook.
 * threshold 초과 시 onDismiss 호출, 미달 시 원위치로 스냅백.
 */
export function useToastSwipe(options: UseToastSwipeOptions): UseToastSwipeReturn {
  const { enabled, threshold, direction, onDismiss, rootRef } = options;

  const stateRef = useRef<SwipeState>({ ...INITIAL_SWIPE_STATE });
  const [offset, setOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [isSwiping, setIsSwiping] = useState(false);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!enabled) return;
      stateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        isSwiping: false,
        pointerId: e.pointerId,
      };
      rootRef.current?.setPointerCapture(e.pointerId);
    },
    [enabled, rootRef],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const s = stateRef.current;
      if (s.pointerId === null) return;
      if (e.pointerId !== s.pointerId) return;

      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (!s.isSwiping) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (
          direction === "horizontal" &&
          absDx > DETECT_THRESHOLD_PX &&
          absDx > absDy * DETECT_AXIS_RATIO
        ) {
          s.isSwiping = true;
          setIsSwiping(true);
        } else if (
          direction === "vertical" &&
          absDy > DETECT_THRESHOLD_PX &&
          absDy > absDx * DETECT_AXIS_RATIO
        ) {
          s.isSwiping = true;
          setIsSwiping(true);
        }
      }

      if (s.isSwiping) {
        const delta = direction === "horizontal" ? dx : dy;
        setOffset(delta);
        const progress = Math.min(Math.abs(delta) / threshold, 1);
        setOpacity(1 - progress * (1 - MIN_OPACITY));
      }
    },
    [direction, threshold],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent) => {
      const s = stateRef.current;
      if (s.pointerId === null) return;
      if (e.pointerId !== s.pointerId) return;

      if (rootRef.current?.hasPointerCapture(e.pointerId)) {
        rootRef.current.releasePointerCapture(e.pointerId);
      }

      const wasSwiping = s.isSwiping;
      if (wasSwiping) {
        const delta =
          direction === "horizontal" ? e.clientX - s.startX : e.clientY - s.startY;

        if (Math.abs(delta) >= threshold) {
          onDismiss();
        } else {
          setOffset(0);
          setOpacity(1);
        }
      }

      stateRef.current = { ...INITIAL_SWIPE_STATE };
      setIsSwiping(false);
    },
    [direction, threshold, onDismiss, rootRef],
  );

  return {
    offset,
    opacity,
    isSwiping,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
