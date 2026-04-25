import type { CSSProperties } from "react";
import { useProgressContext } from "./ProgressContext";
import { circularGeometry, sizeToCircularDiameter, toPercent } from "./Progress.utils";
import type { ProgressIndicatorProps } from "./Progress.types";

export function ProgressIndicator(props: ProgressIndicatorProps) {
  const { kind = "primary", value: bufferValue, className, style } = props;
  const ctx = useProgressContext();
  const {
    shape,
    mode,
    percent,
    bufferPercent,
    max,
    segments,
    size,
    strokeWidth,
    strokeLinecap,
  } = ctx;

  if (segments !== null) {
    return null;
  }

  if (shape === "circular") {
    if (kind === "buffer") {
      console.warn("[Progress] kind=\"buffer\" is not supported in circular shape (v1). Ignored.");
      return null;
    }
    const d = sizeToCircularDiameter(size);
    const cx = d / 2;
    const cy = d / 2;
    const { r, c, offset } = circularGeometry(d, strokeWidth, percent ?? 0);
    const baseStyle: CSSProperties =
      mode === "determinate"
        ? { strokeDasharray: c, strokeDashoffset: offset }
        : {};
    const cls = [
      "plastic-progress__circle",
      "plastic-progress__circle--indicator",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <circle
        className={cls}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap={strokeLinecap}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ ...baseStyle, ...(style ?? {}) }}
      />
    );
  }

  if (kind === "buffer") {
    const bv = bufferValue == null ? bufferPercent : toPercent(bufferValue, max);
    if (bv == null) return null;
    const ratio = Math.max(0, Math.min(1, bv / 100));
    const baseStyle: CSSProperties = { transform: `scaleX(${ratio})` };
    const cls = [
      "plastic-progress__fill",
      "plastic-progress__fill--buffer",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");
    return <div className={cls} style={{ ...baseStyle, ...(style ?? {}) }} />;
  }

  const ratio = mode === "determinate" ? Math.max(0, Math.min(1, (percent ?? 0) / 100)) : 0;
  const baseStyle: CSSProperties =
    mode === "determinate" ? { transform: `scaleX(${ratio})` } : {};
  const cls = [
    "plastic-progress__fill",
    "plastic-progress__fill--primary",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls} style={{ ...baseStyle, ...(style ?? {}) }} />;
}

ProgressIndicator.displayName = "Progress.Indicator";
