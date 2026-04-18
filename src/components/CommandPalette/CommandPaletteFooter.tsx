import type { CSSProperties } from "react";
import { dividerColor, footerBg, footerText, kbdStyle } from "./colors";
import type { CommandPaletteFooterProps } from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";

export function CommandPaletteFooter({
  children,
  className,
  style,
  showKeyboardHints = true,
  ...rest
}: CommandPaletteFooterProps) {
  const ctx = useCommandPalette();
  const theme = ctx.theme;

  const wrapperStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    borderTop: `1px solid ${dividerColor[theme]}`,
    backgroundColor: footerBg[theme],
    fontSize: 12,
    color: footerText[theme],
    userSelect: "none",
    gap: 12,
    ...style,
  };

  const hintStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
  };

  return (
    <div className={className} style={wrapperStyle} {...rest}>
      {showKeyboardHints ? (
        <div style={{ display: "flex", gap: 12 }}>
          <span style={hintStyle}>
            <kbd style={kbdStyle[theme]}>↑</kbd>
            <kbd style={kbdStyle[theme]}>↓</kbd>
            navigate
          </span>
          <span style={hintStyle}>
            <kbd style={kbdStyle[theme]}>↵</kbd>
            select
          </span>
          <span style={hintStyle}>
            <kbd style={kbdStyle[theme]}>esc</kbd>
            close
          </span>
        </div>
      ) : (
        <span />
      )}
      {children}
    </div>
  );
}
