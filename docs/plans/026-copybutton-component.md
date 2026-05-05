# CopyButton + useCopyToClipboard 설계문서

## Context

라이브러리에 **클립보드 복사 + idle/copied 피드백 상태**를 표준화한 두 자산을 도입한다:

1. **`useCopyToClipboard`** (`src/components/_shared/useCopyToClipboard.ts`) — 클립보드 쓰기 + idle/copied 상태 관리 + 자동 리셋 타이머를 캡슐화한 React 훅. 단독으로 export하여 사용자가 자체 UI를 만들 수 있게 함.
2. **`CopyButton`** (`src/components/CopyButton/`) — 위 훅을 사용하는 일반 UI 버튼 컴포넌트. 기본 텍스트("Copy" → "Copied!"), 아이콘, 사이즈, 테마 등 표준화.

본 작업은 **신규 자산 추가 + 기존 컴포넌트 마이그레이션**의 두 측면을 가진다.

**현재 상태**:
- `HexView`에 자체 copy 구현이 존재 (`src/components/HexView/HexView.tsx` line 312-325, `doCopy` 함수). 동일 패턴(navigator.clipboard.writeText + 1500ms idle 복귀)이지만 컴포넌트 내부에 잠겨 있음.
- `CodeView`에는 copy 버튼 자체는 있으나(line 426-450), 같은 idle/copied 상태 패턴을 자체 구현하고 있음(`copyState` state).
- `PathInput`, `KeyValueList`(향후 후보), `Field`(향후 후보) 등 다른 컴포넌트는 copy 패턴이 아직 없으나 추가될 가능성 높음.

**B방향 마이그레이션 (사용자 결정)**: 신규 사용처는 `<CopyButton />`을 직접 사용하고, 기존 컴포넌트(HexView, CodeView)도 자체 `doCopy`/`copyState` 로직을 `useCopyToClipboard` 훅으로 교체한다. 외부 UI는 유지(HexView의 포맷 토글, CodeView의 우상단 버튼)하되 클립보드 쓰기·상태 관리만 공유 훅에 위임. 이로써 향후 클립보드 정책 변경(권한 실패 fallback, secure context 처리, 알림 톤 등)을 한 곳에서 관리.

참고 (prior art):
- **react-copy-to-clipboard** — 가장 잘 알려진 라이브러리. `<CopyToClipboard text={...} onCopy={...}><button>...</button></CopyToClipboard>` 패턴. 단점: render prop 아닌 wrapper, 자식 클릭 가로채기.
- **@uiw/react-copy-to-clipboard** — 동일 패턴 + ref 지원.
- **copy-to-clipboard** (npm) — 함수형, IE 11+ 호환을 위해 `document.execCommand("copy")` 폴백 포함.
- **navigator.clipboard.writeText** — 모던 표준. HTTPS / localhost / file:// 같은 secure context 필요. 권한 실패 시 reject Promise.
- **shadcn/ui** — `useCopyToClipboard` 훅 + `<Button>` 합성. 훅이 `[copied, copy]` 반환.
- **Mantine `useClipboard`** — `{copied, copy(value), reset, error}` 객체 반환. timeout default 2000ms.
- **VSCode** — copy 버튼 클릭 시 inline `Copied!` 토스트 (1.5s 정도).

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/HexView/HexView.tsx` (1000+줄) — line 185 (`copyState` state), 312-325 (`doCopy`), 327-335 (`onCopyEvent`, native clipboard event 처리), 350-353 (Cmd+C 핸들러), 753-790 (포맷 토글 UI). **마이그레이션 대상**.
- `src/components/HexView/HexView.utils.ts` — `formatBytes(slice, fmt)` 헬퍼 (유지, copy 로직만 훅으로 이동).
- `src/components/HexView/HexView.types.ts` — `HexViewCopyFormat`, `showCopyButton`, `defaultCopyFormat` props.
- `src/components/CodeView/CodeView.tsx` — line 127 (`copyState` state), line 426-450 (copy 버튼 렌더), copy 핸들러 (`handleCopyAll` 등). **마이그레이션 대상**.
- `src/components/_shared/` — 공유 hooks 위치. `useCopyToClipboard.ts`가 추가될 곳.
- `src/components/Icon/` (plan 023) — CopyButton의 기본 아이콘 슬롯에 `<Icon name="copy" />` 사용.
- `src/components/index.ts` — CopyButton 추가.
- `src/index.ts` — useCopyToClipboard 훅도 export.

---

## 0. TL;DR (한 페이지 요약)

```tsx
// 1. 가장 단순한 사용 — CopyButton에 텍스트만 전달
<CopyButton value="Hello, world!" />
// → 클릭 시 클립보드 복사, 1.5초간 "Copied!" 표시 후 원상태

// 2. 텍스트 동적 결정
<CopyButton value={() => generateLink()} />

// 3. 다양한 사이즈 / variant
<CopyButton value={text} size="sm" variant="ghost" />
<CopyButton value={text} size="md" variant="primary" />

// 4. 라벨 / 아이콘 커스터마이징
<CopyButton value={text} idleLabel="복사" copiedLabel="복사됨!" />
<CopyButton value={text}>
  {({ copied }) => (copied ? "✓" : <Icon name="copy" />)}
</CopyButton>

// 5. 콜백
<CopyButton value={text} onCopy={() => analytics.track("copy")} onError={(err) => ...} />

// 6. 훅 단독 사용 (자체 UI 만들기)
function MyCustomCopy() {
  const { copied, copy, reset, error } = useCopyToClipboard({ resetMs: 2000 });
  return (
    <button onClick={() => copy("hello")}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

// 7. 동기적이지 않을 때 (서버에서 받아온 값 등)
const { copy } = useCopyToClipboard();
const handleClick = async () => {
  const text = await fetchSecret();
  await copy(text);
};
```

핵심 설계 원칙:
- **2-layer**: `useCopyToClipboard` 훅 (로직) + `CopyButton` 컴포넌트 (UI). 사용자는 둘 중 원하는 것 사용.
- **idle/copied 상태 + 자동 리셋**: 기본 1500ms. 사용자가 `resetMs`로 조정 가능.
- **권한·secure context 실패 처리**: `navigator.clipboard` 미지원/거부 시 `error` 상태 노출. fallback으로 `document.execCommand("copy")` 시도.
- **headless / 합성 가능**: `CopyButton`은 children render prop으로 완전 커스터마이징 가능.
- **마이그레이션**: HexView·CodeView가 자체 `copyState` 제거하고 `useCopyToClipboard` 사용. 동작·시각 100% 동일.
- **a11y**: copied 상태 변화 시 `aria-live` 알림. 버튼 자체는 표준 button.
- **theme**: light/dark + variant(`ghost`, `primary`, `subtle`).
- **Icon 의존**: 기본 아이콘은 `<Icon name="copy" />` (plan 023이 선행되어야 깔끔).

---

## 1. Goals / Non-goals

### Goals (v1)

#### `useCopyToClipboard` 훅
1. `copy(text: string): Promise<boolean>` — 복사 시도, 성공 여부 반환.
2. 상태: `copied: boolean`, `error: Error | null`.
3. 자동 리셋: `resetMs` 옵션 (기본 1500). 0 이면 자동 리셋 없음 (수동 `reset()`).
4. `reset(): void` — 수동 idle 복귀.
5. `navigator.clipboard.writeText` 우선, 실패 시 `document.execCommand("copy")` 폴백.
6. cleanup — 컴포넌트 unmount 시 진행 중 timeout 취소.
7. SSR-safe — Node 환경에서 import 가능, `copy()` 호출 시만 navigator 접근.
8. TypeScript strict — 모든 옵션·반환 타입 명시.

#### `CopyButton` 컴포넌트
1. `value: string | (() => string)` — 복사할 텍스트. 함수형은 클릭 시점 호출.
2. `idleLabel?: string` — 기본 "Copy".
3. `copiedLabel?: string` — 기본 "Copied!".
4. `size?: "sm" | "md" | "lg"` — 기본 "md".
5. `variant?: "primary" | "ghost" | "subtle"` — 기본 "ghost".
6. `theme?: "light" | "dark"` — 기본 "light".
7. `showIcon?: boolean` — 기본 true. `<Icon name="copy" />` 또는 `<Icon name="check" />` 표시.
8. `iconPlacement?: "left" | "right"` — 기본 "left".
9. `onCopy?: (text: string) => void`, `onError?: (error: Error) => void` 콜백.
10. `resetMs?: number` — 훅에 전달 (기본 1500).
11. `disabled?: boolean`.
12. children render prop — `({ copied, error, copy }) => ReactNode` 형태로 완전 커스텀 UI 가능.
13. 표준 `ButtonHTMLAttributes` props pass-through (`aria-label`, `data-*` 등).
14. `aria-live="polite"` 알림 영역 (visually-hidden) — copied 상태 알림.
15. **마이그레이션 — HexView**: `doCopy` 로직을 `useCopyToClipboard`로 교체. 외부 UI(포맷 토글)는 유지.
16. **마이그레이션 — CodeView**: `copyState` state + `handleCopyAll` 로직을 훅으로 교체. 외부 우상단 버튼 UI는 유지 (`<CopyButton>` 직접 교체는 v1.1 검토).

### Non-goals (v1 제외)
- **rich content 복사** (HTML/이미지/파일) — 텍스트만. clipboard API의 다중 형식은 v1.1.
- **클립보드 읽기** (`navigator.clipboard.readText`) — 본 작업은 쓰기만.
- **모바일 share API 통합** (`navigator.share`) — 별도 컴포넌트 후보.
- **다중 텍스트 자동 포맷** (HexView처럼 hex/ascii/c-array 같은 변환) — `value`에 사용자가 미리 포맷한 문자열 전달.
- **드래그 앤 드롭으로 복사** — 별도 패턴.
- **자동 모달/토스트** — copied 피드백은 버튼 자체에. 외부 토스트는 사용자가 `onCopy`에 wiring.
- **secure context 자동 redirect** — fallback만. https 미충족 시 사용자 책임.

---

## 2. 공개 API

### 2.1 useCopyToClipboard 타입 — `src/components/_shared/useCopyToClipboard.ts`

```ts
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseCopyToClipboardOptions {
  /**
   * copied → idle 자동 복귀 시간 (ms).
   * 기본 1500. 0이면 자동 리셋 없음 (수동 reset() 호출 필요).
   */
  resetMs?: number;
}

export interface UseCopyToClipboardReturn {
  /** 현재 copied 상태. 복사 직후 true, resetMs 후 자동 false. */
  copied: boolean;

  /** 마지막 복사 시도에서 발생한 에러. 없으면 null. */
  error: Error | null;

  /**
   * 복사 시도.
   * @returns Promise<boolean> — 성공 여부.
   */
  copy: (text: string) => Promise<boolean>;

  /** 수동 idle 복귀. error도 함께 초기화. */
  reset: () => void;
}

export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {},
): UseCopyToClipboardReturn {
  const { resetMs = 1500 } = options;

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // unmount 시 timer 정리
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setCopied(false);
    setError(null);
  }, [clearTimer]);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      clearTimer();
      try {
        // 모던 path: navigator.clipboard
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setError(null);
          if (resetMs > 0) {
            timerRef.current = window.setTimeout(() => {
              setCopied(false);
              timerRef.current = null;
            }, resetMs);
          }
          return true;
        }

        // Fallback: execCommand
        const fallbackOk = legacyCopy(text);
        if (fallbackOk) {
          setCopied(true);
          setError(null);
          if (resetMs > 0) {
            timerRef.current = window.setTimeout(() => {
              setCopied(false);
              timerRef.current = null;
            }, resetMs);
          }
          return true;
        }

        throw new Error("Clipboard API unavailable");
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        setCopied(false);
        return false;
      }
    },
    [clearTimer, resetMs],
  );

  return { copied, error, copy, reset };
}

/**
 * Legacy fallback — execCommand("copy") via temporary textarea.
 * Insecure context (HTTP, file://)에서 navigator.clipboard 미지원 시 사용.
 */
function legacyCopy(text: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // 화면에서 안 보이게 + 포커스 영향 최소화
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.left = "-1000px";
    textarea.style.opacity = "0";
    textarea.setAttribute("readonly", "");
    document.body.appendChild(textarea);

    // 현재 selection 보존
    const prevSelection = document.getSelection();
    const prevRange = prevSelection && prevSelection.rangeCount > 0 ? prevSelection.getRangeAt(0) : null;

    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const ok = document.execCommand("copy");

    document.body.removeChild(textarea);

    // selection 복원
    if (prevRange && prevSelection) {
      prevSelection.removeAllRanges();
      prevSelection.addRange(prevRange);
    }

    return ok;
  } catch {
    return false;
  }
}
```

### 2.2 CopyButton 타입 — `src/components/CopyButton/CopyButton.types.ts`

```ts
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type CopyButtonSize = "sm" | "md" | "lg";
export type CopyButtonVariant = "primary" | "ghost" | "subtle";
export type CopyButtonTheme = "light" | "dark";

export interface CopyButtonRenderArgs {
  copied: boolean;
  error: Error | null;
  copy: () => Promise<boolean>;
}

export interface CopyButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "children"> {
  /** 복사할 텍스트. 함수형은 클릭 시점에 호출되어 최신 값 보장. */
  value: string | (() => string | Promise<string>);

  /** idle 라벨. 기본 "Copy". */
  idleLabel?: string;

  /** copied 라벨. 기본 "Copied!". */
  copiedLabel?: string;

  /** error 라벨. 기본 "Failed". */
  errorLabel?: string;

  /** 사이즈. 기본 "md". */
  size?: CopyButtonSize;

  /** variant. 기본 "ghost". */
  variant?: CopyButtonVariant;

  /** 테마. 기본 "light". */
  theme?: CopyButtonTheme;

  /** 아이콘 표시 여부. 기본 true. */
  showIcon?: boolean;

  /** 아이콘 위치. 기본 "left". */
  iconPlacement?: "left" | "right";

  /** copied → idle 자동 복귀 시간 (ms). 기본 1500. */
  resetMs?: number;

  /** 복사 성공 콜백. */
  onCopy?: (text: string) => void;

  /** 복사 실패 콜백. */
  onError?: (error: Error) => void;

  /**
   * children render prop — 완전 커스텀 UI.
   * 지정 시 idleLabel/copiedLabel/showIcon/iconPlacement 모두 무시.
   */
  children?: ReactNode | ((args: CopyButtonRenderArgs) => ReactNode);

  className?: string;
  style?: CSSProperties;
}
```

### 2.3 CopyButton 컴포넌트 — `src/components/CopyButton/CopyButton.tsx`

```tsx
import { useCallback, type CSSProperties } from "react";
import { useCopyToClipboard } from "../_shared/useCopyToClipboard";
import { Icon } from "../Icon";
import type { CopyButtonProps } from "./CopyButton.types";
import { copyButtonStyles } from "./CopyButton.styles";

export function CopyButton(props: CopyButtonProps) {
  const {
    value,
    idleLabel = "Copy",
    copiedLabel = "Copied!",
    errorLabel = "Failed",
    size = "md",
    variant = "ghost",
    theme = "light",
    showIcon = true,
    iconPlacement = "left",
    resetMs = 1500,
    onCopy,
    onError,
    children,
    className,
    style,
    disabled,
    ...rest
  } = props;

  const { copied, error, copy } = useCopyToClipboard({ resetMs });

  const handleClick = useCallback(async () => {
    const text = typeof value === "function" ? await value() : value;
    const ok = await copy(text);
    if (ok) onCopy?.(text);
    else if (error) onError?.(error);
  }, [value, copy, onCopy, onError, error]);

  // 스타일 조회
  const styles = copyButtonStyles[theme][variant][size];

  // children render prop 우선
  if (typeof children === "function") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={className}
        style={{ ...styles.base, ...style }}
        {...rest}
      >
        {children({ copied, error, copy: () => handleClick().then(() => true).catch(() => false) })}
      </button>
    );
  }

  // children이 ReactNode (string 등)이면 그대로
  const customContent = children !== undefined && typeof children !== "function";

  // 라벨 / 아이콘 결정
  const currentLabel = error ? errorLabel : copied ? copiedLabel : idleLabel;
  const iconName = error ? "error" : copied ? "check" : "copy";

  const iconNode = showIcon ? (
    <Icon name={iconName} size={size === "sm" ? "sm" : "md"} aria-hidden="true" />
  ) : null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
      data-state={error ? "error" : copied ? "copied" : "idle"}
      className={className}
      style={{ ...styles.base, ...style }}
      {...rest}
    >
      {customContent ? (
        children
      ) : (
        <>
          {iconPlacement === "left" && iconNode}
          <span>{currentLabel}</span>
          {iconPlacement === "right" && iconNode}
        </>
      )}
    </button>
  );
}

CopyButton.displayName = "CopyButton";
```

### 2.4 스타일 — `src/components/CopyButton/CopyButton.styles.ts`

```ts
import type { CSSProperties } from "react";
import type { CopyButtonSize, CopyButtonTheme, CopyButtonVariant } from "./CopyButton.types";

interface ButtonStyleSet {
  base: CSSProperties;
}

const sizeMap: Record<CopyButtonSize, { padding: string; fontSize: number; gap: number }> = {
  sm: { padding: "4px 8px", fontSize: 12, gap: 4 },
  md: { padding: "6px 12px", fontSize: 13, gap: 6 },
  lg: { padding: "8px 16px", fontSize: 14, gap: 8 },
};

function makeBase(size: CopyButtonSize, variant: CopyButtonVariant, theme: CopyButtonTheme): CSSProperties {
  const s = sizeMap[size];
  const palette = palettes[theme][variant];

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: s.gap,
    padding: s.padding,
    fontSize: s.fontSize,
    fontFamily: "inherit",
    fontWeight: 500,
    lineHeight: 1,
    borderRadius: 6,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.fg,
    cursor: "pointer",
    transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
    userSelect: "none",
  };
}

const palettes: Record<CopyButtonTheme, Record<CopyButtonVariant, { bg: string; fg: string; border: string }>> = {
  light: {
    primary: { bg: "#2563eb", fg: "#ffffff", border: "#2563eb" },
    ghost: { bg: "transparent", fg: "#374151", border: "transparent" },
    subtle: { bg: "rgba(0,0,0,0.05)", fg: "#374151", border: "rgba(0,0,0,0.08)" },
  },
  dark: {
    primary: { bg: "#60a5fa", fg: "#0f172a", border: "#60a5fa" },
    ghost: { bg: "transparent", fg: "#e5e7eb", border: "transparent" },
    subtle: { bg: "rgba(255,255,255,0.08)", fg: "#e5e7eb", border: "rgba(255,255,255,0.12)" },
  },
};

export const copyButtonStyles: Record<
  CopyButtonTheme,
  Record<CopyButtonVariant, Record<CopyButtonSize, ButtonStyleSet>>
> = {
  light: {
    primary: { sm: { base: makeBase("sm", "primary", "light") }, md: { base: makeBase("md", "primary", "light") }, lg: { base: makeBase("lg", "primary", "light") } },
    ghost: { sm: { base: makeBase("sm", "ghost", "light") }, md: { base: makeBase("md", "ghost", "light") }, lg: { base: makeBase("lg", "ghost", "light") } },
    subtle: { sm: { base: makeBase("sm", "subtle", "light") }, md: { base: makeBase("md", "subtle", "light") }, lg: { base: makeBase("lg", "subtle", "light") } },
  },
  dark: {
    primary: { sm: { base: makeBase("sm", "primary", "dark") }, md: { base: makeBase("md", "primary", "dark") }, lg: { base: makeBase("lg", "primary", "dark") } },
    ghost: { sm: { base: makeBase("sm", "ghost", "dark") }, md: { base: makeBase("md", "ghost", "dark") }, lg: { base: makeBase("lg", "ghost", "dark") } },
    subtle: { sm: { base: makeBase("sm", "subtle", "dark") }, md: { base: makeBase("md", "subtle", "dark") }, lg: { base: makeBase("lg", "subtle", "dark") } },
  },
};
```

### 2.5 배럴 — `src/components/CopyButton/index.ts`

```ts
export { CopyButton } from "./CopyButton";
export type {
  CopyButtonProps,
  CopyButtonSize,
  CopyButtonVariant,
  CopyButtonTheme,
  CopyButtonRenderArgs,
} from "./CopyButton.types";
```

### 2.6 components 배럴 — `src/components/index.ts`

```ts
export * from "./CopyButton";
```

### 2.7 useCopyToClipboard public export — `src/components/_shared/index.ts`

`_shared` 디렉터리는 현재 컴포넌트 외부에서 접근 불가능 (의도). 하지만 `useCopyToClipboard`는 사용자가 자체 UI 만들 때 유용하므로 public으로 export:

```ts
// src/components/_shared/index.ts (신설)
export { useCopyToClipboard } from "./useCopyToClipboard";
export type {
  UseCopyToClipboardOptions,
  UseCopyToClipboardReturn,
} from "./useCopyToClipboard";

// src/components/index.ts에 추가
export * from "./_shared";
```

---

## 3. 파일 구조

```
src/components/
├── _shared/
│   ├── useCopyToClipboard.ts       ← 신설 (훅)
│   └── index.ts                     ← 신설 (public 부분 export)
└── CopyButton/
    ├── CopyButton.tsx
    ├── CopyButton.types.ts
    ├── CopyButton.styles.ts
    └── index.ts
```

---

## 4. 동작 명세

### 4.1 copy 함수 흐름

```
copy(text)
  ├─ navigator.clipboard.writeText(text) 시도
  │   ├─ 성공 → setCopied(true), setError(null), timer 시작
  │   └─ 실패 → catch
  │       └─ legacyCopy(text) 시도
  │           ├─ 성공 → setCopied(true), setError(null), timer 시작
  │           └─ 실패 → throw
  └─ 모든 시도 실패 → setError(err), setCopied(false)
```

### 4.2 timer 동작

- copy 성공 시 `setTimeout(setCopied(false), resetMs)`.
- 또 다른 copy 호출 시 기존 timer 취소 + 새 timer 시작.
- `reset()` 호출 시 timer 취소.
- unmount 시 timer 취소.

### 4.3 resetMs=0 동작

- copy 성공 후 `copied=true` 영구 (수동 `reset()` 호출까지).
- 매우 긴 피드백 원할 때 사용.

### 4.4 동시 다발 copy

```ts
copy("a"); // copied=true, timer 시작 (1500ms)
copy("b"); // 첫 timer 취소, 새 timer 시작 (1500ms)
// → 첫 호출의 "a" 클립보드 덮어쓰기 (b가 마지막)
```

### 4.5 secure context 미충족

`navigator.clipboard`는 HTTPS / localhost / file://에서만 지원. HTTP는 unsafe context.
- `navigator.clipboard?.writeText` 체크에서 `?.`로 안전 분기.
- 미지원이면 즉시 `legacyCopy` 시도.
- legacyCopy도 실패 (예: iframe + sandbox)면 error throw.

### 4.6 권한 거부

- `navigator.permissions.query({name: "clipboard-write"})` 사전 체크는 v1 미지원.
- copy 호출 시 권한 prompt → 거부 시 `writeText`가 reject → catch에서 fallback → fallback도 실패 시 error.

### 4.7 CopyButton 클릭 흐름

```
사용자 클릭
  → handleClick
  → value가 함수면 호출 (await)
  → copy(text)
  → 성공: onCopy(text), copied=true 표시
  → 실패: onError(error), error 표시
  → resetMs 후 자동 idle 복귀
```

### 4.8 children render prop

```tsx
<CopyButton value={text}>
  {({ copied, error, copy }) => (
    <span>{copied ? "✓" : error ? "✗" : "📋"}</span>
  )}
</CopyButton>
```

children이 함수면 render prop 모드 — idleLabel/copiedLabel/showIcon 모두 무시.

---

## 5. 마이그레이션 — HexView

### 5.1 변경 전 (`src/components/HexView/HexView.tsx`)

```tsx
const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

const doCopy = useCallback(
  (fmt: HexViewCopyFormat) => {
    const slice = selection ? bytes.slice(selection.start, selection.end) : bytes;
    if (slice.length === 0) return;
    const text = formatBytes(slice, fmt);
    void navigator.clipboard.writeText(text).then(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    });
  },
  [bytes, selection],
);
```

### 5.2 변경 후

```tsx
import { useCopyToClipboard } from "../_shared/useCopyToClipboard";

// state 제거
// const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

const { copied, copy } = useCopyToClipboard({ resetMs: 1500 });

const doCopy = useCallback(
  (fmt: HexViewCopyFormat) => {
    const slice = selection ? bytes.slice(selection.start, selection.end) : bytes;
    if (slice.length === 0) return;
    const text = formatBytes(slice, fmt);
    void copy(text);
  },
  [bytes, selection, copy],
);

// 기존 copyState 참조처 모두 copied로 교체
// 예: copyState === "copied" → copied
```

### 5.3 변경 항목 정리

**삭제:**
- `useState<"idle" | "copied">("idle")`.
- `setTimeout(...)` 인라인 호출.
- `setCopyState("copied")`, `setCopyState("idle")` 호출들.

**유지:**
- `formatBytes` 헬퍼 (포맷 변환은 사용자 코드).
- `onCopyEvent` 핸들러 (native clipboard event는 별개 — `e.clipboardData.setData`로 처리, 훅 무관).
- 포맷 토글 UI (hex/ascii/c-array 버튼).
- Cmd+C 키 핸들러.

**수정:**
- `copyState === "copied"` 조건 → `copied`.
- 표시 라벨 (예: 버튼 텍스트 "복사" ↔ "✓ 복사됨")은 그대로.

### 5.4 onCopyEvent (native clipboard event) 별개 처리

`onCopyEvent`는 사용자가 텍스트를 선택하고 Cmd+C를 누를 때 발생하는 `paste`/`copy` event 핸들러. `useCopyToClipboard`와 무관 — 이 경우 clipboard API가 아니라 `e.clipboardData.setData`로 직접 데이터 주입. 그대로 유지.

```tsx
const onCopyEvent = useCallback(
  (e: ReactClipboardEvent<HTMLDivElement>) => {
    if (!selection) return;
    e.preventDefault();
    const slice = bytes.slice(selection.start, selection.end);
    e.clipboardData.setData("text/plain", formatBytes(slice, copyFmt));
    // 추가: copied 상태 알림
    // 옵션: copy 훅의 상태도 갱신할지 결정 (UX 일관성)
    // → copy("") 빈 문자열 호출은 의미 없음. 별도 상태 동기화 미필요.
  },
  [bytes, copyFmt, selection],
);
```

**주의**: `onCopyEvent`로 복사 시 `copyState`는 idle 그대로 (button을 클릭한 게 아니므로). 사용자 시각으로는 OS의 자체 복사 피드백(Mac의 경우 visual cue)에 의존. 원하면 별도 상태 알림 추가 가능 — v1은 기존 동작 유지.

### 5.5 회귀 검증

- [ ] HexView 데모 페이지에서 텍스트 선택 + 우상단 "복사" 버튼 클릭 → 클립보드에 hex/ascii/c-array 형식대로 들어가는지 확인.
- [ ] "복사" 버튼 클릭 후 "✓ 복사됨" 1.5초 후 다시 "복사"로 복귀.
- [ ] 빈 selection (선택 없음) + 클릭 → 전체 데이터 복사.
- [ ] Cmd+C (선택 후) → 클립보드 들어감 (onCopyEvent 경로).
- [ ] 포맷 토글 (hex/ascii/c-array) 변경 → 다음 복사 시 새 포맷 적용.

---

## 6. 마이그레이션 — CodeView

### 6.1 현재 CodeView copy 구현

```tsx
const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

// ... 어딘가의 handleCopyAll
const handleCopyAll = () => {
  navigator.clipboard.writeText(displayCode).then(() => {
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 1500);
  });
};

// 렌더 (line 426-450)
const copyBtn = showCopyButton ? (
  <button onClick={handleCopyAll} ...>
    {copyState === "copied" ? "✓ 복사됨" : "복사"}
  </button>
) : null;
```

### 6.2 변경 후

```tsx
import { useCopyToClipboard } from "../_shared/useCopyToClipboard";

const { copied, copy } = useCopyToClipboard({ resetMs: 1500 });

const handleCopyAll = useCallback(() => {
  void copy(displayCode);
}, [copy, displayCode]);

const copyBtn = showCopyButton ? (
  <button onClick={handleCopyAll} ...>
    {copied ? "✓ 복사됨" : "복사"}
  </button>
) : null;
```

**옵션 — 더 적극적 마이그레이션 (v1.1 검토)**: 자체 button → `<CopyButton variant="subtle" size="sm" value={displayCode} idleLabel="복사" copiedLabel="✓ 복사됨" />` 직접 교체. 다만 CodeView가 button 위치(absolute top right)를 직접 제어하므로 v1은 button 자체는 유지하고 내부 로직만 훅 교체. 시각·DOM 구조 변경 0.

### 6.3 회귀 검증

- [ ] CodeViewPage에서 "복사" 버튼 클릭 → 코드 클립보드 복사.
- [ ] "✓ 복사됨" 1.5초 후 "복사"로 복귀.
- [ ] dark 테마에서도 정상.

---

## 7. 데모 페이지 — `demo/src/pages/CopyButtonPage.tsx`

```tsx
export function CopyButtonPage() {
  const longText = "function hello() {\n  console.log('world');\n}";

  return (
    <div>
      <h1>CopyButton</h1>

      <Card.Root>
        <Card.Header>Basic</Card.Header>
        <Card.Body>
          <CopyButton value="Hello, world!" />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Sizes</Card.Header>
        <Card.Body style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <CopyButton value="text" size="sm" />
          <CopyButton value="text" size="md" />
          <CopyButton value="text" size="lg" />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Variants</Card.Header>
        <Card.Body style={{ display: "flex", gap: 12 }}>
          <CopyButton value="text" variant="primary" />
          <CopyButton value="text" variant="ghost" />
          <CopyButton value="text" variant="subtle" />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>커스텀 라벨</Card.Header>
        <Card.Body>
          <CopyButton value={longText} idleLabel="코드 복사" copiedLabel="✓ 복사됨" />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>아이콘 위치 / 숨김</Card.Header>
        <Card.Body style={{ display: "flex", gap: 12 }}>
          <CopyButton value="text" iconPlacement="left" />
          <CopyButton value="text" iconPlacement="right" />
          <CopyButton value="text" showIcon={false} />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Render prop (완전 커스텀)</Card.Header>
        <Card.Body>
          <CopyButton value="text">
            {({ copied }) => (
              <span style={{ fontSize: 24 }}>{copied ? "🎉" : "📋"}</span>
            )}
          </CopyButton>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>동적 value (함수형)</Card.Header>
        <Card.Body>
          <CopyButton value={() => `Time: ${new Date().toISOString()}`} idleLabel="타임스탬프 복사" />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>onCopy / onError 콜백</Card.Header>
        <Card.Body>
          <CopyButton
            value="logged"
            onCopy={(t) => console.log("Copied:", t)}
            onError={(e) => console.error("Error:", e)}
          />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>resetMs 변경</Card.Header>
        <Card.Body style={{ display: "flex", gap: 12 }}>
          <CopyButton value="t" resetMs={500} idleLabel="500ms" />
          <CopyButton value="t" resetMs={3000} idleLabel="3000ms" />
          <CopyButton value="t" resetMs={0} idleLabel="수동 reset 필요" />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Dark theme</Card.Header>
        <Card.Body style={{ background: "#1f2937", padding: 16 }}>
          <CopyButton value="text" theme="dark" variant="primary" />
          <CopyButton value="text" theme="dark" variant="ghost" />
          <CopyButton value="text" theme="dark" variant="subtle" />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>Disabled</Card.Header>
        <Card.Body>
          <CopyButton value="text" disabled />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>훅 단독 사용 예시</Card.Header>
        <Card.Body>
          <HookOnlyExample />
        </Card.Body>
      </Card.Root>
    </div>
  );
}

function HookOnlyExample() {
  const { copied, copy, error, reset } = useCopyToClipboard({ resetMs: 2000 });

  return (
    <div>
      <button onClick={() => copy("custom UI value")}>
        {copied ? "Copied via hook!" : "Copy with hook"}
      </button>
      {error && <span style={{ color: "red", marginLeft: 8 }}>Error: {error.message}</span>}
      <button onClick={reset} style={{ marginLeft: 8 }}>Reset</button>
    </div>
  );
}
```

데모 라우팅 등록 — `demo/src/App.tsx`의 NAV에 `CopyButton` 항목 추가.

---

## 8. 접근성 (a11y)

### 8.1 button 시맨틱
- `<button type="button">` — 표준. Enter/Space 모두 click 트리거.
- `disabled` 속성 자동 처리.

### 8.2 copied 상태 알림
- `aria-live="polite"` 영역으로 "Copied!" 변화 알림.
- 단, 매번 클릭마다 알림 → 노이즈일 수 있음. 권장: visually-hidden span을 별도로 두고 거기에만 aria-live 적용, 시각 라벨은 일반 span. v1은 button 자체에 `aria-live="polite"`로 단순화.

### 8.3 키보드 작동
- Tab: 포커스 이동.
- Enter / Space: 클릭 트리거.

### 8.4 데이터 속성
- `data-state="idle" | "copied" | "error"` — CSS 셀렉터·테스트용.

### 8.5 에러 시
- 시각: `errorLabel` ("Failed") 표시.
- 알림: `aria-live="polite"`로 자동 알림.
- 권장: 사용자가 `onError`로 추가 알림(Toast 등) 트리거.

---

## 9. 설계 결정 사항 (rationale)

### 9.1 훅 + 컴포넌트 2-layer
**이유**: 사용자가 자체 UI를 만들고 싶을 때(예: tooltip 안에 작은 copy 아이콘)도 같은 로직 재사용. 또한 라이브러리 내부(HexView, CodeView)도 자체 UI를 유지한 채 로직만 공유. layer 분리가 마이그레이션 비용을 가장 낮춤.

### 9.2 default resetMs=1500
**이유**: 기존 HexView·CodeView가 1500ms 사용 — 동일 값으로 시각 회귀 0. UX 측면에서 1.5~2초는 사용자가 "복사됨" 인지하고도 빨리 다음 액션 가능한 균형점.

### 9.3 navigator.clipboard 우선 + execCommand 폴백
**이유**: navigator.clipboard는 모던 표준이지만 HTTPS/secure context 필요. file:// 프로토콜로 데모를 여는 경우 등 개발 환경에서 작동 안 함. polyfill로 execCommand 유지.

### 9.4 value를 함수형으로도 받음
**이유**: 클릭 시점의 최신 값 필요한 케이스 (예: 동적 생성된 링크, 시간 기반 값). 함수형은 await 가능 — 비동기 fetch도 가능.

### 9.5 children render prop
**이유**: 라벨/아이콘만으로는 표현 못 하는 커스텀 UI (이모지, custom svg, 합성 영상) 지원. shadcn 패턴.

### 9.6 errorLabel 명시적
**이유**: 권한 거부·secure context 미충족 등 실패가 가능. 무음 실패는 사용자 혼란. 시각 + 콜백 둘 다.

### 9.7 useCopyToClipboard를 _shared에 배치
**이유**: CopyButton 외에도 HexView·CodeView가 사용. 컴포넌트 디렉터리에 종속되지 않은 utility hook으로 분리. 동시에 _shared/index.ts로 public export하여 사용자도 활용.

### 9.8 마이그레이션 — UI 유지, 로직 교체
**이유**: HexView와 CodeView의 자체 button UI는 위치·시각·인터랙션이 컴포넌트 맥락에 맞춰져 있음. 이를 `<CopyButton>`로 교체하면 시각 회귀 위험. 로직(상태 + 클립보드 호출)만 훅으로 교체하는 게 가장 안전. v1.1+에서 시각 통일 필요 시 추가 마이그레이션 검토.

---

## 10. Edge cases

### 10.1 빈 문자열 복사
```ts
copy("")
```
- navigator.clipboard.writeText("")는 정상 작동 (빈 클립보드).
- copied=true 됨. v1 의도된 동작 (사용자가 명시 호출).

### 10.2 매우 긴 텍스트 (수 MB)
- navigator.clipboard.writeText는 string 입력 받음. 브라우저 한계까지 가능.
- 메모리/성능은 사용자 책임.

### 10.3 Promise 미반환 시 (non-async 코드 흐름)
```tsx
<CopyButton value={() => fetchSecret()} />
```
- value 함수가 Promise 반환하면 await로 처리. 자동 동기/비동기 호환.

### 10.4 disabled 중 copy 호출 시도
- 외부에서 ref로 button.click() 시 `disabled` 속성이 차단.
- 훅 단독 사용 시는 disabled 상태 별도 관리 필요 (사용자 책임).

### 10.5 useEffect cleanup 도중 copy
- unmount 직후 호출은 setState 경고 발생 가능.
- v1은 timer만 cleanup. setState mid-async는 React 18에서 자동 무시 (mounted ref 추가는 v1.1).

### 10.6 동일 컴포넌트에 CopyButton 다중
```tsx
<CopyButton value="A" />
<CopyButton value="B" />
```
- 각자 독립 훅 인스턴스 → 독립 copied 상태. 정상.

### 10.7 SSR
- import는 안전 (훅은 use 시점에만 navigator 접근).
- 첫 렌더에서 `copied=false`, `error=null` 으로 일관 시작. hydration 안전.

### 10.8 권한 prompt 중 사용자가 페이지 이탈
- copy Promise pending 중 unmount → useEffect cleanup으로 timer 정리. setState는 stale (React가 무시).

### 10.9 비-secure context (HTTP)
- navigator.clipboard 미지원.
- legacyCopy 시도 → execCommand가 deprecated되었지만 여전히 대부분의 브라우저 지원.
- 둘 다 실패 시 error.

### 10.10 iframe sandbox
- `<iframe sandbox="allow-scripts">` (allow-clipboard 없음) → navigator.clipboard.writeText reject + execCommand 실패.
- error 표시. 사용자에게 "이 환경은 클립보드 접근 불가" 안내 책임.

---

## 11. 구현 단계 (Phase)

### Phase 1: useCopyToClipboard 훅 신설
1. `src/components/_shared/useCopyToClipboard.ts` 작성.
2. `src/components/_shared/index.ts` 작성 (public export).
3. `src/components/index.ts`에 `export * from "./_shared"` 추가.
4. `npm run typecheck` 통과.

### Phase 2: CopyButton 신설
1. `src/components/CopyButton/CopyButton.types.ts`
2. `src/components/CopyButton/CopyButton.styles.ts`
3. `src/components/CopyButton/CopyButton.tsx`
4. `src/components/CopyButton/index.ts`
5. `src/components/index.ts`에 추가.
6. `npm run typecheck` + `npm run build` 통과.

### Phase 3: 데모 페이지
1. `demo/src/pages/CopyButtonPage.tsx` 작성 (§7).
2. NAV 등록.
3. 모든 섹션 동작 확인:
   - 클립보드에 실제 들어가는지 (텍스트 에디터에 붙여넣기).
   - copied 1.5초 후 idle 복귀.
   - HookOnlyExample 작동.
   - light/dark 모두.

### Phase 4: HexView 마이그레이션
1. `useCopyToClipboard` import.
2. `copyState` state 제거.
3. `doCopy` 내부의 `navigator.clipboard.writeText` + `setCopyState` + `setTimeout` 삭제, `copy(text)` 한 줄로 교체.
4. `copyState === "copied"` 참조처를 `copied`로 교체.
5. HexView 데모 회귀 확인 (§5.5).

### Phase 5: CodeView 마이그레이션
1. `useCopyToClipboard` import.
2. `copyState` state 제거.
3. `handleCopyAll` 내부 교체.
4. `copyState === "copied"` 참조처 `copied`로 교체.
5. CodeView 데모 회귀 확인.

### Phase 6: 정리
- [ ] `docs/candidates.md`에서 7번 항목 제거 + plan 링크.
- [ ] README.md에 CopyButton 섹션 추가.
- [ ] PR 디스크립션에 변경 요약.

---

## 12. 향후 확장 (v1.1+)

| 항목 | 설명 |
|---|---|
| 다중 형식 클립보드 | text/html, image/png 등 동시 복사 |
| `navigator.permissions` 사전 체크 | UI에 "권한 필요" 사전 안내 |
| Tooltip 통합 | 자동 "Copied!" tooltip 띄우기 (Tooltip 컴포넌트 사용) |
| copy events bubble 통합 | HexView의 `onCopyEvent`도 훅을 통해 상태 sync |
| readClipboard | `useReadFromClipboard` 훅 |
| share API | `navigator.share` 통합 |
| Hex/CodeView UI도 CopyButton로 통일 | 시각 표준화 (현 v1은 로직만) |

---

## 13. 체크리스트 (작업 완료 기준)

- [ ] `src/components/_shared/useCopyToClipboard.ts` 작성, public export
- [ ] `src/components/CopyButton/` 4개 파일 작성
- [ ] `npm run typecheck` 통과
- [ ] `npm run build` 통과
- [ ] CopyButtonPage 모든 섹션 정상 (light/dark)
- [ ] 클립보드에 실제 데이터 들어감 (텍스트 에디터 검증)
- [ ] HexView 마이그레이션 완료 (`copyState` 제거, `doCopy`가 훅 호출)
- [ ] HexView 데모 회귀 없음 (포맷 토글, Cmd+C, 버튼 클릭 모두)
- [ ] CodeView 마이그레이션 완료 (`copyState` 제거, `handleCopyAll`이 훅 호출)
- [ ] CodeView 데모 회귀 없음 (복사 버튼 동작·다크 테마)
- [ ] secure context 미충족 시 fallback 작동 (file:// 프로토콜로 데모 여는 등 검증)
- [ ] `docs/candidates.md` 7번 제거 + 링크
- [ ] README.md 업데이트
