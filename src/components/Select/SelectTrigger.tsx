import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type FocusEvent as ReactFocusEvent,
} from "react";
import { useSelectContext } from "./SelectContext";
import { selectPalette } from "./colors";
import type { SelectTriggerProps } from "./Select.types";
import type { RegisteredItem } from "./SelectContext";

function nextEnabled(
  items: RegisteredItem[],
  fromIdx: number,
  direction: 1 | -1,
): RegisteredItem | undefined {
  if (items.length === 0) return undefined;
  let i = fromIdx;
  const last = items.length - 1;
  for (let step = 0; step <= last; step++) {
    i = i + direction;
    if (i < 0) i = last;
    if (i > last) i = 0;
    const it = items[i];
    if (it && !it.disabled) return it;
  }
  return undefined;
}

function computeInitialActive(
  items: RegisteredItem[],
  currentValue: string | undefined,
  direction: "down" | "up" | "current",
): string | null {
  const enabled = items.filter((i) => !i.disabled);
  if (enabled.length === 0) return null;
  if (currentValue != null) {
    const found = enabled.find((i) => i.value === currentValue);
    if (found) {
      if (direction === "current") return found.value;
      const sortedIdx = items.findIndex((i) => i.value === currentValue);
      const next = nextEnabled(items, sortedIdx, direction === "down" ? 1 : -1);
      if (next) return next.value;
      return found.value;
    }
  }
  if (direction === "up") {
    const last = enabled[enabled.length - 1];
    return last ? last.value : null;
  }
  const first = enabled[0];
  return first ? first.value : null;
}

export function SelectTrigger(props: SelectTriggerProps) {
  const {
    className,
    style,
    children,
    onKeyDown: userKeyDown,
    onMouseEnter: userMouseEnter,
    onMouseLeave: userMouseLeave,
    onFocus: userFocus,
    onBlur: userBlur,
    ...rest
  } = props;

  const ctx = useSelectContext();
  const {
    open,
    setOpen,
    setActiveValue,
    value,
    disabled,
    theme,
    triggerRef,
    listboxId,
    triggerId,
    getActiveId,
    getItems,
    close,
    onTypeAhead,
  } = ctx;

  const p = selectPalette[theme];

  const [hovered, setHovered] = useState(false);
  const [focusRing, setFocusRing] = useState(false);
  const internalRef = useRef<HTMLButtonElement | null>(null);

  const refCallback = useCallback(
    (node: HTMLButtonElement | null) => {
      internalRef.current = node;
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    [triggerRef],
  );

  const openWithDirection = useCallback(
    (direction: "down" | "up" | "current") => {
      if (disabled) return;
      const items = getItems();
      const initial = computeInitialActive(items, value, direction);
      if (initial != null) setActiveValue(initial);
      setOpen(true);
    },
    [disabled, getItems, value, setActiveValue, setOpen],
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (open) {
      setOpen(false);
    } else {
      openWithDirection("current");
    }
  }, [disabled, open, setOpen, openWithDirection]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      userKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (e.nativeEvent.isComposing) return;
      if (disabled) return;

      if (!open) {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault();
            openWithDirection("current");
            return;
          case "ArrowDown":
            e.preventDefault();
            openWithDirection("down");
            return;
          case "ArrowUp":
            e.preventDefault();
            openWithDirection("up");
            return;
          default:
            return;
        }
      }

      const items = getItems();
      const enabled = items.filter((i) => !i.disabled);
      const activeValue = ctx.activeValue;
      const curIdx = activeValue != null
        ? enabled.findIndex((i) => i.value === activeValue)
        : -1;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const next = enabled[Math.min(curIdx + 1, enabled.length - 1)];
          if (next) setActiveValue(next.value);
          return;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = enabled[Math.max(curIdx - 1, 0)];
          if (prev) setActiveValue(prev.value);
          return;
        }
        case "Home": {
          e.preventDefault();
          const first = enabled[0];
          if (first) setActiveValue(first.value);
          return;
        }
        case "End": {
          e.preventDefault();
          const last = enabled[enabled.length - 1];
          if (last) setActiveValue(last.value);
          return;
        }
        case "PageDown": {
          e.preventDefault();
          const target = enabled[Math.min(curIdx + 10, enabled.length - 1)];
          if (target) setActiveValue(target.value);
          return;
        }
        case "PageUp": {
          e.preventDefault();
          const target = enabled[Math.max(curIdx - 10, 0)];
          if (target) setActiveValue(target.value);
          return;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          if (activeValue != null) {
            const selected = enabled.find((i) => i.value === activeValue);
            if (selected) {
              ctx.setValue(selected.value);
              close("select");
            }
          }
          return;
        }
        case "Escape": {
          e.preventDefault();
          close("escape");
          return;
        }
        case "Tab": {
          close("tab");
          return;
        }
        default: {
          if (e.key.length === 1) {
            onTypeAhead(e.key);
          }
          return;
        }
      }
    },
    [
      userKeyDown,
      disabled,
      open,
      openWithDirection,
      getItems,
      ctx,
      setActiveValue,
      close,
      onTypeAhead,
    ],
  );

  const handleMouseEnter = (e: ReactMouseEvent<HTMLButtonElement>) => {
    userMouseEnter?.(e);
    if (!disabled) setHovered(true);
  };
  const handleMouseLeave = (e: ReactMouseEvent<HTMLButtonElement>) => {
    userMouseLeave?.(e);
    setHovered(false);
  };
  const handleFocus = (e: ReactFocusEvent<HTMLButtonElement>) => {
    userFocus?.(e);
    setFocusRing(e.target.matches(":focus-visible"));
  };
  const handleBlur = (e: ReactFocusEvent<HTMLButtonElement>) => {
    userBlur?.(e);
    setFocusRing(false);
  };

  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    height: 32,
    padding: "0 10px",
    borderRadius: 6,
    border: `1px solid ${hovered && !disabled ? p.triggerBorderHover : p.triggerBorder}`,
    background: hovered && !disabled ? p.triggerBgHover : p.triggerBg,
    color: p.triggerFg,
    fontSize: 13,
    fontFamily: "inherit",
    lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    outline: "none",
    boxShadow: focusRing ? `0 0 0 2px ${p.triggerFocusRing}` : "none",
    transition: "box-shadow 120ms ease, background 120ms ease, border-color 120ms ease",
    boxSizing: "border-box",
    minWidth: 0,
    ...style,
  };

  const activeId = open ? getActiveId() : undefined;

  return (
    <button
      type="button"
      role="combobox"
      id={triggerId}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listboxId : undefined}
      aria-activedescendant={activeId}
      aria-disabled={disabled || undefined}
      data-state={open ? "open" : "closed"}
      disabled={disabled}
      ref={refCallback}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      style={baseStyle}
      {...rest}
    >
      {children}
    </button>
  );
}

SelectTrigger.displayName = "Select.Trigger";
