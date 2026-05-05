# Calendar 컴포넌트 설계문서 (DatePicker에서 분리)

## Context

현재 진행 중인 `DatePicker`(plan 015, `feat/datepicker-component` 브랜치)의 표현 부분 중 **달력 그리드(월 뷰 + 요일 헤더 + 네비게이션 + 날짜 셀)**를 단독 컴포넌트 `Calendar`로 분리한다. 분리 후 DatePicker는 자기 popover 안에서 `<Calendar />`를 사용하는 구조로 리팩토링된다.

**왜 지금이 분리 적기인가**: DatePicker가 현재 타입·유틸·테마·Context+상태+데모까지 진행되었고, **다음 단계가 정확히 달력 그리드 표현 컴포넌트(`DatePicker.Grid`, `DatePicker.Day`, `DatePicker.Header`, `DatePicker.Nav` 등)**다. 이 표현 부분을 처음부터 별도 `Calendar` 컴포넌트로 만들고 DatePicker가 import하는 구조로 가면 향후 리팩토링 비용 0 + 단독 활용 자산 확보. 만약 그리드 로직이 DatePicker 안에 먼저 작성되어버리면 분리 비용이 100배 커진다.

**Calendar 단독 활용 사례**:
- 일정 보드/이벤트 마킹 캘린더 (input 없이 month grid만 필요)
- DateRangePicker (Calendar 두 개 또는 single Calendar에 range mode)
- ScheduleView, AgendaView 같은 향후 컴포넌트의 기반
- 달력 디스플레이가 필요한 임의 기능 (출석 그리드, 통계 캘린더)

**범위 결정의 핵심**: Calendar는 "월 그리드 + 날짜 선택 표면". 입력값 표시 (`<input>` + format/parse), popover 트리거, footer, ranges 빠른 선택 칩 등은 DatePicker가 담당. **표시 vs 입력의 명확한 분리**가 본 작업의 가장 중요한 설계 결정.

참고 (prior art — calendar / date selection):
- **react-day-picker** — 완성도 높은 표준 레퍼런스. `mode="single" | "range" | "multiple"`, `selected`, `onSelect`, `disabled`, `modifiers`, `locale`. Calendar 단독 컴포넌트.
- **Radix UI** — DatePicker/Calendar primitive 부재 (커뮤니티 의존).
- **react-aria** — `useCalendar` hook 기반 headless. `useCalendarGrid`, `useCalendarCell`, `useRangeCalendar`. CalendarDate 객체 기반 timezone-safe.
- **MUI X DatePicker** — `DateCalendar` 단독 export. mode/views(`day | month | year`).
- **Mantine `Calendar`, `MonthPickerInput`, `DatePickerInput`** — 셋이 분리됨. Calendar가 가장 기본 primitive.
- **Ant Design `Calendar`** — 큰 풀-페이지 캘린더 (full-screen). 일반 input picker와 별개.
- **vue-cal**, **FullCalendar** — 이벤트 캘린더 (v1 범위 외, ScheduleView 후보).

본 레포 내부 참조 (읽어야 할 파일 — 모두 현재 DatePicker 구현 중인 것):
- `src/components/DatePicker/DatePicker.types.ts` (141줄) — `CalendarDate`, `SingleValue`, `RangeValue`, `WeekStart`, `DatePickerDayInfo` 등. **본 작업으로 일부 타입이 Calendar로 이동**.
- `src/components/DatePicker/DatePicker.dateMath.ts` (106줄) — date 산수 유틸. **전부 Calendar로 이동**.
- `src/components/DatePicker/DatePicker.intl.ts` (29줄) — locale 정보. **Calendar로 이동**.
- `src/components/DatePicker/DatePicker.theme.ts` (116줄) — 테마. Calendar 관련 부분만 분리.
- `src/components/DatePicker/DatePicker.format.ts` (183줄) — format/parse. **DatePicker에 유지** (input 표시용).
- `src/components/DatePicker/useDatePickerState.ts` (446줄) — 상태. Calendar 관련 부분(focused day, selection 적용) 일부 분리, 나머지(input value, parse error, popover open) DatePicker 유지.
- `src/components/DatePicker/DatePickerRoot.tsx` (173줄) — 본 작업 후 Calendar import + 합성.
- `src/components/DatePicker/DatePicker.parts.tsx` (39줄) — sub-component 합성. 본 작업 후 일부가 Calendar의 sub-component로 이동.
- `src/components/DatePicker/index.ts` — export. Calendar 신설 후 DatePicker는 Calendar 일부 타입을 re-export.
- `src/components/index.ts` — Calendar 추가.
- `src/components/_shared/useFloating.ts` — DatePicker가 popover로 사용 (Calendar는 floating 무관).

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 1. 단독 사용 — 단일 날짜 선택 캘린더
<Calendar.Root mode="single" onSelect={(d) => console.log(d)}>
  <Calendar.Header>
    <Calendar.Nav direction="prev-month" />
    <Calendar.MonthLabel />
    <Calendar.Nav direction="next-month" />
  </Calendar.Header>
  <Calendar.Grid />  {/* 자동으로 7x6 그리드 + 요일 헤더 */}
</Calendar.Root>

// 2. range 모드
<Calendar.Root mode="range" onSelect={({start, end}) => ...}>
  <Calendar.Header>...</Calendar.Header>
  <Calendar.Grid />
</Calendar.Root>

// 3. 다중 선택
<Calendar.Root mode="multiple" onSelect={(dates) => ...}>...

// 4. controlled
<Calendar.Root
  mode="single"
  value={selectedDate}
  onValueChange={setSelectedDate}
  month={visibleMonth}
  onMonthChange={setVisibleMonth}
>...

// 5. 비활성 날짜
<Calendar.Root
  minDate={{year:2026, month:1, day:1}}
  maxDate={{year:2026, month:12, day:31}}
  isDisabled={(d) => weekdayOf(d) === 0}  // 일요일 비활성
>

// 6. 커스텀 day 렌더 (이벤트 마킹 등)
<Calendar.Grid>
  {(day) => (
    <Calendar.Day day={day}>
      {day.date.day}
      {hasEvent(day.date) && <span style={{color:'red'}}>•</span>}
    </Calendar.Day>
  )}
</Calendar.Grid>

// 7. DatePicker 내부 사용 (DatePicker가 Calendar를 합성)
<DatePicker.Root mode="single" value={...} onValueChange={...}>
  <DatePicker.Input />
  <DatePicker.Trigger />
  <DatePicker.Popover>
    <Calendar.Root mode="single" /* DatePicker context에서 props 자동 inherit */>
      <Calendar.Header>...</Calendar.Header>
      <Calendar.Grid />
    </Calendar.Root>
  </DatePicker.Popover>
</DatePicker.Root>
```

핵심 설계 원칙:
- **compound 컴포넌트 패턴** — `Calendar.Root` (Context provider) + `Header` + `Nav` + `MonthLabel` + `WeekdayHeader` + `Grid` + `Day`. 사용자가 자유 합성.
- **mode 기반 다형성** — `single` / `range` / `multiple`. 같은 컴포넌트 트리, value 타입만 다름.
- **DatePicker와의 관계**: Calendar는 자체 Context를 가지며 단독으로 완전히 작동. DatePicker는 Calendar 외부에서 popover 컨테이너 + input 표시 + format/parse 담당. **상태 동기화는 DatePicker 측에서 책임**.
- **headless / 오버라이드 가능** — 모든 sub-component가 className/style 받음. 색상은 `CalendarTheme` 토큰으로 관리.
- **a11y**: `role="application"` (표준 캘린더 패턴) + Arrow 키 네비 + Home/End/PgUp/PgDn + Enter 선택 + `aria-label` 동적.
- **42칸 고정 grid** — 6주 × 7일 = 42 셀. 항상 lead/trail 일자 포함 (이전·다음 달 날짜).
- **timezone-safe `CalendarDate`** — `{ year, month(1-indexed), day }`. JS Date 객체 회피해 timezone 버그 원천 차단.
- **i18n**: `locale` prop + Intl API. `weekStartsOn` 별도 prop.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `Calendar.Root` — Context provider, mode/value/month/locale/disabled 처리.
2. `Calendar.Header` — 네비게이션 + 월/년 라벨 컨테이너.
3. `Calendar.Nav` — `direction: "prev-year" | "prev-month" | "next-month" | "next-year"` 버튼.
4. `Calendar.MonthLabel` — 현재 보이는 월/년 텍스트 (locale 인식).
5. `Calendar.WeekdayHeader` — 요일 머리글 행 (Mon-Sun, locale + weekStartsOn 인식).
6. `Calendar.Grid` — 42칸 날짜 그리드. children render prop 옵셔널 (커스텀 day 렌더).
7. `Calendar.Day` — 단일 날짜 셀. `day: CalendarDayInfo` prop.
8. **3가지 mode**: `single` (CalendarDate | null), `range` ({start, end}), `multiple` (CalendarDate[]).
9. **controlled / uncontrolled** 모두 지원 — `value`/`defaultValue`/`onValueChange`, `month`/`defaultMonth`/`onMonthChange`.
10. **min/max + isDisabled predicate** — 날짜 비활성.
11. **range preview** — range 모드에서 hover 시 preview 표시 (start만 있을 때 hover 위치까지 회색 음영).
12. **키보드 네비게이션**:
    - Arrow: 좌(=−1일), 우(=+1일), 위(=−7일), 아래(=+7일).
    - Home: 주 시작일, End: 주 마지막 일.
    - PgUp: 이전 달 같은 일자, PgDn: 다음 달.
    - Shift+PgUp/PgDn: 이전/다음 년.
    - Enter/Space: 선택.
    - Esc: focus 해제 (popover에서는 닫힘 — DatePicker 책임).
13. **포커스 관리** — focused day (visual cursor) 자동 유지. Tab으로 진입 시 selected 또는 today에 포커스.
14. **i18n** — `locale` (Intl 사용), `weekStartsOn`.
15. **테마** — `light` / `dark` + 사용자 색상 override.
16. **DatePicker와의 통합** — Calendar는 외부 ref/Context로 DatePicker와 통신 가능 (선택 시 popover 닫기 등).
17. **타입 export** — `CalendarDate`, `CalendarDayInfo`, `CalendarMode`, `CalendarTheme`, `WeekStart` 등.
18. 배럴 — `export * from "./Calendar"`.

### Non-goals (v1 제외)
- **time 선택** — TimePicker는 별도 후보 (검토 대상). Calendar는 날짜만.
- **datetime 합성** — 위 동일.
- **이벤트 마킹 baked-in** — 사용자가 `<Calendar.Day>{children}</Calendar.Day>`로 직접 주입.
- **week-view / agenda-view / multi-month** — `WeekView`, `AgendaView`는 향후 후보.
- **연도 picker / month picker view** — 다른 view (Mantine은 `views: "day" | "month" | "year"` 지원). v1은 day view만.
- **드래그 선택 range** — range는 클릭 1, 클릭 2 패턴만.
- **휠 스크롤 month 네비** — 키보드 + 버튼만.
- **input 처리** — DatePicker 책임.
- **popover 통합** — DatePicker 책임.
- **timezone awareness** — CalendarDate가 timezone-naive. 사용자가 timezone 처리 책임.
- **lunar/Hijri/이슬람력** 등 비-그레고리력 — Intl API 의존이지만 v1은 그레고리력만 검증.
- **persian-style numerals 자동 변환** — locale="fa-IR" 등에서 숫자 시각만 변환 (Intl이 알아서 처리).

---

## 2. 공개 API

### 2.1 타입 — `src/components/Calendar/Calendar.types.ts`

```ts
import type { CSSProperties, ReactNode } from "react";

export type CalendarTheme = "light" | "dark";
export type CalendarMode = "single" | "range" | "multiple";

/** Year 절대값, month 1-12 (1-indexed), day 1-31. JS Date 회피. */
export interface CalendarDate {
  year: number;
  month: number; // 1 = January
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

/** 한 셀에 전달되는 날짜 메타. */
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

/** Root props 공통. */
interface CalendarRootBase {
  /** Calendar 표시 월. controlled. */
  month?: CalendarDate;
  defaultMonth?: CalendarDate;
  onMonthChange?: (month: CalendarDate) => void;

  /** 비활성 날짜 처리. */
  minDate?: CalendarDate | Date;
  maxDate?: CalendarDate | Date;
  isDisabled?: (day: CalendarDate) => boolean;

  /** locale, weekStartsOn. 기본: locale=navigator.language, weekStartsOn=0. */
  locale?: string;
  weekStartsOn?: WeekStart;

  /** 테마. 기본 "light". */
  theme?: CalendarTheme;

  /** Calendar 전체 비활성 (포커스/선택 모두 차단). */
  disabled?: boolean;

  /** 자동 포커스 (mount 시 today 또는 selected에 포커스). 기본 false. */
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
  /** 선택 시 트리거 (pop close 등 외부 액션 알림용). */
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
  /**
   * 라벨 포맷.
   * - "long" (기본): "January 2026"
   * - "short": "Jan 2026"
   * - 사용자 정의: (month, locale) => string
   */
  format?: "long" | "short" | ((month: CalendarDate, locale: string) => string);
  className?: string;
  style?: CSSProperties;
}

export interface CalendarWeekdayHeaderProps {
  /**
   * 요일 표시 형식.
   * - "narrow" (기본): "M" "T" "W" ...
   * - "short": "Mon" "Tue" ...
   * - "long": "Monday" "Tuesday" ...
   */
  format?: "narrow" | "short" | "long";
  className?: string;
  style?: CSSProperties;
}

export interface CalendarGridProps {
  /**
   * 커스텀 day 렌더. 미지정 시 기본 `<Calendar.Day>` 사용.
   * 지정 시 사용자가 자유로운 셀 컨텐츠 합성 가능.
   */
  children?: (day: CalendarDayInfo) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface CalendarDayProps {
  /** 셀이 표현하는 날짜 메타. */
  day: CalendarDayInfo;
  /** 셀 클릭 핸들러 override (기본 Calendar Context의 select 호출). */
  onClick?: (date: CalendarDate) => void;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}
```

### 2.2 utils — `src/components/Calendar/Calendar.dateMath.ts`

`DatePicker.dateMath.ts`의 모든 함수를 그대로 이동:

```ts
// (DatePicker.dateMath.ts에서 100% 이동)
export function isValidCalendarDate(c: CalendarDate): boolean { ... }
export function compareCalendarDate(a, b): number { ... }
export function isSameDay(a, b): boolean { ... }
export function getDaysInMonth(year, month): number { ... }
export function startOfMonthWeekday(year, month): number { ... }
export function addMonths(c, delta): CalendarDate { ... }
export function addDays(c, delta): CalendarDate { ... }
export function addYears(c, delta): CalendarDate { ... }
export function todayCalendarDate(): CalendarDate { ... }
export function orderedWeekdays(weekStartsOn): number[] { ... }
export function toCalendarDate(d): CalendarDate { ... }
export function toDate(c): Date { ... }
export function normalizeDateInput(input): CalendarDate | null { ... }
export function weekdayOf(c): number { ... }
export function buildMonthGrid(currentMonth, weekStartsOn): CalendarDate[] { ... }
export function clampToRange(c, minDate, maxDate): CalendarDate { ... }
```

### 2.3 intl — `src/components/Calendar/Calendar.intl.ts`

`DatePicker.intl.ts`의 locale 관련 함수 이동.

```ts
export function getMonthLabel(
  month: CalendarDate,
  locale: string,
  format: "long" | "short" = "long",
): string {
  const date = new Date(month.year, month.month - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: format, year: "numeric" }).format(date);
}

export function getWeekdayLabel(
  weekday: number, // 0-6
  locale: string,
  format: "narrow" | "short" | "long" = "narrow",
): string {
  // 임의 기준 일자에서 해당 요일 가져오기 (1970-01-04는 일요일)
  const date = new Date(1970, 0, 4 + weekday);
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(date);
}

export function defaultLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en-US";
}
```

### 2.4 theme — `src/components/Calendar/Calendar.theme.ts`

DatePicker.theme.ts에서 Calendar 관련 부분 추출:

```ts
export interface CalendarThemeTokens {
  // Container
  bg: string;
  border: string;

  // Header / Nav
  navBtn: string;
  navBtnHover: string;
  monthLabel: string;

  // Weekday header
  weekdayFg: string;

  // Day cell
  dayFg: string;
  dayBg: string;
  dayBgHover: string;
  dayFgMuted: string;       // 다른 달 날짜
  dayFgToday: string;
  dayBorderToday: string;
  dayBgSelected: string;
  dayFgSelected: string;
  dayBgRange: string;       // range 사이 음영
  dayBgRangePreview: string;
  dayFgDisabled: string;
  dayBgDisabled: string;
  dayBgFocused: string;     // 포커스 ring (또는 outline)

  // Disabled state
  disabledOpacity: number;
}

export const calendarThemes: Record<CalendarTheme, CalendarThemeTokens> = {
  light: {
    bg: "#ffffff",
    border: "rgba(0,0,0,0.08)",
    navBtn: "#6b7280",
    navBtnHover: "#111827",
    monthLabel: "#111827",
    weekdayFg: "#9ca3af",
    dayFg: "#111827",
    dayBg: "transparent",
    dayBgHover: "#f3f4f6",
    dayFgMuted: "#cbd5e1",
    dayFgToday: "#2563eb",
    dayBorderToday: "#2563eb",
    dayBgSelected: "#2563eb",
    dayFgSelected: "#ffffff",
    dayBgRange: "rgba(37,99,235,0.10)",
    dayBgRangePreview: "rgba(37,99,235,0.05)",
    dayFgDisabled: "#cbd5e1",
    dayBgDisabled: "transparent",
    dayBgFocused: "rgba(37,99,235,0.18)",
    disabledOpacity: 0.5,
  },
  dark: {
    bg: "#1f2937",
    border: "rgba(255,255,255,0.08)",
    navBtn: "#9ca3af",
    navBtnHover: "#e5e7eb",
    monthLabel: "#e5e7eb",
    weekdayFg: "#6b7280",
    dayFg: "#e5e7eb",
    dayBg: "transparent",
    dayBgHover: "#374151",
    dayFgMuted: "#4b5563",
    dayFgToday: "#60a5fa",
    dayBorderToday: "#60a5fa",
    dayBgSelected: "#60a5fa",
    dayFgSelected: "#0f172a",
    dayBgRange: "rgba(96,165,250,0.18)",
    dayBgRangePreview: "rgba(96,165,250,0.10)",
    dayFgDisabled: "#4b5563",
    dayBgDisabled: "transparent",
    dayBgFocused: "rgba(96,165,250,0.28)",
    disabledOpacity: 0.5,
  },
};
```

### 2.5 Context — `src/components/Calendar/CalendarContext.ts`

```ts
import { createContext, useContext } from "react";
import type {
  CalendarDate,
  CalendarMode,
  CalendarSingleValue,
  CalendarRangeValue,
  CalendarMultipleValue,
  CalendarTheme,
  WeekStart,
} from "./Calendar.types";

export interface CalendarContextValue {
  mode: CalendarMode;

  // value (mode에 따라 union)
  value: CalendarSingleValue | CalendarRangeValue | CalendarMultipleValue;
  setValue: (next: any) => void;

  // 보이는 월 (uncontrolled은 내부 state, controlled은 prop)
  month: CalendarDate;
  setMonth: (next: CalendarDate) => void;

  // 비활성 판정
  isDisabledDay: (day: CalendarDate) => boolean;

  // 포커스
  focusedDay: CalendarDate | null;
  setFocusedDay: (d: CalendarDate | null) => void;

  // range preview (range 모드 전용)
  rangePreviewEnd: CalendarDate | null;
  setRangePreviewEnd: (d: CalendarDate | null) => void;

  // 클릭/선택 (mode에 따라 동작 다름)
  selectDay: (day: CalendarDate) => void;

  // 설정
  locale: string;
  weekStartsOn: WeekStart;
  theme: CalendarTheme;
  disabled: boolean;

  // 외부 알림
  onSelect?: (value: any) => void;
}

export const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendarContext(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) {
    throw new Error("Calendar.* components must be used within Calendar.Root");
  }
  return ctx;
}
```

### 2.6 메인 컴포넌트 합성 — `src/components/Calendar/Calendar.tsx`

```tsx
import { CalendarRoot } from "./CalendarRoot";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarNav } from "./CalendarNav";
import { CalendarMonthLabel } from "./CalendarMonthLabel";
import { CalendarWeekdayHeader } from "./CalendarWeekdayHeader";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarDay } from "./CalendarDay";

export const Calendar = {
  Root: CalendarRoot,
  Header: CalendarHeader,
  Nav: CalendarNav,
  MonthLabel: CalendarMonthLabel,
  WeekdayHeader: CalendarWeekdayHeader,
  Grid: CalendarGrid,
  Day: CalendarDay,
};
```

### 2.7 배럴 — `src/components/Calendar/index.ts`

```ts
export { Calendar } from "./Calendar";
export type {
  CalendarRootProps,
  CalendarRootSingleProps,
  CalendarRootRangeProps,
  CalendarRootMultipleProps,
  CalendarHeaderProps,
  CalendarNavProps,
  CalendarMonthLabelProps,
  CalendarWeekdayHeaderProps,
  CalendarGridProps,
  CalendarDayProps,
  CalendarDate,
  CalendarDayInfo,
  CalendarMode,
  CalendarSingleValue,
  CalendarRangeValue,
  CalendarMultipleValue,
  CalendarTheme,
  CalendarThemeTokens,
  WeekStart,
} from "./Calendar.types";
export {
  isSameDay,
  isValidCalendarDate,
  compareCalendarDate,
  todayCalendarDate,
  toCalendarDate,
  toDate,
  weekdayOf,
} from "./Calendar.dateMath";
```

---

## 3. 파일 구조

```
src/components/Calendar/
├── Calendar.types.ts             ← 타입
├── Calendar.dateMath.ts          ← date 산수 (DatePicker.dateMath.ts에서 이동)
├── Calendar.intl.ts              ← locale (DatePicker.intl.ts에서 이동)
├── Calendar.theme.ts             ← 테마 토큰
├── CalendarContext.ts            ← Context 정의 + use hook
├── CalendarRoot.tsx              ← state 관리, Context provider
├── CalendarHeader.tsx            ← 헤더 컨테이너
├── CalendarNav.tsx               ← prev/next 버튼
├── CalendarMonthLabel.tsx        ← 월/년 라벨
├── CalendarWeekdayHeader.tsx     ← 요일 행
├── CalendarGrid.tsx              ← 42칸 grid + render prop
├── CalendarDay.tsx               ← 단일 셀
├── Calendar.tsx                  ← compound assembly
└── index.ts                      ← 배럴
```

---

## 4. 동작 명세

### 4.1 Mode별 selectDay 동작

| mode | 클릭 시 |
|---|---|
| `single` | value = clickedDate. onSelect(date). |
| `range` | value.start === null → start = clickedDate. value.start !== null && value.end === null → end = clickedDate (단, start보다 작으면 swap). 둘 다 있으면 새 클릭 = start만 다시 시작. |
| `multiple` | value.includes(clickedDate) → 제거 (toggle). 아니면 추가 (정렬 유지). |

### 4.2 Range preview

- `mode === "range"` AND `value.start !== null` AND `value.end === null` 일 때만 활성.
- Day cell의 onMouseEnter → `setRangePreviewEnd(date)`.
- Grid의 onMouseLeave → `setRangePreviewEnd(null)`.
- preview 영역: `start ~ rangePreviewEnd` (작은 값부터 큰 값) 사이 모든 날짜에 `isRangePreview: true`.

### 4.3 isInRange / isRangeStart / isRangeEnd

- `mode === "range"`, value.start AND value.end 모두 있으면:
  - `isRangeStart`: date === start
  - `isRangeEnd`: date === end
  - `isInRange`: start < date < end
- preview 단계는 `isRangePreview` (별도 시각).

### 4.4 buildMonthGrid (이미 구현됨)

```ts
buildMonthGrid({year:2026, month:4}, weekStartsOn=0)
// → 42 CalendarDate. lead: 4월 1일이 수요일이면 일/월/화 (3칸) lead.
//   trail: 4월 30일이 목요일이면 금/토 (2칸) trail. 마지막 주 보충.
```

각 셀의 `inCurrentMonth = (date.month === currentMonth.month && date.year === currentMonth.year)`.

### 4.5 키보드 네비게이션

`Calendar.Root` 또는 활성 day cell에 keydown listener:

| 키 | 동작 |
|---|---|
| `ArrowLeft` | focusedDay = addDays(focusedDay, -1) |
| `ArrowRight` | focusedDay = addDays(focusedDay, +1) |
| `ArrowUp` | focusedDay = addDays(focusedDay, -7) |
| `ArrowDown` | focusedDay = addDays(focusedDay, +7) |
| `Home` | focusedDay = 주 시작일 |
| `End` | focusedDay = 주 마지막일 |
| `PageUp` | focusedDay = addMonths(focusedDay, -1) |
| `PageDown` | focusedDay = addMonths(focusedDay, +1) |
| `Shift+PageUp` | focusedDay = addYears(focusedDay, -1) |
| `Shift+PageDown` | focusedDay = addYears(focusedDay, +1) |
| `Enter` / `Space` | selectDay(focusedDay) |
| `Esc` | (no-op, popover 컨테이너 책임) |

focusedDay 이동 시 month가 다르면 `setMonth(focusedDay)` 자동 호출 (월 자동 전환).

### 4.6 자동 포커스 (autoFocus prop)

- mount 시 focused day 초기화:
  - `value`가 있으면 그것 (single: value, range: start, multiple: 첫 항목).
  - 없으면 today.
  - today가 minDate/maxDate 밖이면 minDate.
- `autoFocus={true}`이면 mount 시 첫 day cell 또는 grid에 실제 focus().
- 기본 false (DatePicker는 popover 열릴 때 별도 트리거).

### 4.7 disabled 상태

- `disabled: true` Root prop: 모든 셀 비활성, 키보드 차단.
- 개별 day의 `isDisabled`:
  - `minDate <= day <= maxDate` 범위 밖.
  - `isDisabled?.(day) === true`.
- 비활성 셀은 클릭 시 select 안 됨, hover preview 무시.

### 4.8 month 변경 — controlled / uncontrolled

- `month` prop 명시: controlled. `setMonth` 호출 시 `onMonthChange(next)` 만 호출 (내부 state 변경 안 함).
- `defaultMonth` 명시 또는 미지정: uncontrolled. 내부 state 사용.

initial month 결정:
1. controlled: `month` prop.
2. `defaultMonth`.
3. value가 있으면 그 값의 월.
4. today.

---

## 5. DatePicker와의 통합

### 5.1 DatePicker가 Calendar를 어떻게 사용하나

DatePicker.parts.tsx에 다음 패턴:

```tsx
<DatePicker.Root
  mode={mode}
  value={value}
  onValueChange={onValueChange}
  open={open}
  onOpenChange={onOpenChange}
  ...
>
  <DatePicker.Input />
  <DatePicker.Trigger />
  <DatePicker.Popover>
    {/* DatePickerRoot가 Calendar.Root에 props 자동 전달 */}
    <DatePicker.Calendar>
      {/* DatePicker.Calendar = 내부적으로 <Calendar.Root> 렌더 */}
      <Calendar.Header>
        <Calendar.Nav direction="prev-month" />
        <Calendar.MonthLabel />
        <Calendar.Nav direction="next-month" />
      </Calendar.Header>
      <Calendar.WeekdayHeader />
      <Calendar.Grid />
    </DatePicker.Calendar>
  </DatePicker.Popover>
</DatePicker.Root>
```

### 5.2 DatePicker.Calendar wrapper

DatePicker는 `DatePicker.Calendar`라는 wrapper component를 가지며, 이것이 DatePicker Context에서 prop을 추출해 `<Calendar.Root>`에 전달:

```tsx
// DatePicker/DatePickerCalendar.tsx
export function DatePickerCalendar({ children }: { children: ReactNode }) {
  const dpCtx = useDatePickerContext();

  return (
    <Calendar.Root
      mode={dpCtx.mode}
      value={dpCtx.value}
      onValueChange={dpCtx.setValue}
      month={dpCtx.month}
      onMonthChange={dpCtx.setMonth}
      minDate={dpCtx.minDate}
      maxDate={dpCtx.maxDate}
      isDisabled={dpCtx.isDisabled}
      locale={dpCtx.locale}
      weekStartsOn={dpCtx.weekStartsOn}
      theme={dpCtx.theme}
      disabled={dpCtx.disabled}
      autoFocus={dpCtx.open} // popover 열릴 때 자동 포커스
      onSelect={() => {
        if (dpCtx.closeOnSelect) dpCtx.setOpen(false);
      }}
    >
      {children}
    </Calendar.Root>
  );
}
```

### 5.3 상태 동기화 흐름

```
사용자 input 타이핑
  → DatePicker.Input onChange
  → DatePicker.format.parse → CalendarDate
  → DatePickerContext.setValue(date)
  → Calendar.Root가 value prop 변화 감지
  → Calendar 내부 selected day 표시 갱신

사용자 Calendar Day 클릭
  → CalendarContext.selectDay(date)
  → Calendar의 onValueChange 호출 (DatePickerCalendar가 wiring)
  → DatePickerContext.setValue(date)
  → DatePicker.Input format.format → 표시
  → onSelect → closeOnSelect=true면 popover 닫음
```

### 5.4 어떤 코드가 어디로 가는가

| 현재 위치 | 이동 후 |
|---|---|
| `DatePicker.dateMath.ts` 100% | `Calendar.dateMath.ts` (Calendar export, DatePicker import) |
| `DatePicker.intl.ts` 100% | `Calendar.intl.ts` |
| `DatePicker.theme.ts`의 day/grid/header 토큰 | `Calendar.theme.ts` |
| `DatePicker.theme.ts`의 input/trigger/popover 토큰 | `DatePicker.theme.ts` 유지 |
| `DatePicker.types.ts`의 `CalendarDate`, `WeekStart`, `DatePickerDayInfo` (이름 `CalendarDayInfo`로 변경) | `Calendar.types.ts` (DatePicker가 re-export) |
| `DatePicker.types.ts`의 input/trigger/popover/footer types | `DatePicker.types.ts` 유지 |
| `useDatePickerState.ts`의 month/value/focus/preview state | Calendar Context로 이동 (CalendarRoot 내부) |
| `useDatePickerState.ts`의 input value/parse error/popover open state | DatePicker에 유지 |

### 5.5 type re-export

DatePicker가 기존에 export하던 `CalendarDate`, `DatePickerDayInfo` 등은 사용자 입장에서 깨지지 않게 re-export:

```ts
// DatePicker/index.ts
export type {
  CalendarDate,
  WeekStart,
  CalendarDayInfo as DatePickerDayInfo, // alias 유지
  CalendarSingleValue as SingleValue,
  CalendarRangeValue as RangeValue,
} from "../Calendar";
```

기존 `DatePicker.parts.tsx`에서 `<DatePicker.Calendar>`, `<DatePicker.Header>`, `<DatePicker.Grid>` 같은 이름으로 export하던 것은 다음 두 옵션:
- (a) **deprecate** — DatePicker.X를 유지하되 내부적으로 Calendar.X로 forwarding. 하위 호환.
- (b) **rename** — Calendar.X로 통일. Breaking change. DatePicker는 Wrapper만 (`DatePicker.Calendar` = wrapper, sub-component는 Calendar.X 직접).

권장: **(b)**. DatePicker가 아직 사용자에게 export 전(진행 중 브랜치)이므로 breaking 위험 적음. 코드 명료성 우선.

---

## 6. 컴포넌트 구현 상세

### 6.1 CalendarRoot.tsx

```tsx
export function CalendarRoot(props: CalendarRootProps) {
  const {
    mode = "single",
    value: controlledValue,
    defaultValue,
    onValueChange,
    onSelect,
    month: controlledMonth,
    defaultMonth,
    onMonthChange,
    minDate,
    maxDate,
    isDisabled,
    locale = defaultLocale(),
    weekStartsOn = 0,
    theme = "light",
    disabled = false,
    autoFocus = false,
    className,
    style,
    children,
  } = props;

  // value (controlled / uncontrolled)
  const [internalValue, setInternalValue] = useState(() =>
    defaultValue ?? (mode === "range" ? { start: null, end: null } : mode === "multiple" ? [] : null)
  );
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const setValue = useCallback((next) => {
    if (controlledValue === undefined) setInternalValue(next);
    onValueChange?.(next);
  }, [controlledValue, onValueChange]);

  // month
  const initialMonth = useMemo(() => {
    if (controlledMonth) return controlledMonth;
    if (defaultMonth) return defaultMonth;
    // value 우선
    if (mode === "single" && value) return value as CalendarDate;
    if (mode === "range" && (value as CalendarRangeValue).start) return (value as CalendarRangeValue).start!;
    if (mode === "multiple" && (value as CalendarMultipleValue).length) return (value as CalendarMultipleValue)[0];
    return todayCalendarDate();
  }, []);
  const [internalMonth, setInternalMonth] = useState(initialMonth);
  const month = controlledMonth ?? internalMonth;
  const setMonth = useCallback((next) => {
    if (controlledMonth === undefined) setInternalMonth(next);
    onMonthChange?.(next);
  }, [controlledMonth, onMonthChange]);

  // focus
  const [focusedDay, setFocusedDay] = useState<CalendarDate | null>(null);

  // range preview
  const [rangePreviewEnd, setRangePreviewEnd] = useState<CalendarDate | null>(null);

  // isDisabledDay 종합
  const minDateNorm = useMemo(() => normalizeDateInput(minDate), [minDate]);
  const maxDateNorm = useMemo(() => normalizeDateInput(maxDate), [maxDate]);
  const isDisabledDay = useCallback((d: CalendarDate) => {
    if (minDateNorm && compareCalendarDate(d, minDateNorm) < 0) return true;
    if (maxDateNorm && compareCalendarDate(d, maxDateNorm) > 0) return true;
    if (isDisabled?.(d)) return true;
    return false;
  }, [minDateNorm, maxDateNorm, isDisabled]);

  // selectDay (mode별)
  const selectDay = useCallback((day: CalendarDate) => {
    if (disabled || isDisabledDay(day)) return;

    if (mode === "single") {
      setValue(day);
      onSelect?.(day);
    } else if (mode === "range") {
      const cur = value as CalendarRangeValue;
      let next: CalendarRangeValue;
      if (cur.start === null || (cur.start !== null && cur.end !== null)) {
        // 새 range 시작
        next = { start: day, end: null };
      } else {
        // start만 있음 → end 결정 (작으면 swap)
        if (compareCalendarDate(day, cur.start) < 0) {
          next = { start: day, end: cur.start };
        } else {
          next = { start: cur.start, end: day };
        }
      }
      setValue(next);
      if (next.start && next.end) onSelect?.(next);
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
      onSelect?.(next);
    }
  }, [mode, value, disabled, isDisabledDay, setValue, onSelect]);

  // 키보드 핸들러는 Day cell에 부착 (포커스된 cell이 받음).

  // autoFocus
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus && rootRef.current) {
      const initialFocus = (() => {
        if (mode === "single" && value) return value as CalendarDate;
        if (mode === "range" && (value as CalendarRangeValue).start) return (value as CalendarRangeValue).start!;
        return todayCalendarDate();
      })();
      setFocusedDay(initialFocus);
      // DOM에서 focused cell 찾아서 focus()
      requestAnimationFrame(() => {
        const cell = rootRef.current?.querySelector<HTMLElement>(`[data-day-focused="true"]`);
        cell?.focus();
      });
    }
  }, [autoFocus]);

  // theme tokens
  const tokens = calendarThemes[theme];

  const ctx: CalendarContextValue = {
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
    onSelect,
  };

  return (
    <CalendarContext.Provider value={ctx}>
      <div
        ref={rootRef}
        role="application"
        aria-label="Calendar"
        className={className}
        style={{
          display: "inline-block",
          background: tokens.bg,
          border: `1px solid ${tokens.border}`,
          borderRadius: 8,
          padding: 8,
          fontFamily: "inherit",
          ...style,
        }}
      >
        {children}
      </div>
    </CalendarContext.Provider>
  );
}
```

### 6.2 CalendarHeader / Nav / MonthLabel

```tsx
export function CalendarHeader(props: CalendarHeaderProps) {
  const { className, style, children } = props;
  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", ...style }}
    >
      {children}
    </div>
  );
}

export function CalendarNav(props: CalendarNavProps) {
  const { direction, className, style, children, "aria-label": ariaLabel } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];

  const handleClick = () => {
    const delta = {
      "prev-year": -12,
      "prev-month": -1,
      "next-month": 1,
      "next-year": 12,
    }[direction];
    ctx.setMonth(addMonths(ctx.month, delta));
  };

  const labelMap = {
    "prev-year": "Previous year",
    "prev-month": "Previous month",
    "next-month": "Next month",
    "next-year": "Next year",
  };

  // 기본 children: chevron 또는 double chevron 아이콘 (Icon 시스템 활용)
  const defaultChildren = direction.startsWith("prev")
    ? direction.endsWith("year") ? "«" : "‹"
    : direction.endsWith("year") ? "»" : "›";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel ?? labelMap[direction]}
      disabled={ctx.disabled}
      className={className}
      style={{
        background: "transparent",
        border: "none",
        color: tokens.navBtn,
        cursor: ctx.disabled ? "not-allowed" : "pointer",
        padding: "4px 8px",
        borderRadius: 4,
        fontSize: 14,
        ...style,
      }}
    >
      {children ?? defaultChildren}
    </button>
  );
}

export function CalendarMonthLabel(props: CalendarMonthLabelProps) {
  const { format = "long", className, style } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];

  const label = typeof format === "function"
    ? format(ctx.month, ctx.locale)
    : getMonthLabel(ctx.month, ctx.locale, format);

  return (
    <span
      aria-live="polite"
      className={className}
      style={{ fontWeight: 600, color: tokens.monthLabel, ...style }}
    >
      {label}
    </span>
  );
}
```

### 6.3 CalendarWeekdayHeader

```tsx
export function CalendarWeekdayHeader(props: CalendarWeekdayHeaderProps) {
  const { format = "narrow", className, style } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];
  const weekdays = orderedWeekdays(ctx.weekStartsOn);

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        textAlign: "center",
        fontSize: 11,
        color: tokens.weekdayFg,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        padding: "4px 0",
        ...style,
      }}
    >
      {weekdays.map((wd) => (
        <span key={wd} aria-hidden="true">
          {getWeekdayLabel(wd, ctx.locale, format)}
        </span>
      ))}
    </div>
  );
}
```

### 6.4 CalendarGrid

```tsx
export function CalendarGrid(props: CalendarGridProps) {
  const { children, className, style } = props;
  const ctx = useCalendarContext();
  const days = useMemo(() => buildMonthGrid(ctx.month, ctx.weekStartsOn), [ctx.month, ctx.weekStartsOn]);

  const handleMouseLeave = () => {
    if (ctx.mode === "range") ctx.setRangePreviewEnd(null);
  };

  return (
    <div
      role="grid"
      className={className}
      onMouseLeave={handleMouseLeave}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 0,
        ...style,
      }}
    >
      {days.map((date, i) => {
        const info = computeDayInfo(date, ctx);
        return children
          ? <Fragment key={i}>{children(info)}</Fragment>
          : <CalendarDay key={i} day={info} />;
      })}
    </div>
  );
}

function computeDayInfo(date: CalendarDate, ctx: CalendarContextValue): CalendarDayInfo {
  const today = todayCalendarDate();
  const inCurrentMonth = date.month === ctx.month.month && date.year === ctx.month.year;
  const isToday = isSameDay(date, today);

  let isSelected = false;
  let isRangeStart = false;
  let isRangeEnd = false;
  let isInRange = false;
  let isRangePreview = false;

  if (ctx.mode === "single") {
    const v = ctx.value as CalendarSingleValue;
    isSelected = isSameDay(date, v);
  } else if (ctx.mode === "range") {
    const v = ctx.value as CalendarRangeValue;
    isRangeStart = isSameDay(date, v.start);
    isRangeEnd = isSameDay(date, v.end);
    if (v.start && v.end) {
      isInRange = compareCalendarDate(date, v.start) > 0 && compareCalendarDate(date, v.end) < 0;
    }
    isSelected = isRangeStart || isRangeEnd;

    if (v.start && !v.end && ctx.rangePreviewEnd) {
      const lo = compareCalendarDate(v.start, ctx.rangePreviewEnd) <= 0 ? v.start : ctx.rangePreviewEnd;
      const hi = compareCalendarDate(v.start, ctx.rangePreviewEnd) <= 0 ? ctx.rangePreviewEnd : v.start;
      isRangePreview =
        compareCalendarDate(date, lo) >= 0 && compareCalendarDate(date, hi) <= 0;
    }
  } else if (ctx.mode === "multiple") {
    const v = ctx.value as CalendarMultipleValue;
    isSelected = v.some((d) => isSameDay(d, date));
  }

  return {
    date,
    inCurrentMonth,
    isToday,
    isSelected,
    isRangeStart,
    isRangeEnd,
    isInRange,
    isRangePreview,
    isDisabled: ctx.isDisabledDay(date),
    isFocused: isSameDay(date, ctx.focusedDay),
  };
}
```

### 6.5 CalendarDay

```tsx
export function CalendarDay(props: CalendarDayProps) {
  const { day, onClick, className, style, children } = props;
  const ctx = useCalendarContext();
  const tokens = calendarThemes[ctx.theme];

  const handleClick = () => {
    if (day.isDisabled) return;
    if (onClick) onClick(day.date);
    else ctx.selectDay(day.date);
  };

  const handleMouseEnter = () => {
    if (ctx.mode === "range") ctx.setRangePreviewEnd(day.date);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (ctx.disabled) return;
    let next: CalendarDate | null = null;
    switch (e.key) {
      case "ArrowLeft":  next = addDays(day.date, -1); break;
      case "ArrowRight": next = addDays(day.date, +1); break;
      case "ArrowUp":    next = addDays(day.date, -7); break;
      case "ArrowDown":  next = addDays(day.date, +7); break;
      case "Home":       next = addDays(day.date, -weekdayIndex(day.date, ctx.weekStartsOn)); break;
      case "End":        next = addDays(day.date, 6 - weekdayIndex(day.date, ctx.weekStartsOn)); break;
      case "PageUp":     next = e.shiftKey ? addYears(day.date, -1) : addMonths(day.date, -1); break;
      case "PageDown":   next = e.shiftKey ? addYears(day.date, +1) : addMonths(day.date, +1); break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleClick();
        return;
      default:
        return;
    }
    e.preventDefault();
    if (next) {
      ctx.setFocusedDay(next);
      // 다른 달이면 month 자동 전환
      if (next.month !== ctx.month.month || next.year !== ctx.month.year) {
        ctx.setMonth({ year: next.year, month: next.month, day: 1 });
      }
      // 다음 렌더 후 새 cell에 focus
      requestAnimationFrame(() => {
        const cell = document.querySelector<HTMLElement>(`[data-day="${next.year}-${next.month}-${next.day}"]`);
        cell?.focus();
      });
    }
  };

  const cellStyle: CSSProperties = {
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    cursor: day.isDisabled ? "not-allowed" : "pointer",
    color: day.isDisabled
      ? tokens.dayFgDisabled
      : !day.inCurrentMonth
        ? tokens.dayFgMuted
        : day.isSelected
          ? tokens.dayFgSelected
          : day.isToday
            ? tokens.dayFgToday
            : tokens.dayFg,
    background: day.isDisabled
      ? tokens.dayBgDisabled
      : day.isSelected || day.isRangeStart || day.isRangeEnd
        ? tokens.dayBgSelected
        : day.isInRange
          ? tokens.dayBgRange
          : day.isRangePreview
            ? tokens.dayBgRangePreview
            : day.isFocused
              ? tokens.dayBgFocused
              : tokens.dayBg,
    border: day.isToday && !day.isSelected ? `1px solid ${tokens.dayBorderToday}` : "1px solid transparent",
    borderRadius: 4,
    boxSizing: "border-box",
    opacity: day.isDisabled ? tokens.disabledOpacity : 1,
    outline: "none",
    ...style,
  };

  return (
    <button
      type="button"
      role="gridcell"
      tabIndex={day.isFocused ? 0 : -1}
      aria-selected={day.isSelected}
      aria-disabled={day.isDisabled}
      aria-label={`${day.date.year}-${day.date.month}-${day.date.day}`}
      data-day={`${day.date.year}-${day.date.month}-${day.date.day}`}
      data-day-focused={day.isFocused ? "true" : undefined}
      data-day-selected={day.isSelected ? "true" : undefined}
      data-day-today={day.isToday ? "true" : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onKeyDown={handleKeyDown}
      disabled={day.isDisabled || ctx.disabled}
      className={className}
      style={cellStyle}
    >
      {children ?? day.date.day}
    </button>
  );
}

function weekdayIndex(date: CalendarDate, weekStartsOn: WeekStart): number {
  const wd = weekdayOf(date);
  return (wd - weekStartsOn + 7) % 7;
}
```

---

## 7. 데모 페이지 — `demo/src/pages/CalendarPage.tsx`

```tsx
export function CalendarPage() {
  const [single, setSingle] = useState<CalendarSingleValue>(null);
  const [range, setRange] = useState<CalendarRangeValue>({ start: null, end: null });
  const [multi, setMulti] = useState<CalendarMultipleValue>([]);

  return (
    <div>
      <h1>Calendar</h1>

      {/* 1. single */}
      <Card.Root>
        <Card.Header>Single mode</Card.Header>
        <Card.Body>
          <Calendar.Root mode="single" value={single} onValueChange={setSingle}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-year" />
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
              <Calendar.Nav direction="next-year" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
          <p>Selected: {single ? `${single.year}-${single.month}-${single.day}` : "(none)"}</p>
        </Card.Body>
      </Card.Root>

      {/* 2. range */}
      <Card.Root>
        <Card.Header>Range mode</Card.Header>
        <Card.Body>
          <Calendar.Root mode="range" value={range} onValueChange={setRange}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
          <p>Range: {range.start ? `${formatDate(range.start)} ~ ${range.end ? formatDate(range.end) : "..."}` : "(none)"}</p>
        </Card.Body>
      </Card.Root>

      {/* 3. multiple */}
      <Card.Root>
        <Card.Header>Multiple mode</Card.Header>
        <Card.Body>
          <Calendar.Root mode="multiple" value={multi} onValueChange={setMulti}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
          <p>Selected: {multi.length} dates</p>
        </Card.Body>
      </Card.Root>

      {/* 4. min/max + isDisabled */}
      <Card.Root>
        <Card.Header>Constrained (min, max, isDisabled=Sun)</Card.Header>
        <Card.Body>
          <Calendar.Root
            mode="single"
            minDate={{year:2026, month:4, day:10}}
            maxDate={{year:2026, month:5, day:20}}
            isDisabled={(d) => weekdayOf(d) === 0}
          >
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
        </Card.Body>
      </Card.Root>

      {/* 5. 커스텀 day 렌더 */}
      <Card.Root>
        <Card.Header>Custom day render (이벤트 마킹)</Card.Header>
        <Card.Body>
          <Calendar.Root mode="single">
            <Calendar.Header>...</Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid>
              {(day) => (
                <Calendar.Day day={day}>
                  {day.date.day}
                  {hasEvent(day.date) && <span style={{position:"absolute",bottom:2,right:4,color:"red"}}>•</span>}
                </Calendar.Day>
              )}
            </Calendar.Grid>
          </Calendar.Root>
        </Card.Body>
      </Card.Root>

      {/* 6. locale */}
      <Card.Root>
        <Card.Header>Locale (ko-KR)</Card.Header>
        <Card.Body>
          <Calendar.Root mode="single" locale="ko-KR" weekStartsOn={1}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader format="narrow" />
            <Calendar.Grid />
          </Calendar.Root>
        </Card.Body>
      </Card.Root>

      {/* 7. dark theme */}
      <Card.Root>
        <Card.Header>Dark theme</Card.Header>
        <Card.Body>
          <div style={{background:"#1f2937", padding:16}}>
            <Calendar.Root mode="single" theme="dark">
              <Calendar.Header>
                <Calendar.Nav direction="prev-month" />
                <Calendar.MonthLabel />
                <Calendar.Nav direction="next-month" />
              </Calendar.Header>
              <Calendar.WeekdayHeader />
              <Calendar.Grid />
            </Calendar.Root>
          </div>
        </Card.Body>
      </Card.Root>
    </div>
  );
}
```

---

## 8. 접근성 (a11y)

### 8.1 ARIA 구조
- `Calendar.Root` → `role="application"`, `aria-label="Calendar"`.
- `Calendar.Grid` → `role="grid"`.
- `Calendar.Day` → `role="gridcell"`, `aria-selected`, `aria-disabled`, `aria-label="{YYYY}-{MM}-{DD}"`.
- `Calendar.MonthLabel` → `aria-live="polite"` (월 변경 시 알림).
- `Calendar.Nav` 버튼 → `aria-label="Previous month"` 등.

### 8.2 포커스 관리
- focused day cell만 `tabIndex=0`. 나머지 `tabIndex=-1`.
- Tab → focused cell로 진입. 다시 Tab → grid 밖으로 (다음 인접 요소).
- Arrow 키 이동 시 focusedDay 갱신 + DOM focus 이동.

### 8.3 키보드 단축키
모든 Arrow/Home/End/PgUp/PgDn 처리 (§4.5).

### 8.4 스크린리더 검증
- VoiceOver: 셀에 포커스 → "April 15, 2026, selected" 식 안내.
- NVDA: grid role 인식, gridcell에서 화살표 이동 안내.
- 월 변경 시 MonthLabel이 polite로 알려야 (반복 알림 노이즈 주의 — debounce 검토).

---

## 9. 설계 결정 사항 (rationale)

### 9.1 CalendarDate 객체 (year/month/day) vs Date
**이유**: JS `Date`는 timezone에 의존 → "2026-04-26"이 사용자 timezone에 따라 다른 날로 해석되는 클래식 버그. Calendar/DatePicker는 "로컬 시간 기준 캘린더 일자"라는 의미를 명확히 분리. timezone-naive 객체로 통일.

### 9.2 month 0-indexed 회피 (1-12)
**이유**: 사용자가 콘솔에 찍을 때 `{year:2026, month:4}` → 4월. Date 객체의 0-11 vs 캘린더 통상 표기 1-12 미스매치 버그 흔함.

### 9.3 42칸 고정 grid
**이유**: 6주 × 7일은 모든 월을 담을 수 있는 최소 공통 크기. 셀 개수 가변이면 그리드 높이가 매월 변동 → popover 점프. 고정 42칸 + lead/trail 회색 처리가 표준.

### 9.4 mode 기반 다형성 vs 별도 컴포넌트
**이유**: `Calendar.Single`, `Calendar.Range`, `Calendar.Multiple` 별도 컴포넌트로 갈 수도 있으나, 코드 중복이 크고 사용자가 mode 변경 시 import 바꿔야 함. mode prop + value union이 react-day-picker, react-aria 표준 패턴.

### 9.5 Compound 컴포넌트 (Header/Nav/Grid 분리)
**이유**: 사용자가 Header에 prev-only 또는 prev-year 추가 등 자유 구성. 또한 footer 영역(예: "Today" 버튼)을 사용자가 원하는 대로 추가 가능. monolithic `<Calendar />` 한 컴포넌트보다 합성성 우수.

### 9.6 Calendar Context — DatePicker Context와 중첩
**이유**: Calendar는 자기 Context로 완전히 자립. DatePicker가 Calendar를 wrap할 때, DatePicker.Calendar wrapper가 props bridging만 담당. 두 Context는 nested되지만 독립 — Calendar는 DatePicker를 모름. 이 방향이 단독 사용을 가능하게 함.

### 9.7 range preview hover만 + 클릭 패턴
**이유**: 드래그 선택은 모바일 터치 친화도 낮고 키보드 a11y 어려움. 클릭 1, 클릭 2 + hover preview 가 react-day-picker, mantine 등 표준.

### 9.8 자동 month 전환 (focused day가 다른 달)
**이유**: 사용자가 ArrowUp을 다음 달 첫 주에서 누르면 이전 달로 자연스럽게 넘어가야. 자동 전환 없으면 포커스가 보이지 않게 됨.

### 9.9 onSelect vs onValueChange
**이유**: onValueChange는 value가 바뀔 때마다 (controlled 패턴), onSelect는 "사용자가 선택을 완료한 시점" 트리거 (range는 end 결정 시, single은 매 클릭). DatePicker가 popover 닫기 같은 외부 액션을 onSelect에 wiring.

---

## 10. Edge cases

### 10.1 month가 minDate~maxDate 범위 밖
- 사용자가 prev/next 클릭으로 범위 밖으로 이동 가능.
- 모든 셀이 disabled로 표시 → 선택 불가.
- `<Calendar.Nav>` 버튼 자체를 disable하는 옵션은 v1.1.

### 10.2 weekStartsOn=6 (토요일)
- 정상 동작. weekday 헤더, grid 모두 토요일이 첫 컬럼.

### 10.3 윤년 2월
- `getDaysInMonth(2024, 2) === 29`. JS Date 정확하게 처리.

### 10.4 1900년 이전 / 9999년 이후
- v1 검증 범위 밖. 동작은 할 수 있으나 보장 안 함.

### 10.5 RTL locale (Arabic 등)
- Intl이 자동 처리. 단 grid 자체는 LTR 가정 — 명시적 RTL 지원은 v1.1.

### 10.6 multiple 모드 100+ 개 선택
- 성능: array.findIndex / sort O(n log n). 100개 정도는 문제 없음. 1000+이면 Set 기반으로 변경 필요 (v1.1).

### 10.7 controlled value가 invalid CalendarDate
- 예: `{year:2026, month:13, day:1}` → JS Date가 자동 normalize (2027-1-1).
- v1은 검증 안 함. 사용자가 `isValidCalendarDate` 미리 체크 권장. 문서에 명시.

### 10.8 mode 변경 (single → range 등)
- 권장하지 않음 (value 타입 호환 안 됨). React가 컴포넌트 재마운트 강제할 가능성.
- 사용자가 mode를 prop으로 변경하면 internal state mismatch 가능성 → key prop으로 재마운트 강제 권장.

### 10.9 IME (한국어 등) 입력
- Calendar는 텍스트 입력 없음 (DatePicker.Input 책임). 영향 없음.

### 10.10 SSR
- `todayCalendarDate()` 호출이 서버/클라이언트에서 다른 값 반환 가능.
- 권장: month/value를 controlled로 명시. uncontrolled는 hydration 직후 잠시 mismatch 가능.

---

## 11. 구현 단계 (Phase)

### Phase 1: Calendar 신설
1. `src/components/Calendar/` 디렉터리 생성, 14개 파일 작성:
   - Calendar.types.ts
   - Calendar.dateMath.ts (DatePicker.dateMath.ts 복사 + import path 수정)
   - Calendar.intl.ts (DatePicker.intl.ts 복사)
   - Calendar.theme.ts (DatePicker.theme.ts에서 calendar 토큰 추출)
   - CalendarContext.ts
   - CalendarRoot.tsx
   - CalendarHeader.tsx, CalendarNav.tsx, CalendarMonthLabel.tsx
   - CalendarWeekdayHeader.tsx, CalendarGrid.tsx, CalendarDay.tsx
   - Calendar.tsx (compound assembly), index.ts
2. `src/components/index.ts` 추가.
3. `npm run typecheck` 통과.
4. `npm run build` 통과.

### Phase 2: Calendar 데모 페이지
1. `demo/src/pages/CalendarPage.tsx` 작성 (§7).
2. NAV 등록, 모든 7개 섹션 시각 확인.
3. 키보드 네비 (Arrow, Home/End, PgUp/PgDn, Enter) 모두 작동 확인.
4. light/dark 테마 확인.

### Phase 3: DatePicker 리팩토링
1. `DatePicker.dateMath.ts` 삭제 (Calendar.dateMath.ts로 이동됨).
2. `DatePicker.intl.ts` 삭제.
3. `DatePicker.theme.ts`에서 calendar 토큰 제거 (input/trigger/popover만 남김).
4. `DatePicker.types.ts`에서 `CalendarDate`, `WeekStart`, `DatePickerDayInfo`, `SingleValue`, `RangeValue` 제거 → Calendar에서 re-export.
5. `useDatePickerState.ts`에서 month/value/focus/preview 상태 제거 → Calendar Context 활용.
6. `DatePickerContext`에서 calendar 관련 필드 제거.
7. `DatePickerRoot.tsx` 단순화 — 더 이상 calendar 상태 관리 안 함.
8. `DatePicker.parts.tsx`에서 `DatePicker.Calendar`, `DatePicker.Header`, `DatePicker.Grid`, `DatePicker.Day`, `DatePicker.Nav`, `DatePicker.MonthLabel` 제거.
9. 새로운 `DatePicker/DatePickerCalendar.tsx` 작성 — Calendar.Root wrapper.
10. `DatePicker.tsx` namespace에 `Calendar: DatePickerCalendar` 추가.
11. `DatePicker/index.ts`에서 type re-export 정리.

### Phase 4: DatePicker 데모 페이지 업데이트
1. `demo/src/pages/DatePickerPage.tsx`가 새 합성 패턴 사용:
   ```tsx
   <DatePicker.Root>
     <DatePicker.Input />
     <DatePicker.Trigger />
     <DatePicker.Popover>
       <DatePicker.Calendar>
         <Calendar.Header>
           <Calendar.Nav direction="prev-month" />
           <Calendar.MonthLabel />
           <Calendar.Nav direction="next-month" />
         </Calendar.Header>
         <Calendar.WeekdayHeader />
         <Calendar.Grid />
       </DatePicker.Calendar>
     </DatePicker.Popover>
   </DatePicker.Root>
   ```
2. 시각 회귀 확인.

### Phase 5: 정리
- [ ] `docs/candidates.md`에서 6번 Calendar 항목 제거 + 본 plan 링크.
- [ ] README.md에 Calendar 섹션 추가.

---

## 12. 향후 확장 (v1.1+)

| 항목 | 설명 |
|---|---|
| `views: "day"\|"month"\|"year"` | 월 picker, 년 picker view 전환 |
| `numberOfMonths` | 다중 월 동시 표시 (DateRangePicker용) |
| `rtl` | RTL 명시 지원 |
| Set 기반 multiple value | 1000+ 선택 성능 최적화 |
| `Nav` 자동 disable | minDate/maxDate 도달 시 prev/next 비활성 |
| `<Calendar.Today>` | "오늘" 빠른 이동 버튼 |
| `<Calendar.WeekNumber>` | ISO 주차 번호 컬럼 |
| Modifiers 시스템 | react-day-picker처럼 임의 modifier 정의 |
| Animation | 월 전환 슬라이드 애니메이션 |

---

## 13. 체크리스트 (작업 완료 기준)

- [ ] `src/components/Calendar/` 14개 파일 작성 완료
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과
- [ ] CalendarPage 7개 섹션 모두 시각 정상 (light/dark)
- [ ] 키보드 네비 모두 작동 (Arrow/Home/End/PgUp/PgDn/Enter/Space)
- [ ] 3가지 mode 모두 정상 (single/range/multiple)
- [ ] range preview 정상
- [ ] min/max/isDisabled 정상
- [ ] locale 변경 시 라벨 정상 (ko-KR 등)
- [ ] DatePicker 리팩토링 완료, DatePickerPage 시각 정상
- [ ] DatePicker 기존 type re-export로 사용자 코드 깨지지 않음
- [ ] `docs/candidates.md`에서 6번 항목 제거 + plan 링크
- [ ] README.md 업데이트
