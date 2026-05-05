import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { Calendar } from "../Calendar";
import type {
  CalendarDate,
  CalendarMultipleValue,
  CalendarRangeValue,
  CalendarSingleValue,
} from "../Calendar/Calendar.types";
import { useDatePickerContext } from "./DatePickerContext";
import { datePickerPalette } from "./DatePicker.theme";
import { formatCalendarDate, parseRaw } from "./DatePicker.format";
import type {
  DatePickerCalendarProps,
  DatePickerDayProps,
  DatePickerFooterProps,
  DatePickerGridProps,
  DatePickerHeaderProps,
  DatePickerInputProps,
  DatePickerMonthLabelProps,
  DatePickerNavProps,
  DatePickerTriggerProps,
} from "./DatePicker.types";

// ── DatePickerInput ─────────────────────────────────────────────────────────

export function DatePickerInput(props: DatePickerInputProps) {
  const { placeholder, className, style, part, "aria-label": ariaLabel } = props;
  const ctx = useDatePickerContext();
  const palette = datePickerPalette[ctx.theme];
  const [hovered, setHovered] = useState(false);

  // 표시 값 결정
  const isEnd = part === "end";
  const formattedValue = (() => {
    if (ctx.mode === "single") {
      return ctx.single ? formatCalendarDate(ctx.single, ctx.format) : "";
    }
    const v = isEnd ? ctx.range.end : ctx.range.start;
    return v ? formatCalendarDate(v, ctx.format) : "";
  })();

  const typed = isEnd ? ctx.typedRawEnd : ctx.typedRaw;
  const display = typed !== null ? typed : formattedValue;

  const isInvalid = isEnd ? ctx.invalidEnd : ctx.invalid;

  const inputRef = part === "end" ? ctx.inputEndRef : ctx.inputRef;
  const inputId = part === "start" ? ctx.ids.inputStart : part === "end" ? ctx.ids.inputEnd : ctx.ids.input;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (isEnd) ctx.setTypedRawEnd(v);
    else ctx.setTypedRaw(v);
  };

  const handleBlur = (_e: FocusEvent<HTMLInputElement>) => {
    ctx.commitTyped(part ?? null);
  };

  const handleFocus = () => {
    if (ctx.openOnFocus && !ctx.disabled) ctx.setOpen(true);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      ctx.commitTyped(part ?? null);
    } else if (e.key === "Escape") {
      e.preventDefault();
      ctx.cancelTyped(part ?? null);
      ctx.setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      ctx.setOpen(true);
      ctx.requestFocusOnFocusedDay();
    }
  };

  const baseStyle: CSSProperties = {
    background: palette.inputBg,
    color: palette.inputFg,
    border: `1px solid ${
      isInvalid ? palette.inputError : hovered ? palette.inputFocusRing : palette.border
    }`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    minWidth: 130,
    boxSizing: "border-box",
    transition: "border-color 120ms ease",
    ...style,
  };

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      id={inputId}
      type="text"
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={ctx.open}
      aria-controls={ctx.ids.dialog}
      aria-invalid={isInvalid || undefined}
      aria-label={ariaLabel ?? (part === "end" ? "End date" : part === "start" ? "Start date" : "Date")}
      value={display}
      placeholder={placeholder ?? ctx.format}
      disabled={ctx.disabled}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={baseStyle}
      data-datepicker-input
      data-part={part}
    />
  );
}
DatePickerInput.displayName = "DatePicker.Input";

// ── DatePickerTrigger ────────────────────────────────────────────────────────

export function DatePickerTrigger(props: DatePickerTriggerProps) {
  const { className, style, children, "aria-label": ariaLabel } = props;
  const ctx = useDatePickerContext();
  const palette = datePickerPalette[ctx.theme];
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (ctx.disabled) return;
    ctx.setOpen(!ctx.open);
  };

  const baseStyle: CSSProperties = {
    background: hovered && !ctx.disabled ? palette.navHoverBg : palette.inputBg,
    color: palette.inputFg,
    border: `1px solid ${palette.border}`,
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: ctx.disabled ? "not-allowed" : "pointer",
    opacity: ctx.disabled ? 0.5 : 1,
    transition: "background 120ms ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    ...style,
  };

  return (
    <button
      ref={ctx.triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      id={ctx.ids.trigger}
      aria-label={ariaLabel ?? "Open calendar"}
      aria-haspopup="dialog"
      aria-expanded={ctx.open}
      aria-controls={ctx.ids.dialog}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={ctx.disabled}
      className={className}
      style={baseStyle}
    >
      {children ?? "📅"}
    </button>
  );
}
DatePickerTrigger.displayName = "DatePicker.Trigger";

// ── DatePickerCalendar (popover container + Calendar.Root bridge) ────────────

export function DatePickerCalendar(props: DatePickerCalendarProps) {
  const { className, style, children } = props;
  const ctx = useDatePickerContext();
  const palette = datePickerPalette[ctx.theme];

  // outside click
  useEffect(() => {
    if (!ctx.open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      const trigger = ctx.triggerRef.current;
      const grid = ctx.gridRef.current;
      const input = ctx.inputRef.current;
      const inputEnd = ctx.inputEndRef.current;
      if (
        (trigger && trigger.contains(t)) ||
        (grid && grid.contains(t)) ||
        (input && input.contains(t)) ||
        (inputEnd && inputEnd.contains(t))
      ) {
        return;
      }
      ctx.setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [ctx.open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc
  useEffect(() => {
    if (!ctx.open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        ctx.setOpen(false);
        ctx.triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown as unknown as EventListener);
    return () =>
      document.removeEventListener("keydown", onKeyDown as unknown as EventListener);
  }, [ctx.open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ctx.open) return null;

  // bridged value to Calendar
  const value =
    ctx.mode === "range"
      ? (ctx.range as CalendarRangeValue)
      : (ctx.single as CalendarSingleValue);

  const handleValueChange = (
    v: CalendarSingleValue | CalendarRangeValue | CalendarMultipleValue,
  ) => {
    if (ctx.mode === "single") {
      // selectDay handles close + commit; we use selectDay path through onSelect for close
      // but value change needs to commit. Use selectDay directly via onSelect for completeness.
      // Here, just commit via selectDay if a non-null date.
      const next = v as CalendarSingleValue;
      if (next) ctx.selectDay(next);
    } else if (ctx.mode === "range") {
      const next = v as CalendarRangeValue;
      // Calendar's selectDay produces full range progressions; map to DatePicker.selectDay
      // by selecting whichever day is "the new edit".
      // Since we pass controlled value, Calendar already has the right next state.
      // We need to commit it via the appropriate range setter.
      // The simplest: detect which day was clicked (last touched).
      // Here, defer: just call selectDay on the most recently changed boundary.
      // But Calendar already calls setValue internally. Translate:
      // - if start changed and end null: a new range starting at start.
      // - if end is now set: completion.
      // We use the CalendarRangeValue directly (DatePicker doesn't care about
      // which click triggered it; selectDay will be called via Calendar.Day's
      // own onClick, NOT via this onValueChange).
      // So we need a different approach — see below: pass selectDay through Calendar.Day's onClick
      // override. For now, this onValueChange only fires from controlled value changes from
      // Calendar.Root.setValue. We mirror to range state.
      // (Compatibility) — call commitRange directly:
      // We don't have a direct commitRange in context, but selectDay handles the click flow.
      // Simpler: ignore onValueChange and rely on Day onClick override below.
    }
  };

  const dialogStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    zIndex: 1000,
    background: palette.calendarBg,
    border: `1px solid ${palette.calendarBorder}`,
    borderRadius: 8,
    boxShadow: palette.calendarShadow,
    padding: 0,
    ...style,
  };

  // mode-specific props for Calendar.Root (discriminated union)
  const calendarRootProps =
    ctx.mode === "range"
      ? ({
          mode: "range" as const,
          value: ctx.range as CalendarRangeValue,
          onValueChange: (v: CalendarRangeValue) => handleValueChange(v),
        })
      : ({
          mode: "single" as const,
          value: ctx.single as CalendarSingleValue,
          onValueChange: (v: CalendarSingleValue) => handleValueChange(v),
        });

  return (
    <div
      role="dialog"
      id={ctx.ids.dialog}
      aria-label="Calendar"
      aria-modal="false"
      ref={ctx.gridRef as React.RefObject<HTMLDivElement>}
      className={className}
      style={dialogStyle}
    >
      <Calendar.Root
        {...calendarRootProps}
        month={ctx.currentMonth}
        onMonthChange={ctx.setCurrentMonth}
        isDisabled={ctx.isDisabledInternal}
        locale={ctx.locale}
        weekStartsOn={ctx.weekStartsOn as 0 | 1 | 2 | 3 | 4 | 5 | 6}
        theme={ctx.theme}
        disabled={ctx.disabled}
        autoFocus={ctx.open}
        style={{ border: "none", borderRadius: 8, padding: 8 }}
      >
        {children}
      </Calendar.Root>
    </div>
  );
}
DatePickerCalendar.displayName = "DatePicker.Calendar";

// ── Header / Nav / MonthLabel — alias-style wrappers ────────────────────────

export function DatePickerHeader(props: DatePickerHeaderProps) {
  return <Calendar.Header {...props} />;
}
DatePickerHeader.displayName = "DatePicker.Header";

export function DatePickerNav(props: DatePickerNavProps) {
  return <Calendar.Nav {...props} />;
}
DatePickerNav.displayName = "DatePicker.Nav";

export function DatePickerMonthLabel(props: DatePickerMonthLabelProps) {
  return <Calendar.MonthLabel {...props} />;
}
DatePickerMonthLabel.displayName = "DatePicker.MonthLabel";

// ── Grid (combines WeekdayHeader + Calendar.Grid for DatePicker default) ─────

export function DatePickerGrid(props: DatePickerGridProps) {
  const { className, style, children } = props;

  return (
    <div className={className} style={style}>
      <Calendar.WeekdayHeader />
      {children !== undefined ? (
        <Calendar.Grid>{children}</Calendar.Grid>
      ) : (
        <Calendar.Grid />
      )}
    </div>
  );
}
DatePickerGrid.displayName = "DatePicker.Grid";

// ── Day — wraps Calendar.Day, but onClick routes to DatePicker.selectDay ────

export function DatePickerDay(props: DatePickerDayProps) {
  const { day, className, style } = props;
  const ctx = useDatePickerContext();

  // Override onClick to use DatePicker's selectDay (which handles close + range progression)
  const handleClick = useCallback(
    (date: CalendarDate) => {
      ctx.selectDay(date);
    },
    [ctx],
  );

  return (
    <Calendar.Day
      day={day}
      onClick={handleClick}
      {...(className !== undefined ? { className } : {})}
      {...(style !== undefined ? { style } : {})}
    />
  );
}
DatePickerDay.displayName = "DatePicker.Day";

// ── Footer (Today + Clear buttons) ───────────────────────────────────────────

export function DatePickerFooter(props: DatePickerFooterProps) {
  const { className, style, children } = props;
  const ctx = useDatePickerContext();
  const palette = datePickerPalette[ctx.theme];

  const baseStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    padding: "8px 8px 4px",
    borderTop: `1px solid ${palette.footerBorder}`,
    marginTop: 4,
    ...style,
  };

  if (children !== undefined) {
    return (
      <div className={className} style={baseStyle}>
        {children}
      </div>
    );
  }

  return (
    <div className={className} style={baseStyle}>
      <FooterButton onClick={ctx.setToToday} palette={palette}>
        Today
      </FooterButton>
      <FooterButton onClick={ctx.clear} palette={palette}>
        Clear
      </FooterButton>
    </div>
  );
}
DatePickerFooter.displayName = "DatePicker.Footer";

function FooterButton({
  onClick,
  palette,
  children,
}: {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  palette: typeof datePickerPalette["light"];
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? palette.ghostHoverBg : "transparent",
        border: "none",
        color: palette.ghostFg,
        padding: "4px 10px",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 12,
        fontFamily: "inherit",
        transition: "background 120ms ease",
      }}
    >
      {children}
    </button>
  );
}
