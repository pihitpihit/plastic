import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

export type Side = "top" | "right" | "bottom" | "left";
export type Alignment = "start" | "end";
export type Placement = Side | `${Side}-${Alignment}`;

export interface FloatingPosition {
  x: number;
  y: number;
}

export interface ArrowPosition {
  x: number | undefined;
  y: number | undefined;
}

export interface UseFloatingOptions {
  placement?: Placement | undefined;
  offset?: number | undefined;
  arrowPadding?: number | undefined;
  enabled?: boolean | undefined;
  flip?: boolean | undefined;
}

export interface UseFloatingReturn {
  placement: Placement;
  floatingStyles: CSSProperties;
  arrowPosition: ArrowPosition;
  arrowSide: Side;
  triggerRef: RefObject<HTMLElement | null>;
  floatingRef: RefObject<HTMLDivElement | null>;
  arrowRef: RefObject<HTMLDivElement | null>;
  update: () => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function parsePlacement(placement: Placement): {
  side: Side;
  alignment: Alignment | undefined;
} {
  const [side, alignment] = placement.split("-") as [Side, Alignment | undefined];
  return { side, alignment };
}

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

function computeBasePosition(
  triggerRect: Rect,
  floatingWidth: number,
  floatingHeight: number,
  placement: Placement,
  offset: number,
): FloatingPosition {
  const { side, alignment } = parsePlacement(placement);

  let x = 0;
  let y = 0;

  switch (side) {
    case "top":
      x = triggerRect.x + triggerRect.width / 2 - floatingWidth / 2;
      y = triggerRect.y - floatingHeight - offset;
      break;
    case "bottom":
      x = triggerRect.x + triggerRect.width / 2 - floatingWidth / 2;
      y = triggerRect.y + triggerRect.height + offset;
      break;
    case "left":
      x = triggerRect.x - floatingWidth - offset;
      y = triggerRect.y + triggerRect.height / 2 - floatingHeight / 2;
      break;
    case "right":
      x = triggerRect.x + triggerRect.width + offset;
      y = triggerRect.y + triggerRect.height / 2 - floatingHeight / 2;
      break;
  }

  if (alignment) {
    const isVerticalSide = side === "top" || side === "bottom";
    if (isVerticalSide) {
      if (alignment === "start") {
        x = triggerRect.x;
      } else {
        x = triggerRect.x + triggerRect.width - floatingWidth;
      }
    } else {
      if (alignment === "start") {
        y = triggerRect.y;
      } else {
        y = triggerRect.y + triggerRect.height - floatingHeight;
      }
    }
  }

  return { x, y };
}

function flipPlacement(
  triggerRect: Rect,
  floatingWidth: number,
  floatingHeight: number,
  placement: Placement,
  offset: number,
): Placement {
  const { side, alignment } = parsePlacement(placement);
  const pos = computeBasePosition(
    triggerRect,
    floatingWidth,
    floatingHeight,
    placement,
    offset,
  );

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let overflows = false;
  switch (side) {
    case "top":
      overflows = pos.y < 0;
      break;
    case "bottom":
      overflows = pos.y + floatingHeight > viewportHeight;
      break;
    case "left":
      overflows = pos.x < 0;
      break;
    case "right":
      overflows = pos.x + floatingWidth > viewportWidth;
      break;
  }

  if (!overflows) return placement;

  const oppositeSide = OPPOSITE_SIDE[side];
  const oppositePlacement: Placement = alignment
    ? `${oppositeSide}-${alignment}`
    : oppositeSide;
  const oppositePos = computeBasePosition(
    triggerRect,
    floatingWidth,
    floatingHeight,
    oppositePlacement,
    offset,
  );

  let oppositeOverflows = false;
  switch (oppositeSide) {
    case "top":
      oppositeOverflows = oppositePos.y < 0;
      break;
    case "bottom":
      oppositeOverflows = oppositePos.y + floatingHeight > viewportHeight;
      break;
    case "left":
      oppositeOverflows = oppositePos.x < 0;
      break;
    case "right":
      oppositeOverflows = oppositePos.x + floatingWidth > viewportWidth;
      break;
  }

  return oppositeOverflows ? placement : oppositePlacement;
}

export function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const {
    placement: desiredPlacement = "top",
    offset = 8,
    enabled = true,
    flip = true,
  } = options;

  const triggerRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);

  const [position, setPosition] = useState<{
    placement: Placement;
    x: number;
    y: number;
  }>({ placement: desiredPlacement, x: 0, y: 0 });

  const update = useCallback(() => {
    const triggerEl = triggerRef.current;
    const floatingEl = floatingRef.current;
    if (!triggerEl || !floatingEl) return;

    const triggerRect = getRect(triggerEl);
    const floatingWidth = floatingEl.offsetWidth;
    const floatingHeight = floatingEl.offsetHeight;

    const resolvedPlacement = flip
      ? flipPlacement(
          triggerRect,
          floatingWidth,
          floatingHeight,
          desiredPlacement,
          offset,
        )
      : desiredPlacement;

    const basePos = computeBasePosition(
      triggerRect,
      floatingWidth,
      floatingHeight,
      resolvedPlacement,
      offset,
    );

    setPosition({
      placement: resolvedPlacement,
      x: basePos.x,
      y: basePos.y,
    });
  }, [desiredPlacement, offset, flip]);

  useEffect(() => {
    if (!enabled) return;
    update();
  }, [enabled, update]);

  const floatingStyles: CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    transform: `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`,
    willChange: "transform",
  };

  const { side } = parsePlacement(position.placement);
  const arrowSide: Side = (
    { top: "bottom", bottom: "top", left: "right", right: "left" } as const
  )[side];

  return {
    placement: position.placement,
    floatingStyles,
    arrowPosition: { x: undefined, y: undefined },
    arrowSide,
    triggerRef,
    floatingRef,
    arrowRef,
    update,
  };
}
