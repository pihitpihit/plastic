import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  SelectItemContext,
  useSelectContext,
  type RegisteredItem,
} from "./SelectContext";
import { selectPalette } from "./colors";
import type { SelectItemProps } from "./Select.types";

export function SelectItem(props: SelectItemProps) {
  const {
    value,
    disabled = false,
    textValue: textValueProp,
    className,
    style,
    children,
  } = props;

  const ctx = useSelectContext();
  const { theme, activeValue, value: selectedValue, setActiveValue } = ctx;
  const p = selectPalette[theme];

  const id = useId();
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const [textValue, setTextValue] = useState<string>(textValueProp ?? "");

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    let resolved = textValueProp;
    if (resolved === undefined || resolved === "") {
      resolved = (node.textContent ?? "").trim();
    }
    setTextValue(resolved);
    const item: RegisteredItem = {
      value,
      textValue: resolved,
      disabled,
      node,
      id,
    };
    const unregister = ctx.registerItem(item);
    return unregister;
  }, [value, textValueProp, disabled, id, ctx]);

  const isSelected = selectedValue === value;
  const isActive = activeValue === value;

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      ctx.setValue(value);
      ctx.close("select");
    },
    [disabled, ctx, value],
  );

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    setActiveValue(value);
  }, [disabled, setActiveValue, value]);

  const baseStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 8px",
    borderRadius: 4,
    fontSize: 13,
    lineHeight: 1.3,
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled
      ? p.itemFgDisabled
      : isSelected
        ? p.itemFgSelected
        : p.itemFg,
    background: disabled
      ? "transparent"
      : isActive
        ? p.itemBgActive
        : "transparent",
    userSelect: "none",
    outline: "none",
    ...style,
  };

  const itemCtx = useMemo(
    () => ({ value, isSelected }),
    [value, isSelected],
  );

  return (
    <SelectItemContext.Provider value={itemCtx}>
      <div
        ref={nodeRef}
        id={id}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled || undefined}
        data-state={isSelected ? "checked" : "unchecked"}
        data-highlighted={isActive && !disabled ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-value={value}
        data-textvalue={textValue}
        className={className}
        style={baseStyle}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseEnter}
      >
        {children}
      </div>
    </SelectItemContext.Provider>
  );
}

SelectItem.displayName = "Select.Item";
