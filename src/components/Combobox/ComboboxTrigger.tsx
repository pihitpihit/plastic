import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { useComboboxContext } from "./ComboboxContext";
import { comboboxPalette } from "./colors";
import type { ComboboxTriggerProps } from "./Combobox.types";

export function ComboboxTrigger(props: ComboboxTriggerProps) {
  const { className, style, children, plain = false, ...rest } = props;
  const ctx = useComboboxContext();
  const { theme, open, setOpen, disabled, inputRef } = ctx;
  const p = comboboxPalette[theme];

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (disabled) return;
    setOpen(!open);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    border: "none",
    background: "transparent",
    color: p.triggerFg,
    cursor: disabled ? "not-allowed" : "pointer",
    padding: 0,
    borderRadius: 4,
    transition: "transform 120ms ease, color 120ms ease",
    transform: open ? "rotate(180deg)" : "rotate(0deg)",
    ...style,
  };

  return (
    <button
      type="button"
      aria-label="Toggle options"
      data-state={open ? "open" : "closed"}
      tabIndex={-1}
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      className={className}
      style={baseStyle}
      {...rest}
    >
      {plain ? (
        children
      ) : children !== undefined ? (
        children
      ) : (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

ComboboxTrigger.displayName = "Combobox.Trigger";
