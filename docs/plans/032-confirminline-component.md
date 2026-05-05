# ConfirmInline 컴포넌트 설계문서

## Context

`ConfirmInline`은 **같은 버튼 자리에서 "한 번 더 클릭해서 확인"** 패턴을 구현한 컴포넌트.

destructive 액션(삭제, 취소 등)에 모달 다이얼로그를 띄우는 것은 부담스러운 경우가 많음:
- 인라인 위치(테이블 행 안 등)에서 모달은 컨텍스트 단절
- 자주 반복되는 액션은 모달 = 마찰
- 모바일에선 더 무거움

대안: 첫 클릭 시 같은 자리에서 색상·텍스트만 변경 ("Click again to confirm"), 두 번째 클릭 시 실제 실행, 일정 시간 무클릭 시 idle 복귀.

GitHub의 "Delete repository" 다이얼로그(타이핑 확인) vs Discord의 메시지 삭제 인라인 X (즉시 실행) 사이의 중간 — 가벼운 이중 확인.

참고:
- **Linear** — 이슈 삭제 시 인라인 "Click again" 패턴.
- **GitHub** — 일부 minor destructive에 사용.
- **VS Code** — workbench의 일부 액션에 사용.
- **shadcn/ui** — confirm-on-click 패턴 (단순).

본 레포 내부 참조:
- `src/components/Button/` — 시각·키보드·disabled 패턴 참조.
- `src/components/Icon/` (plan 023) — 아이콘 슬롯.
- `src/components/_shared/` — timer 관리 패턴 참조.

---

## 0. TL;DR

```tsx
// 1. 가장 단순
<ConfirmInline label="Delete" onConfirm={() => doDelete()} />
// → 첫 클릭: "Click again to confirm" (빨간색)
// → 둘째 클릭: onConfirm 호출
// → 3초 무클릭: idle 복귀

// 2. 라벨 커스터마이징
<ConfirmInline
  label="삭제"
  confirmLabel="한 번 더 클릭하여 확인"
  onConfirm={...}
/>

// 3. timeout 변경
<ConfirmInline label="X" timeout={5000} onConfirm={...} />

// 4. severity (색상)
<ConfirmInline severity="warning" label="Cancel" onConfirm={...} />
<ConfirmInline severity="error" label="Delete" onConfirm={...} /> {/* 기본 */}

// 5. size / variant
<ConfirmInline size="sm" variant="ghost" label="Remove" onConfirm={...} />

// 6. 외부에서 reset 트리거
const ref = useRef<ConfirmInlineHandle>(null);
<ConfirmInline ref={ref} label="X" onConfirm={...} />
ref.current?.reset();

// 7. icon 슬롯
<ConfirmInline icon={<Icon name="trash" />} label="Delete" onConfirm={...} />

// 8. onPending 콜백 (pending 상태 진입 알림)
<ConfirmInline
  label="X"
  onConfirm={...}
  onPending={() => analytics.track("delete-pending")}
/>
```

핵심 원칙:
- **2-state**: idle ↔ pending. 외부 noop 동안 pending → timeout 후 idle 복귀.
- **같은 자리**: 모달 없음. 버튼 자체가 변신.
- **시각**: idle은 ghost/subtle, pending은 severity 색상 (기본 error=빨강).
- **timeout 기본 3000ms** — 너무 짧으면 더블 클릭처럼 느낌, 너무 길면 인지 부담.
- **focus blur 시 자동 reset** — 의도 없는 클릭 방지.
- **a11y**: pending 상태 변화 시 `aria-live="polite"` 알림.
- **Button 위에 얇게 — Button을 wrap하지 않고 자체 button**.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `label` (idle), `confirmLabel` (pending), `onConfirm`.
2. `timeout` 기본 3000.
3. `severity: "default" | "warning" | "error"` — pending 색상.
4. `variant: "primary" | "ghost" | "subtle"`.
5. `size: "sm" | "md" | "lg"`.
6. `theme: "light" | "dark"`.
7. `icon` 슬롯.
8. `disabled`.
9. `onPending` 콜백 (pending 진입 시).
10. `onCancel` 콜백 (timeout 자동 복귀 시).
11. ref handle: `{ reset(): void; isPending: boolean }`.
12. focus blur 시 자동 reset.
13. 키보드 — Enter/Space 표준 button 동작. Esc → reset.
14. a11y `aria-live`.

### Non-goals (v1)
- 사용자 타이핑 확인 ("Type DELETE to confirm") — Dialog 스타일 별도 (ConfirmDialog 후보).
- 스와이프 확인 (모바일) — v1 없음.
- 다단계 (3-click) — 2-click 고정.
- 사용자 정의 progress bar (timeout 시각화) — v1.1+.

---

## 2. 공개 API

### 2.1 타입 — `src/components/ConfirmInline/ConfirmInline.types.ts`

```ts
import type { CSSProperties, ButtonHTMLAttributes, ReactNode } from "react";

export type ConfirmInlineSize = "sm" | "md" | "lg";
export type ConfirmInlineVariant = "primary" | "ghost" | "subtle";
export type ConfirmInlineSeverity = "default" | "warning" | "error";
export type ConfirmInlineTheme = "light" | "dark";
export type ConfirmInlineState = "idle" | "pending";

export interface ConfirmInlineHandle {
  reset: () => void;
  isPending: boolean;
}

export interface ConfirmInlineProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  label: string;
  confirmLabel?: string;            // 기본 "Click again to confirm"
  onConfirm: () => void;

  timeout?: number;                 // 기본 3000
  severity?: ConfirmInlineSeverity; // 기본 "error"
  variant?: ConfirmInlineVariant;   // 기본 "ghost"
  size?: ConfirmInlineSize;         // 기본 "md"
  theme?: ConfirmInlineTheme;

  icon?: ReactNode;

  onPending?: () => void;
  onCancel?: () => void;            // timeout 자동 복귀

  className?: string;
  style?: CSSProperties;
}
```

### 2.2 컴포넌트 — `src/components/ConfirmInline/ConfirmInline.tsx`

```tsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

const severityColors: Record<ConfirmInlineSeverity, Record<ConfirmInlineTheme, { bg: string; fg: string; border: string }>> = {
  default: {
    light: { bg: "#374151", fg: "#fff", border: "#374151" },
    dark:  { bg: "#9ca3af", fg: "#0f172a", border: "#9ca3af" },
  },
  warning: {
    light: { bg: "#f59e0b", fg: "#fff", border: "#f59e0b" },
    dark:  { bg: "#fbbf24", fg: "#0f172a", border: "#fbbf24" },
  },
  error: {
    light: { bg: "#dc2626", fg: "#fff", border: "#dc2626" },
    dark:  { bg: "#ef4444", fg: "#0f172a", border: "#ef4444" },
  },
};

const sizeStyles: Record<ConfirmInlineSize, { padding: string; fontSize: number; height: number; gap: number }> = {
  sm: { padding: "0 8px", fontSize: 12, height: 24, gap: 4 },
  md: { padding: "0 12px", fontSize: 13, height: 32, gap: 6 },
  lg: { padding: "0 16px", fontSize: 14, height: 40, gap: 8 },
};

export const ConfirmInline = forwardRef<ConfirmInlineHandle, ConfirmInlineProps>((props, ref) => {
  const {
    label,
    confirmLabel = "Click again to confirm",
    onConfirm,
    timeout = 3000,
    severity = "error",
    variant = "ghost",
    size = "md",
    theme = "light",
    icon,
    onPending,
    onCancel,
    disabled,
    className,
    style,
    onBlur,
    onKeyDown,
    ...rest
  } = props;

  const [state, setState] = useState<ConfirmInlineState>("idle");
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setState((prev) => {
      if (prev === "pending") onCancel?.();
      return "idle";
    });
  }, [clearTimer, onCancel]);

  // unmount cleanup
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // ref handle
  useImperativeHandle(ref, () => ({
    reset,
    isPending: state === "pending",
  }), [reset, state]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (state === "idle") {
      setState("pending");
      onPending?.();
      timerRef.current = window.setTimeout(() => {
        setState("idle");
        onCancel?.();
        timerRef.current = null;
      }, timeout);
    } else {
      // pending → confirm
      clearTimer();
      setState("idle");
      onConfirm();
    }
  }, [disabled, state, timeout, onPending, onCancel, onConfirm, clearTimer]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLButtonElement>) => {
    onBlur?.(e);
    if (state === "pending") reset();
  }, [onBlur, state, reset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(e);
    if (e.key === "Escape" && state === "pending") {
      e.preventDefault();
      reset();
    }
  }, [onKeyDown, state, reset]);

  const sizeS = sizeStyles[size];
  const palette = severityColors[severity][theme];

  // variant + state별 스타일
  let bg: string, fg: string, border: string;
  if (state === "pending") {
    bg = palette.bg;
    fg = palette.fg;
    border = palette.border;
  } else {
    if (variant === "primary") {
      bg = palette.bg;
      fg = palette.fg;
      border = palette.border;
    } else if (variant === "subtle") {
      bg = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
      fg = theme === "dark" ? "#e5e7eb" : "#374151";
      border = "transparent";
    } else { // ghost
      bg = "transparent";
      fg = theme === "dark" ? "#e5e7eb" : "#374151";
      border = "transparent";
    }
  }

  const buttonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: sizeS.gap,
    height: sizeS.height,
    padding: sizeS.padding,
    fontSize: sizeS.fontSize,
    fontFamily: "inherit",
    fontWeight: 500,
    lineHeight: 1,
    borderRadius: 6,
    border: `1px solid ${border}`,
    background: bg,
    color: fg,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background 150ms ease, border-color 150ms ease, color 150ms ease",
    userSelect: "none",
    ...style,
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      data-state={state}
      data-severity={severity}
      aria-live="polite"
      className={className}
      style={buttonStyle}
      {...rest}
    >
      {icon}
      <span>{state === "pending" ? confirmLabel : label}</span>
    </button>
  );
});

ConfirmInline.displayName = "ConfirmInline";
```

### 2.3 배럴

```ts
export { ConfirmInline } from "./ConfirmInline";
export type {
  ConfirmInlineProps,
  ConfirmInlineHandle,
  ConfirmInlineSize,
  ConfirmInlineVariant,
  ConfirmInlineSeverity,
  ConfirmInlineState,
  ConfirmInlineTheme,
} from "./ConfirmInline.types";
```

---

## 3. 파일 구조

```
src/components/ConfirmInline/
├── ConfirmInline.tsx
├── ConfirmInline.types.ts
└── index.ts
```

---

## 4. 데모 페이지

```tsx
export function ConfirmInlinePage() {
  const [count, setCount] = useState(0);
  const ref = useRef<ConfirmInlineHandle>(null);

  return (
    <div>
      <h1>ConfirmInline</h1>

      <Card.Root><Card.Header>Basic — error</Card.Header><Card.Body>
        <ConfirmInline label="Delete" onConfirm={() => setCount(c => c+1)} />
        <p>Confirmed: {count}</p>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Severity</Card.Header><Card.Body>
        <HStack gap={8}>
          <ConfirmInline severity="default" label="Default" onConfirm={() => {}} />
          <ConfirmInline severity="warning" label="Warning" onConfirm={() => {}} />
          <ConfirmInline severity="error" label="Error" onConfirm={() => {}} />
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Variant</Card.Header><Card.Body>
        <HStack gap={8}>
          <ConfirmInline variant="primary" label="Primary" onConfirm={() => {}} />
          <ConfirmInline variant="ghost" label="Ghost" onConfirm={() => {}} />
          <ConfirmInline variant="subtle" label="Subtle" onConfirm={() => {}} />
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Size</Card.Header><Card.Body>
        <HStack gap={8} align="center">
          <ConfirmInline size="sm" label="Small" onConfirm={() => {}} />
          <ConfirmInline size="md" label="Medium" onConfirm={() => {}} />
          <ConfirmInline size="lg" label="Large" onConfirm={() => {}} />
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>With icon</Card.Header><Card.Body>
        <ConfirmInline icon={<Icon name="trash" size="sm" />} label="Delete" onConfirm={() => {}} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>커스텀 라벨</Card.Header><Card.Body>
        <ConfirmInline label="삭제" confirmLabel="한 번 더 클릭하여 확인" onConfirm={() => {}} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>timeout 변경</Card.Header><Card.Body>
        <HStack gap={8}>
          <ConfirmInline label="1s timeout" timeout={1000} onConfirm={() => {}} />
          <ConfirmInline label="3s (default)" onConfirm={() => {}} />
          <ConfirmInline label="10s" timeout={10000} onConfirm={() => {}} />
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>외부 reset</Card.Header><Card.Body>
        <HStack gap={8}>
          <ConfirmInline ref={ref} label="X" onConfirm={() => {}} />
          <button onClick={() => ref.current?.reset()}>Reset</button>
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Disabled</Card.Header><Card.Body>
        <ConfirmInline disabled label="Disabled" onConfirm={() => {}} />
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark theme</Card.Header><Card.Body style={{background:"#1f2937",padding:16}}>
        <HStack gap={8}>
          <ConfirmInline theme="dark" severity="error" label="Delete" onConfirm={() => {}} />
          <ConfirmInline theme="dark" severity="warning" label="Cancel" onConfirm={() => {}} />
        </HStack>
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성

- `<button>` 표준.
- `aria-live="polite"` — 라벨 변경 시 알림.
- Esc 키 → reset.
- focus 잃으면 자동 reset (의도 없는 pending 상태 방지).
- disabled 시 클릭/포커스 차단.

---

## 6. Edge cases

- **빠른 더블클릭 (300ms 내)**: idle → pending → confirm 둘 다 처리됨. 정상 동작 (사용자가 빨리 두 번 누르면 즉시 확인).
- **pending 중 prop 변화**: timeout 변경 시 기존 timer 취소 후 신규 timer (사용자 책임).
- **focus 잃기 직전 enter**: blur가 onClick보다 먼저 발생할 수 있음 → reset 후 confirm 실패. 의도된 동작.
- **컴포넌트 unmount 중 timer 진행**: cleanup으로 안전.
- **disabled 변경 — pending 중**: pending이지만 disabled=true → 버튼 비활성. timeout은 그대로 진행.

---

## 7. 구현 단계
- Phase 1: 컴포넌트
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 3개 파일
- [ ] typecheck/build
- [ ] 모든 severity/variant/size 시각 정상 (light/dark)
- [ ] timeout 자동 복귀
- [ ] focus blur reset
- [ ] Esc reset
- [ ] ref reset
- [ ] candidates / README
