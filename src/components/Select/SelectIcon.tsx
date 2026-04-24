import type { CSSProperties } from "react";
import { useSelectContext } from "./SelectContext";
import type { SelectIconProps } from "./Select.types";

export function SelectIcon(props: SelectIconProps) {
  const { children, className, style } = props;
  const ctx = useSelectContext();

  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 14,
    height: 14,
    flexShrink: 0,
    color: "currentColor",
    transition: "transform 150ms ease-out",
    transform: ctx.open ? "rotate(180deg)" : "rotate(0deg)",
    ...style,
  };

  return (
    <span aria-hidden="true" className={className} style={baseStyle}>
      {children ?? (
        <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )}
    </span>
  );
}

SelectIcon.displayName = "Select.Icon";
