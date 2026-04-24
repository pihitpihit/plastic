import type {
  SkeletonAnimation,
  SkeletonRootProps,
  SkeletonSize,
  SkeletonTheme,
} from "./Skeleton.types";

export function toCssLength(v: SkeletonSize): string {
  return typeof v === "number" ? `${v}px` : v;
}

export function resolveDimensions(props: SkeletonRootProps): {
  width: string;
  height: string;
  borderRadius: string;
} {
  const shape = props.shape ?? "rect";
  if (shape === "circle") {
    const s = props.size ?? 40;
    const px = toCssLength(s);
    return {
      width: px,
      height: px,
      borderRadius: toCssLength(props.borderRadius ?? "50%"),
    };
  }
  if (shape === "text") {
    return {
      width: toCssLength(props.width ?? "100%"),
      height: toCssLength(props.height ?? "1em"),
      borderRadius: toCssLength(props.borderRadius ?? 4),
    };
  }
  return {
    width: toCssLength(props.width ?? "100%"),
    height: toCssLength(props.height ?? 16),
    borderRadius: toCssLength(props.borderRadius ?? 4),
  };
}

export function seededRandom(seed: number, index: number): number {
  let t = (seed + index * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function computeTextLineWidths(
  lines: number,
  range: [number, number],
  lastLineWidth: SkeletonSize | null | undefined,
  randomize: boolean,
  seed: number,
): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines; i++) {
    const isLast = i === lines - 1;
    if (isLast && lastLineWidth !== null && lastLineWidth !== undefined) {
      out.push(toCssLength(lastLineWidth));
      continue;
    }
    if (!randomize) {
      out.push("100%");
      continue;
    }
    const [lo, hi] = range;
    const pct = lo + (hi - lo) * seededRandom(seed, i);
    out.push(`${(pct * 100).toFixed(1)}%`);
  }
  return out;
}

export function computeTableColWidths(
  cols: number,
  overrides: SkeletonSize[] | undefined,
): string[] {
  if (overrides && overrides.length === cols) return overrides.map(toCssLength);
  const pct = 100 / cols;
  return Array.from({ length: cols }, () => `${pct.toFixed(4)}%`);
}

export interface SkeletonCommonProps {
  animation?: SkeletonAnimation | undefined;
  theme?: SkeletonTheme | undefined;
  visible?: boolean | undefined;
  fadeMs?: number | undefined;
  "aria-label"?: string | undefined;
}

export function extractCommonProps<T extends SkeletonCommonProps>(
  p: T,
): SkeletonCommonProps {
  const out: SkeletonCommonProps = {};
  if (p.animation !== undefined) out.animation = p.animation;
  if (p.theme !== undefined) out.theme = p.theme;
  if (p.visible !== undefined) out.visible = p.visible;
  if (p.fadeMs !== undefined) out.fadeMs = p.fadeMs;
  if (p["aria-label"] !== undefined) out["aria-label"] = p["aria-label"];
  return out;
}
