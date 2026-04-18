import type { CSSProperties } from "react";
import { groupHeaderText } from "./colors";
import type { CommandPaletteGroupProps } from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";

export function CommandPaletteGroup({
  heading,
  children,
  className,
  style,
  ...rest
}: CommandPaletteGroupProps) {
  const ctx = useCommandPalette();

  const wrapperStyle: CSSProperties = {
    padding: "4px 0",
    ...style,
  };

  const headerStyle: CSSProperties = {
    padding: "8px 16px 4px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: groupHeaderText[ctx.theme],
  };

  return (
    <div
      role="group"
      aria-label={heading}
      className={className}
      style={wrapperStyle}
      {...rest}
    >
      <div style={headerStyle}>{heading}</div>
      <div>{children}</div>
    </div>
  );
}
