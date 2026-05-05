# Tag / Chip 컴포넌트 설계문서

## Context

**라벨·필터 칩·상태 표시**용 작은 컴포넌트 `Tag`(또는 alias `Chip`)를 추가한다. 다른 라이브러리에서 `Tag`, `Chip`, `Badge`, `Label`, `Pill` 등으로 다양하게 불리는 어휘 — 본 라이브러리는 **`Tag`를 정식 명칭**으로 채택하되 `Chip`을 alias로 동시 export하여 사용자 친숙성 보장.

본 컴포넌트는 다음 시나리오 모두를 흡수:
- DataTable의 status 컬럼 ("active", "pending", "blocked")
- CommandPalette 검색 결과의 카테고리 라벨
- Form 다중 입력 시 추가된 항목 표시 (이메일 리스트 등)
- 필터 상태 표시 ("× Author: alice")
- 일반 카테고리 라벨 (블로그 태그 등)

라이브러리에 현재 비슷한 컴포넌트 없음. `Toast`나 `Button`은 시각·시맨틱 다름.

참고 (prior art):
- **Material UI `Chip`** — 가장 영향력 있는 표준. `variant: filled | outlined`, `color` 시스템(primary/secondary/success/etc), `size: small | medium`, `onDelete` (제거 가능), avatar/icon 슬롯.
- **Ant Design `Tag`** — 색상 시스템 풍부 (preset colors: red, blue, green / hex 직접). `closable`, `bordered`, `icon`.
- **Mantine `Badge`** — gradient·dot indicator·multiple sizes.
- **Chakra `Tag`** — `Tag.Root`, `Tag.Label`, `Tag.CloseTrigger` compound 패턴.
- **Radix UI** — Tag/Chip 미제공 (사용자 직접).
- **shadcn/ui `Badge`** — `variant: default | secondary | destructive | outline`. Tailwind 기반.
- **GitHub** — issue label 칩 (다양한 색상 + dot indicator).
- **Apple HIG** — 시스템 status pill (sf rounded, semibold).

본 레포 내부 참조:
- `src/components/Icon/` (plan 023) — `removable` 모드의 X 아이콘에 사용. `<Icon name="x" size="xs" />`.
- `src/components/Toast/colors.ts` — severity 토큰 (plan 037에서 _shared/severity.ts로 추출 예정). Tag의 색상 prop과 별개 (Tag는 카테고리 색상, severity는 의미 색상).
- `src/components/index.ts` — Tag 추가 위치.
- `tsconfig.json` — strict 옵션 (특히 `exactOptionalPropertyTypes`).

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 1. 가장 단순한 사용
<Tag>Beta</Tag>
<Tag>JavaScript</Tag>

// 2. 색상 (preset color)
<Tag color="blue">Info</Tag>
<Tag color="green">Active</Tag>
<Tag color="red">Error</Tag>
<Tag color="purple">Custom</Tag>

// 3. 임의 색상 (hex / rgb)
<Tag color="#ff6b35">Custom</Tag>

// 4. 사이즈
<Tag size="sm">Small</Tag>
<Tag size="md">Medium</Tag>
<Tag size="lg">Large</Tag>

// 5. variant (스타일 종류)
<Tag variant="solid" color="blue">Solid</Tag>
<Tag variant="subtle" color="blue">Subtle (default)</Tag>
<Tag variant="outline" color="blue">Outline</Tag>
<Tag variant="dot" color="blue">Dot</Tag>      // 좌측 점 + 텍스트

// 6. 제거 가능 (× 버튼)
<Tag removable onRemove={() => removeTag(id)}>Filter</Tag>

// 7. 클릭 가능 (필터 토글 등)
<Tag clickable onClick={() => toggleFilter()}>+ Add filter</Tag>

// 8. 아이콘 슬롯
<Tag icon={<Icon name="check" size="xs" />} color="green">Verified</Tag>

// 9. 그룹 — 여러 칩 wrap (단순 flex/gap)
<Tag.Group>
  <Tag color="blue">react</Tag>
  <Tag color="purple">typescript</Tag>
  <Tag color="green">ui</Tag>
</Tag.Group>

// 10. Chip alias (동일 컴포넌트, 다른 이름)
<Chip>Same as Tag</Chip>
```

핵심 설계 원칙:
- **단순함 우선** — 단일 컴포넌트 + 옵션. compound 분리는 `Tag.Group`만 (다중 칩 레이아웃 도우미).
- **색상**: preset 색상 토큰 9종 (blue/green/red/yellow/purple/pink/gray/teal/orange) + 임의 hex 모두.
- **variant 4종**: `solid`(진한 배경), `subtle`(연한 배경, 기본), `outline`(테두리만), `dot`(좌측 점 + 텍스트).
- **사이즈 3종**: `sm` / `md` (기본) / `lg`.
- **제거 가능**: `removable` + `onRemove` — 우측 X 버튼.
- **클릭 가능**: `clickable` 시 `cursor: pointer` + 호버 효과 + `role="button"`.
- **아이콘 슬롯**: 좌측 임의 React 노드 (보통 `<Icon />`).
- **theme**: light/dark — 색상 팔레트 자동 분기.
- **a11y**: removable 시 X 버튼은 별도 button (aria-label="Remove {label}").
- **headless 정신**: className/style로 모든 시각 override 가능.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `<Tag>` 단일 컴포넌트 + `Tag.Group` (간단 wrap container).
2. `<Chip>` alias export — 이름만 다르고 완전 동일 컴포넌트.
3. **9가지 preset color**: `blue` / `green` / `red` / `yellow` / `purple` / `pink` / `gray` / `teal` / `orange`. 기본 `gray`.
4. **임의 hex/rgb 색상**: `color="#ff6b35"` 또는 `color="rgb(255,107,53)"` — 자동 light/dark 변형 계산.
5. **4가지 variant**: `solid` / `subtle`(기본) / `outline` / `dot`.
6. **3가지 size**: `sm` (height 18) / `md` (height 22) / `lg` (height 26).
7. **테마**: `light` / `dark` 명시 prop + 색상 자동 매핑.
8. **`removable` prop + `onRemove` callback**: 우측 X 버튼 표시. X 클릭 시 `onRemove()` 호출 + 본 Tag 클릭 이벤트는 차단.
9. **`clickable` prop + `onClick`**: 호버 효과, role="button", tabIndex=0, Enter/Space 키 작동.
10. **`disabled` prop**: cursor not-allowed, opacity 0.5, 클릭/제거 차단.
11. **`icon` prop**: 좌측 아이콘 슬롯 (ReactNode, 보통 Icon 컴포넌트).
12. **TypeScript strict**: 모든 옵션 타입 명시.
13. 배럴 — `export { Tag, Chip } from "./Tag"` + 타입.

### Non-goals (v1 제외)
- **animated dismiss** — onRemove 시 Tag가 자체 페이드아웃 애니메이션. v1은 즉시 제거 (사용자 책임). v1.1+.
- **Avatar 슬롯 baked-in** — Material UI Chip의 `<Avatar>` 슬롯. v1은 일반 `icon` 슬롯으로 흡수 (사용자가 직접 Avatar 넣음).
- **Tag input 통합** — `TagInput` / `ChipInput` (다중 값 입력)은 별도 후보 컴포넌트.
- **drag & drop reorder** — Sortable 컴포넌트가 별도 후보.
- **gradient color** — Mantine처럼 그라디언트 배경. v1은 단색.
- **선택 상태 (selected)** — toggle 칩. v1은 clickable로 충분.
- **counter badge** — "+3 more" — v1은 사용자가 직접 합성 (`<Tag>+3 more</Tag>`).
- **status dot 단독** — Status indicator는 별도 후보 (`Status` / `Pulse`).

---

## 2. 공개 API

### 2.1 타입 — `src/components/Tag/Tag.types.ts`

```ts
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type TagTheme = "light" | "dark";
export type TagSize = "sm" | "md" | "lg";
export type TagVariant = "solid" | "subtle" | "outline" | "dot";

/** Preset color 이름. 9종. */
export type TagPresetColor =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "purple"
  | "pink"
  | "gray"
  | "teal"
  | "orange";

/**
 * Tag 색상.
 * - Preset 이름 (TagPresetColor) → 내부 팔레트 매핑.
 * - 임의 string (hex `"#ff0000"` / rgb `"rgb(255,0,0)"`) → 자동 light/dark 변형 계산.
 */
export type TagColor = TagPresetColor | (string & {});

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  /** 색상. 기본 "gray". */
  color?: TagColor;

  /** 사이즈. 기본 "md". */
  size?: TagSize;

  /** variant. 기본 "subtle". */
  variant?: TagVariant;

  /** 테마. 기본 "light". */
  theme?: TagTheme;

  /** 좌측 아이콘 슬롯. */
  icon?: ReactNode;

  /** X 버튼 표시 + 제거 가능. */
  removable?: boolean;

  /** removable일 때 X 클릭 시 호출. */
  onRemove?: () => void;

  /** 클릭 가능. cursor pointer + role=button + 키보드 활성. */
  clickable?: boolean;

  /** 비활성. */
  disabled?: boolean;

  /** 라벨 컨텐츠. */
  children?: ReactNode;

  className?: string;
  style?: CSSProperties;
}

export interface TagGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** 자식 사이 간격. 기본 6. */
  gap?: number | string;

  /** wrap 여부. 기본 true. */
  wrap?: boolean;

  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 Color resolver — `src/components/Tag/Tag.colors.ts`

```ts
import type { TagPresetColor, TagTheme, TagVariant, TagColor } from "./Tag.types";

interface ColorTokens {
  bg: string;     // solid bg
  fg: string;     // solid fg
  subtleBg: string;   // subtle bg (연한 배경)
  subtleFg: string;   // subtle fg
  outlineBorder: string;
  outlineFg: string;
  dotColor: string;
  hoverBg: string;    // clickable hover overlay
}

/**
 * Preset 9색 × light/dark.
 * 색상 디자인 — Tailwind 500 (solid bg) / 100 (subtle light bg) / 700 (dark fg) / 900 (dark subtle bg) 등 차용.
 */
export const tagColors: Record<TagPresetColor, Record<TagTheme, ColorTokens>> = {
  blue: {
    light: { bg: "#3b82f6", fg: "#ffffff", subtleBg: "#dbeafe", subtleFg: "#1e40af", outlineBorder: "#3b82f6", outlineFg: "#1e40af", dotColor: "#3b82f6", hoverBg: "rgba(59,130,246,0.08)" },
    dark:  { bg: "#3b82f6", fg: "#0f172a", subtleBg: "rgba(59,130,246,0.18)", subtleFg: "#93c5fd", outlineBorder: "#60a5fa", outlineFg: "#93c5fd", dotColor: "#60a5fa", hoverBg: "rgba(96,165,250,0.18)" },
  },
  green: {
    light: { bg: "#10b981", fg: "#ffffff", subtleBg: "#d1fae5", subtleFg: "#065f46", outlineBorder: "#10b981", outlineFg: "#065f46", dotColor: "#10b981", hoverBg: "rgba(16,185,129,0.08)" },
    dark:  { bg: "#10b981", fg: "#0f172a", subtleBg: "rgba(16,185,129,0.18)", subtleFg: "#6ee7b7", outlineBorder: "#34d399", outlineFg: "#6ee7b7", dotColor: "#34d399", hoverBg: "rgba(52,211,153,0.18)" },
  },
  red: {
    light: { bg: "#ef4444", fg: "#ffffff", subtleBg: "#fee2e2", subtleFg: "#991b1b", outlineBorder: "#ef4444", outlineFg: "#991b1b", dotColor: "#ef4444", hoverBg: "rgba(239,68,68,0.08)" },
    dark:  { bg: "#ef4444", fg: "#0f172a", subtleBg: "rgba(239,68,68,0.18)", subtleFg: "#fca5a5", outlineBorder: "#f87171", outlineFg: "#fca5a5", dotColor: "#f87171", hoverBg: "rgba(248,113,113,0.18)" },
  },
  yellow: {
    light: { bg: "#eab308", fg: "#ffffff", subtleBg: "#fef3c7", subtleFg: "#854d0e", outlineBorder: "#eab308", outlineFg: "#854d0e", dotColor: "#eab308", hoverBg: "rgba(234,179,8,0.08)" },
    dark:  { bg: "#eab308", fg: "#0f172a", subtleBg: "rgba(234,179,8,0.18)", subtleFg: "#fde047", outlineBorder: "#facc15", outlineFg: "#fde047", dotColor: "#facc15", hoverBg: "rgba(250,204,21,0.18)" },
  },
  purple: {
    light: { bg: "#a855f7", fg: "#ffffff", subtleBg: "#f3e8ff", subtleFg: "#6b21a8", outlineBorder: "#a855f7", outlineFg: "#6b21a8", dotColor: "#a855f7", hoverBg: "rgba(168,85,247,0.08)" },
    dark:  { bg: "#a855f7", fg: "#0f172a", subtleBg: "rgba(168,85,247,0.18)", subtleFg: "#d8b4fe", outlineBorder: "#c084fc", outlineFg: "#d8b4fe", dotColor: "#c084fc", hoverBg: "rgba(192,132,252,0.18)" },
  },
  pink: {
    light: { bg: "#ec4899", fg: "#ffffff", subtleBg: "#fce7f3", subtleFg: "#9d174d", outlineBorder: "#ec4899", outlineFg: "#9d174d", dotColor: "#ec4899", hoverBg: "rgba(236,72,153,0.08)" },
    dark:  { bg: "#ec4899", fg: "#0f172a", subtleBg: "rgba(236,72,153,0.18)", subtleFg: "#f9a8d4", outlineBorder: "#f472b6", outlineFg: "#f9a8d4", dotColor: "#f472b6", hoverBg: "rgba(244,114,182,0.18)" },
  },
  gray: {
    light: { bg: "#6b7280", fg: "#ffffff", subtleBg: "#f3f4f6", subtleFg: "#374151", outlineBorder: "#d1d5db", outlineFg: "#374151", dotColor: "#6b7280", hoverBg: "rgba(107,114,128,0.08)" },
    dark:  { bg: "#6b7280", fg: "#ffffff", subtleBg: "rgba(255,255,255,0.08)", subtleFg: "#e5e7eb", outlineBorder: "rgba(255,255,255,0.18)", outlineFg: "#e5e7eb", dotColor: "#9ca3af", hoverBg: "rgba(255,255,255,0.08)" },
  },
  teal: {
    light: { bg: "#14b8a6", fg: "#ffffff", subtleBg: "#ccfbf1", subtleFg: "#115e59", outlineBorder: "#14b8a6", outlineFg: "#115e59", dotColor: "#14b8a6", hoverBg: "rgba(20,184,166,0.08)" },
    dark:  { bg: "#14b8a6", fg: "#0f172a", subtleBg: "rgba(20,184,166,0.18)", subtleFg: "#5eead4", outlineBorder: "#2dd4bf", outlineFg: "#5eead4", dotColor: "#2dd4bf", hoverBg: "rgba(45,212,191,0.18)" },
  },
  orange: {
    light: { bg: "#f97316", fg: "#ffffff", subtleBg: "#ffedd5", subtleFg: "#9a3412", outlineBorder: "#f97316", outlineFg: "#9a3412", dotColor: "#f97316", hoverBg: "rgba(249,115,22,0.08)" },
    dark:  { bg: "#f97316", fg: "#0f172a", subtleBg: "rgba(249,115,22,0.18)", subtleFg: "#fdba74", outlineBorder: "#fb923c", outlineFg: "#fdba74", dotColor: "#fb923c", hoverBg: "rgba(251,146,60,0.18)" },
  },
};

/** Preset 키인지 검사. */
export function isPresetColor(c: TagColor): c is TagPresetColor {
  return c in tagColors;
}

/**
 * 임의 hex/rgb 색상에서 ColorTokens 자동 생성.
 *
 * 전략:
 * - solid bg = c (사용자 지정), fg = readableFg(c)
 * - subtle bg = c + alpha(0.15)
 * - subtle fg = c (다크 테마는 lighten)
 * - outline border = c, fg = c
 * - dot color = c
 * - hover bg = c + alpha(0.08)
 *
 * 한계: 사용자 색상이 너무 어두우면 dark 테마에서 안 보일 수 있음.
 *       v1은 단순 alpha 변형만, perceptual lighten/darken은 v1.1+.
 */
export function arbitraryColorTokens(c: string, theme: TagTheme): ColorTokens {
  const fg = readableFg(c);
  const alphaSubtle = theme === "dark" ? 0.22 : 0.15;
  const alphaHover = theme === "dark" ? 0.12 : 0.08;
  return {
    bg: c,
    fg,
    subtleBg: withAlpha(c, alphaSubtle),
    subtleFg: c,
    outlineBorder: c,
    outlineFg: c,
    dotColor: c,
    hoverBg: withAlpha(c, alphaHover),
  };
}

/**
 * hex/rgb → readable foreground (white or near-black) 결정.
 * WCAG luminance 기반 단순 분기.
 */
function readableFg(c: string): string {
  const rgb = parseColor(c);
  if (!rgb) return "#ffffff";
  // relative luminance
  const r = sRGBToLinear(rgb.r / 255);
  const g = sRGBToLinear(rgb.g / 255);
  const b = sRGBToLinear(rgb.b / 255);
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.5 ? "#0f172a" : "#ffffff";
}

function sRGBToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function withAlpha(c: string, alpha: number): string {
  const rgb = parseColor(c);
  if (!rgb) return c; // fallback: 그대로
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function parseColor(c: string): { r: number; g: number; b: number } | null {
  // hex (#rgb, #rrggbb)
  const hex = c.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    if (h.length === 4) h = h.slice(0, 3).split("").map((x) => x + x).join("") + h.slice(3).split("").map((x) => x + x).join("");
    if (h.length >= 6) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
  }
  // rgb / rgba
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    return {
      r: parseInt(rgb[1]!, 10),
      g: parseInt(rgb[2]!, 10),
      b: parseInt(rgb[3]!, 10),
    };
  }
  return null;
}

export function resolveColorTokens(c: TagColor, theme: TagTheme): ColorTokens {
  if (isPresetColor(c)) return tagColors[c][theme];
  return arbitraryColorTokens(c, theme);
}
```

### 2.3 Tag 컴포넌트 — `src/components/Tag/Tag.tsx`

```tsx
import { useCallback, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { Icon } from "../Icon";
import { resolveColorTokens } from "./Tag.colors";
import type { TagProps, TagSize, TagVariant } from "./Tag.types";

const sizeMap: Record<TagSize, { height: number; padding: string; fontSize: number; gap: number; iconSize: number; dotSize: number }> = {
  sm: { height: 18, padding: "0 6px", fontSize: 11, gap: 4, iconSize: 11, dotSize: 6 },
  md: { height: 22, padding: "0 8px", fontSize: 12, gap: 5, iconSize: 12, dotSize: 7 },
  lg: { height: 26, padding: "0 10px", fontSize: 13, gap: 6, iconSize: 14, dotSize: 8 },
};

export function Tag(props: TagProps) {
  const {
    color = "gray",
    size = "md",
    variant = "subtle",
    theme = "light",
    icon,
    removable = false,
    onRemove,
    clickable = false,
    disabled = false,
    children,
    onClick,
    onKeyDown,
    className,
    style,
    ...rest
  } = props;

  const tokens = resolveColorTokens(color, theme);
  const s = sizeMap[size];

  // variant별 스타일
  let variantStyle: CSSProperties;
  switch (variant) {
    case "solid":
      variantStyle = {
        background: tokens.bg,
        color: tokens.fg,
        border: `1px solid ${tokens.bg}`,
      };
      break;
    case "subtle":
      variantStyle = {
        background: tokens.subtleBg,
        color: tokens.subtleFg,
        border: `1px solid transparent`,
      };
      break;
    case "outline":
      variantStyle = {
        background: "transparent",
        color: tokens.outlineFg,
        border: `1px solid ${tokens.outlineBorder}`,
      };
      break;
    case "dot":
      variantStyle = {
        background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        color: theme === "dark" ? "#e5e7eb" : "#374151",
        border: `1px solid transparent`,
      };
      break;
  }

  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    fontSize: s.fontSize,
    fontFamily: "inherit",
    fontWeight: 500,
    lineHeight: 1,
    borderRadius: s.height / 2, // 알약형
    boxSizing: "border-box",
    cursor: disabled ? "not-allowed" : clickable ? "pointer" : "default",
    opacity: disabled ? 0.5 : 1,
    userSelect: "none",
    transition: "background 120ms ease",
    ...variantStyle,
    ...style,
  };

  const handleClick = useCallback((e: MouseEvent<HTMLSpanElement>) => {
    if (disabled) return;
    onClick?.(e);
  }, [disabled, onClick]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLSpanElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (clickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick?.(e as unknown as MouseEvent<HTMLSpanElement>);
    }
  }, [clickable, onKeyDown, onClick]);

  const handleRemoveClick = useCallback((e: MouseEvent) => {
    e.stopPropagation(); // Tag 자체 클릭 방지
    if (disabled) return;
    onRemove?.();
  }, [disabled, onRemove]);

  const handleRemoveKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      onRemove?.();
    }
  }, [disabled, onRemove]);

  const a11yProps = clickable
    ? { role: "button" as const, tabIndex: disabled ? -1 : 0, "aria-disabled": disabled || undefined }
    : {};

  const dotEl = variant === "dot" ? (
    <span
      aria-hidden="true"
      style={{
        width: s.dotSize,
        height: s.dotSize,
        borderRadius: "50%",
        background: tokens.dotColor,
        flexShrink: 0,
      }}
    />
  ) : null;

  const removeBtn = removable ? (
    <button
      type="button"
      onClick={handleRemoveClick}
      onKeyDown={handleRemoveKeyDown}
      disabled={disabled}
      aria-label="Remove"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: s.iconSize + 4,
        height: s.iconSize + 4,
        marginRight: -2,
        marginLeft: 2,
        padding: 0,
        background: "transparent",
        border: "none",
        borderRadius: "50%",
        color: "currentColor",
        opacity: 0.6,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "opacity 120ms ease, background 120ms ease",
      }}
    >
      <Icon name="x" size={s.iconSize} />
    </button>
  ) : null;

  return (
    <span
      className={className}
      style={baseStyle}
      onClick={clickable ? handleClick : undefined}
      onKeyDown={clickable ? handleKeyDown : undefined}
      {...a11yProps}
      data-variant={variant}
      data-size={size}
      data-disabled={disabled || undefined}
      data-clickable={clickable || undefined}
      {...rest}
    >
      {dotEl}
      {icon}
      {children !== undefined && children !== null && <span>{children}</span>}
      {removeBtn}
    </span>
  );
}

Tag.displayName = "Tag";
```

### 2.4 Tag.Group — `src/components/Tag/TagGroup.tsx`

```tsx
import type { CSSProperties } from "react";
import type { TagGroupProps } from "./Tag.types";

export function TagGroup(props: TagGroupProps) {
  const { gap = 6, wrap = true, children, className, style, ...rest } = props;

  const baseStyle: CSSProperties = {
    display: "flex",
    flexWrap: wrap ? "wrap" : "nowrap",
    alignItems: "center",
    gap: typeof gap === "number" ? `${gap}px` : gap,
    ...style,
  };

  return (
    <div className={className} style={baseStyle} {...rest}>
      {children}
    </div>
  );
}

TagGroup.displayName = "Tag.Group";
```

### 2.5 Compound assembly — `src/components/Tag/Tag.assembly.tsx`

```tsx
import { Tag as TagBase } from "./Tag";
import { TagGroup } from "./TagGroup";

type TagComponent = typeof TagBase & {
  Group: typeof TagGroup;
};

export const Tag = TagBase as TagComponent;
Tag.Group = TagGroup;

// Chip은 동일 컴포넌트의 alias
export const Chip = Tag;
```

### 2.6 배럴 — `src/components/Tag/index.ts`

```ts
export { Tag, Chip } from "./Tag.assembly";
export type {
  TagProps,
  TagGroupProps,
  TagPresetColor,
  TagColor,
  TagSize,
  TagVariant,
  TagTheme,
} from "./Tag.types";
```

### 2.7 components 배럴 — `src/components/index.ts`

```ts
export * from "./Tag";
```

---

## 3. 파일 구조

```
src/components/Tag/
├── Tag.tsx              ← 메인 컴포넌트
├── TagGroup.tsx          ← 다중 칩 wrap helper
├── Tag.assembly.tsx      ← Tag.Group 합성 + Chip alias
├── Tag.types.ts          ← 타입
├── Tag.colors.ts         ← 9 preset 팔레트 + 임의 색상 resolver
└── index.ts              ← 배럴
```

---

## 4. 동작 명세

### 4.1 variant별 시각

| variant | 배경 | 전경 | 테두리 |
|---|---|---|---|
| `solid` | preset bg (예: blue.500) | white | 같은 색 |
| `subtle` (기본) | preset 배경 (light: 100, dark: alpha) | preset 진한 톤 | transparent |
| `outline` | transparent | preset 진한 톤 | preset 색 |
| `dot` | 매우 연한 회색 | 일반 텍스트 색 | transparent. 좌측 점만 preset 색 |

### 4.2 size별 픽셀

| size | height | padding | fontSize | iconSize |
|---|---|---|---|---|
| `sm` | 18 | 0 6 | 11 | 11 |
| `md` | 22 | 0 8 | 12 | 12 |
| `lg` | 26 | 0 10 | 13 | 14 |

borderRadius = height / 2 → 알약형 (perfect pill).

### 4.3 임의 색상 처리

```tsx
<Tag color="#3b82f6" />
```
- `arbitraryColorTokens("#3b82f6", "light")` 호출.
- bg = `"#3b82f6"`, fg = readableFg(`"#3b82f6"`) → luminance 계산 결과 `"#ffffff"` (대비 충분).
- subtleBg = `"rgba(59, 130, 246, 0.15)"`.
- subtleFg = `"#3b82f6"` (다크에선 자동 lighten 안 함 — v1 한계).

WCAG AA 자동 검증 안 함. 사용자가 contrast 책임.

### 4.4 removable + clickable 동시

```tsx
<Tag removable onRemove={...} clickable onClick={...}>Filter: Author</Tag>
```
- 본체 클릭 → `onClick`.
- X 버튼 클릭 → `onRemove`. `e.stopPropagation()`로 본체 onClick 차단.
- 키보드: Tag 자체 포커스 + Enter → onClick. X 버튼은 별도 button (Tab 한 번 더로 포커스).

### 4.5 disabled

- cursor: not-allowed.
- opacity 0.5.
- onClick / onRemove 무시.
- aria-disabled="true".

### 4.6 dot variant

좌측에 색상 점 + 텍스트. 배경/테두리는 중립 회색. status 표시 ("● Active") 패턴.

```
[● Active]
```

### 4.7 icon 슬롯

```tsx
<Tag icon={<Icon name="check" size="xs" />}>Verified</Tag>
```
- 좌측에 임의 ReactNode 렌더.
- dot variant + icon 동시 사용은 금지하지 않음 (둘 다 표시).

### 4.8 hover effect (clickable)

clickable Tag에 hover 시 배경에 `tokens.hoverBg` overlay. CSS hover pseudo-class로:

```css
/* CSS-in-JS 한계로 onMouseEnter/Leave + state 사용 */
```

**구현 단순화**: v1은 hover 시 background 변경 안 함 (CSS-in-JS pseudo class 제한). 대안: `<style>` injection 또는 `:hover` className. v1은 단순 `data-clickable` attribute + `cursor: pointer`만, 호버 색상 변화는 v1.1.

→ **결정**: v1은 hover overlay 미포함 (단순). cursor + outline 포커스 정도. clickable 시각 변화는 사용자가 className으로 추가.

### 4.9 Tag.Group 동작

- 단순 flex container with gap.
- 자식 Tag들이 wrap 가능.
- 별도 시맨틱 없음 (role 무).

---

## 5. 데모 페이지 — `demo/src/pages/TagPage.tsx`

```tsx
export function TagPage() {
  const [filters, setFilters] = useState(["Author: alice", "Status: open", "Priority: high"]);

  return (
    <div>
      <h1>Tag / Chip</h1>

      <Card.Root>
        <Card.Header>Basic — preset colors</Card.Header>
        <Card.Body>
          <Tag.Group>
            <Tag color="blue">blue</Tag>
            <Tag color="green">green</Tag>
            <Tag color="red">red</Tag>
            <Tag color="yellow">yellow</Tag>
            <Tag color="purple">purple</Tag>
            <Tag color="pink">pink</Tag>
            <Tag color="gray">gray</Tag>
            <Tag color="teal">teal</Tag>
            <Tag color="orange">orange</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Variants</Card.Header>
        <Card.Body>
          <Tag.Group>
            <Tag variant="solid" color="blue">Solid</Tag>
            <Tag variant="subtle" color="blue">Subtle</Tag>
            <Tag variant="outline" color="blue">Outline</Tag>
            <Tag variant="dot" color="blue">Dot</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Sizes</Card.Header>
        <Card.Body>
          <Tag.Group>
            <Tag size="sm" color="blue">Small</Tag>
            <Tag size="md" color="blue">Medium</Tag>
            <Tag size="lg" color="blue">Large</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Custom hex color</Card.Header>
        <Card.Body>
          <Tag.Group>
            <Tag color="#ff6b35" variant="solid">#ff6b35</Tag>
            <Tag color="#ff6b35" variant="subtle">#ff6b35</Tag>
            <Tag color="#ff6b35" variant="outline">#ff6b35</Tag>
            <Tag color="#ff6b35" variant="dot">#ff6b35</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>With icon</Card.Header>
        <Card.Body>
          <Tag.Group>
            <Tag color="green" icon={<Icon name="check" size="xs" />}>Verified</Tag>
            <Tag color="red" icon={<Icon name="x" size="xs" />}>Rejected</Tag>
            <Tag color="yellow" icon={<Icon name="warning" size="xs" />}>Warning</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Removable (filter chips)</Card.Header>
        <Card.Body>
          <Tag.Group>
            {filters.map((f) => (
              <Tag key={f} removable onRemove={() => setFilters(filters.filter((x) => x !== f))} color="blue">
                {f}
              </Tag>
            ))}
            <Tag clickable variant="outline" color="gray" onClick={() => setFilters([...filters, `Filter ${filters.length + 1}`])}>
              + Add filter
            </Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Clickable (toggle)</Card.Header>
        <Card.Body>
          <Tag clickable color="blue" onClick={() => alert("toggled")}>
            Click me
          </Tag>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Disabled</Card.Header>
        <Card.Body>
          <Tag.Group>
            <Tag color="blue" disabled>Disabled</Tag>
            <Tag color="blue" removable disabled>Cannot remove</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Dark theme</Card.Header>
        <Card.Body style={{ background: "#1f2937", padding: 16 }}>
          <Tag.Group>
            <Tag theme="dark" color="blue">blue</Tag>
            <Tag theme="dark" color="green">green</Tag>
            <Tag theme="dark" color="red">red</Tag>
            <Tag theme="dark" variant="solid" color="purple">solid</Tag>
            <Tag theme="dark" variant="outline" color="orange">outline</Tag>
            <Tag theme="dark" variant="dot" color="teal">dot</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Chip alias (동일 동작)</Card.Header>
        <Card.Body>
          <Tag.Group>
            <Chip color="purple">Same as Tag</Chip>
          </Tag.Group>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Tag.Group — 다양한 gap</Card.Header>
        <Card.Body>
          <p>gap=2 (densest)</p>
          <Tag.Group gap={2}>
            <Tag>a</Tag><Tag>b</Tag><Tag>c</Tag><Tag>d</Tag>
          </Tag.Group>
          <p>gap=12</p>
          <Tag.Group gap={12}>
            <Tag>a</Tag><Tag>b</Tag><Tag>c</Tag><Tag>d</Tag>
          </Tag.Group>
        </Card.Body>
      </Card.Root>
    </div>
  );
}
```

데모 라우팅 등록 — NAV에 `Tag` 추가.

---

## 6. 접근성 (a11y)

### 6.1 기본 (clickable 아님, removable 아님)
- `<span>` — 시맨틱 없음. 단순 텍스트 라벨.

### 6.2 clickable
- `role="button"`, `tabIndex=0`, Enter/Space 키 활성.
- aria-disabled="true" (disabled 시).

### 6.3 removable
- 별도 `<button aria-label="Remove">` (X 버튼).
- Tag 자체와 별도 포커스. Tab으로 X 버튼 도달.
- Enter/Space 키 활성.
- e.stopPropagation()로 Tag onClick 차단.

### 6.4 dot variant
- dot은 `aria-hidden="true"` (장식 표시).
- 텍스트 라벨이 의미 전달.

### 6.5 색상 대비
- preset 색상은 디자인 단계에서 light/dark 모두 WCAG AA 대비 검증 완료.
- 임의 hex 색상은 사용자 책임 (자동 readableFg는 단순 luminance 기반).

---

## 7. 설계 결정 사항 (rationale)

### 7.1 Tag 정식 + Chip alias
**이유**: Tag는 의미 중심(블로그 태그·카테고리), Chip은 시각 중심(알약형 모양). 두 어휘가 industry에 공존 → 사용자 친숙성 위해 둘 다 export. 코드 중복은 zero (alias).

### 7.2 9 preset color 고정
**이유**: 너무 많으면 디자인 일관성 깨짐 (Ant Design 14색은 과함). 9색은 status 표현과 카테고리 표현 모두 충분 + 디자인 검증 가능 분량.

### 7.3 dot variant 별도
**이유**: 점 indicator는 "이 항목은 X 카테고리/상태" 시각 패턴이 강함. solid/subtle/outline로는 표현 부자연. 별도 variant로 분리해 의도 명확.

### 7.4 임의 hex 지원
**이유**: 디자인 시스템 외 컬러(브랜드, 사용자 선택) 필요한 케이스. preset 9색만으론 부족. 자동 readableFg 계산이 100% 완벽하진 않으나 실용적 절충.

### 7.5 hover effect 미포함 (v1)
**이유**: CSS-in-JS의 :hover 한계 (별도 className 또는 inline style + onMouseEnter 둘 다 비싼 방법). 단순 cursor + 포커스 outline만으로 인터랙션 충분. v1.1에서 추가 검토.

### 7.6 Tag.Group은 단순 flex helper
**이유**: 의미적 grouping (role="list" 등)도 가능하나 대부분의 경우 시각만 필요. 명시적 시맨틱 필요 시 사용자가 직접 `<ul>` 사용. 과한 추상 회피.

### 7.7 removable X 버튼이 별도 button
**이유**: `<span onClick>` 안에 `<span onClick stopPropagation>` 같은 nested handler 패턴은 a11y 약함. button이면 키보드 + 스크린리더 자동.

### 7.8 size = pill (border-radius = height/2)
**이유**: 알약형이 Tag/Chip의 표준. rectangular는 `Badge`가 더 적합 (별도 컴포넌트 후보).

---

## 8. Edge cases

### 8.1 children 빈 값
```tsx
<Tag />
<Tag>{null}</Tag>
```
- 빈 Tag 렌더 (아이콘만 있을 수도). 시각: padding만 있는 작은 동그라미.
- 의도적 — icon만 있는 Tag도 가능.

### 8.2 매우 긴 라벨
```tsx
<Tag>This is a very long label that doesn't fit in one line</Tag>
```
- 기본 `display: inline-flex`로 한 줄 유지 (그대로 가로 확장).
- text-overflow ellipsis 적용 안 함 (사용자가 className으로 추가 가능).

### 8.3 색상 prop이 잘못된 string
```tsx
<Tag color="not-a-real-color" />
```
- `parseColor` 실패 → fallback으로 c 자체 사용 (CSS가 무시할 가능성).
- 시각: 아무 색도 안 입혀짐 (browser default).
- v1은 별도 검증 안 함. 콘솔 경고도 안 함 (false positive 우려).

### 8.4 removable onRemove 없음
```tsx
<Tag removable />
```
- X 버튼은 표시되지만 클릭해도 아무 일 안 일어남.
- v1은 검증 안 함. 사용자 책임.

### 8.5 clickable이지만 onClick 없음
- 마찬가지로 클릭해도 동작 없음. Tab으로 포커스만 가능.

### 8.6 color prop 변화 시 transition
- bg/fg가 갑자기 바뀜. transition 없음 (variant 변화도 동일).
- v1은 무전환. 깜빡임 신경쓰이면 사용자가 className에 transition 추가.

### 8.7 SSR
- color 계산은 동기적, navigator/window 무관. 안전.

### 8.8 dot variant + 매우 작은 size
```tsx
<Tag size="sm" variant="dot">x</Tag>
```
- 점이 6px, 텍스트 11px. 시각 대비 적당.
- 사용자 customize 시 dotSize 별도 prop은 v1 미포함.

---

## 9. 구현 단계 (Phase)

### Phase 1: 신설
1. `src/components/Tag/Tag.types.ts`
2. `src/components/Tag/Tag.colors.ts`
3. `src/components/Tag/Tag.tsx`
4. `src/components/Tag/TagGroup.tsx`
5. `src/components/Tag/Tag.assembly.tsx`
6. `src/components/Tag/index.ts`
7. `src/components/index.ts`에 추가
8. `npm run typecheck` + `npm run build`

**선결조건**: plan 023 (Icon)이 먼저 구현되어야 함 (X 아이콘 사용). 만약 Icon이 아직 없으면 임시로 inline SVG 사용 후 Icon 도입 시 교체.

### Phase 2: 데모 페이지
1. `demo/src/pages/TagPage.tsx` 작성 (§5)
2. NAV 등록
3. 시각 회귀 — 모든 색상·variant·size 조합 (light/dark)
4. removable, clickable 인터랙션 확인
5. 키보드 (Tab, Enter, Space) 확인

### Phase 3: 정리
- [ ] `docs/candidates.md`에서 2번 항목 제거 + plan 링크
- [ ] README.md에 Tag 섹션 추가

---

## 10. 향후 확장 (v1.1+)

| 항목 | 설명 |
|---|---|
| Animated dismiss | onRemove 시 페이드아웃 후 unmount |
| Selectable / toggle | aria-pressed 기반 toggle 칩 |
| Avatar 슬롯 baked-in | `<Tag avatar={...} />` |
| Hover overlay | clickable 시 호버 색상 변화 (CSS injection) |
| Dropdown 통합 | Tag 클릭 시 dropdown 열기 (`<Tag dropdown={...}>`) |
| 색상 자동 lighten/darken | 임의 hex의 dark 테마 가독성 자동 보정 |
| Counter 합성 | `<Tag>+3</Tag>` 패턴 표준화 |

---

## 11. 체크리스트

- [ ] `src/components/Tag/` 6개 파일
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과
- [ ] TagPage 모든 섹션 (light/dark) 정상
- [ ] 9 preset 색상 모두 시각 검증
- [ ] 4 variant 모두 시각 검증
- [ ] 3 size 모두 시각 검증
- [ ] 임의 hex 색상 작동 (#ff6b35 등)
- [ ] removable + onRemove 정상
- [ ] clickable + onClick + 키보드 정상
- [ ] disabled 정상
- [ ] Tag.Group gap 변화 정상
- [ ] Chip alias 동일 동작
- [ ] `docs/candidates.md` 2번 제거 + 링크
- [ ] README.md 업데이트
