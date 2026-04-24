# Progress 컴포넌트 설계문서

## Context

plastic 라이브러리에 "진행 상태(진척도)를 시각화하는 프리미티브" `Progress` 를 추가한다. 역할 비유: VSCode 의 하단 상태바 업로드 진행바, IntelliJ 의 인덱싱 진행, macOS Finder 의 복사 다이얼로그, npm install 의 로딩 바, Chrome 의 탭 로딩 인디케이터. `Progress` 는 "시간이 걸리는 연산의 경과/남음을 가시화" 라는 단일 책임을 가진 **runtime-zero, headless-style** 컴포넌트이며, 선형(linear bar) · 원형(circular SVG) 두 가지 shape 를 하나의 API 로 지원한다.

참고 (prior art — UX·API 근거):
- **Radix UI `Progress`** — `Root` + `Indicator` compound, `value`/`max` 이중 제어, indeterminate 상태 데이터 속성.
- **Ant Design `Progress`** — `type="line"|"circle"|"dashboard"`, `status` (success/exception/active), `steps` (segmented stepper bar), `strokeLinecap`, gradient stroke.
- **MUI `LinearProgress` + `CircularProgress`** — 두 개 분리 API. determinate/indeterminate/buffer 3 가지 variant. indeterminate 키프레임 정의가 표준 레퍼런스.
- **Chakra UI `Progress`** — striped + animated(`hasStripe` + `isAnimated`) 조합이 plastic 스타일과 유사.
- **Material Web `md-linear-progress` / `md-circular-progress`** — Web Components 표준. 접근성 속성 기준.
- **HTML `<progress>` element** — `role="progressbar"` + `aria-valuenow/min/max` 베이스라인.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/Stepper/` — **유사/경계 컴포넌트**. "단계 기반" 진행은 Stepper 가 담당 (`StepperStep`, `StepperSeparator`, completed/active/pending 상태). Progress 의 `segments` prop 과 역할이 겹치므로 §16 에서 경계 문서화.
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅 (단일 값 버전).
- `src/components/index.ts` — 컴포넌트 배럴. `export * from "./Progress";` 추가 위치.
- `demo/src/App.tsx` — NAV 배열 + `Page` 유니온 타입 + 라우팅. `"progress"` 항목 추가 위치.
- `demo/src/pages/CommandPalettePage.tsx` — 최신 데모 페이지 레이아웃/Props·Usage·Playground 섹션 구조 템플릿.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 1) 기본 Linear determinate
<Progress value={42} />

// 2) Compound — 라벨·트랙·인디케이터를 직접 배치
<Progress.Root value={42} max={100} shape="linear" size="md" variant="default">
  <Progress.Label placement="outside">업로드 중…</Progress.Label>
  <Progress.Track>
    <Progress.Indicator />
    <Progress.Indicator kind="buffer" value={68} />
  </Progress.Track>
  <Progress.ValueText />
</Progress.Root>

// 3) Indeterminate Linear (값 미정)
<Progress shape="linear" indeterminate />

// 4) Circular determinate (원형)
<Progress shape="circular" value={72} size="lg" strokeLinecap="round">
  72%
</Progress>

// 5) Segmented (단계형 막대)
<Progress shape="linear" segments={5} value={3} variant="success" />

// 6) Striped + Animated
<Progress shape="linear" value={60} striped animated />
```

렌더 결과 (개념):
```
Linear determinate 42%
┌────────────────────────────────────────────────────┐
│████████████████████                                │
└────────────────────────────────────────────────────┘

Linear buffer (primary 42%, buffer 68%)
┌────────────────────────────────────────────────────┐
│██████████████████████░░░░░░░░░░░░                  │
└────────────────────────────────────────────────────┘
 ↑primary (value)       ↑buffer (secondary)

Linear indeterminate (슬라이딩 스트라이프)
┌────────────────────────────────────────────────────┐
│        ▓▓▓▓▓▓▓▓▓         ▓▓▓▓▓▓▓▓▓                  │  ← 좌→우 왕복
└────────────────────────────────────────────────────┘

Linear segmented (5 steps, value=3)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│█████│ │█████│ │█████│ │     │ │     │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘

Circular determinate 72%
       ╱─╲
      ╱   ╲
     │  72%│   ← SVG stroke-dasharray 로 호 길이 제어
      ╲___╱

Circular indeterminate
       ╱─╲         ← 360° 회전
      ╱▓▓ ╲
     │     │
      ╲___╱
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Progress.Root / Track / Indicator / Label / ValueText` 다섯 소계. Context 로 상태 공유.
- **단축 사용**. `<Progress value={n} />` 는 Root + Track + Indicator + (옵션) ValueText 를 자동 조립하는 convenience wrapper. 90% 케이스를 한 줄로.
- **shape 이원화**. `shape="linear"` (flex 바) | `shape="circular"` (SVG circle + `stroke-dasharray`). DOM/CSS 는 완전히 다르지만 API 는 동일.
- **determinate / indeterminate / buffer / segmented** 4 가지 mode 가 직교 또는 배타 관계. 조합 규칙을 §3.3 에서 엄격히 정의.
- **runtime-zero**. 외부 애니메이션 라이브러리 없음. 모든 모션은 CSS keyframes(`@keyframes plastic-progress-*`) 로 선언. React re-render 없이 브라우저가 애니메이트.
- **controlled/uncontrolled 이중 API**. `value` / `defaultValue` / `onValueChange` (단, Progress 는 비상호작용이므로 `onValueChange` 는 "외부 tick 이 바뀔 때 콜백" 성격이 아닌 내부적 의미 최소 — 주로 controlled 만 쓰인다).
- **접근성 1등 시민**. `role="progressbar"` + `aria-valuenow/min/max` + `aria-label` 필수, indeterminate 시 `aria-valuenow` 제거, 선택적 `aria-live="polite"` 로 보조공학 announcement.
- **CSS 변수 테마**. 색상·두께·라운드 반경·애니메이션 duration 을 `--plastic-progress-*` 로 노출하여 사용자가 override 가능.
- **Stepper 와 경계 분리**. Stepper 는 "UI 라벨/콘텐츠가 붙는 단계 네비게이션", Progress.segments 는 "라벨 없는 순수 시각적 분할 막대". §16.

---

## 1. Goals / Non-goals

### Goals (v1)
1. **Linear** + **Circular** 두 shape 지원. 동일 prop 표(variant, size, state, label, striped 등)을 공유.
2. **Determinate** (value 0~max) 정확한 진행 렌더.
3. **Indeterminate** 상태 — value 미지정 시 혹은 `indeterminate` prop 이 true 일 때. CSS 기반 무한 애니메이션 (Linear: 좌→우 슬라이딩 스트라이프, Circular: 회전 arc).
4. **Buffer** 보조 게이지 — 1 차(primary) 위에 연한 2 차(buffer) 를 겹쳐 "다운로드된 데이터 vs 재생된 데이터" 유형 표현. Linear 전용(Circular buffer 는 v1 범위 밖).
5. **Segmented stepper bar** — `segments={n}` 으로 n 개 동일 너비 셀 분할, value 0~n 의 정수 진행. Linear 전용. (단계 **라벨/클릭** 은 Stepper 소관 — 경계 §16.)
6. **변형 `variant`** : `"default" | "success" | "warning" | "error"`. 트랙/필 색상 팔레트 전환.
7. **사이즈 `size`** : `"sm" | "md" | "lg"`. Linear 는 track 높이(4/8/12 px), Circular 는 직경(24/40/64 px).
8. **라벨 placement** : `"inside" | "outside" | "none"`. Linear 의 "inside" 는 필 위에 % 텍스트 오버레이, "outside" 는 트랙 위/아래, Circular 는 중앙 홀에 표시.
9. **Striped + Animated** 옵션. `striped` (대각선 패턴) + `animated` (스트라이프가 흐르는 애니메이션). Linear 전용.
10. **Circular 전용 프롭**: `strokeWidth`, `strokeLinecap` ("butt" | "round"), `trackOpacity`.
11. **controlled/uncontrolled 이중 API**: `value` / `defaultValue`.
12. **Light / Dark 테마**.
13. **접근성**: role/aria 완비. indeterminate 시 `aria-valuenow` 제거, `aria-label` 또는 `aria-labelledby` 필수 dev warn.
14. **runtime-zero**: React + DOM + CSS 만. 외부 의존 0.

### Non-goals (v1 제외)
- **Circular buffer** (이중 호 겹치기) — 수요 적음, v1.1.
- **Dashboard gauge** (Ant `type="dashboard"`) — 호의 일부만 그리는 3/4 원. v1.1.
- **Gradient stroke** — `from`/`to` 두 색을 linearGradient 로 보간하는 채움. v1.1.
- **사용자 상호작용** (클릭·드래그로 값 변경) — 그건 Slider/ProgressBar Input 의 역할. Progress 는 **표시만**.
- **Animated number counting** (value 가 바뀔 때 42→75 로 숫자가 흐르는 효과) — CSS transition 으로 fill 만 보간. 숫자 counting 은 애플리케이션 단 훅 사용.
- **Tooltip on hover** — Tooltip 컴포넌트로 감싸면 됨. Progress 자체에는 내장 안 함.
- **Marquee label scroll** — 라벨이 너무 길 때 자동 스크롤. v1 은 `text-overflow: ellipsis`.
- **SVG export / download** — Circular 를 PNG 로 내려받기 등. 범위 밖.
- **실시간 ETA 계산** — 남은 시간 자동 계산. 사용자 측 책임.
- **Queue / multi-file progress 조합 UI** — 여러 Progress 를 모아 보여주는 리스트는 애플리케이션 책임. (단, v1.1 `uploader` preset 예시는 §17.)

---

## 2. 공개 API

### 2.1 타입 — `src/components/Progress/Progress.types.ts`

```ts
export type ProgressTheme = "light" | "dark";
export type ProgressShape = "linear" | "circular";
export type ProgressSize = "sm" | "md" | "lg";
export type ProgressVariant = "default" | "success" | "warning" | "error";
export type ProgressLabelPlacement = "inside" | "outside" | "none";
export type ProgressStrokeLinecap = "butt" | "round";

/**
 * Progress 의 외형/상태를 결정하는 공통 프롭. Root/단축 wrapper 모두 공유.
 */
export interface ProgressCommonProps {
  /** 현재 값. 0 ~ max. undefined 이면 indeterminate 로 해석. */
  value?: number;
  /** uncontrolled 기본값. 이후 외부에서 바꿔도 반영 안 됨(`value` 를 써야 함). */
  defaultValue?: number;
  /** value 상한. 기본 100. 음수/0 은 dev warn 후 100 으로 fallback. */
  max?: number;
  /**
   * true 이면 값과 무관하게 indeterminate 애니메이션.
   * false 이면 value 미지정도 determinate=0 취급.
   * 미지정(undefined) 이면 "value 가 undefined 이면 indeterminate, 아니면 determinate" 자동 판정.
   */
  indeterminate?: boolean;
  /** 선/원 택일. 기본 "linear". */
  shape?: ProgressShape;
  /** 크기. 기본 "md". */
  size?: ProgressSize;
  /** 상태별 팔레트. 기본 "default". */
  variant?: ProgressVariant;
  /** Light/Dark 팔레트. 기본 "light". */
  theme?: ProgressTheme;

  /**
   * 단계형 막대(세그먼트). Linear 전용.
   * 2 이상의 정수 지정 시 n 개 동일 너비 셀로 분할하고, value 는 0..segments 정수로 해석.
   * Circular 와 함께 지정하면 dev warn + 무시.
   */
  segments?: number;

  /**
   * 보조 게이지(primary 뒤 연한 색). Linear 전용. 예: 다운로드된 바이트 vs 재생된 바이트.
   * Circular/segmented 와 함께 지정 시 dev warn + 무시.
   */
  buffer?: number;

  /** 대각선 줄무늬 패턴. Linear 전용. */
  striped?: boolean;
  /** striped 가 true 일 때 스트라이프가 흐르는 애니메이션. */
  animated?: boolean;

  /** 라벨 배치. 기본 "none". "inside" 는 필 위 오버레이, "outside" 는 트랙 바깥, Circular 는 중앙. */
  labelPlacement?: ProgressLabelPlacement;
  /**
   * 라벨 포맷터. 기본: `(v, max) => \`${Math.round((v/max)*100)}%\``.
   * indeterminate 이면 호출되지 않음(라벨 자체를 숨긴다).
   */
  formatLabel?: (value: number, max: number) => React.ReactNode;

  /** Circular 전용: stroke 두께(px). 기본 size 별 (sm=3, md=4, lg=6). */
  strokeWidth?: number;
  /** Circular 전용: stroke 끝 모양. 기본 "round". */
  strokeLinecap?: ProgressStrokeLinecap;
  /** Circular 전용: 트랙(빈 원) 투명도(0~1). 기본 0.12. */
  trackOpacity?: number;

  /**
   * 접근성 라벨. 스크린리더가 progressbar 를 "무엇의 진행" 으로 읽을지.
   * `aria-label` 또는 `aria-labelledby` 중 하나는 반드시 지정 권장. dev warn.
   */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  /**
   * true 이면 컨테이너에 `aria-live="polite"` 를 걸어 value 변경을 읽음.
   * 기본 false (동적 변경 잦을 때 스팸 방지).
   */
  announce?: boolean;

  className?: string;
  style?: React.CSSProperties;
}

/**
 * 단축 API (90% 사용). compound 를 자동 조립한다.
 * children 은 Circular 의 중앙 텍스트나 Linear 의 커스텀 라벨에 쓰인다(labelPlacement 해석).
 */
export interface ProgressProps extends ProgressCommonProps {
  children?: React.ReactNode;
}

export interface ProgressRootProps extends ProgressCommonProps {
  children: React.ReactNode;
}

export interface ProgressTrackProps {
  className?: string;
  style?: React.CSSProperties;
  /** Track 내부에 놓일 Indicator(들). Linear 는 1~2 개(primary/buffer), Circular 는 1 개. */
  children: React.ReactNode;
}

export interface ProgressIndicatorProps {
  /**
   * "primary" (기본) | "buffer".
   * "buffer" 는 Linear 에서만 의미 있음.
   */
  kind?: "primary" | "buffer";
  /**
   * kind === "buffer" 일 때 사용할 별도 값. kind === "primary" 일 때는 무시.
   */
  value?: number;
  className?: string;
  style?: React.CSSProperties;
}

export interface ProgressLabelProps {
  /** "inside" | "outside". 기본 "outside". */
  placement?: "inside" | "outside";
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export interface ProgressValueTextProps {
  /** formatter override. 없으면 Root 의 formatLabel. */
  format?: (value: number, max: number) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
```

### 2.2 배럴 — `src/components/Progress/index.ts`

```ts
export { Progress } from "./Progress";
export type {
  ProgressProps,
  ProgressRootProps,
  ProgressTrackProps,
  ProgressIndicatorProps,
  ProgressLabelProps,
  ProgressValueTextProps,
  ProgressCommonProps,
  ProgressTheme,
  ProgressShape,
  ProgressSize,
  ProgressVariant,
  ProgressLabelPlacement,
  ProgressStrokeLinecap,
} from "./Progress.types";
```

그리고 `src/components/index.ts` 에 `export * from "./Progress";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// Progress.tsx
const ProgressShortcut = (props: ProgressProps) => { /* convenience wrapper */ };

ProgressShortcut.Root = ProgressRoot;
ProgressShortcut.Track = ProgressTrack;
ProgressShortcut.Indicator = ProgressIndicator;
ProgressShortcut.Label = ProgressLabel;
ProgressShortcut.ValueText = ProgressValueText;

export const Progress = ProgressShortcut;
```

사용자는 다음 두 스타일 중 택일:

```tsx
// Shortcut
<Progress value={42} />

// Compound
<Progress.Root value={42}>
  <Progress.Label>업로드</Progress.Label>
  <Progress.Track>
    <Progress.Indicator />
  </Progress.Track>
  <Progress.ValueText />
</Progress.Root>
```

displayName: `"Progress"`, `"Progress.Root"`, `"Progress.Track"`, `"Progress.Indicator"`, `"Progress.Label"`, `"Progress.ValueText"`.

---

## 3. 도메인 모델

### 3.1 value · max · percent

- 내부적으로 계산되는 단일 파생 값:
  ```ts
  const clampedMax = max > 0 ? max : 100;
  const clampedValue = value == null ? null : Math.max(0, Math.min(clampedMax, value));
  const percent = clampedValue == null ? null : (clampedValue / clampedMax) * 100;
  ```
- `percent` 는 항상 `0 ~ 100` 범위이며, 외부 노출은 안 함(내부 렌더 계산용).
- `value == null` → indeterminate 로 해석 (단 `indeterminate={false}` 가 명시되면 determinate=0).

### 3.2 상태 판정 우선순위

1. `indeterminate === true` → indeterminate.
2. `indeterminate === false` → determinate (value 미지정이면 0).
3. `indeterminate === undefined`:
   - `value == null` → indeterminate.
   - `value != null` → determinate.

이 규칙을 한 함수로:

```ts
function resolveMode(
  value: number | undefined,
  indeterminate: boolean | undefined,
): "determinate" | "indeterminate" {
  if (indeterminate === true) return "indeterminate";
  if (indeterminate === false) return "determinate";
  return value == null ? "indeterminate" : "determinate";
}
```

### 3.3 mode 조합 합법성 매트릭스

| shape    | segments | buffer | indeterminate | striped | 합법? |
|----------|----------|--------|---------------|---------|-------|
| linear   | -        | -      | false         | any     | ✅   |
| linear   | -        | -      | true          | any     | ✅ (stripe 는 indeterminate 모션 대체) |
| linear   | -        | 양수   | false         | any     | ✅ (buffer mode) |
| linear   | -        | 양수   | true          | -       | ❌ dev warn, buffer 무시 |
| linear   | ≥2       | -      | false         | -       | ✅ (segmented) |
| linear   | ≥2       | any    | -             | -       | ❌ dev warn, segments 우선 |
| linear   | ≥2       | -      | true          | -       | ❌ dev warn, indeterminate 무시 |
| circular | -        | any    | -             | -       | ❌ dev warn, buffer 무시(v1) |
| circular | any      | -      | -             | -       | ❌ dev warn, segments 무시 |
| circular | -        | -      | any           | any     | ✅ (stripe 는 무시 — circular 전용 X) |

충돌 시 dev 빌드에서 `console.warn("[Progress] …")`. prod 에서는 조용히 무시.

### 3.4 Context

```ts
interface ProgressContextValue {
  mode: "determinate" | "indeterminate";
  shape: ProgressShape;
  size: ProgressSize;
  variant: ProgressVariant;
  theme: ProgressTheme;
  value: number | null;      // clamped
  max: number;                // sanitized
  percent: number | null;     // 0..100 or null (indeterminate)
  buffer: number | null;      // clamped
  bufferPercent: number | null;
  segments: number | null;
  striped: boolean;
  animated: boolean;
  labelPlacement: ProgressLabelPlacement;
  formatLabel: (value: number, max: number) => React.ReactNode;
  strokeWidth: number;        // resolved by size
  strokeLinecap: ProgressStrokeLinecap;
  trackOpacity: number;
  labelledBy?: string;        // aria-labelledby 가 지정되었으면 사용, 아니면 ariaLabel
  ariaLabel?: string;
  announce: boolean;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);
```

`useProgressContext()` — null 이면 `"Progress.* must be used within Progress.Root"` throw.

---

## 4. 시각 / 구조 설계

### 4.1 Linear DOM 구조

```html
<div
  class="plastic-progress plastic-progress--linear"
  data-variant="default"
  data-size="md"
  data-mode="determinate"
  data-striped="false"
  data-animated="false"
  role="progressbar"
  aria-valuenow="42"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="업로드 진행">
  <!-- optional outside label -->
  <div class="plastic-progress__label plastic-progress__label--outside">업로드</div>
  <div class="plastic-progress__track">
    <!-- buffer (선택) -->
    <div class="plastic-progress__fill plastic-progress__fill--buffer" style="transform: scaleX(0.68)"></div>
    <!-- primary -->
    <div class="plastic-progress__fill plastic-progress__fill--primary" style="transform: scaleX(0.42)">
      <!-- optional inside label (value text) -->
      <span class="plastic-progress__value-text">42%</span>
    </div>
  </div>
</div>
```

fill 은 `transform: scaleX(p)` + `transform-origin: left` 로 구현 (width 애니메이션보다 GPU 가속 유리). `[dir="rtl"]` 에서는 `transform-origin: right` 로 자동 스왑.

### 4.2 Linear Segmented DOM

```html
<div class="plastic-progress plastic-progress--linear" data-segmented="true" role="progressbar" aria-valuenow="3" aria-valuemin="0" aria-valuemax="5">
  <div class="plastic-progress__track plastic-progress__track--segmented">
    <div class="plastic-progress__seg" data-filled="true"></div>
    <div class="plastic-progress__seg" data-filled="true"></div>
    <div class="plastic-progress__seg" data-filled="true"></div>
    <div class="plastic-progress__seg" data-filled="false"></div>
    <div class="plastic-progress__seg" data-filled="false"></div>
  </div>
</div>
```

각 `__seg` 는 flex:1 + gap 4px 로 균등 분할. `data-filled="true"` 에 variant 색.

### 4.3 Circular SVG 구조

```html
<div
  class="plastic-progress plastic-progress--circular"
  data-variant="default"
  data-size="md"
  data-mode="determinate"
  role="progressbar"
  aria-valuenow="72"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="로딩 중">
  <svg class="plastic-progress__svg" viewBox="0 0 40 40" width="40" height="40">
    <!-- 트랙 원 (연함) -->
    <circle class="plastic-progress__circle plastic-progress__circle--track"
            cx="20" cy="20" r="16" fill="none" stroke-width="4" />
    <!-- 진행 호 -->
    <circle class="plastic-progress__circle plastic-progress__circle--indicator"
            cx="20" cy="20" r="16" fill="none" stroke-width="4"
            stroke-dasharray="100.53"    <!-- 2*π*r -->
            stroke-dashoffset="28.15"    <!-- (1 - 0.72) * 100.53 -->
            stroke-linecap="round"
            transform="rotate(-90 20 20)" />  <!-- 12 시 방향 시작 -->
  </svg>
  <!-- 중앙 라벨 (holepiece) -->
  <div class="plastic-progress__center">72%</div>
</div>
```

핵심 공식:
```ts
const C = 2 * Math.PI * r;                 // 둘레
const offset = C * (1 - percent / 100);    // 현재 미완성 구간
// stroke-dasharray = "C"  stroke-dashoffset = offset
```

`transform="rotate(-90 cx cy)"` 로 시작점을 12 시 방향으로 회전. indeterminate 시 전체 SVG 에 `animation: plastic-progress-circular-rotate 1.4s linear infinite`, 동시에 `circle--indicator` 자체에 dasharray/offset 을 달리해 "호 길이가 줄었다 늘었다 하는" MUI 스타일 2중 애니메이션.

### 4.4 Indeterminate Linear 애니메이션 (CSS)

```css
.plastic-progress[data-mode="indeterminate"] .plastic-progress__fill--primary {
  /* determinate 용 transform 제거 */
  transform: none;
  width: 40%;
  position: absolute;
  top: 0; bottom: 0;
  animation: plastic-progress-linear-indeterminate 1.6s ease-in-out infinite;
}

@keyframes plastic-progress-linear-indeterminate {
  0%   { left: -40%; right: 100%; }
  60%  { left: 100%; right: -40%; }
  100% { left: 100%; right: -40%; }
}
```

(MUI 레퍼런스 스타일. `left`/`right` 를 같이 움직여 "폭 가변 + 슬라이딩" 을 일체화.)

### 4.5 Indeterminate Circular 애니메이션 (CSS)

```css
.plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__svg {
  animation: plastic-progress-circular-rotate 1.4s linear infinite;
}
.plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__circle--indicator {
  stroke-dasharray: 80, 200;
  stroke-dashoffset: 0;
  animation: plastic-progress-circular-dash 1.4s ease-in-out infinite;
}

@keyframes plastic-progress-circular-rotate {
  100% { transform: rotate(360deg); }
}
@keyframes plastic-progress-circular-dash {
  0%   { stroke-dasharray: 1, 200;  stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 100, 200; stroke-dashoffset: -15; }
  100% { stroke-dasharray: 100, 200; stroke-dashoffset: -125; }
}
```

### 4.6 Striped + Animated (Linear 전용)

```css
.plastic-progress[data-striped="true"] .plastic-progress__fill--primary {
  background-image: linear-gradient(
    45deg,
    rgba(255,255,255,0.2) 25%, transparent 25%,
    transparent 50%, rgba(255,255,255,0.2) 50%,
    rgba(255,255,255,0.2) 75%, transparent 75%
  );
  background-size: 16px 16px;
}
.plastic-progress[data-striped="true"][data-animated="true"] .plastic-progress__fill--primary {
  animation: plastic-progress-stripes 1s linear infinite;
}
@keyframes plastic-progress-stripes {
  0%   { background-position: 0 0; }
  100% { background-position: 16px 0; }
}
```

### 4.7 팔레트 (variant · state)

```ts
// Progress/theme.ts
export const progressPalette = {
  light: {
    track:          "rgba(0,0,0,0.08)",
    trackSegmented: "rgba(0,0,0,0.05)",
    labelFg:        "#374151",
    valueTextFg:    "#ffffff",        // fill 위 inside 라벨
    valueTextFgOut: "#374151",        // outside 라벨
    variants: {
      default: { fill: "#2563eb", buffer: "rgba(37,99,235,0.30)" },
      success: { fill: "#16a34a", buffer: "rgba(22,163,74,0.30)" },
      warning: { fill: "#d97706", buffer: "rgba(217,119,6,0.30)" },
      error:   { fill: "#dc2626", buffer: "rgba(220,38,38,0.30)" },
    },
  },
  dark: {
    track:          "rgba(255,255,255,0.10)",
    trackSegmented: "rgba(255,255,255,0.06)",
    labelFg:        "#e5e7eb",
    valueTextFg:    "#0b1220",
    valueTextFgOut: "#e5e7eb",
    variants: {
      default: { fill: "#60a5fa", buffer: "rgba(96,165,250,0.30)" },
      success: { fill: "#34d399", buffer: "rgba(52,211,153,0.30)" },
      warning: { fill: "#fbbf24", buffer: "rgba(251,191,36,0.30)" },
      error:   { fill: "#f87171", buffer: "rgba(248,113,113,0.30)" },
    },
  },
} as const;
```

CSS 변수 노출 (Root 에 inline `style={{ '--plastic-progress-fill': … }}`):

```
--plastic-progress-track
--plastic-progress-track-segmented
--plastic-progress-fill
--plastic-progress-buffer
--plastic-progress-label-fg
--plastic-progress-value-fg-inside
--plastic-progress-value-fg-outside
--plastic-progress-size-linear     (4 | 8 | 12 px)
--plastic-progress-size-circular   (24 | 40 | 64 px)
--plastic-progress-stroke-width    (3 | 4 | 6)
--plastic-progress-radius          (9999px 또는 4px — segmented 때)
```

사용자는 `style={{ '--plastic-progress-fill': '#8b5cf6' }}` 로 커스텀 색을 넣을 수 있다(컴포넌트 prop 확장 없이).

### 4.8 size 토큰

| size | linear height | circular diameter | stroke width | label font |
|------|---------------|-------------------|--------------|------------|
| sm   | 4 px          | 24 px             | 3            | 11 px      |
| md   | 8 px          | 40 px             | 4            | 12 px      |
| lg   | 12 px         | 64 px             | 6            | 14 px      |

---

## 5. 핵심 로직

### 5.1 값 정규화

```ts
// Progress/Progress.utils.ts
export function sanitizeMax(max: number | undefined): number {
  if (max == null) return 100;
  if (!Number.isFinite(max) || max <= 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Progress] max must be a positive finite number. Fallback to 100.");
    }
    return 100;
  }
  return max;
}

export function clampValue(
  value: number | undefined,
  max: number,
): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Progress] value must be a finite number.");
    }
    return 0;
  }
  if (value < 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Progress] value ${value} < 0. Clamped to 0.`);
    }
    return 0;
  }
  if (value > max) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Progress] value ${value} > max ${max}. Clamped to max.`);
    }
    return max;
  }
  return value;
}

export function toPercent(value: number | null, max: number): number | null {
  return value == null ? null : (value / max) * 100;
}
```

### 5.2 Circular geometry

```ts
export function circularGeometry(
  diameter: number,
  strokeWidth: number,
  percent: number,
): { r: number; c: number; offset: number } {
  const r = (diameter - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clampedPct = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clampedPct / 100);
  return { r, c, offset };
}
```

### 5.3 segments 매핑

```ts
export function resolveSegments(
  segments: number | undefined,
  value: number | null,
): { count: number; filled: number } | null {
  if (segments == null) return null;
  const n = Math.max(2, Math.floor(segments));
  const v = value == null ? 0 : Math.max(0, Math.min(n, Math.floor(value)));
  return { count: n, filled: v };
}
```

segmented 일 때 `aria-valuemax = n`, `aria-valuenow = filled`.

### 5.4 CSS 변수 inline 적용

Root 에서 palette 객체를 한 번만 읽어 `style` 로 CSS 변수 세팅:

```ts
const p = progressPalette[theme].variants[variant];
const rootStyle: React.CSSProperties = {
  "--plastic-progress-track": progressPalette[theme].track,
  "--plastic-progress-fill": p.fill,
  "--plastic-progress-buffer": p.buffer,
  "--plastic-progress-label-fg": progressPalette[theme].labelFg,
  "--plastic-progress-value-fg-inside": progressPalette[theme].valueTextFg,
  "--plastic-progress-value-fg-outside": progressPalette[theme].valueTextFgOut,
  "--plastic-progress-size-linear":
    size === "sm" ? "4px" : size === "lg" ? "12px" : "8px",
  "--plastic-progress-size-circular":
    size === "sm" ? "24px" : size === "lg" ? "64px" : "40px",
  "--plastic-progress-stroke-width":
    String(strokeWidth ?? (size === "sm" ? 3 : size === "lg" ? 6 : 4)),
  ...(props.style ?? {}),
} as React.CSSProperties;
```

사용자가 `props.style` 로 같은 변수를 override 하면 덮어씀 (spread 순서).

### 5.5 mode 전환 시 transition

determinate → indeterminate 혹은 그 반대 전환 시, primary fill 의 inline transform 과 CSS animation 이 같은 프레임에 공존하면 깜빡임이 생긴다. 해결:

```css
.plastic-progress__fill--primary {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.plastic-progress[data-mode="indeterminate"] .plastic-progress__fill--primary {
  transition: none;   /* indeterminate 애니메이션과 충돌 방지 */
}
```

그리고 `data-mode` 변경은 1 tick 안에 React state 로 반영되므로 깜빡임 없이 교체된다. (Chrome/FF/Safari 모두 확인 필요 — §13.)

---

## 6. 제약

### 6.1 value 경고·클램프

- `value < 0` → dev warn, 0 으로 클램프.
- `value > max` → dev warn, max 로 클램프.
- `value` 가 `NaN`/`Infinity` → dev warn, 0.
- `max <= 0` 또는 non-finite → dev warn, max=100 fallback.

production 에서는 silent — 단, 렌더는 항상 올바른 clamp 된 값을 사용한다.

### 6.2 buffer 경고·클램프

- `buffer < 0` → 0.
- `buffer > max` → max.
- `buffer < value` → dev warn (의미 없음. 렌더는 그대로 하되 시각적으로 primary 가 buffer 를 덮는다).

### 6.3 조합 모순 (§3.3 매트릭스)

- segmented + buffer → `buffer` 무시 + warn.
- segmented + indeterminate → `indeterminate` 무시 + warn.
- circular + buffer / segments / striped → 각각 무시 + warn.
- indeterminate + buffer → buffer 무시 + warn (의미 상충).
- indeterminate + striped → 허용 (striped 는 indeterminate 의 폭 좁은 필 위에 그려져 "스트라이프 슬라이딩" 느낌이 됨).

### 6.4 접근성 경고

- `aria-label` 과 `aria-labelledby` 가 모두 없으면 dev warn: `"[Progress] aria-label or aria-labelledby is recommended for screen readers."` — throw 는 아니고 warn 1 회 (React ref 해시로 dedupe 는 v1 미포함).

### 6.5 children 검증 (compound 사용 시)

- `Progress.Root` 의 `children` 에 `Progress.Track` 이 없으면 dev warn.
- `Progress.Track` 의 `children` 에 `Progress.Indicator` 가 없으면 dev warn.
- `Progress.Indicator kind="buffer"` 가 circular 컨텍스트 안에 있으면 dev warn + 무시.

구현은 `React.Children.toArray + React.isValidElement + child.type === ProgressTrack` 으로 체크. (여기서 직접 비교 가능 — 같은 모듈이므로 identity 일치.)

---

## 7. 키보드

Progress 는 **비상호작용** 컴포넌트이다. 포커스 가능하지 않고, 키 입력을 처리하지 않는다.

- `tabindex` 기본 미지정. 사용자가 명시적으로 focusable 하려면 `tabIndex={0}` 을 넘겨야 하지만 v1 에서 권장하지 않음.
- 역할은 순전히 `role="progressbar"` 로, 보조공학이 "진척도" 로 읽을 수 있도록 한다.
- Slider/RadioGroup 처럼 값을 바꾸는 키 처리는 없다.

→ Progress 는 "시각 + ARIA 메타데이터" 만 제공. 사용자가 키보드 상호작용으로 값을 바꾸고 싶다면 Progress 는 적합하지 않으며 다른 컴포넌트(Slider) 가 필요하다. 이를 §16 트레이드오프에서 명시.

---

## 8. 상태 관리

### 8.1 controlled / uncontrolled 이중 API

`useControllable` 훅을 그대로 쓴다:

```ts
const [value, setValue] = useControllable<number | undefined>(
  props.value,
  props.defaultValue ?? 0,
  /* onChange = */ undefined,
);
```

- Progress 는 "외부 값 반영" 이 주이므로 보통 controlled 로 쓰인다.
- uncontrolled (`defaultValue`) 는 "마운트 시 한 번만 값 세팅" 정도 용도 — 실제 변하는 progress 는 controlled 필수.
- `onValueChange` 콜백은 v1 미포함 (Progress 는 내부에서 값을 바꾸지 않음). 향후 Slider 계열로 승격 시 추가.

### 8.2 indeterminate 상태 렌더링

indeterminate 는 React state 에 의존하지 않고 **CSS 애니메이션** 으로 순환한다. 즉 Progress 자체는 re-render 하지 않아도 브라우저가 매 프레임 paint. 이는 성능(§14) 과 runtime-zero 를 동시에 만족한다.

- Root 는 `data-mode` 를 `"indeterminate" | "determinate"` 로만 바꾼다.
- 나머지는 CSS selector (`[data-mode="indeterminate"] .…`) 가 결정.

### 8.3 announce (aria-live)

`announce === true` 이면 Root 컨테이너에 `aria-live="polite"` + `aria-atomic="true"` 가 걸린다. determinate 에서 value 가 변경되면 보조공학이 `"업로드 진행 42%"` 식으로 읽는다. 단 너무 자주 바뀌면 스팸이므로:

- 기본 `announce=false`.
- announce=true 여도 구현은 `aria-live` 만 켜는 단순 방식. 스로틀은 사용자 측에서 (예: value 를 10% 단위로 snap 해 넘기기).

### 8.4 segmented value 반올림

segmented 에서 value 가 정수가 아니면 `Math.floor(value)` 로 내림. 이 rule 은 ARIA 에도 적용 (`aria-valuenow` = floor).

---

## 9. 변형 / 상태

### 9.1 variant (상태별 팔레트)

| variant   | 용도                          | 대표 컨텍스트             |
|-----------|-------------------------------|---------------------------|
| default   | 일반 진행 (파란색)            | 업로드, 로딩              |
| success   | 완료 임박/완료 직후 (초록)    | 설치 성공 직후 3초간      |
| warning   | 경고 임계 (주황)              | 디스크 사용률 80% 이상    |
| error     | 실패/중단 (빨강)              | 업로드 실패 후 부분 진행  |

사용자는 value 에 따라 variant 를 스위치하는 파생 로직을 외부에서 주도.

```tsx
<Progress value={v} variant={v >= 100 ? "success" : v < 10 ? "error" : "default"} />
```

### 9.2 shape

- `"linear"`: 수평 막대. 기본. 대부분 케이스.
- `"circular"`: 원형. SVG 렌더. 아이콘 버튼 옆 배지, 모달 내 "처리 중" 스피너.

### 9.3 size

`"sm"` | `"md"` | `"lg"`. Linear 는 트랙 높이, Circular 는 직경. 라벨 폰트도 스케일 (§4.8 표).

### 9.4 label placement

- **outside** (기본): 트랙 위에 라벨, 오른쪽 끝에 value text. Linear.
- **inside**: 필 위에 오버레이. Linear md/lg 에서만 권장 (sm 은 4 px 라 텍스트 불가 → dev warn + none 으로 fallback).
- **none**: 라벨/값 텍스트 숨김.
- Circular 는 labelPlacement 무관하게 "중앙 홀" 에 children 또는 `ValueText` 를 배치. `none` 이면 중앙도 비움.

### 9.5 striped / animated

| striped | animated | 효과                                   |
|---------|----------|----------------------------------------|
| false   | false    | 단색 필                                |
| true    | false    | 정적 대각선 줄무늬                     |
| true    | true     | 줄무늬가 흐름 (1s loop)                |
| false   | true     | animated 만으로는 효과 없음, warn     |

### 9.6 segmented

`segments` 가 지정되면 variant 에 따라 채워진 셀 색 결정. 비어 있는 셀은 `--plastic-progress-track-segmented`. 셀 gap=4 px, border-radius=2 px.

---

## 10. 파일 구조

```
src/components/Progress/
├── Progress.tsx                 # Shortcut + namespace export
├── Progress.types.ts            # 공개 타입
├── Progress.utils.ts            # sanitizeMax, clampValue, toPercent, circularGeometry, resolveSegments, resolveMode
├── Progress.css                 # @keyframes + data-attr 기반 스타일
├── ProgressContext.ts           # Context + useProgressContext
├── ProgressRoot.tsx             # Root (compound 진입점, Context Provider)
├── ProgressTrack.tsx            # Linear/Circular 공통 track 분기
├── ProgressTrackLinear.tsx      # Linear 전용 track (+ segmented 렌더)
├── ProgressTrackCircular.tsx    # Circular 전용 track (SVG)
├── ProgressIndicator.tsx        # Linear fill / Circular arc, kind=primary|buffer
├── ProgressLabel.tsx            # outside/inside 라벨
├── ProgressValueText.tsx        # value 텍스트 (formatLabel)
├── theme.ts                     # progressPalette
└── index.ts                     # 배럴
```

각 파일 책임:

- **Progress.tsx** — `ProgressShortcut(props)` 구현 (props 를 Root + Track + Indicator 에 뿌리는 편의 wrapper). namespace export.
- **Progress.utils.ts** — pure functions only. React 의존 없음.
- **Progress.css** — `@keyframes` 3 개 (linear indeterminate, circular rotate, circular dash, stripes), data-attr selector, CSS 변수 fallback.
- **ProgressContext.ts** — `createContext<ProgressContextValue | null>(null)` + throw 훅.
- **ProgressRoot.tsx** — useControllable, sanitize, resolveMode, resolveSegments, palette → CSS 변수, `role="progressbar"` 및 `aria-valuenow/min/max`, data-attr, children 검증.
- **ProgressTrack.tsx** — shape 에 따라 Linear/Circular subtree 를 분기하여 렌더.
- **ProgressTrackLinear.tsx** — `<div class="plastic-progress__track">` + segmented 분기. indicator children 은 그대로 배치.
- **ProgressTrackCircular.tsx** — SVG + 트랙 circle + children (Indicator 는 호를 렌더).
- **ProgressIndicator.tsx** — context.shape 에 따라 `<div>` (linear fill) 또는 `<circle>` (circular arc). kind=buffer 면 위치/색 변경.
- **ProgressLabel.tsx** — placement 에 따른 DOM 위치/클래스.
- **ProgressValueText.tsx** — formatLabel 호출, indeterminate 면 null 반환.
- **theme.ts** — `progressPalette` const.

---

## 11. 구현 단계 (후속 agent 가 순차 실행)

각 단계는 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과 상태.

### Step 1 — 타입 + 배럴 + 팔레트 스켈레톤
1. `Progress.types.ts` 작성 (§2.1 전부).
2. `theme.ts` 작성 (`progressPalette`).
3. `Progress.utils.ts` 작성 (`sanitizeMax`, `clampValue`, `toPercent`, `resolveMode`, `resolveSegments`, `circularGeometry`).
4. `Progress.css` 파일 생성 (keyframes 만, 나머지 selector 는 후속 단계에서 채움).
5. `ProgressContext.ts`.
6. `Progress.tsx` placeholder: `export const Progress = Object.assign(() => null, { Root: () => null, Track: () => null, Indicator: () => null, Label: () => null, ValueText: () => null })`.
7. `index.ts` 배럴.
8. `src/components/index.ts` 에 `export * from "./Progress";`.
9. `npm run typecheck` 통과.
10. 커밋: `feat(Progress): 타입 + 팔레트 + 배럴 스켈레톤`.

### Step 2 — Root + Context + Linear determinate 기본
1. `ProgressRoot.tsx` 본체: useControllable, 값 정규화, resolveMode, Context Provider, root DOM.
2. `ProgressTrack.tsx` + `ProgressTrackLinear.tsx` + `ProgressIndicator.tsx` — determinate 전용 (transform scaleX).
3. `Progress.css` 에 `.plastic-progress--linear` 기본 레이아웃, `__track`, `__fill--primary` 스타일.
4. 단축 wrapper `ProgressShortcut` 가 Root + Track + Indicator 를 자동 조립.
5. 테스트: `<Progress value={42} />` 가 42% fill 로 보이는지.
6. 커밋: `feat(Progress): Linear determinate 기본`.

### Step 3 — variant / size / theme + CSS 변수
1. Root 에서 palette → CSS 변수 inline 세팅.
2. `data-variant`, `data-size`, `data-theme` 속성 적용.
3. CSS selector 로 색/두께 분기.
4. Light/Dark 전환 확인.
5. 커밋: `feat(Progress): variant/size/theme + CSS 변수`.

### Step 4 — Linear indeterminate
1. `resolveMode` → `data-mode="indeterminate"`.
2. `@keyframes plastic-progress-linear-indeterminate` 구현.
3. `aria-valuenow` 를 indeterminate 시 제거 (Root 에서 조건부).
4. 커밋: `feat(Progress): Linear indeterminate`.

### Step 5 — Circular determinate + indeterminate
1. `ProgressTrackCircular.tsx` SVG.
2. `ProgressIndicator` 의 circular 분기 (stroke-dasharray/offset 계산).
3. indeterminate 시 rotate + dash 이중 애니메이션.
4. 중앙 children 렌더 (label).
5. 커밋: `feat(Progress): Circular determinate/indeterminate`.

### Step 6 — buffer (Linear)
1. `<Progress.Indicator kind="buffer" value={n} />` 지원.
2. primary/buffer z-index 및 색상 분리.
3. §3.3 매트릭스 경고.
4. 커밋: `feat(Progress): buffer (linear)`.

### Step 7 — segments (Linear)
1. `segments` prop → segmented DOM 렌더.
2. 셀 `data-filled` 속성 + CSS.
3. ARIA valuemax/valuenow 재매핑.
4. 커밋: `feat(Progress): segmented`.

### Step 8 — striped + animated
1. `data-striped`, `data-animated` 속성.
2. CSS 스트라이프 gradient + `@keyframes plastic-progress-stripes`.
3. 커밋: `feat(Progress): striped/animated`.

### Step 9 — Label / ValueText / labelPlacement
1. `ProgressLabel.tsx`, `ProgressValueText.tsx`.
2. outside/inside/none 분기.
3. Circular 중앙 children 배치.
4. `formatLabel` prop 반영.
5. 커밋: `feat(Progress): Label + ValueText`.

### Step 10 — 접근성 마감
1. `role="progressbar"`, aria 속성 완비.
2. `announce` → `aria-live="polite"`.
3. aria-label 없을 때 dev warn.
4. indeterminate 시 `aria-valuenow` 제거.
5. 커밋: `feat(Progress): 접근성 완비`.

### Step 11 — 데모 페이지
1. `demo/src/pages/ProgressPage.tsx` 작성 (§12).
2. `demo/src/App.tsx` NAV 에 `"progress"` 추가 + `Page` 유니온 확장 + 라우팅.
3. 커밋: `feat(Progress): 데모 페이지`.

### Step 12 — 마감
1. Props 표 채움.
2. §20 DoD 체크.
3. 커밋: `feat(Progress): Props 표 + usage`.

---

## 12. 데모 페이지

`demo/src/pages/ProgressPage.tsx`. CommandPalettePage 등 기존 페이지 구조 복제 — 좌측 사이드바 섹션 + 우측 본문 + 상단 헤더.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "progress", label: "Progress", description: "진행 상태 인디케이터", sections: [
  { label: "Linear Basic",        id: "linear" },
  { label: "Indeterminate",       id: "indeterminate" },
  { label: "Buffer",              id: "buffer" },
  { label: "Segmented",           id: "segmented" },
  { label: "Circular",            id: "circular" },
  { label: "States (variant)",    id: "states" },
  { label: "Striped + Animated",  id: "striped" },
  { label: "Sizes",               id: "sizes" },
  { label: "Dark Theme",          id: "dark" },
  { label: "Controlled Counter",  id: "controlled" },
  { label: "Playground",          id: "playground" },
  { label: "Props",               id: "props" },
  { label: "Usage",               id: "usage" },
]},
```

그리고 `Page` 유니온에 `"progress"` 추가 + `{current === "progress" && <ProgressPage />}`.

### 12.2 섹션 구성

**Linear Basic**
```tsx
<div className="flex flex-col gap-4">
  <Progress value={0} aria-label="0%" />
  <Progress value={25} aria-label="25%" />
  <Progress value={60} aria-label="60%" />
  <Progress value={100} aria-label="완료" />
</div>
```

**Indeterminate**
```tsx
<div className="flex flex-col gap-4">
  <Progress indeterminate aria-label="로딩 중" />
  <Progress shape="circular" indeterminate aria-label="처리 중" />
  <Progress indeterminate striped aria-label="업로드 중" />
</div>
```

**Buffer (Linear)**
```tsx
<Progress.Root value={42} buffer={68} aria-label="다운로드/재생 위치">
  <Progress.Track>
    <Progress.Indicator kind="buffer" value={68} />
    <Progress.Indicator />
  </Progress.Track>
</Progress.Root>
```
(단축: `<Progress value={42} buffer={68} />`.)

**Segmented**
```tsx
<div className="flex flex-col gap-3">
  <Progress segments={5} value={3} aria-label="단계 3/5" />
  <Progress segments={10} value={7} variant="success" aria-label="Quiz 7/10" />
  <Progress segments={4} value={0} aria-label="시작 전" />
</div>
```

**Circular**
```tsx
<div className="flex items-center gap-6">
  <Progress shape="circular" value={25} size="sm" />
  <Progress shape="circular" value={50} size="md">50%</Progress>
  <Progress shape="circular" value={75} size="lg" strokeWidth={8}>75%</Progress>
  <Progress shape="circular" indeterminate size="md" aria-label="처리 중" />
</div>
```

**States (variant)**
```tsx
<div className="flex flex-col gap-3">
  <Progress value={30} variant="default"  aria-label="default" />
  <Progress value={80} variant="success"  aria-label="success" />
  <Progress value={90} variant="warning"  aria-label="warning" />
  <Progress value={45} variant="error"    aria-label="error" />
</div>
```

**Striped + Animated**
```tsx
<div className="flex flex-col gap-3">
  <Progress value={60} striped aria-label="striped" />
  <Progress value={60} striped animated aria-label="striped animated" />
  <Progress value={60} striped animated variant="success" size="lg" aria-label="striped animated large" />
</div>
```

**Sizes**
```tsx
<div className="flex flex-col gap-4">
  <Progress value={40} size="sm" aria-label="sm" />
  <Progress value={40} size="md" aria-label="md" />
  <Progress value={40} size="lg" aria-label="lg" />
</div>
<div className="flex items-center gap-6 mt-6">
  <Progress shape="circular" value={40} size="sm" />
  <Progress shape="circular" value={40} size="md" />
  <Progress shape="circular" value={40} size="lg" />
</div>
```

**Dark Theme**
```tsx
<div style={{ background: "#0b1220", padding: 24, borderRadius: 8 }}>
  <div className="flex flex-col gap-3">
    <Progress value={50} theme="dark" aria-label="dark default" />
    <Progress value={80} theme="dark" variant="success" aria-label="dark success" />
    <Progress value={45} theme="dark" variant="error" striped animated aria-label="dark error animated" />
    <Progress shape="circular" value={65} theme="dark" />
  </div>
</div>
```

**Controlled Counter (외부에서 값 주입)**
```tsx
function ControlledDemo() {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (v >= 100) return;
    const t = setTimeout(() => setV(x => Math.min(100, x + 5)), 300);
    return () => clearTimeout(t);
  }, [v]);
  return (
    <div className="flex flex-col gap-3">
      <Progress value={v} aria-label="자동 증가" announce />
      <div className="flex gap-2">
        <button onClick={() => setV(0)}>Reset</button>
        <button onClick={() => setV(100)}>Jump to 100</button>
      </div>
      <div className="text-sm text-slate-600">current: {v}</div>
    </div>
  );
}
```

**Playground**
상단 컨트롤 바:
- `shape` 라디오 (linear / circular)
- `variant` 라디오 (default / success / warning / error)
- `size` 라디오 (sm / md / lg)
- `value` 슬라이더 0~100 (+ indeterminate 체크박스)
- `buffer` 슬라이더 0~100 (+ 활성 체크)
- `segments` 입력 (0 = 없음, 2~10)
- `striped`, `animated` 체크박스
- `labelPlacement` 라디오 (inside/outside/none)
- `theme` 토글 (light/dark)
- `announce` 체크박스
- `strokeWidth` 슬라이더 (circular 시)
- `strokeLinecap` 라디오 (butt/round)

아래에 200 px 높이/폭 미리보기 박스. 조작 즉시 반영.

**Props 표**
기존 페이지 패턴. `Progress` (단축) / `Progress.Root` / `Progress.Track` / `Progress.Indicator` / `Progress.Label` / `Progress.ValueText` 각각의 모든 prop × 타입 × 기본값 × 설명.

**Usage (4 개)**

1. **파일 업로드 인라인**
    ```tsx
    function UploadRow({ filename, percent }: { filename: string; percent: number }) {
      return (
        <div className="flex items-center gap-3">
          <span className="w-40 truncate text-sm">{filename}</span>
          <Progress value={percent} size="sm" className="flex-1" aria-label={`${filename} 업로드`} />
          <span className="w-10 text-xs text-slate-500">{percent}%</span>
        </div>
      );
    }
    ```

2. **모달 로딩 스피너 (Circular indeterminate)**
    ```tsx
    <Dialog.Root open>
      <Dialog.Content>
        <div className="flex flex-col items-center gap-3 py-8">
          <Progress shape="circular" indeterminate size="lg" aria-label="처리 중" />
          <p>처리하는 중…</p>
        </div>
      </Dialog.Content>
    </Dialog.Root>
    ```

3. **Quiz 진행 (segmented)**
    ```tsx
    <Progress segments={10} value={q} variant="success" aria-label={`문제 ${q}/10`} />
    ```

4. **버퍼링되는 비디오 플레이어 위치**
    ```tsx
    <Progress.Root value={played} buffer={loaded} max={duration} aria-label="재생 위치">
      <Progress.Track>
        <Progress.Indicator kind="buffer" value={loaded} />
        <Progress.Indicator />
      </Progress.Track>
    </Progress.Root>
    ```

---

## 13. 검증 계획

### 13.1 자동화
```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

주의: `exactOptionalPropertyTypes: true` — optional prop 은 `?:` 로 받고, 디폴트 머지 시 `undefined` 분기를 명시. `noUncheckedIndexedAccess: true` — `React.Children.toArray()[i]` 는 `ReactNode | undefined`. `verbatimModuleSyntax: true` — 타입은 `import type { ... } from ...`.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Linear basic: 0/25/60/100 각각 정확한 비율 렌더.
- [ ] value 변경 시 transform scaleX 전환이 **부드러움**(200ms cubic). 점프/깜빡임 없음.
- [ ] indeterminate Linear: 스트라이프가 좌→우 왕복, 루프가 매끄럽고 **끝점에서 튀지 않음** (keyframe 0% / 60% / 100% 확인).
- [ ] indeterminate Circular: SVG 가 360° 회전 + 호 길이(stroke-dasharray) 가 숨쉬듯 변함. 1.4s 주기.
- [ ] Buffer: primary 가 buffer 위에 그려짐. buffer=68, primary=42 일 때 시각 겹침 올바름.
- [ ] Segmented: segments=5 value=3 이면 좌측 3 개만 채워짐. gap=4px. `aria-valuemax=5`, `aria-valuenow=3`.
- [ ] Circular: stroke-linecap="round" 일 때 호 끝이 **둥글게** 마감 (stroke-linecap 로컬 prop 테스트).
- [ ] Circular: stroke-linecap="butt" 일 때 끝이 각짐 확인.
- [ ] States: default(blue) / success(green) / warning(orange) / error(red) 팔레트 전환.
- [ ] Striped: 45° 대각 줄무늬. animated 시 1s 주기로 흐름.
- [ ] Sizes: sm=4px, md=8px, lg=12px track (linear). circular 24/40/64 px.
- [ ] Dark: 트랙 색/필 색/라벨 색 모두 다크 팔레트.
- [ ] Controlled Counter: setState → value reflect 즉시.
- [ ] Playground: 모든 컨트롤 조합이 실시간 반영.
- [ ] 다른 페이지 리그레션 없음.

### 13.3 엣지 케이스
- [ ] `value < 0` → dev warn + 0 렌더.
- [ ] `value > max` → dev warn + max 렌더.
- [ ] `value = NaN` → dev warn + 0.
- [ ] `max = 0` 또는 음수 → warn + 100 fallback.
- [ ] `value = undefined` + `indeterminate = undefined` → indeterminate 자동.
- [ ] `value = undefined` + `indeterminate = false` → determinate=0.
- [ ] `value = 50` + `indeterminate = true` → indeterminate (explicit 우선).
- [ ] segmented + buffer → warn, buffer 무시.
- [ ] circular + buffer → warn, buffer 무시 (v1).
- [ ] circular + striped → striped 무시 (경고 없음 — 기본적으로 circular 에는 striped 가 시각적 의미 없음, silent ignore).
- [ ] segments=1 → warn, 최소 2 로 올림.
- [ ] segments=10.7 → floor(10).
- [ ] Dark + striped: 흰색 반투명 스트라이프가 다크 배경에서도 대비 충분.
- [ ] RTL (`dir="rtl"`) Linear: fill 이 오른쪽에서 시작하여 왼쪽으로 자람. `transform-origin: right`.
- [ ] 라벨 너무 긺: `text-overflow: ellipsis` (linear outside).
- [ ] aria-label 미지정 시 dev warn 1 회.
- [ ] announce=true 상태에서 value 변경 → 보조공학 가청 (VoiceOver 수동 확인).
- [ ] React.StrictMode 재마운트 시에도 애니메이션 루프 유지 (useEffect 로 관리 안 하므로 자연스러움).

### 13.4 시각 회귀 (수동)
- transition smoothness: devtools Performance 탭에서 value 변화 시 layout thrash 없음 (transform 만 바뀜).
- indeterminate loop: 1 초 이상 녹화해 keyframe boundary 에서 jump 없음.
- circular 둥근 끝 확대: 160 px 확대해 stroke-linecap 모양 확인.

---

## 14. 성능

### 14.1 목표
- 모든 애니메이션 **CSS 기반**. React re-render 없이 60 fps.
- 초기 마운트 < 1 ms (CSS 변수 inline 적용 외 계산 없음).

### 14.2 설계 포인트
1. **width 대신 transform**: `transform: scaleX(p)` + `transform-origin: left` 로 필 길이 제어. GPU 가속, paint cost 없음.
2. **indeterminate 는 CSS animation**: React 가 매 프레임 관여하지 않음. 사용자가 value 만 변경해도 `data-mode` 만 바뀌고 애니메이션 자체는 브라우저.
3. **memo 불필요**: Progress 는 leaf 컴포넌트로 상태가 단순하며 부모 리렌더가 잦아도 cost 작다. `React.memo` 적용은 성능 이득 거의 없음 + 불필요한 shallow compare 비용.
4. **SVG 재사용**: circular 도 값 변경 시 `stroke-dashoffset` 만 inline 업데이트. 노드 수 일정.
5. **CSS 변수**: palette 바꿀 때 style 재계산 범위가 Root 이하로 제한.
6. **context value identity**: Root 에서 context value 객체를 `useMemo` 로 묶음. indicator/label 가 불필요하게 리렌더되지 않게.

### 14.3 메모리
- 각 Progress 인스턴스: DOM 5~8 개 + (circular 일 때 SVG 2 circle + text). 가벼움.
- 동시 100 개 업로드 리스트에서도 문제 없음 (benchmark: MUI LinearProgress 대비 동등).

### 14.4 측정 방법
- DevTools Performance 탭에서 indeterminate linear 2 초 녹화 → FPS 60 유지 + React 커밋 0 (CSS 애니메이션이므로).
- determinate value 를 rAF 로 0→100 틱 100회 변경 → commit 수는 100 회지만 각 commit cost < 0.2 ms.

---

## 15. 접근성

### 15.1 role / aria

- Root: `role="progressbar"`.
- `aria-valuemin`: 항상 0.
- `aria-valuemax`: determinate 이면 `max` (segmented 이면 `segments`), indeterminate 이면 제거(없음).
- `aria-valuenow`: determinate 이면 `value` (segmented 이면 `filled`), indeterminate 이면 **제거(속성 자체 없음)**. 단, `aria-valuetext` 를 쓰고 싶은 사용자는 Root 에 직접 지정 가능 (passthrough).
- `aria-label` / `aria-labelledby`: 하나 필수 권장. 없으면 dev warn.

Indeterminate 판정이 `aria-valuenow` 제거 시점의 규칙:
```ts
const ariaProps = mode === "determinate"
  ? { "aria-valuenow": Math.round(percent ?? 0), "aria-valuemin": 0, "aria-valuemax": 100 }
  : { "aria-valuemin": 0, "aria-valuemax": 100 /* valuenow 없음 */ };
```

segmented 일 때는 valuemax/valuenow 를 segments/filled 로 덮는다.

### 15.2 aria-live (announce prop)

`announce === true` 이면 Root 에 `aria-live="polite"` + `aria-atomic="true"`. determinate 에서 value 가 바뀌면 스크린리더가 "42 percent" 또는 `aria-valuetext` 를 읽는다.

디폴트 false 인 이유: value 가 잦게(초당 수십 회) 바뀌면 음성이 스팸된다. 사용자가 10% 단위로만 announce 하고 싶다면 외부에서 값을 snap 해서 주입.

### 15.3 숨겨진 value text

labelPlacement === "none" 이어도 `<span class="sr-only">` 로 현재 % 를 읽게 할 수 있다 (옵션). v1 에서는 기본 off — 사용자가 `aria-valuetext` 로 직접 커스터마이즈.

### 15.4 motion-reduce

```css
@media (prefers-reduced-motion: reduce) {
  .plastic-progress__fill--primary { transition: none; }
  .plastic-progress[data-mode="indeterminate"] .plastic-progress__fill--primary,
  .plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__svg,
  .plastic-progress--circular[data-mode="indeterminate"] .plastic-progress__circle--indicator,
  .plastic-progress[data-striped="true"][data-animated="true"] .plastic-progress__fill--primary {
    animation: none !important;
  }
}
```

indeterminate 애니메이션은 motion-reduce 시 완전 정지. "불확정" 은 시각적으로 전혀 표현되지 않지만 `role="progressbar"` 로 보조공학은 여전히 인식. (대안: 천천히 움직이는 opacity pulse. v1.1.)

### 15.5 색맹

variant 색 구분이 색각 이상자에게 잘 구분되지 않을 수 있다. 완화책:
- success/error 에 아이콘 prefix 를 Label 안에 같이 넣기는 사용자 책임 (Progress 는 색만 제공).
- 사용자가 색을 override 하려면 CSS 변수 `--plastic-progress-fill` 로.

---

## 16. 알려진 트레이드오프 · 결정

1. **Stepper 와 segmented 의 경계**
   - Stepper: "클릭 가능한 단계 라벨 + 각 단계의 콘텐츠(패널)". 복잡한 UX(다음/이전, 완료, 스킵 허용 여부) 가 있다.
   - Progress.segmented: "라벨·클릭 없는 순수 시각적 n 분할 바". Quiz 10 문제 중 3 진척 등.
   - 경계: "사용자가 클릭하거나, 각 단계에 다른 내용이 있다면 Stepper. 단순히 n 분의 m 을 보여주기만 한다면 Progress.segmented." 이 규칙을 README 에 명시.
   - 동일 스타일 공유가 합리적이지만 v1 에선 팔레트만 공유하고 DOM 은 독립. Stepper 내부가 Progress 를 사용하도록 리팩터하면 cyclic 의존 위험 → v1.1 이후 고려.

2. **Circular buffer 제외**
   - SVG 2 중 호(outer + inner) 나 2 radius 겹침으로 구현 가능하지만, 시각 패턴이 덜 보편적 + 접근성(두 값 동시 읽기) 설계가 추가 필요. v1.1.

3. **shape prop vs 분리 컴포넌트 (LinearProgress/CircularProgress)**
   - MUI 는 분리, Ant 는 통합. plastic 은 **통합** 선택.
   - 이유: prop 표 일원화 + TreeShake 는 dead code elimination 이 SVG 경로를 드롭해 줌. 사용자 학습 비용 감소.
   - 단점: 번들에 두 shape 가 모두 포함 → SVG 경로 사용 안 하는 앱은 소폭 낭비. 측정 (≈0.5 KB). 허용.

4. **width 대신 transform scaleX**
   - transform 은 `transform-origin: left` 로 축 기준 확장. width 는 레이아웃을 바꾸지만 transform 은 paint 만. 60 fps 유리.
   - 단점: scaleX 는 자식 콘텐츠(inside label "42%") 를 왜곡. 해결: primary fill 안에 자식(value text) 을 넣되 **자식은 역 scaleX 보정** 또는 primary fill 내부 absolute 자식 없이 value text 를 track 오버레이로 분리.
   - v1 결정: value text 를 primary fill 의 **자식이 아닌** track 오버레이 absolute positioned 로 두고, 자체 `calc(100% * var(--p))` 위치로 이동. 이 방식이 왜곡 없음.

5. **indeterminate 시 aria-valuenow 제거**
   - WAI-ARIA 명세: indeterminate progressbar 는 `aria-valuenow` 를 쓰지 말라. MUI/Radix 가 준수. plastic 도 동일.

6. **announce 기본 false**
   - 값 변경 잦은 경우 스팸 방지. 사용자가 explicit 하게 켜야 함.

7. **segments 최소값 2**
   - segments=1 은 "하나의 셀" 이므로 단순 bar 와 구분 없음 → warn + 2.
   - 상한 없음 (사용자 정의). 단 10 초과는 시각적으로 쓸모없어진다는 것을 문서화.

8. **buffer 가 value 보다 작을 때**
   - 의미적으로 이상하지만 (예: 다운로드 된 양이 재생된 양보다 적을 수는 없음), 렌더는 그대로. buffer fill 이 primary 보다 좁아지며 뒤에 가려짐. dev warn 만.

9. **비상호작용 — Slider 와 구분**
   - Progress 는 값 변경 X. 값 변경 UI 는 Slider(별도 컴포넌트, v 다음)  책임.
   - 현재 plastic 에는 Slider 없음 — Progress 로 "드래그 가능한 진행바" 를 시도하는 사용자가 있을 수 있으나 Progress 는 의도적으로 거부.

10. **CSS 파일 번들 포함**
    - plastic 은 tsup 빌드. 현재 컴포넌트들은 inline style 위주로 CSS 파일 필요가 적었다. Progress 는 @keyframes 가 필수 → `Progress.css` 를 `ProgressRoot` 최상단에서 `import "./Progress.css"` 로 로드.
    - tsup 기본 설정이 CSS 번들을 처리하도록 `loader: { '.css': 'css' }` 또는 `esbuildOptions` 조정이 필요할 수 있음. 현재 레포 설정 확인 후, 필요 시 Progress.css 내용을 `<style>` 태그로 Root 가 1 회만 주입하는 fallback 도 검토 (§19 참조).

11. **styled-components / emotion 미사용**
    - 런타임 제로 원칙. CSS 파일 + 인라인 변수 조합.

12. **ValueText 가 children 과 중복 가능**
    - `<Progress shape="circular" value={72}>72%</Progress>` 는 children 을 중앙에 렌더.
    - `<Progress shape="circular" value={72} />` + `<Progress.ValueText />` 는 포매터 사용.
    - 둘 다 사용하면 children 우선.

---

## 17. 후속 작업 (v1.1+)

- **Uploader preset**: 파일 여러 개에 대한 Progress 리스트 + 취소/재시도 버튼 조합. `Progress` 를 primitive 로 하는 helper 컴포넌트.
- **멀티파트 dash**: `Progress.Indicator` 를 여러 개 나열해 "0~30% 성공, 30~60% 스킵, 60~100% 대기" 같은 다중 세그먼트. Linear 전용 확장.
- **원형 그라데이션**: Circular 에 `linearGradient` 를 넣어 호를 색 그라데이션으로. `<linearGradient id="plastic-progress-gradient" />` 를 defs 에 넣고 `stroke="url(#plastic-progress-gradient)"` 로 참조.
- **Dashboard gauge** (3/4 원): Ant `type="dashboard"` 상응. `arcAngle={270}` prop.
- **Animated value counting**: value 42→75 로 바뀔 때 내부 숫자가 흐르게 보이는 옵션. `numberTransition` prop.
- **aria-valuetext 커스터마이저**: 스크린리더용 텍스트 포맷터 (`ariaValueText(v, max)`).
- **motion-reduce pulse fallback**: indeterminate 애니메이션을 단순 opacity pulse 로 대체.
- **Stepper 리팩터**: Stepper 의 세퍼레이터/진행 시각을 Progress.segmented primitive 로 내부 위임. 공통 스타일 토큰 공유.
- **Circular buffer**: 2 중 호.
- **Stripe 속도 prop**: `stripesSpeed: number` (기본 1s).
- **Server-rendered**: determinate SVG 는 SSR 안전. indeterminate 도 CSS 애니메이션이라 SSR 안전. 명시적 테스트 + 문서 필요.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| controlled/uncontrolled 훅 | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| 단계-기반 진행의 boundary (라벨/콘텐츠 있는 진행) | `/Users/neo/workspace/plastic/src/components/Stepper/` |
| 컴포넌트 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 데모 페이지 레이아웃 템플릿 (최신) | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |
| 이전 plan 포맷 (구조·톤 레퍼런스) | `/Users/neo/workspace/plastic/docs/plans/017-splitpane-component.md` |

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18.3 (기존) + DOM/SVG + CSS `@keyframes` 만 사용.

번들 영향:
- Progress 자체 예상 크기: JS ~2.0 KB (min) / ~0.9 KB (min+gzip) + CSS ~1.2 KB (min) / ~0.5 KB (min+gzip).
- plastic 전체 dist 영향 미미.

CSS 파일 처리:
- 현재 레포는 대부분 inline style. tsup 설정이 CSS import 를 어떻게 처리하는지 검토 필요.
- 방안 A: `tsup.config.ts` 에 `loader: { '.css': 'copy' }` 추가하여 `dist/Progress.css` 로 내보내고 사용자에게 `import "plastic/dist/Progress.css"` 안내.
- 방안 B: CSS 문자열을 상수로 export 하고 Root 가 최초 마운트 시 `<style data-plastic-progress />` 를 `document.head` 에 1 회 주입. 런타임 주입이므로 SSR 환경에선 hydration 충돌 가능 — useLayoutEffect + `typeof document !== "undefined"` 가드.
- **v1 권장**: 방안 B (self-contained). 플러그 앤 플레이. 성능 이슈 없으며 라이브러리의 "런타임 제로 설치" 원칙과 잘 어울림. 중복 주입은 `data-plastic-progress="injected"` 마커로 1 회만.

Browser 지원:
- CSS `@keyframes`, `transform`, `stroke-dasharray`: IE10 이상 (이미 모던만 지원 중이므로 OK).
- `prefers-reduced-motion`: Chrome 74+, Safari 10.1+, FF 63+.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/progress` (또는 현재 라우팅 방식) 로 `ProgressPage` 접근 가능.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] 기존 페이지 (Button/Card/CodeView/Actionable/PathInput/Toast/Dialog/Tooltip/DataTable/Stepper/CommandPalette/HexView/PipelineGraph) 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./Progress";` 추가됨.
- [ ] `package.json` dependencies 변경 없음.
- [ ] Props 문서 섹션이 표로 채워져 있음 (Progress 단축 / Root / Track / Indicator / Label / ValueText 여섯).
- [ ] Usage 섹션에 최소 4 개 스니펫 (업로드 / Circular indeterminate / Quiz segmented / 버퍼 비디오).
- [ ] 데모 Playground 에서 모든 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] indeterminate 상태에서 `aria-valuenow` 가 DOM 에 존재하지 않음 (DevTools Elements 탭 확인).
- [ ] determinate 상태에서 `aria-valuenow` = `Math.round(percent)` 정확.
- [ ] segmented 상태에서 `aria-valuemax` = segments, `aria-valuenow` = filled.
- [ ] `announce` 활성 시 스크린리더(VoiceOver) 에서 value 변경 announcement 가청.
- [ ] `prefers-reduced-motion: reduce` 환경에서 indeterminate 애니메이션이 정지.
- [ ] 모든 @keyframes 가 단일 CSS 번들/style 주입으로 1 회만 정의 (중복 없음).
- [ ] CSS 변수 `--plastic-progress-fill` 를 사용자가 override 하여 커스텀 색 적용 가능함을 예시 및 확인.

---

**끝.**
