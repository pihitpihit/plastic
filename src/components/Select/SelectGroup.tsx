import { useId, type CSSProperties, type ReactNode } from "react";
import { useSelectContext } from "./SelectContext";
import { selectPalette } from "./colors";
import type { SelectGroupProps } from "./Select.types";

export function SelectGroup(props: SelectGroupProps) {
  const { label, className, style, children } = props;
  const ctx = useSelectContext();
  const p = selectPalette[ctx.theme];

  const labelId = useId();

  const baseStyle: CSSProperties = {
    display: "block",
    ...style,
  };

  const labelStyle: CSSProperties = {
    display: "block",
    padding: "6px 8px 2px",
    fontSize: 11,
    fontWeight: 600,
    color: p.labelFg,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    userSelect: "none",
  };

  const hasLabel = label !== undefined && label !== null && label !== "";

  return (
    <div
      role="group"
      aria-labelledby={hasLabel ? labelId : undefined}
      className={className}
      style={baseStyle}
    >
      {hasLabel ? (
        <div id={labelId} role="presentation" style={labelStyle}>
          {label as ReactNode}
        </div>
      ) : null}
      {children}
    </div>
  );
}

SelectGroup.displayName = "Select.Group";
