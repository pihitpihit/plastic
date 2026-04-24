import type { CSSProperties } from "react";
import { useSelectContext } from "./SelectContext";
import { selectPalette } from "./colors";
import type { SelectSeparatorProps } from "./Select.types";

export function SelectSeparator(props: SelectSeparatorProps) {
  const { className, style } = props;
  const ctx = useSelectContext();
  const p = selectPalette[ctx.theme];

  const baseStyle: CSSProperties = {
    display: "block",
    height: 1,
    margin: "4px 0",
    background: p.separatorBg,
    ...style,
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={className}
      style={baseStyle}
    />
  );
}

SelectSeparator.displayName = "Select.Separator";
