import { createContext, useContext } from "react";
import type {
  CalendarDate,
  CalendarMode,
  CalendarMultipleValue,
  CalendarRangeValue,
  CalendarSingleValue,
  CalendarTheme,
  WeekStart,
} from "./Calendar.types";

export type CalendarContextValueUnion =
  | CalendarSingleValue
  | CalendarRangeValue
  | CalendarMultipleValue;

export interface CalendarContextValue {
  mode: CalendarMode;

  value: CalendarContextValueUnion;
  setValue: (next: CalendarContextValueUnion) => void;

  month: CalendarDate;
  setMonth: (next: CalendarDate) => void;

  isDisabledDay: (day: CalendarDate) => boolean;

  focusedDay: CalendarDate | null;
  setFocusedDay: (d: CalendarDate | null) => void;

  rangePreviewEnd: CalendarDate | null;
  setRangePreviewEnd: (d: CalendarDate | null) => void;

  selectDay: (day: CalendarDate) => void;

  locale: string;
  weekStartsOn: WeekStart;
  theme: CalendarTheme;
  disabled: boolean;
}

export const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendarContext(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) {
    throw new Error("Calendar.* components must be used within <Calendar.Root>");
  }
  return ctx;
}
