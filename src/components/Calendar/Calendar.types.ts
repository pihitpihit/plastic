import type { CSSProperties, ReactNode } from "react";

export type CalendarTheme = "light" | "dark";
export type CalendarMode = "single" | "range" | "multiple";

/** Year 절대값, month 1-12 (1-indexed), day 1-31. JS Date 회피로 timezone-safe. */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

export type CalendarSingleValue = CalendarDate | null;

export interface CalendarRangeValue {
  start: CalendarDate | null;
  end: CalendarDate | null;
}

export type CalendarMultipleValue = CalendarDate[];

/** 0 = Sunday, 1 = Monday, ..., 6 = Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CalendarDayInfo {
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

interface CalendarRootBase {
  month?: CalendarDate;
  defaultMonth?: CalendarDate;
  onMonthChange?: (month: CalendarDate) => void;

  minDate?: CalendarDate | Date;
  maxDate?: CalendarDate | Date;
  isDisabled?: (day: CalendarDate) => boolean;

  locale?: string;
  weekStartsOn?: WeekStart;
  theme?: CalendarTheme;
  disabled?: boolean;
  autoFocus?: boolean;

  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface CalendarRootSingleProps extends CalendarRootBase {
  mode?: "single";
  value?: CalendarSingleValue;
  defaultValue?: CalendarSingleValue;
  onValueChange?: (value: CalendarSingleValue) => void;
  onSelect?: (date: CalendarDate) => void;
}

export interface CalendarRootRangeProps extends CalendarRootBase {
  mode: "range";
  value?: CalendarRangeValue;
  defaultValue?: CalendarRangeValue;
  onValueChange?: (value: CalendarRangeValue) => void;
  onSelect?: (range: CalendarRangeValue) => void;
}

export interface CalendarRootMultipleProps extends CalendarRootBase {
  mode: "multiple";
  value?: CalendarMultipleValue;
  defaultValue?: CalendarMultipleValue;
  onValueChange?: (value: CalendarMultipleValue) => void;
  onSelect?: (dates: CalendarMultipleValue) => void;
}

export type CalendarRootProps =
  | CalendarRootSingleProps
  | CalendarRootRangeProps
  | CalendarRootMultipleProps;

export interface CalendarHeaderProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface CalendarNavProps {
  direction: "prev-year" | "prev-month" | "next-month" | "next-year";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  "aria-label"?: string;
}

export interface CalendarMonthLabelProps {
  format?: "long" | "short" | ((month: CalendarDate, locale: string) => string);
  className?: string;
  style?: CSSProperties;
}

export interface CalendarWeekdayHeaderProps {
  format?: "narrow" | "short" | "long";
  className?: string;
  style?: CSSProperties;
}

export interface CalendarGridProps {
  children?: (day: CalendarDayInfo) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface CalendarDayProps {
  day: CalendarDayInfo;
  onClick?: (date: CalendarDate) => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
