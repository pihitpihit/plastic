# Combobox 컴포넌트 설계문서

## Context

plastic 라이브러리에 "텍스트 입력으로 옵션을 필터링/선택하는 자동완성 입력 프리미티브" `Combobox` 를 추가한다. 역할 비유: VSCode 의 "Go to Symbol" 입력(ctrl+shift+o), IntelliJ 의 "Search Everywhere" 박스, GitHub 의 repo/user autocomplete, Linear 의 assignee picker, Notion 의 `@`-mention, Algolia InstantSearch 의 검색 박스, Slack 의 채널 picker. 즉 "input 한 줄 + dropdown 리스트" 형태로 사용자가 타이핑하여 후보를 좁혀 나가는, 모든 설정/폼 UI 의 기본 블록이다.

plastic 은 이미 `CommandPalette` (009) — 전역 단축키로 뜨는 **모달** 검색기 — 를 갖고 있다. 본 컴포넌트 `Combobox` 는 그와 프론트엔드 로직(필터·async·키보드·하이라이트 등) 상당 부분을 공유하지만, 결정적으로 다음이 다르다.

- **인라인 배치**. 포털/오버레이 없이 폼 필드 자리에 그대로 놓인다 (드롭다운만 floating).
- **값(value) 이 존재**. 선택 결과가 외부 상태에 저장되며 form 의 일부로 동작.
- **freeform 허용**. 사용자가 목록에 없는 임의 텍스트를 그대로 값으로 확정할 수 있는 모드 제공.
- **multi-select 변형**. 칩(chip/tag) 표시와 개별 삭제.
- **strict 모드** 의 존재. 목록 외 값을 차단하는 전형적 "Select + 검색" 용도.

따라서 `CommandPalette` 를 감싸 인라인으로 박는 어댑터가 아니라, 로직 공유(필터·fuzzy·debounce·keyboard)는 `_shared/` 로 승격하되 **독립 compound 컴포넌트**로 설계한다.

참고 (prior art — UX/API 근거):
- **Radix UI `Combobox`** (primitives.combobox) — compound (`Root/Trigger/Input/Portal/Content/Viewport/Item/Empty`), controlled-first, headless.
- **Headless UI `Combobox`** (tailwindlabs) — `displayValue`, `by`, multiple, nullable, custom filter, `ComboboxOptions`.
- **Ant Design `AutoComplete` / `Select showSearch`** — `options` prop, `filterOption`, `notFoundContent`, `loading`, grouped options.
- **react-select** — 비동기 옵션 (`AsyncSelect`), `formatOptionLabel`, `createable`, multi with chips.
- **Downshift** (pre-hooks 시대 표준) — `useCombobox` 훅 기반, WAI-ARIA 1.2 combobox pattern 충실.
- **MUI `Autocomplete`** — `freeSolo`, `multiple`, `getOptionLabel`, `filterOptions(options, state)`.
- **Chakra `AutoComplete` (choc-ui)** — tagged/chip multi, 강조 하이라이트.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅. Combobox 는 `value`, `inputValue`, `open` 세 축을 각각 useControllable 로 관리한다.
- `src/components/CommandPalette/` — 본 컴포넌트의 **최대 재사용 원천**. 특히 `fuzzyMatch.ts` (전체 이관/공유), `CommandPaletteRoot.tsx` 의 async debounce + searchSeqRef cancel 패턴, `CommandPaletteList.tsx` 의 activeIndex/scrollIntoView, `CommandPaletteItem.tsx` 의 match-highlight 렌더 로직.
- `src/components/Popover/` — floating dropdown 위치 계산을 위한 `_shared/useFloating` 훅 의존처. Combobox 의 `Content` 는 Popover 와 동일한 floating 로직을 재사용 (단 role 은 `listbox`, modal 아님).
- `src/components/PathInput/` — compound + input-중심 UX 참고 (Root/Input/Button/Status 배치, 이벤트 bubble 규칙).
- `src/components/index.ts` — 배럴 등록 위치.
- `demo/src/App.tsx` — NAV / Page 타입 / 라우팅 추가 위치.
- `demo/src/pages/CommandPalettePage.tsx` — 데모 페이지 레이아웃·Props 표·Playground 패턴 참고 (가장 유사 컴포넌트).
- `tsconfig.json` — `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 기본: 동기 옵션 + 단일 선택 + strict
<Combobox.Root
  options={fruits}                       // { value: string; label: string }[]
  value={value}
  onValueChange={setValue}
  placeholder="과일을 검색하세요"
>
  <Combobox.Input />
  <Combobox.Trigger>▾</Combobox.Trigger>
  <Combobox.Content>
    <Combobox.Loading>불러오는 중…</Combobox.Loading>
    <Combobox.Empty>결과 없음</Combobox.Empty>
    {results.map((o) => (
      <Combobox.Item key={o.value} value={o.value} label={o.label} />
    ))}
  </Combobox.Content>
</Combobox.Root>
```

간단 사용 (`options` 만 전달하고 Item 렌더는 내부 기본):

```tsx
<Combobox.Root
  options={fruits}
  value={value}
  onValueChange={setValue}
/>
```

multi + async + freeform:

```tsx
<Combobox.Root
  multiple
  freeform                               // 목록 밖 텍스트 허용
  value={tags}                           // string[]
  onValueChange={setTags}
  onSearch={async (q) => api.suggest(q)} // Promise<Option[]>
  searchDebounce={200}
  minChars={1}
  theme="dark"
>
  <Combobox.Input placeholder="태그…" />
  <Combobox.Content />
</Combobox.Root>
```

렌더 결과 (개념):

```
┌──────────────────────────────────────┐  ← Combobox.Root (relative)
│ [✕ React] [✕ TS]  type to search…  ▾ │  ← Input + chips + Trigger
└──────────────────────────────────────┘
 ┌──────────────────────────────────┐
 │  ⎯ Fruits ⎯                       │   ← Group heading
 │  Ap·p·le            ← highlight   │
 │  Apri·cot                          │
 │  ──────────────                    │
 │  Banana                            │
 │  (empty) 결과 없음                  │
 └──────────────────────────────────┘
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Root` / `Input` / `Trigger` / `Content` / `Item` / `Group` / `Empty` / `Loading` 의 8 소계. Context 로 상태 공유.
- **런타임 의존 zero**. React + DOM + 기존 `_shared/useFloating` 만. 새 런타임 라이브러리 없음.
- **headless 지향**. 스타일은 최소 기본값(VSCode quality) 을 주되, 모두 `className`/`style`/`asChild`(trigger) 로 override 가능.
- **3축 controlled API**. `value` (선택값) / `inputValue` (입력 텍스트) / `open` (드롭다운 열림) 모두 `useControllable` 로 개별 controlled.
- **단일/다중 선택, strict/freeform, 동기/비동기** 4 × 2 × 2 매트릭스를 단일 컴포넌트로 커버.
- **접근성 WAI-ARIA 1.2 Combobox** 패턴 준수: `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-activedescendant`, Popup `role="listbox"`, Option `role="option"` + `aria-selected`.
- **v1 에 virtualization 없음**. maxResults cap + filter 내 O(N) 로만 성능 확보. 1,000 개 수준까지 정상. 더 큰 데이터는 v1.1 (§17) 에서 `react-window` 통합.

---

## 1. Goals / Non-goals

### Goals (v1)
1. 텍스트 입력으로 옵션 리스트를 실시간 필터링.
2. 단일 (`multiple=false`, 기본) 및 다중 (`multiple`) 선택.
3. strict 모드 (기본) — 목록 내 값만 확정. freeform 모드 — 임의 텍스트 값 허용.
4. 동기 옵션 (`options` prop) + 사용자 정의 필터 함수 (`filter`).
5. 비동기 옵션 (`onSearch` → `Promise<Option[]>`), debounce 및 in-flight cancel.
6. 하이라이트: 매치된 부분 문자열 시각 강조 (fuzzy 매치 인덱스 기반).
7. 그룹핑: `Option.group` 필드 + `Combobox.Group heading=...` 자동/수동 둘 다.
8. `Empty` / `Loading` 상태 슬롯.
9. 키보드 완전 조작 — Arrow/Enter/Tab/Esc/Home/End/Backspace(multi chip).
10. controlled/uncontrolled 이중 API — `value` / `inputValue` / `open` 세 축.
11. Light/Dark 테마.
12. `minChars`, `maxResults`, `searchDebounce` 제약 prop.
13. 포털 없는 인라인 floating dropdown (Popover 의 `useFloating` 재사용).
14. 기본 스타일 (VSCode palette 유사: subtle border + shadow + dark 지원).

### Non-goals (v1 제외)
- **Virtualization**: 대량(>1,000) 옵션의 `react-window` / `@tanstack/react-virtual` 통합. v1 은 `maxResults` (기본 50) 로 잘라 우회. v1.1 에서.
- **Creatable(생성)**: "새 옵션 만들기" 전용 UX (`Create "foo"` 아이템). freeform 이 부분적으로 커버하나, 전용 render prop + `onCreate(label)` 콜백은 v1.1.
- **async pagination / infinite scroll**: `onSearch` 는 단일 응답만 수신. 페이지네이션(cursor/loadMore)은 v1.2.
- **태그 입력 (태그 전용 UX)**: multi + freeform 조합이 태그 필드를 근사하지만, "enter 로 임의 텍스트 추가" + "패턴 검증" 같은 태그-특화 동작은 별도 `TagInput` 컴포넌트(v1.2) 로 분리.
- **서버사이드 렌더**: v1 은 `useId`/`useFloating` 등 CSR 가정. SSR 안전성은 `typeof document` 가드만 추가.
- **옵션 자체의 비동기 lazy 트리**: CommandPalette 의 `children` 형 중첩 네비게이션은 여기 포함하지 않음. Combobox 는 평면 리스트 + 단일 레벨 그룹만.
- **풍부한 렌더 (이미지/부제 2줄 등)**: `Item` 의 render slot 은 v1 에서 `label` 과 단일 child 만. 복합 레이아웃은 사용자가 `<Combobox.Item>` 에 custom children 을 넘기는 것으로 해결.
- **form integration helpers**: react-hook-form / Formik adapter 는 배포하지 않는다. 컴포넌트가 controlled API 만 잘 지키면 사용자 측에서 연결.
- **case-sensitive 옵션**: 기본 필터는 case-insensitive 고정. sensitive 요구는 `filter` 커스텀으로.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Combobox/Combobox.types.ts`

```ts
import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type ComboboxTheme = "light" | "dark";

/**
 * Combobox 의 단일 옵션.
 * - `value` 는 내부 식별자 (고유해야 함). onValueChange 로 전달되는 값.
 * - `label` 은 표시 텍스트. 필터·하이라이트 대상.
 * - `group` 은 선택적 그룹 헤딩. 동일 group 값을 가진 옵션끼리 묶여 렌더.
 * - `disabled` 는 선택 차단.
 * - `keywords` 는 추가 검색어 (label 외). fuzzy 매치 대상.
 * - `meta` 는 user-land 임의 데이터. onValueChange 에는 포함되지 않지만 커스텀 렌더에서 접근 가능.
 */
export interface ComboboxOption<Meta = unknown> {
  value: string;
  label: string;
  group?: string | undefined;
  disabled?: boolean | undefined;
  keywords?: string[] | undefined;
  meta?: Meta | undefined;
}

export interface ComboboxMatchResult {
  option: ComboboxOption;
  score: number;
  labelMatches: number[];   // hit indices in label
}

export type ComboboxFilter = (
  query: string,
  options: ComboboxOption[],
) => ComboboxOption[] | ComboboxMatchResult[];

/**
 * multiple=false 일 때 value 는 string | null,
 * multiple=true  일 때 value 는 string[].
 *
 * 타입 유니온 대신 두 개의 separate props 로 오버로드하면 사용처가
 * 더 단순하지만, 본 레포는 CommandPalette 와 같이 props 하나로
 * 합쳐 런타임에 분기하는 방식을 택한다. typescript 의 conditional
 * overload 는 RootProps 제네릭으로 제공.
 */

export interface ComboboxRootPropsSingle
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  multiple?: false | undefined;

  value?: string | null | undefined;
  defaultValue?: string | null | undefined;
  onValueChange?: ((next: string | null) => void) | undefined;

  options?: ComboboxOption[] | undefined;

  inputValue?: string | undefined;
  defaultInputValue?: string | undefined;
  onInputValueChange?: ((next: string) => void) | undefined;

  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;

  filter?: ComboboxFilter | undefined;
  onSearch?: ((query: string) => Promise<ComboboxOption[]>) | undefined;
  searchDebounce?: number | undefined;
  minChars?: number | undefined;
  maxResults?: number | undefined;

  freeform?: boolean | undefined;
  strict?: boolean | undefined;     // freeform 의 반대. 기본 true. 명시적 표현용.

  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  placeholder?: string | undefined;

  theme?: ComboboxTheme | undefined;

  /** 외부에서 label 매핑이 필요할 때 (freeform 값 등). 기본 identity. */
  getOptionLabel?: ((value: string) => string) | undefined;

  children?: ReactNode | undefined;
}

export interface ComboboxRootPropsMultiple
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  multiple: true;

  value?: string[] | undefined;
  defaultValue?: string[] | undefined;
  onValueChange?: ((next: string[]) => void) | undefined;

  options?: ComboboxOption[] | undefined;

  inputValue?: string | undefined;
  defaultInputValue?: string | undefined;
  onInputValueChange?: ((next: string) => void) | undefined;

  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;

  filter?: ComboboxFilter | undefined;
  onSearch?: ((query: string) => Promise<ComboboxOption[]>) | undefined;
  searchDebounce?: number | undefined;
  minChars?: number | undefined;
  maxResults?: number | undefined;

  freeform?: boolean | undefined;
  strict?: boolean | undefined;

  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  placeholder?: string | undefined;

  theme?: ComboboxTheme | undefined;

  getOptionLabel?: ((value: string) => string) | undefined;

  children?: ReactNode | undefined;
}

export type ComboboxRootProps =
  | ComboboxRootPropsSingle
  | ComboboxRootPropsMultiple;

export interface ComboboxInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type" | "disabled" | "readOnly"
  > {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  /** 기본 제공 쉐브론 아이콘 숨김. 사용자 children 만 렌더. */
  plain?: boolean | undefined;
}

export interface ComboboxContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 최대 높이. 넘치면 스크롤. 기본 "min(320px, 40vh)".
   */
  maxHeight?: number | string | undefined;
  /** 드롭다운과 input 사이의 간격 (px). 기본 4. */
  offset?: number | undefined;
  /** 강제 placement. 기본 "bottom-start", 공간 부족하면 auto flip. */
  placement?: "bottom-start" | "top-start" | "auto" | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export interface ComboboxItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  value: string;
  /**
   * 선택적. 명시되지 않으면 children(string 일 때) 또는 value 로 fallback.
   * 하이라이트 매치는 label 기준.
   */
  label?: string | undefined;
  /** 선택 차단. 기본 false. */
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxGroupProps extends HTMLAttributes<HTMLDivElement> {
  heading: string;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxEmptyProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface ComboboxLoadingProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### 2.2 배럴

```ts
// src/components/Combobox/index.ts
export { Combobox } from "./Combobox";
export type {
  ComboboxRootProps,
  ComboboxRootPropsSingle,
  ComboboxRootPropsMultiple,
  ComboboxInputProps,
  ComboboxTriggerProps,
  ComboboxContentProps,
  ComboboxItemProps,
  ComboboxGroupProps,
  ComboboxEmptyProps,
  ComboboxLoadingProps,
  ComboboxOption,
  ComboboxMatchResult,
  ComboboxFilter,
  ComboboxTheme,
} from "./Combobox.types";
```

그리고 `src/components/index.ts` 에 `export * from "./Combobox";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// Combobox.tsx
export const Combobox = {
  Root: ComboboxRoot,
  Input: ComboboxInput,
  Trigger: ComboboxTrigger,
  Content: ComboboxContent,
  Item: ComboboxItem,
  Group: ComboboxGroup,
  Empty: ComboboxEmpty,
  Loading: ComboboxLoading,
};
```

displayName 은 각각 `"Combobox.Root"`, `"Combobox.Input"`, … 형태.

---

## 3. 도메인 모델

### 3.1 `value` vs `label` 의 분리

Combobox 는 본질적으로 **식별자 ↔ 표시 텍스트** 두 층이 분리된다.

- `value: string` — 내부 식별자. 고유. 외부 상태(폼) 에 저장되는 것은 이 값.
- `label: string` — 사람에게 보이는 텍스트. 필터·하이라이트 대상. 동일 value 라도 라벨은 다국어화될 수 있다 (사용자 책임).

`inputValue` (사용자가 타이핑한 현재 텍스트) 는 `label` 과 같은 도메인에 있으며, "선택이 확정되면 inputValue ← 선택된 옵션.label" 의 동기화 규칙을 따른다 (§5.4).

### 3.2 freeform vs strict

- **strict (기본)**: 사용자가 확정한 값은 반드시 `options` 중 하나의 `value` 여야 한다. Enter/blur 시점에 현재 inputValue 가 어떤 옵션 label 과도 매칭되지 않으면 "선택되지 않은" 상태. blur 시 inputValue 는 마지막 유효 선택의 label 로 **되돌림** (revert).
- **freeform**: Enter/blur 시점에 inputValue 자체가 값으로 확정된다. 즉 `onValueChange(inputValue)`. 이 경우 options 목록 밖 값도 허용.

충돌 규칙: `freeform && strict` 동시 지정은 dev warn + freeform 우선. `freeform=false && strict=false` 조합은 dev warn + strict 로 해석.

### 3.3 single vs multiple

- **single** (`multiple=false`, 기본): value 는 `string | null`. 선택 즉시 드롭다운 닫고 inputValue 를 해당 옵션 label 로 동기화.
- **multiple** (`multiple=true`): value 는 `string[]`. 선택 시 value 배열에 추가(중복은 무시), inputValue 는 **빈 문자열로 리셋**하고 드롭다운은 **열린 상태 유지** (연속 선택 UX).
- chip 삭제: input 이 비었을 때 Backspace → 마지막 chip 삭제. 또는 chip 내부의 `✕` 클릭.

### 3.4 filter contract

기본 필터는 `CommandPalette/fuzzyMatch.ts` 의 `filterItems` 를 `ComboboxOption` 형으로 얇게 감싼 것. 사용자가 `filter` prop 을 지정하면 완전 대체.

```ts
filter: (query: string, options: ComboboxOption[]) => ComboboxOption[] | ComboboxMatchResult[]
```

반환 타입이 `ComboboxOption[]` 면 하이라이트 매치 인덱스를 잃는다 (단색 렌더). `ComboboxMatchResult[]` 를 돌려주면 Item 이 해당 index 로 `<mark>` 렌더. 이 이중 타입은 사용자 필터 구현 부담을 낮추기 위함 (가장 쉬운 구현 — String.includes 기반 — 은 `ComboboxOption[]` 만 돌려도 동작).

### 3.5 Context 모양

```ts
interface ComboboxContextValue {
  // ── 정체성
  listId: string;
  getItemId: (value: string) => string;
  theme: ComboboxTheme;
  disabled: boolean;
  readOnly: boolean;

  // ── 모드
  multiple: boolean;
  freeform: boolean;

  // ── 상태 (3축)
  value: string[] | string | null;   // multiple 여부에 따라
  open: boolean;
  setOpen: (next: boolean) => void;
  inputValue: string;
  setInputValue: (next: string) => void;

  // ── 결과
  results: ComboboxOption[];
  matches: Map<string, ComboboxMatchResult>;
  isLoading: boolean;
  activeIndex: number;
  setActiveIndex: (i: number) => void;

  // ── 액션
  selectOption: (opt: ComboboxOption) => void;
  commitFreeform: (text: string) => void;
  removeValue: (v: string) => void;            // multi 전용
  clearAll: () => void;

  // ── DOM refs
  inputRef: React.RefObject<HTMLInputElement | null>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
  getOptionLabel: (value: string) => string;
}
```

Context 는 null-able; `useComboboxContext()` 는 null 에서 throw.

---

## 4. 시각 / 구조 설계

### 4.1 DOM 구조 (single 기준, 기본 스타일)

```
<div class="cb-root" data-theme="light" data-disabled="false">
  <div class="cb-anchor" role="combobox"
       aria-haspopup="listbox"
       aria-expanded="{open}"
       aria-controls="{listId}"
       aria-owns="{listId}">
    <input class="cb-input"
           type="text"
           role="combobox"            /* React 19 에선 나눠 씀. WAI 1.2 규격 */
           aria-autocomplete="list"
           aria-activedescendant="{getItemId(active)}"
           aria-expanded="{open}"
           aria-controls="{listId}"
           placeholder="…" />
    <button class="cb-trigger"
            tabindex="-1"
            aria-label="Toggle"
            data-state="{open}">▾</button>
  </div>
  {open && (
    <div class="cb-content"
         id="{listId}"
         role="listbox"
         tabindex="-1"
         style="position:absolute; top:…; left:…; width:…">
      <div class="cb-group" role="group" aria-labelledby="{h1}">
        <div id="{h1}" class="cb-group-heading">Fruits</div>
        <div class="cb-item" role="option"
             id="{getItemId('apple')}"
             aria-selected="{activeIndex===i}"
             data-disabled="false"
             data-active="{activeIndex===i}">
          <span class="cb-item-label">
            Ap<mark>p</mark>le     /* label with highlight */
          </span>
        </div>
      </div>
      <div class="cb-empty" role="status">결과 없음</div>
      <div class="cb-loading" role="status" aria-live="polite">…</div>
    </div>
  )}
</div>
```

multi 인 경우 `cb-anchor` 내부에 input 앞쪽으로 `chip` 리스트가 추가된다:

```
<div class="cb-anchor …">
  <div class="cb-chips">
    <span class="cb-chip" data-disabled="false">
      React<button class="cb-chip-remove" aria-label="Remove React">✕</button>
    </span>
    <span class="cb-chip">TS<button …>✕</button></span>
  </div>
  <input class="cb-input" … />
  <button class="cb-trigger" …>▾</button>
</div>
```

### 4.2 하이라이트 매치 렌더

`ComboboxItem` 이 Context 의 `matches.get(option.value)` 로부터 `labelMatches: number[]` 를 꺼내 label 에 적용:

```tsx
function renderHighlighted(label: string, indices: number[]) {
  if (indices.length === 0) return label;
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const idx of indices) {
    if (idx > cursor) out.push(label.slice(cursor, idx));
    out.push(<mark key={idx}>{label[idx]}</mark>);
    cursor = idx + 1;
  }
  if (cursor < label.length) out.push(label.slice(cursor));
  return out;
}
```

`<mark>` 기본 스타일은 `background: transparent; color: inherit; font-weight: 600; text-decoration: underline; text-underline-offset: 2px;` — 즉 VSCode picker 의 언더라인 강조 스타일.

### 4.3 floating dropdown 위치

`Content` 는 Root 내부의 `position: absolute` 로 렌더되고, `useFloating` (기존 `_shared/useFloating`) 으로 anchor 하단 정렬. 뷰포트 하단 공간이 `min(maxHeight, 160px)` 보다 작으면 상단으로 flip (`placement="top-start"`). 너비는 anchor 와 동일(`width: anchorRect.width`). `offset` 기본 4 px.

Popover 와 달리 포털을 쓰지 않는다 — 폼 필드 내부 DOM 경계 유지 + 포커스 그룹 기대. 단, anchor 의 조상 중 `overflow:hidden` 이 있으면 잘릴 수 있음 → v1 문서화, v1.1 에 portal 모드 추가 검토.

### 4.4 palette 토큰

```ts
// Combobox/colors.ts
export const comboboxPalette = {
  light: {
    anchorBg:          "#ffffff",
    anchorBorder:      "rgba(0,0,0,0.12)",
    anchorBorderHover: "rgba(0,0,0,0.24)",
    anchorBorderFocus: "#2563eb",
    anchorFg:          "#111827",
    placeholderFg:     "#9ca3af",
    triggerFg:         "#6b7280",

    contentBg:         "#ffffff",
    contentBorder:     "rgba(0,0,0,0.08)",
    contentShadow:     "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
    itemBg:            "transparent",
    itemBgActive:      "#eff6ff",
    itemBgHover:       "#f3f4f6",
    itemFg:            "#111827",
    itemFgDisabled:    "#9ca3af",
    itemMarkFg:        "#2563eb",

    groupHeadingFg:    "#6b7280",

    chipBg:            "#eff6ff",
    chipBorder:        "#bfdbfe",
    chipFg:            "#1e40af",
    chipRemoveFg:      "#1e3a8a",

    emptyFg:           "#6b7280",
    loadingFg:         "#6b7280",
    focusRing:         "#2563eb",
  },
  dark: {
    anchorBg:          "#1f2937",
    anchorBorder:      "rgba(255,255,255,0.10)",
    anchorBorderHover: "rgba(255,255,255,0.20)",
    anchorBorderFocus: "#60a5fa",
    anchorFg:          "#e5e7eb",
    placeholderFg:     "#6b7280",
    triggerFg:         "#9ca3af",

    contentBg:         "#1f2937",
    contentBorder:     "rgba(255,255,255,0.08)",
    contentShadow:     "0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3)",
    itemBg:            "transparent",
    itemBgActive:      "rgba(59,130,246,0.18)",
    itemBgHover:       "rgba(255,255,255,0.05)",
    itemFg:            "#e5e7eb",
    itemFgDisabled:    "#6b7280",
    itemMarkFg:        "#93c5fd",

    groupHeadingFg:    "#9ca3af",

    chipBg:            "rgba(59,130,246,0.15)",
    chipBorder:        "rgba(96,165,250,0.3)",
    chipFg:            "#93c5fd",
    chipRemoveFg:      "#60a5fa",

    emptyFg:           "#9ca3af",
    loadingFg:         "#9ca3af",
    focusRing:         "#60a5fa",
  },
} as const;
```

### 4.5 크기·간격

- anchor 높이: 36 px (default). `--cb-anchor-h` 로 override 가능 (CSS var).
- anchor padding: 좌우 10 px. chip 이 들어가면 chip 간 gap 4 px.
- content 최대 높이: `min(320px, 40vh)` 기본.
- item 높이: 32 px. label font-size 14 px / line-height 20 px.
- group heading: 11 px, uppercase, letter-spacing 0.04 em.

---

## 5. 핵심 동작

### 5.1 open 트리거

open 이 true 가 되는 상황:
1. input 포커스 (open-on-focus, 기본 true). `openOnFocus={false}` 로 끌 수도 있지만 v1 엔 prop 미제공 — 기본만.
2. input 타이핑 (change 이벤트).
3. Trigger 버튼 클릭 (toggle).
4. Down Arrow 키 (focus 상태에서).

open 이 false 가 되는 상황:
1. Escape (§7).
2. outside click.
3. single 모드에서 옵션 선택 성공.
4. Tab 으로 blur.
5. strict 모드에서 blur + 매치 실패 (revert 후 close).

### 5.2 filter 실행 경로

```
inputValue 변경
  │
  ├── onSearch 지정됨?
  │     ├── YES: debounce(searchDebounce ms) → onSearch(query)
  │     │        → abort 이전 시퀀스 → setAsyncResults(res)
  │     └── NO:  동기 경로 계속
  │
  ├── query.trim() === "" ?
  │     ├── YES: results = options (no filtering, no highlight, maxResults cap)
  │     └── NO : user filter 있으면 filter(query, options)
  │              없으면 filterItems(query, options, maxResults) (fuzzyMatch 재사용)
  │
  └── matches Map 채움 → Context.results 로 전파
```

`filterItems` 는 CommandPalette 에서 이관 (§10). `ComboboxOption` 을 `CommandItem` 구조로 살짝 정규화해 호출 — 아니면 `fuzzyMatch.ts` 자체를 `_shared/` 로 승격하고 타입 파라미터화. §10 에서 후자를 택한다.

### 5.3 async debounce + cancel

`CommandPaletteRoot.tsx` 의 `searchSeqRef` 패턴 그대로 적용:

```ts
const searchSeqRef = useRef(0);

useEffect(() => {
  if (!onSearch) return;
  const q = inputValue;
  if (q.trim().length < minChars) {
    setAsyncResults([]); setIsLoading(false);
    searchSeqRef.current++;
    return;
  }
  const seq = ++searchSeqRef.current;
  setIsLoading(true);
  const timer = setTimeout(() => {
    void (async () => {
      try {
        const res = await onSearch(q);
        if (seq !== searchSeqRef.current) return; // stale response
        setAsyncResults(res);
      } catch {
        if (seq !== searchSeqRef.current) return;
        setAsyncResults([]);
      } finally {
        if (seq === searchSeqRef.current) setIsLoading(false);
      }
    })();
  }, searchDebounce);
  return () => clearTimeout(timer);
}, [inputValue, onSearch, searchDebounce, minChars]);
```

- `seq` 로 "이전 요청의 결과가 늦게 도착" 하는 race 를 차단.
- `searchDebounce` 기본 200 ms.
- `minChars` 미만이면 fetch 자체를 건너뛰고 빈 결과.
- 외부 AbortController 연결은 v1.1 (사용자가 `onSearch` 내부에서 signal 을 구독하도록 하려면 prop 추가 필요).

### 5.4 선택 확정 (selectOption)

```ts
function selectOption(opt: ComboboxOption) {
  if (opt.disabled) return;
  if (multiple) {
    const cur = value as string[];
    if (cur.includes(opt.value)) return;             // dedup
    setValue([...cur, opt.value]);
    setInputValue("");                                // clear input for next
    setActiveIndex(0);
    // open 유지
    requestAnimationFrame(() => inputRef.current?.focus());
  } else {
    setValue(opt.value);
    setInputValue(opt.label);
    setOpen(false);
  }
}
```

### 5.5 freeform 확정 (commitFreeform)

```ts
function commitFreeform(text: string) {
  const t = text.trim();
  if (!t) return;
  if (multiple) {
    const cur = value as string[];
    if (cur.includes(t)) return;
    setValue([...cur, t]);
    setInputValue("");
  } else {
    setValue(t);
    setInputValue(t);
    setOpen(false);
  }
}
```

freeform 이 false (=strict) 이면 이 경로는 호출되지 않고, 대신 blur 시점에 `setInputValue(labelOfCurrentValue ?? "")` 로 revert.

### 5.6 하이라이트 업데이트 타이밍

`results` 가 바뀔 때마다 `activeIndex` 는 0 으로 리셋. 사용자가 Arrow 로 이동한 index 가 다음 query 의 results 범위를 벗어나면 clamp.

---

## 6. 제약 (minChars / maxResults / searchDebounce)

### 6.1 minChars

- 기본 0. `onSearch` 사용 시 권장 1 이상.
- query 의 trimmed length 가 minChars 미만이면:
  - `onSearch` 모드: fetch 건너뛰고 results = [] + isLoading = false.
  - 동기 모드: results = options (전체 표시). 사용자가 기대하는 "빈 입력 = 전체" UX.
- minChars 미도달 상태에서 `Empty` 슬롯이 아니라 "검색어를 N자 이상" 힌트 등을 보여주고 싶다면, 사용자가 `Empty` children 내부에 조건부 렌더링 (Context 로 minChars 와 현재 길이 노출 필요 없음 — inputValue 는 이미 사용자 측 상태).

### 6.2 maxResults

- 기본 50.
- 동기 필터의 결과 배열 길이 cap.
- async 모드에서는 사용자가 돌려준 배열을 그대로 사용 (cap 미적용). 서버가 pagination 을 책임지는 것이 자연스러워서.
- v1 엔 "더 보기" 링크는 없음. v1.1 에서.

### 6.3 searchDebounce

- 기본 200 ms (async), 0 ms (sync — 즉시 반영).
- 동기 필터도 대량 옵션에서 debounce 가 도움될 수 있지만 v1 에는 async 모드에서만 적용.

### 6.4 기타 제약
- `disabled` — 전체 입력/트리거/선택 차단. `aria-disabled="true"`.
- `readOnly` — 입력 readonly, 트리거는 클릭 가능하지만 드롭다운은 "선택만 가능, 타이핑 불가". 현재 value 의 label 만 표시. 실용적 시나리오: 사전에 선택된 값을 보여주되 편집 금지.

---

## 7. 키보드

input 포커스 또는 content 포커스 기준. content 는 `tabindex=-1` (프로그래매틱 focus 용).

| 키 | 조건 | 동작 |
|---|---|---|
| `ArrowDown` | input focused, open=false | open=true + activeIndex=0 |
| `ArrowDown` | open=true | activeIndex = (activeIndex+1) mod results.length |
| `ArrowUp` | open=false | (미작동) |
| `ArrowUp` | open=true | activeIndex = (activeIndex-1+N) mod N |
| `Home` | open=true | activeIndex = 0 |
| `End` | open=true | activeIndex = N-1 |
| `PageDown` | open=true | activeIndex += 10 (clamp) |
| `PageUp` | open=true | activeIndex -= 10 (clamp) |
| `Enter` | open=true, activeIndex 유효 | selectOption(results[activeIndex]) |
| `Enter` | open=true, results 비었음, freeform | commitFreeform(inputValue) |
| `Enter` | open=false, freeform | commitFreeform(inputValue) |
| `Tab` | open=true, activeIndex 유효 | **autocomplete**: inputValue ← results[activeIndex].label. open 유지, selection 은 미확정. 다음 Tab 또는 Enter 에서 확정. |
| `Escape` | open=true | open=false. inputValue 는 그대로 둠. |
| `Escape` | open=false, multi, inputValue 있음 | inputValue="" |
| `Escape` | open=false, single, strict | inputValue ← label of current value (revert) |
| `Backspace` | input 이 빈 상태, multi | 마지막 chip 삭제 |
| `Alt+ArrowDown` | any | open=true |
| `Alt+ArrowUp` | open=true | open=false |

### 7.1 Tab autocomplete 세부

"Tab 으로 선택 확정" 과 "Tab 으로 블러" 를 분리한다:
- results 중 activeIndex 가 유효 + prefix 매치 (`results[active].label.startsWith(inputValue)`) 인 경우: Tab 은 **inputValue 를 label 로 채움** 만. 포커스 유지. 다음 Tab 에 진짜 blur.
- 그 외: Tab 은 기본 동작 (blur + 다음 focusable 로 이동). strict 모드면 revert 로직 트리거.

### 7.2 RTL

화살표 키는 orientation 상 의미가 바뀌지 않음 (vertical list). 단 Home/End 와 chip 삭제의 "마지막" 의미는 writing direction 과 무관하게 배열의 실제 끝을 가리킨다.

### 7.3 IME 처리

CJK IME 조합 중(`compositionstart` ~ `compositionend`) 에는 Enter 키를 **무시** (브라우저의 IME confirm 과 혼동 방지). `isComposingRef` 로 추적.

```ts
<input
  onCompositionStart={() => (composingRef.current = true)}
  onCompositionEnd={() => (composingRef.current = false)}
  onKeyDown={(e) => {
    if (composingRef.current) return;
    ...
  }}
/>
```

---

## 8. 상태 관리 (controlled / uncontrolled — 3 축)

### 8.1 3 축 요약

Combobox 는 **독립적으로 controlled 될 수 있는 세 상태**를 가진다:

1. **value** — 선택된 값 (single: `string | null`, multi: `string[]`).
2. **inputValue** — 현재 input 에 있는 텍스트.
3. **open** — 드롭다운 열림 여부.

각각 `useControllable` 로 이중 API. 사용자는 셋 중 일부만 controlled 해도 됨.

```ts
const [value, setValue] = useControllable(
  props.value, props.defaultValue ?? (multiple ? [] : null), props.onValueChange,
);
const [inputValue, setInputValue] = useControllable(
  props.inputValue, props.defaultInputValue ?? "", props.onInputValueChange,
);
const [open, setOpen] = useControllable(
  props.open, props.defaultOpen ?? false, props.onOpenChange,
);
```

### 8.2 inputValue ↔ value 동기화

세 축이 독립이지만, "선택 확정 시 inputValue ← 해당 label" 규칙은 내부적으로 보장. controlled 와 충돌 가능성:

- 사용자가 `inputValue` 를 controlled 로 주면서 `value` 도 controlled 로 주는 경우: 선택 후 `onInputValueChange("사과")` 콜백이 먼저, 그 다음 `onValueChange("apple")` 콜백이 호출된다. 사용자는 둘 다 반영해야 한다.
- 사용자가 `inputValue` 는 controlled, `value` 는 uncontrolled: 내부 value 가 바뀌고 `onInputValueChange` 로 라벨 통지. 사용자가 이 라벨을 useState 에 저장하지 않으면 무시될 수 있음 — dev warn 대상은 아니지만 docs 에 명시.

### 8.3 open ↔ 포커스 동기화

- input focus → open=true (기본). 단 open 이 controlled 이면 사용자의 setter 호출만 하고 결과를 반영.
- outside click → open=false.
- Escape → open=false.

controlled 인 경우 `onOpenChange` 가 호출되고 사용자가 state 를 업데이트해야 open 이 실제로 변한다. 이게 불편하면 uncontrolled 로 두면 됨.

### 8.4 single vs multiple 전환

`multiple` prop 을 런타임에 토글하지 말 것. value 형이 바뀌므로 TypeScript 레벨에선 에러이지만, 혹시 toggling 하면 dev warn + 내부 value 재초기화.

### 8.5 Provider

`ComboboxRoot` 에서 `ComboboxContext.Provider` 로 Context value 를 제공. Context 값은 `useMemo` 로 감싸 re-render 최소화.

---

## 9. Async & 필터

### 9.1 fetch 인터페이스

```ts
onSearch?: (query: string) => Promise<ComboboxOption[]>;
```

- `query` 는 현재 inputValue (trim 전).
- 반환은 `Promise<ComboboxOption[]>`. 예외 시 `[]` 로 처리(+ isLoading=false).
- AbortSignal 은 v1 미지원 (§5.3).

### 9.2 debounce + cancel — CommandPalette 패턴 재사용

§5.3 참조. `searchSeqRef` 증가로 stale 응답 폐기.

### 9.3 에러 처리

v1 은 단순 폐기 (`catch { setAsyncResults([]); }`). 에러 UI 는 사용자가 `onSearch` 내부에서 `onError` 같은 외부 콜백을 호출하도록 유도. v1.1 에서 공식 `onSearchError` prop 추가 검토.

### 9.4 초기 옵션 + async 혼합

`options` 와 `onSearch` 를 동시에 주는 경우:
- 빈 input: `options` 표시.
- input 비어있지 않음: `onSearch` 결과만 표시 (debounce 중엔 이전 결과 유지).

이 규칙은 "로컬 캐시 → 서버 검색" 패턴에 유용. dev warn 없음.

### 9.5 filter prop 과의 공존

- `filter` 가 있으면 동기 경로에서 기본 `filterItems` 대신 사용자 `filter(query, options)` 결과 사용.
- `onSearch` 가 있으면 `filter` 는 **무시**되고 async 결과만 사용 (dev warn: "filter and onSearch both provided; onSearch wins").
- `filter` 가 `ComboboxMatchResult[]` 를 반환하면 하이라이트가 살아남고, `ComboboxOption[]` 만 반환하면 하이라이트 없이 렌더.

### 9.6 캐싱

v1 은 내장 캐시 없음. 사용자가 필요시 `onSearch` 를 자체 memoize (예: `useMemo` + LRU). v1.2 에서 `cache?: "lru" | false` 검토.

---

## 10. 파일 구조

```
src/components/Combobox/
├── Combobox.tsx                # namespace (Root/Input/Trigger/Content/Item/Group/Empty/Loading)
├── ComboboxRoot.tsx            # Root + Context provider + 상태 오케스트레이션
├── ComboboxInput.tsx           # text input + chips (multi) + trigger btn 컨테이너 조합
├── ComboboxTrigger.tsx         # 쉐브론 버튼
├── ComboboxContent.tsx         # floating listbox + scroll + empty/loading 슬롯 병합
├── ComboboxItem.tsx            # option renderer (하이라이트 포함)
├── ComboboxGroup.tsx           # group heading + children
├── ComboboxEmpty.tsx           # 결과 없음 슬롯
├── ComboboxLoading.tsx         # 로딩 슬롯
├── ComboboxContext.ts          # Context 정의 + useComboboxContext 훅
├── Combobox.types.ts           # 공개 타입
├── colors.ts                   # comboboxPalette
└── index.ts                    # 배럴
```

그리고 `src/components/_shared/` 에 fuzzy 매칭 로직을 **승격**:
- `src/components/_shared/fuzzyMatch.ts` — 기존 `CommandPalette/fuzzyMatch.ts` 의 제네릭 버전.
  - `fuzzyMatchOptimized(query, target): [score, number[]] | null` 는 target 이 string 인 순수 함수이므로 그대로 이동.
  - `scoreItem`, `filterItems` 는 `CommandItem` 에 특화되어 있으므로 CommandPalette 내에 유지하고, Combobox 쪽은 `ComboboxOption` 전용 `scoreOption` / `filterOptions` 을 새로 작성 (fuzzyMatchOptimized 만 공유). 이 편이 변경 파급이 작고 리스크가 낮다.
- 또는 대안: `CommandPalette/fuzzyMatch.ts` 를 그대로 두고 `Combobox/filter.ts` 에서 `fuzzyMatchOptimized` 를 relative import. Step 1 은 후자로 채택 (§11).

각 파일 책임:

- **ComboboxRoot.tsx**
  - props 파싱 + 기본값 적용 (multiple, freeform, theme, debounce, maxResults, minChars).
  - `useControllable` × 3 (value, inputValue, open).
  - async debounce (searchSeqRef).
  - 필터 실행 → results / matches / isLoading 상태.
  - keyboard handler 설치 (input 이 아닌 Root 에 `onKeyDown`).
  - outside click 감지 (document pointerdown + ref contains 체크).
  - Context.Provider 로 children 감싸 렌더. 자체 wrapper `<div class="cb-root">` + `anchor`.

- **ComboboxInput.tsx**
  - `<input>` 렌더 + chip row (multi).
  - Context 구독해 controlled 바인딩.
  - IME compositionstart/end 추적.
  - `aria-autocomplete`, `aria-activedescendant`, `role="combobox"`, `aria-expanded`, `aria-controls` 설정.

- **ComboboxTrigger.tsx**
  - `<button type="button" tabindex="-1">` + 기본 쉐브론 svg.
  - 클릭 → Context.setOpen(!open) + input focus.
  - `plain` 이면 기본 쉐브론 숨김, children 만 렌더.

- **ComboboxContent.tsx**
  - `<div role="listbox" id={listId}>` 렌더.
  - `useFloating(anchorRef, { placement: "bottom-start", offset })` 로 좌표 계산.
  - open 상태가 false 면 unmount (mount/unmount 이펙트는 v1 단순화).
  - children 은 사용자 지정 (Item, Group, Empty, Loading 섞어 배치). children 이 비었으면 내부 default 렌더: results.map → Item.
  - Empty / Loading 슬롯은 Context.results.length 와 isLoading 에 따라 조건부.

- **ComboboxItem.tsx**
  - Context 구독해 `matches.get(value)` 로부터 하이라이트 인덱스 받음.
  - 렌더: `role="option"`, `aria-selected={activeIndex}`, `id={getItemId(value)}`.
  - 클릭 → `selectOption`.
  - mousemove 시 activeIndex 갱신 (키보드 탐색과 마우스가 섞일 때 "hover 가 active 를 빼앗는" UX).
  - `scrollIntoView({ block: "nearest" })` 를 activeIndex 가 자신을 가리킬 때만 호출.

- **ComboboxGroup.tsx**
  - `role="group"` + `aria-labelledby` + `<div class="cb-group-heading">`.
  - children 에 중첩된 Item 들을 그대로 렌더.

- **ComboboxEmpty.tsx / ComboboxLoading.tsx**
  - Context.isLoading / results.length 로 자동 가시성 판단.
  - 명시적으로 Content children 에 배치하지 않으면 Content 기본 렌더에서 자동 삽입.

- **ComboboxContext.ts**
  - `createContext<ComboboxContextValue | null>(null)` + `useComboboxContext()` throw-on-null.

- **colors.ts**
  - `comboboxPalette` (§4.4).

- **index.ts**
  - 배럴.

---

## 11. 구현 단계 (후속 agent 가 순차 실행)

각 단계는 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과 상태 유지.

### Step 1 — 타입 + 배럴 + 팔레트 스켈레톤
1. `Combobox.types.ts` 작성 (§2.1 전부).
2. `colors.ts` 작성 (`comboboxPalette`).
3. `ComboboxContext.ts` 작성 (Context 정의 + 훅).
4. `Combobox.tsx` placeholder: `export const Combobox = { Root: () => null, Input: () => null, Trigger: () => null, Content: () => null, Item: () => null, Group: () => null, Empty: () => null, Loading: () => null };`.
5. `index.ts` 배럴.
6. `src/components/index.ts` 에 `export * from "./Combobox";`.
7. `npm run typecheck` 통과 확인.
8. 커밋: `feat(Combobox): 타입 + 배럴 + Context 스켈레톤`.

### Step 2 — Root + controlled 3축 + 동기 필터
1. `ComboboxRoot.tsx` 본체. useControllable × 3.
2. 동기 경로 `filterOptions(query, options)`:
   - `src/components/CommandPalette/fuzzyMatch.ts` 의 `fuzzyMatchOptimized` 를 `import` 해서 활용.
   - Combobox 전용 `scoreOption` + `filterOptions` 를 `Combobox/filter.ts` 에 작성.
3. results / matches Map 계산 (useMemo).
4. activeIndex 관리 (results 변경 시 clamp; inputValue 변경 시 0 리셋).
5. Context.Provider 에 value 주입.
6. children 을 그대로 렌더 (아직 기본 UI 없음 — 사용자 compound 가정).
7. 커밋: `feat(Combobox): Root 상태 오케스트레이션 + 동기 필터`.

### Step 3 — Input + Trigger + 기본 anchor 스타일
1. `ComboboxInput.tsx`. text input + chip row (multi). Context 바인딩.
2. `ComboboxTrigger.tsx`. 쉐브론 토글 버튼.
3. anchor wrapper 는 ComboboxInput 가 렌더 (`<div class="cb-anchor">` 내부).
4. light 테마 스타일 적용 (colors.ts).
5. Multi chip 렌더 + 제거 버튼.
6. 커밋: `feat(Combobox): Input + Trigger + chip 렌더`.

### Step 4 — Content + floating + Item + 하이라이트
1. `ComboboxContent.tsx`. `useFloating` 으로 anchor 아래 위치.
2. open 일 때만 렌더. 너비 = anchorRect.width.
3. `ComboboxItem.tsx` — role="option", activeIndex 바인딩, 하이라이트 <mark>.
4. `ComboboxGroup.tsx` — heading + children.
5. Content 의 "children 비었으면 자동 렌더" 폴백: `results.map((o) => <Item value={o.value} label={o.label} />)`.
6. 커밋: `feat(Combobox): Content + Item + 하이라이트`.

### Step 5 — 키보드 + IME
1. Root 수준 `onKeyDown`: ArrowUp/Down/Home/End/PageUp/PageDown/Enter/Escape/Tab(autocomplete)/Alt+Arrow/Backspace(multi chip 삭제).
2. IME compositionstart/end 으로 Enter 무시.
3. `scrollIntoView` 훅 (item 이 active 바뀔 때).
4. 커밋: `feat(Combobox): 키보드 내비게이션 + IME`.

### Step 6 — Empty + Loading 슬롯 + outside click
1. `ComboboxEmpty.tsx` / `ComboboxLoading.tsx`.
2. Content 기본 렌더 경로에서 `results.length === 0 && !isLoading` → Empty, `isLoading` → Loading.
3. outside pointerdown → setOpen(false). input 또는 content 내부면 무시.
4. 커밋: `feat(Combobox): Empty/Loading + outside click`.

### Step 7 — Async (onSearch + debounce + cancel)
1. `searchSeqRef` 패턴 (§5.3).
2. `minChars`, `searchDebounce` 반영.
3. `onSearch` 와 `options` 동시 지정 시 async 우선.
4. `filter` 와 `onSearch` 동시 지정 시 dev warn.
5. 커밋: `feat(Combobox): async onSearch + debounce`.

### Step 8 — freeform / strict 확정 로직
1. Enter / Tab / blur 시점의 확정 분기.
2. strict + blur + 매치 실패 → revert.
3. freeform + Enter/blur → commitFreeform.
4. multi + Enter + 빈 results + freeform → 태그 추가.
5. 커밋: `feat(Combobox): freeform / strict 확정`.

### Step 9 — Dark 테마 + a11y 최종 점검
1. `theme="dark"` palette 적용.
2. aria-combobox / aria-expanded / aria-activedescendant / role=listbox / role=option 완전성 점검 (§15 체크리스트).
3. 커밋: `feat(Combobox): dark 테마 + a11y`.

### Step 10 — 데모 페이지
1. `demo/src/pages/ComboboxPage.tsx` (§12).
2. `demo/src/App.tsx` NAV / Page 타입 / 라우팅 추가.
3. 커밋: `feat(Combobox): 데모 페이지`.

### Step 11 — Props 표 + Usage
1. Props 표 Root/Input/Trigger/Content/Item/Group/Empty/Loading 개별.
2. Usage 섹션 4 개 (§12.3).
3. 커밋: `feat(Combobox): 데모 props 표 + usage`.

### Step 12 — 마감
1. §20 Definition of Done 전부 체크.
2. README/changelog (있다면) 한 줄 추가.
3. 최종 커밋.

---

## 12. 데모 페이지

`demo/src/pages/ComboboxPage.tsx`. 기존 CommandPalettePage 구조 복제. 섹션별 `<section id="...">` + 우측 사이드바 연동.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "combobox", label: "Combobox", description: "자동완성 입력", sections: [
  { label: "Basic",                id: "basic" },
  { label: "Async",                id: "async" },
  { label: "Grouped",              id: "grouped" },
  { label: "Multi-select",         id: "multi" },
  { label: "Freeform",             id: "freeform" },
  { label: "Controlled",           id: "controlled" },
  { label: "Custom filter",        id: "custom-filter" },
  { label: "Empty / Loading",      id: "empty-loading" },
  { label: "Dark",                 id: "dark" },
  { label: "Disabled / ReadOnly",  id: "disabled" },
  { label: "Playground",           id: "playground" },
  { label: "Props",                id: "props" },
  { label: "Usage",                id: "usage" },
]},
```

그리고 `Page` 타입에 `"combobox"` 추가 + 하단 `{current === "combobox" && <ComboboxPage />}`.

### 12.2 섹션 구성

**Basic (동기 옵션, 단일, strict)**
```tsx
const fruits: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "apricot", label: "Apricot" },
  { value: "banana", label: "Banana" },
  { value: "blackberry", label: "Blackberry" },
  { value: "cherry", label: "Cherry" },
];

function BasicDemo() {
  const [v, setV] = useState<string | null>(null);
  return (
    <div style={{ width: 320 }}>
      <Combobox.Root options={fruits} value={v} onValueChange={setV} placeholder="과일…" />
      <div className="mt-2 text-xs text-gray-500">value: {v ?? "(none)"}</div>
    </div>
  );
}
```

**Async**
```tsx
async function fakeAPI(q: string): Promise<ComboboxOption[]> {
  await new Promise((r) => setTimeout(r, 300));
  return fruits.filter((f) => f.label.toLowerCase().includes(q.toLowerCase()));
}
<Combobox.Root
  onSearch={fakeAPI}
  searchDebounce={200}
  minChars={1}
  value={v}
  onValueChange={setV}
/>
```

**Grouped (Option.group 자동)**
```tsx
const bigList: ComboboxOption[] = [
  { value: "apple", label: "Apple", group: "Fruits" },
  { value: "banana", label: "Banana", group: "Fruits" },
  { value: "carrot", label: "Carrot", group: "Vegetables" },
  { value: "celery", label: "Celery", group: "Vegetables" },
];
<Combobox.Root options={bigList} /* 내부에서 group 별로 자동 묶음 */ />
```

**Multi-select (chip)**
```tsx
const [tags, setTags] = useState<string[]>([]);
<Combobox.Root multiple options={fruits} value={tags} onValueChange={setTags} placeholder="과일들…" />
```

**Freeform (태그 입력 근사)**
```tsx
const [tags, setTags] = useState<string[]>([]);
<Combobox.Root multiple freeform options={suggestedTags} value={tags} onValueChange={setTags} />
```

**Controlled (inputValue + value 같이)**
```tsx
const [v, setV] = useState<string | null>(null);
const [q, setQ] = useState("");
<Combobox.Root
  options={fruits}
  value={v}
  onValueChange={setV}
  inputValue={q}
  onInputValueChange={setQ}
  open={open}
  onOpenChange={setOpen}
/>
```

**Custom filter**
```tsx
<Combobox.Root
  options={fruits}
  filter={(q, opts) => opts.filter((o) => o.label.toLowerCase().startsWith(q.toLowerCase()))}
/>
```

**Empty / Loading (사용자 슬롯)**
```tsx
<Combobox.Root onSearch={fakeAPI} value={v} onValueChange={setV}>
  <Combobox.Input placeholder="검색…" />
  <Combobox.Content>
    <Combobox.Loading>⏳ 검색 중…</Combobox.Loading>
    <Combobox.Empty>
      <div style={{ padding: 12 }}>결과가 없습니다. 다른 키워드를 입력해 주세요.</div>
    </Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>
```

**Dark**
`<Combobox.Root theme="dark" options={fruits} />` + 배경 `#0f172a` 래퍼.

**Disabled / ReadOnly**
```tsx
<Combobox.Root options={fruits} value="apple" disabled />
<Combobox.Root options={fruits} value="apple" readOnly />
```

**Playground**
상단 컨트롤 바 (모든 prop 토글):
- `multiple` 체크박스
- `freeform` 체크박스
- `theme` 라디오 (light/dark)
- `placeholder` input
- `searchDebounce` number
- `minChars` number
- `maxResults` number
- `options 소스` 라디오 (동기 / async-slow / async-fail)
- `filter` 라디오 (default / startsWith / includes)
- `disabled` / `readOnly` 체크박스
- `open` 토글 (null / true / false) — controlled open 테스트

하단에 `<Combobox.Root {...args}>` + value / inputValue / open 실시간 표시 패널.

### 12.3 Props 표

기존 페이지 패턴 그대로. `Combobox.Root`, `.Input`, `.Trigger`, `.Content`, `.Item`, `.Group`, `.Empty`, `.Loading` 8 개 각각 prop × type × default × 설명.

### 12.4 Usage (4개)

1. **기본 단일 선택 (동기)** — country picker 처럼.
2. **비동기 서버 검색** — GitHub repo / user 검색 모사.
3. **multi + freeform 태그 입력** — tag cloud.
4. **controlled 3축** — 외부 state 로 모든 축 제어 (폼 라이브러리 통합 샘플).

**GitHub-like 샘플**:
```tsx
function RepoPicker() {
  const [v, setV] = useState<string | null>(null);
  return (
    <Combobox.Root
      value={v}
      onValueChange={setV}
      onSearch={async (q) => {
        const r = await fetch(`https://api.github.com/search/repositories?q=${q}`);
        const json = await r.json();
        return json.items.slice(0, 10).map((it: any) => ({
          value: it.full_name,
          label: it.full_name,
          keywords: [it.description ?? ""],
        }));
      }}
      searchDebounce={250}
      minChars={2}
      placeholder="owner/repo…"
    />
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

주의 (§tsconfig):
- `exactOptionalPropertyTypes: true` — optional prop 은 `?:` 로 받고 디폴트 머지에서 `undefined` 명시. ComboboxOption 의 optional 필드도 `| undefined` 유니온 필수.
- `noUncheckedIndexedAccess: true` — `results[activeIndex]` 는 `ComboboxOption | undefined`. guard 필수.
- `verbatimModuleSyntax: true` — 타입은 `import type`.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic: 타이핑 → 드롭다운 필터, 선택 → input 채워짐 + 드롭다운 닫힘.
- [ ] 하이라이트: 매치된 글자에 underline/weight 표시.
- [ ] ArrowDown/Up 으로 active 이동, 스크롤 따라옴.
- [ ] Enter 로 선택 확정.
- [ ] Escape 로 닫기 (값은 유지).
- [ ] Tab: prefix 매치 → inputValue 자동완성, 다시 Tab → blur.
- [ ] Async: 타이핑 → 200 ms 후 fetch → loading 표시 → 결과.
- [ ] 빠른 연속 타이핑 시 stale 응답이 최종 입력을 덮지 않음.
- [ ] minChars: 1 자 미만이면 fetch 안 함.
- [ ] Grouped: heading 이 Fruits/Vegetables 로 묶여 렌더.
- [ ] Multi: 선택 시 chip 추가, input 초기화, 드롭다운 유지.
- [ ] Multi Backspace (빈 input): 마지막 chip 삭제.
- [ ] Multi chip ✕ 클릭: 개별 삭제.
- [ ] Freeform + Enter: inputValue 가 value 로 확정.
- [ ] Strict + blur + 매치 실패: inputValue 가 이전 value 의 label 로 revert.
- [ ] Custom filter: prefix 매치만 남음.
- [ ] Empty: 결과 0 + !isLoading 에서 Empty 슬롯 렌더.
- [ ] Loading: async 진행 중 Loading 슬롯.
- [ ] Controlled 3축: 외부 setter 만으로 전체 동작.
- [ ] Dark 테마: 모든 색 전환.
- [ ] Disabled: input/trigger 클릭/타이핑 불가.
- [ ] ReadOnly: 타이핑 불가, trigger 는 열 수 있음.
- [ ] IME(한글): 조합 중 Enter 로 확정되지 않음 (조합 확정 후에만).
- [ ] 다른 페이지 리그레션 없음 (CommandPalette 포함).

### 13.3 엣지 케이스
- [ ] `options` 중복 value: dev warn.
- [ ] `multiple` 인데 `value` 가 string 인 경우: dev warn + 내부에서 `[]` 로 보정.
- [ ] `filter` 가 ComboboxMatchResult[] 아니고 ComboboxOption[] 를 돌려준 경우: 하이라이트 없이 렌더 (정상).
- [ ] `onSearch` 가 reject: 결과 [], isLoading=false.
- [ ] Content 부모에 `overflow:hidden` → 드롭다운 잘림. 문서화 + v1.1 portal 옵션 후속.
- [ ] 매우 긴 label: item 이 ellipsis 로 잘리고 title tooltip 으로 전체 표시.
- [ ] `inputValue=""` 빈 상태 + open=true: results 에 전체 options (maxResults cap) 표시.
- [ ] 선택된 value 가 options 에 없음 (예: async 로 받은 값인데 현재 options 로컬 캐시엔 없음): `getOptionLabel(value)` 로 라벨 확보. 미지정 시 fallback 으로 value 자체를 label 로 표시.
- [ ] strict + value="apple" 설정 + apple 옵션이 disabled → 표시는 그대로 하되 "apple" 을 새로 선택 못 함.
- [ ] multi + options 에 disabled 옵션 포함 → 클릭/Enter 로 추가 불가.
- [ ] 키보드로 drop 열림 → 즉시 첫 옵션이 active (index=0).
- [ ] 포커스 안 상태에서 Trigger 클릭만으로 open → input 에 자동 focus.
- [ ] 매우 작은 viewport (모바일 가정): content 가 화면 바닥 초과 → 위쪽으로 flip.
- [ ] width: anchor 가 `width: 100%` 인 경우 content 도 100% 따름.
- [ ] form 내부에서 Enter 가 form submit 으로 bubble 되지 않도록 preventDefault.

---

## 14. 성능

### 14.1 목표
- 1,000 개 동기 options 에서 타이핑 응답 < 16 ms (60 fps).
- async 첫 응답 도착 후 렌더링 < 16 ms.
- re-render 횟수: 타이핑 1 회당 Root 1 회 + Content 1 회 + 변경된 Item 만.

### 14.2 filter cost

- `fuzzyMatchOptimized` 는 O(n·m) (target·query 길이). 대부분 label 은 짧아 무시 가능. options 배열 전체 스캔은 O(N) — N=1000 에서 1~3 ms 수준 (기존 CommandPalette 에서 측정된 수치).
- `maxResults` cap 으로 정렬 후 slice. 정렬은 O(K log K), K=매치 개수.
- 최적화 여지: `filterItems` 가 이미 CommandPalette 에서 쓰이며 충분히 빠르다. v1 추가 최적화 없음.

### 14.3 re-render 최소화

- Context value 를 `useMemo` 로 stable.
- Item 은 `React.memo` (label / value / active / matches 변경 시에만). 단 `matches` Map 은 reference identity 가 바뀌므로 Item 내부에서 `matches.get(value)` 의 반환 참조를 memo 해야 효과가 있음 — v1 은 단순하게 Item memo 없이 구현하고, 1k option 에서 병목 없으면 그대로. 병목이 발견되면 Step 12 이후 추가 최적화.
- Content 의 chip/Loading/Empty 조건부는 React 가 알아서 diff.

### 14.4 virtualization — v1 제외

- 3k+ options + dense scroll UI 는 virtualization 없이 frame drop. 대신 `maxResults=50` default 로 시각 표시를 제한 — 사용자는 먼저 타이핑해서 좁혀야 함. 이는 CommandPalette 와 동일 정책.
- v1.1 에서 `virtualize: boolean | { itemSize: number }` prop 을 추가 예정 (§17).

### 14.5 측정 방법
- React DevTools Profiler 로 "타이핑 1 글자 → commit 시간" 측정.
- 1k options 데이터 셋을 Playground 에서 전환할 수 있게 제공.

---

## 15. 접근성 (WAI-ARIA 1.2 Combobox pattern)

### 15.1 ARIA 속성

- 컨테이너(anchor 래퍼): `role="combobox"`. 단 WAI 1.2 에선 input 에 role 을 직접 부여하는 것도 허용됨 — v1 은 input 에 `role="combobox"` 를 부여 (HTML5 `<input>` 은 기본 role 이 없으므로 안전). anchor 자체는 role 없음.
- input:
  - `role="combobox"`
  - `aria-autocomplete="list"` (inline autocomplete 보조 — Tab 자동완성 지원 측면에서 사실상 "both" 에 가깝지만, ARIA 1.2 권고대로 list 로).
  - `aria-expanded="{open}"`
  - `aria-controls="{listId}"`
  - `aria-activedescendant="{getItemId(activeValue)}"` (open + activeIndex 유효 시에만).
  - `aria-disabled="{disabled}"` / `aria-readonly="{readOnly}"`.
- Trigger: `<button type="button" tabindex="-1" aria-label="Toggle options">`. tabindex=-1 로 Tab 순회에서 빠짐 (focus 는 input 에 집중).
- Content (listbox):
  - `role="listbox"`
  - `id="{listId}"`
  - `aria-label`/`aria-labelledby` — 외부 label 이 있으면 그것 사용, 없으면 placeholder 에서 유추.
  - multi 이면 `aria-multiselectable="true"`.
- Group: `role="group"` + `aria-labelledby` (heading id).
- Item:
  - `role="option"`
  - `id="{getItemId(value)}"`
  - `aria-selected="{isSelected}"` — single 은 value 와 일치할 때 true. multi 는 value 배열에 포함될 때 true. "active"(키보드 활성) 와 "selected" 는 다른 개념 — active 는 aria-activedescendant 로 표시, selected 는 aria-selected.
  - `aria-disabled="{disabled}"`.
- Empty: `role="status"`.
- Loading: `role="status" aria-live="polite"`.
- chip remove 버튼: `aria-label="Remove {label}"`.

### 15.2 Focus 순서

- Tab 이 들어오면 input 에 focus (Trigger 는 tabindex=-1).
- Item 은 focus 받지 않음. active 는 DOM focus 가 아닌 aria-activedescendant 로 표현.
- Escape 후에도 focus 는 input 에 유지.

### 15.3 스크린리더 동작 기대

- "Combobox, 과일을 검색하세요, expanded" (열린 상태).
- 타이핑: aria-live 로 "3 options available" 같은 공지가 바람직하지만 v1 은 생략 (aria-live 과다 사용 시 피로). v1.1 후보.
- Arrow 이동: "Apple, option, 1 of 5" 식으로 읽힘 (대부분 스크린리더는 aria-activedescendant 변경에 반응).

### 15.4 고대비 / 축소 모션

- `prefers-reduced-motion`: content open/close 에 작은 transition 을 쓰는 경우 (opacity 80 ms) 에는 reduce motion 시 transition 을 disable. v1 은 transition 자체가 거의 없어 크게 중요하지 않지만 코드에 media query 가드 포함.
- focus ring: `outline: 2px solid focusRing; outline-offset: 2px;` — 고대비 모드에서도 보이도록 background color 와 대비.

### 15.5 a11y 체크리스트

- [ ] axe devtools 에서 violation 0.
- [ ] VoiceOver (mac) Safari: 열림 상태 인식, 옵션 선택 announce.
- [ ] NVDA (Windows) + Firefox: 동일.
- [ ] 키보드 단독으로 모든 기능 사용 가능.

---

## 16. 알려진 트레이드오프 · 결정

1. **Select (013) vs Combobox**: plastic 의 별도 plan `013-select-component.md` 에서 `Select` 는 "타이핑 없음, 드롭다운 선택만" 을 맡는다. Combobox 는 "타이핑으로 필터링" 이 핵심. UX 결정 기준:
   - 옵션이 20 개 미만 + 고정 → Select.
   - 20+ 또는 가변/async → Combobox.
   - Combobox 는 Select 의 상위 호환이 **아님**. 예) form 필드로 "성별" 을 Combobox 로 만드는 것은 과함.
2. **freeform 정책**: 기본 strict. 이유: "form 필드로 쓸 때" 가 주 사용처. 임의 문자열 허용은 옵트인.
3. **multi UX — 칩 vs 체크박스**: v1 은 칩(chip) 전용. 이유: 사용자가 "지금 선택된 것" 을 한눈에 보고 삭제할 수 있음. 드롭다운 내부에 체크박스 UI 를 넣는 변형은 v1.1 (`multipleStyle: "chip" | "checkbox"`).
4. **inline floating vs portal**: v1 은 inline. 이유: 폼 필드 경계 유지, SSR 단순, 일반 사용처에서 overflow 문제 없음. portal 모드는 overflow 컨테이너에 박혀 잘리는 경우를 위해 v1.1 에서 추가.
5. **CommandPalette fuzzy 와 공유**: `fuzzyMatchOptimized` 순수 함수 하나만 재사용. `filterItems` 전체 이관은 overhead — Combobox 의 option 에는 `description` 이 없고 `keywords` 와 `group` 만 있어 스코어링 규칙이 살짝 다르다. 따라서 Combobox 용 `filterOptions` 를 별도 작성.
6. **3 축 controlled**: Headless UI 는 value / query(inputValue) 2 축, Radix 는 3 축. Radix 방식 채택. 더 명시적이고 form 통합 시 유리 (예: 검색어 유지하면서 value 는 초기화).
7. **Enter 가 form submit 을 막는 정책**: 드롭다운 open 시에는 Enter → 선택. open=false + freeform → commitFreeform. open=false + strict + 빈 input + 활성 요소가 form 안: form 기본 submit 허용 (preventDefault 안 함). 이는 사용자가 combobox 에서 선택 후 Enter 로 제출하는 UX 를 보장.
8. **results 가 비었고 isLoading=false 인 경우 Content 가 열려있어야 하는가?**: open 유지하고 Empty 슬롯 표시. 일부 라이브러리는 자동 close 를 선택하지만 UX 혼란(왜 닫혔지?) 때문에 open 유지가 낫다.
9. **maxResults cap 을 async 에 미적용**: 서버가 페이지네이션을 책임지기 때문. 사용자가 1000 개를 넘기면 비난하는 것은 라이브러리의 월권.
10. **keyboard 경로를 Root 에 걸기**: input 에만 걸면 content 포커스 시(e.g., scroll/drag) 키가 안 먹음. Root `onKeyDown` + capture 로 통합. 단, IME 처리 주의.
11. **`mark` 요소 선택**: 하이라이트는 `<mark>` 가 의미론적으로 적합 (HTML spec: "highlighted text"). `<b>` 나 `<span>` 대비 스크린리더의 인식이 낫고 user stylesheet 호환.
12. **chip 스타일을 외부 Button 과 무관하게 내장**: plastic 의 `Button` 컴포넌트에 의존시키면 순환/버전 관리 문제. chip 전용 경량 스타일을 Combobox 내부에 둔다.
13. **React 19 aria-owns vs aria-controls**: 스펙 혼선이 있으나 ARIA 1.2 권고에 따라 `aria-controls` 를 사용. Safari VO 호환성 중요.
14. **option.value 의 string 제약**: number/symbol 을 받으려면 ts 가 복잡해진다 — v1 은 string 고정. 사용자는 number 를 String() 으로 감싸 넘기면 됨.
15. **onValueChange 가 label 을 같이 넘기지 않음**: value 만 넘긴다. 사용자가 label 이 필요하면 options 에서 lookup. 이유: CommandPalette 과의 API 일관성, 그리고 async 에서 local options 에 없는 값(historical) 도 처리 가능하도록 함.

---

## 17. 후속 작업 (v1.1+)

- **Virtualization**: `virtualize: boolean | { itemSize: number }` 로 `@tanstack/react-virtual` 통합. 1k+ options 시 자동 활성 옵션.
- **Portal 모드**: `portal?: boolean | HTMLElement` — Content 를 `document.body` 로 렌더 (overflow 컨테이너 회피).
- **Async pagination**: `onSearch(query, { cursor })` + `hasMore` 반환 + "Load more" 아이템 + infinite scroll 옵션.
- **Creatable**: `creatable: boolean | { format?: (q: string) => string }` — 매치 0 일 때 "Create '{q}'" 아이템 + `onCreate(label) => Option` 콜백.
- **Tag mode**: `TagInput` 분리 컴포넌트 — Combobox 위에 얇은 래퍼, enter=add, paste-split(comma/tab/newline), pattern validation.
- **Group heading 커스터마이징 slot**: `Combobox.Group` 에 render prop 으로 custom heading.
- **옵션 아이콘**: `Option.icon` 필드 + Item 기본 렌더가 앞쪽에 표시.
- **최근 사용(recent) / 핀(pinned)**: CommandPalette 와 동일 개념 — query=="" 일 때 recent/pinned 섹션 자동 삽입.
- **AbortController**: `onSearch(query, { signal })` 로 공식 cancel.
- **onCreateError / onSearchError**: 비동기 에러 피드백 hook.
- **form integration helpers**: `react-hook-form` adapter 예제 + `@hookform/resolvers` style 문서.
- **CommandPalette 와 fuzzy 로직 공유 일원화**: `src/components/_shared/fuzzyMatch.ts` 로 최종 승격 후 CommandPalette 도 거기서 import. v1 엔 호환성 이유로 CommandPalette 는 기존 경로 유지.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| useControllable (dual API) | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| fuzzy 매치 알고리즘 (재사용 대상) | `/Users/neo/workspace/plastic/src/components/CommandPalette/fuzzyMatch.ts` |
| async debounce + cancel 패턴 (참고) | `/Users/neo/workspace/plastic/src/components/CommandPalette/CommandPaletteRoot.tsx` (line 191~223) |
| activeIndex / scrollIntoView 패턴 | `/Users/neo/workspace/plastic/src/components/CommandPalette/CommandPaletteList.tsx` |
| 하이라이트 매치 렌더 패턴 | `/Users/neo/workspace/plastic/src/components/CommandPalette/CommandPaletteItem.tsx` |
| floating 위치 계산 (Content 재사용) | `/Users/neo/workspace/plastic/src/components/Popover/` + `src/components/_shared/useFloating.ts` |
| compound + input-중심 UX 참고 | `/Users/neo/workspace/plastic/src/components/PathInput/` |
| 데모 페이지 레이아웃 패턴 (가장 유사) | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |
| 이전 plan 포맷 참고 (템플릿) | `/Users/neo/workspace/plastic/docs/plans/017-splitpane-component.md` |

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18.3 (기존) + DOM API (`IntersectionObserver` 불필요, `scrollIntoView`, `getBoundingClientRect`, `addEventListener`) 만 사용.

번들 영향:
- Combobox 자체 예상 크기: ~5.5 KB (min), ~2.2 KB (min+gzip).
  - fuzzyMatchOptimized 를 CommandPalette 와 공유하므로 중복 없음.
  - useFloating 도 공유.
- plastic 전체 dist 증가는 주로 Combobox 본체 + types 선언.

Browser 지원:
- `PointerEvent`, `requestAnimationFrame`, `scrollIntoView({ block: "nearest" })`: 모던 브라우저 전체.
- `ResizeObserver` (Content width 동기화): Chrome 64+, Firefox 69+, Safari 13.1+.
- `Element.isConnected` / `contains` (outside click): 모든 브라우저.

SSR:
- `typeof document` 가드로 outside click effect 건너뜀.
- `useFloating` 은 CSR 가정 — SSR 초기 렌더에서 Content 는 hidden (open=false) 상태라 무관.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과 (`exactOptionalPropertyTypes` 포함).
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/combobox` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] CommandPalette / PathInput / Popover / 기타 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./Combobox";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 런타임 의존 없음).
- [ ] Props 문서 섹션이 Props 표로 채워져 있음 (Root/Input/Trigger/Content/Item/Group/Empty/Loading 8 개).
- [ ] Usage 섹션에 최소 4 개 스니펫 (기본 / async / multi+freeform / controlled 3축).
- [ ] 데모 Playground 에서 모든 prop 토글 가능.
- [ ] Light / Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드 단독으로 (마우스 없이) 선택 · 자동완성 · 칩 삭제 · 닫기 가능.
- [ ] 스크린리더 (VoiceOver) 에서 열림/옵션/선택 announce 가 정상.
- [ ] IME (한글) 조합 중 Enter 가 선택을 트리거하지 않음.
- [ ] 1k option 데이터셋에서 타이핑 랙 체감 없음.
- [ ] strict 모드 blur revert / freeform 모드 commit 동작 검증.
- [ ] multi 모드 chip 추가 · Backspace 삭제 · ✕ 클릭 삭제 동작 검증.
- [ ] async 모드에서 빠른 연속 타이핑 시 stale 응답 폐기 동작 검증.

---

**끝.**
