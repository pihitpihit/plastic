import type { HTMLAttributes } from "react";
import { useDataTableContext } from "./DataTableContext";

export interface DataTableLoadingProps extends HTMLAttributes<HTMLDivElement> {
  overlay?: boolean | undefined;
  rowCount?: number | undefined;
  className?: string | undefined;
}

const pulseKeyframes = `
@keyframes plastic-dt-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
`;

export function DataTableLoading({
  overlay = false,
  rowCount,
  className,
  style,
  ...rest
}: DataTableLoadingProps) {
  const ctx = useDataTableContext();
  const theme = ctx.theme;
  const rows = rowCount ?? ctx.loadingRows;
  const skeletonBg = theme === "dark" ? "#374151" : "#e5e7eb";
  const overlayBg =
    theme === "dark" ? "rgba(17,24,39,0.6)" : "rgba(255,255,255,0.6)";

  if (overlay) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading"
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          background: overlayBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1,
          pointerEvents: "all",
          ...style,
        }}
        {...rest}
      >
        <style>{pulseKeyframes}</style>
        <div
          style={{
            width: "32px",
            height: "32px",
            border: `3px solid ${skeletonBg}`,
            borderTopColor: theme === "dark" ? "#60a5fa" : "#3b82f6",
            borderRadius: "50%",
            animation: "plastic-dt-spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes plastic-dt-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "1rem",
        ...style,
      }}
      {...rest}
    >
      <style>{pulseKeyframes}</style>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "1.5rem",
            background: skeletonBg,
            borderRadius: "0.25rem",
            animation: "plastic-dt-pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}
