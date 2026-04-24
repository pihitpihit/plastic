import type { ReactNode, CSSProperties } from "react";
import { useProgressContext } from "./ProgressContext";
import { sizeToCircularDiameter } from "./Progress.utils";

export interface ProgressTrackCircularProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export function ProgressTrackCircular({
  className,
  style,
  children,
}: ProgressTrackCircularProps) {
  const { size, strokeWidth, trackOpacity } = useProgressContext();
  const d = sizeToCircularDiameter(size);
  const cx = d / 2;
  const cy = d / 2;
  const r = (d - strokeWidth) / 2;

  const cls = ["plastic-progress__svg", className ?? ""].filter(Boolean).join(" ");

  return (
    <svg
      className={cls}
      width={d}
      height={d}
      viewBox={`0 0 ${d} ${d}`}
      {...(style ? { style } : {})}
      aria-hidden="true"
    >
      <circle
        className="plastic-progress__circle plastic-progress__circle--track"
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        strokeWidth={strokeWidth}
        opacity={trackOpacity}
      />
      {children}
    </svg>
  );
}
