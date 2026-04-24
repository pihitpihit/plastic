# Select 컴포넌트 설계문서

## Context

plastic 라이브러리에 "하나의 값을 드롭다운 목록에서 선택하는 폼/툴바 프리미티브" `Select` 를 추가한다. 역할 비유: Radix `Select`, HeadlessUI `Listbox`, Ant Design `Select` (single), shadcn/ui `Select`, 그리고 VSCode 의 세팅 드롭다운. 목적은 기존 `CommandPalette` (검색+명령 실행) 와는 구분되는, "옵션이 유한한 enumerable 값 중 하나를 고르는" 전형적인 폼 컨트롤을 제공하는 것.

참고 (prior art — UX 근거):
- **Radix `Select`** — Trigger + Content + Item compound, Portal popup, type-ahead, 접근성 WAI-ARIA 1.2 combobox pattern.
- **HeadlessUI `Listbox`** — render-prop + headless, keyboard + type-ahead, disabled item skip.
- **Ant Design `Select`** — grouped options, custom render (`optionRender`, `labelRender`), size variants.
- **shadcn/ui `Select`** — Radix 기반 + Tailwind. 토큰 기반 theming.
- **native `<select>`** — 비교 기준: 플랫폼 일관 키보드 (type-ahead, ArrowUp/Down), 그러나 스타일 제약 + custom render 불가.
- **VSCode settings dropdown** — 짧은 옵션 리스트, Enter 선택, Escape 닫기, 키보드 우선.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅.
- `src/components/Popover/PopoverContent.tsx` — Portal + floating positioning + 진입/퇴장 애니메이션 패턴. Select popup 은 동일 Portal 전략을 재사용.
- `src/components/Popover/` 전반 — `useFloating`, `useAnimationState`, `useFocusTrap` 등의 공용 훅 위치.
- `src/components/CommandPalette/CommandPaletteInput.tsx` — ArrowUp/Down + activeIndex 제어 + `aria-activedescendant` 패턴. Select 의 type-ahead 와 listbox 이동이 유사 구조.
- `src/components/CommandPalette/fuzzyMatch.ts` — 문자열 필터 참조 (Select 는 "startsWith" 스타일의 typeahead 만 쓰므로 직접 사용은 안 함, 패턴 참조만).
- `src/components/index.ts` — 배럴에 `export * from "./Select";` 를 추가할 위치.
- `demo/src/App.tsx` — NAV / 라우팅 / 사이드바 패턴 (`Page` 유니온 + `NAV` 배열 + 우측 패널 서브섹션).
- `demo/src/pages/CommandPalettePage.tsx` — 최신 데모 페이지 구조 (Section / Card / 섹션별 id).
- `tsconfig.json` — `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
<Select.Root
  value={lang}                     // controlled
  onValueChange={setLang}
  placeholder="언어 선택…"
  theme="light"
  disabled={false}
>
  <Select.Trigger aria-label="언어">
    <Select.Value />               {/* 현재 값 or placeholder */}
    <Select.Icon />                {/* ▾ 아이콘 */}
  </Select.Trigger>

  <Select.Content side="bottom" sideOffset={4} maxHeight={320}>
    <Select.Group label="프론트엔드">
      <Select.Item value="ts">TypeScript</Select.Item>
      <Select.Item value="js">JavaScript</Select.Item>
    </Select.Group>
    <Select.Separator />
    <Select.Group label="백엔드">
      <Select.Item value="py">Python</Select.Item>
      <Select.Item value="go">Go</Select.Item>
      <Select.Item value="rs" disabled>Rust (준비 중)</Select.Item>
    </Select.Group>
  </Select.Content>
</Select.Root>
```

렌더 결과 (개념):
```
┌──────────────────────┐
│  TypeScript       ▾  │  ← Trigger (button, role=combobox)
└──────────────────────┘
          │ (open)
          ▼
┌──────────────────────┐
│  프론트엔드          │  ← Group label
│  ✓ TypeScript        │  ← Item (selected, aria-selected=true)
│    JavaScript        │
│  ────────────────    │  ← Separator
│  백엔드              │
│    Python            │
│    Go                │
│    Rust (disabled)   │  ← Item (disabled, 건너뜀)
└──────────────────────┘
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Root`/`Trigger`/`Value`/`Icon`/`Content`/`Group`/`Label`/`Item`/`ItemIndicator`/`Separator` 를 Context 로 묶는다. Radix 의 명명 관례를 따른다.
- **Portal 기반 popup**. 팝업은 DOM 계층을 벗어나 `document.body` 로 Portal. `overflow:hidden` 부모 / `transform` 스태킹 컨텍스트 / iframe 같은 clipping 이슈를 회피.
- **controlled/uncontrolled 이중 API**. `value`/`defaultValue`/`onValueChange` + `open`/`defaultOpen`/`onOpenChange` 두 축 모두. `useControllable` 재사용.
- **런타임 의존 zero**. React + DOM 만. Popover 에서 이미 쓰던 `useFloating` 자체 구현을 공유.
- **접근성 · 키보드 우선**. Trigger 는 `role="combobox"` + `aria-haspopup="listbox"` + `aria-expanded`, Content 는 `role="listbox"`, Item 은 `role="option"`. 포커스는 active item 의 `aria-activedescendant` 로 표현 (virtual focus).
- **type-ahead 내장**. 팝업 열린 상태에서 알파벳 키 입력 시 500 ms 버퍼링 → startsWith 일치 첫 항목으로 이동.
- **light/dark**. palette token 두 벌. 기본 `light`.
- **v1 은 단일 선택만**. multi-select 는 v1.1.
- **custom render 지원**. `<Select.Item>` 의 children 이 자유이므로 아이콘/부제/키캡 자유 배치.

---

## 1. Goals / Non-goals

### Goals (v1)
1. 단일 값 선택 드롭다운.
2. Trigger 클릭 + 키보드(Enter/Space/ArrowDown)로 open, Escape/바깥 클릭으로 close.
3. controlled/uncontrolled 이중 API (`value` / `defaultValue` / `onValueChange`).
4. open 상태도 controlled/uncontrolled 이중 API (`open` / `defaultOpen` / `onOpenChange`).
5. 키보드 탐색: ArrowUp/ArrowDown, Home, End, Enter/Space, Escape, PageUp/PageDown(10 step).
6. Type-ahead: 알파벳 키 연속 입력 500 ms 버퍼 → 일치 항목 포커스.
7. 그룹(`Select.Group` + `Select.Label`)과 구분선(`Select.Separator`) 지원.
8. disabled item 은 선택/포커스 스킵.
9. Portal 기반 popup. 기본 side=`bottom`, `sideOffset=4`, flip fallback.
10. 팝업 open 시 현재 선택된 항목으로 스크롤 + 가상 포커스 이동.
11. Trigger 가 폼 안에서 `<button type="button">` 으로 동작 (submit 방지).
12. 커스텀 render: `<Select.Item>` children 자유, `<Select.ItemIndicator>` 로 체크 표식 슬롯 제공.
13. Light / Dark 테마.
14. `disabled` (Root 전체 비활성), `required` (hidden native input 으로 폼 validation 연동).
15. hidden native `<input type="hidden" name={name} value={value}>` — `name` prop 주어졌을 때만 렌더하여 form 제출과 호환.

### Non-goals (v1 제외)
- **multi-select**: 별도 `MultiSelect` 컴포넌트 또는 `Select` 의 `mode="multiple"` v1.1. v1 은 단일만.
- **검색 입력 내장**: Trigger 를 텍스트 입력으로 바꾸는 autocomplete 는 별도 `Combobox` 컴포넌트로. v1 Select 의 type-ahead 는 "팝업 열린 상태에서 알파벳 키로 점프" 수준.
- **비동기 옵션 로딩**: `options` prop 기반 async 소스 v1 제외. children 선언형만.
- **가상화(virtualized)**: 1000 개 이상 옵션을 다루는 경우 virtualization 필요하지만 v1 은 단순 DOM 렌더. v1.1 에서 `virtualize` prop.
- **자동 width 매칭**: 팝업 width = trigger width 가 기본이되, 강제 옵션은 v1 내에서 `matchTriggerWidth={false}` 로 fallback.
- **createable (new option on the fly)**: v1 제외.
- **nested submenu (cascading select)**: v1 제외.
- **native `<select>` 위임 모드**: mobile 일부 환경에서 native UI 가 더 나을 수 있으나 v1 은 모두 커스텀 popup. v1.1 에서 `nativeOnMobile` 고려.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Select/Select.types.ts`

```ts
import type { ReactNode, CSSProperties, HTMLAttributes, ButtonHTMLAttributes } from "react";
import type { Side, Align } from "../_shared/useFloating";

export type SelectTheme = "light" | "dark";

/** Select 값은 문자열. 숫자/객체를 쓰고 싶으면 사용자가 string 으로 직렬화하여 전달. */
export type SelectValue = string;

export interface SelectRootProps {
  /** 제어 값. 지정 시 controlled. */
  value?: SelectValue;
  /** 기본 값. uncontrolled. */
  defaultValue?: SelectValue;
  /** 값 변경 콜백. 사용자가 아이템을 선택하면 호출. */
  onValueChange?: (value: SelectValue) => void;

  /** 제어 open. 지정 시 controlled. */
  open?: boolean;
  /** 기본 open. uncontrolled. */
  defaultOpen?: boolean;
  /** open 상태 변경 콜백. */
  onOpenChange?: (open: boolean) => void;

  /** 선택 값이 없을 때 Trigger 에 표시될 placeholder. */
  placeholder?: string;

  /** 전체 비활성화 (Trigger + 키보드 + popup). */
  disabled?: boolean;

  /** form 제출 연동용. 지정 시 hidden input 렌더. */
  name?: string;
  /** form validation 용 required. hidden input 에 전달. */
  required?: boolean;

  /** 라이트/다크. 기본 "light". */
  theme?: SelectTheme;

  /** 자식: Trigger + Content. */
  children: ReactNode;
}

export interface SelectTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  /** 추가 className / style */
  className?: string;
  style?: CSSProperties;
  /** 기본 아이콘 대신 커스텀 요소 삽입. children 자유. */
  children?: ReactNode;
}

export interface SelectValueProps {
  /** 선택 값이 없을 때의 fallback. Root 의 placeholder 와 중복되면 이 쪽이 우선. */
  placeholder?: string;
  /** 현재 선택된 value 를 어떻게 표시할지 커스터마이즈. 미지정 시 선택된 Item 의 children 를 표시. */
  children?: (value: SelectValue | undefined) => ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface SelectIconProps {
  /** 기본 ▾ 아이콘 대체 요소. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface SelectContentProps {
  /** 팝업 방향. 기본 "bottom". flip fallback 존재. */
  side?: Side;                     // "top" | "bottom" | "left" | "right"
  /** 팝업 정렬. 기본 "start". */
  align?: Align;                   // "start" | "center" | "end"
  /** trigger 와 팝업 사이 간격 px. 기본 4. */
  sideOffset?: number;
  /** align 방향 offset px. 기본 0. */
  alignOffset?: number;
  /** 팝업 최대 높이 (px). 기본 320. 초과 시 내부 스크롤. */
  maxHeight?: number;
  /** 팝업 width 를 trigger width 에 맞출지. 기본 true. */
  matchTriggerWidth?: boolean;
  /** 최소 width (px). matchTriggerWidth=false 일 때 유효. */
  minWidth?: number;
  /** 팝업 바깥 클릭 시 닫기. 기본 true. */
  closeOnOutsideClick?: boolean;
  /** Escape 로 닫기. 기본 true. */
  closeOnEscape?: boolean;

  /** 추가 className / style (popup root) */
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface SelectGroupProps {
  /** 그룹 헤더 라벨. 문자열 또는 노드. 지정 시 `<Select.Label>` 자동 렌더. */
  label?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface SelectLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface SelectItemProps {
  /** 이 Item 이 표현하는 값. Root 의 value 와 일치하면 selected. */
  value: SelectValue;
  /** 비활성화. 선택/포커스 스킵. */
  disabled?: boolean;
  /** type-ahead 매칭용 텍스트. 미지정 시 children 의 text 를 toString 으로 추출. */
  textValue?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export interface SelectItemIndicatorProps {
  /** selected 일 때만 렌더. children 미지정 시 기본 ✓ 아이콘. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface SelectSeparatorProps {
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 배럴

```ts
// src/components/Select/index.ts
export { Select } from "./Select";
export type {
  SelectRootProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectIconProps,
  SelectContentProps,
  SelectGroupProps,
  SelectLabelProps,
  SelectItemProps,
  SelectItemIndicatorProps,
  SelectSeparatorProps,
  SelectTheme,
  SelectValue,
} from "./Select.types";
```

그리고 `src/components/index.ts` 에 `export * from "./Select";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// Select.tsx
export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Icon: SelectIcon,
  Content: SelectContent,
  Group: SelectGroup,
  Label: SelectLabel,
  Item: SelectItem,
  ItemIndicator: SelectItemIndicator,
  Separator: SelectSeparator,
};
```

각 서브컴포넌트의 `displayName` 은 `"Select.Root"`, `"Select.Trigger"`, `"Select.Content"` 등 명시.

---

## 3. 도메인 모델

### 3.1 값 표현

- **value 는 string 만.** React 에서 이질적 타입(숫자, 객체, Symbol)을 Item 의 `value` 로 받으면 참조 비교가 필요해지고 serialization 경계가 불명확해진다. 사용자는 `String(n)` 형태로 직렬화해서 넘기고, `onValueChange` 에서 다시 파싱하는 방식을 권장.
- 빈 문자열 `""` 은 "선택 없음" 이 아니라 "빈 문자열이라는 값 하나". "선택 없음" 은 `value === undefined` 로 표현.
- `placeholder` 는 value 가 undefined 일 때만 Trigger 에 노출.

### 3.2 Item 레지스트리

Root 는 Content 아래의 모든 `<Select.Item>` 을 마운트 순서대로 수집해야 한다 (키보드 탐색 순서 / type-ahead 매칭에 필요). 두 가지 접근:

1. **React.Children.toArray 로 선언형 파싱** — 단순 구조엔 쉬우나 `<Group>` 중첩, 조건부 렌더, fragment 안에 Item 이 섞이면 어긋남.
2. **imperative 레지스트리** — 각 Item 이 마운트 시 Context 의 `registerItem(ref)` 호출, unmount 시 해제. DOM 순서는 Item 이 실제로 마운트된 element 의 document order (`compareDocumentPosition`) 로 정렬.

→ **(2)** 채택. `Select.Item` 은 `useLayoutEffect` 에서 자신의 `value`, `textValue`, `disabled`, DOM ref 를 Root 의 레지스트리에 등록. Root 는 order-sorted array 를 유지.

```ts
interface RegisteredItem {
  value: SelectValue;
  textValue: string;
  disabled: boolean;
  node: HTMLElement;
  id: string;             // useId 로 생성, aria-activedescendant 용
}

interface SelectItemRegistry {
  items: RegisteredItem[];
  register: (item: RegisteredItem) => () => void;  // returns unregister
  updateActive: (value: SelectValue | null) => void;
  findIndex: (value: SelectValue | null) => number;
}
```

레지스트리는 `useRef` 로 mutable 배열 유지하되, 키보드 탐색 시 `sortByDocumentOrder()` 를 lazy 호출.

### 3.3 Context

```ts
interface SelectContextValue {
  // 값
  value: SelectValue | undefined;
  setValue: (v: SelectValue) => void;

  // open
  open: boolean;
  setOpen: (o: boolean) => void;

  // 파생
  disabled: boolean;
  theme: SelectTheme;
  placeholder: string | undefined;

  // active item (virtual focus)
  activeValue: SelectValue | null;
  setActiveValue: (v: SelectValue | null) => void;

  // 레지스트리
  registerItem: (item: RegisteredItem) => () => void;
  getItems: () => RegisteredItem[];
  getActiveId: () => string | undefined;

  // refs
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  listboxId: string;
  triggerId: string;

  // form
  name: string | undefined;
  required: boolean;

  // type-ahead
  onTypeAhead: (char: string) => void;
}

const SelectContext = createContext<SelectContextValue | null>(null);
```

`useSelectContext()` 는 null 이면 `"Select.X must be used within <Select.Root>"` throw.

---

## 4. 시각 / 구조 설계

### 4.1 DOM 구조

```
<Select.Root>
  <button
    type="button"
    role="combobox"
    aria-haspopup="listbox"
    aria-expanded="{open}"
    aria-controls="{listboxId}"
    aria-labelledby={...}
    id="{triggerId}"
    class="sel-trigger"
  >
    <span class="sel-value">{displayText or placeholder}</span>
    <svg class="sel-icon">▾</svg>
  </button>

  {name && (
    <input type="hidden" name={name} value={value ?? ""} required={required} />
  )}

  {open && (
    <Portal>
      <div
        role="listbox"
        id="{listboxId}"
        aria-labelledby="{triggerId}"
        aria-activedescendant="{activeItemId}"
        tabindex="-1"
        class="sel-content"
        style={{ position: "absolute", top, left, width, maxHeight, overflowY: "auto" }}
      >
        <div role="group" aria-labelledby="{groupLabelId}" class="sel-group">
          <div role="presentation" id="{groupLabelId}" class="sel-label">프론트엔드</div>
          <div role="option" id="{itemId}" aria-selected="{value===itemValue}" aria-disabled="{disabled}" data-active="{isActive}" class="sel-item">
            <span class="sel-item-indicator">✓</span>
            <span class="sel-item-text">TypeScript</span>
          </div>
          <!-- ... -->
        </div>
        <div role="separator" class="sel-separator" />
        <!-- ... -->
      </div>
    </Portal>
  )}
</Select.Root>
```

### 4.2 포지셔닝

Popover 에서 쓰이는 `useFloating(triggerRef, { side, align, sideOffset, alignOffset })` 을 재사용한다. 이 훅은:
- Trigger 의 `getBoundingClientRect()` + 팝업의 측정된 크기 → 절대 좌표 계산.
- viewport 초과 시 flip fallback (bottom 이 모자라면 top).
- 사용자는 `document.body` 의 절대 좌표를 받는다 (Portal 에 렌더하므로).

`matchTriggerWidth` 가 true 면 Content 마운트 시 `width = trigger.offsetWidth` 로 설정. false 면 `width: max-content, minWidth`.

### 4.3 애니메이션

Popover 와 동일 전략: `useAnimationState({ open, exitDuration })` 로 `entering` / `exiting` 단계를 구분. 진입 시 `opacity 0→1` + `translateY(-4px)→0` 150 ms. 퇴장 시 역방향 100 ms.

### 4.4 스크롤 잠금

open 상태에서 body 스크롤은 **잠그지 않는다** (Dialog 와 달리 Select 는 비모달). 대신 Content 는 `maxHeight` 를 넘으면 내부 세로 스크롤. 스크롤 시 팝업 위치가 자동으로 따라가도록 `useFloating` 이 `scroll`/`resize` 리스너를 설치.

### 4.5 palette 토큰

```ts
// Select/colors.ts
export const selectPalette = {
  light: {
    triggerBg:        "#ffffff",
    triggerBgHover:   "#f9fafb",
    triggerBorder:    "#d1d5db",
    triggerBorderHover: "#9ca3af",
    triggerFg:        "#111827",
    triggerFgMuted:   "#9ca3af",             // placeholder
    triggerFocusRing: "#2563eb",

    contentBg:        "#ffffff",
    contentBorder:    "rgba(0,0,0,0.08)",
    contentShadow:    "0 10px 32px rgba(0,0,0,0.12)",

    itemFg:           "#111827",
    itemBgHover:      "#f3f4f6",
    itemBgActive:     "#e5edff",             // keyboard active
    itemFgSelected:   "#2563eb",
    itemFgDisabled:   "#9ca3af",
    itemIndicatorFg:  "#2563eb",

    labelFg:          "#6b7280",
    separatorBg:      "rgba(0,0,0,0.08)",
  },
  dark: {
    triggerBg:        "#1f2937",
    triggerBgHover:   "#374151",
    triggerBorder:    "rgba(255,255,255,0.12)",
    triggerBorderHover: "rgba(255,255,255,0.24)",
    triggerFg:        "#e5e7eb",
    triggerFgMuted:   "#6b7280",
    triggerFocusRing: "#60a5fa",

    contentBg:        "#1f2937",
    contentBorder:    "rgba(255,255,255,0.08)",
    contentShadow:    "0 10px 32px rgba(0,0,0,0.45)",

    itemFg:           "#e5e7eb",
    itemBgHover:      "#374151",
    itemBgActive:     "#1e3a8a",
    itemFgSelected:   "#60a5fa",
    itemFgDisabled:   "#6b7280",
    itemIndicatorFg:  "#60a5fa",

    labelFg:          "#9ca3af",
    separatorBg:      "rgba(255,255,255,0.08)",
  },
} as const;
```

---

## 5. 핵심 동작 로직

### 5.1 open / close 시퀀스

**open**:
1. Trigger 에서 `onClick` 또는 `onKeyDown` (Enter/Space/ArrowDown/ArrowUp).
2. `setOpen(true)`.
3. open=true 최초 렌더 시 `Content` 의 `useLayoutEffect` 에서:
   - 현재 선택값이 있으면 그 item 을 `activeValue` 로 지정.
   - 없으면 첫 번째 enabled item.
   - 해당 item 을 `scrollIntoView({ block: "nearest" })`.
4. `Content` 에 `tabIndex=-1` 상태로 `focus()` — 실제 DOM focus 는 listbox 로 이동, 그러나 Item 들엔 tabindex 없음. 가상 포커스(`aria-activedescendant`) 만 설정.

**close**:
1. Escape, outside click, 선택(Enter/클릭), Tab 키 중 하나.
2. `setOpen(false)`.
3. `useLayoutEffect` 로 Trigger 에 focus 복원 (단, 원인이 outside click 이거나 blur 로 인한 경우는 복원하지 않음 — 사용자가 이미 다른 곳에 focus 를 준 경우를 보호).

```ts
function handleClose(reason: "escape" | "select" | "outside" | "blur" | "tab") {
  setOpen(false);
  if (reason === "escape" || reason === "select") {
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
}
```

### 5.2 선택 시퀀스

1. Item 클릭 또는 Enter (activeValue 기준).
2. disabled item 이면 무동작.
3. `setValue(item.value)` → controlled 면 onChange 콜백만, uncontrolled 면 내부 state + 콜백.
4. `handleClose("select")`.

### 5.3 type-ahead 버퍼

팝업 open 상태에서 알파벳/숫자 키를 누르면:
- `bufferRef.current += char.toLowerCase()`.
- `window.setTimeout` 500 ms 후 버퍼 리셋.
- 매 입력마다: `items.find(it => !it.disabled && it.textValue.toLowerCase().startsWith(buffer))` → 찾으면 activeValue 갱신 + scrollIntoView.

CommandPalette 의 fuzzy 와 달리 Select 는 "startsWith" 만 — 이는 VSCode/native select 의 UX 와 일치.

```ts
const bufferRef = useRef("");
const timerRef = useRef<number | null>(null);

function onTypeAhead(char: string) {
  if (!/^[\w\s-]$/.test(char)) return;
  bufferRef.current += char.toLowerCase();
  if (timerRef.current != null) window.clearTimeout(timerRef.current);
  timerRef.current = window.setTimeout(() => {
    bufferRef.current = "";
  }, 500);
  const items = getItems();
  const startFrom = activeValueRef.current
    ? items.findIndex((i) => i.value === activeValueRef.current)
    : -1;
  // 현재 위치 다음부터 검색 (동일 char 반복 시 다음 매칭으로 순환)
  const ordered = [...items.slice(startFrom + 1), ...items.slice(0, startFrom + 1)];
  const match = ordered.find(
    (i) => !i.disabled && i.textValue.toLowerCase().startsWith(bufferRef.current),
  );
  if (match) {
    setActiveValue(match.value);
    match.node.scrollIntoView({ block: "nearest" });
  }
}
```

### 5.4 outside click

Content 마운트 시 `document.addEventListener("mousedown", handler)` — event.target 이 Content 내부, Trigger 내부 모두 아니면 close. Popover 와 동일 패턴. Trigger 가 원인인 경우 Trigger 자체가 toggle 하므로 outside 로 간주하지 않기 위해 명시적으로 Trigger ref 체크.

### 5.5 scroll-to-active

`activeValue` 가 바뀔 때마다 해당 node 를 `scrollIntoView({ block: "nearest", inline: "nearest" })`. `nearest` 를 쓰면 이미 보이는 경우 스크롤 안 일어남. popup 초기 open 시는 선택된 항목을 "centered" 로 보이게 하고 싶으면 `block: "center"` — v1 은 `nearest` 로 단순화.

---

## 6. 제약

- **children 이 Item/Group/Separator 외 조합** — 임의 노드를 허용하되 role 부여 없이 pass-through. 단 `<Select.Item>` 은 반드시 `<Select.Content>` 하위 (Context 체크로 강제).
- **동일 value 중복** — 레지스트리에서 경고 로그(`dev only`), 동작은 첫 번째 매칭 Item 기준.
- **빈 Content** — Item 0 개: 팝업은 열리지만 "No options" 플레이스홀더 텍스트 없이 빈 상자. 사용자가 필요하면 placeholder element 를 children 으로 직접 배치.
- **Trigger 가 disabled 인 상태에서 keyboard 로 open 시도** — 무시.
- **Root disabled + 이미 open 인 상태에서 disabled 로 전환** — 즉시 close.
- **controlled value 가 레지스트리에 없는 값** — Trigger 는 "fallback 표시" (placeholder + 내부 콘솔 dev warn). 예: 옵션이 비동기로 로드되기 전 이미 value 가 세팅된 경우.
- **Content 가 open 상태에서 unmount** — cleanup 에서 event listener 해제. 리렌더 레이스 시 listener leak 방지.

---

## 7. 키보드

### 7.1 Trigger 에 포커스 있을 때

| 키 | 동작 |
|---|---|
| `Enter` / `Space` | open, activeValue=선택값 또는 첫 enabled item |
| `ArrowDown` | open, activeValue=선택값 다음 또는 첫 enabled |
| `ArrowUp` | open, activeValue=선택값 이전 또는 마지막 enabled |
| 알파벳 / 숫자 | (open 아님) native button 기본 무동작. Select 는 typeahead 를 열린 상태에서만 처리 |

### 7.2 Content 가 열려 있을 때

| 키 | 동작 |
|---|---|
| `ArrowDown` | activeValue = 다음 enabled item (끝이면 멈춤, wrap 없음 v1) |
| `ArrowUp` | activeValue = 이전 enabled item |
| `Home` | activeValue = 첫 enabled |
| `End` | activeValue = 마지막 enabled |
| `PageDown` | 10 step 앞으로 (끝 넘으면 마지막) |
| `PageUp` | 10 step 뒤로 |
| `Enter` / `Space` | activeValue 선택 + close |
| `Escape` | close (값 변경 없음) |
| `Tab` | close (값 변경 없음) + focus 가 다음 tabbable 로 자연스럽게 이동 |
| `Shift+Tab` | close + focus 가 이전 tabbable 로 |
| `a-z`, `0-9` | type-ahead |

v1 은 wrap-around 없음. Radix 기본도 wrap 없음. wrap 을 원하면 v1.1 에서 `loop?: boolean` 옵션.

### 7.3 구현

```ts
function onContentKeyDown(e: KeyboardEvent<HTMLDivElement>) {
  if (e.nativeEvent.isComposing) return;
  const items = getItems().filter((i) => !i.disabled);
  if (items.length === 0) {
    if (e.key === "Escape" || e.key === "Tab") handleClose(e.key === "Escape" ? "escape" : "tab");
    return;
  }
  const curIdx = activeValue
    ? items.findIndex((i) => i.value === activeValue)
    : -1;

  switch (e.key) {
    case "ArrowDown": {
      e.preventDefault();
      const next = items[Math.min(curIdx + 1, items.length - 1)];
      if (next) setActiveValue(next.value);
      break;
    }
    case "ArrowUp": {
      e.preventDefault();
      const prev = items[Math.max(curIdx - 1, 0)];
      if (prev) setActiveValue(prev.value);
      break;
    }
    case "Home": {
      e.preventDefault();
      if (items[0]) setActiveValue(items[0].value);
      break;
    }
    case "End": {
      e.preventDefault();
      const last = items[items.length - 1];
      if (last) setActiveValue(last.value);
      break;
    }
    case "PageDown": {
      e.preventDefault();
      const target = items[Math.min(curIdx + 10, items.length - 1)];
      if (target) setActiveValue(target.value);
      break;
    }
    case "PageUp": {
      e.preventDefault();
      const target = items[Math.max(curIdx - 10, 0)];
      if (target) setActiveValue(target.value);
      break;
    }
    case "Enter":
    case " ": {
      e.preventDefault();
      if (activeValue != null) {
        setValue(activeValue);
        handleClose("select");
      }
      break;
    }
    case "Escape": {
      e.preventDefault();
      handleClose("escape");
      break;
    }
    case "Tab": {
      handleClose("tab");
      // preventDefault 하지 않음 → 자연스러운 tab 이동
      break;
    }
    default:
      if (e.key.length === 1) onTypeAhead(e.key);
      break;
  }
}
```

---

## 8. 상태 관리 (controlled/uncontrolled)

### 8.1 value 듀얼 API

```ts
const [value, setValueInternal] = useControllable<SelectValue | undefined>(
  props.value,
  props.defaultValue,
  props.onValueChange,
);
```

`useControllable` 은 `T` 가 `undefined` 포함 가능해야 하므로 제네릭 `SelectValue | undefined` 로 호출. `defaultValue` 를 생략하면 내부 기본은 `undefined` (선택 없음).

> `useControllable` 의 현재 시그니처 (`controlled: T | undefined, defaultValue: T`) 를 그대로 사용. defaultValue 가 `undefined` 인 경우도 허용 (T 가 `SelectValue | undefined`).

### 8.2 open 듀얼 API

동일 패턴:

```ts
const [open, setOpenInternal] = useControllable<boolean>(
  props.open,
  props.defaultOpen ?? false,
  props.onOpenChange,
);
```

### 8.3 setValue 에서 close 연동

```ts
const setValue = useCallback(
  (v: SelectValue) => {
    setValueInternal(v);
    setOpenInternal(false);
  },
  [setValueInternal, setOpenInternal],
);
```

단, onValueChange 가 먼저 불리고 onOpenChange 가 다음에 불린다. 사용자 앱이 양쪽을 독립 owner 로 관리해도 순서 안정.

### 8.4 activeValue 는 항상 internal

`activeValue` (키보드 가상 포커스) 는 외부 제어 대상이 아님. useState 로 내부 유지. open=false 시 null 로 리셋.

---

## 9. 고유 기능

### 9.1 그룹 / 섹션

```tsx
<Select.Group label="프론트엔드">
  <Select.Item value="ts">TypeScript</Select.Item>
  <Select.Item value="js">JavaScript</Select.Item>
</Select.Group>
```

- `Group` 은 `role="group"` + `aria-labelledby={labelId}` 를 렌더.
- `label` prop 이 있으면 내부에 `<div role="presentation" id={labelId} className="sel-label">{label}</div>` 자동 렌더.
- 사용자가 세밀 제어를 원하면 `<Select.Label>` 컴포넌트를 직접 사용 가능. 이 경우 `Select.Group` 에는 label prop 생략 + children 안에 `<Select.Label>` 배치.

### 9.2 Separator

```tsx
<Select.Separator />
```

- `role="separator"` + `aria-orientation="horizontal"`.
- 1 px 수평 라인. 그룹 간 시각 분리용.
- 키보드 탐색에 영향 없음 (Item 만 탐색 대상).

### 9.3 disabled item

```tsx
<Select.Item value="rs" disabled>Rust (준비 중)</Select.Item>
```

- `aria-disabled="true"`.
- 마우스 클릭: 무반응.
- 키보드: enabled items 배열에서 제외되어 skip.
- 시각: opacity 0.5, cursor default.
- type-ahead 매칭에서도 제외.

### 9.4 custom render — Item children 자유

```tsx
<Select.Item value="ts" textValue="TypeScript">
  <img src="/ts.svg" width={14} />
  <span className="ml-2">TypeScript</span>
  <span className="ml-auto text-xs text-gray-400">.ts</span>
</Select.Item>
```

- `textValue` 가 지정되지 않으면 Root 는 mount 시 Item DOM 의 `textContent` 를 type-ahead 용으로 캐싱. 이미지/아이콘이 섞인 경우엔 `textValue` 를 명시하길 권장.

### 9.5 ItemIndicator

```tsx
<Select.Item value="ts">
  <Select.ItemIndicator />
  <span>TypeScript</span>
</Select.Item>
```

- 현재 선택된 value 와 Item 의 value 가 같을 때만 children 렌더.
- children 미지정 시 ✓ svg 기본.
- 사용자가 `<Select.ItemIndicator>✔</Select.ItemIndicator>` 처럼 커스텀 마크도 가능.

### 9.6 SelectValue 의 displayText

Root 는 현재 value 에 해당하는 Item 의 textValue/children 를 어떻게 표시할지 결정해야 한다. 두 전략:

1. **레지스트리 기반 자동**: `items.find(i => i.value === value)` 의 `textValue` 를 표시. 단, Content 가 아직 한 번도 open 되지 않은 경우 레지스트리가 비어 있을 수 있음 → v1 은 `Trigger` 도 `<Select.Value>` 를 가지는 순간 Content 는 항상 마운트되되 open=false 시 숨겨진다... 로는 overhead. 대안:
2. **value→label 매핑을 Root 가 observe**: Item 은 open 여부와 관계없이 Portal 밖에 숨겨진 `<template>` 으로 레지스트리 등록을 해야 함. 복잡.
3. **사용자 제공 render**: `<Select.Value>{(v) => labelFromMap(v)}</Select.Value>`.

→ **하이브리드**. v1 은 Item 이 항상 Content DOM tree 에 살아있어 open 여부와 관계없이 `registerItem` 하도록 한다. 단 Content 가 닫힌 상태에서는 전체 `<div role="listbox">` 가 `display:none` 또는 Portal 에 마운트되지 않는다. 이 경우 레지스트리는 비어 있다. 해결:

**Root 자체가 `itemsMeta: Record<value, {textValue, disabled}>` 를 내부 state 로 유지한다. Item 컴포넌트는 Content 마운트 여부와 관계없이 매번 mount-once 하며 meta 를 등록**, 실제 DOM element 등록은 Content 마운트 시에만 한다.

- 이를 위해 `Select.Root` 는 Content 의 children 을 "항상 한 번은 mount" 하지만 open=false 시엔 hidden. 또는 `Select.Item` 을 Root 자식으로도 허용하는 "preload" 패턴을 쓸 수도 있으나 DX 가 난잡.
- **최종 결정**: `Select.Content` 는 open 여부와 관계없이 **항상 DOM 렌더**, 단 open=false 일 때 `style.display = "none"` + `aria-hidden=true`. Portal 은 open=true 인 프레임에만 활성. 이 방식은 "Item 레지스트리가 항상 준비" 를 보장하면서 Portal 비용은 open 시에만. Tradeoff: 닫힌 상태에서 popup DOM 메모리가 잔존 (Item 100 개 이내 전형 수준에서 무시 가능).

더 나은 설계 대안: Content 컴포넌트 안에서 Item 들이 별도 "hidden registry" 에 meta 만 등록하도록 "dry mount" 를 구현. v1 에서는 단순함을 위해 **closed 상태에서도 DOM 유지 전략** 채택.

```ts
// SelectContent
const visible = open || contentRef.current != null;
return (
  <Portal active={open}>
    <div
      role="listbox"
      style={{
        display: open ? "block" : "none",
        ...(open ? floatingStyles : {}),
      }}
    >
      {children}
    </div>
  </Portal>
);
```

> `Portal active` 가 false 면 Portal 은 `document.body` 로 append 하지 않고 `null` 반환 — 즉 DOM 에서 완전히 제거. 이 전략을 선택하면 closed 상태 Item 레지스트리는 비어 있다. 그러면 Trigger 의 SelectValue 는 어떻게 선택값 라벨을 표시할까?

**최종적으로 선택하는 구현 (명확히):**

- Item 메타 (value→textValue 매핑) 는 Root 가 별도 `itemsMetaRef` 로 관리한다.
- `Select.Item` 은 mount 시 `ctx.registerItemMeta(value, textValue, disabled)` 호출, unmount 시 해제.
- Content 가 닫힌 상태에서도 Item 이 **mount 되어 있어야 meta 등록** 이 가능하다 → 해결: Content 는 open 여부와 관계없이 **항상 children 을 mount** 한다. 단 open=false 일 때는 `display:none` + Portal 비활성(`<Portal active={open}>`).
- 이 방식으로 Item 은 항상 레지스트리에 있다. 실제 DOM element ref 는 open 이후에만 유효(Portal append 이후). 그러나 키보드 탐색은 open 상태에서만 일어나므로 문제 없음.

즉 "Content 가 closed 일 때도 hidden 으로 DOM 유지" 전략. 메모리 비용은 미미.

### 9.7 form 연동

`name` prop 이 있으면 hidden input 을 Trigger 바로 옆에 렌더:

```tsx
{name && (
  <input
    type="hidden"
    name={name}
    value={value ?? ""}
    required={required}
  />
)}
```

- `<form>` 안에서 Select 를 사용하면 form 제출 시 value 가 함께 제출된다.
- `required` + value 가 없으면 브라우저 기본 validation 은 hidden input 엔 동작하지 않으므로, 더 정밀한 validation 은 JS 측에서 체크. v1 은 단순 pass-through.

---

## 10. 파일 구조

```
src/components/Select/
├── Select.tsx                 # 배럴 namespace + SelectRoot 조립
├── Select.types.ts            # 공개 타입
├── SelectContext.ts           # Context 정의 + useSelectContext
├── SelectRoot.tsx             # Root 컴포넌트 (controlled/uncontrolled, 레지스트리)
├── SelectTrigger.tsx          # Trigger (button, combobox role, 키보드)
├── SelectValue.tsx            # 선택값 표시 span
├── SelectIcon.tsx             # ▾ 아이콘
├── SelectContent.tsx          # Portal + floating + listbox
├── SelectGroup.tsx            # 그룹 + label
├── SelectLabel.tsx            # 그룹 헤더 라벨
├── SelectItem.tsx             # Item (option role, 레지스트리 등록, click/hover)
├── SelectItemIndicator.tsx    # ✓ 표시 슬롯
├── SelectSeparator.tsx        # 구분선
├── useSelectTypeahead.ts      # type-ahead 버퍼 훅
├── colors.ts                  # palette
└── index.ts                   # 배럴
```

각 파일 책임:

- **SelectRoot.tsx** — `useControllable` 두 축, 레지스트리 관리, Context Provider, hidden input 렌더.
- **SelectTrigger.tsx** — `<button type="button">` + aria, Enter/Space/Arrow 로 open, 포커스 visible 링.
- **SelectContent.tsx** — Popover 의 `useFloating` + `useAnimationState` 재사용. Portal + listbox role. open 여부 상관없이 DOM 에 children 를 유지(위 §9.6 전략).
- **SelectItem.tsx** — mount 시 registerItemMeta, open 상태일 때 실제 element ref 도 등록. 클릭 핸들러, hover 시 activeValue 갱신.
- **SelectValue.tsx** — Context 의 value 를 읽어 레지스트리에서 textValue 찾아 표시.
- **useSelectTypeahead.ts** — bufferRef + timer + `onTypeAhead(char)` 훅.
- **colors.ts** — selectPalette light/dark.

---

## 11. 구현 단계

각 단계 독립 커밋. 각 커밋이 `npm run typecheck` + `npx tsup` 통과.

### Step 1 — 타입 + 배럴 + palette 스켈레톤
1. `Select.types.ts` 전부 작성 (§2.1).
2. `colors.ts` 작성 (palette light/dark).
3. `index.ts` 배럴.
4. `src/components/index.ts` 에 `export * from "./Select";`.
5. `Select.tsx` placeholder: `export const Select = { Root: () => null, Trigger: () => null, /* ... */ };`.
6. `npm run typecheck` 통과.
7. 커밋: `feat(Select): 타입 + palette + 배럴`.

### Step 2 — Context + SelectRoot 기본
1. `SelectContext.ts`: `createContext<SelectContextValue | null>(null)` + `useSelectContext()`.
2. `SelectRoot.tsx`:
   - `useControllable<SelectValue | undefined>` (value)
   - `useControllable<boolean>` (open)
   - `itemsMetaRef: Map<value, {textValue, disabled}>` 레지스트리.
   - `activeValue` state.
   - Context Provider.
3. `Select.tsx` 에서 Root 만 실체 연결.
4. 커밋: `feat(Select): Root + Context`.

### Step 3 — SelectTrigger + SelectValue + SelectIcon
1. `SelectTrigger.tsx`: `<button type="button" role="combobox" aria-haspopup aria-expanded>`. click = toggle open.
2. `SelectValue.tsx`: 현재 value 의 textValue 또는 placeholder 표시. render-prop children 지원.
3. `SelectIcon.tsx`: 기본 ▾ svg. children 지정 시 교체.
4. Trigger 키보드: Enter/Space/ArrowDown/ArrowUp 으로 open (ArrowDown/Up 은 open 후 active 계산 포함).
5. 커밋: `feat(Select): Trigger + Value + Icon`.

### Step 4 — SelectContent + Portal + positioning
1. `SelectContent.tsx`: Popover 의 `useFloating` 재사용 (혹은 `useFloating` 을 `_shared/` 로 이미 뺀 상태면 그대로). side/align/sideOffset/alignOffset 지원.
2. `Portal` 은 `_shared/Portal` 재사용. `active={open}` 로 mount 제어.
3. open 여부와 별개로 children 은 항상 렌더하되 `display:none` 트릭으로 레지스트리 유지.
4. `matchTriggerWidth` 로 Content width 결정.
5. `maxHeight` + `overflowY:auto`.
6. `useAnimationState` 로 opacity+translateY 전환.
7. outside click + Escape → close. Trigger 자신은 outside 아님.
8. 커밋: `feat(Select): Content + Portal + positioning`.

### Step 5 — SelectItem 레지스트리 + 클릭/호버
1. `SelectItem.tsx`:
   - `useId()` 로 itemId.
   - mount/unmount 시 `registerItemMeta`.
   - content mount 상태일 때 DOM ref 도 `registerItemNode`.
   - `role="option"`, `aria-selected`, `aria-disabled`, `data-active`.
   - click → `setValue(value)` + close.
   - mouseenter → `setActiveValue(value)` (단, disabled 면 무동작).
2. `SelectItemIndicator.tsx`: value === itemValue 일 때만 children 렌더. 기본 ✓ 아이콘.
3. 커밋: `feat(Select): Item + ItemIndicator + 레지스트리`.

### Step 6 — 키보드 탐색 + aria-activedescendant
1. `SelectContent` 에 `onKeyDown` 연결 (§7.3 전부).
2. `SelectTrigger` 에 `onKeyDown` 으로 open trigger (Enter/Space/ArrowDown/ArrowUp).
3. open 시 activeValue = 현재 value 또는 첫 enabled item.
4. activeValue 바뀔 때마다 해당 node.scrollIntoView({ block: "nearest" }).
5. listbox 가 focus 받아야 keydown 이 버블됨 — open 시 `contentRef.current?.focus()` 명시.
6. `aria-activedescendant` 로 시각 포커스 노출.
7. 커밋: `feat(Select): 키보드 + aria-activedescendant`.

### Step 7 — Group / Label / Separator
1. `SelectGroup.tsx`: `role="group"` + `aria-labelledby`. label prop 있으면 내부 Label 렌더.
2. `SelectLabel.tsx`: `role="presentation"` + palette labelFg.
3. `SelectSeparator.tsx`: `role="separator"` + 1 px 라인.
4. 커밋: `feat(Select): Group + Label + Separator`.

### Step 8 — Type-ahead
1. `useSelectTypeahead.ts`: bufferRef + timer + `onTypeAhead(char)` 반환.
2. `SelectContent` keydown 기본 case 에서 한 글자면 onTypeAhead 호출.
3. enabled items 중 `textValue.toLowerCase().startsWith(buffer)` 매칭, 현재 위치 다음부터 순환 검색.
4. 매칭되면 activeValue 갱신 + scrollIntoView.
5. 커밋: `feat(Select): type-ahead`.

### Step 9 — form 연동 + disabled + name
1. Root 의 `name` 있으면 hidden input 렌더.
2. Root `disabled` → Trigger disabled + keyboard 차단 + open 방지.
3. 커밋: `feat(Select): form 연동 + disabled`.

### Step 10 — Dark 테마
1. palette dark 통합.
2. Trigger/Content/Item/Label/Separator 색상 토큰화.
3. 커밋: `feat(Select): dark 테마`.

### Step 11 — 데모 페이지
1. `demo/src/pages/SelectPage.tsx` (§12).
2. `demo/src/App.tsx` NAV + `Page` 유니온 + 라우트 추가.
3. 커밋: `feat(Select demo): 페이지 + 라우팅`.

### Step 12 — 마감
1. Props 표 + Usage 예제.
2. §20 DoD 체크.
3. 커밋: `feat(Select): Props 표 + Usage`.

---

## 12. 데모 페이지

`demo/src/pages/SelectPage.tsx`. `CommandPalettePage.tsx` 의 Section/Card 헬퍼를 그대로 복제.

### 12.1 NAV 추가 (App.tsx)

`Page` 유니온에 `"select"` 추가:

```ts
type Page = "button" | "card" | /* ... */ | "select";
```

NAV 배열에 항목 추가:

```ts
{ id: "select", label: "Select", description: "단일 값 드롭다운", sections: [
  { label: "Basic",          id: "basic" },
  { label: "Grouped",        id: "grouped" },
  { label: "Disabled items", id: "disabled" },
  { label: "Controlled",     id: "controlled" },
  { label: "With form",      id: "form" },
  { label: "Custom render",  id: "custom-render" },
  { label: "Long list",      id: "long-list" },
  { label: "Dark theme",     id: "dark" },
  { label: "Playground",     id: "playground" },
  { label: "Props",          id: "props" },
  { label: "Usage",          id: "usage" },
]},
```

라우팅 switch 에 `{current === "select" && <SelectPage />}`.

### 12.2 섹션 구성

**Basic**
```tsx
const [lang, setLang] = useState<string | undefined>();
return (
  <Select.Root value={lang} onValueChange={setLang} placeholder="언어 선택…">
    <Select.Trigger aria-label="언어">
      <Select.Value />
      <Select.Icon />
    </Select.Trigger>
    <Select.Content>
      <Select.Item value="ts">TypeScript</Select.Item>
      <Select.Item value="js">JavaScript</Select.Item>
      <Select.Item value="py">Python</Select.Item>
      <Select.Item value="go">Go</Select.Item>
    </Select.Content>
  </Select.Root>
);
```

**Grouped**
```tsx
<Select.Root defaultValue="ts" placeholder="언어">
  <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
  <Select.Content>
    <Select.Group label="프론트엔드">
      <Select.Item value="ts">TypeScript</Select.Item>
      <Select.Item value="js">JavaScript</Select.Item>
    </Select.Group>
    <Select.Separator />
    <Select.Group label="백엔드">
      <Select.Item value="py">Python</Select.Item>
      <Select.Item value="go">Go</Select.Item>
      <Select.Item value="rs">Rust</Select.Item>
    </Select.Group>
  </Select.Content>
</Select.Root>
```

**Disabled items**
```tsx
<Select.Content>
  <Select.Item value="ts">TypeScript</Select.Item>
  <Select.Item value="js">JavaScript</Select.Item>
  <Select.Item value="rs" disabled>Rust (준비 중)</Select.Item>
  <Select.Item value="ko" disabled>Kotlin (준비 중)</Select.Item>
</Select.Content>
```
키보드 ArrowDown 이 disabled 항목을 건너뜀을 확인.

**Controlled**
외부 `useState` + 3개 프리셋 버튼 ("TypeScript" / "Python" / "Go").

```tsx
const [value, setValue] = useState("ts");
return (
  <div className="flex items-center gap-2">
    <Button onClick={() => setValue("ts")}>TS</Button>
    <Button onClick={() => setValue("py")}>Python</Button>
    <Button onClick={() => setValue("go")}>Go</Button>
    <Select.Root value={value} onValueChange={setValue}>
      <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
      <Select.Content>
        <Select.Item value="ts">TypeScript</Select.Item>
        <Select.Item value="py">Python</Select.Item>
        <Select.Item value="go">Go</Select.Item>
      </Select.Content>
    </Select.Root>
    <span className="text-sm text-gray-500">현재: {value}</span>
  </div>
);
```

**With form**
실제 `<form onSubmit>` 안에 Select + submit 버튼 → FormData 로 값 확인 출력.

```tsx
function FormDemo() {
  const [submitted, setSubmitted] = useState<string>("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setSubmitted(String(data.get("lang") ?? ""));
      }}
    >
      <Select.Root name="lang" required defaultValue="ts">
        <Select.Trigger><Select.Value /><Select.Icon /></Select.Trigger>
        <Select.Content>
          <Select.Item value="ts">TypeScript</Select.Item>
          <Select.Item value="py">Python</Select.Item>
        </Select.Content>
      </Select.Root>
      <Button type="submit">제출</Button>
      {submitted && <div>제출됨: {submitted}</div>}
    </form>
  );
}
```

**Custom render**
아이콘 + 부제 + 키캡 배치.

```tsx
<Select.Item value="ts" textValue="TypeScript">
  <span className="w-4 h-4 mr-2 inline-flex items-center justify-center bg-blue-500 text-white text-[10px] rounded-sm">TS</span>
  <span className="flex-1">TypeScript</span>
  <span className="ml-auto text-xs text-gray-400">.ts</span>
</Select.Item>
```

**Long list (type-ahead 체감)**
타임존 60 개 또는 국가코드 200 개 목록. 팝업 열고 "ko" 타이핑 시 Korea 로 점프.

**Dark theme**
배경 `#0f172a` 래퍼 + `theme="dark"`.

**Playground**
상단 컨트롤:
- `placeholder` text input
- `side` select (top/bottom/left/right)
- `align` select (start/center/end)
- `sideOffset` number
- `maxHeight` number
- `matchTriggerWidth` checkbox
- `disabled` checkbox
- `theme` radio (light/dark)

하단에 `<Select.Root>` 를 args 로 렌더하고 selected value 를 label 로 노출.

**Props 표**
Root/Trigger/Content/Item/Group/ItemIndicator/Separator 각각. 기존 페이지 Props 섹션 포맷(테이블 + prop × 타입 × 기본값 × 설명) 그대로.

**Usage (4개)**
1. 기본 단순 Select.
2. 그룹 + 구분선.
3. Controlled + form 제출.
4. Custom render (아이콘 + 부제).

---

## 13. 검증 계획

### 13.1 자동화

```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

주의:
- `exactOptionalPropertyTypes: true` — optional prop 은 `?:` 로 받고 디폴트 머지에서 `undefined` 분기.
- `noUncheckedIndexedAccess: true` — `items[i]` 는 `RegisteredItem | undefined`. 키보드 핸들러의 `next`, `prev` 계산 시 가드 필요.
- `verbatimModuleSyntax: true` — 타입은 `import type`.

### 13.2 수동 (demo dev server)

```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic: Trigger 클릭 → 팝업 열림. 아이템 클릭 → Trigger label 업데이트, 팝업 닫힘.
- [ ] 키보드: Trigger focus + Enter → 팝업 open + 현재 선택 active. ArrowDown/Up 이동. Enter 로 선택. Escape 로 취소.
- [ ] Grouped: 그룹 헤더가 키보드 탐색 순서에 포함되지 않음. Separator 도 스킵.
- [ ] Disabled item: mouse hover 는 스타일 변화만 없음(혹은 약함), 클릭 무반응, 키보드 스킵.
- [ ] Controlled: 외부 버튼 클릭 시 Select 표시 즉시 변경. 사용자 Select 변경 시 onValueChange 로 외부 state 업데이트.
- [ ] form: 제출 시 FormData 에 name=value 가 들어감. required + 빈 값이면 HTML5 유효성은 hidden input 특성상 우회되지만 dev 로그로 경고 (v1 scope).
- [ ] Long list + type-ahead: 팝업 open 상태에서 "ko" 타이핑 → Korea 로 active 이동. 500 ms 대기 후 버퍼 리셋.
- [ ] Dark theme: Trigger/Content/Item 전체 색상 전환.
- [ ] Outside click: 팝업 외 영역 클릭 → 닫힘.
- [ ] Tab: 팝업 open 중 Tab → 닫히고 다음 tabbable 로 이동.
- [ ] Playground: 모든 컨트롤 조합 실시간 반영.
- [ ] 다른 페이지 리그레션 없음.

### 13.3 엣지 케이스

- [ ] 옵션 0 개: 팝업은 열리지만 내부 빈 박스. 키보드 입력 시 안정적으로 ignore.
- [ ] value 가 레지스트리에 없는 값: Trigger 는 placeholder 표시 + dev warn.
- [ ] 동일 value 중복 Item: 첫 번째 기준 동작 + dev warn.
- [ ] 팝업 열린 중 window 리사이즈: `useFloating` 의 resize 리스너로 재배치.
- [ ] 팝업 열린 중 부모 scroll: 재배치.
- [ ] IME 조합 중 keydown: `isComposing` 가드로 ignore.
- [ ] `disabled` Root 에서 Space 눌러도 open 불가.
- [ ] form 안에서 Trigger 가 submit 유발하지 않음 (type="button" 확인).
- [ ] Portal 경계: `<div style="transform:scale(1)">` 안쪽에서도 팝업 위치 정확.
- [ ] Dialog 안에 Select: z-index 충돌 없음 (Dialog 의 Portal z-index 보다 Select Portal 이 더 커야 함 — Popover 와 동일 전략 사용).
- [ ] closed 상태에서도 Item 이 meta 를 등록 — SelectValue 가 mount 직후 올바른 텍스트를 보여줌.
- [ ] 매우 긴 옵션 텍스트: Trigger 는 `overflow:hidden text-overflow:ellipsis`, Item 은 `white-space:nowrap overflow:hidden`.
- [ ] Right-to-Left (dir="rtl"): Trigger 아이콘 위치 좌측으로 자동 flip (flex 로 구현되면 자연스럽게).

---

## 14. 성능

### 14.1 목표
- 팝업 open latency < 16 ms (60 fps 1 frame).
- 100 옵션 렌더 시 초기 mount < 20 ms.
- 키보드 반복 (Arrow 홀드) 시 60 fps 유지.

### 14.2 병목 가설 + 완화

1. **레지스트리 sort 비용**: activeValue 변경마다 items 배열 재정렬하면 O(n log n) × n. 완화: 레지스트리 등록/해제 시에만 `compareDocumentPosition` 기반 정렬, activeValue 변경은 단순 findIndex (O(n)).
2. **Context value 매 렌더**: Root 의 Context 객체 새로 만들면 Trigger/Content/Item 모두 re-render. 완화: `useMemo` 로 value 안정화 + Item 은 `aria-selected`, `data-active` 를 DOM 속성으로만 바꾸는 방식으로 re-render 최소화. v1 은 단순함을 위해 context 1 개로 가되, Item 개수가 많아 체감 이슈 생기면 v1.1 에서 selector context 분리.
3. **scrollIntoView 반복**: ArrowDown 홀드 시 매 frame scrollIntoView → 브라우저 smooth-scroll 경합. 완화: `behavior: "auto"` + `block: "nearest"` 기본. 이미 보이는 item 은 scroll 하지 않음.
4. **long list 렌더 비용**: 500+ 옵션에서 초기 mount 지연. v1 은 virtualization 없음. 500+ 사용 사례는 v1.1 의 `virtualize` 로 위임.

### 14.3 측정
- DevTools Performance 로 팝업 open → keyboard ArrowDown 10 회 녹화, `Recalculate Style` 이 16 ms 안에 끝나는지 확인.

---

## 15. 접근성

WAI-ARIA 1.2 의 "Combobox with Listbox Popup" 패턴 + "Listbox" 패턴을 혼합:

### Trigger
- `<button type="button">`.
- `role="combobox"` (single-select collapsible).
- `aria-haspopup="listbox"`.
- `aria-expanded={open}`.
- `aria-controls={listboxId}` (open 시).
- `aria-labelledby` — 외부 `<label>` 가 있으면 해당 id. 없으면 내부 `aria-label` 사용자 prop 허용.
- `aria-activedescendant={activeItemId}` — open + activeValue 가 있을 때. listbox 에 두기도 하지만 Trigger 가 `role=combobox` 인 경우 listbox 대신 combobox(=trigger) 에 두는 것이 ARIA 1.2 권장.
- 실제 DOM focus: 팝업 open 이후에도 Trigger 에 유지. 이게 ARIA 1.2 의 "focus stays on combobox" 관례.

### Content (listbox)
- `role="listbox"`.
- `aria-labelledby={triggerId}`.
- `tabIndex={-1}` — focus 는 받지만 탭 순서에는 없음.
- open 직후 focus 를 listbox 로 **이동하지 않는다**. Trigger 에 유지. (ARIA 1.2.)

→ 그러면 keydown 이 listbox 로 들어오지 않는다. 해결: **keydown 리스너는 Trigger 에** 붙이고, open 일 때는 listbox 키처럼 처리. Radix 는 이 방식.

**최종 구현**: Trigger 에 모든 keydown handler. open=true 일 때는 listbox 키(ArrowDown/Up/Home/End/Enter/Space/Escape/Tab/typeahead) 처리, open=false 일 때는 open trigger(Enter/Space/ArrowDown/Up) 처리.

### Item
- `role="option"`.
- `aria-selected={value === itemValue}` — current value 와 일치.
- `aria-disabled={disabled}`.
- `id={itemId}` — `aria-activedescendant` 로 참조됨.
- `data-active={isActive}` — CSS 하이라이트 용.

### Group
- `role="group"`.
- `aria-labelledby={labelId}`.

### Separator
- `role="separator"`.
- `aria-orientation="horizontal"`.

### Screen reader 테스트
VoiceOver / NVDA 에서:
- Trigger focus → "언어, 선택 박스, 접힘, 버튼" 류로 읽힘.
- Enter → "펼침, TypeScript 선택됨, 2/5" 같은 listbox 상태 안내.
- ArrowDown → "JavaScript" 읽힘.
- Enter → "축소됨, JavaScript" + Trigger focus 복귀.

---

## 16. 알려진 트레이드오프

1. **value 는 string 만**. 객체/숫자를 직접 받으면 DX 는 좋지만 serialization / referential equality / form 제출 경계가 모호해진다. Radix/HeadlessUI 도 동일 결정. 사용자가 직접 `JSON.stringify` / `String(n)` 감싸서 사용.
2. **Content 닫힌 상태에서도 DOM 유지**. (§9.6) Item 레지스트리를 "항상 mount" 로 유지해 `SelectValue` 가 즉시 label 을 표시하게 한다. 대안(hidden registry-only mount)은 구현 복잡. 비용: 닫힌 상태에서 Item JSX 가 메모리 상주. 100 항목 이하에서 무시 가능. 더 큰 사례 (1000+) 는 v1.1 virtualize 에서 dry-mount 전략으로 분리.
3. **wrap-around 없는 키보드**. Radix 기본과 일치. VSCode 도 일치. 원하면 v1.1 에 `loop: boolean`.
4. **type-ahead 는 startsWith 만**. fuzzy/contains 는 CommandPalette 의 책임으로 분리. Select 는 짧은 enumerable 값을 가정.
5. **포커스 처리 — DOM focus 는 Trigger 에 유지, listbox 는 virtual focus**. ARIA 1.2 권장 + Radix 패턴 일치. 전통적 "listbox 가 실제 focus 를 가진다" 방식도 정답이지만, 그러면 팝업 open/close 마다 focus 를 명시 이동시켜야 하고 outside click 에서 복원 타이밍이 까다롭다. virtual focus 가 구현 단순 + ARIA 1.2 호환.
6. **form 연동은 hidden input** — 간단하지만 `required` 의 브라우저 기본 validation UI 가 hidden input 에선 약함. 더 정밀한 validation 은 사용자 앱(JS)이 해야. 대안은 `<select hidden>` 이지만 이 역시 hidden 에선 required validation 이 브라우저별 다름.
7. **no virtualization v1**. 1000+ 옵션에서 초기 mount 가 느려짐. v1.1 `virtualize` prop 으로 풀 예정. v1 은 설계 단순.
8. **matchTriggerWidth 기본 true**. 드물게 Trigger 가 아주 좁고 Item 텍스트가 길면 truncation 발생. matchTriggerWidth=false 로 풀면 palette 와 box-shadow 가 시각적으로 "떠있는" 느낌이 되어 시각 밸런스가 깨질 수 있다. v1 은 기본 true 유지, false 는 escape hatch.
9. **async options 없음**. 선언형 children 만 지원. 사용자가 async 로 options 배열을 만들고 map 으로 children 을 렌더하는 방식은 가능하지만 첫 render 에 options 없는 상태에서 value 가 세팅되면 placeholder 가 보인다 (위 §6 엣지 케이스).
10. **Portal 필요**. SSR 환경에서 document 없으면 Portal fail. `_shared/Portal` 이 이미 `typeof window` 가드 포함한다는 전제. 확인 필요.

---

## 17. 후속 작업 (v1.1+)

- **multi-select**: `mode="multiple"` + `value: string[]`. Trigger 에 chip 표시. MultiSelect 별도 컴포넌트로 풀 수도.
- **virtualize**: `virtualize?: boolean | { itemHeight: number; overscan?: number }`. 내부적으로 react-window-like tiny 구현 또는 의존성 추가 여부 재검토.
- **Combobox (autocomplete)**: Trigger 가 input 이고 type 할 때마다 필터링. Select 와 공통 Context 구조 재활용 가능.
- **async options**: `loadOptions?: (query: string) => Promise<Item[]>` + loading 인디케이터.
- **create new**: `onCreate?: (query: string) => void` + footer UI.
- **nested submenu**: cascading select. Radix 의 SubMenu 패턴.
- **nativeOnMobile**: `userAgent` 감지 후 iOS/Android 에서 `<select>` native UI 로 위임.
- **custom filter for type-ahead**: `filterFunction?: (item, query) => boolean` 으로 contains/fuzzy 확장.
- **loop (wrap-around)**: `loop?: boolean`.
- **size variants**: `size="sm" | "md" | "lg"` — Button 과 일관.
- **더 풍부한 screen reader 라이브 안내**: ARIA 1.2 이상 의 announcement 를 위한 aria-live region (ARIA best practice authoring guide).

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| useControllable (dual API 표준) | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| Portal + floating + 애니메이션 패턴 | `/Users/neo/workspace/plastic/src/components/Popover/PopoverContent.tsx` |
| Popover 디렉토리 전반 (`useFloating`, `useAnimationState`, `useFocusTrap`) | `/Users/neo/workspace/plastic/src/components/Popover/` |
| combobox + activeIndex + aria-activedescendant 선행 예 | `/Users/neo/workspace/plastic/src/components/CommandPalette/CommandPaletteInput.tsx` |
| CommandPalette 컴포넌트 구조 (compound + Context + fuzzyMatch) | `/Users/neo/workspace/plastic/src/components/CommandPalette/` |
| 배럴 등록 위치 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 최신 데모 페이지 포맷 | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| tsconfig 제약 (exactOptionalPropertyTypes / noUncheckedIndexedAccess / verbatimModuleSyntax) | `/Users/neo/workspace/plastic/tsconfig.json` |
| 유사 plan 포맷 레퍼런스 | `/Users/neo/workspace/plastic/docs/plans/017-splitpane-component.md` |

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18.3 (기존) + DOM API (`Portal` via `createPortal`, `requestAnimationFrame`, `scrollIntoView`, `getBoundingClientRect`) 만 사용.

번들 영향:
- Select 자체 예상 크기: ~4 KB (min), ~1.8 KB (min+gzip). Popover 의 useFloating 을 재사용한다면 중복 없음.
- plastic 전체 dist 영향 minimal.

브라우저 지원:
- `Element.scrollIntoView({ block: "nearest" })`: Chrome 61+, Firefox 58+, Safari 14+. 모두 ES2020 타깃 OK.
- `createPortal`: React 내장.
- PointerEvents (click, mousedown): 모든 모던 브라우저.
- `Element.compareDocumentPosition`: universal.

접근성:
- ARIA 1.2 combobox + listbox 패턴 준수.
- VoiceOver / NVDA / JAWS 기본 동작 검증.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/select` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] Button / Card / CodeView / CommandPalette / Dialog / Toast / Tooltip / Popover / PipelineGraph / DataTable 등 기존 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./Select";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 의존 없음).
- [ ] Props 문서 섹션이 Props 표로 채워져 있음 (Root/Trigger/Content/Item/Group/ItemIndicator/Separator 일곱 개).
- [ ] Usage 섹션에 최소 4 개 스니펫 (기본 / 그룹 / controlled+form / custom render).
- [ ] 데모 Playground 에서 모든 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드 단독으로 (마우스 없이) 모든 동작이 가능 (open, 탐색, 선택, 취소, type-ahead).
- [ ] 스크린리더(VoiceOver) 에서 Trigger 의 상태 변경과 선택 값 변경이 명확히 읽힘.
- [ ] `Select.Root` 가 `<form>` 안에서 name prop 으로 값 제출되는 것을 확인.
- [ ] `disabled` Root 에서 모든 상호작용이 차단됨.
- [ ] Portal 렌더된 Content 가 `overflow:hidden` 부모 안에서도 올바르게 표시됨.

---

**끝.**
