import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useControllable } from "../_shared/useControllable";
import {
  addDays,
  addMonths,
  addYears,
  clampToRange,
  compareCalendarDate,
  isSameDay,
  normalizeDateInput,
  todayCalendarDate,
} from "./DatePicker.dateMath";
import {
  createAriaDateFormatter,
  createMonthLabelFormatter,
  createWeekdayShortFormatter,
  deriveWeekStartsOn,
} from "./DatePicker.intl";
import { formatCalendarDate, parseRaw } from "./DatePicker.format";
import type {
  CalendarDate,
  DatePickerMode,
  DatePickerRootProps,
  ParseMode,
  RangeValue,
  SingleValue,
} from "./DatePicker.types";

interface StateReturn {
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
  theme: "light" | "dark";
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
  closeOnSelectResolved: boolean;
  requestFocusTick: number;
  requestFocusOnFocusedDay: () => void;
}

function normalizeMonth(c: CalendarDate): CalendarDate {
  return { year: c.year, month: c.month, day: 1 };
}

function deriveInitialMonth(
  value: CalendarDate | null,
  minDate: CalendarDate | null,
  maxDate: CalendarDate | null,
): CalendarDate {
  const base = value ?? todayCalendarDate();
  const clamped = clampToRange(base, minDate, maxDate);
  return normalizeMonth(clamped);
}

function currentValueDate(
  mode: DatePickerMode,
  single: SingleValue,
  range: RangeValue,
): CalendarDate | null {
  if (mode === "single") return single;
  return range.start ?? range.end ?? null;
}

export function useDatePickerState(props: DatePickerRootProps): StateReturn {
  const {
    locale = "en-US",
    weekStartsOn: weekStartsOnProp,
    format = "yyyy-MM-dd",
    parseMode = "lenient",
    theme = "light",
    disabled = false,
    openOnFocus = true,
    closeOnSelect,
    onParseError,
  } = props;

  const minDate = useMemo(
    () => normalizeDateInput(props.minDate),
    [props.minDate],
  );
  const maxDate = useMemo(
    () => normalizeDateInput(props.maxDate),
    [props.maxDate],
  );
  const userIsDisabled = props.isDisabled;

  const isRange = props.mode === "range";
  const mode: DatePickerMode = isRange ? "range" : "single";

  const singleControlled =
    !isRange && "value" in props ? props.value : undefined;
  const singleDefault =
    !isRange && "defaultValue" in props ? props.defaultValue : undefined;
  const [single, setSingleInternal] = useControllable<SingleValue>(
    singleControlled,
    singleDefault ?? null,
    !isRange
      ? ((v: SingleValue) => {
          const p = props as Extract<DatePickerRootProps, { mode?: "single" }>;
          p.onValueChange?.(v);
        })
      : undefined,
  );

  const rangeControlled =
    isRange && "value" in props ? props.value : undefined;
  const rangeDefault =
    isRange && "defaultValue" in props ? props.defaultValue : undefined;
  const [range, setRangeInternal] = useControllable<RangeValue>(
    rangeControlled,
    rangeDefault ?? { start: null, end: null },
    isRange
      ? ((v: RangeValue) => {
          const p = props as Extract<DatePickerRootProps, { mode: "range" }>;
          p.onValueChange?.(v);
        })
      : undefined,
  );

  const [open, setOpenInternal] = useControllable<boolean>(
    props.open,
    props.defaultOpen ?? false,
    props.onOpenChange,
  );

  const weekStartsOn = useMemo(
    () =>
      weekStartsOnProp !== undefined ? weekStartsOnProp : deriveWeekStartsOn(locale),
    [weekStartsOnProp, locale],
  );

  const isDisabledInternal = useCallback(
    (d: CalendarDate) => {
      if (minDate && compareCalendarDate(d, minDate) < 0) return true;
      if (maxDate && compareCalendarDate(d, maxDate) > 0) return true;
      if (userIsDisabled?.(d)) return true;
      return false;
    },
    [minDate, maxDate, userIsDisabled],
  );

  const initialMonth = useMemo(
    () =>
      deriveInitialMonth(
        currentValueDate(mode, single, range),
        minDate,
        maxDate,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [currentMonth, setCurrentMonthInternal] = useControllable<CalendarDate>(
    props.month,
    props.defaultMonth ? normalizeMonth(props.defaultMonth) : initialMonth,
    props.onMonthChange,
  );

  const [focusedDay, setFocusedDay] = useState<CalendarDate>(
    () => currentValueDate(mode, single, range) ?? todayCalendarDate(),
  );

  const [rangeHoverEnd, setRangeHoverEnd] = useState<CalendarDate | null>(null);

  const [typedRaw, setTypedRaw] = useState<string | null>(null);
  const [typedRawEnd, setTypedRawEnd] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<boolean>(false);
  const [invalidEnd, setInvalidEnd] = useState<boolean>(false);

  const [requestFocusTick, setRequestFocusTick] = useState(0);
  const requestFocusOnFocusedDay = useCallback(() => {
    setRequestFocusTick((t) => t + 1);
  }, []);

  const setCurrentMonth = useCallback(
    (m: CalendarDate) => {
      setCurrentMonthInternal(normalizeMonth(m));
    },
    [setCurrentMonthInternal],
  );

  useEffect(() => {
    if (props.month !== undefined) return;
    const target = currentValueDate(mode, single, range);
    if (!target) return;
    if (
      target.year !== currentMonth.year ||
      target.month !== currentMonth.month
    ) {
      setCurrentMonthInternal(normalizeMonth(target));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [single, range, mode, props.month]);

  useEffect(() => {
    if (!open) return;
    const target = currentValueDate(mode, single, range) ?? todayCalendarDate();
    setFocusedDay(clampToRange(target, minDate, maxDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (disabled && open) {
      setOpenInternal(false);
    }
  }, [disabled, open, setOpenInternal]);

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && disabled) return;
      setOpenInternal(next);
    },
    [disabled, setOpenInternal],
  );

  const commitSingle = useCallback(
    (v: SingleValue) => {
      setSingleInternal(v);
    },
    [setSingleInternal],
  );

  const commitRange = useCallback(
    (v: RangeValue) => {
      setRangeInternal(v);
    },
    [setRangeInternal],
  );

  const closeOnSelectResolved = closeOnSelect !== undefined ? closeOnSelect : true;

  const selectDay = useCallback(
    (d: CalendarDate) => {
      if (disabled || isDisabledInternal(d)) return;
      if (mode === "single") {
        if (!isSameDay(single, d)) commitSingle(d);
        if (closeOnSelectResolved) setOpenInternal(false);
        return;
      }
      const r = range;
      if (!r.start || (r.start && r.end)) {
        commitRange({ start: d, end: null });
        setRangeHoverEnd(null);
        return;
      }
      const cmp = compareCalendarDate(r.start, d);
      const [a, b] = cmp <= 0 ? [r.start, d] : [d, r.start];
      commitRange({ start: a, end: b });
      setRangeHoverEnd(null);
      if (closeOnSelectResolved) setOpenInternal(false);
    },
    [
      disabled,
      isDisabledInternal,
      mode,
      single,
      range,
      commitSingle,
      commitRange,
      closeOnSelectResolved,
      setOpenInternal,
    ],
  );

  const clear = useCallback(() => {
    if (mode === "single") {
      commitSingle(null);
    } else {
      commitRange({ start: null, end: null });
    }
    setTypedRaw(null);
    setTypedRawEnd(null);
    setInvalid(false);
    setInvalidEnd(false);
  }, [mode, commitSingle, commitRange]);

  const setToToday = useCallback(() => {
    const t = todayCalendarDate();
    setCurrentMonthInternal(normalizeMonth(t));
    setFocusedDay(clampToRange(t, minDate, maxDate));
  }, [minDate, maxDate, setCurrentMonthInternal]);

  const commitTyped = useCallback(
    (part: "start" | "end" | null) => {
      const raw = part === "end" ? typedRawEnd : typedRaw;
      if (raw === null) return;
      if (raw === "") {
        if (mode === "single") {
          commitSingle(null);
        } else if (part === "end") {
          commitRange({ start: range.start, end: null });
        } else {
          commitRange({ start: null, end: range.end });
        }
        if (part === "end") {
          setTypedRawEnd(null);
          setInvalidEnd(false);
        } else {
          setTypedRaw(null);
          setInvalid(false);
        }
        return;
      }
      const parsed = parseRaw(raw, format, parseMode);
      if (parsed === null || isDisabledInternal(parsed)) {
        if (part === "end") setInvalidEnd(true);
        else setInvalid(true);
        onParseError?.(raw);
        return;
      }
      if (mode === "single") {
        commitSingle(parsed);
      } else if (part === "end") {
        const s = range.start;
        if (s && compareCalendarDate(s, parsed) > 0) {
          commitRange({ start: parsed, end: s });
        } else {
          commitRange({ start: s, end: parsed });
        }
      } else {
        const e = range.end;
        if (e && compareCalendarDate(parsed, e) > 0) {
          commitRange({ start: e, end: parsed });
        } else {
          commitRange({ start: parsed, end: e });
        }
      }
      if (part === "end") {
        setTypedRawEnd(null);
        setInvalidEnd(false);
      } else {
        setTypedRaw(null);
        setInvalid(false);
      }
    },
    [
      typedRaw,
      typedRawEnd,
      mode,
      range,
      format,
      parseMode,
      isDisabledInternal,
      commitSingle,
      commitRange,
      onParseError,
    ],
  );

  const cancelTyped = useCallback((part: "start" | "end" | null) => {
    if (part === "end") {
      setTypedRawEnd(null);
      setInvalidEnd(false);
    } else {
      setTypedRaw(null);
      setInvalid(false);
    }
  }, []);

  const formatters = useMemo(
    () => ({
      monthLabel: createMonthLabelFormatter(locale),
      weekdayShort: createWeekdayShortFormatter(locale),
      ariaDate: createAriaDateFormatter(locale),
    }),
    [locale],
  );

  // suppress unused warning from format helper import in users
  void formatCalendarDate;

  return {
    mode,
    single,
    range,
    rangeHoverEnd,
    setRangeHoverEnd,
    open,
    setOpen,
    currentMonth,
    setCurrentMonth,
    focusedDay,
    setFocusedDay,
    minDate,
    maxDate,
    isDisabledInternal,
    locale,
    weekStartsOn,
    format,
    parseMode,
    selectDay,
    clear,
    setToToday,
    disabled,
    theme,
    openOnFocus,
    typedRaw,
    setTypedRaw,
    typedRawEnd,
    setTypedRawEnd,
    invalid,
    invalidEnd,
    commitTyped,
    cancelTyped,
    onParseError,
    formatters,
    closeOnSelectResolved,
    requestFocusTick,
    requestFocusOnFocusedDay,
  };
}

// make use of ref'd unused import to make linter happy without pragmas
void useRef;
