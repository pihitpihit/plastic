import type { CSSProperties } from "react";
import { chipBg, chipText, dividerColor, iconColor, inputText } from "./colors";
import type { CommandPaletteInputProps } from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";

function SearchIcon({ color }: { color: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <circle cx={11} cy={11} r={8} />
      <line x1={21} y1={21} x2={16.65} y2={16.65} />
    </svg>
  );
}

export function CommandPaletteInput({
  placeholder = "Type a command or search…",
  className,
  style,
  ...rest
}: CommandPaletteInputProps) {
  const ctx = useCommandPalette();
  const theme = ctx.theme;

  const wrapperStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: `1px solid ${dividerColor[theme]}`,
    gap: 8,
    ...style,
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: inputText[theme],
    fontSize: 14,
    lineHeight: "20px",
    padding: 0,
    minWidth: 0,
  };

  const chipStyle: CSSProperties = {
    fontSize: 12,
    padding: "2px 6px",
    borderRadius: 4,
    backgroundColor: chipBg[theme],
    color: chipText[theme],
    flexShrink: 0,
    whiteSpace: "nowrap",
  };

  return (
    <div className={className} style={wrapperStyle}>
      <SearchIcon color={iconColor[theme]} />
      {ctx.breadcrumbs.map((item) => (
        <span key={item.id} style={chipStyle}>
          {item.label}
        </span>
      ))}
      <input
        ref={(node) => {
          (ctx.inputRef as { current: HTMLInputElement | null }).current = node;
        }}
        type="text"
        role="combobox"
        aria-expanded
        aria-controls={ctx.listId}
        aria-autocomplete="list"
        aria-activedescendant={
          ctx.activeIndex >= 0 && ctx.results[ctx.activeIndex]
            ? ctx.getItemId(ctx.results[ctx.activeIndex]!.id)
            : undefined
        }
        value={ctx.query}
        onChange={(e) => ctx.setQuery(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        {...rest}
      />
    </div>
  );
}
