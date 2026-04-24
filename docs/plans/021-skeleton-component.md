# Skeleton 컴포넌트 설계문서

## Context

plastic 라이브러리에 "로딩 중임을 나타내는 회색 플레이스홀더" `Skeleton` 컴포넌트를 추가한다. 역할 비유: YouTube/Facebook 피드가 데이터 fetch 전에 보여주는 회색 가상의 카드, GitHub 파일트리가 로딩 시 보여주는 줄무늬, macOS Finder 의 썸네일 로딩 전 회색 칸. 전통적인 Spinner 와 달리 "실제 레이아웃과 동일한 자리를 미리 차지" 함으로써 콘텐츠가 로드될 때 페이지가 튀지 않도록(layout shift 방지) 돕는 UX 프리미티브다. plastic 의 다른 컴포넌트(`Card`, `DataTable`, `CommandPalette` 비동기 모드 등)가 로딩 상태에서 각자 별도 인라인 플레이스홀더를 그리고 있는 현재 상태를, 공통 `Skeleton` 로 흡수하여 시각 일관성을 확보하는 것이 1차 목적이다.

참고 (prior art — UX 근거):
- **Ant Design `Skeleton`** — `Skeleton.Input`, `Skeleton.Avatar`, `Skeleton.Image`, `Skeleton.Button`, `Skeleton` (paragraph+title+avatar 조합). `active` prop 으로 shimmer 애니메이션 on/off.
- **MUI `Skeleton`** — `variant="text" | "circular" | "rectangular" | "rounded"`, `animation="pulse" | "wave" | false`, `width/height` 자유, 텍스트 variant 는 자동으로 적절한 높이 계산.
- **Chakra UI `Skeleton`, `SkeletonText`, `SkeletonCircle`** — `isLoaded` prop 으로 swap, fade-in 내장.
- **react-content-loader** — SVG path 자유 지정형. v1 범위 밖 (§17 SVG editor preset 후보).
- **Shopify Polaris `SkeletonBodyText`, `SkeletonDisplayText`, `SkeletonThumbnail`** — 프리셋 네이밍 참고.
- **VSCode Explorer 로딩** — 줄별 랜덤 길이(60~95%) shimmer. "실제 파일명처럼 보이는 리얼리즘" 이 핵심.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/Card/` — `Skeleton.Card` 프리셋이 흉내낼 레이아웃(헤더/바디/푸터 3단). media 영역이 있는 카드는 별도 프리셋 옵션(§9).
- `src/components/DataTable/` — `DataTableLoading.tsx` 가 이미 존재; row skeleton 을 추출·일반화하여 `Skeleton.Table` 로 흡수할 여지(§17 후속 리팩터링).
- `src/components/CommandPalette/` — 비동기 `items` 로딩 시 현재는 단순 텍스트 `"Loading..."`. `Skeleton.Text lines=3` 으로 대체 가능(후속).
- `src/components/index.ts` — 배럴 등록 지점.
- `demo/src/App.tsx` — NAV 추가 지점.
- `demo/src/pages/CommandPalettePage.tsx` — 데모 페이지 관례(섹션/사이드바) 참조 템플릿.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `strict` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 1. 단일 모양 (헤드리스 프리미티브)
<Skeleton.Root shape="rect" width={240} height={16} animation="shimmer" />
<Skeleton.Root shape="circle" size={40} />
<Skeleton.Root shape="text" width="80%" />

// 2. 텍스트 프리셋 — N 라인, 마지막 줄만 짧게(리얼리즘)
<Skeleton.Text lines={3} />

// 3. 아바타 프리셋
<Skeleton.Avatar shape="circle" size={40} />
<Skeleton.Avatar shape="rounded" size={56} />

// 4. 카드 프리셋
<Skeleton.Card hasMedia mediaHeight={140} lines={2} />

// 5. 테이블 프리셋
<Skeleton.Table rows={5} cols={4} />

// 6. 실제 컨텐츠 ↔ 스켈레톤 swap (fade)
<Skeleton.Root visible={!user} shape="text" width={120}>
  {user?.name}
</Skeleton.Root>
```

렌더 결과 (개념 — `Skeleton.Card hasMedia lines={2}`):
```
┌──────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← media (140px)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
├──────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓          │  ← title line (full width)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           │  ← text line 1 (~85%)
│ ▓▓▓▓▓▓▓▓▓▓▓▓                 │  ← text line 2 (~62%, 마지막 짧게)
└──────────────────────────────────┘
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Skeleton.Root` (원자) + `Skeleton.Text` / `Skeleton.Avatar` / `Skeleton.Card` / `Skeleton.Table` (프리셋). 프리셋은 내부에서 `Root` 를 조합한다 — layered 설계로 사용자는 원자 단위에서도 고수준에서도 사용 가능.
- **runtime-zero**. CSS keyframes + DOM 만 사용. React state 는 `visible` swap 에만.
- **pulse vs shimmer 기본값**: `animation="shimmer"` 가 기본. `"pulse"` 와 `false` (=no-animation) 도 지원.
- **prefers-reduced-motion 자동 감지**: 유저 OS 설정이 "동작 감소" 면 `false` 로 downgrade. prop 이 명시적 `"pulse"`/`"shimmer"` 여도 감지 결과가 우선.
- **swap (visible) API**: `visible={false}` 이면 스켈레톤 대신 `children` 을 180 ms fade 로 교체. 기본 180 ms.
- **hydration-safe 랜덤**: `Skeleton.Text` 의 각 줄 width 를 "랜덤처럼 자연스럽게" 그리되 SSR mismatch 방지를 위해 **고정 시드 의사랜덤** 사용. 줄 index → width 매핑이 결정적.
- **headless 정신**: 모든 색/테두리/radius 를 CSS variable 로 export. 사용자는 `style`/`className` 으로 덮어쓸 수 있다.
- **accessibility**: `role="status"` + `aria-busy="true"` + `aria-label="Loading"`. Swap 후 실제 콘텐츠 렌더 시 `aria-busy` 는 자동 해제.

---

## 1. Goals / Non-goals

### Goals (v1)
1. 3 가지 기본 shape: `text` (한 줄 높이), `rect` (사각 블록, radius 4), `circle` (원형).
2. 2 가지 애니메이션 + off: `shimmer` (좌→우 그라디언트 이동), `pulse` (opacity 0.6→1.0 반복), `false`.
3. `prefers-reduced-motion: reduce` 미디어 쿼리 감지 → 애니메이션 자동 off.
4. Light / Dark 테마 (`theme="light" | "dark"`). palette 는 `Skeleton/theme.ts` 로 집중.
5. `width`, `height`, `size` (circle), `borderRadius` 직접 지정 가능.
6. 프리셋 4종:
   - `Skeleton.Text` — N 줄 텍스트 시뮬레이션. `lines`, `lastLineWidth`, `gap`, `randomize`.
   - `Skeleton.Avatar` — `shape` (circle/rounded/square), `size`.
   - `Skeleton.Card` — 헤더/media/body/푸터 조합. `hasMedia`, `mediaHeight`, `lines`, `hasFooter`.
   - `Skeleton.Table` — `rows`, `cols`, `rowHeight`, `colWidths`.
7. `visible` swap API: `true` 면 스켈레톤 표시, `false` 면 children 렌더 (둘은 상호배타). 전환 시 180 ms fade.
8. 접근성: `role="status"`, `aria-busy`, `aria-label`.
9. SSR-safe: `randomize` 의 width 배열이 서버/클라이언트 동일(고정 시드).
10. 배럴 + namespace API: `export const Skeleton = { Root, Text, Avatar, Card, Table };`.

### Non-goals (v1 제외)
- **SVG path 자유 지정형** (react-content-loader 식). `Skeleton.Svg path={...}` 는 v1.1.
- **이미지 blurhash / LQIP 통합**: v1 은 순수 회색 블록만. blurhash 플레이스홀더는 v1.2.
- **자동 사이즈 추출** (`Skeleton.Mimic ref={realEl}`): 실제 요소를 측정해 동일 dimension 으로 복제하는 기능. v1 에서는 user 가 수동 지정. v1.2.
- **데이터 페처 통합**: `<Skeleton.Query query={...} />` 같은 data-layer 통합 없음. `visible` prop 만.
- **스토리 북 / 인터랙션 테스트**: plastic 전체에 없음.
- **리스트 infinite loading sentinel**: v1 범위 밖.
- **progress-aware 스켈레톤**: 로드 % 에 따라 밝아지는 변형. v1 없음.
- **animated placeholder text ("ghost typing")**: v1 없음.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Skeleton/Skeleton.types.ts`

```ts
export type SkeletonTheme = "light" | "dark";

/**
 * 기본 shape.
 * - "text":   한 줄 텍스트 높이(기본 1em). border-radius 4. 세로 여백 0.
 * - "rect":   사각 블록. border-radius 4.
 * - "circle": 원형. width=height=size. border-radius 50%.
 */
export type SkeletonShape = "text" | "rect" | "circle";

/**
 * 애니메이션 모드.
 * - "shimmer": 좌→우 그라디언트 스윕 (기본).
 * - "pulse":   opacity 0.6 ↔ 1.0 반복.
 * - false:     애니메이션 없음.
 *
 * 사용자가 "shimmer" 를 명시해도 prefers-reduced-motion: reduce 면 false 로 downgrade.
 */
export type SkeletonAnimation = "shimmer" | "pulse" | false;

/** Size 단위 — number 는 px, string 은 CSS 길이 그대로 passthrough (e.g. "80%", "2rem"). */
export type SkeletonSize = number | string;

export interface SkeletonRootProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** 기본 "rect". */
  shape?: SkeletonShape;
  /** 애니메이션. 기본 "shimmer". false 로 완전 off. */
  animation?: SkeletonAnimation;
  /** 너비. shape="circle" 면 무시(size 사용). 기본: shape=="text" 이면 "100%", 그 외 필수. */
  width?: SkeletonSize;
  /** 높이. shape="text" 면 기본 "1em". shape="circle" 면 무시. shape="rect" 면 필수. */
  height?: SkeletonSize;
  /** circle 전용. width=height=size 로 매핑. 기본 40. */
  size?: SkeletonSize;
  /** border-radius override. 기본: text/rect=4, circle=50%. */
  borderRadius?: SkeletonSize;
  /** 테마. 기본 "light". */
  theme?: SkeletonTheme;
  /**
   * 스켈레톤 표시 여부 제어.
   * - true (기본): 스켈레톤 렌더.
   * - false: children 렌더 (fade-in). children 없으면 null.
   */
  visible?: boolean;
  /** swap 페이드 ms. 기본 180. 0 이면 애니 없이 즉시 교체. */
  fadeMs?: number;
  /** swap 대상 실제 콘텐츠. visible=false 시 노출. */
  children?: React.ReactNode;
  /** 접근성 라벨. 기본 "Loading". */
  "aria-label"?: string;
}

export interface SkeletonTextProps {
  /** 기본 3. */
  lines?: number;
  /** 마지막 줄 폭(비율 or size). 기본 "60%". null 이면 풀폭. */
  lastLineWidth?: SkeletonSize | null;
  /** 줄 간 세로 간격(px). 기본 8. */
  gap?: number;
  /** 각 줄 폭을 자연스러운 랜덤처럼 변주할지. 기본 true. SSR-safe (고정 시드). */
  randomize?: boolean;
  /** 줄 높이. 기본 "1em" (text shape 기본값 따라감). */
  lineHeight?: SkeletonSize;
  /** 각 줄 폭 범위(randomize=true 일 때). 기본 [0.75, 0.95]. */
  widthRange?: [number, number];
  /** 랜덤 시드. 기본 1. 같은 페이지에서 서로 다른 시드로 서로 다른 패턴 원할 때만. */
  seed?: number;
  /** animation / theme / visible / className / style 등은 Root 와 동일. */
  animation?: SkeletonAnimation;
  theme?: SkeletonTheme;
  visible?: boolean;
  fadeMs?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export interface SkeletonAvatarProps {
  /** 기본 "circle". */
  shape?: "circle" | "rounded" | "square";
  /** 한 변 길이. 기본 40. */
  size?: SkeletonSize;
  animation?: SkeletonAnimation;
  theme?: SkeletonTheme;
  visible?: boolean;
  fadeMs?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export interface SkeletonCardProps {
  /** media 영역 표시 여부. 기본 false. */
  hasMedia?: boolean;
  /** media 높이 px. 기본 160. */
  mediaHeight?: SkeletonSize;
  /** title 표시 여부. 기본 true. */
  hasTitle?: boolean;
  /** body 줄 수. 기본 2. */
  lines?: number;
  /** footer (action row) 표시 여부. 기본 false. */
  hasFooter?: boolean;
  /** avatar 왼쪽에 포함 (헤더 스타일). 기본 false. */
  hasAvatar?: boolean;
  /** 카드 폭. 기본 "100%". */
  width?: SkeletonSize;
  /** 내부 패딩 px. 기본 16. */
  padding?: number;
  animation?: SkeletonAnimation;
  theme?: SkeletonTheme;
  visible?: boolean;
  fadeMs?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export interface SkeletonTableProps {
  /** 기본 5. */
  rows?: number;
  /** 기본 4. */
  cols?: number;
  /** 헤더 row 포함. 기본 true. */
  hasHeader?: boolean;
  /** row 높이 px. 기본 44. */
  rowHeight?: SkeletonSize;
  /** 컬럼별 폭 배열. 길이가 cols 와 맞지 않으면 균등 분배. */
  colWidths?: SkeletonSize[];
  animation?: SkeletonAnimation;
  theme?: SkeletonTheme;
  visible?: boolean;
  fadeMs?: number;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}
```

### 2.2 배럴

```ts
// src/components/Skeleton/index.ts
export { Skeleton } from "./Skeleton";
export type {
  SkeletonRootProps,
  SkeletonTextProps,
  SkeletonAvatarProps,
  SkeletonCardProps,
  SkeletonTableProps,
  SkeletonShape,
  SkeletonAnimation,
  SkeletonSize,
  SkeletonTheme,
} from "./Skeleton.types";
```

그리고 `src/components/index.ts` 에 `export * from "./Skeleton";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// Skeleton.tsx
export const Skeleton = {
  Root: SkeletonRoot,
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
  Table: SkeletonTable,
};
```

displayName: `"Skeleton.Root"`, `"Skeleton.Text"`, `"Skeleton.Avatar"`, `"Skeleton.Card"`, `"Skeleton.Table"`.

### 2.4 사용 예 (최소 스니펫)

```tsx
// 원자
<Skeleton.Root shape="rect" width={200} height={14} />

// 프리셋
<Skeleton.Text lines={4} />
<Skeleton.Avatar size={56} />
<Skeleton.Card hasMedia hasFooter lines={3} />
<Skeleton.Table rows={8} cols={5} />

// Swap
{users.map((user) => (
  <Skeleton.Root key={user.id} visible={!user.hydrated} shape="text" width={120}>
    {user.name}
  </Skeleton.Root>
))}
```

---

## 3. 도메인 모델

### 3.1 shape ↔ width/height 계산

| shape | width | height | borderRadius |
|---|---|---|---|
| `text` | prop 지정. 기본 `"100%"`. | prop 지정. 기본 `"1em"`. | prop 지정. 기본 `4`. |
| `rect` | prop 지정. **필수** (런타임 체크 X, TS 타입은 optional). 누락 시 `"100%"` fallback + dev warn. | prop 지정. **필수**. 누락 시 `16` fallback + dev warn. | 기본 `4`. |
| `circle` | `size` 로부터 유도 (기본 40). width/height prop 은 무시 + dev warn. | 동일. | 기본 `"50%"`. |

런타임 정규화:
```ts
// Skeleton.utils.ts
export function resolveDimensions(props: SkeletonRootProps): {
  width: string; height: string; borderRadius: string;
} {
  const shape = props.shape ?? "rect";
  if (shape === "circle") {
    const s = props.size ?? 40;
    const px = toCssLength(s);
    return { width: px, height: px, borderRadius: toCssLength(props.borderRadius ?? "50%") };
  }
  if (shape === "text") {
    return {
      width: toCssLength(props.width ?? "100%"),
      height: toCssLength(props.height ?? "1em"),
      borderRadius: toCssLength(props.borderRadius ?? 4),
    };
  }
  // rect
  if (import.meta.env?.DEV) {
    if (props.width === undefined) console.warn("[Skeleton] shape='rect' requires width. Falling back to '100%'.");
    if (props.height === undefined) console.warn("[Skeleton] shape='rect' requires height. Falling back to 16.");
  }
  return {
    width: toCssLength(props.width ?? "100%"),
    height: toCssLength(props.height ?? 16),
    borderRadius: toCssLength(props.borderRadius ?? 4),
  };
}

export function toCssLength(v: SkeletonSize): string {
  return typeof v === "number" ? `${v}px` : v;
}
```

### 3.2 Text 라인 폭 — 고정 시드 의사랜덤

```ts
/**
 * SSR 안전한 결정적 의사랜덤 (Mulberry32).
 * 같은 seed + index 는 항상 같은 값 → hydration mismatch 방지.
 */
export function seededRandom(seed: number, index: number): number {
  let t = (seed + index * 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function computeTextLineWidths(
  lines: number,
  range: [number, number],
  lastLineWidth: SkeletonSize | null | undefined,
  randomize: boolean,
  seed: number,
): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines; i++) {
    const isLast = i === lines - 1;
    if (isLast && lastLineWidth !== null && lastLineWidth !== undefined) {
      out.push(toCssLength(lastLineWidth));
      continue;
    }
    if (!randomize) {
      out.push("100%");
      continue;
    }
    const [lo, hi] = range;
    const pct = lo + (hi - lo) * seededRandom(seed, i);
    out.push(`${(pct * 100).toFixed(1)}%`);
  }
  return out;
}
```

정책:
- `randomize=false` 면 모든 줄 100% (마지막 줄만 lastLineWidth 적용).
- `randomize=true` + `lastLineWidth="60%"` 가 기본: 0~N-2 번째 줄은 75~95% 사이 결정적 변주, 마지막 줄은 60%.
- `lastLineWidth={null}` 명시 시 마지막 줄도 randomize 에 포함.
- seed 는 기본 1. 페이지 내 여러 `Skeleton.Text` 가 완전히 같은 패턴을 보이면 부자연스러우므로, 사용자는 서로 다른 seed 를 줄 수 있다. 다만 **같은 seed 는 항상 같은 결과** 라는 계약이 SSR 계약.

### 3.3 Table 컬럼 폭 분배

```ts
export function computeTableColWidths(cols: number, overrides: SkeletonSize[] | undefined): string[] {
  if (overrides && overrides.length === cols) return overrides.map(toCssLength);
  // 균등 분배. 각 컬럼에 (100/cols)% 씩.
  const pct = 100 / cols;
  return Array.from({ length: cols }, () => `${pct.toFixed(4)}%`);
}
```

### 3.4 Root Context — **없음**

`Skeleton` 은 상태를 공유할 필요가 없다 (각 인스턴스 독립). 따라서 context 도, provider 도 없다. 단, 프리셋이 Root 에 prop 을 forward 할 때 공통 prop set (`animation`, `theme`, `visible`, `fadeMs`, `aria-label`) 을 **하나의 유틸** 로 추출한다:

```ts
// Skeleton.utils.ts
export function extractCommonProps<T extends {
  animation?: SkeletonAnimation;
  theme?: SkeletonTheme;
  visible?: boolean;
  fadeMs?: number;
  "aria-label"?: string;
}>(p: T): Pick<SkeletonRootProps, "animation" | "theme" | "visible" | "fadeMs" | "aria-label"> {
  return {
    animation: p.animation,
    theme: p.theme,
    visible: p.visible,
    fadeMs: p.fadeMs,
    "aria-label": p["aria-label"],
  };
}
```

---

## 4. 시각 / 구조

### 4.1 DOM 구조

**`Skeleton.Root`** (단일 원자):
```html
<div
  role="status"
  aria-busy="true"
  aria-label="Loading"
  class="sk-root sk-root--shimmer sk-root--light"
  data-shape="rect"
  style="width: 200px; height: 16px; border-radius: 4px;"
>
  <!-- shimmer 일 때 내부 빛 overlay. pulse / false 면 없음. -->
  <span class="sk-shimmer" aria-hidden="true"></span>
</div>
```

**`Skeleton.Text`**:
```html
<div role="status" aria-busy="true" aria-label="Loading" class="sk-text" style="display:flex;flex-direction:column;gap:8px">
  <div class="sk-root sk-root--shimmer sk-root--light" style="width:87.3%; height:1em; border-radius:4px">
    <span class="sk-shimmer" aria-hidden="true"></span>
  </div>
  <div class="sk-root sk-root--shimmer sk-root--light" style="width:91.1%; ..."><span .../></div>
  <div class="sk-root sk-root--shimmer sk-root--light" style="width:60%; ..."><span .../></div>
</div>
```

Text 래퍼는 `role="status"` 가 **한 번만** 오도록(중첩된 individual Root 는 `role` 을 덮지 않는 옵션 내부 prop `_suppressAria`) 처리 — 스크린리더가 각 줄마다 "Loading" 반복하지 않도록.

**`Skeleton.Avatar`** — 단일 Root 의 shape 변환:
- `shape="circle"` → Root shape=circle.
- `shape="rounded"` → Root shape=rect + borderRadius=8.
- `shape="square"` → Root shape=rect + borderRadius=0.

**`Skeleton.Card`**:
```html
<div role="status" aria-busy="true" aria-label="Loading" class="sk-card sk-card--light" style="padding:16px;width:100%">
  {hasMedia && <div class="sk-root sk-root--shimmer" style="height:160px;width:100%;border-radius:8px 8px 0 0" />}
  {hasAvatar && (
    <div style="display:flex;gap:12px;align-items:center;margin-top:12px">
      <div class="sk-root" style="width:40px;height:40px;border-radius:50%"/>
      <div class="sk-root" style="height:14px;width:40%"/>
    </div>
  )}
  {hasTitle && <div class="sk-root" style="height:20px;width:70%;margin-top:12px"/>}
  <!-- body lines (Skeleton.Text 재사용) -->
  <div style="margin-top:12px">
    <Skeleton.Text lines={lines} {...common} _suppressAria />
  </div>
  {hasFooter && (
    <div style="display:flex;gap:8px;margin-top:16px">
      <div class="sk-root" style="width:72px;height:28px;border-radius:6px"/>
      <div class="sk-root" style="width:72px;height:28px;border-radius:6px"/>
    </div>
  )}
</div>
```

**`Skeleton.Table`**:
```html
<div role="status" aria-busy="true" aria-label="Loading" class="sk-table">
  {hasHeader && (
    <div class="sk-table-row sk-table-row--header" style="display:flex;gap:12px;height:44px;align-items:center">
      <div class="sk-root" style="width:25%;height:12px"/> <div class="sk-root" style="width:25%;height:12px"/> ...
    </div>
  )}
  {Array.from({length: rows}).map((_, r) => (
    <div class="sk-table-row" style="display:flex;gap:12px;height:44px;align-items:center;border-top:1px solid ...">
      {colWidths.map((w, c) => <div class="sk-root" style={{width: w, height: 14}} />)}
    </div>
  ))}
</div>
```

### 4.2 Shimmer gradient

```css
.sk-root {
  position: relative;
  display: inline-block;
  background-color: var(--sk-bg);
  overflow: hidden;
  isolation: isolate; /* shimmer overlay 가 바깥 합성에 영향 없음 */
  line-height: 1;
}
.sk-root[data-shape="text"] { display: block; vertical-align: middle; }

.sk-shimmer {
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--sk-shine) 50%,
    transparent 100%
  );
  animation: sk-shimmer 1500ms linear infinite;
  will-change: transform;
}
@keyframes sk-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.sk-root--pulse {
  animation: sk-pulse 1500ms ease-in-out infinite;
}
.sk-root--pulse > .sk-shimmer { display: none; }
@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}

.sk-root--none > .sk-shimmer { display: none; }
.sk-root--none { animation: none; }

/* 시스템 감소 설정 시 무조건 off */
@media (prefers-reduced-motion: reduce) {
  .sk-root,
  .sk-shimmer {
    animation: none !important;
  }
  .sk-shimmer { display: none !important; }
}
```

### 4.3 Palette 토큰

```ts
// Skeleton/theme.ts
export const skeletonPalette = {
  light: {
    bg:      "#e5e7eb",       // gray-200
    shine:   "rgba(255,255,255,0.7)",
    border:  "rgba(0,0,0,0.06)",
    cardBg:  "#ffffff",
    cardBorder: "rgba(0,0,0,0.08)",
    rowSep:  "rgba(0,0,0,0.06)",
  },
  dark: {
    bg:      "#334155",       // slate-700
    shine:   "rgba(255,255,255,0.08)",
    border:  "rgba(255,255,255,0.06)",
    cardBg:  "#0f172a",
    cardBorder: "rgba(255,255,255,0.08)",
    rowSep:  "rgba(255,255,255,0.06)",
  },
} as const;
```

CSS variable 주입은 Root 요소 인라인 스타일로:
```ts
const vars = {
  "--sk-bg": palette.bg,
  "--sk-shine": palette.shine,
} as React.CSSProperties;
```

### 4.4 이유 — 왜 shimmer overlay 를 `<span>` 자식으로?

대안들:
1. **`background: linear-gradient` + `background-size: 200%` + `background-position` animation** — 한 요소만 사용. 단점: border-radius=circle 에서 그라디언트가 원 바깥 사각형 기준으로 계산되어 어색. 또한 GPU 레이어가 독립되지 않아 text 스크롤 시 리페인트 비용 올라감.
2. **`::before` pseudo-element** — DOM 추가 없음. 단점: user 의 `className` 으로 `::before` 를 덮어쓸 경우 충돌.
3. **inner `<span>`** (선택). 독립 GPU 레이어 + `overflow:hidden` 으로 자연스럽게 mask. `aria-hidden="true"` 로 접근성 안전.

### 4.5 Swap / fade DOM

`visible` 이 `false` 로 전이되면:
```
t0:           [skeleton opacity 1]
t0 ~ fadeMs/2: [skeleton opacity 1 → 0]  (skeleton 여전히 DOM 존재)
t0+fadeMs/2:  [skeleton unmount, children mount with opacity 0]
~ fadeMs:     [children opacity 0 → 1]
```

구현은 간단히:
```tsx
{visible ? (
  <div className="sk-root ..." style={{opacity: visible ? 1 : 0, transition: `opacity ${fadeMs}ms`}}>...</div>
) : (
  <div className="sk-content-fadein" style={{animation: `sk-fadein ${fadeMs}ms ease-out`}}>
    {children}
  </div>
)}
```

그리고:
```css
@keyframes sk-fadein { from { opacity: 0 } to { opacity: 1 } }
```

단, React 가 conditional 로 엘리먼트를 교체하면 skeleton 의 out-transition 을 놓칠 수 있다. v1 은 "mount/unmount 순간 교체 + children 에만 fadein" 으로 단순화 (skeleton 이 사라질 때는 opacity 전이 없음). `fadeMs=0` 이면 fadein 없이 즉시 교체. 자연스러운 two-way crossfade 는 후속 작업(§17).

---

## 5. 핵심 로직

### 5.1 prefers-reduced-motion 감지

```ts
// Skeleton/useReducedMotion.ts
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Safari < 14 는 addListener/removeListener
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduced;
}
```

Root 내부:
```ts
const reduced = useReducedMotion();
const effectiveAnimation: SkeletonAnimation =
  reduced ? false : (props.animation ?? "shimmer");
```

참고: CSS 차원에서도 `@media (prefers-reduced-motion: reduce)` 로 animation 을 강제 off 한다 (4.2 참조) — 이는 React state 로 감지되기 전(첫 페인트) 또는 JS 미실행 환경에서의 fallback.

### 5.2 visible swap 라이프사이클

```ts
// Skeleton.tsx (Root 내부)
const [mountedChildren, setMountedChildren] = useState(!visible);

useEffect(() => {
  if (!visible && !mountedChildren) setMountedChildren(true);
  if (visible && mountedChildren) setMountedChildren(false);
}, [visible, mountedChildren]);

return mountedChildren
  ? <div className="sk-content-fadein" style={fadeStyle}>{children}</div>
  : <div role="status" aria-busy="true" className={rootClass} style={rootStyle}>
      <span className="sk-shimmer" aria-hidden="true" />
    </div>;
```

(실제 구현은 더 단순; 위는 의사코드.)

`fadeMs=0` 특수 케이스: `sk-content-fadein` 클래스 대신 `undefined` 사용 → 즉시 교체.

### 5.3 animation CSS 모드 스위치

className 조합:
```ts
const classes = clsx(
  "sk-root",
  `sk-root--${theme ?? "light"}`,
  effectiveAnimation === "shimmer" && "sk-root--shimmer",
  effectiveAnimation === "pulse"   && "sk-root--pulse",
  effectiveAnimation === false     && "sk-root--none",
  props.className,
);
```

`sk-root--shimmer` 자체에는 animation 이 없고, 내부 `sk-shimmer` span 의 animation 을 통제. `sk-root--pulse` 는 자체 animation. `sk-root--none` 은 둘 다 off.

### 5.4 randomize hydration-safe

`computeTextLineWidths` 는 순수 함수 (seed+index → 결정적). SSR 과 CSR 양쪽에서 같은 결과. 단, Math.random() 은 **절대 사용 금지** — hydration mismatch 의 근원.

```ts
const widths = useMemo(
  () => computeTextLineWidths(lines, range, lastLineWidth, randomize, seed),
  [lines, range[0], range[1], lastLineWidth, randomize, seed],
);
```

---

## 6. 제약 (엣지 케이스)

### 6.1 width/height 가 0 또는 undefined

- `shape="rect"` + `width`/`height` 누락: §3.1 참조. dev warn + fallback.
- `width={0}`: CSS 상 invisible 하지만 DOM 은 존재. 접근성 지장 없음.
- parent 가 `display:none` 등으로 숨겨진 상태에서 마운트: 애니메이션은 GPU 에서 돌아가도 비가시. 디마운트 시 `will-change` 해제.

### 6.2 숨겨진 컨테이너 (display:none)

`display:none` 내부의 Skeleton 은 보이지 않음에도 CSS animation 은 pause 되지 않는다. 단, browser 가 offscreen 요소의 animation 을 throttle 하므로 cost 는 미미. 사용자가 탭 보이기 복귀 시 정상 동작.

### 6.3 매우 큰 수의 row (Table rows >= 1000)

`Skeleton.Table rows={1000}` 은 DOM 1000개 row × cols 개 = 수천 개 skeleton 요소. 60 fps 유지 어려움. v1 은 dev warn `[Skeleton.Table] rows > 200 may cause perf issues; consider virtualization`.

### 6.4 너무 짧은 width (text lines)

`width="2%"` 같은 극단값은 그대로 렌더. 사용자 책임.

### 6.5 animation prop + reduced-motion 충돌

prop 이 `"shimmer"` 이어도 OS 설정이 reduce 면 `false`. 사용자가 "나는 reduce 를 무시하고 싶다" 는 **허용하지 않음** — 접근성 가이드라인 우선. 필요 시 v1.1 에서 `respectReducedMotion?: boolean` 옵트아웃.

### 6.6 0 lines

`Skeleton.Text lines={0}` → 빈 `<div role="status">` 만 렌더. warn 없음 (사용자 의도 있을 수 있음).

### 6.7 visible=false + children 없음

빈 `null` 반환. 접근성 영향 없음.

### 6.8 borderRadius + circle

`shape="circle"` + `borderRadius={4}` → borderRadius 우선. 비원형 "원 모양이 아닌" circle 이 될 수 있다. 사용자 override 존중.

---

## 7. 키보드

Skeleton 은 **비상호작용 컴포넌트** 이다. 기본적으로 포커스 대상이 아니며, `tabindex` 도 설정하지 않는다.

- `children` 이 실제 포커스 가능한 요소(`<button>` 등) 를 포함하는 경우 (`visible=false` 스왑 후), 그 요소의 기본 포커스 동작을 따름. Skeleton 은 개입 없음.
- 포커스 트랩 없음.
- keyboard shortcut 없음.

단, `role="status"` 는 aria-live region 으로 스크린리더가 자동 announce 한다 → 로딩 시작/종료가 들린다.

---

## 8. 상태 관리

### 8.1 visible swap

`visible` 은 controlled prop (기본 `true`). `undefined` 이면 `true` 취급 → skeleton 표시.

```ts
const visible = props.visible ?? true;
```

swap 시점:
- `visible: true → false`: skeleton 즉시 unmount, `children` 이 `sk-content-fadein` 애니메이션과 함께 mount.
- `visible: false → true`: children unmount, skeleton mount (fade-in 없음, 즉시).

양방향 crossfade 는 구현 복잡도 상승(두 요소 동시 mount + absolute overlay) 이므로 v1 제외. 일방향 fade 만.

### 8.2 skeleton 내부 state

- **없음**. `Skeleton.Root` 는 state-less. 애니메이션은 CSS keyframes.
- `useReducedMotion()` 훅 하나만 state 보유.
- `Skeleton.Text` 의 `widths` 는 `useMemo` 결과 (state 아님).

### 8.3 fade 지속 시간 관리

`fadeMs` 는 단순 CSS `animation-duration` 으로 inline 주입:
```tsx
<div style={{animationDuration: `${fadeMs}ms`}} className="sk-content-fadein">
  {children}
</div>
```

별도 setTimeout 불필요.

### 8.4 children 이 `<Suspense>` 안에 있을 때

`<Skeleton.Root visible={false}><SuspendedData/></Skeleton.Root>`.  
Suspense 경계가 Skeleton 을 먹지 않음(Skeleton 이 바깥). 이 경우 Skeleton 은 단순 plain fallback 로 기능하지 않는다 — Suspense fallback 은 별도. 사용자가 직접 `<Suspense fallback={<Skeleton.Card/>}>...</Suspense>` 패턴으로 써야 함. Usage 예제(§12)에서 언급.

---

## 9. 프리셋

### 9.1 Skeleton.Text

기본값:
```ts
lines = 3
lastLineWidth = "60%"
gap = 8
randomize = true
widthRange = [0.75, 0.95]
seed = 1
lineHeight = "1em"
```

리얼리즘의 핵심:
- 줄 개수 3 이 가장 "댓글/본문" 느낌.
- 마지막 줄 짧게(60%) + 앞줄들은 87~93% 랜덤 → 실제 문단처럼 보임.
- `randomize=false` 는 "의도적으로 정형화된 모양" 원할 때 (폼 라벨 등).

### 9.2 Skeleton.Avatar

기본값:
```ts
shape = "circle"
size = 40
```

`shape="rounded"` 는 borderRadius=8. 앱 아이콘 스타일(iOS).  
`shape="square"` 는 borderRadius=0. 거의 쓰이지 않지만 완전성 위해 제공.

### 9.3 Skeleton.Card

기본값:
```ts
hasMedia = false
mediaHeight = 160
hasTitle = true
lines = 2
hasFooter = false
hasAvatar = false
width = "100%"
padding = 16
```

조합 예시:
- **단순 블로그 카드**: `<Skeleton.Card hasMedia lines={3} />`
- **아바타가 있는 댓글**: `<Skeleton.Card hasAvatar lines={2} />` (이 경우 title 은 자동 숨김 권장 — dev warn `hasAvatar+hasTitle 동시 사용 시 UX 어색`; 허용은 함)
- **액션 버튼 포함**: `<Skeleton.Card hasMedia hasFooter lines={2} />`

### 9.4 Skeleton.Table

기본값:
```ts
rows = 5
cols = 4
hasHeader = true
rowHeight = 44
colWidths = undefined  // 균등 분배
```

`rows * cols` 개의 개별 Skeleton 을 렌더. perf 체크(§6.3). 내부적으로 모두 `_suppressAria` 로 개별 role 제거, 최상위만 `role="status"`.

### 9.5 DataTable 과의 관계

`src/components/DataTable/DataTableLoading.tsx` 는 현재 자체 skeleton 로직 보유. v1 에서는 **DataTable 을 손대지 않는다** (다른 agent 작업 충돌 회피). 후속 PR 에서 `Skeleton.Table` 로 교체 (§17).

### 9.6 Card 와의 관계

`src/components/Card/` 의 실제 컴포넌트와 레이아웃을 모방. padding=16, radius=8, 그림자는 skeleton 에선 제외(로딩 중임을 명확히). 실제 Card 와 1:1 대응을 원한다면 v1.1 에서 `mimicCard` 옵션.

---

## 10. 파일 구조

```
src/components/Skeleton/
├── Skeleton.tsx              # Root + Text + Avatar + Card + Table + namespace
├── Skeleton.types.ts         # 공개 타입
├── Skeleton.utils.ts         # resolveDimensions, seededRandom, computeTextLineWidths 등
├── Skeleton.css              # keyframes + .sk-root / .sk-shimmer / fadein
├── theme.ts                  # skeletonPalette
├── useReducedMotion.ts       # prefers-reduced-motion 훅
└── index.ts                  # 배럴
```

책임:

- **Skeleton.tsx**
  - `SkeletonRoot`, `SkeletonText`, `SkeletonAvatar`, `SkeletonCard`, `SkeletonTable` 5 개 함수 컴포넌트.
  - `Skeleton` namespace 구성 + displayName.
  - `_suppressAria` (internal prop, types.ts 에는 export 안 함) 로 중첩 시 outer 만 role 유지.
  - swap 로직 (inline).

- **Skeleton.utils.ts**
  - `resolveDimensions(props) → {width, height, borderRadius}`
  - `toCssLength(v: SkeletonSize) → string`
  - `seededRandom(seed, index) → [0,1)`
  - `computeTextLineWidths(lines, range, lastLineWidth, randomize, seed) → string[]`
  - `computeTableColWidths(cols, overrides) → string[]`
  - `extractCommonProps` (§3.4)

- **Skeleton.css**
  - `.sk-root`, `.sk-shimmer`, `.sk-root--shimmer`, `.sk-root--pulse`, `.sk-root--none`
  - `@keyframes sk-shimmer`, `sk-pulse`, `sk-fadein`
  - `@media (prefers-reduced-motion: reduce)` 블록
  - `.sk-content-fadein`

- **theme.ts**
  - `skeletonPalette` (light/dark) + `applyPaletteVars(theme): CSSProperties`.

- **useReducedMotion.ts**
  - `matchMedia` 훅.

- **index.ts**
  - `export { Skeleton }` + 타입 재노출.

---

## 11. 구현 단계 (후속 agent 가 순차 실행)

각 단계는 독립 커밋. 각 커밋이 `npm run typecheck` + `npx tsup` 통과.

### Step 1 — 타입 + 배럴 + 테마 스켈레톤
1. `Skeleton.types.ts` 작성 (§2.1 전부).
2. `theme.ts` — `skeletonPalette` light/dark.
3. `Skeleton.utils.ts` — `toCssLength`, `resolveDimensions`, `seededRandom`, `computeTextLineWidths`, `computeTableColWidths`, `extractCommonProps`.
4. `Skeleton.css` — keyframes + base classes (§4.2 전부).
5. `index.ts` 배럴.
6. `src/components/index.ts` 에 `export * from "./Skeleton";`.
7. `Skeleton.tsx` placeholder: `export const Skeleton = { Root: () => null, Text: () => null, Avatar: () => null, Card: () => null, Table: () => null };`.
8. `npm run typecheck` 통과.
9. 커밋: `feat(Skeleton): 타입 + 테마 + 유틸 + CSS 스켈레톤`.

### Step 2 — useReducedMotion + Skeleton.Root 원자
1. `useReducedMotion.ts` 작성.
2. `SkeletonRoot` 구현: shape 해석, dimension 계산, animation className, palette vars inline.
3. `<span class="sk-shimmer" aria-hidden="true">` 자식 렌더.
4. 접근성: `role="status"`, `aria-busy`, `aria-label`.
5. 커밋: `feat(Skeleton): Root 원자 + reduced-motion 감지`.

### Step 3 — visible swap
1. Root 에 `visible` prop 반영.
2. `visible=false` 시 `children` 을 `sk-content-fadein` 으로 감싸 렌더.
3. `fadeMs=0` 특수 처리.
4. `aria-busy` 를 visible 에 바인딩.
5. 커밋: `feat(Skeleton): visible swap + fade`.

### Step 4 — Skeleton.Text 프리셋
1. `SkeletonText` 구현 — `computeTextLineWidths` 사용, gap 으로 간격, `_suppressAria`.
2. `lastLineWidth={null}` 경로.
3. `randomize=false` 경로.
4. SSR 테스트 (간단): `renderToString` 두 번 호출해 동일 HTML 확인 (수동).
5. 커밋: `feat(Skeleton): Text 프리셋`.

### Step 5 — Skeleton.Avatar 프리셋
1. `SkeletonAvatar` — shape → Root shape/borderRadius 매핑.
2. 커밋: `feat(Skeleton): Avatar 프리셋`.

### Step 6 — Skeleton.Card 프리셋
1. `SkeletonCard` — hasMedia/hasAvatar/hasTitle/lines/hasFooter 조합.
2. padding, width, radius 반영.
3. 내부에서 `Skeleton.Text` 재활용.
4. 커밋: `feat(Skeleton): Card 프리셋`.

### Step 7 — Skeleton.Table 프리셋
1. `SkeletonTable` — rows/cols 그리드.
2. `computeTableColWidths` 사용.
3. perf warn (rows > 200).
4. 커밋: `feat(Skeleton): Table 프리셋`.

### Step 8 — 데모 페이지
1. `demo/src/pages/SkeletonPage.tsx` (§12 전부).
2. `demo/src/App.tsx` NAV + 라우팅.
3. 커밋: `feat(Skeleton): 데모 페이지`.

### Step 9 — Props 표 + Usage
1. 데모 Props 섹션 (Root/Text/Avatar/Card/Table 각각).
2. Usage 스니펫 4개 (기본, Card, swap, Suspense 조합).
3. 커밋: `feat(Skeleton): 데모 props 표 + usage`.

### Step 10 — 마감
1. §20 DoD 전체 체크.
2. 다른 페이지 리그레션 없음 육안 확인.
3. 커밋: `feat(Skeleton): DoD`.

---

## 12. 데모 페이지

`demo/src/pages/SkeletonPage.tsx`. 기존 페이지(CommandPalettePage, SplitPanePage 등) 구조 복제. 섹션별 `<section id="...">` + 우측 사이드바 NAV 연동.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "skeleton", label: "Skeleton", description: "로딩 플레이스홀더", sections: [
  { label: "Basic shapes",         id: "basic" },
  { label: "Text multi-line",      id: "text" },
  { label: "Avatar",               id: "avatar" },
  { label: "Card preset",          id: "card" },
  { label: "Table preset",         id: "table" },
  { label: "Pulse vs Shimmer",     id: "animation" },
  { label: "Reduced motion",       id: "reduced" },
  { label: "Dark",                 id: "dark" },
  { label: "Swap to real content", id: "swap" },
  { label: "Playground",           id: "playground" },
  { label: "Props",                id: "props" },
  { label: "Usage",                id: "usage" },
]},
```

`Page` 타입에 `"skeleton"` 추가 + 하단 `{current === "skeleton" && <SkeletonPage />}`.

### 12.2 섹션 구성

**Basic shapes**
```tsx
<div className="flex gap-4 items-center">
  <Skeleton.Root shape="text" width={200} />
  <Skeleton.Root shape="rect" width={160} height={80} />
  <Skeleton.Root shape="circle" size={56} />
</div>
```

**Text multi-line**
```tsx
<div className="flex flex-col gap-6">
  <div>
    <h4>lines=1</h4>
    <Skeleton.Text lines={1} />
  </div>
  <div>
    <h4>lines=3 (기본)</h4>
    <Skeleton.Text lines={3} />
  </div>
  <div>
    <h4>lines=5 + randomize=false</h4>
    <Skeleton.Text lines={5} randomize={false} />
  </div>
  <div>
    <h4>lastLineWidth=null (마지막도 랜덤)</h4>
    <Skeleton.Text lines={3} lastLineWidth={null} />
  </div>
  <div>
    <h4>seed=7 (다른 패턴)</h4>
    <Skeleton.Text lines={3} seed={7} />
  </div>
</div>
```

**Avatar**
```tsx
<div className="flex gap-4 items-end">
  <div><div className="text-xs">circle/40</div><Skeleton.Avatar size={40}/></div>
  <div><div className="text-xs">rounded/56</div><Skeleton.Avatar shape="rounded" size={56}/></div>
  <div><div className="text-xs">square/72</div><Skeleton.Avatar shape="square" size={72}/></div>
</div>
```

**Card preset**
```tsx
<div className="grid grid-cols-3 gap-4">
  <Skeleton.Card />
  <Skeleton.Card hasMedia lines={3} />
  <Skeleton.Card hasMedia hasFooter lines={2} />
  <Skeleton.Card hasAvatar lines={2} />
  <Skeleton.Card hasMedia mediaHeight={80} lines={1} />
  <Skeleton.Card hasFooter lines={4} />
</div>
```

**Table preset**
```tsx
<Skeleton.Table rows={5} cols={4} />
<hr />
<h4>colWidths 지정</h4>
<Skeleton.Table rows={3} cols={4} colWidths={[60, "30%", "40%", 120]} />
<h4>헤더 없음</h4>
<Skeleton.Table rows={4} cols={3} hasHeader={false} />
```

**Pulse vs Shimmer**
```tsx
<div className="grid grid-cols-3 gap-4">
  <div>
    <h4>shimmer (기본)</h4>
    <Skeleton.Card hasMedia lines={2} animation="shimmer"/>
  </div>
  <div>
    <h4>pulse</h4>
    <Skeleton.Card hasMedia lines={2} animation="pulse"/>
  </div>
  <div>
    <h4>off</h4>
    <Skeleton.Card hasMedia lines={2} animation={false}/>
  </div>
</div>
```

**Reduced motion**
```tsx
<p>
  이 페이지는 시스템의 "동작 감소" 설정을 자동 감지합니다.
  macOS: 설정 → 손쉬운 사용 → 디스플레이 → 동작 줄이기.
  현재 상태: <code>{reduced ? "reduce ON" : "reduce OFF"}</code>
</p>
<Skeleton.Card hasMedia lines={2} animation="shimmer"/>
```
(useReducedMotion 훅을 demo 에서도 호출해 상태 노출.)

**Dark**
```tsx
<div style={{background:"#0f172a",padding:24,borderRadius:12}}>
  <Skeleton.Card theme="dark" hasMedia lines={3}/>
  <div style={{height:16}}/>
  <Skeleton.Table theme="dark" rows={4} cols={4}/>
</div>
```

**Swap to real content**
```tsx
function SwapDemo() {
  const [loaded, setLoaded] = useState(false);
  return (
    <div>
      <Button onClick={() => setLoaded(l => !l)}>
        {loaded ? "Reset to skeleton" : "Load data"}
      </Button>
      <div style={{marginTop:12}}>
        <Skeleton.Card visible={!loaded} hasMedia lines={3} fadeMs={240}>
          <Card.Root>
            <Card.Header title="실제 콘텐츠"/>
            <Card.Body>
              여기에 실제 데이터가 들어옵니다. Swap 은 180ms fade (fadeMs 로 조정 가능).
            </Card.Body>
          </Card.Root>
        </Skeleton.Card>
      </div>
    </div>
  );
}
```

**Playground**
상단 컨트롤 바:
- `preset` select (Root / Text / Avatar / Card / Table)
- `shape` select (text / rect / circle) — Root 일 때만
- `animation` 라디오 (shimmer / pulse / false)
- `theme` 라디오 (light / dark)
- `width` / `height` input (Root rect 일 때)
- `size` input (circle / avatar)
- `lines` input (Text / Card)
- `rows` / `cols` input (Table)
- `hasMedia` / `hasFooter` / `hasAvatar` 체크 (Card)
- `visible` 체크
- `fadeMs` input

아래에 240~320 px 고정 높이 preview 컨테이너에 `<Skeleton.{Preset} {...args}/>` 렌더. visible=false 시 자리에 작은 "Real content" 박스 표시.

**Props 표**
기존 페이지 패턴 그대로. `Skeleton.Root`, `Skeleton.Text`, `Skeleton.Avatar`, `Skeleton.Card`, `Skeleton.Table` 5개 표.

**Usage (5개)**
1. 단일 텍스트 플레이스홀더.
2. 카드 리스트 (3개 카드) 로딩.
3. 테이블 로딩 → 데이터 도착 swap.
4. Suspense fallback 으로 `<Skeleton.Card/>` 사용.
5. 아바타 + 이름 한 줄 (댓글 목록 로딩).

**Usage 샘플 — Suspense**:
```tsx
<Suspense fallback={<Skeleton.Card hasMedia lines={3}/>}>
  <UserCard userId={1}/>
</Suspense>
```

**Usage 샘플 — 댓글 목록**:
```tsx
<ul className="flex flex-col gap-3">
  {Array.from({length:5}).map((_,i) => (
    <li key={i} className="flex gap-3 items-start">
      <Skeleton.Avatar size={40}/>
      <div className="flex-1">
        <Skeleton.Root shape="text" width="30%"/>
        <div style={{height:4}}/>
        <Skeleton.Text lines={2}/>
      </div>
    </li>
  ))}
</ul>
```

---

## 13. 검증 계획

### 13.1 자동화
```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```
주의: `exactOptionalPropertyTypes: true` — optional prop 은 `?:` 로 받고 값 병합 시 `undefined` 분기 명시. `noUncheckedIndexedAccess: true` — `colWidths[i]` 는 `SkeletonSize | undefined`. `verbatimModuleSyntax: true` — 타입은 `import type`.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic shapes 3종 시각 확인.
- [ ] Text multi-line: 각 줄 너비가 자연스러운 변주(75~95%), 마지막 60%.
- [ ] Text seed 변경 시 패턴 다름.
- [ ] randomize=false 시 모든 줄 100%.
- [ ] Avatar circle/rounded/square 3종.
- [ ] Card 6가지 조합 모두 정상.
- [ ] Table rows/cols 동적 변경 반영.
- [ ] Pulse: opacity 1500ms 주기로 오르내림.
- [ ] Shimmer: 1500ms 주기로 좌→우 스윕.
- [ ] animation=false: 완전 정적.
- [ ] Reduced motion: macOS/Windows 설정 ON → 애니메이션 즉시 멈춤 (새로고침 없이도 `matchMedia` change 이벤트로 반영).
- [ ] Dark: 배경 `#334155`, shine 흰색 저명도.
- [ ] Swap: `Load data` 클릭 → skeleton fade-out 직후 children fade-in 180ms. `aria-busy` 가 `false` 로 전환되거나 role 자체가 사라짐.
- [ ] Playground: 모든 prop 조합 실시간 반영.
- [ ] Props 표 Root/Text/Avatar/Card/Table 모두 채워짐.
- [ ] Usage 5개 전부 정상 렌더.
- [ ] 다른 페이지(CommandPalette, SplitPane 등) 리그레션 없음.

### 13.3 엣지 케이스
- [ ] `shape="rect"` + width/height 누락 → 콘솔 warn + fallback 렌더.
- [ ] `width={0}` / `height={0}` → 0px 블록 (보이지 않음). 에러 없음.
- [ ] `lines={0}` → 빈 div.
- [ ] `lines={1000}` → 렌더 됨 (warn 없음), perf 저하 없음(단일 요소는 많아도 CSS animation).
- [ ] `Skeleton.Table rows={300}` → dev warn 노출.
- [ ] `visible=false` + children 없음 → `null`, 에러 없음.
- [ ] `fadeMs=0` → 즉시 교체.
- [ ] SSR hydration: `renderToString` 2회 비교 시 동일 HTML (randomize 결정적).
- [ ] reducedMotion 런타임 변경 (toggle) → 즉시 반영.
- [ ] `theme="dark"` + `style={{backgroundColor:"red"}}` → style 우선 (inline 이 last).
- [ ] circle + borderRadius 커스텀 → 사용자 값 적용.
- [ ] animation prop 을 제거(undefined) 로 바꾸면 "shimmer" 기본값.
- [ ] `className` 으로 `.sk-root` 에 width 추가 override 가능.

### 13.4 스크린리더 (VoiceOver)
- [ ] skeleton 마운트 시 "Loading" 음성.
- [ ] `visible=false` 전환 시 aria-busy 해제 → "Loading" 반복 없음.
- [ ] Card/Table/Text 의 내부 하위 Skeleton 에 대해 `role="status"` 가 **한 번만** 읽힘(중복 없음).

---

## 14. 성능

### 14.1 목표
- 1 페이지에 Skeleton 100개 있어도 **60 fps**.
- 초기 마운트 < 1 ms/컴포넌트 (유틸 함수들이 모두 O(1) 또는 O(lines)).

### 14.2 병목 가설 + 완화
1. **CSS animation 개수**: shimmer 는 요소당 1개 keyframe. 브라우저는 GPU 합성으로 거의 무료. 단 `will-change: transform` 이 너무 많으면 메모리 폭증 → `.sk-shimmer` 에만 `will-change`, `.sk-root` 자체에는 없음.
2. **Table 1000 rows**: DOM 수가 압도적. v1 은 `rows>200` dev warn 만, 가상화는 v1.2. 사용자가 가상화 리스트 안에서 skeleton 을 쓰는 것은 권장.
3. **re-render**: Root 는 state-less. Text 는 `useMemo` 로 widths 캐시. Avatar/Card/Table 도 인라인 스타일 외 상태 없음. Parent re-render 시에도 자식은 props 동일하면 대부분 reconciliation 만.
4. **color palette CSS vars inline**: 매 요소마다 `style={{--sk-bg:..., --sk-shine:...}}` — 문자열 비교 OK. 사용자 style 과 merge 시 spread 주의.
5. **`className` clsx 연산**: 미세. infinite loop 없음.

### 14.3 repaint
- shimmer 의 `transform: translateX(...)` 는 compositor-only (repaint 없음).
- pulse 의 `opacity` 도 compositor-only.
- 따라서 100개 shimmer + 스크롤 해도 main thread 부담 없음.

### 14.4 측정 방법
- DevTools Performance 탭 → `Skeleton` demo 페이지 스크롤/마운트 녹화 → long task 없음 확인.
- `npx tsup` 결과 bundle 크기 확인: skeleton 전체 예상 ~2 KB min, ~0.9 KB gzip.

---

## 15. 접근성

### 15.1 role / aria 계약

- Root: `role="status"` + `aria-busy="true"` + `aria-label="Loading"` (사용자 override 가능).
- `role="status"` 는 aria-live="polite" 와 동치. 스크린리더가 방해 없이 읽는다.
- `<span class="sk-shimmer">`: `aria-hidden="true"`. 시각 장식물.
- 프리셋(Text/Card/Table) 의 최상위만 role 보유. 내부 자식 Root 는 `_suppressAria=true` 로 role/aria-busy/aria-label 모두 제거.

### 15.2 swap 후 announcement

`visible=false` 가 되면:
- skeleton 은 unmount → role="status" 요소 사라짐.
- children 의 일반 콘텐츠가 노출됨.
- 스크린리더는 더 이상 "Loading" 반복하지 않음. 콘텐츠 변화 자체는 기본 announce 하지 않음(명시적 live region 필요).

### 15.3 비상호작용

- `tabindex` 미설정.
- 포커스 이동/트랩 없음.
- 키보드 단축키 없음.

### 15.4 reduced motion

§5.1 참조. OS 설정 감지 → `animation=false` 강제. CSS 미디어 쿼리로 fallback.

### 15.5 명시적 label

사용자가 `aria-label="댓글 로딩 중"` 같이 주면 override. 다국어 앱에서는 필수적으로 지정 권장.

---

## 16. 알려진 트레이드오프 · 결정

1. **pulse vs shimmer 기본값**: shimmer 가 시각적 인상이 더 강하고 "로딩 중"을 명확히 알림(VSCode/GitHub/Ant Design 대세). pulse 는 성능 우위가 있으나 "그냥 비활성화된 UI" 와 혼동될 여지. v1 은 **shimmer 기본**. 사용자가 `animation="pulse"` 로 쉽게 바꿈.

2. **text 줄 width 랜덤 — SSR hydration mismatch 위험**: `Math.random()` 을 쓰면 서버/클라이언트 값 다름 → React 경고 + 시각 깜빡. 대응: 고정 시드 Mulberry32 의사랜덤(§3.2). 계약: "같은 seed+index 는 항상 같은 값". 사용자가 seed 변경 시만 패턴 바뀜.

3. **visible swap one-way fade**: 양방향 crossfade 는 두 요소 동시 mount + absolute overlap + 높이 계산 필요. 복잡도 대비 UX 이득 작음. v1 은 "skeleton 즉시 unmount → children fade-in" 한 방향만. `fadeMs=0` 로 완전 즉시 교체도 가능.

4. **prop 이 `animation="shimmer"` 여도 reduced-motion 강제 off**: 접근성 우선. 사용자 옵트아웃(`respectReducedMotion=false`) 허용 시 WCAG 위반 쉬움 → v1 미지원. 나중에 정책 변경 가능.

5. **프리셋 내부에서 Root 를 직접 조립 (context 없음)**: context 를 둬서 프리셋이 공통 설정을 자동 전파하는 설계도 가능하지만, "Text/Card/Table 은 독립적인 프리셋" 이라는 구조가 더 단순. prop drilling 최소화는 `extractCommonProps` 유틸로 충분.

6. **`_suppressAria` internal prop**: 공개 API 에는 없음 (types.ts 에 export 안 함). 프리셋이 내부 Root 에 전달. TS 레벨에서 `SkeletonRootProps` 에는 포함하되 public 문서화 안 함. 대안: 모든 Root 에 role 유지하고 스크린리더 중복 감수 — VoiceOver 실험 결과 "Loading" 이 3~5회 반복되어 UX 나쁨. 억제가 정답.

7. **Table 가상화 없음**: rows > 200 에서 perf 저하. 실제 데이터도 가상화가 정답이므로, skeleton 만 별도 가상화하는 것은 복잡도 대비 이득 낮음. warn 만.

8. **CSS in file (별도 .css) vs inline style**: 기존 plastic 컴포넌트는 inline style + className 혼용. Skeleton 은 keyframes 를 inline 으로 표현 불가하므로 별도 .css 파일 필요. `src/index.ts` 또는 root 에서 `import "./components/Skeleton/Skeleton.css";` 한 번만. 사용자 앱이 CSS 를 import 하지 않으면 동작 안 함 — 번들러 설정 문서(README) 에 명시.

9. **size prop 의 타입 `number | string`**: `number` 는 px, `string` 은 passthrough. `"80%"`, `"2rem"`, `"calc(100% - 16px)"` 모두 가능. 타입 guard 는 `toCssLength` 하나로 통합. 엄격 유니온(`number | \`${number}%\``) 은 너무 제한적.

10. **Card 프리셋과 실제 Card 컴포넌트 1:1 매칭 안 됨**: skeleton 은 "대략적 레이아웃" 이 목적이며, 실제 Card 의 shadow/border/radius 를 정확히 따라하면 "진짜 Card 로 오해" 가능. 의도적으로 shadow 제거, 색만 회색. `mimicCard` 옵션은 v1.1 후보.

---

## 17. 후속 작업 (v1.1+)

- **DataTable 통합**: `DataTableLoading.tsx` 내부 skeleton 을 `Skeleton.Table` 로 교체. 별도 PR (DataTable 작업자와 조율).
- **CommandPalette async loading**: `items` 가 Promise 중일 때 `<Skeleton.Text lines={3}/>` 을 기본 loading UI 로.
- **Skeleton.Svg**: react-content-loader 스타일 path 자유 지정. `<Skeleton.Svg width={300} height={100}><rect x=0 y=0 width=100 height=16/></Skeleton.Svg>`.
- **Skeleton.Mimic**: `ref={realEl}` 혹은 `querySelector` 로 실제 DOM 측정 → 동일 dimension 스켈레톤 자동 생성. 복잡 레이아웃 자동 추출.
- **blurhash / LQIP 이미지**: `<Skeleton.Image src="..." hash="LEHV6..."/>` 가 blur → sharp crossfade.
- **양방향 crossfade swap**: `fadeMode="crossfade"` 옵션.
- **progress aware**: `progress={0.6}` 이면 스켈레톤이 60% 만 회색, 나머지는 연한 회색.
- **`mimicCard` 옵션**: 실제 Card 컴포넌트와 shadow/border 까지 일치.
- **`respectReducedMotion=false`** 옵트아웃 (주의 필요).
- **CSS 의존성 제거**: Emotion / styled-components / CSS-in-JS 기반으로 migration. v1 은 plain .css.
- **RTL**: shimmer 방향이 LTR 기준 좌→우. RTL 에서 우→좌 가 자연스러우면 `[dir="rtl"]` 셀렉터로 반전.
- **테스트**: Vitest 기반 단위 테스트 도입 시 `computeTextLineWidths` 결정성, `resolveDimensions` 케이스 커버.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| Card preset 레이아웃 참조 | `/Users/neo/workspace/plastic/src/components/Card/` |
| Card 파일들 | `/Users/neo/workspace/plastic/src/components/Card/CardRoot.tsx`, `CardHeader.tsx`, `CardBody.tsx`, `CardFooter.tsx` |
| Table row preset 참조 + 후속 리팩터링 대상 | `/Users/neo/workspace/plastic/src/components/DataTable/` |
| 기존 DataTable loading 플레이스홀더 | `/Users/neo/workspace/plastic/src/components/DataTable/DataTableLoading.tsx` |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 데모 페이지 레이아웃 템플릿 | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |
| 이전 plan 포맷 참조 | `/Users/neo/workspace/plastic/docs/plans/017-splitpane-component.md` |
| CommandPalette async 후속 연동 대상 | `/Users/neo/workspace/plastic/src/components/CommandPalette/` |

---

## 19. 의존성 영향

신규 런타임 의존 **없음**. React 18.3 (기존) + DOM API (`matchMedia`, CSS keyframes) 만 사용.

번들 영향:
- Skeleton 자체 예상 크기: ~2.0 KB (min), ~0.9 KB (min+gzip).
- CSS 파일 `Skeleton.css`: ~0.7 KB (min), ~0.3 KB (gzip).
- plastic 전체 dist 거의 영향 없음.

CSS import:
- 소비자 앱이 `import "plastic/dist/Skeleton.css"` (또는 전체 `plastic/dist/style.css`) 을 한 번 import 해야 함.
- 빌드 구성은 `tsup` + external CSS 방식. 기존 plastic 에 css 파일이 없는 경우 이 PR 이 최초 도입 → README/docs 에 import 라인 추가 필수.
- 또는 inline CSS-in-JS 로 전환하는 방법도 있으나 runtime-zero 원칙과 배치. v1 은 plain .css.

Browser 지원:
- `matchMedia`: 모든 모던 브라우저.
- `prefers-reduced-motion`: Chrome 74+, Firefox 63+, Safari 10.1+.
- CSS `isolation: isolate`: 모든 모던 브라우저.
- CSS variables: 모든 모던 브라우저.

SSR:
- `useReducedMotion` 이 `typeof window === "undefined"` 가드. 서버에서는 `false` 리턴 (애니메이션 off 가 아닌 "감지 못함 = 기본 shimmer" 의미로 렌더). 하이드레이션 직후 CSR 에서 다시 측정.
- `seededRandom` 기반 width 는 서버/클라 동일.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함, `Skeleton.css` 가 dist 에 복사/포함됨).
- [ ] demo 에 `/#/skeleton` 라우트 동작.
- [ ] §13.2 수동 체크리스트 전부 확인.
- [ ] §13.3 엣지 케이스 전부 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] §13.4 스크린리더 VoiceOver 동작 확인 (macOS Cmd+F5).
- [ ] `src/components/index.ts` 배럴에 `export * from "./Skeleton";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 의존 없음).
- [ ] Props 문서 섹션이 Props 표로 채워져 있음 (Root/Text/Avatar/Card/Table 5개).
- [ ] Usage 섹션에 최소 5 개 스니펫 (단일 / Card 리스트 / Table swap / Suspense / 댓글 목록).
- [ ] 데모 Playground 에서 모든 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] Shimmer / Pulse / off 3모드 전환 검증.
- [ ] OS reduced-motion ON/OFF 런타임 전환 시 즉시 반영.
- [ ] swap (visible) 전환 시 fade 180ms 자연스러움.
- [ ] SSR 안전성 (같은 seed+index 는 결정적) 확인 — 콘솔에 hydration mismatch 경고 없음.
- [ ] CommandPalette / Card / DataTable / SplitPane / PipelineGraph / HexView / CodeView / Dialog / Popover / Tooltip / Toast / Stepper / PathInput 등 기존 페이지 리그레션 없음.
- [ ] Card 프리셋이 실제 `Card` 컴포넌트와 레이아웃 대응되게 padding/radius 맞춤.
- [ ] Table rows > 200 시 dev warn 노출.
- [ ] `Skeleton.css` 의 `@media (prefers-reduced-motion: reduce)` 블록 존재 및 동작.

---

**끝.**
