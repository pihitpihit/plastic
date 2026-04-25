import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { useComboboxContext } from "./ComboboxContext";
import { comboboxPalette } from "./colors";
import type { ComboboxItemProps } from "./Combobox.types";

function renderHighlighted(
  label: string,
  indices: number[],
  markColor: string,
): ReactNode {
  if (indices.length === 0) return label;
  const out: ReactNode[] = [];
  let cursor = 0;
  const markStyle: CSSProperties = {
    background: "transparent",
    color: markColor,
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: 2,
  };
  for (const idx of indices) {
    if (idx > cursor) out.push(label.slice(cursor, idx));
    out.push(
      <mark key={`m-${idx}`} style={markStyle}>
        {label[idx]}
      </mark>,
    );
    cursor = idx + 1;
  }
  if (cursor < label.length) out.push(label.slice(cursor));
  return out;
}

export function ComboboxItem(props: ComboboxItemProps) {
  const {
    value,
    label: labelProp,
    disabled = false,
    className,
    style,
    children,
    onClick: userClick,
    ...rest
  } = props;

  const ctx = useComboboxContext();
  const {
    theme,
    results,
    activeIndex,
    setActiveIndex,
    selectOption,
    matches,
    getItemId,
    listRef,
    multiple,
    value: ctxValue,
    registerItemNode,
  } = ctx;
  const p = comboboxPalette[theme];

  const nodeRef = useRef<HTMLDivElement | null>(null);
  const index = results.findIndex((o) => o.value === value);
  const isActive = index !== -1 && index === activeIndex;

  const isSelected = multiple
    ? Array.isArray(ctxValue) && ctxValue.includes(value)
    : ctxValue === value;

  const refCallback = useCallback(
    (node: HTMLDivElement | null) => {
      nodeRef.current = node;
      registerItemNode(value, node);
    },
    [registerItemNode, value],
  );

  useEffect(() => {
    return () => {
      registerItemNode(value, null);
    };
  }, [value, registerItemNode]);

  useEffect(() => {
    if (!isActive) return;
    const node = nodeRef.current;
    const list = listRef.current;
    if (!node || !list) return;
    const nRect = node.getBoundingClientRect();
    const lRect = list.getBoundingClientRect();
    if (nRect.top < lRect.top || nRect.bottom > lRect.bottom) {
      node.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [isActive, listRef]);

  const handleClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      userClick?.(e);
      if (disabled) return;
      const opt = results[index];
      if (opt) selectOption(opt);
    },
    [userClick, disabled, results, index, selectOption],
  );

  const handleMouseMove = useCallback(() => {
    if (disabled) return;
    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [disabled, index, activeIndex, setActiveIndex]);

  const match = matches.get(value);
  const resolvedLabel = labelProp ?? (typeof children === "string" ? children : value);

  const itemStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    height: 32,
    padding: "0 8px",
    borderRadius: 4,
    fontSize: 14,
    lineHeight: "20px",
    cursor: disabled ? "not-allowed" : "pointer",
    color: disabled ? p.itemFgDisabled : p.itemFg,
    background: isActive && !disabled ? p.itemBgActive : "transparent",
    userSelect: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    ...style,
  };

  const content =
    children !== undefined && typeof children !== "string" ? (
      children
    ) : (
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {match && match.labelMatches.length > 0
          ? renderHighlighted(resolvedLabel, match.labelMatches, p.itemMarkFg)
          : resolvedLabel}
      </span>
    );

  return (
    <div
      ref={refCallback}
      id={getItemId(value)}
      role="option"
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      data-active={isActive || undefined}
      data-disabled={disabled || undefined}
      data-selected={isSelected || undefined}
      data-value={value}
      className={className}
      style={itemStyle}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseDown={(e) => e.preventDefault()}
      title={resolvedLabel}
      {...rest}
    >
      {content}
    </div>
  );
}

ComboboxItem.displayName = "Combobox.Item";
