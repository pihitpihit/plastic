import type { CalendarDate } from "./Calendar.types";

export function isValidCalendarDate(c: CalendarDate): boolean {
  const d = new Date(c.year, c.month - 1, c.day);
  return (
    d.getFullYear() === c.year &&
    d.getMonth() === c.month - 1 &&
    d.getDate() === c.day
  );
}

export function compareCalendarDate(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function isSameDay(
  a: CalendarDate | null,
  b: CalendarDate | null,
): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function startOfMonthWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function addMonths(c: CalendarDate, delta: number): CalendarDate {
  const targetMonthIndex = c.month - 1 + delta;
  const year = c.year + Math.floor(targetMonthIndex / 12);
  const monthIdx = ((targetMonthIndex % 12) + 12) % 12;
  const monthHuman = monthIdx + 1;
  const day = Math.min(c.day, getDaysInMonth(year, monthHuman));
  return { year, month: monthHuman, day };
}

export function addDays(c: CalendarDate, delta: number): CalendarDate {
  const d = new Date(c.year, c.month - 1, c.day + delta);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function addYears(c: CalendarDate, delta: number): CalendarDate {
  return addMonths(c, delta * 12);
}

export function todayCalendarDate(): CalendarDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function orderedWeekdays(weekStartsOn: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => (i + weekStartsOn) % 7);
}

export function toCalendarDate(d: Date): CalendarDate {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

export function toDate(c: CalendarDate): Date {
  return new Date(c.year, c.month - 1, c.day);
}

export function normalizeDateInput(
  input: CalendarDate | Date | null | undefined,
): CalendarDate | null {
  if (input == null) return null;
  if (input instanceof Date) return toCalendarDate(input);
  return input;
}

export function weekdayOf(c: CalendarDate): number {
  return new Date(c.year, c.month - 1, c.day).getDay();
}

export function buildMonthGrid(
  currentMonth: CalendarDate,
  weekStartsOn: number,
): CalendarDate[] {
  const { year, month } = currentMonth;
  const firstWeekday = startOfMonthWeekday(year, month);
  const lead = (firstWeekday - weekStartsOn + 7) % 7;
  const start = addDays({ year, month, day: 1 }, -lead);
  const grid: CalendarDate[] = [];
  for (let i = 0; i < 42; i++) grid.push(addDays(start, i));
  return grid;
}

export function clampToRange(
  c: CalendarDate,
  minDate: CalendarDate | null,
  maxDate: CalendarDate | null,
): CalendarDate {
  if (minDate && compareCalendarDate(c, minDate) < 0) return minDate;
  if (maxDate && compareCalendarDate(c, maxDate) > 0) return maxDate;
  return c;
}
