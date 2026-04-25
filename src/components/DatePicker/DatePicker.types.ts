import type { CSSProperties, ReactNode } from "react";

export type DatePickerTheme = "light" | "dark";
export type DatePickerMode = "single" | "range";

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export type SingleValue = CalendarDate | null;

export interface RangeValue {
  start: CalendarDate | null;
  end: CalendarDate | null;
}

export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;
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
  children?: (day: DatePickerDayInfo) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface DatePickerDayProps {
  day: DatePickerDayInfo;
  className?: string;
  style?: CSSProperties;
}

export interface DatePickerFooterProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface DatePickerDayInfo {
  date: CalendarDate;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isRangePreview: boolean;
  isDisabled: boolean;
  isFocused: boolean;
}
