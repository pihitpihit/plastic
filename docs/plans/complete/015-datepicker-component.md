# DatePicker 컴포넌트 설계문서

## Context

plastic 라이브러리에 "날짜 입력 + 팝업 캘린더" 프리미티브 `DatePicker` 를 추가한다. 역할 비유: macOS 시스템 환경설정의 date selector, VSCode 의 확장 설정에서 쓰이는 inline calendar, Linear 이슈의 due-date picker. 본 컴포넌트는 "텍스트 인풋 + 클릭 시 월 그리드 팝업 + 키보드로 셀 탐색 + 선택/범위/제약"의 조합이며, plastic 이 지향하는 IDE-급 경험과 "zero runtime dependency" 원칙을 동시에 증명하는 대표 사례다.

참고 (prior art — UX / API 근거):
- **Radix `DatePicker` / `Calendar`** (`@radix-ui/react-date-picker`, react-aria-date-picker) — compound API, unstyled, aria-selected/activedescendant 표준.
- **Ant Design `DatePicker`** — input + dropdown 캘린더, `picker="date" | "week" | "month" | "year"`, 범위(`RangePicker`), locale/presets.
- **MUI `DatePicker` / `DateRangePicker`** — input parsing + mask, `shouldDisableDate`, 2 달 뷰.
- **react-day-picker** (헤드리스) — 순수 JS 달력 계산(외부 라이브러리 없음). 본 컴포넌트가 가장 근접하게 참고하는 구현 레퍼런스.
- **cally** (web component) / **Pikaday** (구세대) — UX 근거.
- **shadcn/ui `<Calendar>` + `<Popover>` 조합** — plastic 이 이미 가진 `Popover` 와 `PathInput` 을 조합한다는 점에서 구조적 유사.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅. `value`, `open`, `currentMonth` 세 축 모두 동일 패턴으로 이중화.
- `src/components/Popover/` — floating 위치/외부 클릭 닫힘/Escape 처리의 기성 구현. DatePicker 팝업은 Popover 위에 얹는다.
- `src/components/PathInput/` — 텍스트 입력 + 제안 팝업 + 키보드 탐색 + light/dark 패턴. input 부분의 스타일·동작 근거.
- `src/components/index.ts` — 배럴 등록 위치.
- `demo/src/App.tsx` — NAV/라우팅/사이드바 섹션 패턴.
- `demo/src/pages/CommandPalettePage.tsx` — 데모 페이지 구조(Props/Usage/Playground 섹션 포함)의 가장 최신 레퍼런스.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약 하에 타입 설계.

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 단일 날짜
<DatePicker.Root
  value={date}
  onValueChange={setDate}
  minDate={new Date(2024, 0, 1)}
  maxDate={new Date(2026, 11, 31)}
  locale="ko-KR"
  weekStartsOn={0}       // 0=일, 1=월
  theme="light"
  format="yyyy-MM-dd"    // Intl 기반 포매터 + 파서
>
  <DatePicker.Input placeholder="YYYY-MM-DD" />
  <DatePicker.Trigger aria-label="Open calendar" />
  <DatePicker.Calendar>
    <DatePicker.Header>
      <DatePicker.Nav direction="prev-year" />
      <DatePicker.Nav direction="prev-month" />
      <DatePicker.MonthLabel />
      <DatePicker.Nav direction="next-month" />
      <DatePicker.Nav direction="next-year" />
    </DatePicker.Header>
    <DatePicker.Grid>
      {(day) => <DatePicker.Day day={day} />}
    </DatePicker.Grid>
  </DatePicker.Calendar>
</DatePicker.Root>

// 범위
<DatePicker.Root
  mode="range"
  value={{ start, end }}
  onValueChange={(r) => setRange(r)}
>
  <DatePicker.Input />
  <DatePicker.Trigger />
  <DatePicker.Calendar />   {/* 내부 기본 조립 사용 */}
</DatePicker.Root>
```

렌더 결과 (개념):
```
┌──────────────────────────┐  ┌──────────────────────────────┐
│ 2026-04-23           ⌄  │  │ «  ‹    2026년 4월    ›  »  │
└──────────────────────────┘  │ 일 월 화 수 목 금 토         │
  ↑ Input (parse)             │ 29 30 31  1  2  3  4        │
  ↑ Trigger  →  Popover       │  5  6  7  8  9 10 11        │
                              │ 12 13 14 15 16 17 18        │
                              │ 19 20 21 22 [23] 24 25      │  ← selected
                              │ 26 27 28 29 30  1  2        │
                              │  Today   Clear              │
                              └──────────────────────────────┘
                                Popover anchored to Input
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Root` / `Input` / `Trigger` / `Calendar` / `Header` / `Nav` / `MonthLabel` / `Grid` / `Day` 의 소계로 Context 를 통해 상태 공유. 사용자는 최소 `Root + Input + Trigger + Calendar` 만 두고 내부 기본 조립에 맡기거나, 원자 단위로 재조립 가능.
- **mode="single" | "range"**. 동일 Root 에서 두 가지 의미의 `value` 를 지원. 타입은 discriminated union 으로 안전화.
- **런타임 의존 zero**. `date-fns` / `dayjs` / `luxon` 같은 라이브러리 일체 사용하지 않는다. 포매팅은 `Intl.DateTimeFormat` (내장), 파싱은 `Intl.DateTimeFormat.prototype.formatToParts` 기반 가벼운 tokenizer 로 직접 구현, 날짜 산술(월 ±1, 주 시작 weekday 등)은 `new Date(year, month, day)` 생성자와 Date 메서드로 충분. 이 원칙은 라이브러리 슬로건(“zero runtime dependency”)의 근간이므로 협상 불가.
- **controlled / uncontrolled 이중 API**. `value`/`defaultValue`, `open`/`defaultOpen`, `month`/`defaultMonth`. `useControllable` 기존 훅 활용.
- **접근성 우선**. `role="grid"`, 각 주는 `role="row"`, 각 날은 `role="gridcell"` + `aria-selected`. 월/년 헤더 변경은 `aria-live="polite"` 로 알림.
- **Local time zone 기준**. 내부 도메인 모델은 **브라우저 로컬 타임존**. UTC/ISO 변환은 boundary(포맷 input/output)에서만. `value` 는 `Date` 또는 `{ year, month, day }` 두 형태를 동시에 허용 (후자가 권장).
- **키보드**. Arrow=±1 일, Home/End=주 시작/끝, PageUp/Down=월 이동, Shift+PageUp/Down=년 이동, Enter=선택, Escape=팝업 닫기.
- **Locale**. 기본 `en-US`(sun-start). `ko-KR` 을 일급 케이스로 테스트. `weekStartsOn` 수동 지정 가능.

---

## 1. Goals / Non-goals

### Goals (v1)
1. **single / range 두 모드** (`mode: "single" | "range"`). 두 모드는 같은 Root 가 제어, value 타입만 달라진다.
2. **Input + Popup 캘린더 조합**. Input 에 직접 타이핑(파싱) + Trigger/Input 포커스로 팝업 open + 팝업에서 클릭/키보드 선택.
3. **제약**: `minDate`, `maxDate`, `isDisabled(day) => boolean` (사용자 정의 비활성화, 예: 주말 비활성화).
4. **Locale & formatting**: `Intl.DateTimeFormat` 기반. `locale` prop 기본 `"en-US"`, 한국어(`"ko-KR"`) 를 공식 지원하여 검증. `format` prop 으로 input 표시 포맷을 제어(기본 "yyyy-MM-dd").
5. **weekStartsOn**: `0` (Sun) ~ `6` (Sat). 기본값은 locale 에서 유추(`Intl.Locale.prototype.getWeekInfo` 지원 브라우저) → 폴백 `0`.
6. **Today highlight / Selected highlight / 오늘 버튼**.
7. **키보드 탐색**: Arrow(일) / Home-End(주 시작·끝) / PageUp-Down(월) / Shift+PageUp-Down(년) / Enter / Escape / Tab.
8. **Input parsing**: 관대(lenient) 파싱(숫자 구분자 자동 해석) + strict 모드 옵션. 실패 시 `onParseError` + 자체 red border.
9. **controlled / uncontrolled 이중 API** — `value/defaultValue`, `open/defaultOpen`, `month/defaultMonth`.
10. **Light / Dark** 두 테마.
11. **범위 모드 hover preview**: start 선택 후 마우스 hover 시 "임시 end" 를 하이라이트하여 범위 예측.
12. **접근성**: `role="grid"` + aria-label + live region + focus ring.

### Non-goals (v1 제외)
- **Time-of-day (시/분/초 선택)**: `<DatePicker>` 은 "day precision" 까지만. time 은 v1.1 `<DateTimePicker>` 로 분리.
- **2 개월 동시 뷰** (MUI DateRangePicker 스타일): range 모드에서도 v1 은 1 개월만. v1.1 에서 `numberOfMonths={2}` prop 추가.
- **Quick preset 목록** ("Last 7 days", "This month" 등 버튼 리스트): v1.1.
- **Week picker / Month picker / Year picker**: v1.1 이후(`picker="week" | "month" | "year"`).
- **회계연도(fiscal year)** / 일본식 원호(Reiwa) / 음력(lunar) / 이슬람력: v1 은 그레고리력만. `Intl.DateTimeFormat` 의 `calendar` 옵션 확장은 v2 범위.
- **Cross-timezone 지정**: `<DatePicker tz="America/Los_Angeles">` 같은 명시 TZ 지정 불가. v1 은 "브라우저 로컬 TZ" 로 고정. TZ 를 다루는 앱은 값 boundary 에서 자체 변환.
- **Masked input**: input 에 `01/__/____` 같은 마스크 적용은 v1.1.
- **Footer presets 슬롯**: v1 은 `Today` / `Clear` 버튼만 내장. 임의 presets 는 children 으로 `<DatePicker.Footer>` 에 꽂을 수 있게 API 만 열어두고, built-in preset 집합은 v1.1.
- **Animation**: open/close fade 는 기존 `Popover` 기본 transition 재사용. 달력 좌/우 슬라이드(월 이동) 애니메이션은 v1.1.

---

## 2. 공개 API

### 2.1 타입 — `src/components/DatePicker/DatePicker.types.ts`

```ts
export type DatePickerTheme = "light" | "dark";
export type DatePickerMode = "single" | "range";

/** 사용자에게 노출되는 "달력 좌표". 타임존·시·분 등 파생값을 숨긴다. */
export interface CalendarDate {
  /** 4자리 서기 연도 (예: 2026). */
  year: number;
  /** 1~12 (사람 기준). 내부 Date.month 은 0~11 이므로 변환 주의. */
  month: number;
  /** 1~31. */
  day: number;
}

/** single 모드 value. */
export type SingleValue = CalendarDate | null;

/** range 모드 value. start <= end 보장. 한쪽만 선택된 중간 상태 허용. */
export interface RangeValue {
  start: CalendarDate | null;
  end: CalendarDate | null;
}

/** 공용 base. */
interface DatePickerRootBaseProps {
  /** 라이트/다크. 기본 "light". */
  theme?: DatePickerTheme;

  /** Intl locale. 기본 "en-US". 한국어는 "ko-KR". */
  locale?: string;
  /** 주 시작. 0=일 ~ 6=토. 미지정 시 locale 유추. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;

  /** input 표시 포맷. 기본 "yyyy-MM-dd". */
  format?: string;
  /** 파싱 모드. "lenient" 기본, "strict" 는 format 과 1:1 일치만 허용. */
  parseMode?: "lenient" | "strict";

  /** minDate / maxDate (inclusive). */
  minDate?: CalendarDate | Date;
  maxDate?: CalendarDate | Date;
  /** 추가 비활성화 판정. min/max 외에 사용자 정의. */
  isDisabled?: (day: CalendarDate) => boolean;

  /** 팝업 open 상태. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** 현재 보이는 월. */
  month?: CalendarDate;          // day 는 의미 없음(1로 정규화).
  defaultMonth?: CalendarDate;
  onMonthChange?: (month: CalendarDate) => void;

  /** 비활성화 (전체 DatePicker). */
  disabled?: boolean;

  /** input 파싱 실패 시 호출. */
  onParseError?: (rawInput: string) => void;

  /** 포커스/blur 으로부터의 자동 open 정책. 기본 true. */
  openOnFocus?: boolean;
  /** 선택 직후 팝업 닫기. single 기본 true, range 기본 end 선택 시 true. */
  closeOnSelect?: boolean;

  /** root className/style. */
  className?: string;
  style?: React.CSSProperties;

  /** children: 미지정 시 기본 조립(§2.4)을 사용. */
  children?: React.ReactNode;
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

/** Input */
export interface DatePickerInputProps {
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  /** range 모드에서 어느 필드인지. "start" | "end". 단일 input 이면 미지정. */
  part?: "start" | "end";
  /** aria-label override. */
  "aria-label"?: string;
}

/** Trigger (달력 아이콘 버튼) */
export interface DatePickerTriggerProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  "aria-label"?: string;
}

/** Calendar (popover body) */
export interface DatePickerCalendarProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** Header */
export interface DatePickerHeaderProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** MonthLabel */
export interface DatePickerMonthLabelProps {
  className?: string;
  style?: React.CSSProperties;
}

/** Nav (prev/next month/year) */
export interface DatePickerNavProps {
  direction: "prev-year" | "prev-month" | "next-month" | "next-year";
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  "aria-label"?: string;
}

/** Grid */
export interface DatePickerGridProps {
  /** custom day renderer. 기본은 내부 Day 를 사용. */
  children?: (day: DatePickerDayInfo) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Day */
export interface DatePickerDayProps {
  day: DatePickerDayInfo;
  className?: string;
  style?: React.CSSProperties;
}

/** 한 셀의 정보 (Grid 가 renderer 에게 전달) */
export interface DatePickerDayInfo {
  date: CalendarDate;
  /** 현재 보이는 달에 속하는지. false 면 이전/다음 달 "스필오버". */
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;         // start~end 사이(양 끝 포함)
  isRangePreview: boolean;    // hover 중 예상 구간
  isDisabled: boolean;
  /** keyboard focus 타깃 day. grid 에서 tabindex=0 대상. */
  isFocused: boolean;
}
```

### 2.2 배럴

```ts
// src/components/DatePicker/index.ts
export { DatePicker } from "./DatePicker";
export type {
  DatePickerRootProps,
  DatePickerRootSingleProps,
  DatePickerRootRangeProps,
  DatePickerInputProps,
  DatePickerTriggerProps,
  DatePickerCalendarProps,
  DatePickerHeaderProps,
  DatePickerMonthLabelProps,
  DatePickerNavProps,
  DatePickerGridProps,
  DatePickerDayProps,
  DatePickerDayInfo,
  DatePickerMode,
  DatePickerTheme,
  CalendarDate,
  SingleValue,
  RangeValue,
} from "./DatePicker.types";
```

그리고 `src/components/index.ts` 에 `export * from "./DatePicker";` 한 줄 추가.

### 2.3 Compound namespace

```ts
export const DatePicker = {
  Root: DatePickerRoot,
  Input: DatePickerInput,
  Trigger: DatePickerTrigger,
  Calendar: DatePickerCalendar,
  Header: DatePickerHeader,
  MonthLabel: DatePickerMonthLabel,
  Nav: DatePickerNav,
  Grid: DatePickerGrid,
  Day: DatePickerDay,
  Footer: DatePickerFooter,
};
```

displayName 은 각각 `"DatePicker.Root"` 등. Footer 는 `Today`/`Clear` 내장 버튼을 포함(사용자가 children 으로 override 가능).

### 2.4 기본 조립(fallback)

사용자가 `<DatePicker.Root>...</DatePicker.Root>` 의 children 을 생략하면 Root 내부에서 아래 조립을 자동 렌더한다:

```tsx
<DatePicker.Input />
<DatePicker.Trigger />
<DatePicker.Calendar>
  <DatePicker.Header>
    <DatePicker.Nav direction="prev-year" />
    <DatePicker.Nav direction="prev-month" />
    <DatePicker.MonthLabel />
    <DatePicker.Nav direction="next-month" />
    <DatePicker.Nav direction="next-year" />
  </DatePicker.Header>
  <DatePicker.Grid />
  <DatePicker.Footer />
</DatePicker.Calendar>
```

원자 단위 재조립이 필요한 경우만 children 을 명시한다.

---

## 3. 도메인 모델

### 3.1 `CalendarDate` vs `Date`

`Date` 객체는 본질적으로 "UTC millisecond" 에 타임존 필터를 씌운 것이다. `2026-04-23T00:00:00Z` 와 `2026-04-23T00:00:00-09:00` 은 같은 UTC 순간이지만 "로컬 달력" 에서는 다른 날이 될 수 있다. 사용자 관점에서 날짜는 "4월 23일" 이라는 **좌표**지 순간이 아니다. 따라서 내부 도메인 타입은 `CalendarDate = { year, month(1~12), day }` 로 고정한다.

- 외부 boundary (사용자가 prop 으로 `Date` 를 넘겼을 때) 에서만 `toCalendarDate(d: Date): CalendarDate = { year: d.getFullYear(), month: d.getMonth()+1, day: d.getDate() }` 로 로컬 TZ 기준 변환.
- 반대 변환 `toDate(c: CalendarDate): Date = new Date(c.year, c.month-1, c.day)` 는 항상 **로컬 자정**.
- 동등성은 `year` `month` `day` 삼자 비교. `Date` 객체 참조 비교는 금지 (useMemo 의 의존성 등에서 무한루프 유발).

### 3.2 타임존

v1 은 "브라우저 로컬 TZ" 고정. 명시 TZ 를 받지 않는다. 이는 의도적 단순화:

- 사용자가 `new Date("2026-04-23")` 를 prop 으로 넘기면 이 Date 는 UTC 자정이고, 로컬 TZ 가 UTC-09:00 인 서울이라면 `getDate() === 23`, 뉴욕(UTC-04:00)이라면 `getDate() === 22` 가 된다. **혼란의 원인.**
- 따라서 **권장 prop 은 `CalendarDate` 타입**이고, `Date` 를 넘기는 경우는 문서에 "로컬 TZ 로 해석됨" 경고를 명시.
- `value` 를 다시 직렬화하려는 소비자는 `CalendarDate` → `"YYYY-MM-DD"` 변환을 직접 하거나, 내보내는 `format` 을 활용한다.

### 3.3 순수 Date 산술 유틸 (외부 라이브러리 없음)

```ts
// DatePicker.dateMath.ts

export function isValidCalendarDate(c: CalendarDate): boolean {
  const d = new Date(c.year, c.month - 1, c.day);
  return (
    d.getFullYear() === c.year &&
    d.getMonth() === c.month - 1 &&
    d.getDate() === c.day
  );
}

export function compareCalendarDate(a: CalendarDate, b: CalendarDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function isSameDay(a: CalendarDate | null, b: CalendarDate | null): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** 윤년 안전. getDaysInMonth(2024, 2) === 29. */
export function getDaysInMonth(year: number, month: number): number {
  // new Date(year, month, 0) 은 "month-1 월의 마지막 날" (0-index 기준 month).
  return new Date(year, month, 0).getDate();
}

/** 해당 월 1일의 요일 (0=일 ~ 6=토), 로컬 TZ 기준. */
export function startOfMonthWeekday(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function addMonths(c: CalendarDate, delta: number): CalendarDate {
  // 월만 산술 → 존재하지 않는 날짜(1/31 + 1month)는 clamp.
  const targetMonthIndex = c.month - 1 + delta; // 0-index
  const year = c.year + Math.floor(targetMonthIndex / 12);
  const monthIdx = ((targetMonthIndex % 12) + 12) % 12;
  const monthHuman = monthIdx + 1;
  const day = Math.min(c.day, getDaysInMonth(year, monthHuman));
  return { year, month: monthHuman, day };
}

export function addDays(c: CalendarDate, delta: number): CalendarDate {
  const d = new Date(c.year, c.month - 1, c.day + delta);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function addYears(c: CalendarDate, delta: number): CalendarDate {
  return addMonths(c, delta * 12);
}

export function todayCalendarDate(): CalendarDate {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

/** 주 시작일을 weekStartsOn 에 맞춰 정렬한 7 요일 인덱스 배열. */
export function orderedWeekdays(weekStartsOn: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => (i + weekStartsOn) % 7);
}
```

> **주의**: 위의 `addDays` 는 `new Date(y, m-1, d + delta)` 의 "day 인자 자동 carry" 를 이용. DST 전환 일(예: 뉴욕 3월 둘째 일요일)에도 `getDate()` 는 안전(JS Date 는 DST 보정 내장). 단 자정 생성이 존재하지 않는 TZ 에지 케이스(브라질 일부)에 대해 `§13.3` 에 검증 체크 포함.

### 3.4 Root Context

```ts
interface DatePickerContextValue {
  // 모드
  mode: "single" | "range";

  // 선택값
  single: SingleValue;                          // mode==="single"
  range: RangeValue;                            // mode==="range"
  rangeHoverEnd: CalendarDate | null;           // range 모드 hover preview

  // UI 상태
  open: boolean;
  setOpen: (v: boolean) => void;

  currentMonth: CalendarDate;                   // day 는 1 로 정규화
  setCurrentMonth: (m: CalendarDate) => void;

  focusedDay: CalendarDate;                     // grid keyboard cursor
  setFocusedDay: (d: CalendarDate) => void;

  // 제약
  minDate: CalendarDate | null;
  maxDate: CalendarDate | null;
  isDisabled: (d: CalendarDate) => boolean;

  // Locale
  locale: string;
  weekStartsOn: number;

  // 포맷
  format: string;
  parseMode: "lenient" | "strict";

  // 액션
  selectDay: (d: CalendarDate) => void;
  clear: () => void;
  setToToday: () => void;

  // 메타
  disabled: boolean;
  theme: DatePickerTheme;

  // 포매터 (useMemo 캐시)
  formatters: {
    monthLabel: Intl.DateTimeFormat;            // "2026년 4월" / "April 2026"
    weekdayShort: Intl.DateTimeFormat;          // "Mon" / "월"
    ariaDate: Intl.DateTimeFormat;              // "Thursday, April 23, 2026"
  };

  // 내부 id (ARIA)
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

  // refs
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputEndRef: React.RefObject<HTMLInputElement | null>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  gridRef: React.RefObject<HTMLDivElement | null>;
}

const DatePickerContext = React.createContext<DatePickerContextValue | null>(null);

export function useDatePickerContext() {
  const ctx = useContext(DatePickerContext);
  if (!ctx) throw new Error("DatePicker components must be used within <DatePicker.Root>");
  return ctx;
}
```

---

## 4. 시각 / 구조 설계

### 4.1 DOM 구조

`mode="single"` + 기본 조립:

```
<div role="group" class="dp-root" aria-labelledby={ids.input}>
  <div class="dp-input-wrap">
    <input
      type="text"
      id={ids.input}
      class="dp-input"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={ids.dialog}
      value={typed ?? format(value)}
      onChange onBlur onKeyDown />
    <button
      id={ids.trigger}
      class="dp-trigger"
      aria-label="Open calendar"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={ids.dialog}>
      <CalendarIcon />
    </button>
  </div>

  {open && (
    <Popover anchor={inputRef} onClose={closeAndRestoreFocus}>
      <div
        role="dialog"
        id={ids.dialog}
        aria-modal="false"
        aria-labelledby={ids.monthLabel}
        class="dp-calendar">
        <div class="dp-header">
          <button class="dp-nav" aria-label="Previous year">«</button>
          <button class="dp-nav" aria-label="Previous month">‹</button>
          <div id={ids.monthLabel} class="dp-month-label" aria-live="polite">
            2026년 4월
          </div>
          <button class="dp-nav" aria-label="Next month">›</button>
          <button class="dp-nav" aria-label="Next year">»</button>
        </div>

        <div role="grid" id={ids.grid} class="dp-grid" aria-labelledby={ids.monthLabel}>
          <div role="row" class="dp-weekdays">
            <div role="columnheader">일</div>
            <div role="columnheader">월</div>
            ...
          </div>
          <div role="row">
            <div role="gridcell" aria-selected={...} tabindex={...}>29</div>
            ...
          </div>
          ... (총 6 weeks)
        </div>

        <div class="dp-footer">
          <button class="dp-ghost">Today</button>
          <button class="dp-ghost">Clear</button>
        </div>
      </div>
    </Popover>
  )}
</div>
```

`mode="range"` 는 `.dp-input-wrap` 내부에 input 두 개(`part="start"` / `"end"`) 렌더.

### 4.2 grid = 6 × 7 고정

매 달 42 셀 고정. 첫 주 앞쪽의 "빈 자리" 는 이전 달의 말일로 채움(스필오버), 마지막 주 뒤쪽은 다음 달의 초일로 채움. 스필오버 셀은 `inCurrentMonth=false` 로 렌더되어 흐림 처리. 장점:
- 높이 jitter 없음 (전달 30일 vs 31일 vs 28일 vs 29일 혼재로 grid 높이가 변하지 않음 → Popover 높이 안정).
- `aria-rowindex` 일관성.

`rowCount = 6`, `columnCount = 7` 을 `grid` 에 `aria-rowcount="7"` (weekday row 포함 7), `aria-colcount="7"` 로 선언.

### 4.3 palette

```ts
// theme.ts
export const datePickerPalette = {
  light: {
    bg:              "#ffffff",
    border:          "rgba(0,0,0,0.12)",
    inputBg:         "#ffffff",
    inputFg:         "#111827",
    inputPlaceholder:"#9ca3af",
    inputFocusRing:  "#2563eb",
    inputError:      "#dc2626",

    calendarBg:      "#ffffff",
    calendarBorder:  "rgba(0,0,0,0.12)",
    calendarShadow:  "0 8px 24px rgba(0,0,0,0.12)",

    weekdayFg:       "#6b7280",

    dayFg:           "#111827",
    dayBg:           "transparent",
    dayHoverBg:      "#eef2ff",
    dayOutsideFg:    "#9ca3af",

    todayRing:       "#2563eb",
    selectedBg:      "#2563eb",
    selectedFg:      "#ffffff",

    rangeBg:         "#dbeafe",
    rangeFg:         "#111827",
    rangePreviewBg:  "rgba(37,99,235,0.12)",

    disabledFg:      "#d1d5db",

    navFg:           "#374151",
    navHoverBg:      "#f3f4f6",

    footerBorder:    "rgba(0,0,0,0.08)",
    ghostHoverBg:    "#f3f4f6",
    ghostFg:         "#374151",
  },
  dark: {
    bg:              "#0f172a",
    border:          "rgba(255,255,255,0.08)",
    inputBg:         "#1f2937",
    inputFg:         "#e5e7eb",
    inputPlaceholder:"#6b7280",
    inputFocusRing:  "#60a5fa",
    inputError:      "#f87171",

    calendarBg:      "#1f2937",
    calendarBorder:  "rgba(255,255,255,0.08)",
    calendarShadow:  "0 8px 24px rgba(0,0,0,0.4)",

    weekdayFg:       "#9ca3af",

    dayFg:           "#e5e7eb",
    dayBg:           "transparent",
    dayHoverBg:      "#334155",
    dayOutsideFg:    "#6b7280",

    todayRing:       "#60a5fa",
    selectedBg:      "#60a5fa",
    selectedFg:      "#0f172a",

    rangeBg:         "#1e3a8a",
    rangeFg:         "#e5e7eb",
    rangePreviewBg:  "rgba(96,165,250,0.18)",

    disabledFg:      "#4b5563",

    navFg:           "#e5e7eb",
    navHoverBg:      "#334155",

    footerBorder:    "rgba(255,255,255,0.08)",
    ghostHoverBg:    "#334155",
    ghostFg:         "#e5e7eb",
  },
} as const;
```

### 4.4 레이아웃 치수

- input: height 32, padding 0 28px 0 10px (우측 trigger 아이콘용), border-radius 6, font 13.
- trigger: 28 × 28 absolute right:0.
- calendar: width 280, padding 12, border-radius 8.
- day 셀: 36 × 32, inline-flex center, font-variant-numeric: tabular-nums (숫자 정렬).
- weekday 헤더 행: height 24, text-transform: uppercase (en 만; ko 는 원본 유지).
- footer: padding-top 8, border-top 1px, flex gap 8, justify-end.

---

## 5. 핵심 로직

### 5.1 "한 달의 42 셀" 계산

```ts
export function buildMonthGrid(
  currentMonth: CalendarDate,        // day 무시
  weekStartsOn: number,              // 0..6
): CalendarDate[] {
  const { year, month } = currentMonth;
  const firstWeekday = startOfMonthWeekday(year, month); // 0=Sun
  // 첫 주가 몇 칸 비는가 = (firstWeekday - weekStartsOn + 7) % 7
  const lead = (firstWeekday - weekStartsOn + 7) % 7;

  // 시작일 = this month 1일 - lead
  const start: CalendarDate = addDays({ year, month, day: 1 }, -lead);

  const grid: CalendarDate[] = [];
  for (let i = 0; i < 42; i++) grid.push(addDays(start, i));
  return grid;
}
```

해당 셀이 현재 달에 속하는지 판단: `g.year === year && g.month === month`.

### 5.2 월 네비게이션

```ts
function goPrevMonth() { setCurrentMonth(addMonths(currentMonth, -1)); }
function goNextMonth() { setCurrentMonth(addMonths(currentMonth, +1)); }
function goPrevYear()  { setCurrentMonth(addYears(currentMonth,  -1)); }
function goNextYear()  { setCurrentMonth(addYears(currentMonth,  +1)); }
```

`minDate`/`maxDate` 를 벗어나는 월로 이동은 차단 — Nav 버튼 `disabled` 속성. 판정: "이동 후 월의 마지막 날 < minDate" 또는 "이동 후 월의 첫 날 > maxDate" 면 해당 방향 비활성화.

### 5.3 day 선택

```ts
function selectDay(d: CalendarDate) {
  if (disabled || isDisabledInternal(d)) return;
  if (mode === "single") {
    commitSingle(d);
    if (closeOnSelect) setOpen(false);
    return;
  }
  // range
  const r = rangeInternal;
  if (!r.start || (r.start && r.end)) {
    // (re)start
    commitRange({ start: d, end: null });
  } else {
    // completing
    const [a, b] = compareCalendarDate(r.start, d) <= 0 ? [r.start, d] : [d, r.start];
    commitRange({ start: a, end: b });
    if (closeOnSelect !== false) setOpen(false);
  }
}
```

`rangeInternal.end` 가 정해지는 순간 `onValueChange` 최종 호출.

### 5.4 range hover preview

pointermove 가 아닌 **`onMouseEnter` per cell** 로 구현 (React event 로 충분). 상태는 `rangeHoverEnd: CalendarDate | null`.

```ts
function onDayMouseEnter(d: CalendarDate) {
  if (mode !== "range") return;
  if (!range.start || range.end) return; // start 만 있고 end 대기 중인 상태에서만
  setRangeHoverEnd(d);
}
function onDayMouseLeaveGrid() {
  setRangeHoverEnd(null);
}
```

preview 구간 계산:
```ts
function isRangePreview(d: CalendarDate): boolean {
  if (mode !== "range" || !range.start || range.end || !rangeHoverEnd) return false;
  const [a, b] = compareCalendarDate(range.start, rangeHoverEnd) <= 0
    ? [range.start, rangeHoverEnd]
    : [rangeHoverEnd, range.start];
  return compareCalendarDate(d, a) >= 0 && compareCalendarDate(d, b) <= 0;
}
```

preview 는 `.dp-day--range-preview` 배경으로 렌더.

### 5.5 Input 파싱

`format` 토큰: `yyyy` | `yy` | `MM` | `M` | `dd` | `d`. 리터럴은 비-영숫자(`/`, `-`, `.`, ` `). MVP 는 6 토큰으로 충분.

Lenient 모드:
```ts
// "2026.4.3", "2026/04/03", "20260403" 등 숫자 3 덩어리 매칭.
const nums = raw.trim().split(/[^\d]+/).filter(Boolean);
if (nums.length === 3) {
  const [y, m, d] = guessYMD(nums, format); // format 에서 순서 힌트
  return maybeValidate({ year: y, month: m, day: d });
}
```

Strict 모드:
```ts
// format 을 정확히 RegExp 로 변환:
//   "yyyy-MM-dd" -> /^(\d{4})-(\d{2})-(\d{2})$/
const re = compileFormatRegex(format);
const m = re.exec(raw.trim());
if (!m) return null;
...
```

실패 시:
- input 에 `aria-invalid="true"` + `border-color = inputError`.
- `onParseError(raw)` 호출.
- **값은 유지**: 사용자가 계속 타이핑 중일 수 있으므로 blur/Enter 시점까지는 value 에 반영하지 않고 `typedRaw` 상태만 유지. 아래 8.5 참조.

### 5.6 Input 포매팅

```ts
function formatCalendarDate(c: CalendarDate, format: string, locale: string): string {
  // format 토큰 기반의 로컬 포매팅.
  // (locale 은 weekday/month 이름 로컬라이즈에는 쓰이지만
  //  기본 format "yyyy-MM-dd" 는 숫자만이라 locale 영향 없음.)
  return format
    .replace(/yyyy/g, String(c.year).padStart(4, "0"))
    .replace(/yy/g,   String(c.year % 100).padStart(2, "0"))
    .replace(/MM/g,   String(c.month).padStart(2, "0"))
    .replace(/M/g,    String(c.month))
    .replace(/dd/g,   String(c.day).padStart(2, "0"))
    .replace(/d/g,    String(c.day));
}
```

> 한국어/영어에 따른 "월 이름" 이 필요할 때(예: format="MMMM dd, yyyy") 는 v1.1 에서 `MMMM` / `MMM` / `EEEE` / `EEE` 토큰 추가 → `Intl.DateTimeFormat.formatToParts` 로 매핑. v1 범위는 숫자 토큰(yyyy/MM/dd)만 지원.

---

## 6. 제약 (minDate / maxDate / isDisabled)

```ts
function isDisabledInternal(d: CalendarDate): boolean {
  if (minDate && compareCalendarDate(d, minDate) < 0) return true;
  if (maxDate && compareCalendarDate(d, maxDate) > 0) return true;
  if (userIsDisabled?.(d)) return true;
  return false;
}
```

- minDate/maxDate 는 inclusive.
- `userIsDisabled` 의 반환이 바뀔 수 있으므로 Grid 렌더 시 셀 42 개에 대해 호출. 성능: month 당 한 번 렌더이므로 42 call × 1 render = 무시 가능.
- range 모드에서 start 선택 후 end 로 `isDisabled` 셀이 있으면 **해당 end 선택 자체가 불가** (클릭 무시). 단, start~end 범위 "내부" 에 disabled 셀이 포함될 수는 있다(예: 주말 비활성화된 스케줄에서도 5일 연속 구간을 걸치도록 허용). v1 정책: "끝 점만 disabled 면 선택 불가" / "중간의 disabled 는 허용". 이는 react-day-picker 기본 정책과 동일.
- 초기 `currentMonth` 는 `value` 가 있으면 value 의 달, 없으면 "오늘" 의 달. 단 min/max 가 있으면 min 이상 max 이하로 clamp.

---

## 7. 키보드

Input 에 포커스가 있는 경우:

| 키 | 동작 |
|---|---|
| 타이핑 | typedRaw 업데이트, 즉시 value 반영 안 함 |
| Enter | typedRaw parse 시도 → 성공 시 commit + 팝업 닫기, 실패 시 aria-invalid |
| Escape | typedRaw 취소(value 포맷팅 복원), 팝업 닫기 |
| ArrowDown (openOnFocus or 이미 open) | 팝업 open + focus 를 `focusedDay` 로 이동 |
| Tab | 다음 포커스 가능 요소 (팝업은 열린 채 유지, body 에서 focus 가 이탈하면 닫힘) |

Grid (dialog) 내 포커스가 있는 경우 (`gridcell` focus):

| 키 | 동작 |
|---|---|
| `ArrowLeft` | focusedDay -= 1 일 (RTL 은 +1) |
| `ArrowRight` | focusedDay += 1 일 (RTL 은 -1) |
| `ArrowUp` | focusedDay -= 7 일 |
| `ArrowDown` | focusedDay += 7 일 |
| `Home` | 주의 시작 (`weekStartsOn` 기준) |
| `End` | 주의 끝 |
| `PageUp` | 이전 달 (같은 day-of-month 유지; 없으면 clamp) |
| `PageDown` | 다음 달 |
| `Shift + PageUp` | 이전 해 |
| `Shift + PageDown` | 다음 해 |
| `Enter` / `Space` | selectDay(focusedDay) |
| `Escape` | 팝업 닫고 input 에 포커스 복귀 |
| `Tab` | Footer(Today/Clear) 또는 Nav 버튼으로 이동 |

focusedDay 가 currentMonth 밖으로 나가면 currentMonth 자동 전환 + grid 재렌더 → roving tabindex 로 새 focusedDay 셀에 DOM focus 이동 (`useLayoutEffect` + `ref` 기반).

min/max 를 넘는 이동 시:
- 방향 키로 넘어가면 clamp (이동을 minDate/maxDate 에 멈춤). 선택 시점에도 `isDisabled` 로 막히므로 이중 안전.

---

## 8. 상태 관리 (3-축 controlled / uncontrolled)

### 8.1 축 정의

1. **value**: `SingleValue` 또는 `RangeValue`. 실제 선택값.
2. **open**: 팝업 열림 여부.
3. **currentMonth**: 달력이 현재 보여주는 달(day=1 정규화).

각 축은 independent 하게 controlled/uncontrolled 가능. 조합 가능.

### 8.2 `useControllable` 활용

세 축 모두 기존 훅:

```ts
const [single, setSingle] = useControllable<SingleValue>({
  value: props.mode !== "range" ? props.value : undefined,
  defaultValue: props.mode !== "range" ? props.defaultValue : null,
  onChange: (v) => props.mode !== "range" && props.onValueChange?.(v),
});

const [range, setRange] = useControllable<RangeValue>({
  value: props.mode === "range" ? props.value : undefined,
  defaultValue: props.mode === "range" ? props.defaultValue : { start: null, end: null },
  onChange: (v) => props.mode === "range" && props.onValueChange?.(v),
});

const [open, setOpen] = useControllable<boolean>({
  value: props.open,
  defaultValue: props.defaultOpen ?? false,
  onChange: props.onOpenChange,
});

const [currentMonth, setCurrentMonth] = useControllable<CalendarDate>({
  value: props.month,
  defaultValue: props.defaultMonth ?? deriveInitialMonth(),
  onChange: props.onMonthChange,
});
```

### 8.3 month 자동 동기화

value 가 controlled 로 외부에서 변할 때 currentMonth 가 uncontrolled 면 자동으로 **value 의 달** 로 동기화:

```ts
useEffect(() => {
  if (props.month !== undefined) return; // controlled month 면 개입 안 함
  const target = currentValueDate(single, range);
  if (!target) return;
  if (target.year !== currentMonth.year || target.month !== currentMonth.month) {
    setCurrentMonth({ year: target.year, month: target.month, day: 1 });
  }
}, [single, range]);
```

### 8.4 focusedDay

focusedDay 는 **controlled prop 없음**. 내부 state. 초기값:
- value 있으면 value, 없으면 today (min/max clamp).
- open 될 때마다 재계산: value 또는 today 로 reset (focus 가 지저분해지는 걸 방지).

### 8.5 Input typedRaw

input 타이핑 중 값을 즉시 commit 하지 않기 위한 buffer state:

```ts
const [typedRaw, setTypedRaw] = useState<string | null>(null);

// input 표시값:
const displayValue = typedRaw !== null
  ? typedRaw
  : (single ? formatCalendarDate(single, format, locale) : "");

// onChange: 타이핑
function onInputChange(e: ChangeEvent<HTMLInputElement>) {
  setTypedRaw(e.target.value);
}

// onBlur / Enter: parse try
function commitTyped() {
  if (typedRaw === null) return;
  const parsed = parseRaw(typedRaw, format, parseMode);
  if (parsed === null) {
    if (typedRaw === "") { commitSingle(null); setTypedRaw(null); return; }
    setInvalid(true);
    onParseError?.(typedRaw);
    return;
  }
  if (isDisabledInternal(parsed)) { setInvalid(true); onParseError?.(typedRaw); return; }
  commitSingle(parsed);
  setTypedRaw(null);
  setInvalid(false);
}
```

### 8.6 controlled + storage 충돌

DatePicker 는 localStorage persist 를 내장하지 않는다(= SplitPane 과 다름). 날짜는 대개 서버 상태/URL 과 묶이므로 owner 책임. 향후 `storageKey` 는 v1.1 에 `defaultValue` 보완용으로 선택적 추가 가능.

---

## 9. Locale & formatting

### 9.1 `Intl.DateTimeFormat` 만 사용

```ts
const fmtMonthLabel = useMemo(
  () => new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }),
  [locale],
);
// en-US -> "April 2026"
// ko-KR -> "2026년 4월"

const fmtWeekdayShort = useMemo(
  () => new Intl.DateTimeFormat(locale, { weekday: "short" }),
  [locale],
);
// en-US "Mon", ko-KR "월"

const fmtAriaDate = useMemo(
  () => new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
  [locale],
);
// en-US "Thursday, April 23, 2026"
// ko-KR "2026년 4월 23일 목요일"
```

**왜 date-fns/dayjs 를 쓰지 않는가**:
- `date-fns` locale 패키지는 `date-fns/locale/ko` 하나만 ~40 KB. 영어 포함 2 locale 이면 80 KB+. 반면 `Intl.DateTimeFormat` 은 **V8/JSC 내장** 으로 번들 0 바이트.
- 기능 매칭: "월·요일 이름 로컬라이즈" + "숫자 포매팅" 이라는 본 컴포넌트 필요 범위가 `Intl` 로 100% 커버됨.
- plastic 은 "zero runtime dependency" 를 핵심 slogan 으로 하므로 협상 불가.

### 9.2 `weekStartsOn` 유추

```ts
function deriveWeekStartsOn(locale: string): number {
  try {
    // @ts-expect-error getWeekInfo 는 일부 런타임 필요(Chrome 99+, Node 20+)
    const info = new Intl.Locale(locale).getWeekInfo?.();
    if (info?.firstDay != null) {
      // info.firstDay: 1=Mon ~ 7=Sun
      return info.firstDay === 7 ? 0 : info.firstDay;
    }
  } catch { /* ignore */ }
  // fallback: en-US/ko-KR 모두 일요일(0) 시작 관례.
  return 0;
}
```

지원하지 않는 런타임에서는 0 으로 안전 폴백. 호출자가 `weekStartsOn` 명시하면 유추 생략.

### 9.3 parse 관대 vs strict

- **Lenient (기본)**: 구분자 무시, 숫자 3 덩어리로 분해. "2026.4.3", "2026 4 3", "20260403" 모두 동일 해석. `format` 에서 yyyy/MM/dd 순서만 힌트로 사용.
- **Strict**: format 정규식과 정확히 매칭. padding(`02`) 여부까지 일치해야 함. 폼 검증 UX 에 유리.

양 모드 공통:
- 파싱 후 `isValidCalendarDate` 로 존재 여부 체크(예: `2026-02-30` 거부).
- `isDisabledInternal` 로 제약 확인.

---

## 10. 파일 구조

```
src/components/DatePicker/
├── DatePicker.tsx              # Root + Input + Trigger + Calendar + 하위 조립 + namespace export
├── DatePicker.types.ts         # 공개 타입 + 내부 Info 타입
├── DatePicker.dateMath.ts      # isValidCalendarDate / compare / addDays / addMonths / addYears / getDaysInMonth / startOfMonthWeekday / todayCalendarDate / orderedWeekdays
├── DatePicker.format.ts        # formatCalendarDate / parseRaw (lenient+strict) / compileFormatRegex
├── DatePicker.intl.ts          # Intl.DateTimeFormat 팩토리 + deriveWeekStartsOn
├── DatePickerContext.ts        # Context 정의 + useDatePickerContext
├── useDatePickerState.ts       # 3-축 controllable + 액션(selectDay, clear, setToToday) 훅
├── useCalendarGrid.ts          # buildMonthGrid + 각 셀의 Info 계산 (memo)
├── useDatePickerKeyboard.ts    # grid keydown + input keydown 분리 훅
├── DatePicker.theme.ts         # datePickerPalette (light/dark)
├── DatePicker.parts.tsx        # Input / Trigger / Calendar / Header / Nav / MonthLabel / Grid / Day / Footer 구현
└── index.ts                    # 배럴
```

각 파일 책임:

- **DatePicker.tsx**: `DatePickerRoot` 가 `useDatePickerState` 호출, Context.Provider 로 감싸고, children 이 없으면 기본 조립(§2.4) 렌더. namespace export(`DatePicker.Root` 등).
- **DatePicker.dateMath.ts**: 날짜 산술 pure functions. **외부 의존 금지**.
- **DatePicker.format.ts**: format 토큰 compile, formatCalendarDate, parseRaw.
- **DatePicker.intl.ts**: Intl 인스턴스 생성 헬퍼. SSR-safe (`typeof Intl !== "undefined"` 가드).
- **DatePickerContext.ts**: Context + hook. null throw.
- **useDatePickerState.ts**: value/open/currentMonth 를 useControllable 로 묶고, selectDay/clear/setToToday 등 액션 반환.
- **useCalendarGrid.ts**: buildMonthGrid + 각 셀 DayInfo 계산. `useMemo` 의존성 `[year, month, weekStartsOn, single, range, rangeHoverEnd, focusedDay, minDate, maxDate, userIsDisabled]`.
- **useDatePickerKeyboard.ts**: onInputKeyDown, onGridKeyDown, onDayMouseEnter 등 handler 반환.
- **DatePicker.theme.ts**: palette.
- **DatePicker.parts.tsx**: 자식 컴포넌트들. 모두 `useDatePickerContext` 로 상태 수령.

---

## 11. 구현 단계 (후속 agent 가 순차 실행)

각 단계는 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과 상태.

### Step 1 — 타입 + 배럴 + 테마 + 유틸 스켈레톤
1. `DatePicker.types.ts` 작성 (§2.1 전부). single/range discriminated union.
2. `DatePicker.theme.ts` palette.
3. `DatePicker.dateMath.ts` 에 7 개 pure 함수 작성 + unit test 대상(수동 console 검증).
4. `DatePicker.intl.ts` factory 3개 + deriveWeekStartsOn.
5. `DatePicker.format.ts` 에 formatCalendarDate 우선 (yyyy/MM/dd 만).
6. `index.ts` 배럴.
7. `src/components/index.ts` 에 `export * from "./DatePicker";`.
8. `DatePicker.tsx` placeholder: `{ Root:()=>null, Input:()=>null, Trigger:()=>null, Calendar:()=>null, Header:()=>null, Nav:()=>null, MonthLabel:()=>null, Grid:()=>null, Day:()=>null, Footer:()=>null }`.
9. 커밋: `feat(DatePicker): 타입 + 유틸 + 테마 스켈레톤`.

### Step 2 — Context + state 훅
1. `DatePickerContext.ts`.
2. `useDatePickerState.ts` — value 단일(single) 부터. open/currentMonth 포함. range 는 Step 7.
3. `DatePicker.tsx` Root 실제 Provider 렌더. children 없으면 기본 조립.
4. 커밋: `feat(DatePicker): context + state 훅`.

### Step 3 — Input + Trigger + Popover 연결
1. `DatePicker.parts.tsx` 의 `DatePickerInput`, `DatePickerTrigger`.
2. Popover 열림(input focus / trigger click) 처리.
3. typedRaw 상태 + blur/Enter 커밋.
4. 커밋: `feat(DatePicker): input + trigger + popover 연결`.

### Step 4 — Calendar 골격 (Header + MonthLabel + Nav)
1. `DatePicker.parts.tsx` 의 Calendar / Header / MonthLabel / Nav.
2. `Intl.DateTimeFormat` 으로 month label 렌더. ko-KR 검증 포함.
3. Nav 버튼으로 currentMonth 변경.
4. 커밋: `feat(DatePicker): calendar header + navigation`.

### Step 5 — Grid + Day 렌더 (single 선택)
1. `useCalendarGrid.ts` 로 42 셀 계산.
2. DayInfo 의 `isSelected`/`isToday`/`isDisabled`/`inCurrentMonth`/`isFocused` 반영.
3. 셀 클릭으로 `selectDay` 동작.
4. `closeOnSelect` 기본 true.
5. 커밋: `feat(DatePicker): grid + day 선택 (single)`.

### Step 6 — min/max/isDisabled + parseRaw
1. minDate/maxDate 반영 (Grid 셀 disabled, Nav 버튼 disabled).
2. `parseRaw` (lenient + strict) 구현.
3. invalid 시 `aria-invalid` + red border.
4. 커밋: `feat(DatePicker): 제약 + input parsing`.

### Step 7 — range 모드
1. `mode="range"` 경로 — Input 두 개 (start/end), value 타입 `RangeValue`.
2. `selectDay` 로직 확장 (2-step 선택).
3. hover preview 상태 + Day 셀 `isRangePreview`.
4. start/end 스왑(역방향 선택 허용).
5. 커밋: `feat(DatePicker): range 모드`.

### Step 8 — 키보드 탐색
1. `useDatePickerKeyboard.ts`.
2. Input: Enter/Escape/ArrowDown.
3. Grid: Arrow/Home/End/PageUp/PageDown/Shift+PageUp/PageDown/Enter/Escape.
4. focusedDay 이동 시 DOM focus 동기화(ref + useLayoutEffect).
5. 월 자동 전환.
6. 커밋: `feat(DatePicker): 키보드 탐색`.

### Step 9 — Today/Clear Footer + 상호작용 다듬기
1. `DatePicker.Footer` 내장 Today/Clear 버튼.
2. Today: currentMonth 를 오늘의 달로 이동 + focusedDay=today.
3. Clear: value 초기화 + typedRaw 초기화.
4. 커밋: `feat(DatePicker): footer + 보조 액션`.

### Step 10 — 접근성 감사 + Dark theme
1. role/aria-* 전수 점검 (§15).
2. palette dark 통합.
3. focus ring 일관.
4. 커밋: `feat(DatePicker): 접근성 + 다크 테마`.

### Step 11 — 데모 페이지
1. `demo/src/pages/DatePickerPage.tsx` (§12).
2. `demo/src/App.tsx` NAV 추가.
3. 커밋: `feat(DatePicker): 데모 페이지`.

### Step 12 — 마감
1. Props 표 + Usage 예제 (§12).
2. `§20 DoD` 전수 체크.
3. 커밋: `feat(DatePicker): props 표 + usage`.

---

## 12. 데모 페이지

`demo/src/pages/DatePickerPage.tsx`. 기존 `CommandPalettePage` 의 구조를 복제. 섹션별 `<section id="...">` + 우측 사이드바 섹션 nav 연동.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "datepicker", label: "DatePicker", description: "날짜 선택", sections: [
  { label: "Basic (single)",      id: "basic" },
  { label: "Range",               id: "range" },
  { label: "Min / Max",           id: "minmax" },
  { label: "Disabled dates",      id: "disabled-dates" },
  { label: "Locale (ko-KR)",      id: "locale" },
  { label: "Dark",                id: "dark" },
  { label: "Controlled",          id: "controlled" },
  { label: "Format & parse",      id: "format" },
  { label: "Playground",          id: "playground" },
  { label: "Props",               id: "props" },
  { label: "Usage",               id: "usage" },
]},
```

그리고 `Page` 타입에 `"datepicker"` 추가 + 하단 `{current === "datepicker" && <DatePickerPage />}`.

### 12.2 섹션 구성

**Basic (single)**
```tsx
<DatePicker.Root defaultValue={{ year: 2026, month: 4, day: 23 }}>
  <DatePicker.Input />
  <DatePicker.Trigger />
  <DatePicker.Calendar />
</DatePicker.Root>
```

**Range**
```tsx
<DatePicker.Root
  mode="range"
  defaultValue={{ start: { year: 2026, month: 4, day: 5 }, end: { year: 2026, month: 4, day: 12 } }}
>
  <DatePicker.Input part="start" placeholder="Start" />
  <DatePicker.Input part="end" placeholder="End" />
  <DatePicker.Trigger />
  <DatePicker.Calendar />
</DatePicker.Root>
```

**Min / Max**
```tsx
<DatePicker.Root
  minDate={{ year: 2026, month: 4, day: 1 }}
  maxDate={{ year: 2026, month: 5, day: 31 }}
/>
```
"4월 1일 이전 / 5월 31일 이후는 비활성" 안내 문구.

**Disabled dates (주말 비활성)**
```tsx
<DatePicker.Root
  isDisabled={(d) => {
    const weekday = new Date(d.year, d.month - 1, d.day).getDay();
    return weekday === 0 || weekday === 6;
  }}
/>
```

**Locale (ko-KR)**
```tsx
<DatePicker.Root locale="ko-KR" weekStartsOn={0} format="yyyy년 M월 d일" />
```
월 라벨이 "2026년 4월", weekday 가 "일 월 화 수 목 금 토" 로 표시.

**Dark**
```tsx
<div style={{ background: "#0f172a", padding: 24 }}>
  <DatePicker.Root theme="dark" />
</div>
```

**Controlled**
```tsx
const [value, setValue] = useState<CalendarDate | null>({ year: 2026, month: 4, day: 23 });
const [open, setOpen] = useState(false);
const [month, setMonth] = useState<CalendarDate>({ year: 2026, month: 4, day: 1 });

return (
  <>
    <div className="flex gap-2">
      <button onClick={() => setValue({ year: 2026, month: 1, day: 1 })}>New Year</button>
      <button onClick={() => setValue({ year: 2026, month: 12, day: 25 })}>Christmas</button>
      <button onClick={() => setOpen(o => !o)}>Toggle popup</button>
    </div>
    <DatePicker.Root
      value={value} onValueChange={setValue}
      open={open} onOpenChange={setOpen}
      month={month} onMonthChange={setMonth}
    />
    <pre>{JSON.stringify({ value, open, month }, null, 2)}</pre>
  </>
);
```

**Format & parse**
```tsx
<DatePicker.Root format="yyyy/MM/dd" parseMode="strict"
  onParseError={(raw) => toast(`Cannot parse: "${raw}"`)} />
```
사용자가 `2026-04-23` (하이픈) 입력 → strict 에서는 실패 + error 토스트.

**Playground**
상단 컨트롤 바:
- `mode` 라디오 (single / range)
- `locale` select (en-US / ko-KR / ja-JP / de-DE)
- `weekStartsOn` 슬라이더 (0~6)
- `minDate` / `maxDate` date input 폴리필(일반 `<input type="date">` 로 받기)
- `format` text input
- `parseMode` 라디오 (lenient / strict)
- `closeOnSelect` 체크박스
- `disabled` 체크박스
- `theme` 토글 (light / dark)

아래에 실제 `<DatePicker.Root {...args}>` 렌더 + `pre` 로 현재 value / open / month 상태 JSON 표시.

**Props 표**
기존 페이지 패턴 그대로. Root, Input, Trigger, Calendar, Header, Nav, MonthLabel, Grid, Day, Footer 각각 table.

**Usage (4개)**
1. 기본 single (form 의 due-date 필드).
2. Range (travel 예약 start/end).
3. ko-KR + 주말 비활성 + 한 달 시그널 (회의 예약 UI).
4. Controlled + server state (날짜 변경 시 fetch 재요청 예시).

**IDE-급 샘플 코드 (travel 예약)**:
```tsx
function TravelBooking() {
  const [range, setRange] = useState<RangeValue>({ start: null, end: null });
  const today = todayCalendarDate();
  return (
    <DatePicker.Root
      mode="range"
      value={range}
      onValueChange={setRange}
      minDate={today}
      maxDate={addYears(today, 1)}
      locale="ko-KR"
      weekStartsOn={0}
      format="yyyy.MM.dd"
      theme="light"
    >
      <div className="flex items-center gap-2 rounded border px-3 py-2">
        <span className="text-sm text-slate-500">여행</span>
        <DatePicker.Input part="start" placeholder="출발" />
        <span>—</span>
        <DatePicker.Input part="end" placeholder="도착" />
        <DatePicker.Trigger aria-label="달력 열기" />
      </div>
      <DatePicker.Calendar />
    </DatePicker.Root>
  );
}
```

---

## 13. 검증 계획

### 13.1 자동화

```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

특히 `exactOptionalPropertyTypes`: `DatePickerRootSingleProps` / `RangeProps` discriminated union 이 탄탄해야 하므로, `mode` 를 지정하지 않은 경우 단일 모드 default 가 타입 추론되는지 테스트.

`noUncheckedIndexedAccess`: `React.Children.toArray(children)[i]` 는 undefined 가능.

### 13.2 수동 (demo dev server)

```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic: 날짜 클릭 → input 에 "2026-04-23" 반영 + 팝업 닫힘.
- [ ] Basic: input 에 "2026-4-3" 타이핑 → Enter → 2026년 4월 3일 선택.
- [ ] Basic: input 에 "not-a-date" → Enter → aria-invalid + red border.
- [ ] Range: 4/5 클릭 → hover 이동 시 preview 구간 강조 → 4/12 클릭 → range 확정, 팝업 닫힘.
- [ ] Range: 역방향 선택(4/12 먼저 → 4/5) 도 start/end 스왑 정상.
- [ ] Min/Max: minDate 이전 / maxDate 이후 셀은 fg=disabled, 클릭 무반응, Nav 버튼 경계에서 disabled.
- [ ] Disabled dates: 주말 비활성. 키보드로 이동은 가능하지만 Enter 로 선택 불가.
- [ ] Locale ko-KR: 헤더 "2026년 4월", weekday "일 월 화 …".
- [ ] Locale en-US: 헤더 "April 2026", weekday "Sun Mon …".
- [ ] Dark: 모든 요소 다크로 전환, focus ring 보임.
- [ ] Controlled: 외부 버튼으로 value/open/month 제어. 내부 클릭 시 onValueChange 만 호출되고 외부 state 가 주도.
- [ ] Format & parse strict: `yyyy/MM/dd` 만 허용, 다른 구분자 거부.
- [ ] Playground: 모든 컨트롤 조합 실시간 반영.
- [ ] 다른 페이지 리그레션 없음 (CommandPalette, SplitPane 등).

### 13.3 엣지 케이스

- [ ] **윤년**: `getDaysInMonth(2024, 2) === 29`, `getDaysInMonth(2023, 2) === 28`, `getDaysInMonth(2100, 2) === 28` (평년), `getDaysInMonth(2000, 2) === 29` (400의 배수). Grid 렌더에서 2월 말일이 정확히 포함되는지 육안 확인.
- [ ] **DST (Daylight Saving Time)**: 뉴욕 2026-03-08 (spring forward) + 11-01 (fall back) 에서 해당 주 grid 가 7 셀 모두 정상 표시. `addDays` 가 24 시간 가감이 아니라 calendar-day 기반이므로 영향 없어야 함. `TZ=America/New_York node -e "..."` 로 dateMath 유닛 검증.
- [ ] **cross-month range**: 2026-04-28 ~ 2026-05-03 선택 → Grid 를 4월/5월 넘나들며 `isInRange` 가 일관되게 true.
- [ ] **12월 → 1월**: 2026-12-31 에서 next-month → 2027-01. 연도 rollover 안전.
- [ ] **1월 → 12월**: 2026-01 에서 prev-month → 2025-12.
- [ ] **min/max 와 currentMonth**: minDate=2026-04-01 일 때 prev-month/prev-year 버튼 disabled. 그러나 키보드 ArrowLeft 로 3월 30일로 이동 시도 → 4월 1일에서 멈춤(clamp).
- [ ] **value 를 prop 변경**: controlled 시 value 바뀌면 currentMonth 자동 동기화 (uncontrolled month 일 때만).
- [ ] **자정이 없는 TZ**: 과거 브라질의 DST 개시일처럼 자정이 skip 되는 날 — `new Date(2018, 10, 4)` 가 `00:00` 대신 `01:00` 을 반환. `getDate()` 는 `4` 로 여전히 올바르므로 Grid 렌더 정상. (이 경우에도 동작해야 한다는 사실을 문서화.)
- [ ] **SSR**: `DatePicker.intl.ts` 의 `typeof Intl` 가드. `todayCalendarDate()` 가 서버/클라 렌더 불일치 없도록 최초 마운트 후에만 호출(`useEffect` 로 set).
- [ ] **controlled value 에 null 전달 → 해제**: input 비워짐, currentMonth 유지(점프 없음).
- [ ] **range 모드 start 만 있는 채로 팝업 닫기**: end=null 상태 유지. 다음 open 시 start 부터 재개.
- [ ] **disabled prop 전체**: input readonly, trigger disabled, grid 상호작용 불가.

---

## 14. 성능

### 14.1 비용 견적

- **한 달 렌더 = 42 day 셀**. 매우 가벼움. React reconciliation 이 42 key 를 diff 하는 것은 <1 ms.
- memo 필요 없음. 다만 `Intl.DateTimeFormat` 인스턴스는 재사용 필요(다음 절).
- parse regex 는 format 변경 시마다 compile — useMemo.

### 14.2 핵심 최적화

1. **`Intl.DateTimeFormat` 캐싱**: `useMemo` with `[locale]` 의존성. locale 바뀌지 않는 한 같은 인스턴스.
2. **buildMonthGrid memoization**: `useMemo` with `[year, month, weekStartsOn]`.
3. **DayInfo 배열 memoization**: 위 grid + `[single, range, rangeHoverEnd, focusedDay, minDate, maxDate, userIsDisabled]`.
4. **hover preview**: state update 가 day cell 마다 발생하지만, 42 셀 * 단일 re-render 로 <2 ms. 별도 throttle 불필요.
5. **Day 컴포넌트 React.memo**: `DayInfo` shallow compare. DayInfo 를 매번 새 ref 로 만들되 값이 같으면 memo 가 어쨌든 리렌더하므로, 사실상 memo 효과는 크지 않음. v1 은 memo 생략, 데모로 프로파일링 후 v1.1 검토.

### 14.3 측정

DevTools Performance 탭에서 "open → navigate 12 month → close" 시퀀스 녹화 → 총 scripting 시간 <50 ms 목표.

---

## 15. 접근성

- root: `role="group"` + `aria-label="Date picker"` (사용자 override 가능).
- input: `type="text"`, `inputmode="numeric"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls={dialog id}`, `aria-invalid` (parse 실패 시).
- trigger button: `aria-label="Open calendar"`, `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`.
- dialog: `role="dialog"`, `aria-modal="false"` (modal 아님), `aria-labelledby={monthLabel id}`.
- month label: `aria-live="polite"` + `aria-atomic="true"` — 스크린리더가 월 이동을 읽음.
- grid: `role="grid"`, `aria-labelledby={monthLabel id}`, `aria-readonly="false"`, `aria-multiselectable="false"` (range 에서도 screen-reader 의미는 단일 셀 선택을 연속).
- weekday 헤더: `role="row"` + 각 `role="columnheader"` + `abbr` 속성(예: "Monday").
- 날짜 셀:
  - `role="gridcell"`
  - `aria-selected={isSelected || isRangeStart || isRangeEnd || isInRange}`
  - `aria-disabled={isDisabled}`
  - `aria-current="date"` (today 인 경우)
  - `tabindex={isFocused ? 0 : -1}` — roving tabindex
  - 스크린리더용 전체 label: `aria-label` 에 `fmtAriaDate.format(toDate(day))` — "Thursday, April 23, 2026".
- Nav 버튼: 각각 `aria-label`:
  - prev-year: "Go to previous year"
  - prev-month: "Go to previous month"
  - next-month: "Go to next month"
  - next-year: "Go to next year"
- Today / Clear: 일반 `<button>` + 명시 label.
- Escape 복귀: 팝업 닫을 때 input 또는 trigger 로 focus 복귀.
- 색상 대비: palette 내 모든 fg/bg 조합 WCAG AA (4.5:1) 이상.
- prefers-reduced-motion: 팝업 fade 만 사용, 추가 애니메이션 없음.

---

## 16. 알려진 트레이드오프 · 결정

1. **`Intl.DateTimeFormat` vs `date-fns` / `dayjs`**: plastic 이 zero-deps 를 천명. 포맷 범위(월/요일/full date)가 Intl 로 100% 커버되며 런타임 내장이므로 번들 영향 0. 손해: `Intl` 은 런타임별 output 이 미세 상이(예: `dateStyle: "full"` 의 쉼표 유무 등)지만 라벨 용도에서는 문제 없음. **채택: Intl 전용.**
2. **내부 표현 `CalendarDate` vs `Date`**: Date 객체는 TZ 슬립(UTC 자정 ↔ 로컬) 버그의 원천. `{year, month, day}` 로 좌표화하여 대부분의 버그 차단. 손해: 사용자가 Date 를 넘기면 한 번 변환 비용. API 에서 Date 도 받되 즉시 변환하여 context 에는 CalendarDate 로만 유지.
3. **UTC vs Local**: 로컬 TZ 고정. 명시 TZ 지원은 `Temporal` API 가 안정화된 시점(또는 `Intl.DateTimeFormat.formatToParts` + 자체 TZ 계산)에 v2 로 재평가. 다중 TZ 가 필요한 앱(글로벌 예약)은 value 레이어에서 자체 변환 — 라이브러리는 "로컬 grid" 역할만.
4. **single + range 를 같은 `Root`**: Radix/react-aria 처럼 컴포넌트 자체를 분리(`DatePicker` vs `DateRangePicker`) 하는 선택지도 있었다. 선택 근거: **상당수 로직 공유**(Grid, Keyboard, Header, Nav), UI 외관이 동일, `mode` 런타임 토글 수요 존재(필터 위젯). 단점: value 타입 union 이 된다 → TS 상 discriminated union 으로 해결.
5. **range hover preview: hover vs click-and-hold**: Notion 은 hover, react-day-picker 도 hover. 일관성 우선 → hover.
6. **range end 가 start 보다 앞선 경우**: 역방향도 허용, 내부에서 swap. 사용자가 실수로 "5일 → 3일" 을 고르면 3~5로 해석. 대안(거부)은 UX 가 답답.
7. **month picker (drop-down)**: 월/년 라벨을 클릭하면 year grid 가 나오는 UX 도 고려. v1 은 Nav 4 개(‹ ‹‹ › ››)로 충분. "연도 바로 이동" 은 v1.1.
8. **close on select 정책**: single 은 true 가 자연. range 는 end 확정 때만 닫음. 사용자 override 가능.
9. **controlled month 시 value 변경 동기화 안 함**: 사용자가 month 를 완전 제어한다면 value 와 독립. 애매해 보이나 owner 명시 선택이 맞음.
10. **ARIA live region 범위**: month label 만 live. 셀 선택 자체는 screen reader 가 focus 변경으로 알림.
11. **format 토큰 수 v1 제한**: yyyy/yy/MM/M/dd/d 만. MMMM(월 이름) 등은 v1.1 — Intl.formatToParts 로 literal map 생성.
12. **parse lenient 기본**: "타이핑 편의 > 형식 엄격" 이 공용 폼 UX 의 중론. 엄격이 필요한 경우만 strict 지정.
13. **팝업 구현체로 plastic 의 `Popover` 사용**: 직접 `createPortal` 하지 않고 기존 컴포넌트에 위임하여 일관성 확보. 내부 close 로직(outside click, Escape)을 재구현하지 않는다.
14. **42 셀 고정 vs 가변 (4~6 weeks)**: 가변 시 Popover 높이 jitter. UX 손실 > 스필오버 1~5 셀의 혼란. 고정 채택.
15. **Input 두 개 vs 하나 (range)**: 하나의 input 에 "2026-04-05 ~ 2026-04-12" 로 묶는 방법도 가능. 타이핑 편집이 난감해서 두 개로 분리. 필요 시 v1.1 `SingleInputRange` prop.

---

## 17. 후속 작업 (v1.1+)

- **Time picker**: `<DateTimePicker>` 또는 `<DatePicker timePrecision="minute">`. 시/분 스피너 + AM/PM.
- **2-month view**: `numberOfMonths={2}` — range 선택 UX 가 크게 개선.
- **Preset ranges**: "오늘", "어제", "지난 7일", "이번 달", "지난 달" 프리셋. `presets: { label: string; value: RangeValue }[]`.
- **Masked input**: `<DatePicker.Input mask="yyyy-mm-dd" />` — cursor 자동 jump.
- **Custom footer**: 현재 Footer 는 children override 가능하지만, `<DatePicker.Preset label="Today" />` 같은 편의 컴포넌트 세트 추가.
- **Week / Month / Year picker**: `picker="week"` 등.
- **Multiple selection**: `mode="multiple"` — 배열 값.
- **Year grid navigation**: 헤더의 "2026" 클릭 시 12 년 grid 로 전환.
- **Locale-specific format 토큰**: MMMM(월 이름), EEE(요일 이름) 지원.
- **Animation**: 월 좌/우 슬라이드 전환.
- **Form integration**: `react-hook-form` / `zod` 어댑터 없이도 기본적으로 HTML form 에 잘 통합되는지 검토(hidden input).
- **`storageKey` persist**: SplitPane 과 유사한 localStorage 복원 지원 (선택).
- **Temporal API 지원**: Chrome 129+ 에서 `Temporal.PlainDate` 표준화. adapter prop.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| useControllable (3-축 이중 API 모델) | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| Popover (팝업 앵커·outside click·Escape) | `/Users/neo/workspace/plastic/src/components/Popover/` |
| PathInput (text input + suggestion popover + light/dark 패턴) | `/Users/neo/workspace/plastic/src/components/PathInput/` |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 데모 페이지 레이아웃 최신 레퍼런스 | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| tsconfig 제약 (`exactOptionalPropertyTypes` 등) | `/Users/neo/workspace/plastic/tsconfig.json` |

---

## 19. 의존성 영향

신규 런타임 의존 **없음**. React 18.3 (기존) + 브라우저 내장 API (`Intl.DateTimeFormat`, `Intl.Locale`, `Date`, `useId`, DOM 표준) 만 사용.

번들 영향:
- DatePicker 자체 예상 크기: ~7~9 KB (min), ~3~4 KB (min+gzip). 유사한 헤드리스 구현(react-day-picker headless core) 대비 30~40% 작은 수준으로 예측 — 이유: `date-fns` 미사용으로 ~15 KB 절감.
- plastic 전체 dist 영향: 기존 Popover/PathInput 을 재사용하므로 추가 footprint 는 DatePicker 파일군 본체만.

Browser 지원:
- `Intl.DateTimeFormat`, `Intl.Locale`: 모든 모던 브라우저.
- `Intl.Locale.prototype.getWeekInfo`: Chrome 99+, Firefox 회피(폴백 경로 보유), Safari 16+. 폴백이 있으므로 지원 대상에 포함.
- `useId`: React 18+.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/datepicker` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] 다른 페이지(CommandPalette, SplitPane, PipelineGraph, CodeView, HexView, DataTable 등) 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./DatePicker";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 의존 없음).
- [ ] Props 문서 섹션이 Props 표로 채워져 있음 (Root / Input / Trigger / Calendar / Header / Nav / MonthLabel / Grid / Day / Footer).
- [ ] Usage 섹션에 최소 4 개 스니펫 (basic / range / ko-KR+주말 비활성 / controlled).
- [ ] 데모 Playground 에서 모든 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드 단독으로 (마우스 없이) Basic/Range 양쪽 선택 완료 가능.
- [ ] 스크린리더(VoiceOver) 에서 "dialog" 진입, month label 변경, 날짜 셀 label(full date) 전부 읽힘.
- [ ] `Intl.DateTimeFormat` 이외의 외부 날짜 라이브러리 import 없음 (eslint/수동 grep 검증: `import .* from "date-fns|dayjs|luxon|moment"` 0 건).
- [ ] ko-KR / en-US 두 locale 에서 각각 월 라벨·weekday 라벨·ARIA full date 가 자연스러움.

---

**끝.**
