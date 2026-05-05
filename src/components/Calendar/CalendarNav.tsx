import { useState, type CSSProperties } from "react";
import { useCalendarContext } from "./CalendarContext";
import { addMonths } from "./Calendar.dateMath";
import { calendarThemes } from "./Calendar.theme";
import type { CalendarNavProps } from "./Calendar.types";

const labelMap: Record<CalendarNavProps["direction"], string> = {
  "prev-year": "Previous year",
  "prev-month": "Previous month",
  "next-month": "Next month",
  "next-year": "Next year",
};

const defaultGlyph: Record<CalendarNavProps["direction"], string> = {
  "prev-year": "«",
  "prev-month": "‹",
  "next-month": "›",
  "next-year": "»",
};

const deltaMap: Record<CalendarNavProps["direction"], number> = {
  "prev-year": -12,
  "prev-month": -1,
  "next-month": 1,
  "next-year": 12,
};

export function CalendarNav(props: CalendarNavProps) {
  const { direction, className, style, children, "aria-label": ariaLabel } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (ctx.disabled) return;
    ctx.setMonth(addMonths(ctx.month, deltaMap[direction]));
  };

  const baseStyle: CSSProperties = {
    background: hovered && !ctx.disabled ? tokens.navBtnHoverBg : "transparent",
    border: "none",
    color: hovered && !ctx.disabled ? tokens.navBtnHover : tokens.navBtn,
    cursor: ctx.disabled ? "not-allowed" : "pointer",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 14,
    lineHeight: 1,
    fontFamily: "inherit",
    transition: "background 120ms ease, color 120ms ease",
    ...style,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={ariaLabel ?? labelMap[direction]}
      disabled={ctx.disabled}
      className={className}
      style={baseStyle}
      data-nav-direction={direction}
    >
      {children ?? defaultGlyph[direction]}
    </button>
  );
}

CalendarNav.displayName = "Calendar.Nav";
