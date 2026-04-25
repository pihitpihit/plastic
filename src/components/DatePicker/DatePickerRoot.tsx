import { useId, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { DatePickerContext } from "./DatePickerContext";
import type { DatePickerContextValue } from "./DatePickerContext";
import { useDatePickerState } from "./useDatePickerState";
import {
  DatePickerCalendar,
  DatePickerFooter,
  DatePickerGrid,
  DatePickerHeader,
  DatePickerInput,
  DatePickerMonthLabel,
  DatePickerNav,
  DatePickerTrigger,
} from "./DatePicker.parts";
import { datePickerPalette } from "./DatePicker.theme";
import type { DatePickerRootProps } from "./DatePicker.types";

export function DatePickerRoot(props: DatePickerRootProps) {
  const state = useDatePickerState(props);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputEndRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const rootId = useId();
  const inputId = useId();
  const inputStartId = useId();
  const inputEndId = useId();
  const triggerId = useId();
  const dialogId = useId();
  const gridId = useId();
  const monthLabelId = useId();

  const ids = useMemo(
    () => ({
      root: rootId,
      input: inputId,
      inputStart: inputStartId,
      inputEnd: inputEndId,
      trigger: triggerId,
      dialog: dialogId,
      grid: gridId,
      monthLabel: monthLabelId,
    }),
    [
      rootId,
      inputId,
      inputStartId,
      inputEndId,
      triggerId,
      dialogId,
      gridId,
      monthLabelId,
    ],
  );

  const ctx: DatePickerContextValue = useMemo(
    () => ({
      mode: state.mode,
      single: state.single,
      range: state.range,
      rangeHoverEnd: state.rangeHoverEnd,
      setRangeHoverEnd: state.setRangeHoverEnd,
      open: state.open,
      setOpen: state.setOpen,
      currentMonth: state.currentMonth,
      setCurrentMonth: state.setCurrentMonth,
      focusedDay: state.focusedDay,
      setFocusedDay: state.setFocusedDay,
      minDate: state.minDate,
      maxDate: state.maxDate,
      isDisabledInternal: state.isDisabledInternal,
      locale: state.locale,
      weekStartsOn: state.weekStartsOn,
      format: state.format,
      parseMode: state.parseMode,
      selectDay: state.selectDay,
      clear: state.clear,
      setToToday: state.setToToday,
      disabled: state.disabled,
      theme: state.theme,
      openOnFocus: state.openOnFocus,
      typedRaw: state.typedRaw,
      setTypedRaw: state.setTypedRaw,
      typedRawEnd: state.typedRawEnd,
      setTypedRawEnd: state.setTypedRawEnd,
      invalid: state.invalid,
      invalidEnd: state.invalidEnd,
      commitTyped: state.commitTyped,
      cancelTyped: state.cancelTyped,
      onParseError: state.onParseError,
      formatters: state.formatters,
      ids,
      inputRef,
      inputEndRef,
      triggerRef,
      gridRef,
      requestFocusOnFocusedDay: state.requestFocusOnFocusedDay,
    }),
    [state, ids],
  );

  const palette = datePickerPalette[state.theme];

  const rootStyle: CSSProperties = {
    display: "inline-flex",
    flexDirection: "column",
    gap: 8,
    position: "relative",
    color: palette.inputFg,
    ...props.style,
  };

  const hasChildren = props.children !== undefined;

  const inputWrapStyle: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  };

  return (
    <DatePickerContext.Provider value={ctx}>
      <div
        role="group"
        id={ids.root}
        className={props.className}
        style={rootStyle}
        aria-label="Date picker"
        data-datepicker-root
        data-theme={state.theme}
      >
        {hasChildren ? (
          props.children
        ) : (
          <>
            <div style={inputWrapStyle}>
              {state.mode === "range" ? (
                <>
                  <DatePickerInput part="start" placeholder="Start" />
                  <span aria-hidden style={{ color: palette.inputPlaceholder }}>—</span>
                  <DatePickerInput part="end" placeholder="End" />
                  <DatePickerTrigger />
                </>
              ) : (
                <>
                  <DatePickerInput />
                  <DatePickerTrigger />
                </>
              )}
            </div>
            <DatePickerCalendar>
              <DatePickerHeader>
                <DatePickerNav direction="prev-year" />
                <DatePickerNav direction="prev-month" />
                <DatePickerMonthLabel />
                <DatePickerNav direction="next-month" />
                <DatePickerNav direction="next-year" />
              </DatePickerHeader>
              <DatePickerGrid />
              <DatePickerFooter />
            </DatePickerCalendar>
          </>
        )}
      </div>
    </DatePickerContext.Provider>
  );
}

DatePickerRoot.displayName = "DatePicker.Root";
