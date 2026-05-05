import { useCallback, type CSSProperties, type KeyboardEvent } from "react";
import { useCalendarContext } from "./CalendarContext";
import {
  addDays,
  addMonths,
  addYears,
  weekdayOf,
} from "./Calendar.dateMath";
import { calendarThemes } from "./Calendar.theme";
import type {
  CalendarDate,
  CalendarDayProps,
  WeekStart,
} from "./Calendar.types";

function weekdayIndex(date: CalendarDate, weekStartsOn: WeekStart): number {
  const wd = weekdayOf(date);
  return (wd - weekStartsOn + 7) % 7;
}

export function CalendarDay(props: CalendarDayProps) {
  const { day, onClick, className, style, children } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];

  const handleClick = useCallback(() => {
    if (day.isDisabled || ctx.disabled) return;
    if (onClick) onClick(day.date);
    else ctx.selectDay(day.date);
  }, [day.isDisabled, day.date, ctx, onClick]);

  const handleMouseEnter = useCallback(() => {
    if (ctx.mode === "range" && !day.isDisabled) {
      ctx.setRangePreviewEnd(day.date);
    }
    if (!day.isDisabled && !ctx.disabled) {
      ctx.setFocusedDay(day.date);
    }
  }, [ctx, day.isDisabled, day.date]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (ctx.disabled) return;

      let next: CalendarDate | null = null;
      switch (e.key) {
        case "ArrowLeft":
          next = addDays(day.date, -1);
          break;
        case "ArrowRight":
          next = addDays(day.date, 1);
          break;
        case "ArrowUp":
          next = addDays(day.date, -7);
          break;
        case "ArrowDown":
          next = addDays(day.date, 7);
          break;
        case "Home":
          next = addDays(day.date, -weekdayIndex(day.date, ctx.weekStartsOn));
          break;
        case "End":
          next = addDays(day.date, 6 - weekdayIndex(day.date, ctx.weekStartsOn));
          break;
        case "PageUp":
          next = e.shiftKey ? addYears(day.date, -1) : addMonths(day.date, -1);
          break;
        case "PageDown":
          next = e.shiftKey ? addYears(day.date, 1) : addMonths(day.date, 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleClick();
          return;
        default:
          return;
      }

      e.preventDefault();
      if (next) {
        ctx.setFocusedDay(next);
        if (next.month !== ctx.month.month || next.year !== ctx.month.year) {
          ctx.setMonth({ year: next.year, month: next.month, day: 1 });
        }
        const target = next;
        requestAnimationFrame(() => {
          const cell = document.querySelector<HTMLElement>(
            `[data-day="${target.year}-${target.month}-${target.day}"]`,
          );
          cell?.focus();
        });
      }
    },
    [ctx, day.date, handleClick],
  );

  const fg = day.isDisabled
    ? tokens.dayFgDisabled
    : !day.inCurrentMonth
      ? tokens.dayFgMuted
      : day.isSelected
        ? tokens.dayFgSelected
        : day.isToday
          ? tokens.dayFgToday
          : tokens.dayFg;

  const bg = day.isDisabled
    ? tokens.dayBgDisabled
    : day.isSelected || day.isRangeStart || day.isRangeEnd
      ? tokens.dayBgSelected
      : day.isInRange
        ? tokens.dayBgRange
        : day.isRangePreview
          ? tokens.dayBgRangePreview
          : day.isFocused
            ? tokens.dayBgFocused
            : tokens.dayBg;

  const border =
    day.isToday && !day.isSelected
      ? `1px solid ${tokens.dayBorderToday}`
      : "1px solid transparent";

  const cellStyle: CSSProperties = {
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: day.isDisabled ? "not-allowed" : "pointer",
    color: fg,
    background: bg,
    border,
    borderRadius: 4,
    boxSizing: "border-box",
    opacity: day.isDisabled ? tokens.disabledOpacity : 1,
    outline: "none",
    transition: "background 100ms ease, color 100ms ease",
    padding: 0,
    ...style,
  };

  return (
    <button
      type="button"
      role="gridcell"
      tabIndex={day.isFocused ? 0 : -1}
      aria-selected={day.isSelected}
      aria-disabled={day.isDisabled || undefined}
      aria-label={`${day.date.year}-${String(day.date.month).padStart(2, "0")}-${String(day.date.day).padStart(2, "0")}`}
      data-day={`${day.date.year}-${day.date.month}-${day.date.day}`}
      data-day-focused={day.isFocused ? "true" : undefined}
      data-day-selected={day.isSelected ? "true" : undefined}
      data-day-today={day.isToday ? "true" : undefined}
      data-in-current-month={day.inCurrentMonth ? "true" : undefined}
      data-range-start={day.isRangeStart ? "true" : undefined}
      data-range-end={day.isRangeEnd ? "true" : undefined}
      data-in-range={day.isInRange ? "true" : undefined}
      data-range-preview={day.isRangePreview ? "true" : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onKeyDown={handleKeyDown}
      disabled={day.isDisabled || ctx.disabled}
      className={className}
      style={cellStyle}
    >
      {children ?? day.date.day}
    </button>
  );
}

CalendarDay.displayName = "Calendar.Day";
