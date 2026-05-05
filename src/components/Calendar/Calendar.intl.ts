import type { CalendarDate } from "./Calendar.types";

export function getMonthLabel(
  month: CalendarDate,
  locale: string,
  format: "long" | "short" = "long",
): string {
  const date = new Date(month.year, month.month - 1, 1);
  return new Intl.DateTimeFormat(locale, {
    month: format,
    year: "numeric",
  }).format(date);
}

export function getWeekdayLabel(
  weekday: number,
  locale: string,
  format: "narrow" | "short" | "long" = "narrow",
): string {
  // 1970-01-04 is a Sunday; offset by `weekday` to get desired day-of-week
  const date = new Date(1970, 0, 4 + weekday);
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(date);
}

export function defaultLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-US";
}

export function deriveWeekStartsOn(locale: string): number {
  if (typeof Intl === "undefined") return 0;
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay?: number };
    };
    const info = loc.getWeekInfo?.();
    if (info?.firstDay != null) {
      return info.firstDay === 7 ? 0 : info.firstDay;
    }
  } catch {
    // ignore
  }
  return 0;
}
