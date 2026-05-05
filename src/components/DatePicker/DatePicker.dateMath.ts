// All date math is now centralized in Calendar/Calendar.dateMath.ts.
// This file re-exports from there for backwards compatibility within DatePicker.
export {
  isValidCalendarDate,
  compareCalendarDate,
  isSameDay,
  getDaysInMonth,
  startOfMonthWeekday,
  addMonths,
  addDays,
  addYears,
  todayCalendarDate,
  orderedWeekdays,
  toCalendarDate,
  toDate,
  normalizeDateInput,
  weekdayOf,
  buildMonthGrid,
  clampToRange,
} from "../Calendar/Calendar.dateMath";
