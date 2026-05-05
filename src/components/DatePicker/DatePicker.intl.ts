// Locale helpers — Calendar provides shared locale utilities.
// DatePicker still needs its own per-purpose Intl.DateTimeFormat instances
// (monthLabel/weekdayShort/ariaDate) for the popover header, which differ
// in shape from Calendar's per-call formatters. Both coexist.

export { deriveWeekStartsOn } from "../Calendar/Calendar.intl";

export function createMonthLabelFormatter(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" });
}

export function createWeekdayShortFormatter(
  locale: string,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { weekday: "short" });
}

export function createAriaDateFormatter(locale: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { dateStyle: "full" });
}
