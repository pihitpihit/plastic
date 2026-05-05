import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CalendarContext, type CalendarContextValue, type CalendarContextValueUnion } from "./CalendarContext";
import {
  compareCalendarDate,
  isSameDay,
  normalizeDateInput,
  todayCalendarDate,
} from "./Calendar.dateMath";
import { calendarThemes } from "./Calendar.theme";
import { defaultLocale } from "./Calendar.intl";
import type {
  CalendarDate,
  CalendarMultipleValue,
  CalendarRangeValue,
  CalendarRootProps,
  CalendarSingleValue,
  WeekStart,
} from "./Calendar.types";

function defaultValueFor(mode: "single" | "range" | "multiple"): CalendarContextValueUnion {
  if (mode === "range") return { start: null, end: null } satisfies CalendarRangeValue;
  if (mode === "multiple") return [] as CalendarMultipleValue;
  return null as CalendarSingleValue;
}

export function CalendarRoot(props: CalendarRootProps) {
  const mode = (props.mode ?? "single") as "single" | "range" | "multiple";

  const {
    month: controlledMonth,
    defaultMonth,
    onMonthChange,
    minDate,
    maxDate,
    isDisabled,
    locale = defaultLocale(),
    weekStartsOn = 0 as WeekStart,
    theme = "light",
    disabled = false,
    autoFocus = false,
    className,
    style,
    children,
  } = props;

  // value (controlled / uncontrolled)
  const isValueControlled = "value" in props && props.value !== undefined;
  const initialValue = useMemo<CalendarContextValueUnion>(() => {
    if ("defaultValue" in props && props.defaultValue !== undefined) {
      return props.defaultValue as CalendarContextValueUnion;
    }
    return defaultValueFor(mode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [internalValue, setInternalValue] = useState<CalendarContextValueUnion>(initialValue);
  const value = isValueControlled
    ? ((props as { value: CalendarContextValueUnion }).value)
    : internalValue;

  const setValue = useCallback((next: CalendarContextValueUnion) => {
    if (!isValueControlled) setInternalValue(next);
    // narrow callback by mode
    if (mode === "single") {
      (props as CalendarRootProps & { onValueChange?: (v: CalendarSingleValue) => void })
        .onValueChange?.(next as CalendarSingleValue);
    } else if (mode === "range") {
      (props as CalendarRootProps & { onValueChange?: (v: CalendarRangeValue) => void })
        .onValueChange?.(next as CalendarRangeValue);
    } else {
      (props as CalendarRootProps & { onValueChange?: (v: CalendarMultipleValue) => void })
        .onValueChange?.(next as CalendarMultipleValue);
    }
  }, [isValueControlled, mode, props]);

  // month (controlled / uncontrolled)
  const initialMonth = useMemo<CalendarDate>(() => {
    if (controlledMonth) return controlledMonth;
    if (defaultMonth) return defaultMonth;
    if (mode === "single" && value) return value as CalendarDate;
    if (mode === "range") {
      const v = value as CalendarRangeValue;
      if (v.start) return v.start;
      if (v.end) return v.end;
    }
    if (mode === "multiple") {
      const v = value as CalendarMultipleValue;
      if (v.length > 0) return v[0]!;
    }
    return todayCalendarDate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [internalMonth, setInternalMonth] = useState<CalendarDate>(initialMonth);
  const month = controlledMonth ?? internalMonth;
  const setMonth = useCallback((next: CalendarDate) => {
    if (controlledMonth === undefined) setInternalMonth(next);
    onMonthChange?.(next);
  }, [controlledMonth, onMonthChange]);

  // focus
  const [focusedDay, setFocusedDay] = useState<CalendarDate | null>(null);

  // range preview
  const [rangePreviewEnd, setRangePreviewEnd] = useState<CalendarDate | null>(null);

  // disabled predicate (combined min/max + custom)
  const minDateNorm = useMemo(() => normalizeDateInput(minDate), [minDate]);
  const maxDateNorm = useMemo(() => normalizeDateInput(maxDate), [maxDate]);
  const isDisabledDay = useCallback(
    (d: CalendarDate) => {
      if (minDateNorm && compareCalendarDate(d, minDateNorm) < 0) return true;
      if (maxDateNorm && compareCalendarDate(d, maxDateNorm) > 0) return true;
      if (isDisabled?.(d)) return true;
      return false;
    },
    [minDateNorm, maxDateNorm, isDisabled],
  );

  const selectDay = useCallback(
    (day: CalendarDate) => {
      if (disabled || isDisabledDay(day)) return;

      if (mode === "single") {
        setValue(day);
        (props as CalendarRootProps & { onSelect?: (d: CalendarDate) => void }).onSelect?.(day);
      } else if (mode === "range") {
        const cur = value as CalendarRangeValue;
        let next: CalendarRangeValue;
        if (cur.start === null || (cur.start !== null && cur.end !== null)) {
          next = { start: day, end: null };
        } else {
          if (compareCalendarDate(day, cur.start) < 0) {
            next = { start: day, end: cur.start };
          } else {
            next = { start: cur.start, end: day };
          }
        }
        setValue(next);
        if (next.start && next.end) {
          (props as CalendarRootProps & { onSelect?: (r: CalendarRangeValue) => void }).onSelect?.(next);
        }
      } else if (mode === "multiple") {
        const cur = value as CalendarMultipleValue;
        const idx = cur.findIndex((d) => isSameDay(d, day));
        let next: CalendarMultipleValue;
        if (idx >= 0) {
          next = [...cur.slice(0, idx), ...cur.slice(idx + 1)];
        } else {
          next = [...cur, day].sort(compareCalendarDate);
        }
        setValue(next);
        (props as CalendarRootProps & { onSelect?: (d: CalendarMultipleValue) => void }).onSelect?.(next);
      }
    },
    [disabled, isDisabledDay, mode, value, setValue, props],
  );

  // autoFocus (mount 시 첫 cell 포커스)
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const initialFocus: CalendarDate = (() => {
      if (mode === "single" && value) return value as CalendarDate;
      if (mode === "range") {
        const v = value as CalendarRangeValue;
        if (v.start) return v.start;
      }
      if (mode === "multiple") {
        const v = value as CalendarMultipleValue;
        if (v.length > 0) return v[0]!;
      }
      return todayCalendarDate();
    })();
    setFocusedDay(initialFocus);
    requestAnimationFrame(() => {
      const cell = rootRef.current?.querySelector<HTMLElement>(`[data-day-focused="true"]`);
      cell?.focus();
    });
  }, [autoFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  const tokens = calendarThemes[theme];

  const ctx: CalendarContextValue = useMemo(
    () => ({
      mode,
      value,
      setValue,
      month,
      setMonth,
      isDisabledDay,
      focusedDay,
      setFocusedDay,
      rangePreviewEnd,
      setRangePreviewEnd,
      selectDay,
      locale,
      weekStartsOn,
      theme,
      disabled,
    }),
    [mode, value, setValue, month, setMonth, isDisabledDay, focusedDay, rangePreviewEnd, selectDay, locale, weekStartsOn, theme, disabled],
  );

  const rootStyle: CSSProperties = {
    display: "inline-block",
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: 8,
    fontFamily: "inherit",
    boxSizing: "border-box",
    ...style,
  };

  return (
    <CalendarContext.Provider value={ctx}>
      <div
        ref={rootRef}
        role="application"
        aria-label="Calendar"
        aria-disabled={disabled || undefined}
        className={className}
        style={rootStyle}
      >
        {children}
      </div>
    </CalendarContext.Provider>
  );
}

CalendarRoot.displayName = "Calendar.Root";
