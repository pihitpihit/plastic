# Tooltip / Popover 컴포넌트 설계문서

## Context

plastic 라이브러리에 6번째/7번째 컴포넌트로 **Tooltip**과 **Popover**를 추가한다.
두 컴포넌트는 하나의 공유 포지셔닝 엔진(`useFloating` 훅)을 기반으로 하되, 역할이 명확히 구분된다:

- **Tooltip** — 경량 텍스트 전용. hover/focus로 표시. 내부 인터랙션 없음 (`pointer-events: none`).
- **Popover** — 리치 컨텐츠. click으로 토글. 내부 인터랙션 가능. 외부 클릭/Escape로 닫힘.

두 컴포넌트 모두 **외부 floating/positioning 라이브러리를 사용하지 않고**, `getBoundingClientRect()` + viewport 계산으로 직접 구현한다.
Portal(`document.body`)을 통해 overflow clipping을 회피한다.

기존 라이브러리 패턴을 따른다:
- Compound component (`Object.assign(Root, { Sub1, Sub2 })`)
- TypeScript strict mode (`exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`)
- `useControllable` 훅 (`src/components/_shared/useControllable.ts`)
- 인라인 스타일 + Tailwind 클래스 (외부 CSS 없음)
- `"light" | "dark"` 테마, `Record` 색상 맵

---

## Compound Component 구조

### Tooltip

```
Tooltip.Root          상태 + 포지셔닝 컨텍스트 제공
Tooltip.Trigger       트리거 요소 래퍼 (children에 이벤트 핸들러 주입)
Tooltip.Content       툴팁 버블 (Portal 내 렌더링)
Tooltip.Arrow         선택적 화살표/캐럿
```

### Popover

```
Popover.Root          상태 + 포지셔닝 컨텍스트 제공
Popover.Trigger       트리거 요소
Popover.Content       팝오버 패널 (Portal 내 렌더링, 인터랙티브)
Popover.Arrow         선택적 화살표/캐럿
Popover.Close         컨텐츠 내부 닫기 버튼
Popover.Header        선택적 레이아웃 헬퍼 (제목 영역)
Popover.Body          선택적 레이아웃 헬퍼 (본문 영역)
```

---

## 사용 패턴

### Tooltip — 기본

```tsx
<Tooltip.Root>
  <Tooltip.Trigger>
    <button>Hover me</button>
  </Tooltip.Trigger>
  <Tooltip.Content>This is a tooltip</Tooltip.Content>
</Tooltip.Root>
```

### Tooltip — 화살표 + placement

```tsx
<Tooltip.Root placement="right" showDelay={500}>
  <Tooltip.Trigger>
    <span>Info icon</span>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <Tooltip.Arrow />
    Detailed explanation here
  </Tooltip.Content>
</Tooltip.Root>
```

### Tooltip — 멀티라인

```tsx
<Tooltip.Root>
  <Tooltip.Trigger>
    <button>Details</button>
  </Tooltip.Trigger>
  <Tooltip.Content multiline maxWidth={240}>
    This tooltip contains a longer description that wraps across
    multiple lines for better readability.
  </Tooltip.Content>
</Tooltip.Root>
```

### Tooltip — 제어 모드

```tsx
const [open, setOpen] = useState(false);

<Tooltip.Root open={open} onOpenChange={setOpen}>
  <Tooltip.Trigger>
    <button>Controlled</button>
  </Tooltip.Trigger>
  <Tooltip.Content>Controlled tooltip</Tooltip.Content>
</Tooltip.Root>
```

### Popover — 기본

```tsx
<Popover.Root>
  <Popover.Trigger>
    <button>Open menu</button>
  </Popover.Trigger>
  <Popover.Content>
    <Popover.Arrow />
    <Popover.Header>Settings</Popover.Header>
    <Popover.Body>
      <p>Some interactive content</p>
      <input type="text" placeholder="Type here..." />
      <Popover.Close>
        <button>Done</button>
      </Popover.Close>
    </Popover.Body>
  </Popover.Content>
</Popover.Root>
```

### Popover — hover 모드

```tsx
<Popover.Root triggerMode="hover">
  <Popover.Trigger>
    <button>Hover for details</button>
  </Popover.Trigger>
  <Popover.Content>
    <Popover.Body>
      <p>Rich content on hover</p>
      <a href="/docs">Learn more</a>
    </Popover.Body>
  </Popover.Content>
</Popover.Root>
```

### Popover — 제어 모드

```tsx
const [open, setOpen] = useState(false);

<Popover.Root open={open} onOpenChange={setOpen}>
  <Popover.Trigger>
    <button>Toggle</button>
  </Popover.Trigger>
  <Popover.Content placement="bottom-end">
    <Popover.Body>
      <button onClick={() => setOpen(false)}>Close me</button>
    </Popover.Body>
  </Popover.Content>
</Popover.Root>
```

---

## TypeScript 인터페이스

### 공유 타입

```typescript
// ── Placement ──────────────────────────────────────────────
export type Side = "top" | "right" | "bottom" | "left";
export type Alignment = "start" | "end";
export type Placement = Side | `${Side}-${Alignment}`;

// ── Theme ──────────────────────────────────────────────────
export type FloatingTheme = "light" | "dark";

// ── useFloating 반환 타입 ──────────────────────────────────
export interface FloatingPosition {
  x: number;
  y: number;
}

export interface ArrowPosition {
  x: number | undefined;
  y: number | undefined;
}

export interface UseFloatingReturn {
  /** 실제 적용된 placement (flip 후) */
  placement: Placement;
  /** 컨텐츠 요소의 절대 좌표 (viewport 기준, portal 내) */
  floatingStyles: React.CSSProperties;
  /** 화살표 위치 (컨텐츠 기준 상대 좌표) */
  arrowPosition: ArrowPosition;
  /** 화살표가 가리키는 방향의 반대 side (화살표 border 스타일링용) */
  arrowSide: Side;
  /** 트리거 ref */
  triggerRef: React.RefObject<HTMLElement | null>;
  /** 컨텐츠 ref */
  floatingRef: React.RefObject<HTMLDivElement | null>;
  /** 화살표 ref */
  arrowRef: React.RefObject<HTMLDivElement | null>;
  /** 수동 위치 재계산 */
  update: () => void;
}

export interface UseFloatingOptions {
  placement?: Placement | undefined;
  offset?: number | undefined;
  arrowPadding?: number | undefined;
  enabled?: boolean | undefined;
}
```

### Tooltip 타입

```typescript
// ── Tooltip.Root Props ─────────────────────────────────────
export interface TooltipRootProps {
  children: ReactNode;

  /** 원하는 배치 (기본: "top") */
  placement?: Placement | undefined;

  /** 트리거-컨텐츠 간 거리 px (기본: 8) */
  offset?: number | undefined;

  /** 제어 모드: 열림 상태 */
  open?: boolean | undefined;

  /** 제어 모드: 상태 변경 콜백 */
  onOpenChange?: ((open: boolean) => void) | undefined;

  /** 표시 딜레이 ms (기본: 300) */
  showDelay?: number | undefined;

  /** 숨김 딜레이 ms (기본: 100) */
  hideDelay?: number | undefined;

  /** 테마 (기본: "light") — 툴팁 색상에 영향 */
  theme?: FloatingTheme | undefined;

  /** 비활성화 시 툴팁 미표시 */
  disabled?: boolean | undefined;
}

// ── Tooltip.Trigger Props ──────────────────────────────────
export interface TooltipTriggerProps {
  children: ReactElement;
  /** true면 children을 그대로 렌더링하고 ref/이벤트만 주입.
   *  false(기본)면 <span>으로 래핑 */
  asChild?: boolean | undefined;
}

// ── Tooltip.Content Props ──────────────────────────────────
export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;

  /** 멀티라인 모드 (white-space: normal, 기본 max-width 적용) */
  multiline?: boolean | undefined;

  /** 최대 너비 px (multiline 시 기본: 250) */
  maxWidth?: number | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Tooltip.Arrow Props ────────────────────────────────────
export interface TooltipArrowProps {
  /** 화살표 크기 px (기본: 8) */
  size?: number | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Popover 타입

```typescript
// ── Popover.Root Props ─────────────────────────────────────
export interface PopoverRootProps {
  children: ReactNode;

  /** 원하는 배치 (기본: "bottom") */
  placement?: Placement | undefined;

  /** 트리거-컨텐츠 간 거리 px (기본: 12) */
  offset?: number | undefined;

  /** 제어 모드: 열림 상태 */
  open?: boolean | undefined;

  /** 제어 모드: 상태 변경 콜백 */
  onOpenChange?: ((open: boolean) => void) | undefined;

  /** 트리거 방식 (기본: "click") */
  triggerMode?: "click" | "hover" | undefined;

  /** hover 모드일 때 표시 딜레이 ms (기본: 200) */
  showDelay?: number | undefined;

  /** hover 모드일 때 숨김 딜레이 ms (기본: 300) */
  hideDelay?: number | undefined;

  /** 테마 (기본: "light") */
  theme?: FloatingTheme | undefined;

  /** 비활성화 */
  disabled?: boolean | undefined;

  /** Escape 키로 닫기 (기본: true) */
  closeOnEscape?: boolean | undefined;

  /** 외부 클릭으로 닫기 (기본: true) */
  closeOnOutsideClick?: boolean | undefined;

  /** 포커스 트랩 활성화 (기본: false) */
  trapFocus?: boolean | undefined;
}

// ── Popover.Trigger Props ──────────────────────────────────
export interface PopoverTriggerProps {
  children: ReactElement;
  asChild?: boolean | undefined;
}

// ── Popover.Content Props ──────────────────────────────────
export interface PopoverContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;

  /** 최소 너비 px */
  minWidth?: number | undefined;

  /** 최대 너비 px (기본: 360) */
  maxWidth?: number | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Popover.Arrow Props ────────────────────────────────────
export interface PopoverArrowProps {
  /** 화살표 크기 px (기본: 10) */
  size?: number | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Popover.Close Props ────────────────────────────────────
export interface PopoverCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Popover.Header Props ───────────────────────────────────
export interface PopoverHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

// ── Popover.Body Props ─────────────────────────────────────
export interface PopoverBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

---

## useFloating 훅 설계

### 개요

`useFloating`은 트리거 요소와 떠 있는 컨텐츠 요소 사이의 위치를 계산하는 내부 훅이다.
`src/components/_shared/useFloating.ts`에 위치한다.
외부 라이브러리 없이 `getBoundingClientRect()`, viewport 크기, `ResizeObserver`, 스크롤 이벤트를 이용해 순수 구현한다.

### 핵심 알고리즘

#### 1단계: 기본 좌표 계산 (`computePosition`)

트리거의 `getBoundingClientRect()`에서 12가지 placement에 따라 컨텐츠의 좌상단 좌표를 계산한다.

```typescript
interface Rect {
  x: number;      // viewport 기준 left
  y: number;      // viewport 기준 top
  width: number;
  height: number;
}

function getRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/**
 * placement로부터 side와 alignment를 분리.
 * "top-start" → { side: "top", alignment: "start" }
 * "top" → { side: "top", alignment: undefined }
 */
function parsePlacement(placement: Placement): { side: Side; alignment: Alignment | undefined } {
  const [side, alignment] = placement.split("-") as [Side, Alignment | undefined];
  return { side, alignment };
}

/**
 * 트리거 Rect, 컨텐츠 크기, placement, offset으로 컨텐츠의 viewport 절대 좌표 계산.
 * 반환: { x, y } — 컨텐츠 좌상단의 viewport 기준 좌표
 */
function computeBasePosition(
  triggerRect: Rect,
  floatingWidth: number,
  floatingHeight: number,
  placement: Placement,
  offset: number,
): FloatingPosition {
  const { side, alignment } = parsePlacement(placement);

  let x = 0;
  let y = 0;

  // ── Side에 따른 주축 위치 ─────────────────────
  switch (side) {
    case "top":
      x = triggerRect.x + triggerRect.width / 2 - floatingWidth / 2;
      y = triggerRect.y - floatingHeight - offset;
      break;
    case "bottom":
      x = triggerRect.x + triggerRect.width / 2 - floatingWidth / 2;
      y = triggerRect.y + triggerRect.height + offset;
      break;
    case "left":
      x = triggerRect.x - floatingWidth - offset;
      y = triggerRect.y + triggerRect.height / 2 - floatingHeight / 2;
      break;
    case "right":
      x = triggerRect.x + triggerRect.width + offset;
      y = triggerRect.y + triggerRect.height / 2 - floatingHeight / 2;
      break;
  }

  // ── Alignment에 따른 교차축 조정 ──────────────
  if (alignment) {
    const isVerticalSide = side === "top" || side === "bottom";

    if (isVerticalSide) {
      // 교차축: x축
      if (alignment === "start") {
        x = triggerRect.x;
      } else {
        // alignment === "end"
        x = triggerRect.x + triggerRect.width - floatingWidth;
      }
    } else {
      // side가 left/right — 교차축: y축
      if (alignment === "start") {
        y = triggerRect.y;
      } else {
        y = triggerRect.y + triggerRect.height - floatingHeight;
      }
    }
  }

  return { x, y };
}
```

#### 2단계: Auto-flip (반대쪽 전환)

컨텐츠가 viewport를 벗어나면 반대쪽 side로 전환한다.

```typescript
const OPPOSITE_SIDE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/**
 * 컨텐츠가 현재 side에서 viewport를 벗어나는지 검사.
 * 벗어나면 반대쪽 side에서 들어맞는지 확인하고, 들어맞으면 반대쪽 placement 반환.
 * 양쪽 다 안 맞으면 원래 placement 유지 (shift로 처리).
 */
function flipPlacement(
  triggerRect: Rect,
  floatingWidth: number,
  floatingHeight: number,
  placement: Placement,
  offset: number,
): Placement {
  const { side, alignment } = parsePlacement(placement);
  const pos = computeBasePosition(triggerRect, floatingWidth, floatingHeight, placement, offset);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 현재 side에서 벗어나는지 확인
  let overflows = false;
  switch (side) {
    case "top":
      overflows = pos.y < 0;
      break;
    case "bottom":
      overflows = pos.y + floatingHeight > viewportHeight;
      break;
    case "left":
      overflows = pos.x < 0;
      break;
    case "right":
      overflows = pos.x + floatingWidth > viewportWidth;
      break;
  }

  if (!overflows) return placement;

  // 반대쪽에서 들어맞는지 확인
  const oppositeSide = OPPOSITE_SIDE[side];
  const oppositePlacement: Placement = alignment
    ? `${oppositeSide}-${alignment}`
    : oppositeSide;
  const oppositePos = computeBasePosition(
    triggerRect, floatingWidth, floatingHeight, oppositePlacement, offset,
  );

  let oppositeOverflows = false;
  switch (oppositeSide) {
    case "top":
      oppositeOverflows = oppositePos.y < 0;
      break;
    case "bottom":
      oppositeOverflows = oppositePos.y + floatingHeight > viewportHeight;
      break;
    case "left":
      oppositeOverflows = oppositePos.x < 0;
      break;
    case "right":
      oppositeOverflows = oppositePos.x + floatingWidth > viewportWidth;
      break;
  }

  // 반대쪽이 들어맞으면 전환, 아니면 원래 유지
  return oppositeOverflows ? placement : oppositePlacement;
}
```

#### 3단계: Auto-shift (교차축 밀기)

Side 결정 후, 교차축에서 viewport를 벗어나면 밀어서 맞춘다.

```typescript
const VIEWPORT_PADDING = 8; // viewport 가장자리에서 최소 여백

/**
 * 교차축에서 viewport 안으로 밀어 넣기.
 * clamp 방식: [VIEWPORT_PADDING, viewport - floatingSize - VIEWPORT_PADDING]
 */
function shiftPosition(
  pos: FloatingPosition,
  floatingWidth: number,
  floatingHeight: number,
  side: Side,
): FloatingPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let { x, y } = pos;

  const isVerticalSide = side === "top" || side === "bottom";

  if (isVerticalSide) {
    // 교차축: x축 — 좌우로 밀기
    const minX = VIEWPORT_PADDING;
    const maxX = viewportWidth - floatingWidth - VIEWPORT_PADDING;
    x = Math.max(minX, Math.min(maxX, x));
  } else {
    // 교차축: y축 — 상하로 밀기
    const minY = VIEWPORT_PADDING;
    const maxY = viewportHeight - floatingHeight - VIEWPORT_PADDING;
    y = Math.max(minY, Math.min(maxY, y));
  }

  return { x, y };
}
```

#### 4단계: Arrow 위치 계산

화살표는 항상 트리거의 중심을 가리킨다. 컨텐츠가 shift되어도 화살표는 트리거 중심을 추적한다.

```typescript
/**
 * 화살표 위치를 컨텐츠 상대 좌표로 계산.
 *
 * 화살표는 컨텐츠의 해당 side 가장자리에 붙되,
 * 교차축에서는 "트리거 중심 - 컨텐츠 좌표"로 계산.
 * arrowPadding으로 컨텐츠 모서리에 너무 가까이 붙지 않게 클램핑.
 *
 * 반환: { x, y } — 둘 중 하나만 값이 있음 (교차축 좌표).
 * 화살표 렌더링 시 사용하지 않는 축은 undefined.
 */
function computeArrowPosition(
  triggerRect: Rect,
  floatingPos: FloatingPosition,
  floatingWidth: number,
  floatingHeight: number,
  side: Side,
  arrowSize: number,
  arrowPadding: number,
): ArrowPosition {
  const isVerticalSide = side === "top" || side === "bottom";

  if (isVerticalSide) {
    // 화살표는 x축에서 위치 결정
    const triggerCenterX = triggerRect.x + triggerRect.width / 2;
    const arrowX = triggerCenterX - floatingPos.x - arrowSize / 2;

    // 클램핑: [arrowPadding, floatingWidth - arrowPadding - arrowSize]
    const min = arrowPadding;
    const max = floatingWidth - arrowPadding - arrowSize;
    const clampedX = Math.max(min, Math.min(max, arrowX));

    return { x: clampedX, y: undefined };
  } else {
    // 화살표는 y축에서 위치 결정
    const triggerCenterY = triggerRect.y + triggerRect.height / 2;
    const arrowY = triggerCenterY - floatingPos.y - arrowSize / 2;

    const min = arrowPadding;
    const max = floatingHeight - arrowPadding - arrowSize;
    const clampedY = Math.max(min, Math.min(max, arrowY));

    return { x: undefined, y: clampedY };
  }
}

/**
 * 화살표가 붙는 컨텐츠 side (side의 반대).
 * placement가 "top"이면 화살표는 컨텐츠 "bottom"에 붙음.
 */
function getArrowSide(side: Side): Side {
  return OPPOSITE_SIDE[side];
}
```

#### 전체 좌표 계산 파이프라인

```typescript
/**
 * 전체 파이프라인: measure → flip → compute → shift → arrow
 *
 * triggerEl: 트리거 DOM 요소
 * floatingEl: 컨텐츠 DOM 요소
 * arrowEl: 화살표 DOM 요소 (없으면 null)
 * options: placement, offset, arrowPadding
 */
function calculatePosition(
  triggerEl: HTMLElement,
  floatingEl: HTMLElement,
  arrowEl: HTMLElement | null,
  options: {
    placement: Placement;
    offset: number;
    arrowPadding: number;
  },
): {
  placement: Placement;
  x: number;
  y: number;
  arrowPosition: ArrowPosition;
  arrowSide: Side;
} {
  // 1. Measure
  const triggerRect = getRect(triggerEl);
  const floatingWidth = floatingEl.offsetWidth;
  const floatingHeight = floatingEl.offsetHeight;
  const arrowSize = arrowEl ? arrowEl.offsetWidth : 0;

  // 2. Flip
  const resolvedPlacement = flipPlacement(
    triggerRect, floatingWidth, floatingHeight,
    options.placement, options.offset,
  );

  // 3. Compute base position with resolved placement
  const basePos = computeBasePosition(
    triggerRect, floatingWidth, floatingHeight,
    resolvedPlacement, options.offset,
  );

  // 4. Shift
  const { side } = parsePlacement(resolvedPlacement);
  const shiftedPos = shiftPosition(basePos, floatingWidth, floatingHeight, side);

  // 5. Arrow
  const arrowPosition = arrowEl
    ? computeArrowPosition(
        triggerRect, shiftedPos, floatingWidth, floatingHeight,
        side, arrowSize, options.arrowPadding,
      )
    : { x: undefined, y: undefined };

  const arrowSide = getArrowSide(side);

  return {
    placement: resolvedPlacement,
    x: shiftedPos.x,
    y: shiftedPos.y,
    arrowPosition,
    arrowSide,
  };
}
```

### useFloating 훅 구현

```typescript
// src/components/_shared/useFloating.ts

import { useRef, useState, useCallback, useEffect } from "react";

export function useFloating(options: UseFloatingOptions = {}): UseFloatingReturn {
  const {
    placement: desiredPlacement = "top",
    offset = 8,
    arrowPadding = 8,
    enabled = true,
  } = options;

  const triggerRef = useRef<HTMLElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const arrowRef = useRef<HTMLDivElement | null>(null);

  const [position, setPosition] = useState<{
    placement: Placement;
    x: number;
    y: number;
    arrowPosition: ArrowPosition;
    arrowSide: Side;
  }>({
    placement: desiredPlacement,
    x: 0,
    y: 0,
    arrowPosition: { x: undefined, y: undefined },
    arrowSide: "bottom",
  });

  const update = useCallback(() => {
    const triggerEl = triggerRef.current;
    const floatingEl = floatingRef.current;
    if (!triggerEl || !floatingEl) return;

    const result = calculatePosition(triggerEl, floatingEl, arrowRef.current, {
      placement: desiredPlacement,
      offset,
      arrowPadding,
    });

    setPosition(result);
  }, [desiredPlacement, offset, arrowPadding]);

  // ── 스크롤/리사이즈 자동 재계산 ────────────────
  useEffect(() => {
    if (!enabled) return;

    const triggerEl = triggerRef.current;
    const floatingEl = floatingRef.current;
    if (!triggerEl || !floatingEl) return;

    // 초기 계산
    update();

    // ResizeObserver: 트리거나 컨텐츠 크기 변경 감지
    const resizeObserver = new ResizeObserver(() => {
      update();
    });
    resizeObserver.observe(triggerEl);
    resizeObserver.observe(floatingEl);

    // 스크롤 리스너: 트리거의 모든 scroll ancestor에 등록
    const scrollParents = getScrollParents(triggerEl);
    const onScroll = () => update();
    for (const parent of scrollParents) {
      parent.addEventListener("scroll", onScroll, { passive: true });
    }

    // window resize
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      resizeObserver.disconnect();
      for (const parent of scrollParents) {
        parent.removeEventListener("scroll", onScroll);
      }
      window.removeEventListener("resize", onScroll);
    };
  }, [enabled, update]);

  const floatingStyles: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    transform: `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`,
    // GPU 가속을 위해 transform 사용 (top/left 애니메이션보다 성능 우수)
    willChange: "transform",
  };

  return {
    placement: position.placement,
    floatingStyles,
    arrowPosition: position.arrowPosition,
    arrowSide: position.arrowSide,
    triggerRef,
    floatingRef,
    arrowRef,
    update,
  };
}
```

### Scroll Ancestor 탐색 유틸

```typescript
/**
 * 요소의 모든 스크롤 가능한 조상 탐색.
 * overflow: auto | scroll | overlay 를 가진 요소 수집.
 * 마지막에 window(document) 포함.
 */
function getScrollParents(element: HTMLElement): (HTMLElement | Window)[] {
  const parents: (HTMLElement | Window)[] = [];
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const style = getComputedStyle(current);
    const overflow = style.overflow + style.overflowX + style.overflowY;

    if (/auto|scroll|overlay/.test(overflow)) {
      parents.push(current);
    }

    current = current.parentElement;
  }

  parents.push(window);
  return parents;
}
```

### 성능 고려사항

- `update()` 함수는 `requestAnimationFrame`으로 래핑하지 않는다 — 스크롤/리사이즈 이벤트 자체가 rAF에 동기화되므로 이중 스케줄링 불필요
- `position: fixed` + `transform` 사용으로 layout thrashing 최소화
- `{ passive: true }` 스크롤 리스너로 메인 스레드 블로킹 방지
- `ResizeObserver`는 컨텐츠 크기 변경 시에만 콜백 — 불필요한 재계산 없음

---

## Context 구조

### Tooltip Context

```typescript
interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  showDelay: number;
  hideDelay: number;
  disabled: boolean;
  theme: FloatingTheme;

  // useFloating 반환값 전달
  triggerRef: React.RefObject<HTMLElement | null>;
  floatingRef: React.RefObject<HTMLDivElement | null>;
  arrowRef: React.RefObject<HTMLDivElement | null>;
  floatingStyles: React.CSSProperties;
  arrowPosition: ArrowPosition;
  arrowSide: Side;
  placement: Placement;
  update: () => void;

  // 딜레이 제어용
  showTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  hideTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;

  // 접근성
  contentId: string;   // useId()로 생성
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContext);
  if (!ctx) throw new Error("Tooltip sub-components must be used within <Tooltip.Root>");
  return ctx;
}
```

### Popover Context

```typescript
interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerMode: "click" | "hover";
  showDelay: number;
  hideDelay: number;
  disabled: boolean;
  theme: FloatingTheme;
  closeOnEscape: boolean;
  closeOnOutsideClick: boolean;
  trapFocus: boolean;

  // useFloating 반환값 전달
  triggerRef: React.RefObject<HTMLElement | null>;
  floatingRef: React.RefObject<HTMLDivElement | null>;
  arrowRef: React.RefObject<HTMLDivElement | null>;
  floatingStyles: React.CSSProperties;
  arrowPosition: ArrowPosition;
  arrowSide: Side;
  placement: Placement;
  update: () => void;

  // 딜레이 제어용
  showTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  hideTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;

  // 접근성
  contentId: string;
  triggerId: string;

  // 닫기 함수 (Popover.Close에서 사용)
  close: () => void;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopoverContext(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("Popover sub-components must be used within <Popover.Root>");
  return ctx;
}
```

---

## 상태 머신

### Tooltip 상태

```
┌────────────────────────────────────────────────────────────────┐
│  CLOSED                                                         │
│    ├─ mouseenter / focus ──→ DELAY_SHOW (showDelay 타이머 시작)  │
│    └─ (disabled) ─────────→ CLOSED (전환 차단)                   │
└────────────────────────────────────────────────────────────────┘
              ↑                                    │
              │                                    ↓
┌─────────────┤           ┌─────────────────────────────────────┐
│             │           │  DELAY_SHOW                          │
│  mouseleave │           │    ├─ 타이머 만료 ─→ ANIMATING_IN    │
│  / blur     │           │    └─ mouseleave/blur ─→ CLOSED      │
│             │           │        (타이머 취소)                   │
└─────────────┘           └─────────────────────────────────────┘
                                                   │
              ↑                                    ↓
┌─────────────┤           ┌─────────────────────────────────────┐
│             │           │  ANIMATING_IN                        │
│  mouseleave │           │    (opacity 0→1, scale 0.95→1)       │
│  / blur     │           │    ├─ 애니메이션 완료 ─→ OPEN         │
│  (즉시 전환  │           │    └─ mouseleave/blur ─→ DELAY_HIDE  │
│   가능)      │           └─────────────────────────────────────┘
└─────────────┘                                    │
                                                   ↓
              ↑           ┌─────────────────────────────────────┐
              │           │  OPEN                                │
              │           │    └─ mouseleave/blur ─→ DELAY_HIDE  │
              │           └─────────────────────────────────────┘
              │                                    │
              │                                    ↓
              │           ┌─────────────────────────────────────┐
              │           │  DELAY_HIDE                          │
              │           │    ├─ 타이머 만료 ─→ ANIMATING_OUT   │
              │           │    └─ mouseenter/focus ─→ OPEN       │
              │           │        (타이머 취소)                   │
              │           └─────────────────────────────────────┘
              │                                    │
              │                                    ↓
              │           ┌─────────────────────────────────────┐
              │           │  ANIMATING_OUT                       │
              └───────────│    (opacity 1→0, scale 1→0.95)       │
                          │    ├─ 애니메이션 완료 ─→ CLOSED       │
                          │    └─ mouseenter/focus ─→ ANIMATING_IN│
                          └─────────────────────────────────────┘
```

#### 구현 단순화

실제 구현에서는 6가지 상태 전체를 상태 머신으로 만들지 않고, 다음 3가지 상태 변수로 관리한다:

```typescript
// open: boolean — 논리적 열림/닫힘 (useControllable)
// animationState: "idle" | "entering" | "exiting" — 애니메이션 단계
// isVisible: boolean — DOM에 마운트 여부 (open || animationState !== "idle")

const [open, setOpen] = useControllable(controlledOpen, false, onOpenChange);
const [animationState, setAnimationState] = useState<"idle" | "entering" | "exiting">("idle");

// open 변경 시 애니메이션 트리거
useEffect(() => {
  if (open) {
    setAnimationState("entering");
  } else if (animationState !== "idle") {
    setAnimationState("exiting");
  }
}, [open]);

// 애니메이션 종료 핸들러 (onTransitionEnd)
const handleAnimationEnd = () => {
  setAnimationState("idle");
};

// DOM 마운트 여부
const isVisible = open || animationState !== "idle";
```

### Popover 상태

Tooltip과 유사하되 추가 전환이 있다:

```
OPEN 상태에서:
  ├─ 외부 클릭 (closeOnOutsideClick) ──→ ANIMATING_OUT
  ├─ Escape 키 (closeOnEscape) ────────→ ANIMATING_OUT
  ├─ Popover.Close 클릭 ──────────────→ ANIMATING_OUT
  └─ 트리거 재클릭 ───────────────────→ ANIMATING_OUT

hover 모드 시:
  Tooltip과 동일한 delay/enter/leave 로직 적용.
  단, 컨텐츠 영역 위에서도 열린 상태 유지
  (Tooltip과 달리 pointer-events 있음).
```

---

## DOM 구조

### Tooltip DOM

```html
<!-- 원래 위치 (in-place) -->
<span ref={triggerRef}
      aria-describedby={contentId}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}>
  {/* trigger children */}
  <button>Hover me</button>
</span>

<!-- Portal: document.body에 마운트 -->
<div role="tooltip"
     id={contentId}
     ref={floatingRef}
     style={{
       position: "fixed",
       top: 0,
       left: 0,
       transform: "translate(120px, 45px)",
       willChange: "transform",
       zIndex: 9999,
       pointerEvents: "none",
       /* 애니메이션 관련 */
       opacity: animationState === "entering" ? 1 : 0,
       transition: "opacity 100ms ease, transform 100ms ease",
       ...contentStyle,
     }}>
  {/* Arrow (Content 내부에 선언) */}
  <div ref={arrowRef}
       style={{
         position: "absolute",
         width: 8,
         height: 8,
         background: "inherit",
         transform: "rotate(45deg)",
         /* side에 따라 bottom/top/left/right + 좌표 */
         bottom: -4,
         left: "calc(arrowPosition.x)px",
       }} />
  This is a tooltip
</div>
```

### Popover DOM

```html
<!-- 원래 위치 -->
<button ref={triggerRef}
        id={triggerId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        onClick={handleTriggerClick}>
  Open menu
</button>

<!-- Portal: document.body -->
<div role="dialog"
     id={contentId}
     ref={floatingRef}
     aria-labelledby={triggerId}
     style={{
       position: "fixed",
       top: 0,
       left: 0,
       transform: "translate(200px, 80px)",
       willChange: "transform",
       zIndex: 9998,
       /* 애니메이션 */
       opacity: ...,
       transition: "opacity 150ms cubic-bezier(0.16,1,0.3,1), transform 150ms cubic-bezier(0.16,1,0.3,1)",
       ...contentStyle,
     }}>
  {/* Arrow */}
  <div ref={arrowRef} style={{ ... }} />

  {/* Header */}
  <div style={{ padding: "12px 16px", borderBottom: "1px solid ...", fontWeight: 600 }}>
    Settings
  </div>

  {/* Body */}
  <div style={{ padding: "12px 16px" }}>
    <p>Content here</p>
    <button>
      {/* Popover.Close — onClick → ctx.close() */}
      Done
    </button>
  </div>
</div>
```

### Portal 구현

```typescript
// src/components/_shared/Portal.tsx

import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
```

---

## 테마 색상 맵

### Tooltip 색상

Tooltip은 기본적으로 **테마의 반전** 색상을 사용한다 (light 테마에서 어두운 배경).

```typescript
const tooltipBg: Record<FloatingTheme, string> = {
  light: "#1f2937",   // gray-800
  dark: "#f3f4f6",    // gray-100
};

const tooltipText: Record<FloatingTheme, string> = {
  light: "#f9fafb",   // gray-50
  dark: "#111827",    // gray-900
};

const tooltipBorder: Record<FloatingTheme, string> = {
  light: "#374151",   // gray-700
  dark: "#e5e7eb",    // gray-200
};

const tooltipArrowBg: Record<FloatingTheme, string> = {
  // 화살표 배경은 컨텐츠 배경과 동일
  light: "#1f2937",
  dark: "#f3f4f6",
};
```

### Popover 색상

Popover는 Card와 유사한 **테마 동일** 색상 (light에서 밝은 배경).

```typescript
const popoverBg: Record<FloatingTheme, string> = {
  light: "#ffffff",
  dark: "#1f2937",    // gray-800
};

const popoverText: Record<FloatingTheme, string> = {
  light: "#111827",   // gray-900
  dark: "#f3f4f6",    // gray-100
};

const popoverBorder: Record<FloatingTheme, string> = {
  light: "#e5e7eb",   // gray-200
  dark: "#374151",    // gray-700
};

const popoverShadow: Record<FloatingTheme, string> = {
  light: "0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)",
  dark: "0 4px 16px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)",
};

const popoverArrowBg: Record<FloatingTheme, string> = {
  light: "#ffffff",
  dark: "#1f2937",
};

const popoverArrowBorder: Record<FloatingTheme, string> = {
  light: "#e5e7eb",
  dark: "#374151",
};

const popoverHeaderBorderBottom: Record<FloatingTheme, string> = {
  light: "#f3f4f6",   // gray-100
  dark: "#374151",    // gray-700
};

const popoverCloseBg: Record<FloatingTheme, string> = {
  light: "transparent",
  dark: "transparent",
};

const popoverCloseHoverBg: Record<FloatingTheme, string> = {
  light: "#f3f4f6",   // gray-100
  dark: "#374151",    // gray-700
};

const popoverCloseText: Record<FloatingTheme, string> = {
  light: "#6b7280",   // gray-500
  dark: "#9ca3af",    // gray-400
};
```

---

## 애니메이션 스펙

### Tooltip

| 상태 | 속성 | 시작값 | 종료값 | 시간 | 이징 |
|------|------|--------|--------|------|------|
| 진입 (entering) | `opacity` | `0` | `1` | 100ms | `ease` |
| 진입 (entering) | `transform` (scale) | `scale(0.95)` | `scale(1)` | 100ms | `ease` |
| 퇴장 (exiting) | `opacity` | `1` | `0` | 100ms | `ease` |
| 퇴장 (exiting) | `transform` (scale) | `scale(1)` | `scale(0.95)` | 100ms | `ease` |

transform에는 translate(포지셔닝)와 scale(애니메이션)이 결합된다:

```typescript
// entering
transform: `translate(${x}px, ${y}px) scale(1)`
opacity: 1

// exiting
transform: `translate(${x}px, ${y}px) scale(0.95)`
opacity: 0

// idle (숨김)
// DOM에서 제거 (isVisible === false)
```

### Popover

Popover는 배치 방향에 따라 약간의 translate 오프셋으로 진입/퇴장한다.

| 상태 | 속성 | 시작값 | 종료값 | 시간 | 이징 |
|------|------|--------|--------|------|------|
| 진입 | `opacity` | `0` | `1` | 150ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| 진입 | slide offset | placement 방향 4px | 0px | 150ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| 퇴장 | `opacity` | `1` | `0` | 100ms | `ease` |
| 퇴장 | slide offset | 0px | placement 방향 4px | 100ms | `ease` |

방향별 slide offset 계산:

```typescript
function getSlideTransform(side: Side, entering: boolean): string {
  const distance = entering ? 0 : 4;
  const origin = entering ? 4 : 0;
  // 현재 단계의 offset
  const d = entering ? origin : distance;

  switch (side) {
    case "top":    return `translateY(${d}px)`;     // 아래에서 위로
    case "bottom": return `translateY(-${d}px)`;    // 위에서 아래로
    case "left":   return `translateX(${d}px)`;     // 오른쪽에서 왼쪽으로
    case "right":  return `translateX(-${d}px)`;    // 왼쪽에서 오른쪽으로
  }
}

// 실제 적용: 포지셔닝 translate + 슬라이드 translate 결합
// entering 시작:
transform: `translate(${x}px, ${y}px) translateY(-4px)`  // side === "bottom"
opacity: 0

// entering 끝 (transition 후):
transform: `translate(${x}px, ${y}px) translateY(0px)`
opacity: 1
```

### 애니메이션 구현 방식

CSS transition 기반. `onTransitionEnd`로 애니메이션 완료 감지:

```typescript
// Content 컴포넌트 내부
const style: React.CSSProperties = {
  ...floatingStyles,
  opacity: animationState === "entering" ? 1 : 0,
  transform: [
    floatingStyles.transform,  // translate(x, y)
    getAnimationTransform(arrowSide, animationState),
  ].join(" "),
  transition: isTooltip
    ? "opacity 100ms ease, transform 100ms ease"
    : animationState === "entering"
      ? "opacity 150ms cubic-bezier(0.16,1,0.3,1), transform 150ms cubic-bezier(0.16,1,0.3,1)"
      : "opacity 100ms ease, transform 100ms ease",
};

// onTransitionEnd에서 exiting → idle 전환
const handleTransitionEnd = (e: React.TransitionEvent) => {
  if (e.propertyName === "opacity" && animationState === "exiting") {
    setAnimationState("idle");
  }
};
```

### entering 시작 시점: 2프레임 트릭

DOM에 마운트한 직후에는 `opacity: 0` 상태로 렌더링하고, 다음 rAF에서 `opacity: 1`로 전환해야 transition이 발동한다:

```typescript
useEffect(() => {
  if (open && animationState === "idle") {
    // 1. mount with opacity 0
    setAnimationState("mounting");
    // 2. next frame: trigger transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimationState("entering");
      });
    });
  } else if (!open && animationState === "entering") {
    setAnimationState("exiting");
  }
}, [open]);
```

실제 animationState는 4가지: `"idle" | "mounting" | "entering" | "exiting"`

- `idle` → DOM 미마운트
- `mounting` → DOM 마운트, opacity 0 (transition 준비)
- `entering` → opacity 1, scale/slide 적용 (transition 발동)
- `exiting` → opacity 0, scale/slide 역적용 (transition 발동) → `onTransitionEnd` → `idle`

---

## 접근성

### Tooltip 접근성

| 요소 | 속성 | 값 |
|------|------|---|
| Trigger 래퍼 | `aria-describedby` | `contentId` (열려 있을 때만) |
| Content `<div>` | `role` | `"tooltip"` |
| Content `<div>` | `id` | `contentId` (useId 생성) |

키보드:
- `Tab`으로 트리거에 포커스 → 툴팁 표시
- `Tab`으로 포커스 이탈 → 툴팁 숨김
- `Escape` 키 → 툴팁 즉시 숨김 (포커스 유지)

주의:
- 툴팁은 `pointer-events: none` — 마우스로 접근 불가 (WAI-ARIA tooltip 패턴)
- 트리거가 `<button>` 등 인터랙티브 요소여야 키보드 접근 가능

### Popover 접근성

| 요소 | 속성 | 값 |
|------|------|---|
| Trigger | `id` | `triggerId` (useId 생성) |
| Trigger | `aria-haspopup` | `"dialog"` |
| Trigger | `aria-expanded` | `open` (boolean) |
| Trigger | `aria-controls` | `contentId` (열려 있을 때만) |
| Content `<div>` | `role` | `"dialog"` |
| Content `<div>` | `id` | `contentId` |
| Content `<div>` | `aria-labelledby` | `triggerId` |
| Close `<button>` | `aria-label` | `"Close"` (children이 아이콘일 때) |

키보드:
- `Enter`/`Space` → 팝오버 토글
- `Escape` → 팝오버 닫기 + 트리거로 포커스 복귀
- `Tab` → 팝오버 내부 포커스 이동 (trapFocus 시 내부 순환)

### 포커스 트랩 구현 (`trapFocus: true`)

```typescript
// Popover.Content 내부

useEffect(() => {
  if (!open || !trapFocus) return;

  const el = floatingRef.current;
  if (!el) return;

  const focusableSelector = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled])',
    'select:not([disabled])', 'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(", ");

  const getFocusableElements = () =>
    Array.from(el.querySelectorAll<HTMLElement>(focusableSelector));

  // 초기 포커스: 첫 번째 focusable 요소
  const focusables = getFocusableElements();
  if (focusables.length > 0) {
    focusables[0]!.focus();
  } else {
    el.setAttribute("tabindex", "-1");
    el.focus();
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;

    const currentFocusables = getFocusableElements();
    if (currentFocusables.length === 0) return;

    const first = currentFocusables[0]!;
    const last = currentFocusables[currentFocusables.length - 1]!;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  el.addEventListener("keydown", handleKeyDown);
  return () => el.removeEventListener("keydown", handleKeyDown);
}, [open, trapFocus]);
```

### Escape 키 처리

```typescript
// Popover.Root 내부
useEffect(() => {
  if (!open || !closeOnEscape) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation(); // 중첩 팝오버 시 가장 안쪽만 닫기
      setOpen(false);
      // 트리거로 포커스 복귀
      triggerRef.current?.focus();
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [open, closeOnEscape]);
```

### 외부 클릭 처리

```typescript
// Popover.Root 내부
useEffect(() => {
  if (!open || !closeOnOutsideClick) return;

  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as Node;
    const triggerEl = triggerRef.current;
    const floatingEl = floatingRef.current;

    // 트리거 또는 컨텐츠 내부 클릭은 무시
    if (triggerEl?.contains(target)) return;
    if (floatingEl?.contains(target)) return;

    setOpen(false);
  };

  // pointerdown이 mousedown보다 먼저 발생 — 더 빠른 응답
  // setTimeout으로 현재 클릭 이벤트 이후에 등록 (즉시 닫힘 방지)
  const timeoutId = setTimeout(() => {
    document.addEventListener("pointerdown", handlePointerDown);
  }, 0);

  return () => {
    clearTimeout(timeoutId);
    document.removeEventListener("pointerdown", handlePointerDown);
  };
}, [open, closeOnOutsideClick]);
```

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| **Viewport 모서리** | flip으로 반대 side 전환. 양쪽 다 넘치면 원래 side 유지 + shift로 교차축 밀기. VIEWPORT_PADDING(8px) 최소 여백 보장 |
| **스크롤 컨테이너 내 트리거** | getScrollParents로 모든 scroll ancestor에 리스너 등록. 스크롤 시 위치 재계산 |
| **트리거 크기 변경** | ResizeObserver로 감지 → 위치 재계산 |
| **컨텐츠 크기 변경** | ResizeObserver로 감지 → 위치 재계산 (동적 컨텐츠) |
| **중첩 Popover** | 각 Popover.Root가 독립 컨텍스트. Escape는 stopPropagation으로 가장 안쪽만 닫기. 외부 클릭은 내부 팝오버의 floatingRef.contains로 보호 |
| **중첩 Tooltip in Popover** | 정상 동작 — 각 독립 컨텍스트. Portal이 document.body에 마운트되므로 z-index로 레이어링 |
| **트리거가 사라짐** | triggerRef.current가 null이면 update() 무시. open이면 강제 닫기 |
| **빠른 hover in/out** | 딜레이 타이머가 서로 취소. clearTimeout으로 이전 타이머 폐기 |
| **Popover hover 모드: 트리거→컨텐츠 이동** | hideDelay(300ms) 동안 컨텐츠에 mouseenter하면 타이머 취소. 트리거와 컨텐츠 사이 갭에서 마우스가 빠르게 이동해도 닫히지 않음 |
| **SSR** | Portal은 document.body 의존 — useEffect에서만 마운트. 서버에서는 null 렌더링 |
| **window resize** | resize 이벤트로 위치 재계산 |
| **모바일 터치** | Tooltip: touchstart로 표시, touchend/다른곳 터치로 숨김. Popover: 기존 click 이벤트로 동작 |
| **disabled 트리거** | disabled prop이 true면 이벤트 핸들러 바인딩 안 함. 이미 열려있으면 닫기 |
| **RTL** | start/end alignment는 논리적 방향이 아닌 물리적 방향 (CSS writing-mode 무관). 필요 시 향후 확장 |
| **animation 중 재트리거** | exiting 중 mouseenter → 즉시 entering으로 전환 (부드러운 반전) |
| **transform된 부모** | position: fixed는 transform된 조상이 있으면 해당 조상 기준. Portal(document.body)로 우회하므로 문제 없음 |
| **Tooltip Content가 없을 때** | children이 falsy면 렌더링하지 않음 |
| **Arrow 클램핑** | 트리거가 매우 작고 컨텐츠가 크게 shift되면 화살표가 모서리에 너무 가까워짐 → arrowPadding(8px)으로 최소 거리 보장 |

---

## 수정 대상 파일

### 신규 생성

1. **`src/components/_shared/useFloating.ts`** — 포지셔닝 엔진 훅 (~250줄)
2. **`src/components/_shared/Portal.tsx`** — createPortal 래퍼 (~10줄)
3. **`src/components/_shared/useAnimationState.ts`** — mount/enter/exit 애니메이션 상태 관리 훅 (~50줄)
4. **`src/components/Tooltip/Tooltip.types.ts`** — 전체 타입 정의
5. **`src/components/Tooltip/TooltipRoot.tsx`** — Context, useControllable, useFloating, 딜레이 로직 (~100줄)
6. **`src/components/Tooltip/TooltipTrigger.tsx`** — ref/이벤트 주입, cloneElement 또는 span 래핑 (~60줄)
7. **`src/components/Tooltip/TooltipContent.tsx`** — Portal + 스타일 + 애니메이션 + role="tooltip" (~80줄)
8. **`src/components/Tooltip/TooltipArrow.tsx`** — 화살표 SVG/div 렌더링 (~40줄)
9. **`src/components/Tooltip/Tooltip.tsx`** — Object.assign 조립
10. **`src/components/Tooltip/index.ts`** — 배럴 export
11. **`src/components/Popover/Popover.types.ts`** — 전체 타입 정의
12. **`src/components/Popover/PopoverRoot.tsx`** — Context, useControllable, useFloating, 외부 클릭, Escape (~130줄)
13. **`src/components/Popover/PopoverTrigger.tsx`** — click/hover 이벤트 (~60줄)
14. **`src/components/Popover/PopoverContent.tsx`** — Portal + 스타일 + 애니메이션 + role="dialog" + 포커스 트랩 (~120줄)
15. **`src/components/Popover/PopoverArrow.tsx`** — 화살표 (~40줄)
16. **`src/components/Popover/PopoverClose.tsx`** — 닫기 버튼 (~25줄)
17. **`src/components/Popover/PopoverHeader.tsx`** — 헤더 레이아웃 (~20줄)
18. **`src/components/Popover/PopoverBody.tsx`** — 본문 레이아웃 (~15줄)
19. **`src/components/Popover/Popover.tsx`** — Object.assign 조립
20. **`src/components/Popover/index.ts`** — 배럴 export
21. **`demo/src/pages/TooltipPopoverPage.tsx`** — 통합 데모 페이지 (~600줄)

### 기존 수정

22. **`src/components/index.ts`** — `export * from "./Tooltip"`, `export * from "./Popover"` 추가
23. **`demo/src/App.tsx`** — NAV에 Tooltip/Popover 엔트리 추가, import, 라우팅

---

## 데모 페이지

### NAV 엔트리

```typescript
{
  id: "tooltip-popover",
  label: "Tooltip / Popover",
  description: "Floating UI",
  sections: [
    { label: "Tooltip Basic", id: "tooltip-basic" },
    { label: "Tooltip Placements", id: "tooltip-placements" },
    { label: "Tooltip Arrow", id: "tooltip-arrow" },
    { label: "Tooltip Delay", id: "tooltip-delay" },
    { label: "Popover Basic", id: "popover-basic" },
    { label: "Popover Placements", id: "popover-placements" },
    { label: "Popover Content", id: "popover-content" },
    { label: "Popover Controlled", id: "popover-controlled" },
    { label: "Auto-flip", id: "auto-flip" },
    { label: "Dark Theme", id: "dark-theme" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ],
}
```

### 데모 섹션 상세

#### 1. Tooltip Basic (`tooltip-basic`)

4방향(top, right, bottom, left) 버튼에 기본 툴팁:

```tsx
<div className="flex gap-4">
  {(["top", "right", "bottom", "left"] as const).map((p) => (
    <Tooltip.Root key={p} placement={p}>
      <Tooltip.Trigger>
        <Button variant="secondary">{p}</Button>
      </Tooltip.Trigger>
      <Tooltip.Content>Tooltip on {p}</Tooltip.Content>
    </Tooltip.Root>
  ))}
</div>
```

#### 2. Tooltip Placements (`tooltip-placements`)

12가지 placement를 십자 형태 그리드에 배치:

```
                top-start    top    top-end
left-start                                right-start
left                                      right
left-end                                  right-end
                bottom-start bottom bottom-end
```

각 위치에 작은 버튼, hover 시 해당 placement로 툴팁 표시.

#### 3. Tooltip Arrow (`tooltip-arrow`)

화살표가 있는 툴팁. 다양한 placement에서 화살표가 자동으로 위치 조정되는 것 시연:

```tsx
<Tooltip.Root placement="top">
  <Tooltip.Trigger><Button>With Arrow</Button></Tooltip.Trigger>
  <Tooltip.Content>
    <Tooltip.Arrow />
    Arrow tooltip
  </Tooltip.Content>
</Tooltip.Root>
```

#### 4. Tooltip Delay (`tooltip-delay`)

showDelay/hideDelay 커스텀:

```tsx
<Tooltip.Root showDelay={0} hideDelay={0}>...즉시</Tooltip.Root>
<Tooltip.Root showDelay={300} hideDelay={100}>...기본</Tooltip.Root>
<Tooltip.Root showDelay={1000} hideDelay={500}>...느리게</Tooltip.Root>
```

#### 5. Popover Basic (`popover-basic`)

기본 click 팝오버:

```tsx
<Popover.Root>
  <Popover.Trigger><Button>Click me</Button></Popover.Trigger>
  <Popover.Content>
    <Popover.Arrow />
    <Popover.Header>Popover Title</Popover.Header>
    <Popover.Body>
      <p>Some content inside the popover.</p>
      <Popover.Close><Button variant="ghost" size="sm">Close</Button></Popover.Close>
    </Popover.Body>
  </Popover.Content>
</Popover.Root>
```

#### 6. Popover Placements (`popover-placements`)

Tooltip과 동일한 십자 그리드, click으로 열기.

#### 7. Popover Content (`popover-content`)

다양한 인터랙티브 컨텐츠:
- 폼 (input + submit)
- 리스트 (체크박스 목록)
- 중첩 팝오버

```tsx
{/* 폼 */}
<Popover.Root>
  <Popover.Trigger><Button>Edit Name</Button></Popover.Trigger>
  <Popover.Content>
    <Popover.Header>Edit</Popover.Header>
    <Popover.Body>
      <input type="text" placeholder="Name" style={{ ... }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Popover.Close><Button variant="primary" size="sm">Save</Button></Popover.Close>
        <Popover.Close><Button variant="ghost" size="sm">Cancel</Button></Popover.Close>
      </div>
    </Popover.Body>
  </Popover.Content>
</Popover.Root>
```

#### 8. Popover Controlled (`popover-controlled`)

외부 상태로 제어:

```tsx
const [open, setOpen] = useState(false);

<div>
  <Button onClick={() => setOpen(v => !v)}>
    {open ? "Close" : "Open"} externally
  </Button>
  <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger><Button>Trigger</Button></Popover.Trigger>
    <Popover.Content>Controlled popover</Popover.Content>
  </Popover.Root>
</div>
```

#### 9. Auto-flip (`auto-flip`)

viewport 가장자리 근처에 배치된 트리거. 스크롤하거나 화면 크기를 줄여서 flip 동작 확인:

```tsx
<div style={{ display: "flex", justifyContent: "space-between" }}>
  {/* 왼쪽 가장자리 */}
  <Tooltip.Root placement="left">
    <Tooltip.Trigger><Button>Left edge</Button></Tooltip.Trigger>
    <Tooltip.Content><Tooltip.Arrow />Should flip to right</Tooltip.Content>
  </Tooltip.Root>

  {/* 오른쪽 가장자리 */}
  <Tooltip.Root placement="right">
    <Tooltip.Trigger><Button>Right edge</Button></Tooltip.Trigger>
    <Tooltip.Content><Tooltip.Arrow />Should flip to left</Tooltip.Content>
  </Tooltip.Root>
</div>
```

#### 10. Dark Theme (`dark-theme`)

어두운 배경 컨테이너 내에서 `theme="dark"`:

```tsx
<div style={{ background: "#111827", padding: 32, borderRadius: 8 }}>
  <Tooltip.Root theme="dark" placement="top">
    <Tooltip.Trigger><Button variant="secondary">Dark tooltip</Button></Tooltip.Trigger>
    <Tooltip.Content><Tooltip.Arrow />Dark theme</Tooltip.Content>
  </Tooltip.Root>

  <Popover.Root theme="dark">
    <Popover.Trigger><Button>Dark popover</Button></Popover.Trigger>
    <Popover.Content>
      <Popover.Arrow />
      <Popover.Header>Dark Mode</Popover.Header>
      <Popover.Body>Content in dark theme</Popover.Body>
    </Popover.Content>
  </Popover.Root>
</div>
```

#### 11. Props Tables (`props`)

PropsTable 컴포넌트로 각 서브 컴포넌트 props 표시:

- **Tooltip.Root** — placement, offset, open, onOpenChange, showDelay, hideDelay, theme, disabled
- **Tooltip.Trigger** — asChild
- **Tooltip.Content** — multiline, maxWidth, className, style
- **Tooltip.Arrow** — size, className, style
- **Popover.Root** — placement, offset, open, onOpenChange, triggerMode, showDelay, hideDelay, theme, disabled, closeOnEscape, closeOnOutsideClick, trapFocus
- **Popover.Trigger** — asChild
- **Popover.Content** — minWidth, maxWidth, className, style
- **Popover.Arrow** — size, className, style
- **Popover.Close** — (ButtonHTMLAttributes)
- **Popover.Header** — (HTMLAttributes)
- **Popover.Body** — (HTMLAttributes)

#### 12. Usage (`usage`)

CodeView 코드 블록으로 사용 예시:

```tsx
<CodeView language="tsx" showLineNumbers theme="dark">
  {TOOLTIP_USAGE_CODE}
</CodeView>
<CodeView language="tsx" showLineNumbers theme="dark">
  {POPOVER_USAGE_CODE}
</CodeView>
```

#### 13. Playground (`playground`)

인터랙티브 제어:

- **Placement** — 12가지 라디오/드롭다운
- **Offset** — 슬라이더 (0~40, 기본 8/12)
- **Show Delay** — 슬라이더 (0~2000ms)
- **Hide Delay** — 슬라이더 (0~2000ms)
- **Arrow** — 체크박스 토글
- **Arrow Size** — 슬라이더 (4~16)
- **Theme** — light/dark 토글
- **Component** — Tooltip / Popover 전환
- **Popover Trigger Mode** — click/hover (Popover 선택 시)
- **Multiline** — 체크박스 (Tooltip 선택 시)

중앙에 트리거 버튼, 설정에 따라 Tooltip 또는 Popover 표시.

---

## 구현 순서

1. **`src/components/_shared/Portal.tsx`** — createPortal 래퍼
2. **`src/components/_shared/useFloating.ts`** — 포지셔닝 엔진 (computeBasePosition, flipPlacement, shiftPosition, computeArrowPosition, getScrollParents, useFloating 훅)
3. **`src/components/_shared/useAnimationState.ts`** — idle/mounting/entering/exiting 상태 관리 훅
4. **`src/components/Tooltip/Tooltip.types.ts`** — 공유 타입 + Tooltip 타입
5. **`src/components/Tooltip/TooltipRoot.tsx`** — Context provider, useControllable, useFloating, 딜레이 타이머
6. **`src/components/Tooltip/TooltipTrigger.tsx`** — cloneElement로 ref + hover/focus 이벤트 주입
7. **`src/components/Tooltip/TooltipContent.tsx`** — Portal 내 렌더링, 테마 색상, 애니메이션
8. **`src/components/Tooltip/TooltipArrow.tsx`** — rotate(45deg) div, side별 positioning
9. **`src/components/Tooltip/Tooltip.tsx`** + **`index.ts`** — Object.assign 조립 + 배럴
10. **`src/components/Popover/Popover.types.ts`** — Popover 타입
11. **`src/components/Popover/PopoverRoot.tsx`** — Context, 외부 클릭, Escape 처리
12. **`src/components/Popover/PopoverTrigger.tsx`** — click/hover 모드 분기
13. **`src/components/Popover/PopoverContent.tsx`** — Portal, 애니메이션, 포커스 트랩
14. **`src/components/Popover/PopoverArrow.tsx`** — 화살표 (border 포함)
15. **`src/components/Popover/PopoverClose.tsx`** — ctx.close() 호출
16. **`src/components/Popover/PopoverHeader.tsx`** + **`PopoverBody.tsx`** — 레이아웃 헬퍼
17. **`src/components/Popover/Popover.tsx`** + **`index.ts`** — 조립 + 배럴
18. **`src/components/index.ts`** — Tooltip, Popover export 추가
19. **`demo/src/pages/TooltipPopoverPage.tsx`** — 전체 데모 페이지
20. **`demo/src/App.tsx`** — NAV + import + 라우팅

---

## 검증 방법

```bash
npm run typecheck        # 타입 체크
npx tsup                 # 빌드 성공 확인
cd demo && npm run dev   # http://localhost:5173/#/tooltip-popover
```

### Tooltip 검증

- [ ] 4방향 기본 hover → 툴팁 표시/숨김
- [ ] 12 placements 모두 정확한 위치
- [ ] 화살표가 트리거 중심을 가리킴
- [ ] showDelay/hideDelay 동작
- [ ] focus/blur로 툴팁 표시/숨김 (키보드)
- [ ] Escape로 툴팁 숨김
- [ ] 제어 모드 (open/onOpenChange)
- [ ] multiline + maxWidth
- [ ] pointer-events: none (툴팁 위로 마우스 이동 시 닫힘)
- [ ] disabled 시 미표시
- [ ] 빠른 hover in/out 시 글리치 없음
- [ ] viewport 가장자리에서 auto-flip
- [ ] viewport 가장자리에서 auto-shift (화살표 클램핑 포함)
- [ ] 스크롤 시 위치 추적
- [ ] 진입/퇴장 애니메이션 (fade + scale)
- [ ] light/dark 테마 색상
- [ ] aria-describedby, role="tooltip"

### Popover 검증

- [ ] click으로 토글
- [ ] 외부 클릭으로 닫기
- [ ] Escape로 닫기 + 트리거 포커스 복귀
- [ ] Popover.Close로 닫기
- [ ] 12 placements 정확한 위치
- [ ] 화살표 위치 + 테두리
- [ ] hover 모드 (triggerMode="hover")
- [ ] hover 모드에서 트리거→컨텐츠 이동 시 열린 상태 유지
- [ ] 제어 모드 (open/onOpenChange)
- [ ] 포커스 트랩 (trapFocus)
- [ ] 인터랙티브 컨텐츠 (input, button 등) 정상 동작
- [ ] 중첩 팝오버: 안쪽 Escape → 안쪽만 닫힘
- [ ] viewport 가장자리 auto-flip + auto-shift
- [ ] 진입/퇴장 애니메이션 (fade + slide)
- [ ] light/dark 테마 색상
- [ ] Header/Body 레이아웃
- [ ] aria-haspopup, aria-expanded, aria-controls, role="dialog"
- [ ] closeOnEscape={false} 시 Escape 무시
- [ ] closeOnOutsideClick={false} 시 외부 클릭 무시
