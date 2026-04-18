import type { CSSProperties, ReactNode } from "react";
import {
  chipBg,
  chipBorder,
  chipText,
  iconColor,
  itemActiveBg,
  itemBg,
  itemDisabledText,
  itemSubtext,
  itemText,
} from "./colors";
import type {
  CommandItem,
  CommandPaletteItemProps,
} from "./CommandPalette.types";
import { useCommandPalette } from "./CommandPaletteRoot";
import { formatShortcutKey, renderHighlightedText } from "./helpers";

function ChevronRight({ color }: { color: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, opacity: 0.6 }}
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function CommandPaletteItem({
  id,
  item,
  onSelect,
  children,
  className,
  style,
  ...rest
}: CommandPaletteItemProps) {
  const ctx = useCommandPalette();
  const theme = ctx.theme;

  const resolvedItem: CommandItem | undefined = item;
  const itemId = id ?? resolvedItem?.id;
  if (!itemId) {
    throw new Error(
      "CommandPalette.Item requires either `id` prop or `item` prop with id",
    );
  }

  const index = ctx.results.findIndex((r) => r.id === itemId);
  const isActive = index >= 0 && index === ctx.activeIndex;
  const disabled = resolvedItem?.disabled === true;

  const handleClick = () => {
    if (disabled) return;
    if (onSelect) {
      onSelect();
      return;
    }
    if (resolvedItem) ctx.selectItem(resolvedItem);
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    if (index >= 0) ctx.setActiveIndex(index);
  };

  const bg = disabled
    ? itemBg[theme]
    : isActive
      ? itemActiveBg[theme]
      : itemBg[theme];
  const color = disabled ? itemDisabledText[theme] : itemText[theme];

  const baseStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "8px 16px",
    gap: 10,
    margin: "0 4px",
    borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundColor: bg,
    color,
    opacity: disabled ? 0.55 : 1,
    userSelect: "none",
    ...style,
  };

  let content: ReactNode = children;
  if (!content && resolvedItem) {
    const match = ctx.matches.get(resolvedItem.id);
    const labelNode = match
      ? renderHighlightedText(resolvedItem.label, match.labelMatches)
      : resolvedItem.label;
    const descNode =
      resolvedItem.description !== undefined
        ? match
          ? renderHighlightedText(
              resolvedItem.description,
              match.descriptionMatches,
            )
          : resolvedItem.description
        : null;

    content = (
      <>
        {resolvedItem.icon ? (
          <span
            style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: iconColor[theme],
            }}
          >
            {resolvedItem.icon}
          </span>
        ) : null}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              lineHeight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {labelNode}
          </div>
          {descNode !== null && (
            <div
              style={{
                fontSize: 12,
                lineHeight: "16px",
                color: itemSubtext[theme],
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                marginTop: 1,
              }}
            >
              {descNode}
            </div>
          )}
        </div>

        {resolvedItem.shortcut && resolvedItem.shortcut.length > 0 ? (
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {resolvedItem.shortcut.map((key, i) => (
              <kbd
                key={i}
                style={{
                  fontSize: 11,
                  lineHeight: "16px",
                  padding: "1px 5px",
                  borderRadius: 4,
                  border: `1px solid ${chipBorder[theme]}`,
                  backgroundColor: chipBg[theme],
                  color: chipText[theme],
                  fontFamily: "inherit",
                  minWidth: 20,
                  textAlign: "center",
                }}
              >
                {formatShortcutKey(key)}
              </kbd>
            ))}
          </div>
        ) : null}

        {resolvedItem.children && resolvedItem.children.length > 0 ? (
          <ChevronRight color={itemSubtext[theme]} />
        ) : null}
      </>
    );
  }

  const staggerDelay = Math.min(Math.max(index, 0), 5) * 15;
  const animationStyle: CSSProperties =
    index >= 0
      ? {
          animation: `plastic-cp-stagger 100ms ease-out ${staggerDelay}ms both`,
        }
      : {};

  return (
    <div
      id={ctx.getItemId(itemId)}
      role="option"
      aria-selected={isActive}
      aria-disabled={disabled}
      data-active={isActive}
      tabIndex={-1}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={className}
      style={{ ...baseStyle, ...animationStyle }}
      {...rest}
    >
      {content}
    </div>
  );
}

