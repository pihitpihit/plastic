import type { CSSProperties, ReactNode } from "react";
import type {
  CalendarDate,
  WeekStart,
  CalendarSingleValue,
  CalendarRangeValue,
  CalendarDayInfo,
} from "../Calendar/Calendar.types";

// Re-export Calendar types so users can import from "@pihitpihit/plastic" via DatePicker barrel.
// Canonical source: Calendar.
export type { CalendarDate, WeekStart, CalendarDayInfo } from "../Calendar/Calendar.types";

export type DatePickerTheme = "light" | "dark";
export type DatePickerMode = "single" | "range";

/** Backwards-compatible aliases for DatePicker users. */
export type SingleValue = CalendarSingleValue;
export type RangeValue = CalendarRangeValue;

export type ParseMode = "lenient" | "strict";

interface DatePickerRootBaseProps {
  theme?: DatePickerTheme;
  locale?: string;
  weekStartsOn?: WeekStart;

  format?: string;
  parseMode?: ParseMode;

  minDate?: CalendarDate | Date;
  maxDate?: CalendarDate | Date;
  isDisabled?: (day: CalendarDate) => boolean;

  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  month?: CalendarDate;
  defaultMonth?: CalendarDate;
  onMonthChange?: (month: CalendarDate) => void;

  disabled?: boolean;

  onParseError?: (rawInput: string) => void;

  openOnFocus?: boolean;
  closeOnSelect?: boolean;

  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface DatePickerRootSingleProps extends DatePickerRootBaseProps {
  mode?: "single";
  value?: SingleValue;
  defaultValue?: SingleValue;
  onValueChange?: (value: SingleValue) => void;
}

export interface DatePickerRootRangeProps extends DatePickerRootBaseProps {
  mode: "range";
  value?: RangeValue;
  defaultValue?: RangeValue;
  onValueChange?: (value: RangeValue) => void;
}

export type DatePickerRootProps =
  | DatePickerRootSingleProps
  | DatePickerRootRangeProps;

export interface DatePickerInputProps {
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  part?: "start" | "end";
  "aria-label"?: string;
}

export interface DatePickerTriggerProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  "aria-label"?: string;
}

export interface DatePickerCalendarProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface DatePickerHeaderProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface DatePickerMonthLabelProps {
  className?: string;
  style?: CSSProperties;
}

export interface DatePickerNavProps {
  direction: "prev-year" | "prev-month" | "next-month" | "next-year";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  "aria-label"?: string;
}

export interface DatePickerGridProps {
  children?: (day: CalendarDayInfo) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** @deprecated Renamed to CalendarDayInfo (re-exported from Calendar). */
export type DatePickerDayInfo = CalendarDayInfo;

export interface DatePickerDayProps {
  day: CalendarDayInfo;
  className?: string;
  style?: CSSProperties;
}

export interface DatePickerFooterProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
