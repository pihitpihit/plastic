import { useId, type CSSProperties } from "react";
import { useComboboxContext } from "./ComboboxContext";
import { comboboxPalette } from "./colors";
import type { ComboboxGroupProps } from "./Combobox.types";

export function ComboboxGroup(props: ComboboxGroupProps) {
  const { heading, children, className, style, ...rest } = props;
  const ctx = useComboboxContext();
  const p = comboboxPalette[ctx.theme];
  const headingId = useId();

  const groupStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    ...style,
  };

  const headingStyle: CSSProperties = {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: p.groupHeadingFg,
    padding: "6px 8px 4px 8px",
    fontWeight: 500,
  };

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className={className}
      style={groupStyle}
      {...rest}
    >
      <div id={headingId} style={headingStyle}>
        {heading}
      </div>
      {children}
    </div>
  );
}

ComboboxGroup.displayName = "Combobox.Group";
