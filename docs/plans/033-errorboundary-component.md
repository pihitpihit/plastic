# ErrorBoundary 컴포넌트 설계문서

## Context

React error boundary + 스타일된 fallback UI를 표준화한 `ErrorBoundary` 컴포넌트 추가.

React error boundary는 **클래스 컴포넌트로만** 가능 (hook으로 안 됨). 사용자가 매번 직접 작성하기 부담스러우므로 라이브러리에서 표준 fallback UI + reset 패턴을 제공.

참고:
- **react-error-boundary** (npm) — 가장 영향력. `ErrorBoundary` + `useErrorBoundary` + `withErrorBoundary` HOC + `FallbackComponent` prop.
- **Sentry React Error Boundary** — Sentry 연동.
- **Mantine** — `ErrorBoundary` 자체 미제공.
- **shadcn/ui** — 자체 컴포넌트 미제공.

본 레포 내부 참조:
- `src/components/Icon/` (plan 023) — error 아이콘.
- `src/components/Button/` — 재시도 버튼.

---

## 0. TL;DR

```tsx
// 1. 가장 단순
<ErrorBoundary>
  <RiskyComponent />
</ErrorBoundary>

// 2. 사용자 정의 fallback
<ErrorBoundary fallback={<p>오류가 발생했습니다.</p>}>
  <RiskyComponent />
</ErrorBoundary>

// 3. fallback render prop (error + reset 사용)
<ErrorBoundary fallback={({ error, reset }) => (
  <div>
    <p>{error.message}</p>
    <button onClick={reset}>다시 시도</button>
  </div>
)}>
  <RiskyComponent />
</ErrorBoundary>

// 4. onError 콜백 (로깅/Sentry 등)
<ErrorBoundary onError={(error, info) => Sentry.captureException(error)}>
  <App />
</ErrorBoundary>

// 5. resetKeys — 외부 dependency 변경 시 자동 reset
<ErrorBoundary resetKeys={[userId]}>
  <UserProfile id={userId} />
</ErrorBoundary>

// 6. theme + 디버그 정보 토글
<ErrorBoundary theme="dark" showDebugInfo>
  <App />
</ErrorBoundary>

// 7. useErrorHandler 훅 — 자식 컴포넌트에서 명시적 throw
function Inner() {
  const handleError = useErrorHandler();
  const fetchData = async () => {
    try { await api.fetch(); }
    catch (e) { handleError(e); } // ErrorBoundary로 전파
  };
}
```

핵심 원칙:
- **클래스 컴포넌트** — React API 제약상 필수.
- **기본 fallback UI** 제공 + 사용자 override 가능.
- **`reset()` 메서드** — fallback에서 호출 시 children 다시 마운트 (state 리셋).
- **`resetKeys`**: 키 배열 변경 시 자동 reset (data fetch 재시도 흔한 패턴).
- **`onError` 콜백**: 로깅·모니터링 hook.
- **fallback render prop** — error + reset 받아 자유 UI.
- **`useErrorHandler` 훅**: 명시적 throw (try/catch 안에서 React tree에 전파).

---

## 1. Goals / Non-goals

### Goals (v1)
1. `ErrorBoundary` 클래스 컴포넌트.
2. `fallback`: ReactNode 또는 `({ error, reset, errorInfo }) => ReactNode`.
3. 기본 fallback (사용자 미지정 시): "오류가 발생했습니다" + 재시도 버튼.
4. `onError(error, errorInfo)` 콜백.
5. `resetKeys: any[]` — 변경 시 자동 reset.
6. `onReset()` 콜백.
7. `theme: "light" | "dark"`.
8. `showDebugInfo: boolean` — 기본 false. true면 error.message + stack 표시.
9. `useErrorHandler()` 훅 — 자식에서 `throw` 외 명시적 에러 전파.
10. `withErrorBoundary` HOC.

### Non-goals (v1)
- 비동기 에러 자동 캡처 (React 자체가 async error를 boundary에서 잡지 않음 — useErrorHandler로 우회).
- Suspense boundary 자동 통합.
- error reporting (Sentry 등) 자체 구현 — onError로 사용자 wiring.
- nested boundary 자동 routing.

---

## 2. 공개 API

### 2.1 타입 — `src/components/ErrorBoundary/ErrorBoundary.types.ts`

```ts
import type { ErrorInfo, ReactNode } from "react";

export type ErrorBoundaryTheme = "light" | "dark";

export interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  reset: () => void;
}

export type ErrorBoundaryFallback =
  | ReactNode
  | ((props: ErrorBoundaryFallbackProps) => ReactNode);

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ErrorBoundaryFallback;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: unknown[];
  theme?: ErrorBoundaryTheme;
  showDebugInfo?: boolean;
}

export interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
```

### 2.2 컴포넌트 — `src/components/ErrorBoundary/ErrorBoundary.tsx`

```tsx
import { Component, type ErrorInfo, type ReactNode } from "react";
import type { ErrorBoundaryProps, ErrorBoundaryState } from "./ErrorBoundary.types";
import { DefaultFallback } from "./DefaultFallback";

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && this.props.resetKeys) {
      const keysChanged = !prevProps.resetKeys ||
        this.props.resetKeys.length !== prevProps.resetKeys.length ||
        this.props.resetKeys.some((k, i) => k !== prevProps.resetKeys![i]);
      if (keysChanged) this.reset();
    }
  }

  reset = () => {
    this.setState({ error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    const { error, errorInfo } = this.state;
    const { children, fallback, theme = "light", showDebugInfo = false } = this.props;

    if (error) {
      const fbProps = { error, errorInfo, reset: this.reset };
      if (typeof fallback === "function") return fallback(fbProps);
      if (fallback !== undefined) return fallback;
      return <DefaultFallback {...fbProps} theme={theme} showDebugInfo={showDebugInfo} />;
    }

    return children;
  }
}
```

### 2.3 DefaultFallback — `src/components/ErrorBoundary/DefaultFallback.tsx`

```tsx
import type { CSSProperties } from "react";
import { Icon } from "../Icon";
import type { ErrorBoundaryFallbackProps, ErrorBoundaryTheme } from "./ErrorBoundary.types";

interface DefaultFallbackProps extends ErrorBoundaryFallbackProps {
  theme: ErrorBoundaryTheme;
  showDebugInfo: boolean;
}

const themes = {
  light: { bg: "#fef2f2", border: "#fecaca", fg: "#7f1d1d", btnBg: "#dc2626", btnFg: "#fff" },
  dark:  { bg: "#1f2937", border: "rgba(239,68,68,0.5)", fg: "#fca5a5", btnBg: "#ef4444", btnFg: "#0f172a" },
} as const;

export function DefaultFallback({ error, errorInfo, reset, theme, showDebugInfo }: DefaultFallbackProps) {
  const t = themes[theme];

  return (
    <div role="alert" style={{
      padding: 16, borderRadius: 8, border: `1px solid ${t.border}`,
      background: t.bg, color: t.fg, fontFamily: "inherit",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon name="error" size="lg" />
        <strong style={{ fontSize: 14 }}>오류가 발생했습니다</strong>
      </div>
      <p style={{ margin: "4px 0", fontSize: 13 }}>{error.message}</p>
      {showDebugInfo && (
        <details style={{ marginTop: 8, fontSize: 11, fontFamily: "monospace" }}>
          <summary style={{ cursor: "pointer" }}>Debug info</summary>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{error.stack}</pre>
          {errorInfo?.componentStack && (
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{errorInfo.componentStack}</pre>
          )}
        </details>
      )}
      <button
        onClick={reset}
        style={{
          marginTop: 12, padding: "6px 12px", borderRadius: 4,
          border: "none", background: t.btnBg, color: t.btnFg,
          cursor: "pointer", fontSize: 13,
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
```

### 2.4 useErrorHandler — `src/components/ErrorBoundary/useErrorHandler.ts`

```ts
import { useCallback, useState } from "react";

/**
 * 자식 컴포넌트에서 명시적으로 에러를 ErrorBoundary로 전파.
 *
 * @example
 *   const handleError = useErrorHandler();
 *   try { await api.fetch(); } catch (e) { handleError(e); }
 */
export function useErrorHandler(): (error: unknown) => void {
  const [, setError] = useState<Error | null>(null);

  return useCallback((error: unknown) => {
    setError(() => {
      // setState 안에서 throw → React가 commit phase에 catch → ErrorBoundary로 전파
      throw error instanceof Error ? error : new Error(String(error));
    });
  }, []);
}
```

### 2.5 withErrorBoundary HOC

```tsx
import { ComponentType, type Ref, forwardRef } from "react";

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  boundaryProps?: Omit<ErrorBoundaryProps, "children">,
): ComponentType<P> {
  const Wrapped = forwardRef<unknown, P>((props, ref) => (
    <ErrorBoundary {...boundaryProps}>
      <Component {...props} ref={ref as Ref<any>} />
    </ErrorBoundary>
  ));
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? "Anonymous"})`;
  return Wrapped as ComponentType<P>;
}
```

### 2.6 배럴

```ts
export { ErrorBoundary } from "./ErrorBoundary";
export { useErrorHandler } from "./useErrorHandler";
export { withErrorBoundary } from "./withErrorBoundary";
export type {
  ErrorBoundaryProps,
  ErrorBoundaryFallback,
  ErrorBoundaryFallbackProps,
  ErrorBoundaryTheme,
  ErrorBoundaryState,
} from "./ErrorBoundary.types";
```

---

## 3. 파일 구조

```
src/components/ErrorBoundary/
├── ErrorBoundary.tsx
├── ErrorBoundary.types.ts
├── DefaultFallback.tsx
├── useErrorHandler.ts
├── withErrorBoundary.tsx
└── index.ts
```

---

## 4. 데모 페이지

```tsx
function BuggyButton({ shouldFail }: { shouldFail: boolean }) {
  if (shouldFail) throw new Error("의도적인 에러");
  return <button>정상</button>;
}

export function ErrorBoundaryPage() {
  const [fail, setFail] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <div>
      <h1>ErrorBoundary</h1>

      <Card.Root><Card.Header>Basic — 기본 fallback</Card.Header><Card.Body>
        <button onClick={() => setFail(true)}>에러 발생</button>
        <ErrorBoundary onReset={() => setFail(false)}>
          <BuggyButton shouldFail={fail} />
        </ErrorBoundary>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>커스텀 fallback (render prop)</Card.Header><Card.Body>
        <ErrorBoundary fallback={({ error, reset }) => (
          <div style={{padding:12,background:"#fee",borderRadius:4}}>
            <p>커스텀: {error.message}</p>
            <button onClick={reset}>리셋</button>
          </div>
        )}>
          <BuggyButton shouldFail={fail} />
        </ErrorBoundary>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>resetKeys</Card.Header><Card.Body>
        <button onClick={() => setResetKey(k => k+1)}>resetKey++</button>
        <ErrorBoundary resetKeys={[resetKey]}>
          <BuggyButton shouldFail={fail} />
        </ErrorBoundary>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>showDebugInfo</Card.Header><Card.Body>
        <ErrorBoundary showDebugInfo>
          <BuggyButton shouldFail={fail} />
        </ErrorBoundary>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>useErrorHandler 훅</Card.Header><Card.Body>
        <ErrorBoundary>
          <AsyncFetcher />
        </ErrorBoundary>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark theme</Card.Header><Card.Body>
        <ErrorBoundary theme="dark">
          <BuggyButton shouldFail={fail} />
        </ErrorBoundary>
      </Card.Body></Card.Root>
    </div>
  );
}

function AsyncFetcher() {
  const handleError = useErrorHandler();
  return (
    <button onClick={() => {
      try { throw new Error("async!"); }
      catch (e) { handleError(e); }
    }}>
      async 에러 트리거
    </button>
  );
}
```

---

## 5. 접근성

- DefaultFallback: `role="alert"` — 에러 발생 시 자동 스크린리더 알림.
- 재시도 버튼: 표준 button.
- showDebugInfo의 `<details>`: 키보드 펼침/접힘.

---

## 6. Edge cases

- **이벤트 핸들러 안 에러**: React boundary가 catch 안 함 — useErrorHandler로 명시 전파 필요.
- **비동기 (setTimeout, promise)**: 동일. useErrorHandler 사용.
- **render 중 에러 무한 반복**: 사용자 책임. v1 미보호.
- **resetKeys 함수 비교**: shallow compare. 함수면 매번 다름 → 무한 리셋. 사용자 책임.
- **부모 ErrorBoundary가 자식 ErrorBoundary 잡음**: React가 가장 가까운 boundary로 전파 — 자식이 먼저 잡음 정상.
- **SSR**: getDerivedStateFromError + componentDidCatch는 서버에서도 정상 작동.

---

## 7. 구현 단계
- Phase 1: 컴포넌트 + 훅 + HOC
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 6개 파일
- [ ] typecheck/build
- [ ] 기본 fallback 작동
- [ ] 커스텀 fallback (node + render prop) 작동
- [ ] resetKeys 자동 리셋
- [ ] useErrorHandler 작동
- [ ] showDebugInfo 토글
- [ ] dark theme
- [ ] candidates / README
