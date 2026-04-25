import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type {
  CalendarDate,
  DatePickerMode,
  DatePickerTheme,
  ParseMode,
  RangeValue,
  SingleValue,
} from "./DatePicker.types";

export interface DatePickerContextValue {
  mode: DatePickerMode;

  single: SingleValue;
  range: RangeValue;
  rangeHoverEnd: CalendarDate | null;
  setRangeHoverEnd: (d: CalendarDate | null) => void;

  open: boolean;
  setOpen: (v: boolean) => void;

  currentMonth: CalendarDate;
  setCurrentMonth: (m: CalendarDate) => void;

  focusedDay: CalendarDate;
  setFocusedDay: (d: CalendarDate) => void;

  minDate: CalendarDate | null;
  maxDate: CalendarDate | null;
  isDisabledInternal: (d: CalendarDate) => boolean;

  locale: string;
  weekStartsOn: number;

  format: string;
  parseMode: ParseMode;

  selectDay: (d: CalendarDate) => void;
  clear: () => void;
  setToToday: () => void;

  disabled: boolean;
  theme: DatePickerTheme;
  openOnFocus: boolean;

  typedRaw: string | null;
  setTypedRaw: (v: string | null) => void;
  typedRawEnd: string | null;
  setTypedRawEnd: (v: string | null) => void;
  invalid: boolean;
  invalidEnd: boolean;
  commitTyped: (part: "start" | "end" | null) => void;
  cancelTyped: (part: "start" | "end" | null) => void;
  onParseError: ((raw: string) => void) | undefined;

  formatters: {
    monthLabel: Intl.DateTimeFormat;
    weekdayShort: Intl.DateTimeFormat;
    ariaDate: Intl.DateTimeFormat;
  };

  ids: {
    root: string;
    input: string;
    inputStart: string;
    inputEnd: string;
    trigger: string;
    dialog: string;
    grid: string;
    monthLabel: string;
  };

  inputRef: RefObject<HTMLInputElement | null>;
  inputEndRef: RefObject<HTMLInputElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;

  requestFocusOnFocusedDay: () => void;
}

export const DatePickerContext = createContext<DatePickerContextValue | null>(
  null,
);

export function useDatePickerContext(): DatePickerContextValue {
  const ctx = useContext(DatePickerContext);
  if (!ctx) {
    throw new Error(
      "DatePicker components must be used within <DatePicker.Root>",
    );
  }
  return ctx;
}
