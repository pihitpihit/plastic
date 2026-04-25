import { useMemo, type CSSProperties } from "react";
import type { SkeletonTextProps } from "./Skeleton.types";
import { computeTextLineWidths } from "./Skeleton.utils";
import { SkeletonRoot } from "./SkeletonRoot";

interface InternalTextProps extends SkeletonTextProps {
  _suppressAria?: boolean | undefined;
}

export function SkeletonText(props: InternalTextProps) {
  const {
    lines = 3,
    lastLineWidth = "60%",
    gap = 8,
    randomize = true,
    lineHeight = "1em",
    widthRange = [0.75, 0.95],
    seed = 1,
    animation,
    theme,
    visible,
    fadeMs,
    children,
    className,
    style,
    _suppressAria,
    "aria-label": ariaLabel,
  } = props;

  const widths = useMemo(
    () =>
      computeTextLineWidths(lines, widthRange, lastLineWidth, randomize, seed),
    [lines, widthRange, lastLineWidth, randomize, seed],
  );

  const isVisible = visible ?? true;
  const ms = fadeMs ?? 180;

  if (!isVisible) {
    if (children === undefined || children === null) return null;
    if (ms === 0) return <>{children}</>;
    return (
      <div
        className="sk-content-fadein"
        style={{ animationDuration: `${ms}ms` }}
      >
        {children}
      </div>
    );
  }

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: `${gap}px`,
    ...style,
  };

  const ariaProps: Record<string, string | undefined> = _suppressAria
    ? {}
    : {
        role: "status",
        "aria-busy": "true",
        "aria-label": ariaLabel ?? "Loading",
      };

  return (
    <div {...ariaProps} className={className} style={containerStyle}>
      {widths.map((w, i) => (
        <SkeletonRoot
          key={i}
          shape="text"
          width={w}
          height={lineHeight}
          {...(animation !== undefined ? { animation } : {})}
          {...(theme !== undefined ? { theme } : {})}
          _suppressAria
        />
      ))}
    </div>
  );
}

SkeletonText.displayName = "Skeleton.Text";
