import type { SplitPaneSize } from "./SplitPane.types";

export const DIVIDER_PX = 6;

export function isSizeString(x: unknown): x is `${number}%` {
  return typeof x === "string" && /^-?\d+(\.\d+)?%$/.test(x);
}

export function parseSize(s: SplitPaneSize): { unit: "px" | "pct"; value: number } {
  if (typeof s === "number") return { unit: "px", value: s };
  const m = /^(-?\d+(\.\d+)?)%$/.exec(s);
  if (!m || m[1] === undefined) {
    throw new Error(`SplitPane: invalid size ${s}`);
  }
  return { unit: "pct", value: parseFloat(m[1]) };
}

export function toPx(s: SplitPaneSize, containerPx: number): number {
  const p = parseSize(s);
  return p.unit === "px" ? p.value : (p.value / 100) * containerPx;
}

export function toPct(px: number, containerPx: number): number {
  if (containerPx <= 0) return 0;
  return (px / containerPx) * 100;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
