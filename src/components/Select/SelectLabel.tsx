import type { CSSProperties } from "react";
import { useSelectContext } from "./SelectContext";
import { selectPalette } from "./colors";
import type { SelectLabelProps } from "./Select.types";

export function SelectLabel(props: SelectLabelProps) {
  const { children, className, style, ...rest } = props;
  const ctx = useSelectContext();
  const p = selectPalette[ctx.theme];

  const baseStyle: CSSProperties = {
    display: "block",
    padding: "6px 8px 2px",
    fontSize: 11,
    fontWeight: 600,
    color: p.labelFg,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    userSelect: "none",
    ...style,
  };

  return (
    <div role="presentation" className={className} style={baseStyle} {...rest}>
      {children}
    </div>
  );
}

SelectLabel.displayName = "Select.Label";
