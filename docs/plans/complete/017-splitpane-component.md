# SplitPane 컴포넌트 설계문서

## Context

plastic 라이브러리에 "두 개의 영역을 드래그 가능한 divider 로 분할하는 레이아웃 프리미티브" `SplitPane` 을 추가한다. 역할 비유: VSCode/IntelliJ 의 에디터-사이드바 리사이즈, Chrome DevTools 의 Elements/Styles 분할, Finder 의 tree/list split. 이 컴포넌트는 IDE 스타일 레이아웃의 기본 블록이며, plastic 상위에서 `PipelineGraphInspector` 등이 이미 임시로 구현하던 divider 리사이즈 로직을 추출·일반화하여 재사용 가능한 공용 컴포넌트로 승격하는 것이 목적이다.

참고 (prior art — UX 근거):
- **Atlassian atlaskit `@atlaskit/navigation-next` / `@atlaskit/split`** — flex-basis 기반, collapse + persist.
- **Electron/VSCode `SplitView`** — min/max/snap, keyboard, two-pane + recursive.
- **react-split-pane** (구 표준, 비유지보수) — `primary` pane 기준으로 size 계산, pixel/% 포맷.
- **react-resizable-panels** (현재 활발) — compound API (`PanelGroup`/`Panel`/`PanelResizeHandle`), localStorage autosave, snap.
- **Splitter (Ant Design, BlueprintJS `Divider`)** — UI 일관성 참조.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/PipelineGraph/PipelineGraphInspector.tsx` — 이미 `onDividerPointerDown` 구현 존재 (line 315~340). 추출·일반화 대상.
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅.
- `src/components/DataTable/useColumnResize.ts` — pointer drag 기반 리사이즈 패턴(컬럼). 훅 구조·cleanup·`document.body.style.cursor` 글로벌 토글 방식 참조.
- `demo/src/App.tsx` — 사이드바 자체 resize 핸들 (min/max + localStorage) 로직이 이미 existent. **내부 리팩터링 기회**(§17).
- `demo/src/pages/PipelineGraphPage.tsx`, `demo/src/pages/*Page.tsx` — 데모 페이지 레이아웃 관례.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
<SplitPane.Root
  direction="horizontal"        // 기본. "vertical" 도 가능.
  defaultSize="40%"             // 첫 번째 pane 기준. number(px) | `${number}%`
  minSize={160}
  maxSize="70%"
  snapSize="50%"                // 드래그 중 이 근처 통과 시 스냅
  collapsible="start"           // "start" | "end" | "both" | "none"
  collapsedSize={0}
  storageKey="ide:editor-split" // localStorage persist
  theme="light"
  onSizeChange={(px, pct) => log(px, pct)}
>
  <SplitPane.Pane>
    <FileTree />
  </SplitPane.Pane>
  <SplitPane.Divider />
  <SplitPane.Pane>
    <Editor />
  </SplitPane.Pane>
</SplitPane.Root>
```

렌더 결과 (개념):
```
┌──────────┬──┬────────────────────────────────┐
│ 파일트리 │::│            에디터              │
│          │::│                                │
│          │::│                                │
└──────────┴──┴────────────────────────────────┘
  ↑          ↑
  Pane[0]   Divider (drag, keyboard, collapse)
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Root`/`Pane`/`Divider` 의 3 개 소계로 Context 통해 상태 공유. 자식 순서는 `Pane, Divider, Pane` 고정 (v1).
- **size 는 첫 번째 pane 기준**. 두 번째 pane 은 `flex: 1`. `direction === "horizontal"` 이면 width, `vertical` 이면 height.
- **dual unit**. `number` 은 픽셀, `"${number}%"` 문자열은 컨테이너 비율. 내부 상태는 항상 픽셀로 유지하되 onSizeChange 콜백에는 `(px, pct)` 둘 다 제공.
- **controlled/uncontrolled 이중 API**. `useControllable` 동일 패턴.
- **런타임 의존 zero**. DOM + React 만. ResizeObserver, PointerEvents 는 web standard.
- **접근성 · 키보드 우선**. divider 는 `role="separator"` + `aria-valuenow/min/max` + Arrow / Shift+Arrow / Home/End 지원.
- **v1 은 2-pane 만**. multi-pane(3+) 은 v1.1 에서 `Pane, Divider, Pane, Divider, Pane` 확장.

---

## 1. Goals / Non-goals

### Goals (v1)
1. 수평/수직 방향 2-pane 분할.
2. pixel/percent 양쪽 단위로 size/minSize/maxSize 지정.
3. pointer 드래그로 리사이즈. pointer capture 사용, drag 중 selection/iframe 간섭 차단.
4. 키보드 리사이즈: Arrow ±10, Shift+Arrow ±100, Home=min, End=max, Enter/Space=collapse toggle (collapsible 일 때).
5. controlled/uncontrolled 이중 API: `size`/`defaultSize`/`onSizeChange`.
6. localStorage persist (`storageKey`). 없으면 memory-only.
7. min/max clamp + snap (optional single breakpoint) + collapse threshold.
8. collapsible: "start" | "end" | "both" | "none". 토글 버튼 옵션 + 키보드 트리거.
9. ResizeObserver 로 컨테이너 크기 변화 감지 → percent 기반 크기는 자동 재계산, pixel 기반 크기는 clamp 재적용.
10. Light / Dark 테마.
11. RTL 대응: `direction="horizontal"` 에서 `[dir="rtl"]` 일 때 "start pane" 이 우측이 된다.

### Non-goals (v1 제외)
- **3+ pane** (multi-pane): Pane-Divider-Pane-Divider-Pane 패턴은 v1.1. v1 은 정확히 2 Pane + 1 Divider 만 허용하고 이외 구성은 dev warn.
- **nested SplitPane**: 사용자는 `Pane` 안에 또다른 `SplitPane.Root` 를 자유롭게 중첩 가능. 그러나 "내부 중첩에 특화된 API" (예: 자동 분할 경로 기록) 는 v1 제외.
- **layout presets / layout saving service**: v1 은 단순 storageKey 만. 다중 레이아웃 저장/복원 UI (예: "내 레이아웃 A/B") 는 v1.2.
- **터치 제스처(핀치 등)** 특화: pointerEvents 가 touch 를 자동 커버하므로 기본 드래그는 동작. 그 이상 제스처 아님.
- **동적 divider size**: v1 은 고정 6 px. 사용자 스타일 커스터마이즈는 `className`/`style` 로 가능.
- **animation**: collapse transition 은 CSS transition 한 줄(200 ms cubic) 만, 그 외 JS 애니메이션 없음.
- **touch drag handle affordance UI** (예: 큰 drag dot): v1.1.

---

## 2. 공개 API

### 2.1 타입 — `src/components/SplitPane/SplitPane.types.ts`

```ts
export type SplitPaneTheme = "light" | "dark";
export type SplitPaneDirection = "horizontal" | "vertical";

/**
 * 크기 표현 단위.
 * - number: 정수 픽셀 (0 이상)
 * - `${number}%`: 컨테이너 크기 대비 %
 */
export type SplitPaneSize = number | `${number}%`;

export type SplitPaneCollapsible = "start" | "end" | "both" | "none";

export interface SplitPaneRootProps {
  /** 분할 방향. 기본 "horizontal". */
  direction?: SplitPaneDirection;
  /** 초기 사이즈 (첫 번째 pane 기준). uncontrolled. 기본 "50%". */
  defaultSize?: SplitPaneSize;
  /** 제어 사이즈. 지정 시 controlled. */
  size?: SplitPaneSize;
  /** 사이즈 변경 콜백. px 와 percent 둘 다 제공. */
  onSizeChange?: (sizePx: number, sizePercent: number) => void;
  /**
   * 드래그 완료 시(pointerup) 호출되는 콜백. persist 타이밍 조율용.
   * size 변경 매 tick 에는 호출되지 않음. uncontrolled 일 때도 호출.
   */
  onSizeChangeEnd?: (sizePx: number, sizePercent: number) => void;

  /** 최소 사이즈. 기본 48 (px). */
  minSize?: SplitPaneSize;
  /** 최대 사이즈. 기본 "90%". */
  maxSize?: SplitPaneSize;

  /**
   * 드래그 중 이 값 근처(기본 ±8 px)를 통과하면 해당 값에 snap.
   * 단일 지점만 지원 (v1). 여러 breakpoints 는 v1.1.
   */
  snapSize?: SplitPaneSize;
  /** snap 활성 임계값 (px). 기본 8. */
  snapThreshold?: number;

  /** 어느 쪽을 collapse 가능으로 둘지. 기본 "none". */
  collapsible?: SplitPaneCollapsible;
  /** collapse 시 목표 크기 (기본 0). */
  collapsedSize?: number;
  /**
   * 드래그 중 이 값 미만(첫 pane 이 start-collapse 대상일 때)으로 내려가면
   * collapsedSize 로 스냅 collapse. 기본 minSize * 0.5.
   */
  collapseThreshold?: number;

  /** localStorage 키. 지정되면 사이즈 persist. uncontrolled 일 때만 유효. */
  storageKey?: string;

  /** 라이트/다크. 기본 "light". */
  theme?: SplitPaneTheme;

  /** 비활성화 (드래그/키보드 모두 차단). 기본 false. */
  disabled?: boolean;

  /** 추가 className / style (root). */
  className?: string;
  style?: React.CSSProperties;

  /** 자식: Pane, Divider, Pane 순서. */
  children: React.ReactNode;
}

export interface SplitPaneProps {
  /** pane 내용 */
  children?: React.ReactNode;
  /** 추가 className / style */
  className?: string;
  style?: React.CSSProperties;
  /**
   * 이 pane 이 collapse 대상일 때 툴팁/ARIA 라벨에 쓰일 이름.
   * 예: "File tree", "Inspector".
   */
  label?: string;
}

export interface SplitPaneDividerProps {
  /** 추가 className / style */
  className?: string;
  style?: React.CSSProperties;
  /** divider 접근성 라벨 (기본 "Resize panes"). */
  "aria-label"?: string;
  /**
   * 커스텀 affordance (드래그 핸들 내부에 표시할 요소, 예: `•••`).
   * 지정하지 않으면 빈 라인.
   */
  children?: React.ReactNode;
}
```

### 2.2 배럴

```ts
// src/components/SplitPane/index.ts
export { SplitPane } from "./SplitPane";
export type {
  SplitPaneRootProps,
  SplitPaneProps,
  SplitPaneDividerProps,
  SplitPaneSize,
  SplitPaneTheme,
  SplitPaneDirection,
  SplitPaneCollapsible,
} from "./SplitPane.types";
```

그리고 `src/components/index.ts` 에 `export * from "./SplitPane";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// SplitPane.tsx
export const SplitPane = {
  Root: SplitPaneRoot,
  Pane: SplitPanePane,
  Divider: SplitPaneDivider,
};
```

사용자가 `<SplitPane.Root>…</SplitPane.Root>` 로 접근. `Root`, `Pane`, `Divider` 의 displayName 은 각각 `"SplitPane.Root"`, `"SplitPane.Pane"`, `"SplitPane.Divider"`.

---

## 3. 도메인 모델

### 3.1 size 단위 정책

- 내부 상태(`useState`) 는 **항상 픽셀(number)** 로 유지한다.
- props 로 들어온 `"${n}%"` 는 "컨테이너 너비/높이를 곱해" 픽셀로 변환 후 저장.
- `onSizeChange(px, pct)` 콜백에서 둘 다 돌려주므로, 호출자는 원하는 단위로 사용.
- localStorage 에는 항상 `{ unit: "px" | "pct", value: number }` 형태 JSON 으로 저장 (사용자 입력 단위 보존 → 창 리사이즈 후 복원 시 의도 보존).

### 3.2 size 변환 유틸

```ts
// SplitPane.utils.ts
export function parseSize(s: SplitPaneSize): { unit: "px" | "pct"; value: number } {
  if (typeof s === "number") return { unit: "px", value: s };
  const m = /^(-?\d+(\.\d+)?)%$/.exec(s);
  if (!m) throw new Error(`SplitPane: invalid size ${s}`);
  return { unit: "pct", value: parseFloat(m[1]!) };
}

export function toPx(s: SplitPaneSize, containerPx: number): number {
  const p = parseSize(s);
  return p.unit === "px" ? p.value : (p.value / 100) * containerPx;
}

export function toPct(px: number, containerPx: number): number {
  if (containerPx <= 0) return 0;
  return (px / containerPx) * 100;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
```

### 3.3 fr (future) 단위

v1 은 `px` 와 `%` 만. 향후 CSS Grid 의 `fr` 이나 `calc()` 기반 비율 표현이 필요하면 `SplitPaneSize` 유니온을 확장. 이 경우 계산을 GridTemplate 로 위임하는 리팩터링이 필요하므로 v1 범위 밖.

### 3.4 root Context

```ts
interface SplitPaneContextValue {
  direction: SplitPaneDirection;
  sizePx: number;
  containerPx: number;
  minPx: number;
  maxPx: number;
  snapPx: number | null;
  snapThreshold: number;
  collapsible: SplitPaneCollapsible;
  collapsedSize: number;
  collapseThreshold: number;
  isCollapsedStart: boolean;
  isCollapsedEnd: boolean;
  disabled: boolean;
  theme: SplitPaneTheme;
  onDividerPointerDown: (e: React.PointerEvent) => void;
  onDividerKeyDown: (e: React.KeyboardEvent) => void;
  toggleCollapse: (which: "start" | "end") => void;
  isDragging: boolean;
  rtl: boolean;
  paneIndex: React.MutableRefObject<number>;
}

const SplitPaneContext = createContext<SplitPaneContextValue | null>(null);
```

---

## 4. 시각 / 구조 설계

### 4.1 DOM 구조 (horizontal 기준)

```
<div role="group" class="sp-root" style="display:flex; direction:horizontal">
  <div class="sp-pane sp-pane--start" style="flex: 0 0 {sizePx}px; min-width:0; min-height:0; overflow:hidden">
    {children}
  </div>
  <div role="separator"
       aria-orientation="vertical"
       aria-valuenow="{sizePct round}"
       aria-valuemin="{minPct}"
       aria-valuemax="{maxPct}"
       tabindex="0"
       class="sp-divider"
       style="width:6px; cursor:col-resize; flex: 0 0 6px">
    <div class="sp-divider-handle" />
  </div>
  <div class="sp-pane sp-pane--end" style="flex: 1 1 0; min-width:0; min-height:0; overflow:hidden">
    {children}
  </div>

  {/* drag 중에만 overlay 삽입: iframe/selection 방지 */}
  {isDragging && <div class="sp-drag-overlay" style="position:fixed;inset:0;z-index:9999;cursor:col-resize" />}
</div>
```

`vertical` 은 flex-direction=column + aria-orientation="horizontal" + cursor=row-resize + height:6px.

### 4.2 이유 — `flex-basis` vs `grid-template` vs absolute

- **flex** (선택). start pane 은 `flex: 0 0 Npx`, end pane 은 `flex: 1 1 0`. divider 는 `flex: 0 0 6px`. 장점: 중간 크기 변화가 start pane 만 변경되고 end 는 자동 채움. `min-width:0` 로 내부 overflow 격리가 자연스러움.
- grid 는 `grid-template-columns: Npx 6px 1fr` 도 가능하나, dynamic ResizeObserver 계산 시 grid track 재설정 cost + safari 의 track transition 버그 경험. v1 은 flex.
- absolute positioning 은 내부 컨텐츠 natural flow 를 방해. 기각.

### 4.3 RTL 대응

horizontal + `dir="rtl"` 컨텍스트에서는 start pane 이 "화면 오른쪽" 에 표시된다. Flex 가 자동으로 뒤집어 주므로 DOM 순서는 동일하되, 드래그 `deltaX` 부호를 **반대**로 해석. `rtl` 여부는 컨테이너의 computed `direction` 으로 감지:

```ts
const rtl = useMemo(
  () => getComputedStyle(rootRef.current!).direction === "rtl",
  [containerPx /* 재측정 trigger */],
);
```

vertical 은 RTL 무관.

### 4.4 divider 스타일

```css
.sp-divider {
  background: var(--sp-divider-bg);        /* light: rgba(0,0,0,0.08), dark: rgba(255,255,255,0.08) */
  transition: background 120ms;
  user-select: none;
  touch-action: none;                       /* pointer capture 안정성 */
  position: relative;
}
.sp-divider:hover,
.sp-divider:focus-visible {
  background: var(--sp-divider-hover);     /* light: rgba(37,99,235,0.35) */
}
.sp-divider[data-dragging="true"] {
  background: var(--sp-divider-active);    /* #2563eb */
}
.sp-divider-handle {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  width: 2px; height: 18px;
  background: var(--sp-divider-handle-fg);
  border-radius: 1px;
  opacity: 0;
  transition: opacity 120ms;
}
.sp-divider:hover .sp-divider-handle,
.sp-divider[data-dragging="true"] .sp-divider-handle {
  opacity: 0.6;
}
```

### 4.5 palette 토큰

```ts
// SplitPane/theme.ts
export const splitPanePalette = {
  light: {
    dividerBg:        "rgba(0,0,0,0.08)",
    dividerHover:     "rgba(37,99,235,0.35)",
    dividerActive:    "#2563eb",
    dividerHandleFg:  "rgba(0,0,0,0.35)",
    collapseBtnBg:    "#ffffff",
    collapseBtnFg:    "#374151",
    collapseBtnBorder:"rgba(0,0,0,0.12)",
    focusRing:        "#2563eb",
  },
  dark: {
    dividerBg:        "rgba(255,255,255,0.08)",
    dividerHover:     "rgba(96,165,250,0.35)",
    dividerActive:    "#60a5fa",
    dividerHandleFg:  "rgba(255,255,255,0.5)",
    collapseBtnBg:    "#1f2937",
    collapseBtnFg:    "#e5e7eb",
    collapseBtnBorder:"rgba(255,255,255,0.08)",
    focusRing:        "#60a5fa",
  },
} as const;
```

---

## 5. 리사이즈 로직

### 5.1 pointer drag 시퀀스

`PipelineGraphInspector` 의 `onDividerPointerDown` 를 일반화한 버전:

```ts
// usePaneResize.ts (내부 훅)
interface DragState {
  startClient: number;
  startSize: number;
  pointerId: number;
}

function onDividerPointerDown(e: React.PointerEvent) {
  if (disabled) return;
  e.preventDefault();
  e.stopPropagation();
  const rect = rootRef.current!.getBoundingClientRect();
  const axis = direction === "horizontal" ? rect.width : rect.height;
  setContainerPx(axis);

  const startClient = direction === "horizontal" ? e.clientX : e.clientY;
  dragRef.current = { startClient, startSize: sizePx, pointerId: e.pointerId };
  dividerRef.current?.setPointerCapture(e.pointerId);
  setIsDragging(true);
  document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
  document.body.style.userSelect = "none";

  const onMove = (ev: PointerEvent) => {
    if (!dragRef.current) return;
    const cur = direction === "horizontal" ? ev.clientX : ev.clientY;
    const delta = (cur - dragRef.current.startClient) * (rtl && direction === "horizontal" ? -1 : 1);
    let next = dragRef.current.startSize + delta;

    if (snapPx != null && Math.abs(next - snapPx) < snapThreshold) next = snapPx;

    if (collapsible === "start" || collapsible === "both") {
      if (next < collapseThreshold) next = collapsedSize;
    }
    if (collapsible === "end" || collapsible === "both") {
      if (containerPx - next - DIVIDER_PX < collapseThreshold) next = containerPx - collapsedSize - DIVIDER_PX;
    }

    next = clamp(next, minPx, maxPx);

    if (!pendingFrame.current) {
      pendingFrame.current = requestAnimationFrame(() => {
        pendingFrame.current = 0;
        setSizePx(next);
      });
    } else {
      pendingNext.current = next;
    }
  };

  const onUp = (ev: PointerEvent) => {
    if (pendingFrame.current) {
      cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = 0;
      if (pendingNext.current != null) setSizePx(pendingNext.current);
    }
    dragRef.current = null;
    dividerRef.current?.releasePointerCapture(ev.pointerId);
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    onSizeChangeEnd?.(sizePxRef.current, toPct(sizePxRef.current, containerPxRef.current));
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}
```

설계 포인트:
- `setPointerCapture` 덕에 drag 중 마우스가 divider 밖으로 나가도 이벤트를 계속 받는다.
- drag 중 `document.body.style.userSelect = "none"` 로 텍스트 선택 차단.
- `touch-action: none` 을 divider CSS 에 두어 브라우저 기본 팬 제스처 차단.
- drag 중 `isDragging=true` 상태를 pass → overlay `<div style="position:fixed;inset:0;z-index:9999">` 를 렌더하여 iframe 위를 덮어 pointer 이벤트가 document 로 계속 흐르게 한다. (iframe 위를 지나갈 때 pointermove 유실 방지.)

### 5.2 getBoundingClientRect 기반 측정

컨테이너 크기(`containerPx`) 는:
- 최초 마운트 시 `rootRef.current.getBoundingClientRect()`.
- **ResizeObserver** 로 root 를 관찰 → 변하면 state 업데이트.
  ```ts
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      const w = box ? box.inlineSize : entry.contentRect.width;
      const h = box ? box.blockSize  : entry.contentRect.height;
      const nextAxis = direction === "horizontal" ? w : h;
      setContainerPx(nextAxis);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [direction]);
  ```
- `containerPx` 가 변하면:
  - percent 기반 저장값은 자동 재계산 (px 는 새로운 axis 기준).
  - pixel 기반 저장값은 유지하되 `clamp(min, max)` 다시 적용.

### 5.3 초기 size 계산

```ts
const [sizePx, setSizePx] = useState<number | null>(null);

useLayoutEffect(() => {
  if (sizePx != null) return;
  const axis = direction === "horizontal" ? rootRef.current!.offsetWidth : rootRef.current!.offsetHeight;
  if (storageKey) {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { unit: "px" | "pct"; value: number };
        const initialPx = parsed.unit === "px" ? parsed.value : (parsed.value / 100) * axis;
        setSizePx(clamp(initialPx, minPx, maxPx));
        setContainerPx(axis);
        return;
      } catch { /* fall through */ }
    }
  }
  const init = toPx(defaultSize, axis);
  setSizePx(clamp(init, minPx, maxPx));
  setContainerPx(axis);
}, []);
```

mount 직후 `null` 상태에선 start pane 에 `flex-basis: 50%` 같은 fallback 을 적용하여 깜빡임 방지.

---

## 6. 제약 (min/max, snap, collapse threshold)

### 6.1 min/max clamp

모든 sizePx 변경 직전에 `clamp(next, minPx, maxPx)` 통과. 단 **collapsedSize** 로 snap 된 경우에는 clamp 에 걸리지 않도록 우회 (예: minSize=48 이고 collapsedSize=0 이면 0 이 minSize 아래임에도 허용).

### 6.2 snapSize

단일 breakpoint (`snapSize`) 근처를 통과할 때 그 값으로 멈춘다. 임계값 `snapThreshold` (기본 8 px). 드래그 중에만 snap, 키보드 이동에는 snap 미적용 (예측 가능성 우선).

### 6.3 collapse threshold

`collapsible="start"` 일 때:
- 드래그 중 `sizePx < collapseThreshold` 를 통과하면 `sizePx = collapsedSize`.
- 반대로 collapse 상태에서 드래그 시작해 `sizePx > collapseThreshold` 를 통과하면 해제.

`collapsible="end"` 는 동일 로직을 `containerPx - sizePx - DIVIDER_PX` 기준으로 적용.

`collapsible="both"` 는 둘 다 활성.

### 6.4 resize 시 clamp 재적용

ResizeObserver 로 containerPx 가 줄어들면 기존 sizePx 가 maxPx 를 초과할 수 있다 → clamp 재적용. 축소 시 end pane 의 min-width 를 확보하기 위한 safety 로 `sizePx = min(sizePx, containerPx - DIVIDER_PX - endMinPx)` 도 계산.

---

## 7. 키보드

divider 는 `tabindex="0"`. focus 받은 상태에서:

| 키 | 동작 |
|---|---|
| `ArrowLeft` (horizontal) / `ArrowUp` (vertical) | sizePx -= 10 |
| `ArrowRight` (horizontal) / `ArrowDown` (vertical) | sizePx += 10 |
| `Shift + Arrow` | ±100 대신 이동 |
| `Home` | sizePx = minPx |
| `End` | sizePx = maxPx |
| `Enter` / `Space` | collapsible 이면 toggle collapse (start 쪽 우선; "end" 면 end). "both" 는 현재 더 가까운 쪽으로 collapse. "none" 은 무동작 |
| `Escape` | drag 중이면 drag 취소 (startSize 로 복원) |

RTL 이면 ArrowLeft/ArrowRight 의 부호 반전. RTL 에서도 Home/End 의미는 "minSize/maxSize" 이므로 물리적 화살표 해석만 반전.

```ts
function onDividerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
  if (disabled) return;
  const step = e.shiftKey ? 100 : 10;
  const sign =
    direction === "horizontal"
      ? (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0) * (rtl ? -1 : 1)
      : (e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0);
  if (sign !== 0) {
    e.preventDefault();
    setSizePx(clamp(sizePxRef.current + sign * step, minPx, maxPx));
    return;
  }
  if (e.key === "Home") { e.preventDefault(); setSizePx(minPx); return; }
  if (e.key === "End")  { e.preventDefault(); setSizePx(maxPx); return; }
  if (e.key === "Enter" || e.key === " ") {
    if (collapsible === "none") return;
    e.preventDefault();
    const which = collapsible === "both"
      ? (sizePxRef.current < containerPxRef.current / 2 ? "start" : "end")
      : collapsible;
    toggleCollapse(which);
    return;
  }
  if (e.key === "Escape" && isDragging) {
    setSizePx(dragRef.current!.startSize);
    dragRef.current = null;
    setIsDragging(false);
  }
}
```

---

## 8. 상태 관리 (controlled / uncontrolled / localStorage)

### 8.1 이중 API

```ts
const isControlled = props.size !== undefined;

const [internalPx, setInternalPx] = useState<number | null>(null);
const sizePx = isControlled
  ? (toPx(props.size!, containerPx))
  : (internalPx ?? fallbackInitialPx);

function commitSize(nextPx: number) {
  const pct = toPct(nextPx, containerPx);
  if (!isControlled) setInternalPx(nextPx);
  props.onSizeChange?.(nextPx, pct);
}
```

> `useControllable` 기존 훅은 "값 그대로" 동기화 패턴이라, 이 컴포넌트처럼 "controlled 표현(SplitPaneSize) ↔ 내부 표현(number)" 사이에 변환이 필요한 경우에는 직접 작성한다. 그러나 훅의 contract(`isControlled` 판정, onChange 미러링) 는 동일하게 따라가 일관성 유지.

### 8.2 localStorage persist

```ts
useEffect(() => {
  if (!storageKey || isControlled || internalPx == null) return;
  const payload = { unit: "px" as const, value: Math.round(internalPx) };
  try { localStorage.setItem(storageKey, JSON.stringify(payload)); } catch { /* ignore quota */ }
}, [storageKey, internalPx, isControlled]);
```

디스크립션:
- controlled 일 때는 외부 owner 가 persist 책임을 가진다 (storageKey 무시 + dev warn).
- 사용자가 `defaultSize="50%"` 로 시작했어도 persist 값은 px 로 저장 — 다음 마운트 시 px 고정(화면 폭 변경 시 같은 px 유지). percent 로 저장하고 싶으면 앞으로 `storageUnit?: "px"|"pct"` prop 을 v1.1 로.

### 8.3 collapse 상태 유도

별도 state 없이 유도:
```ts
const isCollapsedStart = sizePx <= collapsedSize + 0.5;
const isCollapsedEnd   = (containerPx - sizePx - DIVIDER_PX) <= collapsedSize + 0.5;
```

collapse 해제 시 "collapse 직전 사이즈" 를 기억해 복원하려면 ref:
```ts
const preCollapseRef = useRef<number | null>(null);
function toggleCollapse(which: "start" | "end") {
  if (which === "start") {
    if (isCollapsedStart) {
      setSizePx(preCollapseRef.current ?? toPx(defaultSize, containerPx));
      preCollapseRef.current = null;
    } else {
      preCollapseRef.current = sizePx;
      setSizePx(collapsedSize);
    }
  } else {
    if (isCollapsedEnd) {
      setSizePx(preCollapseRef.current ?? toPx(defaultSize, containerPx));
      preCollapseRef.current = null;
    } else {
      preCollapseRef.current = sizePx;
      setSizePx(containerPx - collapsedSize - DIVIDER_PX);
    }
  }
}
```

---

## 9. Collapse / Expand (토글 버튼)

### 9.1 내부 UI 훅

`SplitPane.Pane` 에 `collapsible` 인 경우 작은 "▸ / ▾" 버튼을 붙일지 여부는 **사용자 선택**. v1 은 `<SplitPane.CollapseButton which="start" />` 컴포넌트를 추가로 export.

```tsx
<SplitPane.CollapseButton which="start" />
```

- 내부에서 `SplitPaneContext` 의 `toggleCollapse(which)` 를 호출.
- 아이콘은 direction/which 조합에 따라 `◀ ▶ ▲ ▼` 자동.
- 사용자 UI 는 자유. 원치 않으면 사용하지 않아도 됨 (키보드 Enter/Space + divider focus 로도 토글 가능).

### 9.2 animation

collapse 시 `flex-basis` 전환을 위한 CSS:
```css
.sp-root[data-animating="true"] .sp-pane--start {
  transition: flex-basis 180ms cubic-bezier(0.4, 0, 0.2, 1);
}
```
`data-animating` 은 collapse 토글 클릭 시점에만 잠시 true 로 설정 후 `transitionend` 에 false 로. drag 중에는 절대 true 가 아니도록 주의 (매 프레임 transition 적용 시 시각 어긋남).

---

## 10. 파일 구조

```
src/components/SplitPane/
├── SplitPane.tsx              # Root + Pane + Divider + CollapseButton 조립 + context 생성
├── SplitPane.types.ts         # 공개 타입
├── SplitPane.utils.ts         # parseSize/toPx/toPct/clamp + constants
├── SplitPaneContext.ts        # Context 정의 + useSplitPaneContext 훅
├── usePaneResize.ts           # pointer drag + keyboard + rAF throttle 로직
├── theme.ts                   # splitPanePalette
└── index.ts                   # 배럴
```

각 파일 책임:

- **SplitPane.tsx**
  - `SplitPaneRoot` 함수 컴포넌트. `useControllable`-스타일 듀얼 API + ResizeObserver + 초기 sizePx.
  - Context 에 현재 값/핸들러 주입.
  - children 검증 (§11 Step 1): 정확히 2 Pane + 1 Divider 순서인지 dev warn.
  - drag overlay 렌더.
  - `SplitPanePane`, `SplitPaneDivider`, `SplitPaneCollapseButton` 세 하위 컴포넌트 정의 + namespace export.

- **SplitPane.utils.ts**
  - `parseSize`, `toPx`, `toPct`, `clamp`.
  - `DIVIDER_PX = 6` 상수.
  - `isSizeString(x): x is \`${number}%\`` 타입 guard.

- **SplitPaneContext.ts**
  - `createContext<SplitPaneContextValue | null>(null)`.
  - `useSplitPaneContext()` — null 이면 "must be used within SplitPane.Root" throw.

- **usePaneResize.ts**
  - `onDividerPointerDown` / `onDividerKeyDown` 반환.
  - `isDragging` 상태.
  - `toggleCollapse`.
  - `sizePxRef`/`containerPxRef` 로 handler 안에서 stale closure 회피.

- **theme.ts**
  - `splitPanePalette` (light/dark).

- **index.ts**
  - `export { SplitPane } from "./SplitPane";` + 타입 재노출.

---

## 11. 구현 단계 (후속 agent 가 순차 실행)

각 단계는 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과 상태.

### Step 1 — 타입 + 배럴 + 테마 스켈레톤
1. `SplitPane.types.ts` 작성 (§2.1 전부).
2. `theme.ts` 작성 (palette).
3. `SplitPane.utils.ts` 작성 (`parseSize`, `toPx`, `toPct`, `clamp`, `DIVIDER_PX`).
4. `index.ts` 배럴.
5. `src/components/index.ts` 에 `export * from "./SplitPane";`.
6. `SplitPane.tsx` placeholder: `export const SplitPane = { Root: () => null, Pane: () => null, Divider: () => null };`.
7. `npm run typecheck` 통과.
8. 커밋: `feat(SplitPane): 타입 + 테마 + 배럴`.

### Step 2 — Context + 기본 렌더
1. `SplitPaneContext.ts` + `useSplitPaneContext`.
2. `SplitPaneRoot` 의 flex 컨테이너 + Pane/Divider children 기본 DOM 만 렌더 (리사이즈 아직 없음).
3. `SplitPanePane` 는 context 에서 자신이 start/end 인지 알기 위해 `React.Children.toArray(children)` 순서 기준으로 index 부여 — Root 가 Children.map 하면서 Pane 에 index prop 을 inject하는 방식이 가장 단순 (React 공식 패턴 참조).
4. 초기 size 50% 하드코딩.
5. 커밋: `feat(SplitPane): 기본 flex 레이아웃 + context`.

### Step 3 — usePaneResize 훅 (pointer drag)
1. `usePaneResize.ts`. pointerdown/move/up + pointer capture + userSelect lock.
2. drag 중 `document.body.style.cursor` 토글.
3. rAF throttle.
4. dev 콘솔에 `[SplitPane] dragging size=...` 같은 임시 로그(차후 제거).
5. `SplitPaneRoot` 에서 훅 호출, sizePx 상태 + flex-basis 적용.
6. 커밋: `feat(SplitPane): pointer drag 리사이즈`.

### Step 4 — min/max/snap/clamp + containerPx ResizeObserver
1. min/max 를 SplitPaneSize → px 로 변환 + clamp.
2. ResizeObserver 로 containerPx 동기화.
3. snapSize + snapThreshold 반영.
4. 커밋: `feat(SplitPane): min/max/snap + ResizeObserver`.

### Step 5 — localStorage persist + controlled/uncontrolled
1. `storageKey` 로직.
2. `size` prop 지원 (controlled). controlled + storageKey 동시 지정 시 dev warn.
3. `onSizeChange`, `onSizeChangeEnd` 콜백 호출 타이밍 정리.
4. 커밋: `feat(SplitPane): controlled API + persist`.

### Step 6 — 키보드 + ARIA
1. divider `tabindex=0`, `role="separator"`, `aria-orientation`, `aria-valuenow/min/max`.
2. `onDividerKeyDown`: Arrow / Shift+Arrow / Home / End / Escape.
3. 커밋: `feat(SplitPane): 키보드 + ARIA`.

### Step 7 — collapse / expand + CollapseButton
1. `collapsible`, `collapsedSize`, `collapseThreshold` 반영.
2. `toggleCollapse` 로직 + preCollapseRef.
3. Enter/Space 로 divider focus 시 토글.
4. `SplitPane.CollapseButton` 컴포넌트.
5. CSS transition (drag 중 아님 확인).
6. 커밋: `feat(SplitPane): collapse/expand`.

### Step 8 — RTL + drag overlay
1. `dir="rtl"` 감지 + delta 부호 반전.
2. drag 중 `position:fixed;inset:0;z-index:9999` overlay 렌더로 iframe pointer 유실 방지.
3. 커밋: `feat(SplitPane): RTL + drag overlay`.

### Step 9 — Dark 테마
1. palette dark 통합.
2. `theme="dark"` prop 전파.
3. 커밋: `feat(SplitPane): dark 테마`.

### Step 10 — 데모 페이지
1. `demo/src/pages/SplitPanePage.tsx` (§12).
2. `demo/src/App.tsx` NAV 에 `"splitpane"` 추가.
3. 커밋: `feat(SplitPane): 데모 페이지`.

### Step 11 — PipelineGraphInspector 리팩터링 (후속, optional)
1. `PipelineGraphInspector.tsx` 의 `onDividerPointerDown` 블록을 제거.
2. 외부에서 `<SplitPane.Root direction={position === "right" ? "horizontal" : "vertical"} collapsible="end" ...>` 으로 감싸 inspector panel 을 구성하거나, inspector 내부에서 SplitPane 사용.
3. 기존 동작 동일 유지 검증.
4. 커밋: `refactor(PipelineGraph): inspector 리사이즈를 SplitPane 기반으로 교체`.

> **주의**: 다른 agent 가 병렬 작업 중 — 013~022 브랜치. PipelineGraph 관련 파일을 수정하는 리팩터링(Step 11)은 PipelineGraph 를 만지는 다른 plan 과 충돌 위험이 있으므로 **v1 본 PR 에 포함하지 않고**, 별도 후속 PR 로 분리 권장 (§17 참조).

### Step 12 — 마감
1. Props 표 채움 + Usage 예제 (§12).
2. `§20 Definition of Done` 전부 체크.
3. 커밋: `feat(SplitPane): 데모 props 표 + usage`.

---

## 12. 데모 페이지

`demo/src/pages/SplitPanePage.tsx`. 기존 페이지(HexViewPage, PipelineGraphPage 등) 구조 복제. 섹션별 `<section id="...">` + 우측 사이드바 연동.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "splitpane", label: "SplitPane", description: "드래그 분할 레이아웃", sections: [
  { label: "Basic horizontal",     id: "basic" },
  { label: "Vertical",             id: "vertical" },
  { label: "Min / Max",            id: "minmax" },
  { label: "Collapsible",          id: "collapsible" },
  { label: "Nested (2×2)",         id: "nested" },
  { label: "Snap",                 id: "snap" },
  { label: "Persist",              id: "persist" },
  { label: "Dark",                 id: "dark" },
  { label: "Controlled size",      id: "controlled" },
  { label: "Playground",           id: "playground" },
  { label: "Props",                id: "props" },
  { label: "Usage",                id: "usage" },
]},
```

그리고 `Page` 타입에 `"splitpane"` 추가 + 하단 `{current === "splitpane" && <SplitPanePage />}`.

### 12.2 섹션 구성

**Basic horizontal**
```tsx
<div style={{ height: 240, border: "1px solid #e5e7eb", borderRadius: 8 }}>
  <SplitPane.Root defaultSize="40%">
    <SplitPane.Pane><FakeFileTree /></SplitPane.Pane>
    <SplitPane.Divider />
    <SplitPane.Pane><FakeEditor /></SplitPane.Pane>
  </SplitPane.Root>
</div>
```

**Vertical**
```tsx
<div style={{ height: 320 }}>
  <SplitPane.Root direction="vertical" defaultSize="60%">
    <SplitPane.Pane><FakeEditor /></SplitPane.Pane>
    <SplitPane.Divider />
    <SplitPane.Pane><FakeTerminal /></SplitPane.Pane>
  </SplitPane.Root>
</div>
```

**Min / Max**
```tsx
<SplitPane.Root defaultSize={240} minSize={160} maxSize={520}>...
```

**Collapsible (접고 펴기 버튼 포함)**
```tsx
<SplitPane.Root
  defaultSize="30%"
  collapsible="start"
  collapsedSize={0}
  collapseThreshold={80}
>
  <SplitPane.Pane>
    <div className="flex justify-between p-2">
      <span>Sidebar</span>
      <SplitPane.CollapseButton which="start" />
    </div>
    <FakeFileTree />
  </SplitPane.Pane>
  <SplitPane.Divider />
  <SplitPane.Pane>
    <FakeEditor />
  </SplitPane.Pane>
</SplitPane.Root>
```

**Nested (2×2 복합)** — `Pane` 안에 `SplitPane.Root` 를 또 중첩하여 좌/우 + 우측의 상/하 분할.
```tsx
<SplitPane.Root defaultSize="30%">
  <SplitPane.Pane><Left /></SplitPane.Pane>
  <SplitPane.Divider />
  <SplitPane.Pane>
    <SplitPane.Root direction="vertical" defaultSize="70%">
      <SplitPane.Pane><Editor /></SplitPane.Pane>
      <SplitPane.Divider />
      <SplitPane.Pane><Terminal /></SplitPane.Pane>
    </SplitPane.Root>
  </SplitPane.Pane>
</SplitPane.Root>
```

**Snap (midpoint 에 snap)**
```tsx
<SplitPane.Root defaultSize="30%" snapSize="50%" snapThreshold={12}>...
```

**Persist (storageKey 로 새로고침해도 유지)**
```tsx
<SplitPane.Root storageKey="demo:splitpane:persist" defaultSize="40%">...
```
아래에 "Reload this page — 50% → 40% 조정 → 새로고침 → 유지됨" 안내 문구 + "Clear storage" 버튼.

**Dark**
`<SplitPane.Root theme="dark">` + 배경 `#0f172a` 래퍼.

**Controlled size (외부 버튼으로 30% / 50% / 70% 프리셋)**
```tsx
const [size, setSize] = useState<SplitPaneSize>("50%");
return (
  <>
    <div className="flex gap-2 mb-2">
      <Button onClick={() => setSize("30%")}>30%</Button>
      <Button onClick={() => setSize("50%")}>50%</Button>
      <Button onClick={() => setSize("70%")}>70%</Button>
    </div>
    <div style={{ height: 240 }}>
      <SplitPane.Root size={size} onSizeChange={(_, pct) => setSize(`${Math.round(pct)}%`)}>
        <SplitPane.Pane><Left /></SplitPane.Pane>
        <SplitPane.Divider />
        <SplitPane.Pane><Right /></SplitPane.Pane>
      </SplitPane.Root>
    </div>
  </>
);
```

**Playground**
상단 컨트롤 바:
- `direction` 라디오 (horizontal / vertical)
- `defaultSize` select ("25%", "50%", "75%", "200px")
- `minSize` input (number)
- `maxSize` input (px or %)
- `collapsible` 라디오 (none / start / end / both)
- `snapSize` 체크박스 + value
- `storageKey` 토글 (on/off)
- `theme` 토글 (light/dark)
- `disabled` 체크박스

아래에 400 px 높이 컨테이너에 `<SplitPane.Root {...args}>` 렌더, 각 pane 에 현재 크기를 표시하는 작은 패널.

**Props 표**
기존 페이지 패턴 그대로. `SplitPane.Root` 의 모든 prop × 타입 × 기본값 × 설명.

**Usage (4개)**
1. 기본 2-pane.
2. IDE 스타일 (파일 트리 좌 + 에디터 우).
3. Controlled + storageKey + collapse.
4. Nested 2×2 (좌/우 + 우측의 상/하).

**IDE 스타일 샘플 코드**:
```tsx
function IDELayout() {
  return (
    <SplitPane.Root
      defaultSize={240}
      minSize={160}
      maxSize="40%"
      collapsible="start"
      collapsedSize={32}
      storageKey="ide:sidebar"
    >
      <SplitPane.Pane label="File tree">
        <aside className="h-full bg-slate-50 overflow-auto">
          <FileTree />
        </aside>
      </SplitPane.Pane>
      <SplitPane.Divider />
      <SplitPane.Pane label="Editor">
        <SplitPane.Root direction="vertical" defaultSize="70%" minSize={80}>
          <SplitPane.Pane>
            <Editor />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <Terminal />
          </SplitPane.Pane>
        </SplitPane.Root>
      </SplitPane.Pane>
    </SplitPane.Root>
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
주의: `exactOptionalPropertyTypes: true` — optional prop 은 `?:` 로 받고 디폴트 머지에서 `undefined` 분기. `noUncheckedIndexedAccess: true` — `React.Children.toArray()[i]` 는 `ReactNode | undefined`. `verbatimModuleSyntax: true` — 타입은 `import type`.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic horizontal: 40% 시작, 드래그로 리사이즈, end pane 자동 확장.
- [ ] Vertical: 상/하 분할, cursor=row-resize.
- [ ] Min/Max: minSize 이하로 드래그 시 멈춤, maxSize 초과 시 멈춤.
- [ ] Snap: snapSize 근처 8 px 이내로 진입 시 그 값에 고정, 벗어나면 해제.
- [ ] Collapsible start: 드래그로 collapseThreshold 밑으로 → 0 으로 snap, 반대로 벌리면 복원.
- [ ] CollapseButton: 버튼 클릭 시 current size 저장 후 collapse, 다시 클릭 시 저장값 복원.
- [ ] Keyboard: divider focus 후 Arrow → 10px, Shift+Arrow → 100px, Home → minSize, End → maxSize, Enter/Space → collapse toggle, Esc (drag 중) → startSize 복원.
- [ ] Persist: storageKey 설정 + drag → 새로고침 → 저장값으로 복원. Clear storage → defaultSize 로.
- [ ] Controlled size: 외부 버튼 30/50/70% 프리셋 변화 즉시 반영. 사용자가 드래그 해도 onSizeChange 콜백만 호출되고 외부 state 주도.
- [ ] Dark 테마: divider/hover/active 색상 전부 다크로 전환.
- [ ] Nested: 내부 SplitPane 도 독립 drag/collapse/keyboard.
- [ ] Playground: 모든 컨트롤 조합이 실시간 반영.
- [ ] 다른 페이지 리그레션 없음.

### 13.3 엣지 케이스
- [ ] children 이 Pane, Divider, Pane 외의 조합 → dev warn `[SplitPane] expected exactly 2 Pane + 1 Divider in order`.
- [ ] 컨테이너 크기 = 0 (initial render, display:none 전환 시) → `sizePx` 계산 가드 (`if (containerPx <= 0) return`).
- [ ] controlled + storageKey 동시 → dev warn, storageKey 무시.
- [ ] `defaultSize="50%"` + 드래그 → 내부는 px 로 전환. 이후 창 리사이즈 → 같은 px 유지 (%로 따라가지 않음). 원하면 percent persist 는 v1.1.
- [ ] iframe 포함된 pane 위로 drag → overlay 가 iframe 을 덮어 이벤트 유실 없음.
- [ ] textarea selection 과 드래그 혼동 → `userSelect:none` 으로 방지.
- [ ] `disabled` 시 divider cursor default, pointerdown/keyboard 무효.
- [ ] 매우 작은 container (< minSize * 2): min/max 가 서로 모순 → `minPx = min(minPx, containerPx/2)` 로 연화, maxPx 도 마찬가지. 경고 없이 최선.
- [ ] direction 중간에 바꾸기 (horizontal ↔ vertical): sizePx 유지 (px 의미는 달라짐, 문서화). 필요하면 clamp 재적용.
- [ ] Multi-pointer (멀티터치): `setPointerCapture` 덕에 첫 pointerId 만 추적, 나머지 무시.

---

## 14. 성능

### 14.1 목표
- 드래그 중 **60 fps** (일반 노트북 + React DevTools 없이).
- 초기 마운트 < 2 ms (컨테이너 크기만 측정).

### 14.2 병목 가설 + 완화
1. **pointermove 빈도**: 120 Hz 트랙패드에서 초당 240+ 이벤트 → React state update 240+ 회 = drop frames 가능. 완화: `requestAnimationFrame` 로 한 프레임당 최대 1 회만 setState. 구현은 `pendingNext.current` 마지막 값만 반영 (§5.1).
2. **flex-basis 변경 시 layout**: start pane 1 회 + end pane flex:1 재계산. 가벼움. 복잡한 child 가 있으면 re-layout cost 증가 → 사용자 측 overflow:hidden / contain:layout 권장 문서화.
3. **Context 값 매 렌더**: Root 가 매 드래그 프레임마다 `SplitPaneContext.Provider value={{…}}` 새로 만들면 Pane/Divider 가 re-render. 완화: `Pane` 은 size 에 의존하지 않으므로 Context 를 **구독하지 않거나** size 를 별도 subcontext 로 분리하는 것도 가능. v1 은 단일 context 로 단순화하되 `Pane`, `Divider` 를 `React.memo` 로 감싸고, Pane 내부가 size 에 의존 않도록 — size 는 오직 Root 가 flex-basis 로 적용. Divider 는 `aria-valuenow` 를 ref 기반 DOM 업데이트로 동기화하여 rerender 회피.
4. **ResizeObserver 스로틀**: ResizeObserver 는 브라우저가 이미 rAF 단위로 batch 하므로 추가 throttle 불필요.

### 14.3 측정 방법
- DevTools Performance 탭에서 드래그 1 초간 녹화 → 60 fps 유지 확인.
- `console.time` 없이 육안 + "드래그 랙 없음" 체감.

---

## 15. 접근성

- root: `role="group"` + `aria-label` (사용자 prop 으로 override 가능).
- Pane: `role="region"` + `aria-label="{label ?? 'Pane 1' / 'Pane 2'}"`. `tabindex` 무지정(내부 포커스 가능한 요소가 있을 것).
- Divider:
  - `role="separator"`
  - `aria-orientation="vertical"` (horizontal split 은 세로 divider) / `"horizontal"`
  - `aria-valuemin="{minPct round}"`, `aria-valuemax="{maxPct round}"`, `aria-valuenow="{sizePct round}"`
  - `aria-controls="{startPane.id} {endPane.id}"` (선택적, id 자동 생성)
  - `aria-label="Resize panes"` (사용자 override 가능)
  - `tabindex="0"` (항상 포커스 가능)
- collapse 상태에서: divider 는 여전히 포커스 가능. `aria-valuenow` 는 0 (start collapse) 또는 100 (end collapse). 스크린리더는 "separator, 0%" 읽음.
- drag 중 `data-dragging="true"` + role/aria 변경 없음 (screen reader 에는 value change announcement 만).
- `CollapseButton`: `<button aria-expanded={!isCollapsed} aria-controls="{pane.id}" aria-label="Toggle sidebar">`.

---

## 16. 알려진 트레이드오프 · 결정

1. **`flex-basis` vs `grid-template-columns`**: flex 선택 (§4.2). grid 는 `transition` 이 track 단위로 동작이 브라우저별 불안정, flex 는 30 년간 안정. grid 는 3+ pane 확장 시 고려 대상.
2. **percent 를 px 로 즉시 변환 (내부 px-only)**: 사용자 의도를 엄밀히 보존하려면 "percent 단위 유지 + render 시만 px 로 계산" 이 맞지만, 드래그 도중 모든 delta 가 px 단위로 들어오고 결과 commit 도 px 이므로 변환을 드래그 시마다 하는 것은 낭비. 대신 ResizeObserver 로 컨테이너가 변했을 때 "원래 저장값이 percent 였는지" 를 모르면 잘못된 clamp 가 일어난다 — 이 tradeoff 는 v1 에서 **저장값은 px 고정**(persist 도 px)으로 수용. percent 지속 보존은 v1.1.
3. **단일 snap 지점**: multi-snap (예: 25/50/75) 도 가능하지만 UX 복잡도 ↑. v1 은 하나. `snapSize` 배열로 확장 여지만 남김.
4. **controlled 에서 storageKey 무시**: owner 의 state 가 진실 근원이므로 이중 persist 가 충돌. dev warn 후 무시. 대안(storageKey 우선) 은 controlled 의미와 어긋남.
5. **collapse 는 컴포넌트가 아닌 "특정 사이즈"**: 별도 `isCollapsed` state 를 두지 않고 sizePx 파생. 장점: single-source-of-truth + 애니메이션 자연스러움. 단점: collapsedSize ≠ 0 일 때 "collapse 상태" 와 "그냥 작음" 이 헷갈릴 수 있다 → 0.5 px tolerance 로 판정 (§8.3).
6. **divider 6 px 고정**: 접근성 WCAG 2.5.5(44 px 타겟)과 충돌. 대신 divider 에 `::before` pseudo-element 로 `-3px ~ +3px` 확장 hit area 제공 (총 12 px). 시각은 그대로 6 px, hit 은 12 px. v1 구현:
   ```css
   .sp-divider::before {
     content: ""; position: absolute;
     inset-inline: -3px; top: 0; bottom: 0;
   }
   .sp-divider[data-orientation="horizontal"]::before {
     inset-block: -3px; left: 0; right: 0; inset-inline: 0;
   }
   ```
7. **persist unit (px vs pct)**: px persist 가 "화면폭 변경 시 같은 크기 유지" 를 의도한 경우 맞지만, "같은 비율 유지" 를 원하는 경우 틀림. v1 은 px. `storageUnit?: "px" | "pct"` 는 v1.1.
8. **2-pane 만 지원**: `Pane, Divider, Pane, Divider, Pane` 같은 3+ 구성은 divider 간 리사이즈 상호작용(한 divider 움직이면 이웃 pane 만/전체 재분배 정책) 결정이 복잡. VSCode/react-resizable-panels 가 채택한 "greedy vs evenly" 선택 옵션 등 설계 공간이 크므로 별도 마이너 릴리스로 분리.
9. **React.memo 사용**: Pane/Divider/CollapseButton 에 memo 적용. Context value 변경 시 이들이 재렌더되는 것을 피하기 위해 Divider 의 `aria-valuenow` 는 DOM ref 로 직접 업데이트.
10. **`useId` 로 ARIA id 생성**: Pane 이 `id` 없이 시작하므로 Root 에서 `useId()` 로 base id 만들고 start/end 에 `-start`/`-end` 접미사.

---

## 17. 후속 작업 (v1.1+)

- **3+ pane (multi-pane)**: `Pane, Divider, Pane, Divider, Pane` 배열 지원. divider 이동 정책 옵션 (`resizeMode: "adjacent" | "distribute"`). 크기 배열 `sizes: SplitPaneSize[]`.
- **nested API 편의**: `layout: [[30, 70], [70, 30]]` 같은 선언형 레이아웃.
- **layout presets**: `presets: { name: string; sizes: number[] }[]` + 버튼 UI.
- **percent persist**: `storageUnit` prop.
- **multi snap**: `snapSizes: SplitPaneSize[]`.
- **touch handle affordance**: 큰 drag dot.
- **drag constraint props**: `resizable: boolean` 동적 차단 외에 `onBeforeResize(sizeDraft) => boolean` 훅.
- **animation preset**: collapse 애니메이션 duration/easing 커스터마이징.
- **demo App 의 사이드바 리사이즈를 SplitPane 기반으로 리팩터링**: 현재 `demo/src/App.tsx` 에 동일 로직이 중복. plastic 스스로 자기 데모를 드레싱하는 데에 사용.
- **PipelineGraphInspector 리팩터링**: `onDividerPointerDown` 제거하고 SplitPane 래퍼로 대체. 이 plan 본 PR 에는 포함하지 않음 (다른 agent 병렬 작업 충돌 회피).
- **SSR 준비**: `localStorage` 접근 `typeof window` 가드 (v1 에서도 이미 포함).

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| useControllable (dual API) | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| pointer drag 훅 패턴 (가장 유사) | `/Users/neo/workspace/plastic/src/components/DataTable/useColumnResize.ts` |
| divider 리사이즈 prior impl (추출 대상) | `/Users/neo/workspace/plastic/src/components/PipelineGraph/PipelineGraphInspector.tsx` (line 315~340) |
| 데모 App 내부 사이드바 리사이즈 (prior, 중복) | `/Users/neo/workspace/plastic/demo/src/App.tsx` (line 191~296) |
| 이전 plan 포맷 참고 (템플릿) | `/Users/neo/workspace/plastic/docs/plans/complete/012-pipelinegraph-component.md` |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 페이지 레이아웃 패턴 | `/Users/neo/workspace/plastic/demo/src/pages/PipelineGraphPage.tsx`, `/Users/neo/workspace/plastic/demo/src/pages/HexViewPage.tsx` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18.3 (기존) + DOM API (`ResizeObserver`, `PointerEvent`, `localStorage`, `requestAnimationFrame`) 만 사용.

번들 영향:
- SplitPane 자체 예상 크기: ~3.5 KB (min), ~1.5 KB (min+gzip).
- plastic 전체 dist 거의 영향 없음.

Browser 지원:
- ResizeObserver: Chrome 64+, Firefox 69+, Safari 13.1+. 모두 ES2020 라이브러리 타깃과 일관.
- PointerEvents: 모든 모던 브라우저.
- `setPointerCapture`: 동일.
- CSS `touch-action: none`: 동일.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/splitpane` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] PipelineGraph / CodeView / HexView / CommandPalette / DataTable / 기타 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./SplitPane";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 의존 없음).
- [ ] Props 문서 섹션이 Props 표로 채워져 있음 (Root/Pane/Divider/CollapseButton 네 개).
- [ ] Usage 섹션에 최소 4 개 스니펫 (기본 / IDE / controlled+persist / nested 2×2).
- [ ] 데모 Playground 에서 모든 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드 단독으로 (마우스 없이) 리사이즈 + collapse toggle 이 가능.
- [ ] 스크린리더(VoiceOver) 에서 divider 의 value 변경이 읽힘.

---

**끝.**
