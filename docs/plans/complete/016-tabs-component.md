# Tabs 컴포넌트 설계문서

## Context

plastic 라이브러리에 "여러 개의 화면/섹션을 탭으로 전환하는 내비게이션 프리미티브" `Tabs` 를 추가한다. 역할 비유: VSCode 의 에디터 탭 바, Chrome 의 탭 UI, IntelliJ Tool Window 의 상단 탭, DevTools 의 Elements/Console/Network 전환. 이 컴포넌트는 IDE 스타일 UI 의 기본 조립 블록이며, plastic 상위에서 `PipelineGraphInspector` 가 이미 자체적으로 Logs/Timing/Error 탭 UI 를 임시 구현하고 있다 — 이 구현을 추출·일반화하여 재사용 가능한 공용 컴포넌트로 승격하는 것이 목적이다.

참고 (prior art — UX 근거):
- **Radix UI `Tabs`** — compound API (`Root`/`List`/`Trigger`/`Content`), activation mode("automatic" | "manual"), controlled/uncontrolled 이중 API, 완전한 ARIA. 본 설계의 가장 가까운 모델.
- **Headless UI `<Tab.Group>`** — render-props 기반, index 기반 selection. plastic 은 "key 기반 value" 로 다르게 가되 keyboard/ARIA 는 유사 규약.
- **Ant Design `Tabs`** — `items` prop 선언형, closable ×, overflow scroll(⟨ ⟩ 버튼), lazy-mount(`destroyInactiveTabPane`), centered/card/editable 여러 type. plastic v1 은 closable + overflow scroll + lazy-mount 만 채택.
- **VSCode 에디터 탭 바** — active 탭 아래 2 px indicator, close ×, overflow 시 arrow scroll, drag reorder (plastic 은 reorder 를 v1.1 로 연기).
- **Chrome 탭 바** — title + favicon + ×, overflow compression. plastic 은 title + icon + × 를 지원하되 compression 대신 scroll.
- **Material UI `Tabs`** — `variant="scrollable"` 모드 시 양 끝 arrow 버튼, underline indicator transition. plastic 의 indicator transition 직접 벤치마크.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/PipelineGraph/PipelineGraphInspector.tsx` — 이미 Logs/Timing/Error 탭 UI 를 자체 구현 중 (내부 `tab` state + `button` 3개). plastic `Tabs` 로 교체할 수 있는 **추출 대상**. 후속 PR 로 분리 (§17).
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅. `value` / `defaultValue` / `onValueChange` 에 그대로 적용.
- `src/components/index.ts` — 배럴에 한 줄 추가.
- `demo/src/App.tsx` — 데모 NAV 추가 대상. 사이드바 + 본문 라우팅 패턴.
- `demo/src/pages/CommandPalettePage.tsx` — 데모 페이지 레이아웃 · Props 표 · Usage · Playground 섹션 구조 레퍼런스.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
<Tabs.Root
  defaultValue="logs"                 // uncontrolled 초기값
  orientation="horizontal"            // "horizontal" | "vertical"
  activationMode="automatic"          // "automatic" (default) | "manual"
  theme="light"
  onValueChange={(v) => console.log(v)}
>
  <Tabs.List aria-label="Inspector tabs">
    <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
    <Tabs.Trigger value="timing">Timing</Tabs.Trigger>
    <Tabs.Trigger value="error" disabled>Error</Tabs.Trigger>
    <Tabs.Trigger value="draft" closable onClose={(v) => remove(v)}>Draft</Tabs.Trigger>
  </Tabs.List>

  <Tabs.Content value="logs"><LogsPanel /></Tabs.Content>
  <Tabs.Content value="timing" forceMount={false}><TimingPanel /></Tabs.Content>
  <Tabs.Content value="error"><ErrorPanel /></Tabs.Content>
  <Tabs.Content value="draft"><DraftPanel /></Tabs.Content>
</Tabs.Root>
```

렌더 결과 (개념, horizontal):
```
┌──────────────────────────────────────────────────────────────┐
│ ⟨  [Logs]  Timing   Error(d)   Draft ×   + more...         ⟩ │   ← Tabs.List (scrollable + overflow arrows)
│ ────────                                                     │   ← active indicator (2px, transition)
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                   <Tabs.Content value="logs">                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

렌더 결과 (개념, vertical):
```
┌──────────┬──────────────────────────────────┐
│ ▸ Logs   │                                  │
││ Timing  │     Content of active tab        │
│  Error   │                                  │
│  Draft × │                                  │
│    ⋮     │                                  │
└──────────┴──────────────────────────────────┘
   ↑
 indicator (left border 2px on active)
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Root`/`List`/`Trigger`/`Content` 4 계층. Context 를 통해 value 상태 + orientation + activation mode 공유.
- **value 는 string 고정**(v1). index 기반이 아닌 key 기반 — Radix 규약. 동적 추가/제거에도 안정적 매칭.
- **controlled/uncontrolled 이중 API**. `value`/`defaultValue`/`onValueChange`. `useControllable` 훅 그대로 사용.
- **activation mode**: `automatic` 은 화살표로 이동하면 즉시 해당 탭 activate(= content 전환). `manual` 은 화살표로 focus 만 이동하고 Enter/Space 로 activate. WAI-ARIA tab pattern 따름.
- **overflow scroll**: 탭 수가 List 폭을 초과하면 양 끝 `⟨ ⟩` arrow 버튼이 자동 노출. 클릭 시 scrollBy, active 탭이 viewport 밖일 때 `scrollIntoView({ inline: "nearest" })` 자동 호출.
- **closable `×`**: 개별 Trigger 에 `closable` + `onClose(value)` prop. plastic 은 close 후의 상태(다음 active, 리스트에서 제거) 는 **owner(app) 가 결정** — controlled 패턴으로 일관.
- **lazy-mount**: 기본은 active 탭의 Content 만 렌더. `forceMount` 지정 시 항상 렌더 (iframe/비싼 컨텐츠 캐시 목적).
- **animated indicator**: active 탭 아래(또는 좌측)의 2 px 라인이 transform 으로 부드럽게 이동. `requestAnimationFrame` + trigger 의 `offsetLeft/offsetWidth` 측정.
- **런타임 의존 zero**. DOM + React 만. ResizeObserver / pointer / keyboard 는 web standard.
- **접근성 · 키보드 우선**. `role="tablist"`/`"tab"`/`"tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, roving tabindex (-1 for inactive).
- **v1 은 reorder 제외**. drag reorder / 새 창 drag-out / 컨텍스트 메뉴 는 v1.1 이후 (§17).

---

## 1. Goals / Non-goals

### Goals (v1)
1. 수평/수직 오리엔테이션(`orientation`: `"horizontal"` | `"vertical"`).
2. automatic / manual activation mode (WAI-ARIA tab pattern 준수).
3. controlled/uncontrolled 이중 API: `value`/`defaultValue`/`onValueChange`.
4. closable `×` 버튼 (선택적, per-Trigger). `onClose(value)` 콜백.
5. overflow scroll: 탭이 List 폭을 초과하면 양 끝 `⟨ ⟩` 버튼 노출. active 탭 자동 스크롤 in-view.
6. lazy-mount: 기본은 active 만, `forceMount` 로 항상 렌더 선택 가능.
7. animated indicator: active 탭 아래(horizontal) 또는 좌측(vertical) 2 px 인디케이터의 transform 기반 transition (200 ms).
8. 키보드 내비게이션: Arrow(automatic 자동 activate / manual 은 focus 만), Home / End, Enter / Space (manual activate), Delete (closable 일 때 close).
9. disabled 탭: 선택 불가, focus skip.
10. Light / Dark 테마.
11. RTL 대응: horizontal 에서 ArrowLeft/ArrowRight 의미 반전.
12. ARIA 완전 지원: `role=tablist/tab/tabpanel`, `aria-selected`, `aria-orientation`, `aria-controls`, `aria-labelledby`, `tabindex` roving.

### Non-goals (v1 제외)
- **drag reorder**: 탭을 드래그해 순서 변경. v1.1.
- **drag-out to new window** (Chrome 식): v1.2+.
- **컨텍스트 메뉴** (우클릭 "close others / close right / pin ..."): v1.1.
- **pin tab**: 고정 탭. v1.1.
- **dirty indicator (●)**: 저장 안 됨 표시 점. 사용자가 Trigger children 에 직접 그려 넣을 수 있으므로 v1 은 API 제공 안 함. v1.2 에서 `dirty?: boolean` 고려.
- **compression overflow** (탭이 좁아지며 글자 줄이기): v1 은 스크롤 방식. compression 은 v1.2.
- **`type="card"` / `type="editable-card"`** (Ant Design 스타일): 시각 variant. v1 은 기본 underline 만. CSS 커스터마이즈로 대부분 커버 가능.
- **add-new-tab (+) 버튼**: 사용자가 List 바깥에 자유롭게 배치하거나, 특별 Trigger 로 두어도 됨. v1 은 전용 API 제공 안 함.
- **async Content (Suspense wrapper)**: 사용자가 Content 내부에서 직접 Suspense 를 두면 됨. v1 은 Tabs 자체의 suspense API 없음.
- **animation variant**: 현재는 indicator transition 만. Content 전환(fade/slide)은 v1.2.
- **nested Tabs**: 사용자는 Content 안에 또다른 Tabs.Root 를 자유롭게 중첩 가능. 추가 API 없음.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Tabs/Tabs.types.ts`

```ts
export type TabsTheme = "light" | "dark";
export type TabsOrientation = "horizontal" | "vertical";
export type TabsActivationMode = "automatic" | "manual";

export interface TabsRootProps {
  /** 초기 value (uncontrolled). */
  defaultValue?: string;
  /** 제어 value. 지정 시 controlled. */
  value?: string;
  /** value 변경 콜백. */
  onValueChange?: (value: string) => void;

  /** 오리엔테이션. 기본 "horizontal". */
  orientation?: TabsOrientation;
  /** 활성화 모드. 기본 "automatic". */
  activationMode?: TabsActivationMode;

  /** 라이트/다크. 기본 "light". */
  theme?: TabsTheme;

  /** 비활성(전체). 기본 false. */
  disabled?: boolean;

  /** 루트 요소의 id. 내부 ARIA id 생성의 접두사로 사용. 미지정 시 useId. */
  id?: string;

  /** 추가 className / style (root). */
  className?: string;
  style?: React.CSSProperties;

  /** 자식: List, Content... */
  children: React.ReactNode;
}

export interface TabsListProps {
  /** 접근성 라벨. 스크린리더용. */
  "aria-label"?: string;
  /** 다른 요소로부터 라벨을 참조 (`aria-label` 대신 사용 가능). */
  "aria-labelledby"?: string;

  /** 오버플로우 시 좌우 scroll 버튼 노출 여부. 기본 true. */
  scrollable?: boolean;

  /** 추가 className / style */
  className?: string;
  style?: React.CSSProperties;

  /** 자식: Trigger 들 */
  children: React.ReactNode;
}

export interface TabsTriggerProps {
  /** 식별자 (Content 와 매칭). 필수. */
  value: string;

  /** 해당 탭 비활성. 기본 false. */
  disabled?: boolean;

  /** × 닫기 버튼 노출. 기본 false. */
  closable?: boolean;
  /** × 클릭/Delete 키 입력 시 호출. closable=true 인 경우 필수. */
  onClose?: (value: string) => void;

  /** 앞쪽 아이콘 슬롯. */
  icon?: React.ReactNode;

  /** 추가 className / style */
  className?: string;
  style?: React.CSSProperties;

  /** 트리거 라벨 */
  children: React.ReactNode;
}

export interface TabsContentProps {
  /** 매칭 value. 필수. */
  value: string;

  /**
   * true 로 지정하면 inactive 일 때도 DOM 에 계속 렌더.
   * (iframe/무거운 컨텐츠 캐시 목적.) 기본 false.
   * inactive 일 때는 `hidden` 속성 + aria-hidden="true" 로 접근성 차단.
   */
  forceMount?: boolean;

  /** 추가 className / style */
  className?: string;
  style?: React.CSSProperties;

  /** 컨텐츠 */
  children: React.ReactNode;
}
```

### 2.2 배럴

```ts
// src/components/Tabs/index.ts
export { Tabs } from "./Tabs";
export type {
  TabsRootProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
  TabsTheme,
  TabsOrientation,
  TabsActivationMode,
} from "./Tabs.types";
```

그리고 `src/components/index.ts` 에 `export * from "./Tabs";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// Tabs.tsx
export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};
```

사용자는 `<Tabs.Root>…</Tabs.Root>`, `<Tabs.List>`, `<Tabs.Trigger>`, `<Tabs.Content>` 형태로 접근. `displayName` 은 각각 `"Tabs.Root"`, `"Tabs.List"`, `"Tabs.Trigger"`, `"Tabs.Content"`.

---

## 3. 도메인 모델

### 3.1 value ↔ tab id 매핑

- 사용자가 제공하는 식별자는 **`value: string`** 단일 키.
- 내부 ARIA id 는 root 의 `id`(또는 `useId()`) 를 접두사로, 각 trigger/content 가 `-trigger-${value}` / `-content-${value}` 접미어를 붙여 생성:
  - trigger element id = `${rootId}-trigger-${value}`
  - content element id = `${rootId}-content-${value}`
- 이로써 `aria-controls` / `aria-labelledby` 를 양방향으로 연결 가능:
  - trigger: `aria-controls="{contentId}"`
  - content: `aria-labelledby="{triggerId}"`
- `value` 는 **DOM id-safe 해야 함** (공백/특수문자 회피 권장). 검증은 dev warn 만 하고 강제하지 않음.
- 중복 `value` 는 dev warn + 마지막 것만 유효 (React key 경고도 동시 발생).

### 3.2 등록(registry) 패턴

여러 Trigger 가 동일 Root 하위에 존재하며, 키보드 내비게이션 시 "등록 순서" 로 이웃 탭을 찾아야 한다. 접근 방법 비교:

1. **React.Children.map(children) 로 Root 가 직접 순회**:
   Root 가 Trigger 들을 직접 알고 있어야 하는데, `<Tabs.List>` 가 사이에 끼어 있어 단순한 `Children.map` 으로는 Trigger 를 찾기 어렵다. `React.Children.toArray(root.children).find(List)` → `React.Children.toArray(list.children).filter(Trigger)` 식의 재귀가 필요하며, 사용자가 List 를 감싸는 div 를 끼워 넣으면 깨진다. **기각**.

2. **Context + imperative register**:
   Trigger 가 mount 시 Context 의 `register(value, el, disabled)` 를 호출하고, unmount 시 `unregister(value)`. Root 가 등록된 탭의 `value` 순서 배열을 유지. 등록 순서는 **mount 순서** — React 는 DOM 순서대로 effect 가 실행되므로 자연스럽게 DOM 순서와 일치.

v1 은 **패턴 2** 채택. Radix 와 동일 전략.

```ts
interface RegisteredTab {
  value: string;
  element: HTMLElement;
  disabled: boolean;
  closable: boolean;
}

interface TabsContextValue {
  rootId: string;
  value: string | null;
  setValue: (v: string) => void;
  orientation: TabsOrientation;
  activationMode: TabsActivationMode;
  theme: TabsTheme;
  disabled: boolean;
  rtl: boolean;

  register: (tab: RegisteredTab) => () => void;
  getTabs: () => RegisteredTab[];
  onTriggerKeyDown: (e: React.KeyboardEvent, value: string) => void;
  onClose?: (value: string) => void;
}
```

`getTabs()` 는 register 된 탭들을 **DOM 순서** 로 정렬해 반환. DOM 순서 정렬은:
```ts
function getTabs(): RegisteredTab[] {
  const list = Array.from(registeredRef.current.values());
  list.sort((a, b) => {
    const pos = a.element.compareDocumentPosition(b.element);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
  return list;
}
```

### 3.3 controlled / uncontrolled

`useControllable<string | null>(value, defaultValue ?? null, onValueChange)` 그대로. 단 초기에 `defaultValue` 가 없고 `value` 도 없는 경우(모두 undefined): **첫 번째로 register 된 non-disabled Trigger 의 value** 를 초기값으로 설정 (Radix 동일). 이를 위해 내부적으로 `internalValue === null` 상태일 때 register 콜백에서 첫 호출만 `setValue(tab.value)` 호출.

### 3.4 inactive → active 전환 시 focus 이동

키보드로 activate(automatic 은 Arrow, manual 은 Enter/Space) 했을 때는 **새 activate 된 trigger 에 focus 이동**. 마우스 클릭으로 activate 한 경우는 사용자 의도가 불명확하므로 focus 는 클릭된 요소(click 자동 focus)에 남겨 둠.

---

## 4. 시각 / 구조 설계

### 4.1 DOM 구조 (horizontal 기준)

```
<div class="tabs-root" data-orientation="horizontal" data-theme="light">
  <div class="tabs-list-wrap">
    <button class="tabs-scroll-btn tabs-scroll-btn--start" aria-label="Scroll tabs left" hidden={!canScrollStart}>⟨</button>

    <div role="tablist"
         class="tabs-list"
         aria-orientation="horizontal"
         aria-label="{aria-label}"
         style="overflow-x:auto; scroll-behavior:smooth">

      <button role="tab"
              id="{rootId}-trigger-logs"
              aria-selected="true"
              aria-controls="{rootId}-content-logs"
              tabindex="0"
              data-state="active"
              data-disabled="false"
              class="tabs-trigger">
        <span class="tabs-trigger-icon">📜</span>
        <span class="tabs-trigger-label">Logs</span>
        {/* no close button: closable=false */}
      </button>

      <button role="tab"
              id="{rootId}-trigger-draft"
              aria-selected="false"
              aria-controls="{rootId}-content-draft"
              tabindex="-1"
              data-state="inactive"
              class="tabs-trigger">
        <span class="tabs-trigger-label">Draft</span>
        <span role="button"
              aria-label="Close Draft"
              tabindex="-1"
              class="tabs-trigger-close"
              onClick={(e) => { e.stopPropagation(); onClose("draft"); }}>
          ×
        </span>
      </button>

      <div class="tabs-indicator"
           style="transform: translateX({offsetLeft}px); width: {offsetWidth}px" />
    </div>

    <button class="tabs-scroll-btn tabs-scroll-btn--end" aria-label="Scroll tabs right" hidden={!canScrollEnd}>⟩</button>
  </div>

  <div role="tabpanel"
       id="{rootId}-content-logs"
       aria-labelledby="{rootId}-trigger-logs"
       tabindex="0"
       data-state="active"
       class="tabs-content">
    {children}
  </div>
  <div role="tabpanel"
       id="{rootId}-content-draft"
       aria-labelledby="{rootId}-trigger-draft"
       tabindex="0"
       data-state="inactive"
       hidden
       class="tabs-content">
    {children /* forceMount 면 항상 렌더, 아니면 unmount */}
  </div>
</div>
```

vertical 은:
- `data-orientation="vertical"`, `aria-orientation="vertical"`
- List 레이아웃이 `flex-direction: column`.
- 인디케이터가 left border(transform: translateY). scroll 은 `overflow-y:auto` + 상/하 arrow 버튼.
- Content 는 List 옆(flex row)에 위치 — 단, DOM 순서는 여전히 List 다음에 Content. 시각 배치는 `display:flex` + CSS 로 해결.

### 4.2 flex-based list layout

```css
.tabs-list-wrap {
  position: relative;
  display: flex;
  align-items: stretch;
}
.tabs-list {
  display: flex;
  flex: 1 1 0;
  overflow-x: auto;
  scrollbar-width: none;       /* Firefox */
  scroll-behavior: smooth;
  position: relative;          /* indicator absolute 기준 */
}
.tabs-list::-webkit-scrollbar { display: none; }
```

스크롤바 숨김 이유: 탭 바는 일반 스크롤 영역이 아니므로 스크롤바 표시가 시각 노이즈. arrow 버튼으로 대체. 키보드(Arrow) 로도 스크롤 대체 가능.

vertical 은 `.tabs-list { flex-direction: column; overflow-y: auto; overflow-x: hidden; }` + `.tabs-list-wrap { flex-direction: column }`.

### 4.3 trigger 스타일

```css
.tabs-trigger {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 8px 12px;
  font: inherit;
  color: var(--tabs-trigger-fg);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  position: relative;
  user-select: none;
  border-radius: 0;
  transition: color 120ms, background 120ms;
}
.tabs-trigger:hover:not([data-disabled="true"]) {
  color: var(--tabs-trigger-hover-fg);
  background: var(--tabs-trigger-hover-bg);
}
.tabs-trigger[data-state="active"] {
  color: var(--tabs-trigger-active-fg);
}
.tabs-trigger[data-disabled="true"] {
  opacity: 0.4;
  cursor: not-allowed;
}
.tabs-trigger:focus-visible {
  outline: 2px solid var(--tabs-focus-ring);
  outline-offset: -2px;
}
.tabs-trigger-close {
  width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 120ms, background 120ms;
  cursor: pointer;
}
.tabs-trigger:hover .tabs-trigger-close,
.tabs-trigger[data-state="active"] .tabs-trigger-close,
.tabs-trigger-close:focus-visible {
  opacity: 1;
}
.tabs-trigger-close:hover {
  background: var(--tabs-close-hover-bg);
}
```

### 4.4 active indicator

horizontal:
```css
.tabs-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: var(--tabs-indicator-bg);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              width 200ms cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  will-change: transform, width;
}
```

vertical:
```css
.tabs-root[data-orientation="vertical"] .tabs-indicator {
  top: 0; left: 0;
  width: 2px; height: 0;
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
              height 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

JS 로 active trigger 의 `offsetLeft/offsetWidth`(또는 `offsetTop/offsetHeight`) 를 측정해 CSS 변수 또는 inline style 로 주입:

```ts
useLayoutEffect(() => {
  if (!value) return;
  const tab = getTabs().find(t => t.value === value);
  if (!tab) return;
  const el = tab.element;
  if (orientation === "horizontal") {
    indicatorRef.current!.style.transform = `translateX(${el.offsetLeft}px)`;
    indicatorRef.current!.style.width     = `${el.offsetWidth}px`;
  } else {
    indicatorRef.current!.style.transform = `translateY(${el.offsetTop}px)`;
    indicatorRef.current!.style.height    = `${el.offsetHeight}px`;
  }
}, [value, orientation, containerPx /* List size observer */]);
```

첫 마운트에서는 `transition` 을 잠시 제거(`data-first="true"` → 다음 frame 에 제거)해서 불필요한 애니메이션을 방지.

### 4.5 palette 토큰

```ts
// Tabs/theme.ts
export const tabsPalette = {
  light: {
    rootBg:              "transparent",
    listBorder:          "rgba(0,0,0,0.08)",
    triggerFg:           "#6b7280",
    triggerHoverFg:      "#111827",
    triggerHoverBg:      "rgba(0,0,0,0.03)",
    triggerActiveFg:     "#2563eb",
    indicatorBg:         "#2563eb",
    closeHoverBg:        "rgba(0,0,0,0.08)",
    scrollBtnFg:         "#6b7280",
    scrollBtnHoverBg:    "rgba(0,0,0,0.05)",
    focusRing:           "#2563eb",
    disabledFg:          "rgba(0,0,0,0.35)",
  },
  dark: {
    rootBg:              "transparent",
    listBorder:          "rgba(255,255,255,0.08)",
    triggerFg:           "#9ca3af",
    triggerHoverFg:      "#f3f4f6",
    triggerHoverBg:      "rgba(255,255,255,0.04)",
    triggerActiveFg:     "#60a5fa",
    indicatorBg:         "#60a5fa",
    closeHoverBg:        "rgba(255,255,255,0.1)",
    scrollBtnFg:         "#9ca3af",
    scrollBtnHoverBg:    "rgba(255,255,255,0.06)",
    focusRing:           "#60a5fa",
    disabledFg:          "rgba(255,255,255,0.3)",
  },
} as const;
```

`data-theme` attribute 로 root 에 부착하고 CSS 변수로 전파:

```css
.tabs-root[data-theme="light"] {
  --tabs-trigger-fg:        #6b7280;
  --tabs-trigger-hover-fg:  #111827;
  --tabs-trigger-hover-bg:  rgba(0,0,0,0.03);
  --tabs-trigger-active-fg: #2563eb;
  --tabs-indicator-bg:      #2563eb;
  --tabs-close-hover-bg:    rgba(0,0,0,0.08);
  --tabs-scroll-btn-fg:     #6b7280;
  --tabs-scroll-btn-bg:     rgba(0,0,0,0.05);
  --tabs-focus-ring:        #2563eb;
  --tabs-list-border:       rgba(0,0,0,0.08);
}
.tabs-root[data-theme="dark"] {
  --tabs-trigger-fg:        #9ca3af;
  /* ... */
}
```

### 4.6 List 하단 border

horizontal: List 아래에 1 px 하단 border, indicator 는 이 border 위에 겹치게 (z-index > 0). vertical: List 우측에 1 px 우측 border.

```css
.tabs-list::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 1px;
  background: var(--tabs-list-border);
  pointer-events: none;
}
.tabs-root[data-orientation="vertical"] .tabs-list::after {
  left: auto; right: 0; top: 0; bottom: 0;
  width: 1px; height: auto;
}
```

### 4.7 RTL

horizontal + `dir="rtl"` 일 때 List 는 브라우저가 자동으로 flex-direction 반전. indicator 의 `offsetLeft` 는 RTL 에서도 "왼쪽부터의 거리" 를 돌려주므로 그대로 사용 가능. 다만 스크롤 `scrollLeft` 의 부호가 브라우저마다 다르므로 (`scrollLeft < 0` on Firefox RTL), `element.scrollBy({ left })` 에서 `rtl ? -delta : delta` 로 조정.

키보드 Arrow 의미: RTL 에서 ArrowLeft = "다음" / ArrowRight = "이전" 으로 반전 (§7).

---

## 5. 핵심 로직

### 5.1 activation mode

**automatic**: Trigger 가 focus 를 받는 순간 (= 화살표 키 이동, 클릭, 프로그램적 focus) 해당 탭이 즉시 activate.

**manual**: 화살표 키는 focus 만 이동시키고, Enter/Space 로 activate. 클릭은 여전히 즉시 activate (click = intent).

```ts
function onTriggerKeyDown(e: React.KeyboardEvent, triggerValue: string) {
  const tabs = getTabs().filter(t => !t.disabled);
  const idx = tabs.findIndex(t => t.value === triggerValue);
  if (idx < 0) return;

  const isNext =
    orientation === "horizontal"
      ? (e.key === "ArrowRight") !== rtl
      : e.key === "ArrowDown";
  const isPrev =
    orientation === "horizontal"
      ? (e.key === "ArrowLeft") !== rtl
      : e.key === "ArrowUp";

  if (isNext || isPrev) {
    e.preventDefault();
    const nextIdx = isNext
      ? (idx + 1) % tabs.length
      : (idx - 1 + tabs.length) % tabs.length;
    const next = tabs[nextIdx]!;
    next.element.focus();
    if (activationMode === "automatic") setValue(next.value);
    return;
  }

  if (e.key === "Home") {
    e.preventDefault();
    const first = tabs[0];
    if (first) {
      first.element.focus();
      if (activationMode === "automatic") setValue(first.value);
    }
    return;
  }
  if (e.key === "End") {
    e.preventDefault();
    const last = tabs[tabs.length - 1];
    if (last) {
      last.element.focus();
      if (activationMode === "automatic") setValue(last.value);
    }
    return;
  }
  if (activationMode === "manual" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    setValue(triggerValue);
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    // closable 인 경우에만 onClose
    const tab = tabs.find(t => t.value === triggerValue);
    if (tab?.closable) {
      e.preventDefault();
      // root 의 onClose prop 또는 Trigger 개별 onClose 호출
      // (per-trigger onClose 가 우선)
      closeTab(triggerValue);
    }
    return;
  }
}
```

### 5.2 overflow scroll

List 폭(`scrollWidth`) 이 자신의 clientWidth 를 초과하면 좌/우 arrow 버튼 노출.

```ts
const [canScrollStart, setCanScrollStart] = useState(false);
const [canScrollEnd, setCanScrollEnd] = useState(false);

useEffect(() => {
  const el = listRef.current;
  if (!el) return;
  const update = () => {
    const axis = orientation === "horizontal" ? "scrollLeft" : "scrollTop";
    const maxAxis = orientation === "horizontal"
      ? el.scrollWidth - el.clientWidth
      : el.scrollHeight - el.clientHeight;
    const s = Math.abs(el[axis]);   // RTL 음수 대응
    setCanScrollStart(s > 1);
    setCanScrollEnd(s < maxAxis - 1);
  };
  update();
  el.addEventListener("scroll", update, { passive: true });
  const ro = new ResizeObserver(update);
  ro.observe(el);
  // children 변경(add/remove)도 감지
  const mo = new MutationObserver(update);
  mo.observe(el, { childList: true });
  return () => {
    el.removeEventListener("scroll", update);
    ro.disconnect();
    mo.disconnect();
  };
}, [orientation]);
```

arrow 버튼 클릭:
```ts
function scrollBy(dir: 1 | -1) {
  const el = listRef.current!;
  const step = (orientation === "horizontal" ? el.clientWidth : el.clientHeight) * 0.8;
  const signed = (orientation === "horizontal" && rtl) ? -dir * step : dir * step;
  if (orientation === "horizontal") el.scrollBy({ left: signed, behavior: "smooth" });
  else                              el.scrollBy({ top:  dir * step, behavior: "smooth" });
}
```

active 탭이 viewport 밖이면 자동 스크롤:
```ts
useEffect(() => {
  if (!value) return;
  const tab = getTabs().find(t => t.value === value);
  if (!tab) return;
  tab.element.scrollIntoView({
    behavior: "smooth",
    inline: "nearest",
    block: "nearest",
  });
}, [value]);
```

### 5.3 closable × 버튼 이벤트 처리

`×` 클릭은 **Trigger 의 `onClick` 버블을 막아야** activate 가 일어나지 않는다:

```tsx
<button role="tab" onClick={() => setValue(value)} ...>
  {children}
  {closable && (
    <span
      role="button"
      aria-label={`Close ${children}`}
      onClick={(e) => {
        e.stopPropagation();
        onClose?.(value);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="tabs-trigger-close"
    >
      ×
    </span>
  )}
</button>
```

HTML 상 `<button>` 안에 interactive `<span role="button">` 은 공식적으론 정상이 아니지만, 실제 많은 라이브러리(Material UI, Ant)가 이 패턴을 사용. 대안은 Trigger 를 `<div>` 로 만들고 내부에 button 을 두 개 두는 것이지만, 루트 Trigger 가 `button` 이 아니면 스페이스/엔터 기본 제출이 번거로워진다. **v1 은 nested interactive 허용 (대신 inner span 은 `role="button"` + `tabindex=-1` + 키보드 Delete 로도 접근 가능).**

close 후의 상태:
- **controlled**: owner 가 list 에서 해당 value 제거 + 다음 value 로 setState. plastic 은 `onClose(value)` 만 알려주고 내부 상태 변경 없음. close 된 value 가 현재 active 였다면 owner 가 다음 value 를 선택해야 함.
- **uncontrolled**: plastic 은 list/items 를 모르므로 자동 next selection 이 어렵다. 그러나 Trigger 자체가 DOM 에서 제거되면 (등록 해제) 현재 active value 가 "존재하지 않는 상태"가 된다. v1 정책: **unmount 시 current value 가 존재하지 않으면, 이웃(다음 → 이전) 중 첫 non-disabled 탭으로 fallback**. 이 처리는 register/unregister 시점에:
  ```ts
  const unregister = (val: string) => {
    registered.current.delete(val);
    if (value === val) {
      // 다음 non-disabled 탭으로
      const tabs = getTabs().filter(t => !t.disabled);
      const next = tabs[0];
      if (next) setValue(next.value);
      else setValue(null as any /* no tabs */);
    }
  };
  ```

### 5.4 lazy-mount 컨텐츠

```tsx
function TabsContent({ value, forceMount, children, ... }: TabsContentProps) {
  const ctx = useTabsContext();
  const isActive = ctx.value === value;
  if (!isActive && !forceMount) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.rootId}-content-${value}`}
      aria-labelledby={`${ctx.rootId}-trigger-${value}`}
      tabIndex={0}
      data-state={isActive ? "active" : "inactive"}
      hidden={!isActive}
      {...(!isActive ? { "aria-hidden": true } : {})}
    >
      {children}
    </div>
  );
}
```

- `forceMount=false` (default): inactive 일 때 return null → 완전히 unmount. 무거운 컨텐츠 초기화 없음, 대신 탭 전환 때마다 재마운트(state 초기화).
- `forceMount=true`: 항상 렌더, inactive 는 `hidden` + `aria-hidden`. 브라우저 `hidden` 속성은 `display:none` 과 동등하므로 layout/paint 비용 제거. iframe, video, 스크롤 위치 유지, 복잡한 리스트 가상화 등에 유용.

### 5.5 포커스 관리 (roving tabindex)

- List 안의 Trigger 들 중 오직 **active 탭만** `tabindex=0`. 나머지는 `tabindex=-1`.
- 사용자가 Tab 으로 List 에 들어오면 active trigger 가 focus 받는다.
- Arrow 로 이동 시 focus 는 이웃 trigger 로 프로그램적 이동.
- Tab 으로 List 를 빠져나가면 active trigger 에 tabindex 가 남아 있으므로 다음 Tab 때 다시 그것이 focus.

구현은 Trigger 에서:
```tsx
const isActive = ctx.value === value;
<button
  role="tab"
  aria-selected={isActive}
  tabIndex={isActive ? 0 : -1}
  ...
>
```

단, disabled trigger 는 `aria-disabled="true"` + `tabIndex={-1}` + click handler 무시. HTML `disabled` 도 추가하여 폼 제출 차단(inside form 맥락 고려).

---

## 6. 제약

### 6.1 disabled

- **전체 비활성** (`Tabs.Root disabled`): 모든 Trigger 가 disabled 처럼 동작. 활성 탭 전환 불가, keyboard/click 모두 무시. indicator / 인디케이터 위치는 현재 value 기준 유지.
- **개별 비활성** (`Tabs.Trigger disabled`): 해당 탭만 선택 불가. 키보드 Arrow 이동 시 skip (§5.1). 클릭 무시.

### 6.2 min size / overflow

- List 의 최소 높이(horizontal) 는 trigger padding + font-size 기준으로 자연스럽게 결정. v1 은 고정값 강제 안 함.
- Trigger 최소 너비 제약 없음. 긴 라벨은 `white-space: nowrap; text-overflow: ellipsis;` 없이 그대로(자연 폭). 라벨이 매우 길면 overflow scroll 로 감당.
- 사용자가 label 자체에 `max-width` + ellipsis 를 CSS 로 줄 수 있음 (playground 예시에 포함).

### 6.3 closable 제약

- Trigger 개별 `closable=true` 이되 `onClose` 미지정 → dev warn `"closable=true requires onClose"`. × 버튼은 렌더되지만 클릭 시 no-op.
- Delete 키 close 는 해당 trigger 가 focus 인 상태에서만.

### 6.4 children 검증

- `Tabs.Root` 자식은 `Tabs.List` 1 개 + `Tabs.Content` N 개. 순서 무관(Content 가 List 앞에 와도 DOM 상 동작은 함). 그러나 관용 순서는 List, Content... → dev warn: List 가 2 개 이상 있으면 warn, Content 가 없으면 warn(탭만 있고 패널 없음).
- 잘못된 타입 자식(예: 일반 `<div>`): v1 은 런타임 검사 없이 통과(Context 가 없어 그냥 렌더). 사용자 의도이면 공간 차지 요소(구분선 등)로 허용.

---

## 7. 키보드

Trigger 가 focus 상태에서:

| 키 | 동작 (automatic) | 동작 (manual) |
|---|---|---|
| `ArrowRight` (horizontal) | 다음 trigger 로 focus + activate | focus 만 이동 |
| `ArrowLeft` (horizontal) | 이전 trigger 로 focus + activate | focus 만 이동 |
| `ArrowDown` (vertical) | 다음 trigger 로 focus + activate | focus 만 이동 |
| `ArrowUp` (vertical) | 이전 trigger 로 focus + activate | focus 만 이동 |
| `Home` | 첫 trigger 로 focus + activate | focus 만 이동 |
| `End` | 마지막 trigger 로 focus + activate | focus 만 이동 |
| `Enter` / `Space` | (no-op — 이미 automatic 이니 activate 상태) | 현재 focus trigger 를 activate |
| `Delete` / `Backspace` | closable 이면 `onClose(value)` 호출 | 동일 |
| `Tab` | List 밖으로 이동 (roving tabindex 덕) | 동일 |

RTL 이면 horizontal 에서 ArrowRight/ArrowLeft 의 "다음/이전" 의미 반전. Home/End 는 여전히 "첫 번째/마지막 tab" 의미 (논리적 순서 기준).

disabled trigger 는 keyboard 이동 시 skip (건너뛰기). "wrap around" 은 v1 에서 활성(마지막 → 다음 = 첫번째). Radix 는 default wrap. WAI-ARIA 는 wrap 가능하다고 허용.

### 7.1 focus trap 없음

List 안에서 Tab 을 누르면 List 밖으로 나간다(roving tabindex). 이는 tab pattern 의 표준 동작. List 내에서만 순환하는 focus trap 은 하지 않음.

### 7.2 Content 안의 focusable

Content 는 `tabindex=0` 이므로 Tab 순서 상 `Trigger → Content wrapper → Content 내부 요소` 순. "Tab 을 누르면 List 의 active trigger → Content 영역 자체 → Content 내부 첫 focusable" 로 자연스럽게 이동. 사용자가 Content wrapper 의 focus 를 생략하고 싶으면 `tabindex={-1}` 을 추가로 지정할 수 있지만 v1 은 default 0.

### 7.3 추가 단축키 (v1 제외)

- `Cmd+1~9` 로 N번째 탭: 브라우저 단축키 충돌. v1 제외.
- `Ctrl+Tab` / `Ctrl+Shift+Tab` (Chrome 식): 브라우저 단축키 충돌. v1 제외.

---

## 8. 상태 관리

### 8.1 Context 구성

```ts
const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs components must be used within <Tabs.Root>.");
  return ctx;
}
```

Root 에서:
```tsx
function TabsRoot(props: TabsRootProps) {
  const rootId = useId();
  const {
    defaultValue,
    value: controlledValue,
    onValueChange,
    orientation = "horizontal",
    activationMode = "automatic",
    theme = "light",
    disabled = false,
  } = props;

  const [value, setValue] = useControllable<string | null>(
    controlledValue ?? undefined,
    defaultValue ?? null,
    (v) => onValueChange?.(v as string),
  );

  const registered = useRef<Map<string, RegisteredTab>>(new Map());
  const getTabs = useCallback(() => {
    const list = Array.from(registered.current.values());
    list.sort((a, b) => {
      const pos = a.element.compareDocumentPosition(b.element);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    return list;
  }, []);

  const register = useCallback((tab: RegisteredTab) => {
    registered.current.set(tab.value, tab);
    // 첫 등록 + value 미설정 시 auto-select
    if (value == null && !tab.disabled) {
      setValue(tab.value);
    }
    return () => {
      registered.current.delete(tab.value);
      if (value === tab.value) {
        const tabs = getTabs().filter(t => !t.disabled);
        const next = tabs[0];
        setValue(next ? next.value : (null as any));
      }
    };
  }, [value, setValue, getTabs]);

  // ...
}
```

`useControllable` 은 `<T>` generic 이므로 `string | null` 로 사용. null 은 "아직 선택 없음" (초기 mount 첫 trigger 등록 직전) 의미.

### 8.2 orientation / activationMode / theme 전파

Context 에 실어 둔다. 하위 컴포넌트에서 동적 참조. Root 에서만 prop 을 받아 중복 지정 없음.

### 8.3 controlled + close 상호작용

controlled 모드에서 외부 owner 가 items 배열을 관리. close 시:
- `onClose("draft")` 콜백 호출.
- owner 는 items 에서 "draft" 제거 + 필요 시 다음 value 로 `value` prop 변경.
- plastic 은 register/unregister 로 DOM 상태를 추적하되, controlled value 가 register 안 된 value 로 설정된 경우 dev warn.

---

## 9. 고유 기능

### 9.1 closable × 버튼

- per-Trigger `closable?: boolean`. 기본 false. true 시 `×` 아이콘이 hover/active/focus-within 시 노출.
- per-Trigger `onClose?: (value) => void`. 부모가 list 조작.
- Delete / Backspace 키로도 close 가능 (해당 trigger focus 상태).

### 9.2 overflow scroll ⟨ ⟩

- `scrollable` prop (List) — 기본 true. false 면 arrow 버튼 숨김(단순 overflow hidden).
- active 탭이 viewport 밖이면 자동 `scrollIntoView`.
- arrow 버튼은 `canScrollStart` / `canScrollEnd` 가 true 일 때만 노출 (`hidden` 속성 토글).
- 클릭 시 `clientWidth * 0.8` 만큼 smooth scroll.
- 키보드 Home/End 는 arrow 버튼 없이도 처음/끝 탭 이동 + scrollIntoView 발생.
- horizontal 의 arrow 버튼 아이콘은 `⟨` / `⟩` (fallback `<` `>`), vertical 은 `▲` / `▼`.

### 9.3 lazy-mount

- default: active 가 아닌 content 는 DOM 에 없음 → first mount 시 초기화.
- `forceMount` 지정 시 mount 유지, 비활성 시 `hidden` + `aria-hidden`.
- 혼합 가능: 특정 content 만 `forceMount` (예: 복잡한 에디터 하나만 캐시).

### 9.4 animated indicator

- 첫 mount: transition 없이 바로 위치. `data-first-paint="true"` 를 한 프레임 적용 후 제거.
- value 변경 시: `offsetLeft/offsetWidth` 기반 transform/width (또는 offsetTop/offsetHeight + translateY/height) transition.
- List resize 시: ResizeObserver 로 감지해 재계산.
- orientation 전환 시: 새 축으로 재계산.
- inactive → active 바뀐 탭이 **스크롤로 인해** 현재 DOM 에서 안 보이는 경우에도 indicator 위치는 실제 offset 기준이며 `.tabs-list` 가 scroll container 이므로 indicator 도 함께 스크롤된다.

---

## 10. 파일 구조

```
src/components/Tabs/
├── Tabs.tsx                # Root/List/Trigger/Content 조립, compound namespace
├── Tabs.types.ts           # 공개 타입
├── TabsContext.ts          # Context + useTabsContext
├── useTabsIndicator.ts     # active 탭 위치 측정 → indicator style 업데이트 훅
├── useTabsScroll.ts        # overflow scroll detection, arrow visibility, scrollIntoView
├── theme.ts                # tabsPalette
└── index.ts                # 배럴
```

책임 분리:

- **Tabs.tsx**
  - `TabsRoot`: Context 생성, `useControllable`, registry(Map), rtl 감지, root DOM (`<div data-orientation data-theme>`).
  - `TabsList`: `role="tablist"`, arrow 버튼 2개(`TabsScrollButton` 내부 렌더), 인디케이터 `<div>` 렌더.
  - `TabsTrigger`: `role="tab"`, 등록(effect), 클릭/키보드 핸들러, close ×.
  - `TabsContent`: `role="tabpanel"`, lazy-mount / forceMount.
  - 네 컴포넌트를 `Tabs` 객체로 묶어 export.

- **TabsContext.ts**
  - `TabsContext`, `useTabsContext`.

- **useTabsIndicator.ts**
  - `useLayoutEffect` + ResizeObserver 로 active trigger 위치 측정.
  - indicator ref 에 style 적용.
  - 첫 paint 감지 및 transition 일시 해제.

- **useTabsScroll.ts**
  - List ref 의 scroll/resize 감지 → `canScrollStart/end` 상태.
  - `scrollBy(dir)` / `scrollIntoView(value)` 함수 반환.

- **theme.ts**
  - `tabsPalette` + CSS injector (lazy once).

- **index.ts**
  - `export { Tabs } from "./Tabs"` + 타입.

---

## 11. 구현 단계

각 단계는 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과 상태.

### Step 1 — 타입 + 배럴 + 테마 스켈레톤
1. `Tabs.types.ts` 작성(§2.1 전부).
2. `theme.ts` 작성(palette).
3. `TabsContext.ts` 작성(타입만, value 는 null).
4. `Tabs.tsx` placeholder: `export const Tabs = { Root: () => null, List: () => null, Trigger: () => null, Content: () => null };` 각 displayName 지정.
5. `index.ts` 배럴.
6. `src/components/index.ts` 에 `export * from "./Tabs";`.
7. `npm run typecheck` 통과.
8. 커밋: `feat(Tabs): 타입 + 테마 + 배럴 스켈레톤`.

### Step 2 — Root + Context + Registry
1. `TabsRoot` 실제 구현: `useControllable`, `useId`, registry Map, `register`/`getTabs`.
2. Context value 생성 및 Provider 렌더.
3. root DOM: `<div class="tabs-root" data-orientation data-theme>` + children 통과.
4. `noUncheckedIndexedAccess` 로 `tabs[0]` 반환이 `RegisteredTab | undefined` → optional chaining.
5. 커밋: `feat(Tabs): Root + Context + registry`.

### Step 3 — List + Trigger + Content 기본 렌더
1. `TabsList`: `role="tablist"`, aria-orientation, children 렌더.
2. `TabsTrigger`: mount 시 register, unmount 시 unregister. `role="tab"`, aria-selected, tabindex roving, onClick = setValue.
3. `TabsContent`: active 만 렌더(`forceMount` 는 step 8 에서). role/aria/id.
4. 클릭으로 탭 전환 동작 확인.
5. 기본 CSS 주입(한 번만).
6. 커밋: `feat(Tabs): List/Trigger/Content 기본 구현`.

### Step 4 — 키보드 내비게이션 + activationMode
1. `onTriggerKeyDown` 핸들러: Arrow / Home / End / Enter / Space.
2. `activationMode` 분기.
3. disabled trigger skip.
4. RTL 감지 (`getComputedStyle(root).direction`) + Arrow 부호 반전.
5. 커밋: `feat(Tabs): 키보드 + activationMode`.

### Step 5 — 인디케이터 (animated)
1. `useTabsIndicator.ts`: active trigger 의 offsetLeft/Width 측정.
2. indicator `<div>` 를 List 내부에 추가.
3. `useLayoutEffect` + ResizeObserver(List).
4. 첫 마운트 transition 회피(`data-first-paint`).
5. orientation 전환 대응.
6. 커밋: `feat(Tabs): active indicator transition`.

### Step 6 — overflow scroll + arrow 버튼
1. `useTabsScroll.ts`: `canScrollStart` / `canScrollEnd` 계산.
2. `TabsScrollButton` (내부 컴포넌트): hidden 토글, onClick scrollBy.
3. active 변경 시 `scrollIntoView` 자동.
4. vertical 에서 상/하 버튼.
5. 커밋: `feat(Tabs): overflow scroll + arrow 버튼`.

### Step 7 — closable × + onClose
1. Trigger `closable` + `onClose` prop.
2. `×` span 렌더 + `stopPropagation`.
3. Delete/Backspace 키 처리.
4. 후 상태 전이(close 된 탭이 active 였으면 이웃으로 fallback): uncontrolled 일 때 register cleanup 에서 처리.
5. 커밋: `feat(Tabs): closable + onClose`.

### Step 8 — lazy-mount + forceMount
1. `TabsContent` 의 `forceMount` 옵션.
2. active=false + forceMount=false → return null.
3. active=false + forceMount=true → `hidden` + `aria-hidden`.
4. 커밋: `feat(Tabs): lazy-mount + forceMount`.

### Step 9 — Dark 테마 + 전체 시각 정리
1. palette dark 통합.
2. `data-theme="dark"` 전파.
3. 아이콘 슬롯 처리 (`icon` prop on Trigger).
4. scrollbar 숨김 CSS.
5. 커밋: `feat(Tabs): dark 테마 + 시각 정돈`.

### Step 10 — 데모 페이지
1. `demo/src/pages/TabsPage.tsx` 작성 (§12).
2. `demo/src/App.tsx` NAV 에 `"tabs"` 추가 + Page 타입.
3. 커밋: `feat(Tabs): 데모 페이지`.

### Step 11 — Props 표 + Usage
1. TabsPage 의 Props 섹션에 Root/List/Trigger/Content 네 개 표 작성.
2. Usage 섹션 최소 4 개 (Basic / Vertical / Closable / Controlled).
3. 커밋: `feat(Tabs): 데모 Props + Usage`.

### Step 12 — (후속, 본 PR 외) PipelineGraphInspector 리팩터링
1. `src/components/PipelineGraph/PipelineGraphInspector.tsx` 의 Logs/Timing/Error tab UI 를 plastic `Tabs` 로 교체.
2. 기존 동작 유지(탭 스타일/색상 가이드). 단, plastic Tabs 의 기본 시각으로 자연 이행.
3. 다른 agent 의 PipelineGraph 브랜치 병합 충돌 위험 → **별도 PR**.
4. 커밋 메시지(후속 PR): `refactor(PipelineGraph): inspector 탭을 Tabs 로 교체`.

> **주의**: 현재 레포에는 013~022 브랜치로 다른 agent 들이 병렬 작업 중. PipelineGraph 파일 수정이 포함된 리팩터링은 본 PR 범위 밖으로 분리.

---

## 12. 데모 페이지

`demo/src/pages/TabsPage.tsx` 작성. 기존 페이지(`CommandPalettePage`, `PipelineGraphPage` 등) 구조 복제. 좌측 사이드바 섹션 앵커 + 우측 본문.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "tabs", label: "Tabs", description: "탭 전환 프리미티브", sections: [
  { label: "Basic",                id: "basic" },
  { label: "Vertical",             id: "vertical" },
  { label: "Closable",             id: "closable" },
  { label: "Overflow scroll",      id: "overflow" },
  { label: "Auto vs Manual",       id: "activation" },
  { label: "Lazy mount",           id: "lazy" },
  { label: "Dark",                 id: "dark" },
  { label: "Controlled",           id: "controlled" },
  { label: "Playground",           id: "playground" },
  { label: "Props",                id: "props" },
  { label: "Usage",                id: "usage" },
]},
```

`Page` 타입에 `"tabs"` 추가 + 하단 `{current === "tabs" && <TabsPage />}`.

### 12.2 섹션 구성

**Basic**
```tsx
<Tabs.Root defaultValue="logs">
  <Tabs.List aria-label="Inspector tabs">
    <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
    <Tabs.Trigger value="timing">Timing</Tabs.Trigger>
    <Tabs.Trigger value="error">Error</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="logs">로그 출력...</Tabs.Content>
  <Tabs.Content value="timing">타이밍 차트...</Tabs.Content>
  <Tabs.Content value="error">에러 상세...</Tabs.Content>
</Tabs.Root>
```

**Vertical**
```tsx
<div style={{ display: "flex", height: 300 }}>
  <Tabs.Root orientation="vertical" defaultValue="general" style={{ display: "flex", flex: 1 }}>
    <Tabs.List aria-label="Settings">
      <Tabs.Trigger value="general">General</Tabs.Trigger>
      <Tabs.Trigger value="account">Account</Tabs.Trigger>
      <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
      <Tabs.Trigger value="advanced" disabled>Advanced</Tabs.Trigger>
    </Tabs.List>
    <div style={{ flex: 1, padding: 16 }}>
      <Tabs.Content value="general">...</Tabs.Content>
      <Tabs.Content value="account">...</Tabs.Content>
      <Tabs.Content value="appearance">...</Tabs.Content>
    </div>
  </Tabs.Root>
</div>
```

**Closable**
```tsx
function Demo() {
  const [items, setItems] = useState([
    { value: "a", label: "tab-a.ts" },
    { value: "b", label: "tab-b.ts" },
    { value: "c", label: "tab-c.ts" },
  ]);
  const [active, setActive] = useState("a");
  return (
    <Tabs.Root value={active} onValueChange={setActive}>
      <Tabs.List>
        {items.map((it) => (
          <Tabs.Trigger
            key={it.value}
            value={it.value}
            closable
            onClose={(v) => {
              const nextItems = items.filter(i => i.value !== v);
              setItems(nextItems);
              if (active === v) {
                const next = nextItems[0];
                if (next) setActive(next.value);
              }
            }}
          >
            {it.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((it) => (
        <Tabs.Content key={it.value} value={it.value}>
          {it.label} 의 컨텐츠
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
```

**Overflow scroll**
```tsx
<div style={{ maxWidth: 420 }}>
  <Tabs.Root defaultValue="t1">
    <Tabs.List>
      {Array.from({ length: 20 }, (_, i) => (
        <Tabs.Trigger key={`t${i+1}`} value={`t${i+1}`}>tab-{i+1}</Tabs.Trigger>
      ))}
    </Tabs.List>
    {Array.from({ length: 20 }, (_, i) => (
      <Tabs.Content key={`t${i+1}`} value={`t${i+1}`}>Content {i+1}</Tabs.Content>
    ))}
  </Tabs.Root>
</div>
```
바로 아래에 "⟨ ⟩ 버튼이 양 끝에 나타나고, 키보드 End 누르면 자동 스크롤" 안내.

**Auto vs Manual**
같은 구성 두 개를 나란히:
- 좌: `activationMode="automatic"` — ArrowKey 로 화살표 이동 시 content 가 즉시 전환.
- 우: `activationMode="manual"` — ArrowKey 는 focus 만 이동, Enter/Space 로 activate.

각 우측에 설명 텍스트.

**Lazy mount**
```tsx
<Tabs.Root defaultValue="a">
  <Tabs.List>
    <Tabs.Trigger value="a">A (lazy)</Tabs.Trigger>
    <Tabs.Trigger value="b">B (forceMount)</Tabs.Trigger>
    <Tabs.Trigger value="c">C (lazy)</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="a"><LoggingMount name="A" /></Tabs.Content>
  <Tabs.Content value="b" forceMount><LoggingMount name="B" /></Tabs.Content>
  <Tabs.Content value="c"><LoggingMount name="C" /></Tabs.Content>
</Tabs.Root>
```
`LoggingMount` 는 mount/unmount 시 `console.log` 기록. 콘솔을 열어 "A, C 는 전환마다 mount/unmount, B 는 한 번만 mount" 를 확인.

**Dark**
```tsx
<div style={{ background: "#0f172a", padding: 16, borderRadius: 8 }}>
  <Tabs.Root defaultValue="logs" theme="dark">
    ...
  </Tabs.Root>
</div>
```

**Controlled**
외부 state + 버튼으로 프로그램적 전환 데모 + active 표시.
```tsx
const [v, setV] = useState("logs");
return (
  <>
    <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <button onClick={() => setV("logs")}>→ Logs</button>
      <button onClick={() => setV("timing")}>→ Timing</button>
      <button onClick={() => setV("error")}>→ Error</button>
      <code>active = {v}</code>
    </div>
    <Tabs.Root value={v} onValueChange={setV}>...</Tabs.Root>
  </>
);
```

**Playground**
상단 컨트롤 바:
- `orientation` 라디오 (horizontal / vertical)
- `activationMode` 라디오 (automatic / manual)
- `theme` 라디오 (light / dark)
- `disabled` 체크박스
- "탭 추가/제거" 버튼 + 현재 탭 리스트
- `closable` 토글 (모든 탭에 적용)
- `forceMount` 토글 (모든 content)
- `scrollable` 토글

아래에 `<Tabs.Root {...args}>` 렌더 + 실시간 JSON config 출력.

**Props 표**
Root/List/Trigger/Content 네 개의 표. 각 행: prop / 타입 / 기본값 / 설명. CommandPalettePage 의 Props 섹션 포맷 참조.

**Usage (4개 스니펫)**
1. Basic — 3 탭 automatic.
2. VSCode 스타일 에디터 탭 — closable, overflow scroll, forceMount 혼합.
3. Settings 사이드바 — vertical, manual activation.
4. Controlled + 외부 라우터와 연동 (`useSearchParam("tab")` 가상 예).

---

## 13. 검증 계획

### 13.1 자동화
```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

주의:
- `exactOptionalPropertyTypes: true` — optional prop 은 `?:` 로 받고 내부에서 undefined 분기. 예: `onClose?: (value: string) => void` 를 부모로 넘길 때 `{...(onClose ? { onClose } : {})}` 같이 전개.
- `noUncheckedIndexedAccess: true` — `tabs[0]` 은 `RegisteredTab | undefined`. optional chaining 필수.
- `verbatimModuleSyntax: true` — 타입은 `import type { ... }`.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] **Basic**: 클릭으로 탭 전환, 콘텐츠 교체, indicator 이동 부드러움.
- [ ] **Keyboard (automatic)**: Tab 으로 List 진입, Arrow 로 이동 + 즉시 content 전환, Home/End 동작.
- [ ] **Keyboard (manual)**: Arrow 는 focus 만, Enter/Space 로 activate.
- [ ] **Disabled trigger**: 키보드 Arrow 이동 시 skip, 클릭 무반응, aria-disabled="true".
- [ ] **Vertical**: 상하 Arrow, left border indicator, 세로 스크롤.
- [ ] **Closable**: × hover/focus 시 노출, 클릭 시 Trigger click 안 됨, onClose(value) 호출. Delete 키 동작.
- [ ] **Overflow scroll**: 좁은 컨테이너에서 양 끝 ⟨ ⟩ 버튼 토글, scrollBy smooth, active 탭 자동 스크롤 in-view.
- [ ] **Lazy mount**: 전환마다 mount/unmount 확인 (콘솔 로그). forceMount 탭은 한 번만 mount.
- [ ] **Dark**: 모든 요소가 다크 palette.
- [ ] **Controlled**: 외부 버튼으로 value 변경 즉시 반영, 내부 클릭도 onValueChange.
- [ ] **Indicator**: 탭 폭 다른 경우 transform/width 변환 부드러움, List 리사이즈 시 재계산.
- [ ] **RTL**: `<div dir="rtl">` 로 감싸 ArrowLeft/Right 의미 반전 확인.
- [ ] **Nested Tabs**: Content 안에 또다른 `Tabs.Root` — 독립 동작.
- [ ] **Playground**: 모든 컨트롤 조합.
- [ ] 기존 페이지 regression 없음 (CommandPalette/HexView/PipelineGraph/CodeView/DataTable).

### 13.3 엣지 케이스
- [ ] 모든 Trigger 가 disabled → active value 없음, indicator 숨김(width 0).
- [ ] Trigger 0 개 → List 렌더, Content 없음. OK.
- [ ] 동일 value 중복 → 두 번째 register 시 dev warn(콘솔), DOM 은 React key 경고도.
- [ ] 매우 긴 label (> 200 chars) → 자연 폭(스크롤로 해결). CSS 로 `max-width` 주면 ellipsis 대체.
- [ ] controlled value 가 등록되지 않은 값 → dev warn + indicator 숨김 + 모든 trigger inactive.
- [ ] 중간에 Trigger 를 동적으로 추가/제거(mutation) → register/unregister + indicator 재계산.
- [ ] 화면 resize → indicator · scroll 상태 업데이트.
- [ ] orientation 동적 전환 → indicator 축 전환.
- [ ] closable 인데 onClose 미지정 → dev warn, × 클릭 no-op.
- [ ] Content forceMount 이면서 iframe 포함 → 전환 후에도 iframe 상태 유지(HISTORY 테스트).
- [ ] 극단 small height vertical (< trigger height) → list 스크롤 동작.
- [ ] activationMode 동적 전환 → 다음 키 이벤트부터 새 모드.

### 13.4 a11y 수동 (VoiceOver)
- [ ] List 진입 시 "tablist, X tabs" 읽힘.
- [ ] 탭 focus 시 "Logs, selected, tab 1 of 3" 읽힘.
- [ ] Arrow 이동 시 automatic 모드에서 "Timing, selected, tab 2 of 3" 읽힘.
- [ ] manual 모드에서 Arrow 로 이동 시 "Timing, tab 2 of 3" (선택 안됨) 읽힘, Enter 후 "selected" 추가.
- [ ] Content 진입 시 "tabpanel, Logs" (aria-labelledby) 읽힘.
- [ ] disabled trigger: "dimmed" 또는 "disabled" 힌트.

---

## 14. 성능

### 14.1 목표
- 탭 수 100 개까지도 초기 mount < 20 ms.
- 탭 전환(content 교체) < 16 ms (60 fps 유지).
- indicator transition 은 GPU 합성만 (transform/width는 width 만 layout trigger, 이는 허용).

### 14.2 병목 + 완화
1. **매 렌더마다 registry 재구성**: register/unregister 가 effect 기반이므로 렌더마다 발생 안 함. 실제 DOM mount/unmount 시에만.
2. **value 변경 시 모든 Trigger re-render**: Context value 가 바뀌므로 모든 구독자 재렌더. 완화:
   - Trigger 내부는 가벼운 span. 100 개 trigger 재렌더도 < 3 ms.
   - 필요 시 Context 를 `valueContext` + `staticContext` 로 분리 (value 만 바뀌는 경우 staticContext 는 rerender 안 하도록). v1 은 단일 context, 성능 이슈 발견 시 분리.
3. **indicator 측정 비용**: `offsetLeft/offsetWidth` 접근은 layout forcing. `useLayoutEffect` 안에서 **한 번만** 측정 후 style 적용. `cumulativeLayoutShift` 영향 없음 (이미 layout 이 확정된 시점).
4. **ResizeObserver / MutationObserver 과다 호출**: List 한 개에 대해서만 설정. trigger 추가/제거 시만 callback 실행. 저비용.
5. **lazy-mount 토글 시 Content 생성 비용**: 사용자 책임. plastic 은 forceMount 선택권만 제공.

### 14.3 측정
- Playground 탭 100 개로 전환 시 DevTools Performance 탭 1 초 녹화 → 60 fps 확인.
- React Profiler 로 탭 전환 시 rerender commit < 5 ms.

---

## 15. 접근성

### 15.1 ARIA

| 요소 | 속성 |
|---|---|
| `Tabs.Root` | `<div>` (role 없음) + `data-*` |
| `Tabs.List` | `role="tablist"`, `aria-orientation="horizontal"\|"vertical"`, `aria-label` or `aria-labelledby` |
| `Tabs.Trigger` (active) | `role="tab"`, `aria-selected="true"`, `tabindex="0"`, `aria-controls="{contentId}"`, `id="{triggerId}"` |
| `Tabs.Trigger` (inactive) | `role="tab"`, `aria-selected="false"`, `tabindex="-1"`, 나머지 동일 |
| `Tabs.Trigger` (disabled) | 위에 더해 `aria-disabled="true"`, `disabled` HTML attr |
| `Tabs.Trigger` (closable close btn) | `role="button"`, `aria-label="Close {tabLabel}"`, `tabindex="-1"` |
| `Tabs.Content` (active) | `role="tabpanel"`, `id="{contentId}"`, `aria-labelledby="{triggerId}"`, `tabindex="0"` |
| `Tabs.Content` (inactive, forceMount) | 위에 더해 `hidden`, `aria-hidden="true"` |
| overflow scroll 버튼 | `<button>`, `aria-label="Scroll tabs left"` / `"right"`, `tabindex="-1"` (마우스 전용; 키보드 유저는 Arrow 로 대체) |

### 15.2 focus 관리

- List 에 tab 키로 진입 시 active trigger 가 focus.
- Arrow 로 탭 간 이동 (roving tabindex).
- 탭 focus 상태 시각 표시: `:focus-visible` outline.
- 비활성 탭은 `tabindex="-1"` 이라 Tab 키로 focus 안 받음.
- Content 는 `tabindex="0"` (panel 자체로 focus 가능) → 내부 focusable 이 있으면 그곳으로 이동.

### 15.3 스크린리더 동작 예시 (VoiceOver)

Basic 예제:
```
User: (Tab 키)
VO:   "tablist, 3 items, Logs, selected, tab 1 of 3"
User: (ArrowRight)
VO:   "Timing, selected, tab 2 of 3"    # automatic 이라 selected 포함
User: (ArrowRight)
VO:   "Error, selected, tab 3 of 3"
User: (Tab 키)
VO:   "tabpanel, Error, (내부 컨텐츠)"
```

manual 모드:
```
User: (ArrowRight)
VO:   "Timing, tab 2 of 3"               # selected 빠짐
User: (Enter)
VO:   "Timing, selected, tab 2 of 3"
```

### 15.4 고대비 / forced-colors 모드

```css
@media (forced-colors: active) {
  .tabs-indicator { background: Highlight; }
  .tabs-trigger[data-state="active"] { color: HighlightText; }
  .tabs-trigger:focus-visible { outline-color: Highlight; }
}
```

---

## 16. 트레이드오프

1. **value 가 string 단일 키**: index 기반(Headless UI 방식) 에 비해 DOM id 와 매핑이 자연스럽고 리스트 변경에 안정적. 단점: 사용자가 의미 없는 key 를 짓기 귀찮을 수 있음. 대안: 자동 index 기반 fallback. v1 은 명시적 string 강제.
2. **closable 를 per-Trigger prop**: 모든 탭이 closable 일 때도 각 Trigger 에 지정해야 함(약간의 중복). 대안은 Root 에 `closable` + per-Trigger `closable={false}` override. v1 은 per-Trigger 만 — 더 명시적, Root 수준 "모든 탭 closable" 은 유저가 map 시 spread 로 해결 가능.
3. **lazy-mount 기본값 = true**: 대부분 탭은 가벼우므로 캐시 필요 없음. forceMount 는 opt-in. Radix 와 반대(Radix 는 기본 unmount 지만 forceMount 도 동일 의미 제공) — plastic 은 사용자가 의식적으로 forceMount 결정.
4. **Root 가 자동 첫 탭 선택**: `defaultValue` 미지정 시 첫 non-disabled trigger 자동 활성. 장점: 최소 구성으로도 동작. 단점: "아무 탭도 선택 안 된 상태" 를 표현하기 어려움(`value={null}` 을 명시적으로 두어야 함). v1 은 자동 선택 채택.
5. **close 후 next selection 은 owner 책임 (controlled)**: plastic 이 자동으로 "다음 탭" 을 고르지 않음. 장점: owner 가 자유(닫힌 탭의 왼쪽? 오른쪽? 최근 사용 stack?). 단점: 간단한 케이스에서도 owner 코드 필요. uncontrolled 에서는 plastic 이 register cleanup 에서 첫 non-disabled 로 fallback — 이중 정책으로 편의 제공.
6. **indicator 를 JS 측정 + transform**: CSS-only 접근(각 trigger 의 active state 에 ::after underline)도 가능하나 transition 이 탭 사이를 "이동" 하는 것이 아니라 "기존 underline fade out + 새 underline fade in" 이 됨. 사용자 경험은 이동이 더 자연스러움. 비용은 측정 1 회/value 변경.
7. **scroll container = `.tabs-list`**: indicator 도 scroll 과 함께 이동. 단 arrow 버튼은 list-wrap 기준 absolute 배치. z-index 로 trigger 위에. 타협점: arrow 버튼이 첫/마지막 탭 일부를 가릴 수 있음 → padding-inline 확보로 완화.
8. **closable close 를 `<span role="button">` nested**: HTML 상 `<button>` 안에 `role="button"` 은 불완전하나 실전에서 널리 사용됨. 완전 분리하려면 Trigger 를 `<div>` 로 (§5.3) — 이는 Enter/Space 기본 제출 동작 손실 → custom key handler 필요. v1 은 nested 허용.
9. **`useControllable` 의 `onChange` 호출 타이밍**: 현재 훅은 setValue 시 onChange 호출. 사용자 prop `onValueChange` 도 같은 시점. close 시 fallback selection 도 setValue 경유 → onValueChange 호출됨. 이는 사용자가 원하는 행동(외부 state 동기화)이므로 정책 일관.
10. **orientation 전환 시 스크롤 위치 리셋**: 현재 구현은 List 의 scrollLeft/scrollTop 을 보존하지 않음. 사용자 use case 가 없으므로 v1 수용.

---

## 17. 후속 작업 (v1.1+)

- **drag reorder**: Trigger 를 pointerDown + drag threshold + dragover detection 으로 순서 변경. `onReorder(values: string[])` 콜백. dnd-kit 없이 순수 HTML5 DnD 또는 pointer 기반 구현.
- **drag-out to new window**: Chrome 탭처럼 밖으로 드래그하면 pop-out. Electron/tauri 환경 전제 기능.
- **컨텍스트 메뉴**: 우클릭으로 "Close others / Close right / Pin / Copy path" 표시. plastic 이 ContextMenu 컴포넌트를 먼저 가진 뒤 조합.
- **pin tab**: 핀 고정 탭(close 불가 + 왼쪽 배치).
- **dirty indicator**: `dirty?: boolean` prop 으로 `●` 닫기 아이콘 대체(VSCode 식).
- **compression overflow**: 탭 수가 많으면 글자 줄이기 + hover 시 확장. scroll 과 병존 가능(우선순위).
- **add (+) 버튼 전용 API**: `<Tabs.Add onClick={...} />` 로 스타일 일관성.
- **PipelineGraphInspector 리팩터링**: 별도 PR (§11 Step 12).
- **Content animation**: fade/slide transition (framer-motion 없이 CSS 만).
- **keyboard shortcut**: `Cmd+1~9` 로 N번째 탭 이동 (opt-in `shortcuts: true`).
- **TypeScript 강화**: value 유니온 타입 generic (`Tabs.Root<V extends string>`).
- **aria-label 자동화**: aria-label 미지정 시 dev warn.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| controlled/uncontrolled 표준 훅 | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| 이미 탭 UI 구현된 prior impl (추출 대상) | `/Users/neo/workspace/plastic/src/components/PipelineGraph/PipelineGraphInspector.tsx` (Logs/Timing/Error 탭 — 후속 PR 로 Tabs 로 교체) |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 App 라우팅 / NAV / 테마 컨텍스트 | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 데모 페이지 레이아웃 · Props 표 · Usage 구조 레퍼런스 | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |
| 이전 plan 포맷 참고 (템플릿) | `/Users/neo/workspace/plastic/docs/plans/017-splitpane-component.md` |

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18+ (기존) + DOM API (`ResizeObserver`, `MutationObserver`, `requestAnimationFrame`, `Element.scrollIntoView`, `Element.compareDocumentPosition`, `getComputedStyle`) 만 사용. 모두 모던 브라우저(Chrome 64+/Firefox 69+/Safari 13+) 에서 지원.

번들 영향:
- Tabs 자체 예상 크기: ~3 KB (min), ~1.3 KB (min+gzip).
- plastic 전체 dist 거의 영향 없음.

API 호환성:
- `src/components/index.ts` 배럴에 한 줄 추가, 기존 export 영향 없음.
- 다른 컴포넌트(`SplitPane`, `CommandPalette`, `PipelineGraph`, `DataTable`, `HexView`, `CodeView` 등)와 충돌 없음.
- 같이 사용 가능(예: `SplitPane.Pane` 안에 `Tabs.Root`, `Tabs.Content` 안에 `DataTable`).

Node/SSR:
- `useId` 로 hydration-safe id 생성.
- `getComputedStyle(root).direction` 접근은 `useLayoutEffect` 내부 → SSR 시 skip.
- `document`/`window` 직접 접근은 event handler 안에서만, 최상위 파일 scope 에서 접근 금지.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과 (`exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` / `verbatimModuleSyntax` 준수).
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/tabs` 라우트 동작.
- [ ] §13.2 수동 체크리스트 전부 확인.
- [ ] §13.3 엣지 케이스 전부 확인 또는 "v1 범위 밖" 명시.
- [ ] §13.4 a11y 수동 체크 (VoiceOver 또는 NVDA) 전부 확인.
- [ ] CommandPalette / SplitPane / PipelineGraph / CodeView / HexView / DataTable / 기타 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./Tabs";` 추가.
- [ ] `package.json` dependencies 변경 없음.
- [ ] Props 섹션에 Root / List / Trigger / Content 네 개 표 작성.
- [ ] Usage 섹션 최소 4 개 스니펫 (Basic / VSCode-style / Settings vertical / Controlled).
- [ ] Playground 에서 모든 prop 토글 가능.
- [ ] Light / Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드만으로 (마우스 없이) 모든 기능 사용 가능: 탭 이동, activate, close, overflow scroll(End 로 도달).
- [ ] 스크린리더 확인: active 탭 안내, content 라벨, disabled 안내, close 버튼 라벨.
- [ ] indicator transition 이 모든 탭 폭/오리엔테이션에서 자연스러움.
- [ ] PipelineGraphInspector 리팩터링은 별도 PR 로 분리 (본 PR 포함하지 않음).

---

**끝.**
