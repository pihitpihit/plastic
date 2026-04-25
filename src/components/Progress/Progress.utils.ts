import type { ProgressSize } from "./Progress.types";

export function sanitizeMax(max: number | undefined): number {
  if (max == null) return 100;
  if (!Number.isFinite(max) || max <= 0) {
    console.warn("[Progress] max must be a positive finite number. Fallback to 100.");
    return 100;
  }
  return max;
}

export function clampValue(value: number | undefined, max: number): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    console.warn("[Progress] value must be a finite number.");
    return 0;
  }
  if (value < 0) {
    console.warn(`[Progress] value ${value} < 0. Clamped to 0.`);
    return 0;
  }
  if (value > max) {
    console.warn(`[Progress] value ${value} > max ${max}. Clamped to max.`);
    return max;
  }
  return value;
}

export function clampBuffer(buffer: number | undefined, max: number): number | null {
  if (buffer == null) return null;
  if (!Number.isFinite(buffer)) return 0;
  if (buffer < 0) return 0;
  if (buffer > max) return max;
  return buffer;
}

export function toPercent(value: number | null, max: number): number | null {
  return value == null ? null : (value / max) * 100;
}

export function resolveMode(
  value: number | undefined,
  indeterminate: boolean | undefined,
): "determinate" | "indeterminate" {
  if (indeterminate === true) return "indeterminate";
  if (indeterminate === false) return "determinate";
  return value == null ? "indeterminate" : "determinate";
}

export function resolveSegments(
  segments: number | undefined,
  value: number | null,
): { count: number; filled: number } | null {
  if (segments == null) return null;
  if (!Number.isFinite(segments)) return null;
  let n = Math.floor(segments);
  if (n < 2) {
    console.warn(`[Progress] segments ${segments} < 2. Clamped to 2.`);
    n = 2;
  }
  const v = value == null ? 0 : Math.max(0, Math.min(n, Math.floor(value)));
  return { count: n, filled: v };
}

export function circularGeometry(
  diameter: number,
  strokeWidth: number,
  percent: number,
): { r: number; c: number; offset: number } {
  const r = (diameter - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clampedPct = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clampedPct / 100);
  return { r, c, offset };
}

export function sizeToLinearHeight(size: ProgressSize): number {
  return size === "sm" ? 4 : size === "lg" ? 12 : 8;
}

export function sizeToCircularDiameter(size: ProgressSize): number {
  return size === "sm" ? 24 : size === "lg" ? 64 : 40;
}

export function sizeToStrokeWidth(size: ProgressSize): number {
  return size === "sm" ? 3 : size === "lg" ? 6 : 4;
}

export function sizeToLabelFont(size: ProgressSize): number {
  return size === "sm" ? 11 : size === "lg" ? 14 : 12;
}
