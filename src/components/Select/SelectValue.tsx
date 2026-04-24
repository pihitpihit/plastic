import type { CSSProperties, ReactNode } from "react";
import { useSelectContext } from "./SelectContext";
import { selectPalette } from "./colors";
import type { SelectValue as SelectValueType, SelectValueProps } from "./Select.types";

function isRenderFn(
  children: unknown,
): children is (value: SelectValueType | undefined) => ReactNode {
  return typeof children === "function";
}

export function SelectValue(props: SelectValueProps) {
  const { placeholder: ownPlaceholder, children, className, style } = props;
  const ctx = useSelectContext();
  const p = selectPalette[ctx.theme];

  const effectivePlaceholder = ownPlaceholder ?? ctx.placeholder ?? "";
  const hasValue = ctx.value !== undefined;

  let display: ReactNode;
  if (isRenderFn(children)) {
    display = children(ctx.value);
  } else if (children !== undefined && children !== null) {
    display = children as ReactNode;
  } else if (hasValue) {
    const item = ctx.getItems().find((i) => i.value === ctx.value);
    if (item) {
      display = item.textValue || item.value;
    } else {
      display = ctx.value;
    }
  } else {
    display = effectivePlaceholder;
  }

  const baseStyle: CSSProperties = {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
    color: hasValue ? p.triggerFg : p.triggerFgMuted,
    ...style,
  };

  return (
    <span className={className} style={baseStyle}>
      {display}
    </span>
  );
}

SelectValue.displayName = "Select.Value";
