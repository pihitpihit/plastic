import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useComboboxContext } from "./ComboboxContext";
import { comboboxPalette } from "./colors";
import type { ComboboxInputProps } from "./Combobox.types";

interface ChipProps {
  value: string;
  label: string;
  disabled: boolean;
  onRemove: () => void;
}

function Chip({ value, label, disabled, onRemove }: ChipProps) {
  const ctx = useComboboxContext();
  const p = comboboxPalette[ctx.theme];
  const [hovered, setHovered] = useState(false);

  const chipStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    height: 22,
    padding: "0 6px",
    borderRadius: 4,
    background: p.chipBg,
    border: `1px solid ${p.chipBorder}`,
    color: p.chipFg,
    fontSize: 12,
    lineHeight: 1,
    userSelect: "none",
    opacity: disabled ? 0.5 : 1,
  };

  const removeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 14,
    height: 14,
    borderRadius: 3,
    border: "none",
    background: hovered ? "rgba(0,0,0,0.06)" : "transparent",
    color: p.chipRemoveFg,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: 0,
    fontSize: 11,
    lineHeight: 1,
  };

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (disabled) return;
    onRemove();
  };

  return (
    <span style={chipStyle} data-value={value}>
      <span>{label}</span>
      <button
        type="button"
        aria-label={`Remove ${label}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={disabled}
        style={removeStyle}
        tabIndex={-1}
      >
        {"\u00D7"}
      </button>
    </span>
  );
}

export function ComboboxInput(props: ComboboxInputProps) {
  const {
    className,
    style,
    placeholder: placeholderProp,
    onKeyDown: userKeyDown,
    onFocus: userFocus,
    onBlur: userBlur,
    onCompositionStart: userCompositionStart,
    onCompositionEnd: userCompositionEnd,
    ...rest
  } = props;

  const ctx = useComboboxContext();
  const {
    theme,
    disabled,
    readOnly,
    multiple,
    placeholder: ctxPlaceholder,
    inputValue,
    setInputValue,
    open,
    setOpen,
    value,
    removeValue,
    getOptionLabel,
    inputRef,
    listId,
    getItemId,
    results,
    activeIndex,
  } = ctx;

  const p = comboboxPalette[theme];
  const composingRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const placeholder = placeholderProp ?? ctxPlaceholder;

  const chips = multiple && Array.isArray(value) ? value : [];

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (readOnly || disabled) return;
    setInputValue(e.target.value);
    if (!open) setOpen(true);
  };

  const handleFocus = (e: ReactFocusEvent<HTMLInputElement>) => {
    userFocus?.(e);
    setFocused(true);
    if (!disabled && !open) setOpen(true);
  };

  const handleBlur = (e: ReactFocusEvent<HTMLInputElement>) => {
    userBlur?.(e);
    setFocused(false);
  };

  const handleCompositionStart = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    composingRef.current = true;
    userCompositionStart?.(e);
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>,
  ) => {
    composingRef.current = false;
    userCompositionEnd?.(e);
  };

  const handleAnchorMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.target === inputRef.current) return;
      const input = inputRef.current;
      if (input && document.activeElement !== input) {
        e.preventDefault();
        input.focus();
      }
    },
    [disabled, inputRef],
  );

  const isComposing = () => composingRef.current;

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      userKeyDown?.(e);
      if (e.defaultPrevented) return;
      if (isComposing()) return;
      if (disabled) return;

      const N = results.length;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (!open) {
            setOpen(true);
            ctx.setActiveIndex(0);
            return;
          }
          if (N > 0) {
            ctx.setActiveIndex((activeIndex + 1) % N);
          }
          return;
        }
        case "ArrowUp": {
          if (!open) return;
          e.preventDefault();
          if (N > 0) {
            ctx.setActiveIndex((activeIndex - 1 + N) % N);
          }
          return;
        }
        case "Home": {
          if (!open) return;
          e.preventDefault();
          ctx.setActiveIndex(0);
          return;
        }
        case "End": {
          if (!open) return;
          e.preventDefault();
          ctx.setActiveIndex(Math.max(0, N - 1));
          return;
        }
        case "PageDown": {
          if (!open) return;
          e.preventDefault();
          ctx.setActiveIndex(Math.min(N - 1, activeIndex + 10));
          return;
        }
        case "PageUp": {
          if (!open) return;
          e.preventDefault();
          ctx.setActiveIndex(Math.max(0, activeIndex - 10));
          return;
        }
        case "Enter": {
          if (open && N > 0 && activeIndex >= 0 && activeIndex < N) {
            e.preventDefault();
            const opt = results[activeIndex];
            if (opt) ctx.selectOption(opt);
            return;
          }
          if (open && N === 0 && ctx.freeform) {
            e.preventDefault();
            ctx.commitFreeform(inputValue);
            return;
          }
          if (!open && ctx.freeform) {
            e.preventDefault();
            ctx.commitFreeform(inputValue);
            return;
          }
          return;
        }
        case "Escape": {
          if (open) {
            e.preventDefault();
            setOpen(false);
            return;
          }
          if (multiple && inputValue) {
            e.preventDefault();
            setInputValue("");
            return;
          }
          if (!multiple && ctx.strict) {
            const v = typeof value === "string" ? value : null;
            if (v != null) {
              setInputValue(getOptionLabel(v));
            } else {
              setInputValue("");
            }
            return;
          }
          return;
        }
        case "Tab": {
          if (
            open &&
            N > 0 &&
            activeIndex >= 0 &&
            activeIndex < N
          ) {
            const opt = results[activeIndex];
            if (opt) {
              const lower = opt.label.toLowerCase();
              const q = inputValue.toLowerCase();
              if (lower.startsWith(q) && q.length > 0 && q.length < opt.label.length) {
                e.preventDefault();
                setInputValue(opt.label);
                return;
              }
            }
          }
          if (open) setOpen(false);
          if (!multiple && ctx.strict) {
            const v = typeof value === "string" ? value : null;
            const label = v != null ? getOptionLabel(v) : "";
            if (inputValue !== label) setInputValue(label);
          }
          return;
        }
        case "Backspace": {
          if (multiple && inputValue === "" && Array.isArray(value) && value.length > 0) {
            e.preventDefault();
            const last = value[value.length - 1];
            if (last !== undefined) removeValue(last);
            return;
          }
          return;
        }
        default: {
          if (e.altKey && e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            return;
          }
          if (e.altKey && e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(false);
            return;
          }
          return;
        }
      }
    },
    [
      userKeyDown,
      disabled,
      results,
      open,
      setOpen,
      activeIndex,
      ctx,
      inputValue,
      setInputValue,
      multiple,
      value,
      getOptionLabel,
      removeValue,
    ],
  );

  const inputRefCallback = useCallback(
    (node: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current =
        node;
    },
    [inputRef],
  );

  const borderColor = disabled
    ? p.anchorBorder
    : focused
      ? p.anchorBorderFocus
      : hovered
        ? p.anchorBorderHover
        : p.anchorBorder;

  const anchorStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    minHeight: 36,
    padding: "4px 10px",
    borderRadius: 6,
    background: p.anchorBg,
    border: `1px solid ${borderColor}`,
    boxShadow: focused ? `0 0 0 2px ${p.focusRing}33` : "none",
    transition: "border-color 120ms ease, box-shadow 120ms ease",
    cursor: disabled ? "not-allowed" : "text",
    opacity: disabled ? 0.6 : 1,
    boxSizing: "border-box",
    width: "100%",
  };

  const inputStyle: CSSProperties = {
    flex: 1,
    minWidth: 60,
    height: 26,
    border: "none",
    outline: "none",
    background: "transparent",
    color: p.anchorFg,
    fontSize: 14,
    fontFamily: "inherit",
    padding: 0,
    ...style,
  };

  const activeValue =
    open && results[activeIndex] ? results[activeIndex].value : undefined;
  const activeId = activeValue !== undefined ? getItemId(activeValue) : undefined;

  return (
    <div
      style={anchorStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={handleAnchorMouseDown}
      data-state={open ? "open" : "closed"}
    >
      {multiple &&
        chips.map((v) => (
          <Chip
            key={v}
            value={v}
            label={getOptionLabel(v)}
            disabled={disabled}
            onRemove={() => removeValue(v)}
          />
        ))}
      <input
        ref={inputRefCallback}
        className={className}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={chips.length > 0 ? undefined : placeholder}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        style={inputStyle}
        {...rest}
      />
    </div>
  );
}

ComboboxInput.displayName = "Combobox.Input";
