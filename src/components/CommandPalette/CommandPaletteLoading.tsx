import type { CSSProperties } from "react";
import { iconColor, loadingText } from "./colors";
import type { CommandPaletteLoadingProps } from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";

const SPIN_KEYFRAMES_ID = "plastic-commandpalette-spin";

function ensureSpinKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SPIN_KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = SPIN_KEYFRAMES_ID;
  style.textContent =
    "@keyframes plastic-cp-spin { to { transform: rotate(360deg) } }";
  document.head.appendChild(style);
}

export function CommandPaletteLoading({
  children,
  className,
  style,
  ...rest
}: CommandPaletteLoadingProps) {
  const ctx = useCommandPalette();

  if (!ctx.isLoading) return null;

  ensureSpinKeyframes();

  const wrapperStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: "32px 16px",
    color: loadingText[ctx.theme],
    fontSize: 14,
    ...style,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={className}
      style={wrapperStyle}
      {...rest}
    >
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        stroke={iconColor[ctx.theme]}
        strokeWidth={2}
        strokeLinecap="round"
        style={{ animation: "plastic-cp-spin 1s linear infinite" }}
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>{children ?? "Searching…"}</span>
    </div>
  );
}
