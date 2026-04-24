import type { CSSProperties } from "react";
import { useSelectContext, useSelectItemContext } from "./SelectContext";
import { selectPalette } from "./colors";
import type { SelectItemIndicatorProps } from "./Select.types";

export function SelectItemIndicator(props: SelectItemIndicatorProps) {
  const { children, className, style } = props;
  const ctx = useSelectContext();
  const itemCtx = useSelectItemContext();

  if (!itemCtx.isSelected) return null;

  const p = selectPalette[ctx.theme];

  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 14,
    height: 14,
    flexShrink: 0,
    color: p.itemIndicatorFg,
    ...style,
  };

  return (
    <span aria-hidden="true" className={className} style={baseStyle}>
      {children ?? (
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
          <path
            d="M2.5 6.5l2.5 2.5 4.5-5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

SelectItemIndicator.displayName = "Select.ItemIndicator";
