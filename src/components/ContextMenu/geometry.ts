export interface XY {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Placement {
  left: number;
  top: number;
  maxHeight?: number;
}

export function clampPointerPlacement(
  pointer: XY,
  size: { w: number; h: number },
  viewport: { w: number; h: number },
  pad = 8,
): Placement {
  let left = pointer.x;
  let top = pointer.y;
  const { w, h } = size;
  const { w: vw, h: vh } = viewport;
  if (left + w + pad > vw) left = Math.max(pad, pointer.x - w);
  if (left < pad) left = pad;
  if (top + h + pad > vh) top = Math.max(pad, pointer.y - h);
  if (top < pad) top = pad;
  const maxHeight = h > vh - 2 * pad ? vh - 2 * pad : undefined;
  if (maxHeight !== undefined) top = pad;
  return maxHeight !== undefined ? { left, top, maxHeight } : { left, top };
}

export function clampSubPlacement(
  anchor: Rect,
  size: { w: number; h: number },
  viewport: { w: number; h: number },
  pad = 8,
): Placement {
  const { w, h } = size;
  const { w: vw, h: vh } = viewport;
  let left = anchor.right + 2;
  let top = anchor.top - 4;
  if (left + w + pad > vw) {
    left = anchor.left - w - 2;
  }
  if (left < pad) left = pad;
  if (top + h + pad > vh) top = Math.max(pad, anchor.bottom - h);
  if (top < pad) top = pad;
  const maxHeight = h > vh - 2 * pad ? vh - 2 * pad : undefined;
  if (maxHeight !== undefined) top = pad;
  return maxHeight !== undefined ? { left, top, maxHeight } : { left, top };
}

function sign(p: XY, a: XY, b: XY): number {
  return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
}

export function isInsideTriangle(p: XY, a: XY, b: XY, c: XY): boolean {
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}
