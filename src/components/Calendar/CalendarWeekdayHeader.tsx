import type { CSSProperties } from "react";
import { useCalendarContext } from "./CalendarContext";
import { orderedWeekdays } from "./Calendar.dateMath";
import { getWeekdayLabel } from "./Calendar.intl";
import { calendarThemes } from "./Calendar.theme";
import type { CalendarWeekdayHeaderProps } from "./Calendar.types";

export function CalendarWeekdayHeader(props: CalendarWeekdayHeaderProps) {
  const { format = "narrow", className, style } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];
  const weekdays = orderedWeekdays(ctx.weekStartsOn);

  const baseStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    textAlign: "center",
    fontSize: 11,
    color: tokens.weekdayFg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    padding: "4px 0",
    userSelect: "none",
    ...style,
  };

  return (
    <div className={className} style={baseStyle}>
      {weekdays.map((wd) => (
        <span key={wd} aria-hidden="true">
          {getWeekdayLabel(wd, ctx.locale, format)}
        </span>
      ))}
    </div>
  );
}

CalendarWeekdayHeader.displayName = "Calendar.WeekdayHeader";
