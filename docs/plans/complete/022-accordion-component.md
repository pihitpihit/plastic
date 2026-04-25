# Accordion 컴포넌트 설계문서

## Context

plastic 라이브러리에 "수직으로 쌓인 섹션을 펼치고 접는(collapsible) 프리미티브" `Accordion` 을 추가한다. 역할 비유: VSCode 사이드바의 Explorer/Search/Source Control 섹션 collapse, IntelliJ 의 Tool Window 그룹, Chrome DevTools Styles 패널의 rule group, macOS System Settings 의 sidebar section. 이 컴포넌트는 "긴 수직 정보 목록을 카테고리 단위로 접어 화면 밀도를 조절" 하는 가장 기본적인 UI 블록이며, plastic 에서 장기적으로 DataTable 의 group header, Inspector 의 섹션 분리, Form Wizard 의 단계 요약 등에 공통 기반으로 재사용될 것이다.

참고 (prior art — UX 근거):
- **Radix `@radix-ui/react-accordion`** — compound API (`Root/Item/Header/Trigger/Content`), `type="single"|"multiple"`, `collapsible`, `value`/`defaultValue`, keyboard (Arrow/Home/End). 가장 가까운 설계 참조.
- **Ant Design `Collapse`** — `items` 배열 props + `activeKey` 제어, `accordion` boolean(single vs multiple), `ghost`/`bordered`. declarative 데이터 중심.
- **MUI `Accordion`** — 단일 Item 을 제어하는 패턴. `expanded`/`onChange` 가 Item 단위. 본 plan 은 "Root 단위 제어" 로 통일 (Radix 스타일 선호).
- **HeadlessUI `Disclosure`** — 단일 토글 primitive. Accordion 은 Disclosure 의 그룹 버전이라는 관점.
- **shadcn/ui Accordion** — Radix wrapper. 스타일 참조.
- **네이티브 `<details>`/`<summary>`** — 브라우저 기본 UA. 비교 대상(§4, §16).
- **CSS `::details-content`** (2024~) — `interpolate-size: allow-keywords` + `transition-behavior: allow-discrete` 조합으로 `height: auto` 전환 가능. 모던 웹의 새 선택지(§5, §16).

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅. 그대로 재사용 (`value`/`defaultValue`/`onValueChange`).
- `src/components/PipelineGraph/PipelineGraphCluster.tsx` — 본 레포 내 유일한 "expand/collapse 접힘 UI" 선례. 트리거 버튼 + chevron rotate + height transition 패턴 참조.
- `src/components/index.ts` — 배럴 export 위치.
- `src/components/CommandPalette/` — compound API + dark 테마 + Playground 데모 스타일 기준점.
- `demo/src/App.tsx` — NAV/라우팅 등록.
- `demo/src/pages/CommandPalettePage.tsx` — 최신 데모 페이지 레이아웃 관례(Props/Usage/Playground 섹션 구조).
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
<Accordion.Root
  type="single"             // "single" | "multiple"
  collapsible               // single 일 때 열린 항목을 다시 눌러 닫기 허용
  defaultValue="overview"
  theme="light"
  onValueChange={(v) => log(v)}
>
  <Accordion.Item value="overview">
    <Accordion.Header>
      <Accordion.Trigger>Overview</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>
      <p>Summary of the pipeline.</p>
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item value="nodes">
    <Accordion.Header>
      <Accordion.Trigger>Nodes</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>
      <NodeList />
    </Accordion.Content>
  </Accordion.Item>

  <Accordion.Item value="metrics" disabled>
    <Accordion.Header>
      <Accordion.Trigger>Metrics (coming soon)</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>
      <MetricsPanel />
    </Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

렌더 결과 (개념):
```
┌───────────────────────────────────────────┐
│ ▾  Overview                               │  ← Header (Trigger button, chevron ▸→▾ 회전)
│    Summary of the pipeline.               │  ← Content (open)
├───────────────────────────────────────────┤
│ ▸  Nodes                                  │  ← Header (collapsed)
├───────────────────────────────────────────┤
│ ▸  Metrics (coming soon) [disabled dim]   │
└───────────────────────────────────────────┘
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Root`/`Item`/`Header`/`Trigger`/`Content` 5 개 소계. Root 와 Item 은 각각 Context 를 가진다 (Root=컬렉션 상태, Item=단일 item 의 id/상태).
- **type="single" vs "multiple"**. 내부 상태는 **항상 `string[]`** 로 통일해서 두고(value 축 단일화), `type` 에 따라 공개 API 의 `value` 타입만 `string` vs `string[]` 로 갈린다. 공개-내부 어댑터는 Root 가 담당.
- **`collapsible` 은 single 전용**. `type="single"` 에서 기본 false (한 번 열면 다른 것을 눌러야 닫힘). true 이면 같은 trigger 재클릭 시 닫힘. `multiple` 은 항상 개별 토글이므로 이 prop 을 무시.
- **controlled/uncontrolled 이중 API**. `useControllable` 동일 패턴 (`value`/`defaultValue`/`onValueChange`).
- **런타임 의존 zero**. DOM + React 만. ResizeObserver, MutationObserver 등은 표준.
- **접근성 · 키보드 우선**. Trigger 는 `button[aria-expanded][aria-controls]`, Content 는 `role="region" aria-labelledby`. Arrow/Home/End 내비게이션, Enter/Space 토글.
- **애니메이션은 CSS 주도**. JS 타이머를 쓰지 않고, data-state=`open`/`closed` + CSS custom property `--accordion-content-height` 로 `max-height` 전환. reduced-motion 은 `transition: none`.
- **div 기반, native `<details>` 거절**. 다중 expansion / 세밀한 ARIA / 키보드 그룹 내비게이션 요구를 위해 `<details>` 는 쓰지 않는다 (§4.3, §16).

---

## 1. Goals / Non-goals

### Goals (v1)
1. 수직 스택 섹션 collapse. `type="single"` 과 `type="multiple"` 두 모드.
2. `collapsible` (single 전용) — 열린 항목 재클릭으로 닫기 허용/불허.
3. `value`/`defaultValue`/`onValueChange` 로 controlled/uncontrolled 이중 API. 타입은 `type` 에 따라 `string`/`string[]`.
4. `disabled` (Root 수준 전체, Item 수준 개별) — 트리거 비활성화, 키보드 포커스 통과(skip) 여부 선택 가능.
5. Expand/Collapse 애니메이션 — 200 ms ease-out, `max-height` + `opacity` 전환. 측정값을 CSS 변수로 주입.
6. `prefers-reduced-motion` 자동 감지 → transition 제거(즉시 open/close).
7. 키보드: `ArrowDown`/`ArrowUp` 로 트리거 간 이동 (Item wrap), `Home`/`End` 로 처음/끝 트리거, `Enter`/`Space` 로 토글.
8. Chevron 회전 (0deg ↔ 90deg 또는 ↔ 180deg 옵션). 기본 `▸ → ▾` (90deg).
9. 커스텀 trigger 내용 허용 — 아이콘 왼쪽/오른쪽, 배지, subtitle 자유.
10. Nested Accordion (Content 내부에 또 다른 `Accordion.Root` 배치) — 독립 상태. 키보드는 가장 가까운 Root 로만 전파.
11. Light / Dark 테마 (palette 토큰).
12. 큰 Content 높이의 안정적 측정 (`ResizeObserver` on Content 내부 wrapper).

### Non-goals (v1 제외)
- **horizontal Accordion**: 수평 스택(좌→우 collapse)은 v1.1.
- **Drag & Drop 로 Item 재정렬**: v1.1 (또는 별도 `ReorderableList` primitive 로 분리).
- **`items` 배열 데이터 중심 API**: Ant Design 스타일 `items={[{ key, label, children }]}` 선언형 API 는 compound JSX 대비 유연성 낮음 → v1 compound 만. 차후 `Accordion.from(items)` 헬퍼만 고려.
- **내장 검색/필터링** (큰 accordion 의 검색창): v1 범위 밖.
- **sticky header**: 여러 open item 이 있을 때 현재 viewport 상단에 해당 item header 가 붙는 기능. v1.1.
- **인디케이터 custom render prop**: v1 은 `Accordion.Trigger` 의 children 에 직접 chevron 을 포함하는 방식(사용자가 원하는 아이콘 직접 배치). `renderIndicator` prop 은 v1.1.
- **애니메이션 커스터마이징 props** (duration/easing): v1 은 CSS 변수(`--accordion-duration`) override 만 지원, prop 은 추가하지 않음.
- **SSR 특화 최적화** (초기 open 높이 서버 계산): v1 은 클라이언트 마운트 후 측정.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Accordion/Accordion.types.ts`

```ts
export type AccordionTheme = "light" | "dark";

/**
 * Accordion 의 값 축.
 * - "single": 최대 1 개 열림. value 는 string. "" 은 "모두 닫힘" 을 의미.
 * - "multiple": 여러 개 열림 가능. value 는 string[].
 */
export type AccordionType = "single" | "multiple";

/** type="single" 의 값 */
export type AccordionSingleValue = string;
/** type="multiple" 의 값 */
export type AccordionMultipleValue = string[];

/** Root props (discriminated union: type 에 따라 value 타입이 달라짐) */
export type AccordionRootProps =
  | AccordionSingleRootProps
  | AccordionMultipleRootProps;

interface AccordionCommonRootProps {
  theme?: AccordionTheme;
  /** Root 전체 비활성화 (모든 Trigger 무효). 기본 false. */
  disabled?: boolean;
  /** 추가 className / style (root) */
  className?: string;
  style?: React.CSSProperties;
  /** 섹션(Item) 리스트 */
  children: React.ReactNode;
  /**
   * chevron 회전 각도 모드. 기본 "90". 지정 값에 따라 닫힘 0deg → 열림 90deg 또는 180deg.
   */
  chevronRotation?: 90 | 180;
  /**
   * 트리거 포커스 가능 여부. disabled item 을 tab 순서에 포함할지.
   * 기본 "skip" (disabled 는 focus 통과).
   */
  disabledFocus?: "skip" | "include";
  /** children 순회 wrap: ArrowDown 마지막 → 첫 번째 반환. 기본 true. */
  loop?: boolean;
}

export interface AccordionSingleRootProps extends AccordionCommonRootProps {
  type: "single";
  /** 단일 열림. "" 은 모두 닫힘. */
  value?: AccordionSingleValue;
  defaultValue?: AccordionSingleValue;
  onValueChange?: (value: AccordionSingleValue) => void;
  /** 열린 항목 재클릭 시 닫기 허용. 기본 false. */
  collapsible?: boolean;
}

export interface AccordionMultipleRootProps extends AccordionCommonRootProps {
  type: "multiple";
  value?: AccordionMultipleValue;
  defaultValue?: AccordionMultipleValue;
  onValueChange?: (value: AccordionMultipleValue) => void;
  /** multiple 에서 collapsible 은 의미 없음. 타입 수준에서 차단. */
  collapsible?: never;
}

export interface AccordionItemProps {
  /** Item 의 유일 식별자. Root 내에서 유일해야 함 (dev 시 중복 검사). */
  value: string;
  /** 이 Item 비활성화. 기본 false. */
  disabled?: boolean;
  /** 추가 className / style */
  className?: string;
  style?: React.CSSProperties;
  /** Header + Content 를 포함한 자식 */
  children: React.ReactNode;
}

export interface AccordionHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** 실제 wrap 태그. 기본 "h3". heading 레벨 제어용. */
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div";
  children: React.ReactNode;
}

export interface AccordionTriggerProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  /** 기본 chevron 을 숨기고 children 만. 기본 false. */
  hideChevron?: boolean;
  children: React.ReactNode;
}

export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** forceMount: true 면 닫혀 있어도 DOM 에 유지 (내부 state 보존용). 기본 false. */
  forceMount?: boolean;
  children: React.ReactNode;
}
```

### 2.2 배럴

```ts
// src/components/Accordion/index.ts
export { Accordion } from "./Accordion";
export type {
  AccordionTheme,
  AccordionType,
  AccordionSingleValue,
  AccordionMultipleValue,
  AccordionRootProps,
  AccordionSingleRootProps,
  AccordionMultipleRootProps,
  AccordionItemProps,
  AccordionHeaderProps,
  AccordionTriggerProps,
  AccordionContentProps,
} from "./Accordion.types";
```

그리고 `src/components/index.ts` 에 `export * from "./Accordion";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// Accordion.tsx
export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
};
```

displayName 은 각각 `"Accordion.Root"`, `"Accordion.Item"`, `"Accordion.Header"`, `"Accordion.Trigger"`, `"Accordion.Content"`.

### 2.4 controlled vs uncontrolled

```tsx
// uncontrolled, 단일
<Accordion.Root type="single" collapsible defaultValue="a">…</Accordion.Root>

// controlled, 다중
const [open, setOpen] = useState<string[]>(["a", "c"]);
<Accordion.Root type="multiple" value={open} onValueChange={setOpen}>…</Accordion.Root>
```

---

## 3. 도메인 모델

### 3.1 값 축의 단일화

내부 상태는 **항상 `Set<string>`** 으로 유지.

- `type="single"`: Set 의 size 는 0 또는 1.
- `type="multiple"`: Set 의 size 는 0 이상.

공개 API 경계에서만 어댑터를 두어, Root 가 controlled/uncontrolled 과 관계없이 `(next: Set<string>) => void` 를 호출하면 내부에서:
- `type="single"`: `onValueChange?.(firstOf(next) ?? "")`.
- `type="multiple"`: `onValueChange?.(Array.from(next))`.

이로써 `toggle/open/close` 같은 reducer 로직은 Set 연산 하나로 통일된다.

### 3.2 Item id 유일성

`AccordionItem.value` 는 Root 내에서 유일해야 한다. dev 빌드에서 렌더 시 MutationObserver 없이 Root 가 Children.toArray 로 item value 를 수집해 `Set` 에 넣으며 중복이면 `console.error`.

```ts
// dev-only
if (process.env.NODE_ENV !== "production") {
  const seen = new Set<string>();
  items.forEach((it) => {
    if (seen.has(it.value)) console.error(`[Accordion] duplicate value: ${it.value}`);
    seen.add(it.value);
  });
}
```

### 3.3 Root Context

```ts
interface AccordionRootContextValue {
  type: AccordionType;
  openSet: ReadonlySet<string>;
  /** 해당 value 를 토글. type/collapsible 규칙 모두 반영. */
  toggle: (value: string) => void;
  /** 해당 value 를 명시적으로 open/close. (키보드 Space 와 분리 용도) */
  setOpen: (value: string, nextOpen: boolean) => void;
  disabled: boolean;
  theme: AccordionTheme;
  chevronRotation: 90 | 180;
  disabledFocus: "skip" | "include";
  loop: boolean;
  /** 포커스 가능한 Trigger ref 목록 관리 (Arrow 내비게이션) */
  registerTrigger: (value: string, el: HTMLButtonElement | null) => void;
  /** Arrow 이동에 사용: 현재 포커스된 value 기준 다음/이전/첫/끝 */
  focusTrigger: (
    from: string,
    dir: "next" | "prev" | "first" | "last",
  ) => void;
  /** value → Trigger/Content 내부 ARIA id 계산용 base id */
  baseId: string;
}
```

### 3.4 Item Context

```ts
interface AccordionItemContextValue {
  value: string;
  disabled: boolean;
  /** 현재 열림 상태 */
  open: boolean;
  /** ARIA 쌍을 만드는 id (button.id, content.id) */
  triggerId: string;
  contentId: string;
}
```

Trigger/Content 는 `useAccordionItemContext()` 로 자기 Item 의 id/open 을 알고, 동시에 `useAccordionRootContext()` 로 toggle/focusTrigger 에 접근한다. Nested Accordion 은 "가장 가까운 Root" 만 참조하므로 React Context 의 기본 동작으로 자연스럽게 해결.

---

## 4. 시각 / 구조 설계

### 4.1 DOM 구조 (`type="single"`, collapsible=true 예)

```
<div role="presentation" class="acc-root" data-theme="light">
  <div class="acc-item" data-state="open" data-disabled="false">
    <h3 class="acc-header">
      <button type="button"
              class="acc-trigger"
              id="acc-xyz-overview-trigger"
              aria-expanded="true"
              aria-controls="acc-xyz-overview-content"
              aria-disabled="false">
        <span class="acc-chevron" data-state="open">▸</span>
        <span class="acc-trigger-label">Overview</span>
      </button>
    </h3>
    <div role="region"
         id="acc-xyz-overview-content"
         aria-labelledby="acc-xyz-overview-trigger"
         class="acc-content"
         data-state="open"
         style="--accordion-content-height: 124px">
      <div class="acc-content-inner">Summary…</div>
    </div>
  </div>

  <div class="acc-item" data-state="closed" data-disabled="false">
    <h3 class="acc-header"><button …>…</button></h3>
    <div role="region" data-state="closed" hidden>…</div>
  </div>

  <div class="acc-item" data-state="closed" data-disabled="true">
    <h3 class="acc-header"><button aria-disabled="true" tabindex="-1">…</button></h3>
    <div role="region" data-state="closed" hidden>…</div>
  </div>
</div>
```

### 4.2 chevron 회전

```css
.acc-chevron {
  display: inline-block;
  width: 12px; height: 12px;
  transition: transform 180ms cubic-bezier(0.4, 0, 0.2, 1);
  transform: rotate(0deg);
  color: var(--acc-chevron-fg);
}
.acc-chevron[data-state="open"] {
  transform: rotate(var(--acc-chevron-open-rotate, 90deg));
}
```

`Root` 가 `chevronRotation=180` 이면 root 레벨에 `--acc-chevron-open-rotate: 180deg` 주입.

기본 아이콘은 SVG ("chevron-right"). 사용자가 `hideChevron` 으로 숨길 수도 있고, 완전히 커스텀 아이콘을 사용하고 싶으면 `hideChevron` 후 Trigger children 에 본인 아이콘을 직접 배치.

### 4.3 native `<details>`/`<summary>` vs `<div>` 선택

**`<div>` 선택 이유**:

1. **ARIA 표준 매핑 부정확**: `<details>` 는 UA 에 따라 `role="group"` 으로 노출되며 `aria-expanded` 가 `<summary>` 에 자동으로 들어가지만, "그룹 내 Arrow 내비게이션(다음 trigger 로 포커스 이동)" 이나 `aria-labelledby`/`aria-controls` 쌍은 강제할 수 없다. `<summary>` 는 `button` 이 아니라 고유한 role 을 가진다.
2. **single mode (상호 배제) 구현 어려움**: native details 는 개별적으로만 열고 닫는다. 같은 그룹에서 하나만 열리도록 하려면 어차피 JS 로 `open` 속성을 조작해야 하며, 그럴거면 div 로 통일하는 편이 일관성 있다. HTML spec 의 `name` 속성(2024 도입)이 있지만 Safari 지원이 불완전.
3. **애니메이션 제어**: `::details-content` pseudo-element 와 `interpolate-size: allow-keywords` 는 미래형 대안이지만(§5.4), 현재 cross-browser 안정성 + reduced-motion 세밀 제어 관점에서 직접 측정이 더 예측 가능.
4. **compound API 일관성**: 본 라이브러리의 다른 컴포넌트(CommandPalette/Dialog/Popover)가 모두 div 기반 헤드리스이다. 일관성.
5. **forceMount, disabled, nested Accordion** 등 세부 기능을 대응하려면 결국 div 가 유리.

단, `<h3>` (`as` 로 변경 가능) 로 Trigger 를 감싸 "목차 문서" 의 heading 구조를 유지한다 — 스크린리더 "heading 목록" 내비게이션 호환성 확보.

### 4.4 palette 토큰

```ts
// Accordion/theme.ts
export const accordionPalette = {
  light: {
    rootBorder:         "rgba(0,0,0,0.08)",
    itemBorder:         "rgba(0,0,0,0.08)",
    headerBg:           "#ffffff",
    headerBgHover:      "#f8fafc",
    headerBgActive:     "#eef2f7",
    triggerFg:          "#0f172a",
    triggerFgDisabled:  "rgba(15,23,42,0.35)",
    chevronFg:          "rgba(15,23,42,0.55)",
    contentBg:          "#ffffff",
    contentFg:          "#111827",
    focusRing:          "#2563eb",
  },
  dark: {
    rootBorder:         "rgba(255,255,255,0.08)",
    itemBorder:         "rgba(255,255,255,0.06)",
    headerBg:           "#0f172a",
    headerBgHover:      "#121a2d",
    headerBgActive:     "#17213b",
    triggerFg:          "#e5e7eb",
    triggerFgDisabled:  "rgba(229,231,235,0.35)",
    chevronFg:          "rgba(229,231,235,0.7)",
    contentBg:          "#0f172a",
    contentFg:          "#cbd5e1",
    focusRing:          "#60a5fa",
  },
} as const;
```

### 4.5 CSS 기본

```css
.acc-root {
  border-top: 1px solid var(--acc-root-border);
  background: transparent;
}
.acc-item {
  border-bottom: 1px solid var(--acc-item-border);
}
.acc-header { margin: 0; }
.acc-trigger {
  width: 100%;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: var(--acc-header-bg);
  color: var(--acc-trigger-fg);
  font: inherit;
  text-align: left;
  cursor: pointer;
  border: 0;
  outline: none;
  transition: background 120ms;
}
.acc-trigger:hover           { background: var(--acc-header-bg-hover); }
.acc-trigger[data-state="open"] { background: var(--acc-header-bg-active); }
.acc-trigger:focus-visible   { box-shadow: inset 0 0 0 2px var(--acc-focus-ring); }
.acc-trigger[aria-disabled="true"] {
  color: var(--acc-trigger-fg-disabled);
  cursor: not-allowed;
}

.acc-content {
  overflow: hidden;
  background: var(--acc-content-bg);
  color: var(--acc-content-fg);
  transition:
    max-height var(--acc-duration, 200ms) cubic-bezier(0.4, 0, 0.2, 1),
    opacity    var(--acc-duration, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}
.acc-content[data-state="closed"] {
  max-height: 0;
  opacity: 0;
}
.acc-content[data-state="open"] {
  max-height: var(--accordion-content-height, 1000px);
  opacity: 1;
}
.acc-content-inner {
  padding: 12px 12px 16px;
}

@media (prefers-reduced-motion: reduce) {
  .acc-content, .acc-chevron { transition: none !important; }
}
```

---

## 5. 핵심 로직 (펼침/접힘 측정과 전환)

### 5.1 접근 방식 비교

| 방식 | 장점 | 단점 | 선택 |
|---|---|---|---|
| A. `display: none` 토글 | 간단 | 전환 애니메이션 불가 | ✗ |
| B. `height: auto` ↔ `0` 직접 전환 | 직관적 | `auto` 는 interpolatable 아님 → 전환 안됨 | ✗ |
| C. `max-height: 0` ↔ 고정 큰 값 | CSS 만으로 동작 | 큰 값이면 빈 delay, 작은 값이면 clipping | ✗ |
| **D. 측정 + CSS 변수 주입** (`max-height: var(--h)`) | 정확 + 전환 가능 + cross-browser | 측정 시점 관리 필요 | **v1 선택** |
| E. `::details-content` + `interpolate-size` | 스펙 일관 | Safari/Firefox 미지원 또는 제한적 | v2 고려 (§16) |
| F. JS 타이머로 프레임마다 height 조정 | 정밀 제어 | 성능/복잡도 | ✗ |

### 5.2 측정 로직 (방식 D)

각 Item 의 Content 에 inner wrapper 를 두고 그 scrollHeight 를 `ResizeObserver` 로 감시한다.

```ts
// useContentHeight.ts
export function useContentHeight(
  innerRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
): number {
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    // 초기 측정
    setHeight(el.scrollHeight);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      // contentBoxSize 우선, fallback contentRect
      const box = entry.contentBoxSize?.[0];
      const h = box ? box.blockSize : entry.contentRect.height;
      setHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [innerRef, open /* 열릴 때 다시 관찰 */]);
  return height;
}
```

Content 에서 height 를 CSS 변수로 주입:
```tsx
<div
  role="region"
  className="acc-content"
  data-state={open ? "open" : "closed"}
  aria-labelledby={triggerId}
  id={contentId}
  style={{ ["--accordion-content-height" as never]: `${height}px` }}
  hidden={!open && !animating && !forceMount}
>
  <div ref={innerRef} className="acc-content-inner">{children}</div>
</div>
```

### 5.3 open/close 전환 시퀀스

**Close**: `open: true → false`
1. 현재 scrollHeight 를 CSS 변수에 기록.
2. 다음 프레임에 `data-state="closed"` 로 전환 → CSS 가 `max-height: 0` 으로 transition.
3. `transitionend` 에서 `hidden` 속성 추가(접근성 + 탭 순서 제외). 단 `forceMount` 이면 생략.

**Open**: `open: false → true`
1. `hidden` 제거 + `data-state="open"` (단, CSS 변수는 이미 마지막으로 측정된 값을 보존 — 첫 open 에서 측정이 없으면 직전 mount 시점 useLayoutEffect 로 미리 확보).
2. React commit → paint → transition.

**Race 방지**: 빠르게 토글 연속으로 눌렀을 때 `transitionend` 콜백이 다른 state 에 적용되면 이상 상태. `data-state` 값과 이벤트 target 의 상태를 비교해서 mismatch 이면 skip:
```ts
const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
  if (e.propertyName !== "max-height") return;
  if (e.currentTarget.dataset.state !== "closed") return;
  if (!forceMount) e.currentTarget.setAttribute("hidden", "");
};
```

### 5.4 modern `::details-content` 대안 (v2 후보, §16에 연결)

```css
/* 참고용 (v1 미적용) */
.acc-item {
  interpolate-size: allow-keywords;
}
.acc-item::details-content {
  height: 0;
  transition:
    height var(--acc-duration, 200ms) ease-out,
    content-visibility var(--acc-duration, 200ms) allow-discrete;
}
.acc-item[open]::details-content {
  height: auto;
}
```

이 경우 `<details>/<summary>` 로 회귀해야 하며, 위 §4.3 단점(single 모드, Arrow 내비게이션)이 다시 발목을 잡는다. v1 은 div + 측정 방식을 유지하고, v2 에서 baseline 확산 후 재평가.

### 5.5 reduced-motion

- `@media (prefers-reduced-motion: reduce)` 에서 `transition: none`.
- JS 에서도 `window.matchMedia("(prefers-reduced-motion: reduce)").matches` 를 확인해 `hidden` 속성을 `transitionend` 대기 없이 즉시 토글(transitionend 가 발생하지 않으므로 의존하면 stuck).

```ts
const reduceMotion = useMemo(
  () => typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  [],
);
```

마운트 후 media query change 구독은 v1.1. 한 번 읽어 캐시한 값으로 충분.

---

## 6. 제약 (큰 콘텐츠 · 지연 로드 이미지)

### 6.1 매우 큰 Item (수천 px)

- `max-height` 전환 중 브라우저는 매 프레임 layout 을 재계산한다. 단일 item 이 3000 px 을 넘으면 저사양 기기에서 transition 이 튀는 사례가 있다 → `--acc-duration` 기본 200 ms 에 맞춰 프레임 수가 12개 정도이므로 대부분 문제 없으나, 큰 콘텐츠 페이지에서는 사용자가 `style={{ ["--acc-duration"]: "0ms" }}` 로 무효화할 수 있도록 문서화.
- `contain: layout paint` 를 Content 에 적용해 layout 전파를 격리(§14 참조).

### 6.2 이미지 지연 로드

`<img>` 가 open 후 비동기로 로드되면서 Content height 가 변한다. ResizeObserver 가 이 변화를 감지하면 CSS 변수가 다시 주입되지만, 이때 `data-state` 는 이미 `open` 이라 transition 가 트리거되어 높이가 "부드럽게 성장" 한다. 사용자는 원치 않을 수 있다.

정책:
- 초기 open 시점의 첫 transition 은 0 → measured 로 정상 진행.
- 이후 `open` 상태에서 inner scrollHeight 변경은 CSS 변수 업데이트만 즉시 적용하고 transition 은 스킵하기 위해, `data-growing="true"` 플래그를 한 프레임 동안 세워 `.acc-content[data-growing="true"] { transition: none }` 로 우회.

```ts
const prevHeightRef = useRef(0);
useLayoutEffect(() => {
  if (!open) return;
  if (prevHeightRef.current !== 0 && height !== prevHeightRef.current) {
    const el = contentRef.current;
    if (el) {
      el.dataset.growing = "true";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (el) delete el.dataset.growing;
        });
      });
    }
  }
  prevHeightRef.current = height;
}, [height, open]);
```

### 6.3 동적 자식 (Content 내부에 `<Accordion.Root>` nested)

nested 가 열리면 바깥 height 도 증가한다. 바깥의 ResizeObserver 가 반응해 바깥 CSS 변수 갱신. 위 6.2 로직과 동일하게 "성장" 은 스킵(또는 허용 — 정책 결정).

**결정**: 성장은 transition 스킵(튀지 않음). 수축은 자연 transition 없이 즉시 반영. 요약: **open 상태 유지 중 height 변경 → transition 없이 반영**. transition 은 오직 open↔closed 전환에서만.

---

## 7. 키보드

Trigger 는 `<button type="button">` 이므로 네이티브로 Enter/Space 토글을 받는다. Arrow/Home/End 는 Root 컨텍스트의 `focusTrigger` 를 통해 구현.

| 키 | 동작 (Trigger focus 상태) |
|---|---|
| `Enter` / `Space` | 현재 Item toggle. `type="single"` + `collapsible=false` 이면, 이미 열린 자기 자신은 토글 불가(무동작). |
| `ArrowDown` | 다음 focusable Trigger 로 이동. `loop=true` 면 마지막에서 첫 번째로 wrap. |
| `ArrowUp` | 이전 focusable Trigger. wrap 동일. |
| `Home` | 첫 focusable Trigger. |
| `End` | 마지막 focusable Trigger. |
| `Tab` / `Shift+Tab` | 그룹을 벗어남 (roving tabindex 아님 — 모든 Trigger 는 tabindex=0). |

### 7.1 roving tabindex 여부

Radix 는 `ArrowDown/Up` 을 사용하므로 tabindex 를 개별 0 으로 두고 Arrow 만 우리가 처리. Tab 으로도 하나씩 넘길 수 있다(Radix 와 동일). 본 plan 도 이 방식 채택 — roving tabindex 불필요.

단 `disabledFocus: "skip"` 이면 disabled Trigger 에 `tabindex="-1"` 를 주어 Tab 순회에서 제외하되, Arrow 로도 건너뛴다.

### 7.2 키 처리 로직

```ts
function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
  if (e.key === "ArrowDown") { e.preventDefault(); focusTrigger(value, "next"); }
  else if (e.key === "ArrowUp") { e.preventDefault(); focusTrigger(value, "prev"); }
  else if (e.key === "Home") { e.preventDefault(); focusTrigger(value, "first"); }
  else if (e.key === "End") { e.preventDefault(); focusTrigger(value, "last"); }
  // Enter/Space 는 native <button> click → toggle 로 처리됨
}
```

### 7.3 `type="single"` + `collapsible=false` 의 특수 규칙

- 이 조합은 "하나는 항상 열림" 을 강제.
- 열린 항목의 Trigger 를 클릭해도 close 불가(사용자가 다른 Trigger 를 눌러야 전환).
- Space/Enter 로도 close 불가. 이때 Trigger 의 `aria-expanded` 는 true 로 고정되고 사용자 입장에서 "아무 일도 안 일어남" → 혼란 방지를 위해 dev console 에서 1 회 디버그 힌트 출력("use collapsible prop to allow closing").
- 초기 value 가 "" 이면, 첫 번째 non-disabled item 이 자동 open 되지는 않는다(사용자 의도 보존) — 단 dev warn.

### 7.4 포커스 이동 구현

Root 가 trigger element ref map 을 유지:
```ts
const triggerRefsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
const orderRef = useRef<string[]>([]); // DOM 순서 유지용

function registerTrigger(value: string, el: HTMLButtonElement | null) {
  if (el) {
    triggerRefsRef.current.set(value, el);
    if (!orderRef.current.includes(value)) orderRef.current.push(value);
  } else {
    triggerRefsRef.current.delete(value);
    orderRef.current = orderRef.current.filter(v => v !== value);
  }
}
```

order 는 Item 이 렌더될 때 삽입되므로 실제 DOM 순서와 동일. `focusTrigger("a", "next")` 는 order 에서 a 다음 non-skipped value 를 찾아 `.focus()` 호출.

---

## 8. 상태 관리 (controlled / uncontrolled / onValueChange)

### 8.1 내부 표현과 공개 표현 분리

```ts
function normalizeValue(
  type: AccordionType,
  external: string | string[] | undefined,
): Set<string> {
  if (external === undefined) return new Set();
  if (type === "single") {
    return typeof external === "string" && external ? new Set([external]) : new Set();
  }
  return new Set(Array.isArray(external) ? external : []);
}

function denormalize(
  type: AccordionType,
  internal: Set<string>,
): string | string[] {
  if (type === "single") {
    return internal.size === 0 ? "" : Array.from(internal)[0]!;
  }
  return Array.from(internal);
}
```

### 8.2 useControllable 활용

`useControllable` 은 값 변환 없이 그대로 통과하므로, 여기서는 한 번 감싼다:

```ts
const [valueOpen, setValueOpen] = useControllable<Set<string>>(
  props.value !== undefined ? normalizeValue(props.type, props.value) : undefined,
  normalizeValue(props.type, props.defaultValue),
  (next) => {
    props.onValueChange?.(denormalize(props.type, next) as never);
  },
);
```

> 주의: `useControllable` 은 controlled 일 때 `controlled !== undefined` 로 판정한다. prop `value` 를 `Set` 으로 변환한 결과가 항상 truthy(빈 Set 도 존재) 이므로 판정 무결. 단, controlled 여부는 **원본 prop `value`** 기준이어야 하므로 `controlled` 인자로는 "value prop 이 undefined 이면 undefined, 아니면 Set" 을 넘긴다.

### 8.3 toggle 규칙

```ts
function toggle(value: string) {
  if (disabled) return;
  if (disabledItems.has(value)) return;

  const next = new Set(valueOpen);
  const isOpen = next.has(value);

  if (type === "single") {
    if (isOpen) {
      if (!collapsible) {
        // ignore (dev hint)
        if (process.env.NODE_ENV !== "production") {
          console.debug("[Accordion] collapsible=false: cannot close the only open item");
        }
        return;
      }
      next.delete(value);
    } else {
      next.clear();
      next.add(value);
    }
  } else {
    if (isOpen) next.delete(value);
    else next.add(value);
  }

  setValueOpen(next);
}
```

### 8.4 onValueChange 호출 시점

- 사용자 인터랙션으로 상태가 바뀔 때만 호출.
- Root 의 `defaultValue` 로 인한 초기 mount 에서는 호출하지 않음.
- controlled 모드에서는 상태 업데이트 없이 `onValueChange` 만 호출(owner 가 다음 `value` 를 결정).

---

## 9. 애니메이션

### 9.1 duration / easing

- 기본 200 ms, `cubic-bezier(0.4, 0, 0.2, 1)`.
- CSS 변수 `--acc-duration` 과 `--acc-easing` 로 Root/Item 단위 override 가능:
  ```tsx
  <Accordion.Root style={{ ["--acc-duration"]: "120ms" }}>…</Accordion.Root>
  ```

### 9.2 reduced-motion

위 §5.5. `prefers-reduced-motion: reduce` 에서 `transition: none`. JS 는 `transitionend` 대신 즉시 상태 적용 (transitionend 가 안 오는 경우 고려).

### 9.3 Safari 의 `height: auto` / `max-height` 특이사항

- Safari 17 이전은 `max-height` transition 중 children 에 sticky/position:fixed 가 있을 때 flicker 발생 사례. Content inner 에 `will-change: max-height` 금지 (오히려 악화) — plain transition 유지.
- iOS Safari 는 `touch-action` 미지정 시 native pan gesture 가 transition 을 중단시키는 엣지케이스가 있다. Content 에는 `touch-action: pan-y` 를 명시하지 않고 default 그대로 둔다. Trigger button 은 기본 `touch-action: manipulation` 적용(double-tap zoom 방지).

### 9.4 chevron 전환

transform: rotate 는 composited 프로퍼티라 매우 저렴. 200 ms 가 아닌 180 ms 로 약간 짧게 두어 "먼저 회전 → content 펼침" 이라는 미세한 시각적 계층을 만든다.

### 9.5 animation interrupt 허용

빠르게 두 번 클릭 시:
- 첫 클릭: 0 → measured 로 open 시작.
- 두 번째 클릭: measured → 0 로 close 시작. 단, 현재 컴포넌트가 이미 transition 중이므로 `data-state` 만 갈아끼우면 브라우저가 "current computed max-height → 0" 으로 자연스레 전환. 실제 테스트 시 smooth interrupt 관찰됨. 별도 abort 로직 불필요.

---

## 10. 파일 구조

```
src/components/Accordion/
├── Accordion.tsx              # Root + Item + Header + Trigger + Content 조립
├── Accordion.types.ts         # 공개 타입
├── AccordionContext.ts        # RootContext + ItemContext + hook
├── useContentHeight.ts        # ResizeObserver 기반 measured height hook
├── useAccordionState.ts       # controlled/uncontrolled + toggle reducer
├── theme.ts                   # accordionPalette
└── index.ts                   # 배럴
```

각 파일 책임:

- **Accordion.tsx**
  - `AccordionRoot` / `AccordionItem` / `AccordionHeader` / `AccordionTrigger` / `AccordionContent` 함수 컴포넌트.
  - Root: `useAccordionState` 훅 호출 + RootContext.Provider + palette CSS 변수 주입 + children 검증(dev).
  - Item: disabled 병합(Root+Item), Item id 생성(`useId`), ItemContext.Provider.
  - Header: `as` 태그 (기본 `h3`).
  - Trigger: button + aria-expanded/controls + keydown + registerTrigger.
  - Content: role=region + ref + useContentHeight + hidden 관리 + transitionend.
  - namespace `Accordion = { Root, Item, Header, Trigger, Content }`.

- **Accordion.types.ts**
  - §2.1 전부.

- **AccordionContext.ts**
  - `AccordionRootContext`, `AccordionItemContext`.
  - `useAccordionRootContext()` / `useAccordionItemContext()` — null 이면 throw (`"must be used within Accordion.Root/Item"`).

- **useContentHeight.ts**
  - ResizeObserver 기반 scrollHeight 관측 + height setter + 성장 vs 전환 구분 플래그 (§6.2).

- **useAccordionState.ts**
  - normalizeValue/denormalize + toggle reducer + `registerTrigger`/`focusTrigger` + reduced-motion 감지.
  - Root 내부에서 한 번 호출되는 단일 훅.

- **theme.ts**
  - `accordionPalette` (light/dark) + css variable 적용 헬퍼.

- **index.ts**
  - `export { Accordion } from "./Accordion";` + type re-exports.

---

## 11. 구현 단계 (후속 agent 가 순차 실행)

각 단계는 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과 상태.

### Step 1 — 타입 + 배럴 + 테마 스켈레톤
1. `Accordion.types.ts` 작성 (§2.1 전부, discriminated union 포함).
2. `theme.ts` 작성 (palette).
3. `AccordionContext.ts` 기본 틀 (두 context + null-throw hook).
4. `index.ts` 배럴.
5. `src/components/index.ts` 에 `export * from "./Accordion";`.
6. `Accordion.tsx` placeholder: `export const Accordion = { Root: () => null, Item: () => null, Header: () => null, Trigger: () => null, Content: () => null };`.
7. `npm run typecheck` 통과.
8. 커밋: `feat(Accordion): 타입 + 컨텍스트 + 배럴`.

### Step 2 — Root 기본 렌더 + state hook
1. `useAccordionState` 작성 — `useControllable` 감싸기 + normalize/denormalize + toggle reducer.
2. `AccordionRoot` 에서 hook 호출 + RootContext.Provider + `<div class="acc-root">` 렌더.
3. palette CSS 변수 주입.
4. 커밋: `feat(Accordion): Root 상태 + context provider`.

### Step 3 — Item / Header / Trigger (click toggle, chevron)
1. `AccordionItem` — ItemContext + id 생성 + disabled 병합.
2. `AccordionHeader` — `as` 태그.
3. `AccordionTrigger` — `<button>` + `aria-expanded` / `aria-controls` + onClick → `toggle(value)` + chevron 스팬.
4. chevron CSS (회전).
5. 이 단계에서 Content 는 단순히 `hidden={!open}` 만 (애니메이션 없음). 토글 동작 확인.
6. 커밋: `feat(Accordion): Item/Header/Trigger 토글`.

### Step 4 — Content 애니메이션 (측정 + max-height)
1. `useContentHeight` 작성.
2. `AccordionContent` — role=region + ResizeObserver 연결 + CSS 변수 주입 + data-state + transitionend 로 hidden 재적용.
3. CSS 전환 규칙.
4. reduced-motion 분기.
5. 커밋: `feat(Accordion): Content max-height 전환`.

### Step 5 — 키보드 내비게이션 + 포커스 관리
1. Root 에 `registerTrigger`/`focusTrigger` 구현.
2. Trigger onKeyDown: Arrow/Home/End.
3. `disabledFocus="skip"` 분기.
4. 커밋: `feat(Accordion): 키보드 내비게이션`.

### Step 6 — 이미지 지연 로드 / 성장 전환 스킵
1. §6.2 prevHeightRef + data-growing 플래그.
2. 커밋: `feat(Accordion): Content 성장 시 transition 스킵`.

### Step 7 — Dark 테마 + 시각 마감
1. `theme="dark"` palette.
2. focus ring / hover / active 조정.
3. 커밋: `feat(Accordion): dark 테마`.

### Step 8 — 데모 페이지
1. `demo/src/pages/AccordionPage.tsx` (§12).
2. `demo/src/App.tsx` NAV 에 `"accordion"` 추가.
3. 커밋: `feat(Accordion): 데모 페이지`.

### Step 9 — Props 표 + Usage 예제
1. Props 표 (Root/Item/Header/Trigger/Content 5 개).
2. Usage (최소 4 개).
3. 커밋: `feat(Accordion): 데모 props 표 + usage`.

### Step 10 — 마감
1. §20 Definition of Done 모두 체크.
2. 커밋: `docs(Accordion): DoD 확인`.

---

## 12. 데모 페이지

`demo/src/pages/AccordionPage.tsx`. 기존 `CommandPalettePage.tsx` 레이아웃 복제. 각 섹션은 `<section id="...">` + 우측 사이드바 NAV 와 연동.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "accordion", label: "Accordion", description: "수직 collapsible 섹션", sections: [
  { label: "Basic (single)",       id: "basic-single" },
  { label: "Multiple",             id: "multiple" },
  { label: "Controlled",           id: "controlled" },
  { label: "Disabled",             id: "disabled" },
  { label: "Custom trigger",       id: "custom-trigger" },
  { label: "Nested",               id: "nested" },
  { label: "Reduced motion",       id: "reduced-motion" },
  { label: "Dark",                 id: "dark" },
  { label: "Playground",           id: "playground" },
  { label: "Props",                id: "props" },
  { label: "Usage",                id: "usage" },
]},
```

그리고 `Page` 타입에 `"accordion"` 추가 + 하단 `{current === "accordion" && <AccordionPage />}`.

### 12.2 섹션 구성

**Basic (single)** — 가장 단순한 예. `collapsible` 포함.
```tsx
<Accordion.Root type="single" collapsible defaultValue="overview">
  <Accordion.Item value="overview">
    <Accordion.Header>
      <Accordion.Trigger>Overview</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>
      <p>This pipeline ingests 3 data sources and produces 2 artifacts.</p>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="nodes">
    <Accordion.Header>
      <Accordion.Trigger>Nodes</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>
      <ul><li>Source A</li><li>Transform B</li><li>Sink C</li></ul>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="metrics">
    <Accordion.Header>
      <Accordion.Trigger>Metrics</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>
      <p>Throughput: 1.2k rec/s, Latency p99: 420ms.</p>
    </Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

**Multiple**
```tsx
<Accordion.Root type="multiple" defaultValue={["overview", "metrics"]}>
  …(동일 구조)
</Accordion.Root>
```

**Controlled**
```tsx
const [open, setOpen] = useState<string>("overview");
return (
  <>
    <div className="flex gap-2 mb-2">
      <Button onClick={() => setOpen("overview")}>Open Overview</Button>
      <Button onClick={() => setOpen("nodes")}>Open Nodes</Button>
      <Button onClick={() => setOpen("")}>Close all</Button>
    </div>
    <Accordion.Root type="single" collapsible value={open} onValueChange={setOpen}>
      …
    </Accordion.Root>
  </>
);
```

**Disabled** — Root 전체 vs 개별 Item
```tsx
<Accordion.Root type="single" collapsible>
  <Accordion.Item value="a"><Accordion.Header><Accordion.Trigger>A (enabled)</Accordion.Trigger></Accordion.Header><Accordion.Content>…</Accordion.Content></Accordion.Item>
  <Accordion.Item value="b" disabled><Accordion.Header><Accordion.Trigger>B (disabled)</Accordion.Trigger></Accordion.Header><Accordion.Content>…</Accordion.Content></Accordion.Item>
  <Accordion.Item value="c"><Accordion.Header><Accordion.Trigger>C</Accordion.Trigger></Accordion.Header><Accordion.Content>…</Accordion.Content></Accordion.Item>
</Accordion.Root>
```

**Custom trigger (chevron 위치/아이콘 교체, 뱃지)**
```tsx
<Accordion.Root type="single" collapsible>
  <Accordion.Item value="a">
    <Accordion.Header>
      <Accordion.Trigger hideChevron>
        <MyIcon /> <span>Custom trigger</span>
        <span className="ml-auto badge">3</span>
      </Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>…</Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

**Nested** — Content 안에 또 다른 Accordion.Root. 바깥/안쪽 독립 상태 동작 확인.
```tsx
<Accordion.Root type="multiple" defaultValue={["outer-1"]}>
  <Accordion.Item value="outer-1">
    <Accordion.Header><Accordion.Trigger>Outer 1</Accordion.Trigger></Accordion.Header>
    <Accordion.Content>
      <Accordion.Root type="single" collapsible defaultValue="inner-a">
        <Accordion.Item value="inner-a">
          <Accordion.Header><Accordion.Trigger>Inner A</Accordion.Trigger></Accordion.Header>
          <Accordion.Content>Inner A body</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="inner-b">
          <Accordion.Header><Accordion.Trigger>Inner B</Accordion.Trigger></Accordion.Header>
          <Accordion.Content>Inner B body</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </Accordion.Content>
  </Accordion.Item>
  <Accordion.Item value="outer-2">…</Accordion.Item>
</Accordion.Root>
```

**Reduced motion** — 사용자가 체크박스로 강제 `--acc-duration: 0ms` override. 시스템 reduced-motion 효과도 안내.
```tsx
const [instant, setInstant] = useState(false);
return (
  <>
    <label><input type="checkbox" checked={instant} onChange={e => setInstant(e.target.checked)} /> Instant (0ms)</label>
    <Accordion.Root type="single" collapsible style={instant ? { ["--acc-duration"]: "0ms" } : undefined}>…</Accordion.Root>
  </>
);
```

**Dark**
```tsx
<div style={{ background: "#0b1220", padding: 16 }}>
  <Accordion.Root theme="dark" type="multiple" defaultValue={["a"]}>…</Accordion.Root>
</div>
```

**Playground**
상단 컨트롤 바:
- `type` 라디오 (single / multiple)
- `collapsible` 체크박스 (single 일 때만 활성)
- `disabled` 체크박스 (Root)
- `disabledFocus` 라디오 (skip / include)
- `chevronRotation` 라디오 (90 / 180)
- `loop` 체크박스
- `theme` 라디오 (light / dark)
- `--acc-duration` input (ms)

아래에 Accordion 렌더 + 현재 value JSON 표시.

**Props 표** — Root / Item / Header / Trigger / Content 5 개 섹션.

**Usage (4개)**
1. Basic single + collapsible.
2. Multiple with external controls.
3. Nested Accordion (바깥 multiple, 안쪽 single).
4. Custom trigger with icon/badge + dark.

---

## 13. 검증 계획

### 13.1 자동화
```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```
주의:
- `exactOptionalPropertyTypes: true` — optional prop 은 `?:` 유지, 내부 디폴트 머지에서 `undefined` 분기 필요.
- `noUncheckedIndexedAccess: true` — `Array.from(openSet)[0]` 타입이 `string | undefined`. `!` 필요.
- `verbatimModuleSyntax: true` — 타입 import 는 `import type`.
- discriminated union 의 `collapsible?: never` 는 controlled caller 에게 타입 레벨에서 multiple+collapsible 조합을 차단.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic single: 첫 번째 열림, 다른 것 클릭 시 이전 닫히고 새로 열림, 열린 것 재클릭 시 닫힘(`collapsible`).
- [ ] Basic single + `collapsible=false`: 열린 것 재클릭 무동작. dev console 힌트 출력.
- [ ] Multiple: 여러 개 동시 열림/닫힘 각각 독립.
- [ ] Controlled: 외부 버튼으로 open 전환 즉시 반영. 사용자 클릭 시 onValueChange 만 호출되고 외부 state 주도.
- [ ] Disabled(item): 해당 Trigger 클릭 무동작, cursor=not-allowed, aria-disabled=true.
- [ ] Disabled(Root): 모든 Trigger 무동작.
- [ ] `disabledFocus="skip"`: Tab 으로 disabled Trigger 건너뜀. Arrow 로도 건너뜀.
- [ ] Custom trigger: `hideChevron` 으로 chevron 숨김, children 만 표시. aria-expanded 여전히 동기화.
- [ ] Nested: 바깥 Item 닫을 때 안쪽 상태 유지 여부 — `forceMount=false` 기본이면 닫힐 때 hidden. 다시 열면 안쪽 상태 유지(React state 는 그대로).
- [ ] Nested: 안쪽 Accordion Arrow 내비게이션이 바깥으로 누출되지 않음.
- [ ] Reduced motion: 시스템 설정 on → transition 없음. Instant 체크박스 동일.
- [ ] Animation interrupt: 매우 빠른 연속 클릭에도 상태가 어긋나지 않음, 최종 aria-expanded 정확.
- [ ] 이미지 load 후 height sync: placeholder → 이미지 로드 → CSS 변수 갱신, 기존 transition 끊기지 않음.
- [ ] 키보드: ArrowDown/Up 로 Trigger 순회, Home/End 로 처음/끝, Enter/Space 로 토글, loop=false 이면 끝에서 멈춤.
- [ ] ARIA: VoiceOver 로 "collapsed/expanded" 읽힘. Content 가 region 으로 읽힘. aria-controls 가 content id 일치.
- [ ] Dark 테마: 모든 상태(hover/active/focus/open) 다크 팔레트 반영.
- [ ] Playground: 모든 컨트롤 조합 실시간 반영.
- [ ] 다른 페이지(CommandPalette/PipelineGraph/DataTable) 리그레션 없음.

### 13.3 엣지 케이스
- [ ] `type="single"` + `value=""` (모두 닫힘) 으로 controlled — 정상 동작.
- [ ] `type="multiple"` + `value=[]` — 정상 동작.
- [ ] 중복 `Accordion.Item value` — dev console.error + 첫 번째만 인식 (후속은 무시/마지막 승리 여부 정하기 — 본 plan: 후속 승리, 즉 같은 value 의 Trigger 2 개가 있으면 둘 다 상태를 공유).
- [ ] Root 밖에서 Trigger 사용 시 Context null → throw (잡아냄).
- [ ] Item 밖에서 Trigger/Content 사용 시 throw.
- [ ] forceMount=true 인 Content: 닫혀도 DOM 유지 + hidden 속성으로 aria 감춤.
- [ ] disabled item 이 현재 open 중일 때 runtime 에 disabled 로 바뀜 → 여전히 열린 채 유지되고 Trigger 만 비활성.
- [ ] Content 내부에 `<input>` 이 있고 닫힘 상태일 때 Tab 이 그 input 에 도달하지 않음(`hidden` 덕).
- [ ] Content 내부 `<iframe>` 의 scrollHeight 반영 — ResizeObserver 가 iframe 자체 크기 변화를 감지하지는 못하지만 iframe 은 보통 height 고정이라 문제 없음.
- [ ] `prefers-reduced-motion: reduce` 세팅에서 첫 open 시 측정 → 즉시 반영.
- [ ] React Strict Mode 이중 마운트: ResizeObserver 가 새로 생성+해제되어도 누수 없음.
- [ ] unmount 직전 transition 중: cleanup 에서 ResizeObserver.disconnect, event listener 제거.

---

## 14. 성능

### 14.1 목표
- Item 10 개, 각 Content 1000 px 규모에서 toggle 시 **60 fps** 유지(transitionend 이전 dropped frame 0).
- 100 개 Item, 모두 닫힘 상태 초기 마운트 < 20 ms.

### 14.2 병목 가설 + 완화
1. **ResizeObserver 대량 등록**: 100 Item 각각 RO 등록 시 브라우저 비용 상승. 완화: RO 는 **닫힌 Item 에서 비활성** (닫혔는데 측정할 이유 없음 — 단, 첫 open 시 측정값 확보를 위해 최초 1 회는 필요). 정책: Item 이 한 번이라도 open 된 이후에만 RO 유지. 구현 단순화를 위해 v1 은 항상 유지하되, 100 개 이상에서 체감 문제 시 v1.1 에 옵트아웃 도입.
2. **Context 변경 시 전파 rerender**: Root 상태(openSet) 가 바뀌면 RootContext value 가 새 reference — 모든 Item/Trigger rerender. 완화:
   - Root 는 openSet 만 바뀌어도 context value 재생성 불가피. 대신 Trigger/Content 가 자기 Item 의 `open` 에 의존 → 파생값은 Item Context 에서 selector 적 추출. 하지만 React Context 는 selector 미지원 → `React.memo` 로 Item/Trigger/Content 각각 감싸고 비교 함수에서 "자기 value 의 open 만" 비교.
   - 실제 데이터: Item 100 개 중 한 쪽이 토글될 때 rerender 99 개 vs 1 개 차이. 측정 후 필요하면 `useSyncExternalStore` 패턴으로 전환 (v1.1).
3. **flex/layout reflow**: max-height 전환 중 parent 가 overflow:auto 이면 scrollbar 가 튄다. 완화: root container 에 `contain: layout` 권장(문서화). Content 에는 `contain: layout paint` 적용.
4. **큰 scrollHeight 변경 감지 빈도**: ResizeObserver 의 콜백은 rAF 단위 배치. 문제 없음.

### 14.3 측정 방법
- DevTools Performance 탭에서 토글 연속 녹화 → Long Task < 50 ms.
- 눈으로 "툭"/"점프" 없는 부드러움 확인.

---

## 15. 접근성

### 15.1 ARIA 매핑

- `Accordion.Root`: `role="presentation"` (그룹 래퍼, semantic 은 각 Item 의 heading 으로). 대안 `role="group" aria-label` 도 논쟁 대상이나 Radix/MUI 전례에 따라 presentation.
- `Accordion.Header`: 기본 `h3` (heading). 사용자가 `as` 로 레벨 조절.
- `Accordion.Trigger`: `<button type="button">`. `aria-expanded={open}`, `aria-controls={contentId}`, `aria-disabled={disabled}`. disabled 일 때 `tabindex={disabledFocus === "skip" ? -1 : 0}`.
- `Accordion.Content`: `<div role="region" id={contentId} aria-labelledby={triggerId}>`. 닫힘 상태에서 `hidden` 속성으로 AT 에서 숨김(forceMount 는 aria-hidden + visually hidden 전략도 가능하나 v1 은 `hidden` 고정).

### 15.2 heading 권고

Trigger 를 heading 으로 감싸는 것은 WAI-ARIA Authoring Practices (APG) 의 accordion 패턴 정석. `as="div"` 로 꺼도 동작은 하나 "landmark/heading 목록" 기반 내비게이션 호환성이 떨어지므로 dev warn:
```ts
if (as === "div" && process.env.NODE_ENV !== "production") {
  console.warn("[Accordion.Header] as='div' disables heading-based screen reader nav; prefer h2~h6");
}
```

### 15.3 키보드

APG 권고 그대로:
- Enter/Space: 토글.
- ArrowDown/Up: Trigger 간 이동.
- Home/End: 처음/끝.
- Tab: Trigger 를 순회.

### 15.4 포커스 가시성

`:focus-visible` 로 2 px inset box-shadow. ring 색상은 palette focusRing.

### 15.5 스크린리더 테스트

- macOS VoiceOver: "Overview, collapsed, button" / "Overview, expanded, button".
- NVDA(Windows): 동일.
- Content open 후 VoiceOver 가 region 으로 읽고 aria-labelledby 로 "Overview region" 명시.

### 15.6 reduced-motion

시스템 설정 + CSS media query 로 transition 제거. JS 로직도 animation end 대기하지 않음.

---

## 16. 알려진 트레이드오프 · 결정

1. **div 기반 vs native `<details>/<summary>`**: native 는 no-JS 에서도 작동하고 ARIA 자동이지만, single mode 상호배제, Arrow 내비게이션, 세밀한 애니메이션 제어, nested 시 Root 스코프 분리 모두 수동 JS 가 필요. 어차피 JS 필요하면 일관된 div 스택이 유리. Radix/HeadlessUI/MUI 전례와 일치.
2. **`max-height` 측정 vs `::details-content` + `interpolate-size`**: 후자는 CSS-only 우아함이 매력이나 2026-04 기준 Safari 지원은 tech-preview. 본 plan 은 cross-browser 안정성과 `prefers-reduced-motion` 제어, 이미지 지연 로드 성장 스킵 등 세밀한 정책을 위해 측정 방식을 유지. Safari 17+ 지원이 baseline 확산되면 v2 에서 switch. 두 방식 모두 overflow:hidden 기반이라 focus-ring 짤림 같은 제약은 동일.
3. **`max-height` vs `height` 직접 전환**: `max-height` 는 "content 보다 크게 설정해도 무해" 해서 측정 실패 시 graceful fallback (큰 값) 이 되지만, transition 이 실제 content height 까지만 보이게 보간되어 시각이 정확. height 는 auto 보간이 안 됨(§5.1). 측정값 주입 시 `max-height: var(--h)` vs `height: var(--h)` 둘 다 동작하나, max-height 이 더 permissive.
4. **Set 내부 표현**: `string[]` 그대로 써도 되지만 중복/순서 고려 시 Set 이 reducer 를 단순화. 공개 API 는 배열/문자열 유지.
5. **`collapsible` 이 single 전용**: discriminated union 으로 `multiple` + `collapsible` 를 타입 레벨에서 차단 (collapsible?: never). 의미 혼동 방지.
6. **controlled + defaultValue 동시**: useControllable 의 contract 에 따라 controlled 이면 defaultValue 무시 (dev warn 없음 — 조용히). Radix 와 동일.
7. **Arrow 내비게이션의 Root 경계**: nested 의 안쪽 Accordion 에서 Arrow 누르면 가장 가까운 Root 기준. 구현: Trigger 의 onKeyDown 에서 `useAccordionRootContext` 로 가장 가까운 Root 의 focusTrigger 호출. 바깥으로 누출 안 됨.
8. **disabled Item 의 open 유지**: 이미 열린 Item 이 runtime 에 disabled 로 바뀌면? "열린 상태 유지, Trigger 만 무효" 로 결정(정보 소실 방지). Radix 도 동일.
9. **forceMount**: 닫혀 있어도 DOM 유지. SEO/anchor scroll/내부 state 보존 등 용도. 대신 hidden=true 여서 인쇄에도 기본 제외.
10. **heading level 기본 h3**: 본 라이브러리의 사용 맥락(페이지 내 sub-section) 에서 h3 이 흔함. 사용자가 `as="h2"`/`"h4"` 로 조정.
11. **chevronRotation=180 의 의미**: 일부 디자인(특히 "+ → ×" 같은 플러스 아이콘 회전)은 180° 선호. 기본 90° 는 `▸→▾`, 180° 는 `＋→＋(회전)` 같은 컨텍스트에 적합.
12. **`Accordion.from(items)` 헬퍼 미포함**: 데이터 중심 팀은 맵을 직접 쓰는 것으로 충분(`items.map(it => <Accordion.Item …>)`). 헬퍼는 API 표면만 늘린다.

---

## 17. 후속 작업 (v1.1+)

- **horizontal Accordion**: `orientation="horizontal"` — 좌우 collapse. keyboard ArrowLeft/Right, chevron 회전 축 변경. layout 이 flex row 로 바뀌므로 재설계 범위.
- **DnD 재정렬**: `dnd-kit` 또는 자체 pointer drag 로 Item 순서 교체. Accordion open 상태 유지 + value 배열 재정렬 콜백 (`onOrderChange`).
- **sticky 헤더**: open 된 Item 이 viewport 를 넘치면 해당 Header 를 상단 sticky. `position: sticky; top: 0;` + z-index 조정. scrollable 부모와의 인터랙션 주의.
- **인디케이터 render prop**: `<Accordion.Trigger renderIndicator={(open) => …}>` 로 chevron 을 완전 custom. 현재는 `hideChevron` + 사용자 children 직접 배치로 우회 가능하나 selector API 가 깔끔.
- **`Accordion.from(items)`**: declarative 맵핑 헬퍼.
- **lazy Content**: `lazy` prop — 최초 open 시에만 children 렌더. SSR/코드분할 친화.
- **animation preset prop**: `animation={{ duration: 150, easing: "ease-in-out" }}` — CSS var 대안 API.
- **`::details-content` 마이그레이션** (v2): baseline 안정 시 native 전환 실험.
- **다른 plastic 컴포넌트 내부 활용**: DataTable 의 group header, PipelineGraphInspector 의 섹션 분리 — Accordion 으로 통합.
- **SSR 초기 open 높이 추정**: Content 가 텍스트 중심이면 char count 기반 대략값을 주입해 first paint flicker 완화. v1.2.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| useControllable (dual API) | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| 선행 expand/collapse 로직 (chevron + 높이 전환 패턴) | `/Users/neo/workspace/plastic/src/components/PipelineGraph/PipelineGraphCluster.tsx` |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 데모 페이지 레이아웃 템플릿 (최근 기준) | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |
| 이전 plan 포맷 참고 (템플릿) | `/Users/neo/workspace/plastic/docs/plans/017-splitpane-component.md` |

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18.3 (기존) + DOM API (`ResizeObserver`, `matchMedia`, `requestAnimationFrame`, `useId`) 만 사용.

번들 영향:
- Accordion 자체 예상 크기: ~2.8 KB (min), ~1.2 KB (min+gzip).
- plastic 전체 dist 거의 영향 없음.

Browser 지원:
- ResizeObserver: Chrome 64+, Firefox 69+, Safari 13.1+.
- `matchMedia`: 전 브라우저.
- `useId` (React 18): 이미 사용 중.
- CSS `transition`/`transform`: 전 브라우저.
- `prefers-reduced-motion`: Safari 10.1+, Chrome 74+, Firefox 63+.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/accordion` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] CommandPalette / PipelineGraph / DataTable / Dialog / Popover / Tooltip / Toast / 기타 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./Accordion";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 의존 없음).
- [ ] Props 문서 섹션에 Root/Item/Header/Trigger/Content 다섯 개 표 채움.
- [ ] Usage 섹션에 최소 4 개 스니펫 (basic single / multiple / nested / custom trigger + dark).
- [ ] 데모 Playground 에서 모든 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드 단독으로 (마우스 없이) Trigger 순회 + 토글 가능.
- [ ] `prefers-reduced-motion: reduce` 시 transition 없이 즉시 open/close.
- [ ] Nested Accordion 의 안쪽 Arrow 가 바깥 Root 로 누출되지 않음.
- [ ] discriminated union (`type="single"` 에만 `collapsible` 허용) 이 타입 수준에서 검증됨.
- [ ] 스크린리더(VoiceOver) 에서 Trigger 의 expanded/collapsed 상태가 읽히고 Content 가 region 으로 안내됨.

---

**끝.**
