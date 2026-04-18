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

const VIEWPORT_PADDING = 8;

function computeArrowPosition(
  triggerRect: Rect,
  floatingPos: FloatingPosition,
  floatingWidth: number,
  floatingHeight: number,
  side: Side,
  arrowSize: number,
  arrowPadding: number,
): ArrowPosition {
  const isVerticalSide = side === "top" || side === "bottom";

  if (isVerticalSide) {
    const triggerCenterX = triggerRect.x + triggerRect.width / 2;
    const arrowX = triggerCenterX - floatingPos.x - arrowSize / 2;
    const min = arrowPadding;
    const max = floatingWidth - arrowPadding - arrowSize;
    const clampedX = Math.max(min, Math.min(max, arrowX));
    return { x: clampedX, y: undefined };
  } else {
    const triggerCenterY = triggerRect.y + triggerRect.height / 2;
    const arrowY = triggerCenterY - floatingPos.y - arrowSize / 2;
    const min = arrowPadding;
    const max = floatingHeight - arrowPadding - arrowSize;
    const clampedY = Math.max(min, Math.min(max, arrowY));
    return { x: undefined, y: clampedY };
  }
}

function getScrollParents(element: HTMLElement): (HTMLElement | Window)[] {
  const parents: (HTMLElement | Window)[] = [];
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = getComputedStyle(current);
    const overflow = style.overflow + style.overflowX + style.overflowY;
    if (/auto|scroll|overlay/.test(overflow)) {
      parents.push(current);
    }
    current = current.parentElement;
  }

  parents.push(window);
  return parents;
}

function shiftPosition(
  pos: FloatingPosition,
  floatingWidth: number,
  floatingHeight: number,
  side: Side,
): FloatingPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let { x, y } = pos;
  const isVerticalSide = side === "top" || side === "bottom";

  if (isVerticalSide) {
    const minX = VIEWPORT_PADDING;
    const maxX = viewportWidth - floatingWidth - VIEWPORT_PADDING;
    x = Math.max(minX, Math.min(maxX, x));
  } else {
    const minY = VIEWPORT_PADDING;
    const maxY = viewportHeight - floatingHeight - VIEWPORT_PADDING;
    y = Math.max(minY, Math.min(maxY, y));
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
    arrowPadding = 8,
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
    arrowPosition: ArrowPosition;
  }>({
    placement: desiredPlacement,
    x: 0,
    y: 0,
    arrowPosition: { x: undefined, y: undefined },
  });

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

    const { side } = parsePlacement(resolvedPlacement);
    const shifted = shiftPosition(basePos, floatingWidth, floatingHeight, side);

    const arrowEl = arrowRef.current;
    const arrowSize = arrowEl ? arrowEl.offsetWidth : 0;
    const arrowPosition = arrowEl
      ? computeArrowPosition(
          triggerRect,
          shifted,
          floatingWidth,
          floatingHeight,
          side,
          arrowSize,
          arrowPadding,
        )
      : { x: undefined, y: undefined };

    setPosition({
      placement: resolvedPlacement,
      x: shifted.x,
      y: shifted.y,
      arrowPosition,
    });
  }, [desiredPlacement, offset, arrowPadding, flip]);

  useEffect(() => {
    if (!enabled) return;
    const triggerEl = triggerRef.current;
    const floatingEl = floatingRef.current;
    if (!triggerEl || !floatingEl) return;

    update();

    const resizeObserver = new ResizeObserver(() => update());
    resizeObserver.observe(triggerEl);
    resizeObserver.observe(floatingEl);

    const scrollParents = getScrollParents(triggerEl);
    const onScroll = () => update();
    for (const parent of scrollParents) {
      parent.addEventListener("scroll", onScroll, { passive: true });
    }
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      for (const parent of scrollParents) {
        parent.removeEventListener("scroll", onScroll);
      }
      window.removeEventListener("resize", onScroll);
    };
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
    arrowPosition: position.arrowPosition,
    arrowSide,
    triggerRef,
    floatingRef,
    arrowRef,
    update,
  };
}
