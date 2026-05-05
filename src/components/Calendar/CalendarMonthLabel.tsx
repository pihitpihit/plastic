import type { CSSProperties } from "react";
import { useCalendarContext } from "./CalendarContext";
import { getMonthLabel } from "./Calendar.intl";
import { calendarThemes } from "./Calendar.theme";
import type { CalendarMonthLabelProps } from "./Calendar.types";

export function CalendarMonthLabel(props: CalendarMonthLabelProps) {
  const { format = "long", className, style } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];

  const label =
    typeof format === "function"
      ? format(ctx.month, ctx.locale)
      : getMonthLabel(ctx.month, ctx.locale, format);

  const baseStyle: CSSProperties = {
    fontWeight: 600,
    fontSize: 13,
    color: tokens.monthLabel,
    flex: 1,
    textAlign: "center",
    userSelect: "none",
    ...style,
  };

  return (
    <span aria-live="polite" className={className} style={baseStyle}>
      {label}
    </span>
  );
}

CalendarMonthLabel.displayName = "Calendar.MonthLabel";
