import { useEffect, type CSSProperties } from "react";
import type { SkeletonTableProps } from "./Skeleton.types";
import { computeTableColWidths, toCssLength } from "./Skeleton.utils";
import { SkeletonRoot } from "./SkeletonRoot";
import { skeletonPalette } from "./theme";

export function SkeletonTable(props: SkeletonTableProps) {
  const {
    rows = 5,
    cols = 4,
    hasHeader = true,
    rowHeight = 44,
    colWidths,
    animation,
    theme = "light",
    visible,
    fadeMs,
    children,
    className,
    style,
    "aria-label": ariaLabel,
  } = props;

  useEffect(() => {
    if (rows > 200 && typeof console !== "undefined") {
      console.warn(
        "[Skeleton.Table] rows > 200 may cause perf issues; consider virtualization",
      );
    }
  }, [rows]);

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

  const widths = computeTableColWidths(cols, colWidths);
  const palette = skeletonPalette[theme];

  const containerStyle: CSSProperties = {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    ...style,
  };

  const rowStyle: CSSProperties = {
    display: "flex",
    gap: 12,
    height: toCssLength(rowHeight),
    alignItems: "center",
    padding: "0 12px",
    borderTop: `1px solid ${palette.rowSep}`,
  };

  const headerStyle: CSSProperties = {
    ...rowStyle,
    borderTop: "none",
    borderBottom: `1px solid ${palette.rowSep}`,
  };

  const forwardCommon = {
    ...(animation !== undefined ? { animation } : {}),
    theme,
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel ?? "Loading"}
      className={className}
      style={containerStyle}
    >
      {hasHeader && (
        <div style={headerStyle}>
          {widths.map((w, c) => (
            <div key={`h-${c}`} style={{ width: w }}>
              <SkeletonRoot
                shape="rect"
                width="70%"
                height={12}
                {...forwardCommon}
                _suppressAria
              />
            </div>
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} style={rowStyle}>
          {widths.map((w, c) => (
            <div key={`c-${r}-${c}`} style={{ width: w }}>
              <SkeletonRoot
                shape="rect"
                width="85%"
                height={14}
                {...forwardCommon}
                _suppressAria
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

SkeletonTable.displayName = "Skeleton.Table";
