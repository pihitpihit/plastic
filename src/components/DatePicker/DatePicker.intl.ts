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
