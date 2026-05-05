import { Fragment, useMemo, type CSSProperties } from "react";
import { useCalendarContext } from "./CalendarContext";
import {
  buildMonthGrid,
  compareCalendarDate,
  isSameDay,
  todayCalendarDate,
} from "./Calendar.dateMath";
import { CalendarDay } from "./CalendarDay";
import type {
  CalendarContextValue,
} from "./CalendarContext";
import type {
  CalendarDate,
  CalendarDayInfo,
  CalendarGridProps,
  CalendarMultipleValue,
  CalendarRangeValue,
  CalendarSingleValue,
} from "./Calendar.types";

function computeDayInfo(
  date: CalendarDate,
  ctx: CalendarContextValue,
): CalendarDayInfo {
  const today = todayCalendarDate();
  const inCurrentMonth =
    date.month === ctx.month.month && date.year === ctx.month.year;
  const isToday = isSameDay(date, today);

  let isSelected = false;
  let isRangeStart = false;
  let isRangeEnd = false;
  let isInRange = false;
  let isRangePreview = false;

  if (ctx.mode === "single") {
    const v = ctx.value as CalendarSingleValue;
    isSelected = isSameDay(date, v);
  } else if (ctx.mode === "range") {
    const v = ctx.value as CalendarRangeValue;
    isRangeStart = isSameDay(date, v.start);
    isRangeEnd = isSameDay(date, v.end);
    if (v.start && v.end) {
      isInRange =
        compareCalendarDate(date, v.start) > 0 &&
        compareCalendarDate(date, v.end) < 0;
    }
    isSelected = isRangeStart || isRangeEnd;

    if (v.start && !v.end && ctx.rangePreviewEnd) {
      const lo =
        compareCalendarDate(v.start, ctx.rangePreviewEnd) <= 0
          ? v.start
          : ctx.rangePreviewEnd;
      const hi =
        compareCalendarDate(v.start, ctx.rangePreviewEnd) <= 0
          ? ctx.rangePreviewEnd
          : v.start;
      isRangePreview =
        compareCalendarDate(date, lo) >= 0 && compareCalendarDate(date, hi) <= 0;
    }
  } else if (ctx.mode === "multiple") {
    const v = ctx.value as CalendarMultipleValue;
    isSelected = v.some((d) => isSameDay(d, date));
  }

  return {
    date,
    inCurrentMonth,
    isToday,
    isSelected,
    isRangeStart,
    isRangeEnd,
    isInRange,
    isRangePreview,
    isDisabled: ctx.isDisabledDay(date),
    isFocused: isSameDay(date, ctx.focusedDay),
  };
}

export function CalendarGrid(props: CalendarGridProps) {
  const { children, className, style } = props;
  const ctx = useCalendarContext();
  const days = useMemo(
    () => buildMonthGrid(ctx.month, ctx.weekStartsOn),
    [ctx.month, ctx.weekStartsOn],
  );

  const handleMouseLeave = () => {
    if (ctx.mode === "range") ctx.setRangePreviewEnd(null);
  };

  const baseStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 0,
    ...style,
  };

  return (
    <div
      role="grid"
      className={className}
      style={baseStyle}
      onMouseLeave={handleMouseLeave}
    >
      {days.map((date, i) => {
        const info = computeDayInfo(date, ctx);
        return children ? (
          <Fragment key={`${date.year}-${date.month}-${date.day}-${i}`}>
            {children(info)}
          </Fragment>
        ) : (
          <CalendarDay
            key={`${date.year}-${date.month}-${date.day}-${i}`}
            day={info}
          />
        );
      })}
    </div>
  );
}

CalendarGrid.displayName = "Calendar.Grid";
