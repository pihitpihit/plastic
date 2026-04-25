import type { ReactNode, CSSProperties } from "react";
import { useProgressContext } from "./ProgressContext";

export interface ProgressTrackLinearProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}

export function ProgressTrackLinear({
  className,
  style,
  children,
}: ProgressTrackLinearProps) {
  const { segments, variant } = useProgressContext();

  if (segments !== null) {
    const cls = ["plastic-progress__track plastic-progress__track--segmented", className ?? ""]
      .filter(Boolean)
      .join(" ");
    const cells: ReactNode[] = [];
    for (let i = 0; i < segments.count; i += 1) {
      cells.push(
        <div
          key={i}
          className="plastic-progress__seg"
          data-filled={i < segments.filled ? "true" : "false"}
          data-variant={variant}
        />,
      );
    }
    return (
      <div className={cls} {...(style ? { style } : {})}>
        {cells}
      </div>
    );
  }

  const cls = ["plastic-progress__track", className ?? ""].filter(Boolean).join(" ");
  return (
    <div className={cls} {...(style ? { style } : {})}>
      {children}
    </div>
  );
}
