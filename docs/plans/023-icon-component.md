# Icon + IconRegistry 컴포넌트 설계문서

## Context

plastic 라이브러리에 **일반 `Icon` 컴포넌트와 `IconRegistry` 시스템**을 도입한다. 현재 라이브러리는 컴포넌트마다 SVG를 inline으로 직접 그리고 있어 다음 문제가 누적되어 있다:

1. **중복 구현**: 같은 의미의 아이콘(check, X close, spinner, warning, chevron-down)이 컴포넌트마다 viewBox·stroke·크기 다른 형태로 3~4개씩 존재
2. **시각 일관성 결여**: viewBox는 `8x5`, `12x12`, `20x20`, `24x24` 4종이 혼재; stroke 폭은 `1.5`, `2`, `2.5`가 혼재; size는 `8`, `12`, `14`, `16`, `20` 5종이 혼재
3. **애니메이션 중복**: spinner의 `@keyframes`가 컴포넌트별로 별도 정의 (`plastic-toast-spin`, `pathinput-spin` 등)
4. **사용자 커스터마이징 불가**: 라이브러리 사용자가 특정 아이콘만 자기 디자인 시스템 아이콘으로 교체할 방법이 없음
5. **번들 사이즈 비효율**: 사용자가 Toast만 import해도 SelectIcon의 chevron-down SVG는 같이 번들됨 (tree-shaking은 컴포넌트 단위, 아이콘 단위 아님)

본 작업의 1차 목적은 **공통 `Icon` 컴포넌트 + `IconRegistry`**를 도입해 위 문제를 모두 흡수하고, 향후 추가 컴포넌트들이 자동으로 같은 아이콘 어휘를 따르게 만드는 것이다.

참고 (prior art — 아이콘 시스템):
- **Lucide React** — `<ChevronDown size={16} strokeWidth={2} />` 컴포넌트별 named export 패턴. tree-shaking 친화적. 1000+ 아이콘.
- **Phosphor Icons** — `<Phosphor.ChevronDown weight="regular" />` weight variants(thin/light/regular/bold/fill/duotone).
- **React Icons** — 여러 셋(FontAwesome, Material, etc.)을 prefix로 통합. `import { FaUser } from "react-icons/fa"`. 번들 사이즈 무거움.
- **Iconify** — JSON 메타데이터 + 동적 로드. 100,000+ 아이콘 통합. CDN/번들 모두 지원.
- **Radix Icons** — 작은 셋(~300), 단일 viewBox(`0 0 15 15`), `currentColor` 통일. 시각 일관성 강함.
- **Heroicons** — Tailwind 팀의 공식 셋. 두 variant(outline/solid).
- **Material Symbols** — variable font 기반, weight·grade·optical-size axis.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/Toast/ToastIcon.tsx` — variant별 success/error/warning/info/default 5종 + spinner. viewBox `0 0 20 20`, stroke 1.5.
- `src/components/Toast/ToastClose.tsx` — X close 아이콘.
- `src/components/PathInput/PathInputStatus.tsx` — valid/invalid/warning/spinner 4종. viewBox `0 0 24 24`, stroke 2.5. **spinner keyframes를 자체 `<style>` 태그로 주입**.
- `src/components/Select/SelectIcon.tsx` — chevron-down. viewBox `0 0 12 12`, stroke 1.5.
- `src/components/Select/SelectItemIndicator.tsx` — check 아이콘. viewBox `0 0 12 12`, stroke 1.75.
- `src/components/Combobox/ComboboxTrigger.tsx` — chevron-down (Select와 동일하지만 별도 구현).
- `src/components/Popover/PopoverClose.tsx` — X close (ToastClose와 동일하지만 별도).
- `src/components/Dialog/DialogClose.tsx` — X close (또 다른 별도 구현).
- `src/components/Stepper/StepperStep.tsx`, `StepperNextButton.tsx` — 단계 표시 아이콘들.
- `src/components/CommandPalette/CommandPaletteInput.tsx`, `CommandPaletteEmpty.tsx`, `CommandPaletteLoading.tsx`, `CommandPaletteItem.tsx` — search/empty/loading/chevron 4종.
- `src/components/DataTable/DataTableHeader.tsx`, `DataTableEmpty.tsx` — sort arrows + empty state.
- `src/components/Accordion/Accordion.tsx` (line 202) — chevron 토글.
- `src/components/Progress/ProgressTrackCircular.tsx` — 원형 progress (아이콘 아닌 SVG, 본 작업 대상 아님).
- `src/components/PipelineGraph/PipelineGraphEdge.tsx` — 엣지 path (본 작업 대상 아님, 그래프 그리기).
- `src/components/Actionable/ActionableRevealTrigger.tsx` — reveal trigger 아이콘.
- `src/index.ts` / `src/components/index.ts` — public API 진입점, Icon 추가 위치.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `strict` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 1. 가장 단순한 사용 — 등록된 아이콘 이름으로 호출
<Icon name="chevron-down" />              // 16x16, currentColor
<Icon name="chevron-down" size={20} />    // 명시적 사이즈
<Icon name="x" size="sm" />               // 사이즈 토큰 ("xs"|"sm"|"md"|"lg"|"xl")

// 2. 색상은 currentColor (부모 color 따라감)
<button style={{ color: "red" }}>
  <Icon name="trash" /> Delete
</button>

// 3. 회전·뒤집기·애니메이션
<Icon name="spinner" spin />              // 회전 애니메이션 (1s linear infinite)
<Icon name="chevron-right" rotate={90} /> // 90도 회전 (= chevron-down)
<Icon name="arrow-right" flipH />         // 좌우 반전

// 4. 라벨 (스크린리더용)
<Icon name="trash" label="Delete item" /> // role=img + aria-label
<Icon name="chevron-down" />              // 라벨 없으면 aria-hidden=true (장식)

// 5. 사용자 정의 아이콘 등록
import { registerIcon } from "@pihitpihit/plastic";

registerIcon("custom-logo", (
  <path d="M ..." />
));

<Icon name="custom-logo" />               // 등록된 아이콘 사용

// 6. 외부 SVG 즉석 사용 (등록 없이)
<Icon size={16}>
  <path d="M ..." />
</Icon>
```

핵심 설계 원칙:
- **단일 viewBox 표준**: 모든 등록 아이콘은 `0 0 24 24`. 사용자 정의 아이콘은 `viewBox` prop으로 override 가능.
- **`currentColor` 강제**: stroke/fill에 `currentColor`만 사용. 부모 `color`로 색상 상속. 컴포넌트가 자체 색상 prop을 가지지 않음 (CSS로 충분).
- **사이즈 토큰 + 자유 값**: `xs(12) | sm(14) | md(16) | lg(20) | xl(24)` 토큰 + 임의 number/string도 허용.
- **레지스트리 패턴**: 내장 아이콘 셋(아래 §6 목록)을 모듈 로드 시 자동 등록. 사용자는 `registerIcon(name, svgChildren)`로 자기 아이콘 추가.
- **runtime-zero 핵심 아이콘**: 내장 아이콘은 SVG `<path>` JSX로 정의(외부 의존 0). 외부 셋(Lucide 등) 채택은 **명시적으로 거절**(§9 결정 사항 참조).
- **headless 정신**: `className`/`style`로 모든 시각 속성 override 가능.
- **accessibility**: `label` prop 있으면 `role="img" aria-label={label}`, 없으면 `aria-hidden="true"` (장식).
- **마이그레이션 점진적**: 기존 컴포넌트 inline SVG는 **이번 작업 범위 내에서 모두 교체**. 단 PipelineGraph/Progress의 비-아이콘 SVG(엣지 path, 원형 progress)는 대상 아님.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `<Icon name="..." />` 단일 컴포넌트로 모든 아이콘 사용.
2. 내장 아이콘 셋 — **약 24종** (현 라이브러리 사용 + 향후 후보 컴포넌트 예상 분):
   - Navigation: `chevron-up`, `chevron-down`, `chevron-left`, `chevron-right`
   - Actions: `x`, `check`, `trash`, `copy`, `download`, `upload`, `external-link`, `more-horizontal`, `more-vertical`
   - Status: `info`, `warning`, `error`, `success`, `help`
   - Misc: `search`, `loader` (spinner), `plus`, `minus`, `arrow-right`, `arrow-left`
3. **사이즈 토큰**: `xs(12) | sm(14) | md(16) | lg(20) | xl(24)` + 임의 number/string.
4. **회전/반전**: `rotate?: 0 | 90 | 180 | 270`, `flipH?: boolean`, `flipV?: boolean`.
5. **애니메이션**: `spin?: boolean` (1s linear infinite). spinner 전용이 아니라 임의 아이콘에 적용 가능.
6. **`label` prop 기반 a11y**: 있으면 `role="img" aria-label={label}`, 없으면 `aria-hidden="true"`.
7. **사용자 정의 아이콘 등록**: `registerIcon(name, children)`, `unregisterIcon(name)`, `hasIcon(name)`, `getIconNames()`.
8. **inline 사용자 SVG**: `<Icon size={16}>{customSvgChildren}</Icon>` — `name` 없이 `children`만으로 사용 가능.
9. **viewBox override**: `<Icon viewBox="0 0 32 32">{...}</Icon>` — 사용자 SVG의 viewBox 다를 때.
10. **TypeScript 자동완성**: 내장 아이콘 이름이 `name` prop의 union type. 사용자 등록 아이콘은 module augmentation으로 확장 가능.
11. **기존 컴포넌트 마이그레이션**: 위 §Context 의 기존 inline SVG 11개 파일을 모두 `<Icon />` 사용으로 교체.
12. **단일 spinner keyframes**: `plastic-toast-spin`, `pathinput-spin` 중복 제거. `Icon`이 자체 keyframes 1개만 정의(`plastic-icon-spin`).
13. 배럴 export — `export { Icon, registerIcon, unregisterIcon, hasIcon, getIconNames } from "./Icon"`.

### Non-goals (v1 제외)
- **외부 아이콘 셋 의존** (Lucide/Phosphor/Heroicons 채택). v1은 자체 24종. 사용자가 외부 셋을 쓰고 싶으면 `registerIcon`으로 직접 등록.
- **다중 weight/style variants** (Phosphor의 `thin/light/regular/bold/fill/duotone`). v1은 단일 weight.
- **아이콘 검색/카탈로그 UI** (Storybook의 icon gallery 같은). 데모 페이지에 단순 그리드만 표시.
- **아이콘 lazy load** (Iconify 식 동적 fetch). v1 모든 내장 아이콘은 정적 번들.
- **animated icons** (Lottie 등). v1은 `spin` 단일 애니메이션만.
- **컬러 아이콘** (다중 색 fill). v1은 currentColor 단일 색만.
- **아이콘 사이즈에 따른 자동 hairline 보정** (Material Symbols의 optical-size 같은). 모든 사이즈에서 동일 stroke.
- **PipelineGraph 엣지 path / Progress 원형 SVG** 마이그레이션. 이들은 "아이콘"이 아니라 도식 SVG.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Icon/Icon.types.ts`

```ts
import type { CSSProperties, ReactNode, SVGAttributes } from "react";

/**
 * 사이즈 토큰. 토큰 값은 §2.2 SIZE_MAP 참조.
 * - xs: 12px (작은 인디케이터, 인라인 텍스트 옆)
 * - sm: 14px (PathInput 같은 폼 status)
 * - md: 16px (기본값, 대부분의 버튼/메뉴 항목)
 * - lg: 20px (Toast 아이콘, Dialog close)
 * - xl: 24px (큰 강조)
 */
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

/** 회전 각도. CSS rotate. */
export type IconRotate = 0 | 90 | 180 | 270;

/**
 * 내장 아이콘 이름 — 모듈 로드 시 자동 등록.
 * 사용자가 추가 아이콘 등록 시 module augmentation으로 확장 가능:
 *
 *   declare module "@pihitpihit/plastic" {
 *     interface IconNameMap {
 *       "custom-logo": true;
 *       "custom-arrow": true;
 *     }
 *   }
 */
export interface IconNameMap {
  // Navigation
  "chevron-up": true;
  "chevron-down": true;
  "chevron-left": true;
  "chevron-right": true;
  "arrow-up": true;
  "arrow-down": true;
  "arrow-left": true;
  "arrow-right": true;

  // Actions
  "x": true;
  "check": true;
  "trash": true;
  "copy": true;
  "download": true;
  "upload": true;
  "external-link": true;
  "more-horizontal": true;
  "more-vertical": true;
  "plus": true;
  "minus": true;

  // Status
  "info": true;
  "warning": true;
  "error": true;
  "success": true;
  "help": true;

  // Misc
  "search": true;
  "loader": true;
}

/** Icon name = IconNameMap의 키 union. */
export type IconName = keyof IconNameMap;

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
  /**
   * 등록된 아이콘 이름. 미지정 시 `children` 필수.
   * `name`과 `children` 동시 지정 시 `children` 우선 (사용자 inline SVG가 등록 아이콘 override).
   */
  name?: IconName | (string & {}); // (string & {}) — 사용자 등록 이름 자동완성 + 자유 string 허용

  /**
   * 사이즈. 토큰 또는 임의 number(px)/string(CSS 길이).
   * 기본 "md" (16px).
   */
  size?: IconSize | number | string;

  /** 회전 각도. CSS transform: rotate(deg). */
  rotate?: IconRotate;

  /** 좌우 반전 (CSS transform: scaleX(-1)). */
  flipH?: boolean;

  /** 상하 반전 (CSS transform: scaleY(-1)). */
  flipV?: boolean;

  /** 회전 애니메이션. 기본 false. true면 1s linear infinite. */
  spin?: boolean;

  /**
   * 스크린리더 라벨.
   * - 지정 시: role="img" + aria-label.
   * - 미지정 시: aria-hidden="true" (장식 아이콘).
   */
  label?: string;

  /**
   * viewBox override. 기본 "0 0 24 24".
   * 사용자 inline SVG가 다른 viewBox일 때 지정.
   */
  viewBox?: string;

  /**
   * 사용자 inline SVG content (path/circle/g 등 자식 요소).
   * `name` 미지정 시 필수.
   */
  children?: ReactNode;

  className?: string;
  style?: CSSProperties;
}

/** Registry entry — 아이콘 SVG content + viewBox. */
export interface IconDefinition {
  /** SVG 자식 요소 (path/circle/g 등). */
  children: ReactNode;
  /** viewBox. 기본 "0 0 24 24". 등록 시 다른 값 지정 가능. */
  viewBox?: string;
}
```

### 2.2 사이즈 토큰 매핑 — `src/components/Icon/Icon.tsx`

```ts
const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

function resolveSize(size: IconSize | number | string | undefined): string {
  if (size === undefined) return "16px";
  if (typeof size === "number") return `${size}px`;
  if (typeof size === "string" && size in SIZE_MAP) {
    return `${SIZE_MAP[size as IconSize]}px`;
  }
  // CSS 길이 그대로 (e.g., "1.5em", "20px", "1rem")
  return size as string;
}
```

### 2.3 레지스트리 API — `src/components/Icon/registry.ts`

```ts
import type { IconDefinition } from "./Icon.types";

/** 모든 등록된 아이콘 저장소. 모듈 스코프. */
const registry = new Map<string, IconDefinition>();

/**
 * 아이콘 등록.
 *
 * @example
 *   registerIcon("custom-logo", (
 *     <path d="M ..." />
 *   ));
 *   // 또는 viewBox 지정:
 *   registerIcon("custom-logo", {
 *     children: <path d="M ..." />,
 *     viewBox: "0 0 32 32",
 *   });
 */
export function registerIcon(
  name: string,
  definition: IconDefinition | IconDefinition["children"],
): void {
  if (typeof definition === "object" && definition !== null && "children" in definition) {
    registry.set(name, definition);
  } else {
    registry.set(name, { children: definition as IconDefinition["children"] });
  }
}

/** 아이콘 등록 해제. */
export function unregisterIcon(name: string): boolean {
  return registry.delete(name);
}

/** 아이콘 등록 여부 확인. */
export function hasIcon(name: string): boolean {
  return registry.has(name);
}

/** 등록된 모든 아이콘 이름 반환. */
export function getIconNames(): string[] {
  return Array.from(registry.keys());
}

/** @internal 내부에서만 사용 — Icon 컴포넌트가 호출. */
export function getIconDefinition(name: string): IconDefinition | undefined {
  return registry.get(name);
}
```

### 2.4 내장 아이콘 등록 — `src/components/Icon/built-in.ts`

```ts
import { registerIcon } from "./registry";

// 모듈 로드 시 즉시 모든 내장 아이콘 등록.
// 사용자는 `import "@pihitpihit/plastic"` 만으로 모든 내장 아이콘 사용 가능.

registerIcon("chevron-down", (
  <path
    d="M6 9l6 6 6-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
));

registerIcon("chevron-up", (
  <path
    d="M18 15l-6-6-6 6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
));

// ... (24종 모두, §6 아이콘 catalog 참조)
```

### 2.5 Icon 컴포넌트 — `src/components/Icon/Icon.tsx`

```tsx
import type { CSSProperties, ReactElement } from "react";
import { getIconDefinition } from "./registry";
import type { IconProps } from "./Icon.types";

const SIZE_MAP = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24 } as const;

const SPIN_KEYFRAMES_ID = "plastic-icon-spin-keyframes";
const SPIN_KEYFRAMES = `@keyframes plastic-icon-spin{to{transform:rotate(360deg)}}`;

function ensureSpinKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(SPIN_KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = SPIN_KEYFRAMES_ID;
  style.textContent = SPIN_KEYFRAMES;
  document.head.appendChild(style);
}

function resolveSize(size: IconProps["size"]): string {
  if (size === undefined) return "16px";
  if (typeof size === "number") return `${size}px`;
  if (typeof size === "string" && size in SIZE_MAP) {
    return `${SIZE_MAP[size as keyof typeof SIZE_MAP]}px`;
  }
  return size as string;
}

function buildTransform(
  rotate: IconProps["rotate"],
  flipH: boolean,
  flipV: boolean,
): string | undefined {
  const parts: string[] = [];
  if (rotate !== undefined && rotate !== 0) parts.push(`rotate(${rotate}deg)`);
  if (flipH) parts.push(`scaleX(-1)`);
  if (flipV) parts.push(`scaleY(-1)`);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export function Icon(props: IconProps): ReactElement | null {
  const {
    name,
    size,
    rotate,
    flipH = false,
    flipV = false,
    spin = false,
    label,
    viewBox: viewBoxProp,
    children: childrenProp,
    className,
    style,
    ...rest
  } = props;

  // children 우선; 없으면 registry에서 lookup
  let children = childrenProp;
  let resolvedViewBox = viewBoxProp;

  if (children === undefined && name !== undefined) {
    const def = getIconDefinition(name);
    if (def !== undefined) {
      children = def.children;
      resolvedViewBox = viewBoxProp ?? def.viewBox ?? "0 0 24 24";
    } else {
      // 등록되지 않은 아이콘 — 개발 환경에서 경고
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          `[Icon] Icon "${name}" is not registered. Use registerIcon() first.`,
        );
      }
      return null;
    }
  }

  if (children === undefined) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[Icon] Either "name" or "children" must be provided.`);
    }
    return null;
  }

  resolvedViewBox = resolvedViewBox ?? "0 0 24 24";

  const px = resolveSize(size);
  const transform = buildTransform(rotate, flipH, flipV);

  // spin keyframes 보장 (마운트 시 1회만)
  if (spin) ensureSpinKeyframes();

  const a11yProps = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };

  const mergedStyle: CSSProperties = {
    display: "inline-block",
    verticalAlign: "middle",
    flexShrink: 0,
    color: "currentColor",
    ...(transform !== undefined ? { transform } : {}),
    ...(spin ? { animation: "plastic-icon-spin 1s linear infinite" } : {}),
    ...style,
  };

  return (
    <svg
      width={px}
      height={px}
      viewBox={resolvedViewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={mergedStyle}
      {...a11yProps}
      {...rest}
    >
      {children}
    </svg>
  );
}

Icon.displayName = "Icon";
```

### 2.6 배럴 — `src/components/Icon/index.ts`

```ts
import "./built-in"; // side-effect: 내장 아이콘 자동 등록
export { Icon } from "./Icon";
export {
  registerIcon,
  unregisterIcon,
  hasIcon,
  getIconNames,
} from "./registry";
export type {
  IconProps,
  IconName,
  IconNameMap,
  IconSize,
  IconRotate,
  IconDefinition,
} from "./Icon.types";
```

### 2.7 컴포넌트 배럴 추가 — `src/components/index.ts`

```ts
// ... 기존 export 위에 추가:
export * from "./Icon";
```

---

## 3. 파일 구조

```
src/components/Icon/
├── Icon.tsx              ← 메인 컴포넌트
├── Icon.types.ts         ← 타입 정의 + IconNameMap
├── registry.ts           ← register/unregister/has/getNames/getDefinition
├── built-in.ts           ← 내장 아이콘 24종 등록 (side-effect)
└── index.ts              ← 배럴
```

**왜 `built-in.ts`가 별도 파일인가**: tree-shaking 측면에서 `index.ts`가 `import "./built-in"`을 side-effect import로 표시하면, 사용자가 `Icon`만 import해도 모든 내장 아이콘이 번들에 포함된다. 이는 v1 의도된 동작이다 — 24종은 매우 작고(아이콘당 ~150바이트), tree-shaking 복잡성 도입 비용이 이득보다 큼.

향후 내장 아이콘이 100종+로 늘어나면 v2에서 named export 패턴으로 리팩토링 검토(`import { ChevronDownIcon } from "@pihitpihit/plastic/icons"`).

---

## 4. 동작 명세

### 4.1 아이콘 lookup 순서

`<Icon name="X" children={Y} />` 호출 시:

1. `children` (Y)가 정의되어 있으면 그것을 사용. (사용자 inline SVG 우선)
2. `children` 없고 `name` (X)이 정의되어 있으면 `getIconDefinition(X)` lookup.
3. 둘 다 없으면 `console.warn` + `null` 반환 (개발 모드에서만 경고).
4. lookup 실패 시 (등록 안 된 이름) `console.warn` + `null` 반환.

### 4.2 viewBox 결정 순서

1. `viewBox` prop이 명시되면 그것 사용.
2. registry definition의 viewBox가 있으면 그것 사용.
3. 둘 다 없으면 `"0 0 24 24"` (기본).

### 4.3 사이즈 결정

| 입력 | 결과 |
|---|---|
| undefined | `16px` (기본 md) |
| `"xs"` ~ `"xl"` | SIZE_MAP 매핑값 + "px" |
| number (e.g., 32) | `32px` |
| string (e.g., `"1.5em"`, `"20px"`, `"1rem"`) | 그대로 |

### 4.4 색상

- SVG 자체에 `fill="none"` 기본 적용.
- 모든 path/stroke는 `currentColor` 사용 (built-in 아이콘 정의에 강제).
- `style.color`로 색상 제어. 부모 `color` 자동 상속.
- `Icon` 자체는 색상 prop 없음.

### 4.5 회전 / 반전

`rotate` + `flipH` + `flipV`는 CSS `transform`으로 합성:
- `rotate(90deg)` + `scaleX(-1)` → `transform: rotate(90deg) scaleX(-1)`
- 모두 0/false면 `transform` 미설정.

### 4.6 spin 애니메이션

- `spin={true}` 시 `animation: plastic-icon-spin 1s linear infinite` 적용.
- 첫 spin 사용 시 `<style id="plastic-icon-spin-keyframes">` 태그를 `document.head`에 1회만 주입 (idempotent).
- SSR 환경에서는 주입 skip (`typeof document === "undefined"`).
- `prefers-reduced-motion: reduce` 처리는 v1 미포함 — 사용자가 직접 CSS로 override (향후 v1.1에서 자동 감지 검토).

### 4.7 접근성

```tsx
// 장식 아이콘 (텍스트 옆 부수 요소)
<button>
  <Icon name="trash" /> Delete
</button>
// → <svg aria-hidden="true">

// 의미 있는 아이콘 (단독 버튼)
<button>
  <Icon name="trash" label="Delete item" />
</button>
// → <svg role="img" aria-label="Delete item">
```

---

## 5. 마이그레이션 — 기존 inline SVG 교체

현재 11개 파일에 35개 inline SVG가 존재. 이 작업의 일부로 모두 `<Icon />`으로 교체한다.

### 5.1 교체 매핑 표

| 파일 | 현재 SVG | 교체 후 |
|---|---|---|
| `Toast/ToastIcon.tsx` | success/error/warning/info/default 5종 + spinner | `<Icon name="success" />` 등 5종 + `<Icon name="loader" spin />` |
| `Toast/ToastClose.tsx` | X close (16x16) | `<Icon name="x" size="md" />` |
| `PathInput/PathInputStatus.tsx` | valid(check)/invalid(X-circle)/warning + spinner | `<Icon name="check" size="sm" />`, `<Icon name="error" size="sm" />`, `<Icon name="warning" size="sm" />`, `<Icon name="loader" size="sm" spin />` |
| `Select/SelectIcon.tsx` | chevron-down (12x12) | `<Icon name="chevron-down" size="xs" />` |
| `Select/SelectItemIndicator.tsx` | check (12x12) | `<Icon name="check" size="xs" />` |
| `Combobox/ComboboxTrigger.tsx` | chevron-down | `<Icon name="chevron-down" size="xs" />` |
| `Popover/PopoverClose.tsx` | X close | `<Icon name="x" size="sm" />` |
| `Dialog/DialogClose.tsx` | X close | `<Icon name="x" size="md" />` |
| `Stepper/StepperStep.tsx` | check + 단계 표시 | `<Icon name="check" size="sm" />` 등 |
| `Stepper/StepperNextButton.tsx` | arrow-right | `<Icon name="arrow-right" size="sm" />` |
| `Accordion/Accordion.tsx:202` | chevron 토글 | `<Icon name="chevron-down" rotate={open ? 180 : 0} />` |
| `Actionable/ActionableRevealTrigger.tsx` | reveal trigger | `<Icon name="more-horizontal" size="sm" />` (또는 신규 등록) |
| `CommandPalette/CommandPaletteInput.tsx` | search | `<Icon name="search" size="sm" />` |
| `CommandPalette/CommandPaletteItem.tsx` | chevron | `<Icon name="chevron-right" size="xs" />` |
| `CommandPalette/CommandPaletteEmpty.tsx` | empty illustration | (단순 아이콘 아님 — `<Icon name="search" size="xl" />` 등으로 대체 또는 유지) |
| `CommandPalette/CommandPaletteLoading.tsx` | spinner | `<Icon name="loader" spin />` |
| `DataTable/DataTableHeader.tsx` | sort up/down arrows (8x5) | `<Icon name="chevron-up" size="xs" />`, `<Icon name="chevron-down" size="xs" />` |
| `DataTable/DataTableEmpty.tsx` | empty illustration | (검토 필요 — 일러스트인지 아이콘인지) |

**제외 (마이그레이션 대상 아님):**
- `PipelineGraph/PipelineGraphEdge.tsx` — 그래프 엣지 path
- `Progress/ProgressTrackCircular.tsx` — 원형 progress 트랙

### 5.2 마이그레이션 시 주의사항

1. **사이즈 매핑 신중히**: 기존 width/height (8/12/14/16/20)를 가장 가까운 토큰으로. 8x5는 "xs" (12) 또는 inline number(`size={10}`).
2. **색상 처리**: 기존 컴포넌트가 `style.color`로 색상 제어 중인 경우 그대로 작동. 컴포넌트가 SVG에 직접 색상 prop 넘기던 경우(`<svg fill="#dc2626">`)는 부모 `style.color`로 옮겨야 함.
3. **애니메이션 keyframes 정리**: PathInput의 `<style>{`@keyframes pathinput-spin...`}</style>`, Toast의 `plastic-toast-spin` 정의 모두 **삭제**. Icon이 자체 keyframes 관리.
4. **spinner 컴포넌트 정의도 정리**: `Toast/ToastIcon.tsx`의 `SpinnerIcon` named export, `PathInput/PathInputStatus.tsx`의 `SpinnerIcon` 등 더 이상 필요 없으면 삭제.

### 5.3 마이그레이션 검증

각 컴포넌트 데모 페이지(`demo/src/pages/*.tsx`)에서 다음 항목 시각 회귀 확인:
- 아이콘 사이즈가 이전과 동일하게 보이는가
- 색상이 이전과 동일한가 (호버/액티브/disabled 상태별)
- 회전 애니메이션(spinner)이 이전과 동일한 속도/방향인가
- 다크 테마에서도 정상인가

---

## 6. 내장 아이콘 카탈로그 (§4 모든 24종 SVG path)

각 아이콘은 `0 0 24 24` viewBox, stroke="currentColor", fill="none" 또는 fill="currentColor" 기준.

### Navigation (8종)

```tsx
"chevron-up":     <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"chevron-down":   <path d="M6 9l6 6 6-6"   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"chevron-left":   <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"chevron-right":  <path d="M9 18l6-6-6-6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"arrow-up":       <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"arrow-down":     <path d="M12 5v14M19 12l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"arrow-left":     <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"arrow-right":    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
```

### Actions (11종)

```tsx
"x":              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"check":          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"trash":          <>
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
"copy":           <>
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
"download":       <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"upload":         <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"external-link":  <>
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
"more-horizontal": <>
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                    <circle cx="19" cy="12" r="1" fill="currentColor" />
                    <circle cx="5" cy="12" r="1" fill="currentColor" />
                  </>
"more-vertical":  <>
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="5" r="1" fill="currentColor" />
                    <circle cx="12" cy="19" r="1" fill="currentColor" />
                  </>
"plus":           <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
"minus":          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
```

### Status (5종)

```tsx
"info":           <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
"warning":        <>
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
"error":          <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
"success":        <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
"help":           <>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
```

### Misc (2종)

```tsx
"search":         <>
                    <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
"loader":         <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
```

**기준 디자인**: Lucide / Feather 스타일 (linear, stroke-based, 24x24 viewBox, stroke 2). 시각 일관성 위해 모든 아이콘이 동일 viewBox·stroke·linecap·linejoin 사용.

---

## 7. 데모 페이지 — `demo/src/pages/IconPage.tsx`

```tsx
import { Card, Icon, getIconNames } from "@pihitpihit/plastic";

export function IconPage() {
  return (
    <div>
      <h1>Icon</h1>

      {/* 섹션 1: 모든 내장 아이콘 그리드 */}
      <Card.Root>
        <Card.Header>Built-in Icons (24)</Card.Header>
        <Card.Body>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16 }}>
            {getIconNames().map((name) => (
              <div key={name} style={{ textAlign: "center" }}>
                <Icon name={name} size="xl" />
                <div style={{ fontSize: 11, marginTop: 6, color: "#666" }}>{name}</div>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 2: 사이즈 토큰 */}
      <Card.Root>
        <Card.Header>Sizes</Card.Header>
        <Card.Body>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Icon name="check" size="xs" /> xs (12)
            <Icon name="check" size="sm" /> sm (14)
            <Icon name="check" size="md" /> md (16, default)
            <Icon name="check" size="lg" /> lg (20)
            <Icon name="check" size="xl" /> xl (24)
            <Icon name="check" size={48} /> 48 (custom)
          </div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 3: 색상 (currentColor 상속) */}
      <Card.Root>
        <Card.Header>Color (inherits via currentColor)</Card.Header>
        <Card.Body>
          <div style={{ color: "red" }}><Icon name="error" /> Red error</div>
          <div style={{ color: "green" }}><Icon name="success" /> Green success</div>
          <div style={{ color: "#2563eb" }}><Icon name="info" /> Blue info</div>
        </Card.Body>
      </Card.Root>

      {/* 섹션 4: 회전 / 반전 */}
      <Card.Root>
        <Card.Header>Rotate / Flip</Card.Header>
        <Card.Body>
          <Icon name="chevron-down" rotate={0} /> 0°
          <Icon name="chevron-down" rotate={90} /> 90°
          <Icon name="chevron-down" rotate={180} /> 180°
          <Icon name="chevron-down" rotate={270} /> 270°
          <Icon name="arrow-right" flipH /> flipH
        </Card.Body>
      </Card.Root>

      {/* 섹션 5: spin */}
      <Card.Root>
        <Card.Header>Spin animation</Card.Header>
        <Card.Body>
          <Icon name="loader" spin />
          <Icon name="loader" size="lg" spin />
          <Icon name="loader" size="xl" spin />
          {/* 임의 아이콘에도 적용 가능 */}
          <Icon name="check" spin />
        </Card.Body>
      </Card.Root>

      {/* 섹션 6: 사용자 등록 + inline */}
      <Card.Root>
        <Card.Header>Custom registration / inline children</Card.Header>
        <Card.Body>
          {/* inline */}
          <Icon size={24} viewBox="0 0 24 24" label="Custom shape">
            <rect x="4" y="4" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" />
          </Icon>

          {/* 등록된 사용자 아이콘 — registerIcon은 컴포넌트 외부에서 호출 */}
          <Icon name="my-custom" />
        </Card.Body>
      </Card.Root>

      {/* 섹션 7: a11y */}
      <Card.Root>
        <Card.Header>Accessibility</Card.Header>
        <Card.Body>
          {/* 장식 — aria-hidden */}
          <button><Icon name="trash" /> Delete</button>

          {/* 의미 있는 단독 아이콘 — role=img + aria-label */}
          <button><Icon name="trash" label="Delete item" /></button>
        </Card.Body>
      </Card.Root>
    </div>
  );
}
```

데모 라우팅 등록 — `demo/src/App.tsx`의 NAV에 `Icon` 항목 추가:

```tsx
const PAGES = [
  // ... 기존 페이지들
  { id: "icon", label: "Icon", component: IconPage },
];
```

---

## 8. 접근성 (a11y)

### 8.1 `label` 미지정 (장식 아이콘)
```tsx
<svg aria-hidden="true">
```
스크린리더가 무시. 부모 요소(보통 button)의 텍스트 라벨이 의미 전달 책임을 가짐.

### 8.2 `label` 지정 (의미 있는 아이콘)
```tsx
<svg role="img" aria-label="Delete item">
```
스크린리더가 라벨 읽음. 단독 아이콘 버튼/링크에 사용.

### 8.3 검증 항목
- [ ] VoiceOver (macOS): label 있는 아이콘 → 라벨 읽음, 없으면 무시.
- [ ] NVDA (Windows): 동일.
- [ ] JAWS (Windows): 동일.
- [ ] axe-core 자동 검사 (개발 시): role/aria 속성 일관성.

### 8.4 색상 대비
- 아이콘 색상 자체는 컴포넌트 책임 아님 (currentColor → 부모 책임).
- 다만 데모 페이지에서 light/dark 테마 모두 명확히 보이는지 시각 확인 필요.

---

## 9. 설계 결정 사항 (rationale)

### 9.1 외부 아이콘 셋(Lucide 등) 채택 안 함
**이유**:
- 현재 사용 중인 아이콘 종류가 24개 미만 → 외부 셋(1000+) 의존은 과한 부담.
- 외부 셋의 디자인 언어가 plastic의 기존 컴포넌트 시각과 100% 일치하지 않음 (특히 viewBox/stroke).
- 추가 npm 의존성 = peer 호환성 문제·번들 사이즈·버전 관리 부담.
- 사용자가 외부 셋을 쓰고 싶으면 `registerIcon`으로 자유롭게 추가 가능 — 채택을 강제하지 않음.

**v2 검토 조건**: 내장 아이콘이 100종+가 되거나, 사용자가 외부 셋 채택을 강하게 요구하는 경우 재검토.

### 9.2 단일 viewBox `0 0 24 24` 강제
**이유**: 시각 일관성. 현재 4종의 viewBox(8x5, 12x12, 20x20, 24x24)가 혼재해 stroke 두께가 사이즈마다 달라 보이는 문제를 해결. Lucide·Feather·Material Symbols 모두 24 기반.

**예외**: 사용자 inline SVG는 `viewBox` prop으로 다른 값 지정 가능.

### 9.3 색상 prop 안 둠
**이유**: `currentColor` + 부모 `color` 패턴이 React/CSS 생태계 표준. `color` prop 추가는 이중 진실 원천 만듦. 사용자가 직접 `style={{ color: "..." }}` 쓰는 게 명확.

### 9.4 spinner를 별도 컴포넌트로 안 만들고 `<Icon spin />`로 해결
**이유**: spinner는 단지 "회전하는 아이콘"이고 아이콘 모양은 다양함(loader, refresh, etc.). spin 동작은 직교 prop으로 분리하는 게 합성성 좋음. 또한 keyframes 중복 제거 효과 큼.

### 9.5 registry를 모듈 스코프 Map으로
**이유**: React Context로 만들 수도 있지만, 아이콘 등록은 앱 전역 단일 진실 원천이면 충분. Provider 트리 강제는 사용 부담만 늘림. 단점은 SSR에서 hydration 시 등록 타이밍 주의 필요 → built-in은 모듈 로드 시 즉시 등록되므로 안전, 사용자 등록은 컴포넌트 마운트 전(앱 진입점)에 호출 권장.

### 9.6 `name`이 `IconName | (string & {})` 타입
**이유**: TypeScript에서 union literal type + `string & {}` 패턴은 자동완성을 유지하면서 자유 string도 허용. 사용자가 module augmentation으로 IconNameMap을 확장하지 않고도 `<Icon name="my-custom" />` 사용 가능 (런타임 lookup만).

---

## 10. Edge cases

### 10.1 등록 안 된 아이콘 호출
```tsx
<Icon name="nonexistent" />
// → console.warn("[Icon] Icon \"nonexistent\" is not registered. Use registerIcon() first.")
// → null 반환 (DOM에 아무것도 안 그림)
```

`null` 반환은 사용자 코드 깨뜨리지 않으면서 개발 시 빠르게 알아차리게 함.

### 10.2 `name`도 `children`도 없음
```tsx
<Icon />
// → console.warn("[Icon] Either \"name\" or \"children\" must be provided.")
// → null 반환
```

### 10.3 SSR
- `built-in.ts`의 `registerIcon` 호출은 모듈 로드 시 동기적으로 실행 → SSR에서 안전.
- spin 사용 시 `ensureSpinKeyframes()`는 `typeof document === "undefined"` 가드 → SSR 안전.
- 하이드레이션 후 클라이언트에서 첫 spin 호출 시 keyframes 주입 (1회).

### 10.4 같은 이름 중복 등록
```tsx
registerIcon("check", svgA);
registerIcon("check", svgB); // svgB가 svgA를 덮어씀 (Map.set)
```
**이유**: 사용자가 내장 아이콘을 의도적으로 override하는 케이스 지원. 경고 안 함 (의도적 동작).

### 10.5 사용자 inline SVG가 잘못된 viewBox
```tsx
<Icon size={16}>
  <path d="M ..." /> {/* viewBox 명시 안 함 → 기본 0 0 24 24 사용 → path가 24 좌표계 아니면 깨짐 */}
</Icon>
```
**해결**: 문서에 명시 — inline children 사용 시 path 좌표가 24x24 기준이거나 `viewBox` prop으로 명시 필요.

### 10.6 `rotate` + `spin` 동시 사용
```tsx
<Icon name="loader" spin rotate={45} />
```
CSS `animation`이 `transform`을 덮어씀 (spin keyframes 안에 `transform: rotate(360deg)` 있음). 결과: rotate prop 무시되고 spin만 적용. 이는 의도된 동작이며 v1에선 문서로 안내.

향후 v1.1: `rotate` 시작 각도를 spin 시작점으로 사용하려면 `--icon-base-rotate` CSS variable 도입 검토.

### 10.7 매우 큰 `size`
```tsx
<Icon name="check" size={1000} />
```
SVG는 viewBox 기반 벡터라 무한 확대 가능. 다만 stroke가 1000px 사이즈에서 매우 가늘어 보일 수 있음(stroke 2가 1000/24 = ~41배 작아짐). 의도적 — 디자인 수정은 사용자 책임.

### 10.8 `registerIcon` 호출 타이밍
사용자가 컴포넌트 렌더 후에 등록하면 첫 렌더 시 null 반환 → 등록 후 재렌더 필요. 권장: **앱 진입점(`main.tsx`/`App.tsx` top level)에서 한 번 등록**. 문서에 명시.

---

## 11. 구현 단계 (Phase)

### Phase 1: 코어 (Icon + registry + 내장 아이콘)
1. `src/components/Icon/Icon.types.ts` 작성
2. `src/components/Icon/registry.ts` 작성
3. `src/components/Icon/built-in.ts` — 24종 모두 등록
4. `src/components/Icon/Icon.tsx` 작성
5. `src/components/Icon/index.ts` 배럴 작성
6. `src/components/index.ts`에 `export * from "./Icon"` 추가
7. `npm run typecheck` 통과 확인
8. `npm run build` 통과 확인

### Phase 2: 데모 페이지
1. `demo/src/pages/IconPage.tsx` 작성 (§7 템플릿 그대로)
2. `demo/src/App.tsx` NAV에 Icon 항목 추가
3. `cd demo && npm run dev` 후 브라우저에서 모든 섹션 시각 확인
4. light/dark 테마 모두 확인

### Phase 3: 마이그레이션 — 작은 컴포넌트부터
순서: 의존도 적은 단일 SVG 컴포넌트 → 복잡한 다중 SVG 컴포넌트.

1. `Select/SelectIcon.tsx` — chevron-down 1개. 가장 단순.
2. `Select/SelectItemIndicator.tsx` — check 1개.
3. `Combobox/ComboboxTrigger.tsx` — chevron-down 1개.
4. `Popover/PopoverClose.tsx` — X 1개.
5. `Dialog/DialogClose.tsx` — X 1개.
6. `Accordion/Accordion.tsx` (line 202) — chevron 토글.
7. `Stepper/StepperStep.tsx`, `StepperNextButton.tsx` — check + arrow.
8. `Actionable/ActionableRevealTrigger.tsx`.
9. `CommandPalette/CommandPaletteInput.tsx` — search.
10. `CommandPalette/CommandPaletteItem.tsx` — chevron.
11. `CommandPalette/CommandPaletteLoading.tsx` — spinner.
12. `CommandPalette/CommandPaletteEmpty.tsx` — 검토 후 결정.
13. `DataTable/DataTableHeader.tsx` — sort arrows.
14. `DataTable/DataTableEmpty.tsx` — 검토 후 결정.
15. `PathInput/PathInputStatus.tsx` — valid/invalid/warning + spinner. **자체 keyframes 삭제 주의**.
16. `Toast/ToastIcon.tsx` — variant별 5종 + spinner. **`SpinnerIcon` named export 삭제, `plastic-toast-spin` keyframes 정의 삭제**.
17. `Toast/ToastClose.tsx` — X.

각 단계 완료 시:
- `npm run typecheck`
- 해당 컴포넌트 데모 페이지에서 시각 회귀 확인
- 다크 테마 확인
- 인터랙션(호버/액티브/포커스) 확인

### Phase 4: 정리
1. 더 이상 사용 안 되는 spinner keyframes 모두 검색·삭제 (`grep -r "@keyframes.*spin"`).
2. 더 이상 사용 안 되는 SVG 헬퍼 함수(`SpinnerIcon`, `ValidIcon` 등) 삭제.
3. `Toast`의 `iconColor` palette는 유지 (severity 토큰 추출 시 `_shared/severity.ts`로 이동 — 037 Alert plan 참조).
4. README.md에 Icon 섹션 추가.

---

## 12. 테스팅

본 라이브러리는 자동 테스트 없음. 수동 QA 항목:

### 12.1 단위 동작
- [ ] 등록된 모든 24종 아이콘이 데모 페이지에 정상 렌더
- [ ] 모든 사이즈 토큰(xs/sm/md/lg/xl) 정확한 픽셀
- [ ] 임의 number/string size 적용
- [ ] currentColor가 부모 color 상속
- [ ] rotate 4종(0/90/180/270) 정상
- [ ] flipH/flipV 정상
- [ ] spin 애니메이션 부드러움 (1초 1회전)

### 12.2 a11y
- [ ] label 없으면 `aria-hidden="true"` (DevTools 확인)
- [ ] label 있으면 `role="img"` + `aria-label="..."` (DevTools 확인)
- [ ] VoiceOver로 label 있는 아이콘 → 라벨 읽음
- [ ] VoiceOver로 label 없는 아이콘 → 무시

### 12.3 사용자 등록
- [ ] `registerIcon("foo", <path .../>)` 후 `<Icon name="foo" />` 렌더
- [ ] `unregisterIcon("foo")` 후 `<Icon name="foo" />` → null + 경고
- [ ] `hasIcon("foo")` 정확
- [ ] `getIconNames()` 등록 순서대로 반환

### 12.4 마이그레이션 회귀
각 마이그레이션된 컴포넌트의 데모 페이지에서:
- [ ] 시각이 마이그레이션 전과 동일 (스크린샷 비교 권장)
- [ ] 인터랙션(호버/액티브/포커스/disabled) 정상
- [ ] 다크 테마 정상
- [ ] spinner 회전 속도/방향 동일

### 12.5 SSR (해당 시)
- [ ] Node 환경에서 `Icon` import → 에러 없음
- [ ] SSR 마크업에 spin keyframes 없음 (클라이언트에서 주입)

---

## 13. 향후 확장 (v1.1+)

| 항목 | 설명 |
|---|---|
| `prefers-reduced-motion` 자동 감지 | spin을 자동 off |
| weight variants | `weight?: "thin" \| "regular" \| "bold"` 추가 |
| named icon export | `import { ChevronDownIcon } from "@pihitpihit/plastic/icons"` (tree-shaking 강화, 100+ 아이콘 시) |
| 외부 셋 어댑터 | `import { fromLucide } from "@pihitpihit/plastic/icons/lucide"` 형태 |
| icon catalog 데모 | 사용자가 검색·복사할 수 있는 카탈로그 페이지 |
| animated icons | Lottie 통합 또는 자체 keyframes 시스템 |

---

## 14. 체크리스트 (작업 완료 기준)

- [ ] `src/components/Icon/` 5개 파일 작성 완료
- [ ] 24종 내장 아이콘 모두 시각 확인 완료
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과 (dist에 Icon 포함 확인)
- [ ] `demo/src/pages/IconPage.tsx` 작성 + NAV 등록
- [ ] 17개 컴포넌트 마이그레이션 완료 (§5.1 매핑 표)
- [ ] 모든 spinner keyframes 중복 제거 완료
- [ ] 모든 마이그레이션된 컴포넌트의 데모 페이지 시각 회귀 확인 (light/dark)
- [ ] README.md에 Icon 섹션 추가
- [ ] `docs/candidates.md`에서 17번 항목 제거 + 본 plan 링크로 교체
- [ ] PR 디스크립션에 변경 요약 (신규 추가 + 마이그레이션 양 명시)
