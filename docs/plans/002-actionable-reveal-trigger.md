# Actionable `reveal` Trigger Variant 설계

## Context

plastic 라이브러리의 Actionable 컴포넌트에 7번째 trigger variant `"reveal"`을 추가한다.
기존 6가지 trigger 중 어느 것도 **"hover → 오버레이 트리거 등장 → 클릭 → content slide + 액션 패널 등장"** 이라는 2단계 인터랙션을 지원하지 않는다.
`icon`의 hover 노출 + `swipe`의 slide 패널을 결합한 새로운 패턴이다.

---

## 인터랙션 플로우

### Stage 1: Overlay (hover/tap)

```
┌───────────────────────────────┬────┐
│         children content      │ 🗑 │ ← overlay trigger (absolute, z-index 3)
└───────────────────────────────┴────┘
                                  ↑
                          gradient fade edge
                          layout에 영향 없음
```

- 마우스: `pointerenter` → overlay fade-in, `pointerleave` → overlay fade-out
- 터치: content 영역 tap → overlay toggle (FadeTrigger 패턴)
- overlay는 컨테이너 우측(또는 좌측) 가장자리에 absolute 배치
- gradient 배경으로 콘텐츠와 자연스럽게 블렌딩
- overlay에 표시되는 내용은 `actions[revealTriggerIndex]`의 icon (또는 `revealTriggerRender` 커스텀 렌더)

### Stage 2: Panel (click/keyboard)

```
┌────────────────────────┬───────────┐
│  children ← slide      │  [편집]   │ ← action panel (absolute, z-index 1)
│                        │  [삭제]   │    수직 stack, content slide로 노출
│                        │  [공유]   │
└────────────────────────┴───────────┘
```

- overlay 트리거 클릭 → overlay fade-out + content `translateX` + 패널 노출 (동시 진행)
- 패널은 content 뒤에 항상 존재 (z-index 1), content가 밀리면서 드러남
- 액션 버튼 클릭 → 패널 닫힘 + action 실행
- content 영역 클릭 → 패널 닫힘 (SwipeTrigger 패턴)
- 패널 열린 상태에서 mouse leave → 패널 유지 (명시적 닫기만 가능)

---

## 응용 시나리오

### 2단계 삭제 버튼
```tsx
<Actionable trigger="reveal" actions={[
  { key: "delete", label: "삭제 확인", icon: <TrashIcon />, variant: "danger", onClick: handleDelete }
]}>
```
- Stage 1: hover → 🗑 아이콘 오버레이 (1단계)
- Stage 2: click → "삭제 확인" 버튼 패널 (2단계 확정)

### 멀티 액션 메뉴
```tsx
<Actionable trigger="reveal"
  revealTriggerRender={() => <MoreIcon />}
  actions={[
    { key: "edit", label: "편집", icon: <EditIcon />, onClick: ... },
    { key: "share", label: "공유", icon: <ShareIcon />, onClick: ... },
    { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: ... },
  ]}
>
```
- Stage 1: hover → "..." 커스텀 오버레이
- Stage 2: click → 3개 버튼 수직 패널

### 좌측 방향
```tsx
<Actionable trigger="reveal" revealDirection="left" ...>
```
- overlay가 좌측에 등장, content는 우측으로 slide, 패널은 좌측에서 노출

---

## Props 설계

### RevealTriggerProps (내부)

```typescript
interface RevealTriggerProps extends TriggerChildProps {
  revealOpen?: boolean | undefined;
  onRevealOpenChange?: ((open: boolean) => void) | undefined;
  revealDirection: "left" | "right";
  revealTriggerIndex: number;
  revealTriggerRender?: ((action: ActionableAction) => ReactNode) | undefined;
  revealOverlayWidth: number;
  revealPanelWidth?: number | undefined;
  revealAnimationDuration: number;
}
```

### ActionableProps 추가분

```typescript
// ── reveal ──────────────────────────────────────────────
revealOpen?: boolean;                                        // controlled 패널 열림 상태
onRevealOpenChange?: (open: boolean) => void;                // 패널 열림 변경 콜백
revealDirection?: "left" | "right";                          // default: "right"
revealTriggerIndex?: number;                                 // default: 0, 오버레이에 표시할 액션 인덱스
revealTriggerRender?: (action: ActionableAction) => ReactNode; // 커스텀 오버레이 렌더 (우선순위 최상위)
revealOverlayWidth?: number;                                 // default: 40 (px)
revealPanelWidth?: number;                                   // 미지정 시 자동 측정
revealAnimationDuration?: number;                            // default: 250 (ms)
```

---

## 내부 상태 머신

```
overlayVisible (boolean) + isOpen (boolean, useControllable)

┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  idle (overlay=false, open=false)                            │
│    ├─ mouse enter ──────→ overlay visible                    │
│    ├─ touch tap ────────→ overlay toggle                     │
│    └─ Enter/Space ──────→ open (키보드는 hover 단계 건너뜀)  │
│                                                              │
│  overlay visible (overlay=true, open=false)                  │
│    ├─ mouse leave ──────→ idle                               │
│    ├─ overlay click ────→ open (overlay→false)               │
│    └─ Escape ───────────→ idle                               │
│                                                              │
│  open (overlay=false, open=true)                             │
│    ├─ action click ─────→ execute → idle                     │
│    ├─ content click ────→ idle                               │
│    ├─ outside click ────→ idle                               │
│    ├─ Escape ───────────→ idle                               │
│    └─ mouse leave ──────→ stays open (명시적 닫기만)          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- `overlayVisible`: 로컬 state, hover/touch 전용
- `isOpen`: `useControllable(revealOpen, false, onRevealOpenChange)` — controlled/uncontrolled 지원
- open 시 `overlayVisible` 강제 `false` (overlay fade-out과 content slide 동시)

---

## DOM 구조

```
<div                                    ← 외부 컨테이너
  role="group"
  aria-roledescription="revealable item"
  tabIndex={0}
  style="position: relative; overflow: hidden"
  onPointerEnter / onPointerLeave
  onKeyDown
>
  <!--── z-index 1: 액션 패널 (content 뒤) ──-->
  <div ref={panelRef}
    role="toolbar"
    aria-label="Actions"
    aria-hidden={!isOpen}
    style="position: absolute; top:0; bottom:0;
           [right|left]: 0; z-index:1;
           display: flex; flex-direction: column;
           align-items: stretch; justify-content: center;
           gap: 2px; padding: 0.25rem"
  >
    {actions.map → <ActionableActionButton mode="reveal" />}
  </div>

  <!--── z-index 2: 콘텐츠 레이어 ──-->
  <div ref={contentRef}
    onClick={handleContentClick}
    style="position: relative; z-index:2;
           background: [theme bg];
           transform: translateX(0 | ±panelWidth);
           transition: transform {duration}ms cubic-bezier(0.25,1,0.5,1)"
  >
    {children}
  </div>

  <!--── z-index 3: 오버레이 트리거 (최상위) ──-->
  <button ref={overlayRef}
    aria-label={triggerAction.label}
    aria-expanded={isOpen}
    style="position: absolute; top:0; bottom:0;
           [right|left]: 0; width: {overlayWidth}px;
           z-index: 3;
           background: linear-gradient(...);
           opacity: overlayVisible ? 1 : 0;
           pointer-events: overlayVisible ? 'auto' : 'none';
           transition: opacity {duration/2}ms ease"
    onClick={handleOverlayClick}
  >
    {triggerContent}
  </button>
</div>
```

**핵심 구조 결정**: overlay는 content의 자식이 아닌 **형제 요소**로 배치.
→ content가 `translateX`로 이동해도 overlay는 제자리에서 독립적으로 fade-out.

---

## 애니메이션 타임라인

모든 시간은 `revealAnimationDuration` (기본 250ms) 기준. Easing: slide는 `cubic-bezier(0.25, 1, 0.5, 1)`, opacity는 `ease`.

### idle → overlay visible (hover)
```
overlay opacity:  0 → 1    (duration/2 = 125ms, ease)
content:          변화 없음
panel:            변화 없음
```

### overlay visible → idle (mouse leave)
```
overlay opacity:  1 → 0    (duration/2 = 125ms, ease)
```

### overlay visible → open (overlay click)
```
동시 진행:
  overlay opacity:      1 → 0                    (duration/2 = 125ms, ease)
  content translateX:   0 → ±panelWidth           (duration = 250ms, cubic-bezier)

panel은 이동하지 않음 — content가 밀리면서 자연스럽게 드러남
```

### open → idle (닫기)
```
content translateX:  ±panelWidth → 0    (duration = 250ms, cubic-bezier)
overlay:             표시 안 함 (다음 hover까지)
```

### translateX 방향
- `revealDirection === "right"`: content slides LEFT → `translateX(-panelWidth)`
- `revealDirection === "left"`:  content slides RIGHT → `translateX(+panelWidth)`

---

## 오버레이 트리거 렌더링

### 결정 로직
```typescript
const triggerIdx = Math.min(revealTriggerIndex, actions.length - 1);
const triggerAction = actions[triggerIdx];

const triggerContent = revealTriggerRender
  ? revealTriggerRender(triggerAction)      // 커스텀 우선
  : triggerAction?.icon ?? <DefaultMoreIcon />;  // icon → fallback "..."
```

### DefaultMoreIcon (내부 private 컴포넌트)
```typescript
function DefaultMoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}
```

### 오버레이 배경 스타일
gradient로 content와 자연스럽게 블렌딩:
```typescript
background: `linear-gradient(
  to ${revealDirection === "right" ? "left" : "right"},
  ${theme === "dark" ? "rgba(31,41,55,0.95)" : "rgba(255,255,255,0.95)"},
  ${theme === "dark" ? "rgba(31,41,55,0)" : "rgba(255,255,255,0)"}
)`
```

---

## 패널 너비 측정

```typescript
const ACTION_BUTTON_WIDTH = 72;
const panelRef = useRef<HTMLDivElement>(null);
const [panelWidth, setPanelWidth] = useState(
  revealPanelWidth ?? actions.length * ACTION_BUTTON_WIDTH
);

useLayoutEffect(() => {
  if (revealPanelWidth !== undefined) {
    setPanelWidth(revealPanelWidth);
    return;
  }
  if (panelRef.current) {
    setPanelWidth(panelRef.current.getBoundingClientRect().width);
  }
}, [actions.length, revealPanelWidth]);
```

- `useLayoutEffect`: paint 전 측정 → 레이아웃 점프 방지
- `revealPanelWidth` prop 제공 시 측정 생략
- 초기값: `actions.length * 72px` (ActionableSwipeTrigger과 동일 상수)

---

## ActionableActionButton `"reveal"` 모드

기존 `mode` 타입에 `"reveal"` 추가:

```typescript
mode?: "icon" | "swipe" | "fade" | "reveal";
```

`"reveal"` 모드 렌더링:
```typescript
if (mode === "reveal") {
  const colors = swipeVariantColors[effectiveVariant][theme];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || action.disabled}
      aria-label={confirmLabel ?? action.label}
      title={confirmLabel ?? action.label}
      style={{
        display: "flex",
        flexDirection: "row",          // 수평: 아이콘 + 라벨 나란히
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "0.375rem",
        width: "100%",                 // 패널 전체 너비
        height: "2.25rem",
        border: "none",
        borderRadius: "0.25rem",
        cursor: ...,
        opacity: ...,
        background: colors.bg,
        color: colors.text,
        fontSize: "0.7rem",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontWeight: 500,
        padding: "0 0.5rem",
        transition: "opacity 0.15s ease",
      }}
    >
      {action.icon && <span style={{ fontSize: "0.9rem" }}>{action.icon}</span>}
      <span>{confirmLabel ?? action.label}</span>
    </button>
  );
}
```

`"swipe"` 와의 차이:
- `flexDirection: "row"` (swipe는 `"column"`)
- 고정 `height: "2.25rem"` (swipe는 `height: "100%"`)
- `width: "100%"` (swipe는 `width: "4.5rem"`)
- `borderRadius: "0.25rem"` 적용
- icon + label 수평 배치

---

## 터치 디바이스 동작

FadeTrigger 패턴 차용:

```typescript
const [touchToggled, setTouchToggled] = useState(false);

const handlePointerEnter = (e: React.PointerEvent) => {
  if (e.pointerType === "touch") return;
  if (!isOpen) setOverlayVisible(true);
};

const handlePointerLeave = (e: React.PointerEvent) => {
  if (e.pointerType === "touch") return;
  if (!isOpen) setOverlayVisible(false);
};
```

터치 tap-to-toggle:
- content 영역 클릭 시 (`isOpen === false`이고 overlay button이 아닌 경우) → overlay toggle
- content 영역 클릭 시 (`isOpen === true`) → 패널 닫기

---

## 키보드 접근성

| 키 | idle | overlay visible | open |
|----|------|-----------------|------|
| Enter/Space | → open (hover 건너뜀) | → open | → close |
| Escape | — | → idle | → close |
| Tab | 다음 요소 | 다음 요소 | → 패널 내 버튼 포커스 |

### 포커스 관리
- open 시 (키보드 트리거): `panelRef.current?.querySelector('button')?.focus()`
- close 시: `containerRef.current?.focus()` (외부 컨테이너로 복귀)

### ARIA
- 외부 컨테이너: `role="group"`, `aria-roledescription="revealable item"`, `tabIndex={0}`
- overlay 버튼: `aria-label={triggerAction.label}`, `aria-expanded={isOpen}`
- 패널: `role="toolbar"`, `aria-label="Actions"`, `aria-hidden={!isOpen}`

---

## 외부 클릭 / Escape 처리

ActionableIconTrigger 패턴 (lines 63-79) 재사용:

```typescript
useEffect(() => {
  if (!isOpen) return;
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      close();
    }
  };
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("keydown", handleEscape);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleEscape);
  };
}, [isOpen, close]);
```

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| `actions.length === 0` | children만 렌더, 인터랙션 없음. early return |
| `revealTriggerIndex` 범위 초과 | `Math.min(idx, actions.length - 1)` 로 clamp |
| `disabled === true` | overlay 표시 안 함, 모든 이벤트 핸들러 early return |
| `phase === "executing" \| "dismissing"` | 위와 동일 — 인터랙션 차단 |
| 급속 연타 | CSS transition 중간에 방향 전환 — 브라우저가 자연스럽게 보간 |
| 테마 전환 (open 상태) | 렌더 시 theme 참조 → 즉시 색상 변경 |
| controlled `revealOpen` 외부 변경 | `useControllable`이 외부 값 우선 반영 |

---

## 수정 대상 파일

### 신규 생성
1. **`src/components/Actionable/ActionableRevealTrigger.tsx`** — 핵심 구현 (~180줄)

### 기존 수정
2. **`src/components/Actionable/Actionable.types.ts`**
   - `ActionableTrigger` union에 `"reveal"` 추가
   - `ActionableProps`에 reveal 전용 props 8개 추가
3. **`src/components/Actionable/ActionableRoot.tsx`**
   - import 추가
   - 함수 시그니처에 reveal props destructuring + defaults
   - switch에 `case "reveal":` 추가
4. **`src/components/Actionable/ActionableActionButton.tsx`**
   - `mode` 타입에 `"reveal"` 추가
   - `"reveal"` 분기 렌더링 코드 추가
5. **`demo/src/pages/ActionablePage.tsx`**
   - `RevealDemo` 섹션 추가 (2단계 삭제, 멀티 액션, 방향 토글)
   - Props 테이블에 Reveal 섹션 추가

---

## 데모 페이지 변경 (`demo/src/pages/ActionablePage.tsx`)

### 기존 구조 파악
현재 데모 페이지 (593줄):
- 아이콘: `EditIcon`, `TrashIcon`, `PinIcon`, `ShareIcon` (SVG inline)
- 공통: `INITIAL_ITEMS` 데이터, `Section` 컴포넌트, `ListWrapper`/`ItemCard` 래퍼
- 데모: `IconDemo`, `IconConfirmDemo`, `SwipeDemo`, `FadeDemo`, `CheckboxDemo`, `DragOutDemo`, `DismissDemo`
- Props: `PropsTable` + 6개 props 배열 (`PROPS_COMMON`, `PROPS_ICON`, `PROPS_SWIPE`, `PROPS_CHECKBOX`, `PROPS_DRAGOUT`, `PROPS_FADE`)
- Usage: `USAGE_CODE` 코드 블록
- **Playground 없음** — 기존에도 미구현

### 추가할 섹션

#### 1. RevealDemo (2단계 삭제)

```tsx
function RevealDeleteDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const remove = useCallback((id: number) =>
    setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <ListWrapper theme={theme}>
      {items.map((item) => (
        <Actionable
          key={item.id}
          trigger="reveal"
          theme={theme}
          actions={[
            { key: "delete", label: "삭제 확인", icon: <TrashIcon />,
              variant: "danger", onClick: () => {} },
          ]}
          dismissAnimation="slide-left"
          onDismiss={() => remove(item.id)}
        >
          <ItemCard item={item} theme={theme} />
        </Actionable>
      ))}
      {/* reset 버튼 */}
    </ListWrapper>
  );
}
```

위치: `<Section title="Reveal (2단계 삭제)" desc="hover → 삭제 아이콘 오버레이 → 클릭 → 삭제 확인 버튼 패널.">`

#### 2. RevealMultiDemo (멀티 액션)

```tsx
function RevealMultiDemo({ theme }: { theme: ActionableTheme }) {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const remove = useCallback((id: number) =>
    setItems((p) => p.filter((i) => i.id !== id)), []);

  return (
    <>
      {/* 방향 토글 버튼 */}
      <div className="flex gap-1.5 mb-3">
        {(["left", "right"] as const).map((d) => (
          <button key={d} onClick={() => setDirection(d)} ...>{d}</button>
        ))}
      </div>
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="reveal"
            theme={theme}
            revealDirection={direction}
            revealTriggerRender={() => <MoreIcon />}
            actions={[
              { key: "edit", label: "편집", icon: <EditIcon />, onClick: () => alert(`편집: ${item.title}`) },
              { key: "share", label: "공유", icon: <ShareIcon />, onClick: () => alert(`공유: ${item.title}`) },
              { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: () => {} },
            ]}
            dismissAnimation="slide-left"
            onDismiss={(k) => k === "delete" && remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
      </ListWrapper>
    </>
  );
}
```

위치: `<Section title="Reveal (멀티 액션)" desc="커스텀 '...' 오버레이 + 다중 액션 패널. 방향 토글 가능.">`

새 아이콘 추가 필요: `MoreIcon` (vertical dots, "⋮")

#### 3. PROPS_REVEAL 테이블

```typescript
const PROPS_REVEAL = [
  ["revealOpen", "boolean", "—", "controlled 패널 열림 상태"],
  ["onRevealOpenChange", "(open: boolean) => void", "—", "패널 열림 변경 콜백"],
  ["revealDirection", '"left" | "right"', '"right"', "오버레이 및 패널 위치"],
  ["revealTriggerIndex", "number", "0", "오버레이 트리거로 사용할 액션 인덱스"],
  ["revealTriggerRender", "(action) => ReactNode", "—", "커스텀 오버레이 트리거 렌더"],
  ["revealOverlayWidth", "number", "40", "오버레이 트리거 버튼 너비 (px)"],
  ["revealPanelWidth", "number", "auto", "고정 패널 너비 (미지정 시 자동 측정)"],
  ["revealAnimationDuration", "number", "250", "애니메이션 지속 시간 (ms)"],
];
```

위치: `<PropsTable title="Reveal" rows={PROPS_REVEAL} />` — 기존 `PROPS_FADE` 뒤에 추가

#### 4. USAGE_CODE 업데이트

기존 코드에 reveal 예시 추가:
```typescript
// Reveal: 2-stage delete
<Actionable
  trigger="reveal"
  actions={[
    { key: "delete", label: "삭제 확인", icon: <TrashIcon />, variant: "danger", onClick: handleDelete },
  ]}
  onDismiss={() => removeItem(id)}
>
  <MyListItem />
</Actionable>

// Reveal: multi-action with custom trigger
<Actionable
  trigger="reveal"
  revealDirection="right"
  revealTriggerRender={() => <MoreIcon />}
  actions={[
    { key: "edit", label: "편집", icon: <EditIcon />, onClick: handleEdit },
    { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: handleDelete },
  ]}
>
  <MyListItem />
</Actionable>
```

#### 5. Playground (신규)

기존 데모 페이지에 Playground가 없으므로 새로 추가. 모든 reveal props를 실시간 조작 가능한 인터랙티브 섹션.

```tsx
function RevealPlayground({ theme }: { theme: ActionableTheme }) {
  // ── 조작 가능한 state ──
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [overlayWidth, setOverlayWidth] = useState(40);
  const [animationDuration, setAnimationDuration] = useState(250);
  const [triggerIndex, setTriggerIndex] = useState(0);
  const [useCustomTrigger, setUseCustomTrigger] = useState(false);
  const [dismissAnim, setDismissAnim] = useState<DismissAnimation>("collapse");
  const [disabled, setDisabled] = useState(false);
  const [items, setItems] = useState(INITIAL_ITEMS);
  
  const remove = useCallback((id: number) =>
    setItems((p) => p.filter((i) => i.id !== id)), []);

  const actions: ActionableAction[] = [
    { key: "edit", label: "편집", icon: <EditIcon />, onClick: () => alert("편집") },
    { key: "share", label: "공유", icon: <ShareIcon />, onClick: () => alert("공유") },
    { key: "delete", label: "삭제", icon: <TrashIcon />, variant: "danger", onClick: () => {} },
  ];

  return (
    <div className="space-y-4">
      {/* ── 컨트롤 패널 ── */}
      <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        
        {/* revealDirection 토글 */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-32">direction</span>
          <select value={direction} onChange={e => setDirection(e.target.value)}>
            <option value="right">right</option>
            <option value="left">left</option>
          </select>
        </label>

        {/* overlayWidth 슬라이더 */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-32">overlayWidth</span>
          <input type="range" min={24} max={80} value={overlayWidth}
            onChange={e => setOverlayWidth(Number(e.target.value))} />
          <span className="text-xs text-gray-400 w-8">{overlayWidth}</span>
        </label>

        {/* animationDuration 슬라이더 */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-32">duration</span>
          <input type="range" min={100} max={800} step={50} value={animationDuration}
            onChange={e => setAnimationDuration(Number(e.target.value))} />
          <span className="text-xs text-gray-400 w-8">{animationDuration}</span>
        </label>

        {/* triggerIndex 선택 */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-32">triggerIndex</span>
          <select value={triggerIndex} onChange={e => setTriggerIndex(Number(e.target.value))}>
            {actions.map((a, i) => (
              <option key={a.key} value={i}>{i}: {a.label}</option>
            ))}
          </select>
        </label>

        {/* customTrigger 토글 */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-32">customTrigger</span>
          <input type="checkbox" checked={useCustomTrigger}
            onChange={e => setUseCustomTrigger(e.target.checked)} />
          <span className="text-xs text-gray-400">revealTriggerRender 사용</span>
        </label>

        {/* dismissAnimation 선택 */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-32">dismissAnim</span>
          <select value={dismissAnim} onChange={e => setDismissAnim(e.target.value)}>
            {["collapse", "slide-left", "slide-right", "fade", "none"].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>

        {/* disabled 토글 */}
        <label className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 w-32">disabled</span>
          <input type="checkbox" checked={disabled}
            onChange={e => setDisabled(e.target.checked)} />
        </label>
      </div>

      {/* ── 프리뷰 영역 ── */}
      <ListWrapper theme={theme}>
        {items.map((item) => (
          <Actionable
            key={item.id}
            trigger="reveal"
            theme={theme}
            revealDirection={direction}
            revealOverlayWidth={overlayWidth}
            revealAnimationDuration={animationDuration}
            revealTriggerIndex={triggerIndex}
            revealTriggerRender={useCustomTrigger ? () => <MoreIcon /> : undefined}
            dismissAnimation={dismissAnim}
            disabled={disabled}
            actions={actions}
            onDismiss={(k) => k === "delete" && remove(item.id)}
          >
            <ItemCard item={item} theme={theme} />
          </Actionable>
        ))}
      </ListWrapper>

      {/* reset 버튼 */}
      <button onClick={() => setItems(INITIAL_ITEMS)} ...>리셋</button>
    </div>
  );
}
```

위치: `<Section title="Playground" desc="모든 reveal props를 실시간 조작.">` — Usage 섹션 뒤에 배치

### 페이지 내 섹션 최종 순서

```
1.  헤더 + 테마 토글 (기존)
2.  Icon Trigger (기존)
3.  Icon Confirm (기존)
4.  Swipe (기존)
5.  Fade (기존)
6.  Checkbox (기존)
7.  Drag-out (기존)
8.  Reveal (2단계 삭제) ← 신규
9.  Reveal (멀티 액션 + 방향 토글) ← 신규
10. Dismiss Animations (기존)
11. Props (기존 + Reveal 추가)
12. Usage (기존 + Reveal 예시 추가)
13. Playground ← 신규
```

---

## 구현 순서

1. `Actionable.types.ts` — 타입 확장 (`"reveal"` + 8개 props)
2. `ActionableActionButton.tsx` — `"reveal"` 모드 추가
3. `ActionableRevealTrigger.tsx` — 핵심 트리거 구현 (신규 파일)
4. `ActionableRoot.tsx` — import + props destructuring + switch 분기
5. `demo/src/pages/ActionablePage.tsx`:
   a. `MoreIcon` SVG 추가
   b. `RevealDeleteDemo` 컴포넌트
   c. `RevealMultiDemo` 컴포넌트 (방향 토글 포함)
   d. `PROPS_REVEAL` 배열 + PropsTable 추가
   e. `USAGE_CODE` 에 reveal 예시 추가
   f. `RevealPlayground` 컴포넌트 (전체 props 인터랙티브 조작)
   g. 페이지에 3개 Section 추가 (Reveal 삭제, Reveal 멀티, Playground)

---

## 검증

```bash
npm run typecheck
npx tsup
cd demo && npm run dev   # http://localhost:5173/#/actionable
```

- [x] 마우스 hover → overlay fade-in/out 부드럽게 동작
- [x] overlay 클릭 → content slide + 패널 등장 동시 진행
- [x] 액션 버튼 클릭 → 패널 닫힘 + action 실행 + dismiss
- [x] content 영역 클릭 → 패널 닫힘
- [x] 외부 클릭 / Escape → 패널 닫힘
- [x] 키보드 Enter/Space → 패널 토글 (hover 단계 건너뜀)
- [x] Tab → 패널 내 버튼 포커스 이동
- [x] `revealDirection="left"` → 좌측 오버레이/패널
- [x] `revealTriggerRender` 커스텀 렌더 동작
- [x] 2단계 삭제 (단일 액션) 시나리오
- [x] 멀티 액션 (3개+) 시나리오
- [x] light/dark 테마 전환
- [x] disabled 상태에서 인터랙션 차단
- [x] 터치 디바이스 tap-to-toggle
