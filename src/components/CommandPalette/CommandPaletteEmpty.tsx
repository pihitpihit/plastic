import type { CSSProperties } from "react";
import { emptyText, iconColor } from "./colors";
import type { CommandPaletteEmptyProps } from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";

export function CommandPaletteEmpty({
  children,
  className,
  style,
  ...rest
}: CommandPaletteEmptyProps) {
  const ctx = useCommandPalette();

  if (ctx.isLoading) return null;
  if (ctx.results.length > 0) return null;
  if (ctx.query.trim() === "") return null;

  const wrapperStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    gap: 8,
    color: emptyText[ctx.theme],
    fontSize: 14,
    textAlign: "center",
    ...style,
  };

  return (
    <div role="status" className={className} style={wrapperStyle} {...rest}>
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor[ctx.theme]}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ opacity: 0.7 }}
      >
        <circle cx={11} cy={11} r={8} />
        <line x1={21} y1={21} x2={16.65} y2={16.65} />
        <line x1={8} y1={11} x2={14} y2={11} />
      </svg>
      <span>{children ?? "No results found."}</span>
    </div>
  );
}
