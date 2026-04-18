# Toast / Notification 컴포넌트 설계문서

## Context

plastic 라이브러리에 6번째 컴포넌트 `Toast`를 추가한다.
앱 전역 알림을 위한 토스트/노티피케이션 시스템으로, **Provider 기반 컨텍스트 관리**, **명령형 hook API**, **선언적 compound component** 두 가지 사용 방식을 모두 지원한다.

핵심 기능:
- 6개 포지션에서 슬라이드+페이드 애니메이션으로 진입/퇴장
- `default`, `success`, `error`, `warning`, `info` 5가지 variant
- 자동 dismiss (프로그레스 바 시각화), 호버 시 일시정지
- 스와이프 dismiss (터치/마우스)
- 스택 관리 (최대 표시 수, 리플로우 애니메이션)
- `toast.promise()` 비동기 작업 추적
- light/dark 테마
- WAI-ARIA 접근성 (`role="status"`, `role="alert"`, `aria-live`)

---

## Compound Component 구조

```
ToastProvider          앱 래퍼, 토스트 스택 상태 관리, 포탈 렌더링
useToast()             명령형 API hook (show, dismiss, dismissAll, promise)

Toast.Root             개별 토스트 컨테이너
Toast.Icon             리딩 아이콘 영역
Toast.Content          제목 + 설명 텍스트
Toast.Action           액션 버튼
Toast.Close            닫기 버튼
Toast.Progress         자동 dismiss 프로그레스 바
```

---

## 사용 패턴

### 1. Provider 설정

```tsx
import { ToastProvider } from "plastic";

function App() {
  return (
    <ToastProvider position="bottom-right" maxToasts={5} theme="light">
      <MyApp />
    </ToastProvider>
  );
}
```

### 2. 명령형 API (useToast)

```tsx
import { useToast } from "plastic";

function MyComponent() {
  const toast = useToast();

  return (
    <div>
      {/* 기본 토스트 */}
      <button onClick={() => toast.show({
        title: "저장 완료",
        description: "변경사항이 저장되었습니다.",
        variant: "success",
        duration: 5000,
      })}>
        저장
      </button>

      {/* 액션이 있는 토스트 */}
      <button onClick={() => toast.show({
        title: "항목 삭제됨",
        description: "1개 항목이 삭제되었습니다.",
        variant: "default",
        duration: 8000,
        action: {
          label: "실행 취소",
          onClick: () => undoDelete(),
        },
      })}>
        삭제
      </button>

      {/* 영구 토스트 (수동 dismiss) */}
      <button onClick={() => {
        const id = toast.show({
          title: "업로드 진행 중",
          description: "파일을 업로드하고 있습니다...",
          variant: "info",
          duration: Infinity,
        });
        // 나중에 수동 dismiss
        setTimeout(() => toast.dismiss(id), 10000);
      }}>
        업로드
      </button>

      {/* 모두 닫기 */}
      <button onClick={() => toast.dismissAll()}>
        모두 닫기
      </button>
    </div>
  );
}
```

### 3. toast.promise() 비동기 추적

```tsx
import { useToast } from "plastic";

function SaveButton() {
  const toast = useToast();

  const handleSave = () => {
    toast.promise(saveData(), {
      loading: { title: "저장 중...", description: "서버에 데이터를 전송합니다." },
      success: { title: "저장 완료", description: "모든 변경사항이 저장되었습니다." },
      error: { title: "저장 실패", description: "다시 시도해 주세요." },
    });
  };

  return <button onClick={handleSave}>저장</button>;
}
```

### 4. 선언적 사용 (compound component)

```tsx
import { Toast, ToastProvider } from "plastic";

function Notifications({ items }: { items: ToastItem[] }) {
  return (
    <ToastProvider position="top-right" theme="dark">
      {items.map((item) => (
        <Toast.Root key={item.id} variant={item.variant} duration={item.duration}>
          <Toast.Icon />
          <Toast.Content title={item.title} description={item.description} />
          <Toast.Action label="Undo" onClick={item.onUndo} />
          <Toast.Close />
          <Toast.Progress />
        </Toast.Root>
      ))}
    </ToastProvider>
  );
}
```

### 5. 커스텀 렌더 함수

```tsx
toast.show({
  variant: "default",
  duration: 6000,
  render: ({ dismiss }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <img src={avatar} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />
      <div>
        <strong>새 메시지</strong>
        <p>안녕하세요! 확인 부탁드립니다.</p>
      </div>
      <button onClick={dismiss}>닫기</button>
    </div>
  ),
});
```

---

## TypeScript 인터페이스

### 테마 & Variant 타입

```typescript
export type ToastTheme = "light" | "dark";
export type ToastVariant = "default" | "success" | "error" | "warning" | "info";
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
export type ToastStackOrder = "newest-first" | "oldest-first";

export type ToastPhase =
  | "entering"
  | "idle"
  | "exiting"
  | "swiping";
```

### ToastData (내부 상태)

```typescript
export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | undefined;
}

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string | undefined;
  duration: number;                          // ms, Infinity for persistent
  action?: ToastAction | undefined;
  render?: ((api: { dismiss: () => void }) => ReactNode) | undefined;
  pauseOnHover?: boolean | undefined;        // default: true
  swipeDismissible?: boolean | undefined;    // default: true
  createdAt: number;                         // Date.now()
  ariaLive?: "polite" | "assertive" | undefined;  // default: variant === "error" ? "assertive" : "polite"
}
```

### ToastProvider Props

```typescript
export interface ToastProviderProps {
  children: ReactNode;

  // ── 위치 & 스택 ─────────────────────────────
  position?: ToastPosition | undefined;       // default: "bottom-right"
  stackOrder?: ToastStackOrder | undefined;   // default: "newest-first"
  maxToasts?: number | undefined;             // default: 5

  // ── 기본값 ──────────────────────────────────
  defaultDuration?: number | undefined;       // default: 5000 (ms)
  pauseOnHover?: boolean | undefined;         // default: true
  swipeDismissible?: boolean | undefined;     // default: true

  // ── 테마 ────────────────────────────────────
  theme?: ToastTheme | undefined;

  // ── 스와이프 ────────────────────────────────
  swipeThreshold?: number | undefined;        // default: 100 (px)
  swipeDirection?: "horizontal" | "vertical" | undefined;  // default: "horizontal"

  // ── 콜백 ────────────────────────────────────
  onDismiss?: ((id: string) => void) | undefined;
  onAutoClose?: ((id: string) => void) | undefined;

  // ── 접근성 ──────────────────────────────────
  label?: string | undefined;                 // aria-label for viewport, default: "Notifications"

  // ── 스타일 오버라이드 ───────────────────────
  className?: string | undefined;
  style?: CSSProperties | undefined;
  toastClassName?: string | undefined;        // 개별 토스트에 전달
  toastStyle?: CSSProperties | undefined;
}
```

### useToast() 반환 타입

```typescript
export interface ShowToastOptions {
  title: string;
  description?: string | undefined;
  variant?: ToastVariant | undefined;          // default: "default"
  duration?: number | undefined;               // default: provider의 defaultDuration
  action?: ToastAction | undefined;
  render?: ((api: { dismiss: () => void }) => ReactNode) | undefined;
  pauseOnHover?: boolean | undefined;
  swipeDismissible?: boolean | undefined;
  ariaLive?: "polite" | "assertive" | undefined;
}

export interface PromiseToastOptions<T> {
  loading: Omit<ShowToastOptions, "variant" | "duration">;
  success: Omit<ShowToastOptions, "variant"> | ((data: T) => Omit<ShowToastOptions, "variant">);
  error: Omit<ShowToastOptions, "variant"> | ((err: unknown) => Omit<ShowToastOptions, "variant">);
}

export interface UseToastReturn {
  show: (options: ShowToastOptions) => string;     // returns toast id
  dismiss: (id: string) => void;
  dismissAll: () => void;
  promise: <T>(promise: Promise<T>, options: PromiseToastOptions<T>) => Promise<T>;
  toasts: readonly ToastData[];                    // read-only snapshot
}
```

### Toast.Root Props

```typescript
export interface ToastRootProps extends HTMLAttributes<HTMLDivElement> {
  // ── 선언적 사용 시 ──────────────────────────
  variant?: ToastVariant | undefined;
  duration?: number | undefined;
  pauseOnHover?: boolean | undefined;
  swipeDismissible?: boolean | undefined;
  onDismiss?: (() => void) | undefined;

  // ── 내부 (Provider가 주입) ──────────────────
  /** @internal */ toastId?: string | undefined;
  /** @internal */ phase?: ToastPhase | undefined;

  // ── 스타일 ──────────────────────────────────
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children: ReactNode;
}
```

### Toast.Icon Props

```typescript
export interface ToastIconProps extends HTMLAttributes<HTMLDivElement> {
  /** 커스텀 아이콘. 미지정 시 variant에 맞는 기본 아이콘 렌더링 */
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Toast.Content Props

```typescript
export interface ToastContentProps extends HTMLAttributes<HTMLDivElement> {
  title?: string | undefined;
  description?: string | undefined;
  /** children을 사용하면 title/description 대신 커스텀 렌더 */
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Toast.Action Props

```typescript
export interface ToastActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Toast.Close Props

```typescript
export interface ToastCloseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** 커스텀 닫기 아이콘 */
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Toast.Progress Props

```typescript
export interface ToastProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** 시각적 variant (기본: 부모 Toast.Root의 variant 상속) */
  variant?: ToastVariant | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

---

## Context/Provider 구조

### ToastContext (내부)

```typescript
interface ToastContextValue {
  // ── 토스트 관리 ─────────────────────────────
  toasts: ToastData[];
  show: (options: ShowToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  promise: <T>(promise: Promise<T>, options: PromiseToastOptions<T>) => Promise<T>;

  // ── Provider 설정 ───────────────────────────
  position: ToastPosition;
  stackOrder: ToastStackOrder;
  maxToasts: number;
  defaultDuration: number;
  pauseOnHover: boolean;
  swipeDismissible: boolean;
  swipeThreshold: number;
  swipeDirection: "horizontal" | "vertical";
  theme: ToastTheme;
  label: string;

  // ── 콜백 ────────────────────────────────────
  onDismiss?: ((id: string) => void) | undefined;
  onAutoClose?: ((id: string) => void) | undefined;
}

const ToastContext = createContext<ToastContextValue | null>(null);
```

### ToastItemContext (각 토스트 내부)

```typescript
interface ToastItemContextValue {
  id: string;
  variant: ToastVariant;
  phase: ToastPhase;
  duration: number;
  elapsed: number;                 // 경과 ms (프로그레스 바용)
  isPaused: boolean;
  dismiss: () => void;
  theme: ToastTheme;
}

const ToastItemContext = createContext<ToastItemContextValue | null>(null);
```

### Provider 내부 상태 관리

```typescript
// ToastProvider 내부
interface ToastInternalState {
  id: string;
  data: ToastData;
  phase: ToastPhase;
  elapsed: number;
  isPaused: boolean;
  swipeOffset: number;             // px
  swipeOpacity: number;            // 0-1
}

function toastReducer(
  state: ToastInternalState[],
  action: ToastReducerAction,
): ToastInternalState[] {
  switch (action.type) {
    case "ADD":         // 새 토스트 추가, maxToasts 초과 시 가장 오래된 것 exiting 처리
    case "DISMISS":     // phase를 "exiting"으로 전환
    case "DISMISS_ALL": // 모든 토스트 "exiting"
    case "REMOVE":      // 애니메이션 완료 후 배열에서 제거
    case "TICK":        // elapsed 업데이트
    case "PAUSE":       // isPaused = true
    case "RESUME":      // isPaused = false
    case "SWIPE":       // swipeOffset/swipeOpacity 업데이트
    case "UPDATE":      // promise() 상태 전환 시 data 갱신
  }
}
```

---

## 상태 머신

### 개별 토스트 라이프사이클

```
                    show()
                      │
                      ▼
              ┌──────────────┐
              │   ENTERING   │  300ms 진입 애니메이션
              │  slide+fade  │
              └──────┬───────┘
                     │ animation 완료
                     ▼
              ┌──────────────┐
              │     IDLE     │  duration 타이머 실행 중
              │              │◄────── RESUME (hover out)
              │  elapsed +=  │
              │  deltaTime   ├──────► PAUSE (hover in)
              └──────┬───────┘        │
                     │                │ (elapsed 멈춤)
                     │                │
                     │ elapsed >= duration
                     │ OR dismiss() 호출
                     │ OR swipe threshold 도달
                     ▼
              ┌──────────────┐
              │   EXITING    │  200ms 퇴장 애니메이션
              │  slide+fade  │
              └──────┬───────┘
                     │ animation 완료
                     ▼
              ┌──────────────┐
              │   REMOVED    │  배열에서 제거
              └──────────────┘

스와이프 중간 상태 (IDLE에서 분기):
              ┌──────────────┐
              │   SWIPING    │  pointer move 추적
              │              │
              │  offset < T  ├──────► IDLE (pointer up, 복귀)
              │  offset >= T ├──────► EXITING (threshold 도달)
              └──────────────┘
```

### promise() 토스트 상태 전이

```
  promise() 호출
       │
       ▼
  ┌───────────────┐
  │   LOADING     │  variant="info", duration=Infinity
  │   spinner     │
  └───────┬───────┘
          │
     ┌────┴────┐
     │         │
  resolved   rejected
     │         │
     ▼         ▼
  SUCCESS    ERROR
  variant=   variant=
  "success"  "error"
  duration=  duration=
  5000       8000
```

### Provider 스택 관리

```
  새 토스트 추가 시:
    visible = toasts.filter(t => t.phase !== "removed")
    if visible.length > maxToasts:
      oldest = visible[0] (stackOrder==="newest-first" 기준)
      oldest.phase = "exiting"

  exiting 토스트의 퇴장 애니메이션 완료 시:
    → reducer "REMOVE" → 배열에서 완전 삭제

  reflow:
    나머지 토스트들의 위치가 CSS transition으로 자연스럽게 이동
```

---

## DOM 구조

### ToastProvider 렌더

```html
<!-- Provider 자체는 children만 렌더 -->
<ToastContext.Provider value={ctx}>
  {children}

  {/* Portal: document.body에 부착 */}
  {createPortal(
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      style={{
        position: "fixed",
        zIndex: 9999,
        /* position에 따라 top/bottom/left/right 결정 (아래 참조) */
        ...positionStyles[position],
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "16px",
        pointerEvents: "none",      /* 개별 토스트만 이벤트 받음 */
        maxHeight: "100vh",
        overflow: "hidden",
      }}
      className={className}
    >
      {visibleToasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body
  )}
</ToastContext.Provider>
```

### Position 스타일 맵

```typescript
const positionStyles: Record<ToastPosition, CSSProperties> = {
  "top-left":      { top: 0, left: 0, alignItems: "flex-start" },
  "top-center":    { top: 0, left: "50%", transform: "translateX(-50%)", alignItems: "center" },
  "top-right":     { top: 0, right: 0, alignItems: "flex-end" },
  "bottom-left":   { bottom: 0, left: 0, alignItems: "flex-start" },
  "bottom-center": { bottom: 0, left: "50%", transform: "translateX(-50%)", alignItems: "center" },
  "bottom-right":  { bottom: 0, right: 0, alignItems: "flex-end" },
};
```

### Toast.Root DOM

```html
<div
  role={variant === "error" ? "alert" : "status"}
  aria-live={variant === "error" ? "assertive" : "polite"}
  aria-atomic="true"
  data-toast-id={id}
  data-variant={variant}
  data-phase={phase}
  style={{
    pointerEvents: "auto",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "8px",
    boxShadow: theme === "light"
      ? "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)"
      : "0 4px 12px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)",
    border: `1px solid ${borderColor}`,
    backgroundColor: bgColor,
    color: textColor,
    minWidth: "300px",
    maxWidth: "420px",
    width: "100%",
    position: "relative",
    overflow: "hidden",
    /* 애니메이션 */
    transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
    transform: `translateX(${swipeOffset}px)`,
    opacity: swipeOpacity,
    /* 진입/퇴장 애니메이션은 phase에 따라 동적 적용 */
    ...phaseStyle,
    ...userStyle,
  }}
  onPointerDown={handlePointerDown}
  onPointerMove={handlePointerMove}
  onPointerUp={handlePointerUp}
  onPointerEnter={handleHoverEnter}
  onPointerLeave={handleHoverLeave}
  className={className}
  {...rest}
>
  {children}
</div>
```

### Toast.Icon DOM

```html
<div
  style={{
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    marginTop: "2px",
    color: iconColor,     /* variant별 색상 */
  }}
  className={className}
  {...rest}
>
  {children ?? <DefaultVariantIcon variant={variant} />}
</div>
```

### Toast.Content DOM

```html
<div
  style={{
    flex: 1,
    minWidth: 0,
  }}
  className={className}
  {...rest}
>
  {children ?? (
    <>
      {title && (
        <p style={{
          margin: 0,
          fontSize: "14px",
          fontWeight: 600,
          lineHeight: "20px",
          color: titleColor,
        }}>
          {title}
        </p>
      )}
      {description && (
        <p style={{
          margin: "2px 0 0",
          fontSize: "13px",
          fontWeight: 400,
          lineHeight: "18px",
          color: descColor,
        }}>
          {description}
        </p>
      )}
    </>
  )}
</div>
```

### Toast.Action DOM

```html
<button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    onClick();
  }}
  style={{
    flexShrink: 0,
    alignSelf: "center",
    padding: "4px 12px",
    fontSize: "13px",
    fontWeight: 500,
    lineHeight: "20px",
    borderRadius: "6px",
    border: actionVariant === "primary"
      ? "none"
      : `1px solid ${actionBorderColor}`,
    backgroundColor: actionVariant === "primary"
      ? actionPrimaryBg
      : "transparent",
    color: actionVariant === "primary"
      ? "#ffffff"
      : actionTextColor,
    cursor: "pointer",
    transition: "background-color 150ms ease",
  }}
  className={className}
  {...rest}
>
  {label}
</button>
```

### Toast.Close DOM

```html
<button
  type="button"
  aria-label="Close notification"
  onClick={(e) => {
    e.stopPropagation();
    dismiss();
  }}
  style={{
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    padding: 0,
    border: "none",
    borderRadius: "4px",
    backgroundColor: "transparent",
    color: closeColor,
    cursor: "pointer",
    transition: "background-color 150ms ease, color 150ms ease",
  }}
  onPointerEnter={(e) => {
    (e.currentTarget as HTMLElement).style.backgroundColor = closeHoverBg;
  }}
  onPointerLeave={(e) => {
    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
  }}
  className={className}
  {...rest}
>
  {children ?? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="3" x2="11" y2="11" />
      <line x1="11" y1="3" x2="3" y2="11" />
    </svg>
  )}
</button>
```

### Toast.Progress DOM

```html
<div
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={progressPercent}
  style={{
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "3px",
    backgroundColor: progressTrackColor,
    overflow: "hidden",
    borderRadius: "0 0 8px 8px",
  }}
  className={className}
  {...rest}
>
  <div
    style={{
      height: "100%",
      width: `${100 - progressPercent}%`,
      backgroundColor: progressBarColor,
      transition: isPaused ? "none" : "width 100ms linear",
    }}
  />
</div>
```

---

## 테마 색상 맵

### 토스트 배경 & 테두리

```typescript
const toastBg: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#ffffff",
    success: "#f0fdf4",     // green-50
    error:   "#fef2f2",     // red-50
    warning: "#fffbeb",     // amber-50
    info:    "#eff6ff",     // blue-50
  },
  dark: {
    default: "#1e293b",     // slate-800
    success: "#052e16",     // green-950
    error:   "#450a0a",     // red-950
    warning: "#451a03",     // amber-950
    info:    "#172554",     // blue-950
  },
};

const toastBorder: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#e5e7eb",     // gray-200
    success: "#bbf7d0",     // green-200
    error:   "#fecaca",     // red-200
    warning: "#fde68a",     // amber-200
    info:    "#bfdbfe",     // blue-200
  },
  dark: {
    default: "#334155",     // slate-700
    success: "#14532d",     // green-900
    error:   "#7f1d1d",     // red-900
    warning: "#78350f",     // amber-900
    info:    "#1e3a5f",     // blue-900
  },
};
```

### 아이콘 색상

```typescript
const iconColor: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#6b7280",     // gray-500
    success: "#16a34a",     // green-600
    error:   "#dc2626",     // red-600
    warning: "#d97706",     // amber-600
    info:    "#2563eb",     // blue-600
  },
  dark: {
    default: "#9ca3af",     // gray-400
    success: "#22c55e",     // green-500
    error:   "#ef4444",     // red-500
    warning: "#f59e0b",     // amber-500
    info:    "#3b82f6",     // blue-500
  },
};
```

### 텍스트 색상

```typescript
const titleColor: Record<ToastTheme, string> = {
  light: "#111827",         // gray-900
  dark:  "#f1f5f9",         // slate-100
};

const descColor: Record<ToastTheme, string> = {
  light: "#6b7280",         // gray-500
  dark:  "#94a3b8",         // slate-400
};
```

### 닫기 버튼

```typescript
const closeColor: Record<ToastTheme, string> = {
  light: "#9ca3af",         // gray-400
  dark:  "#64748b",         // slate-500
};

const closeHoverBg: Record<ToastTheme, string> = {
  light: "#f3f4f6",         // gray-100
  dark:  "#334155",         // slate-700
};
```

### 액션 버튼

```typescript
const actionBorderColor: Record<ToastTheme, string> = {
  light: "#d1d5db",         // gray-300
  dark:  "#475569",         // slate-600
};

const actionTextColor: Record<ToastTheme, string> = {
  light: "#374151",         // gray-700
  dark:  "#e2e8f0",         // slate-200
};

const actionPrimaryBg: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#3b82f6",     // blue-500
    success: "#16a34a",     // green-600
    error:   "#dc2626",     // red-600
    warning: "#d97706",     // amber-600
    info:    "#2563eb",     // blue-600
  },
  dark: {
    default: "#3b82f6",
    success: "#22c55e",
    error:   "#ef4444",
    warning: "#f59e0b",
    info:    "#3b82f6",
  },
};
```

### 프로그레스 바

```typescript
const progressTrackColor: Record<ToastTheme, string> = {
  light: "#f3f4f6",         // gray-100
  dark:  "#1e293b",         // slate-800
};

const progressBarColor: Record<ToastTheme, Record<ToastVariant, string>> = {
  light: {
    default: "#9ca3af",     // gray-400
    success: "#22c55e",     // green-500
    error:   "#ef4444",     // red-500
    warning: "#f59e0b",     // amber-500
    info:    "#3b82f6",     // blue-500
  },
  dark: {
    default: "#64748b",     // slate-500
    success: "#16a34a",     // green-600
    error:   "#dc2626",     // red-600
    warning: "#d97706",     // amber-600
    info:    "#2563eb",     // blue-600
  },
};
```

---

## 애니메이션 스펙

### 진입 애니메이션 (ENTERING, 300ms)

```typescript
const ENTER_DURATION = 300;  // ms
const ENTER_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";  // ease-out-expo

// 방향별 초기 transform
const enterFrom: Record<ToastPosition, CSSProperties> = {
  "top-left":      { transform: "translateX(-100%)", opacity: 0 },
  "top-center":    { transform: "translateY(-100%)",  opacity: 0 },
  "top-right":     { transform: "translateX(100%)",  opacity: 0 },
  "bottom-left":   { transform: "translateX(-100%)", opacity: 0 },
  "bottom-center": { transform: "translateY(100%)",  opacity: 0 },
  "bottom-right":  { transform: "translateX(100%)",  opacity: 0 },
};

// 진입 완료 상태
const enterTo: CSSProperties = {
  transform: "translateX(0) translateY(0)",
  opacity: 1,
};
```

구현 방식: `phase === "entering"` 일 때 초기 스타일 적용 후, `requestAnimationFrame` 2프레임 후 목표 스타일로 전환. `transition` 속성이 보간 처리.

```typescript
// ToastItem 내부
useEffect(() => {
  if (phase !== "entering") return;
  const el = rootRef.current;
  if (!el) return;

  // 1프레임: 초기 위치 적용 (transition 없이)
  Object.assign(el.style, enterFrom[position]);
  el.style.transition = "none";

  // 2프레임: 목표 위치로 애니메이션
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = `transform ${ENTER_DURATION}ms ${ENTER_EASING}, opacity ${ENTER_DURATION}ms ${ENTER_EASING}`;
      Object.assign(el.style, enterTo);
    });
  });

  const timer = setTimeout(() => {
    dispatch({ type: "SET_PHASE", id, phase: "idle" });
  }, ENTER_DURATION);

  return () => clearTimeout(timer);
}, [phase, position, id]);
```

### 퇴장 애니메이션 (EXITING, 200ms)

```typescript
const EXIT_DURATION = 200;  // ms
const EXIT_EASING = "cubic-bezier(0.4, 0, 1, 1)";  // ease-in

// 방향별 퇴장 transform (진입의 역방향)
const exitTo: Record<ToastPosition, CSSProperties> = {
  "top-left":      { transform: "translateX(-100%)", opacity: 0 },
  "top-center":    { transform: "translateY(-100%)",  opacity: 0 },
  "top-right":     { transform: "translateX(100%)",  opacity: 0 },
  "bottom-left":   { transform: "translateX(-100%)", opacity: 0 },
  "bottom-center": { transform: "translateY(100%)",  opacity: 0 },
  "bottom-right":  { transform: "translateX(100%)",  opacity: 0 },
};
```

```typescript
// EXITING 시작 시
useEffect(() => {
  if (phase !== "exiting") return;
  const el = rootRef.current;
  if (!el) return;

  el.style.transition = `transform ${EXIT_DURATION}ms ${EXIT_EASING}, opacity ${EXIT_DURATION}ms ${EXIT_EASING}`;
  Object.assign(el.style, exitTo[position]);

  const timer = setTimeout(() => {
    dispatch({ type: "REMOVE", id });
  }, EXIT_DURATION);

  return () => clearTimeout(timer);
}, [phase, position, id]);
```

### 스택 리플로우 (토스트 추가/제거 시)

```typescript
// 토스트 컨테이너의 gap: 8px + flexDirection: column
// 토스트가 추가/제거되면 남은 토스트들이 자연스럽게 이동
// 각 토스트 root에 적용:
const REFLOW_TRANSITION = "transform 300ms cubic-bezier(0.16, 1, 0.3, 1)";
// → 위에서 이미 transition에 transform이 포함되어 있으므로 별도 처리 불필요
// flex 컨테이너의 gap 변화로 자연 리플로우 발생

// 추가 고려: 퇴장 토스트의 높이 collapse
// EXITING 상태에서 height도 함께 애니메이션:
el.style.transition = `transform ${EXIT_DURATION}ms ${EXIT_EASING}, opacity ${EXIT_DURATION}ms ${EXIT_EASING}, max-height ${EXIT_DURATION}ms ${EXIT_EASING}, margin ${EXIT_DURATION}ms ${EXIT_EASING}, padding ${EXIT_DURATION}ms ${EXIT_EASING}`;
el.style.maxHeight = "0px";
el.style.marginTop = "0px";
el.style.marginBottom = "0px";
el.style.paddingTop = "0px";
el.style.paddingBottom = "0px";
el.style.overflow = "hidden";
```

### Reduce Motion 지원

```typescript
// useReducedMotion hook
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return reduced;
}

// reduce motion 시:
// - ENTER_DURATION = 0, EXIT_DURATION = 0
// - 스와이프 대신 즉시 dismiss
// - 프로그레스 바는 width 변화만 (transition 제거)
```

---

## 스와이프 dismiss

### 포인터 핸들링

```typescript
// useToastSwipe.ts
interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isSwiping: boolean;
  pointerId: number | null;
}

function useToastSwipe(options: {
  enabled: boolean;
  threshold: number;          // default: 100px
  direction: "horizontal" | "vertical";
  onDismiss: () => void;
  rootRef: React.RefObject<HTMLDivElement>;
}) {
  const stateRef = useRef<SwipeState>({
    startX: 0, startY: 0, currentX: 0,
    isSwiping: false, pointerId: null,
  });
  const [offset, setOffset] = useState(0);
  const [opacity, setOpacity] = useState(1);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!options.enabled) return;
    stateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      isSwiping: false,
      pointerId: e.pointerId,
    };
    // pointer capture
    options.rootRef.current?.setPointerCapture(e.pointerId);
  }, [options.enabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (s.pointerId === null) return;
    if (e.pointerId !== s.pointerId) return;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    // 스와이프 감지: 수평 이동 > 수직 이동 * 1.5 이면 스와이프 시작
    if (!s.isSwiping) {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (options.direction === "horizontal" && absDx > 10 && absDx > absDy * 1.5) {
        s.isSwiping = true;
      } else if (options.direction === "vertical" && absDy > 10 && absDy > absDx * 1.5) {
        s.isSwiping = true;
      }
    }

    if (s.isSwiping) {
      e.preventDefault();
      const delta = options.direction === "horizontal" ? dx : dy;
      s.currentX = e.clientX;
      setOffset(delta);
      // opacity: threshold까지 1→0 비례 감소
      const progress = Math.min(Math.abs(delta) / options.threshold, 1);
      setOpacity(1 - progress * 0.5);   // 최소 0.5까지만
    }
  }, [options.direction, options.threshold]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const s = stateRef.current;
    if (s.pointerId === null) return;
    if (e.pointerId !== s.pointerId) return;

    options.rootRef.current?.releasePointerCapture(e.pointerId);

    if (s.isSwiping) {
      const delta = options.direction === "horizontal"
        ? e.clientX - s.startX
        : e.clientY - s.startY;

      if (Math.abs(delta) >= options.threshold) {
        // threshold 초과 → dismiss
        options.onDismiss();
      } else {
        // threshold 미달 → 원위치로 스냅백
        setOffset(0);
        setOpacity(1);
      }
    }

    stateRef.current = { startX: 0, startY: 0, currentX: 0, isSwiping: false, pointerId: null };
  }, [options.direction, options.threshold, options.onDismiss]);

  return { offset, opacity, handlePointerDown, handlePointerMove, handlePointerUp };
}
```

### 스냅백 애니메이션

```typescript
// threshold 미달 시 원위치 복귀:
// offset → 0, opacity → 1
// CSS transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1)
// isSwiping이 false일 때만 transition 활성화
const swipeTransition = isSwiping
  ? "none"
  : "transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease";
```

### 스와이프 dismiss 시 퇴장

```typescript
// threshold 초과 시:
// 1. swipe 방향으로 계속 슬라이드 (현재 velocity 유지)
// 2. transform: translateX(offset > 0 ? "100%" : "-100%")
// 3. opacity: 0
// 4. EXIT_DURATION 후 REMOVE
```

---

## 접근성

| 요소 | 속성 | 값 | 설명 |
|------|------|---|------|
| Viewport `<div>` | `role` | `"region"` | 토스트 컨테이너 랜드마크 |
| Viewport `<div>` | `aria-label` | Provider의 `label` prop (default: `"Notifications"`) | 스크린리더 식별 |
| Viewport `<div>` | `aria-live` | `"polite"` | 새 토스트 공지 |
| Toast.Root (variant !== "error") | `role` | `"status"` | 비긴급 상태 메시지 |
| Toast.Root (variant !== "error") | `aria-live` | `"polite"` | 현재 읽기 완료 후 공지 |
| Toast.Root (variant === "error") | `role` | `"alert"` | 긴급 알림 |
| Toast.Root (variant === "error") | `aria-live` | `"assertive"` | 즉시 공지 |
| Toast.Root | `aria-atomic` | `"true"` | 전체 내용 공지 |
| Toast.Close | `aria-label` | `"Close notification"` | 닫기 버튼 레이블 |
| Toast.Action | 네이티브 `<button>` | `label` prop | 액션 설명 |
| Toast.Progress | `role` | `"progressbar"` | 프로그레스 바 |
| Toast.Progress | `aria-valuemin` | `0` | |
| Toast.Progress | `aria-valuemax` | `100` | |
| Toast.Progress | `aria-valuenow` | `progressPercent` | 남은 시간 비율 |

### 키보드 내비게이션

```typescript
// ToastProvider 레벨에서 keydown 리스너
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Escape: 가장 최근 토스트 dismiss
    if (e.key === "Escape") {
      const latest = toasts[toasts.length - 1];
      if (latest && latest.phase === "idle") {
        dismiss(latest.id);
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [toasts, dismiss]);
```

### 포커스 관리

- Toast 내 `Toast.Action`, `Toast.Close` 버튼은 자연 tab order로 포커스 가능
- 토스트가 dismiss되면 포커스가 다음 토스트의 첫 포커서블 요소로 이동 (토스트가 없으면 document.body)
- 토스트 viewport에 `tabIndex={-1}`을 설정하여 프로그래밍적 포커스 가능

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 동시에 100개 토스트 show() 호출 | `maxToasts` 초과분은 즉시 `exiting` 처리. reducer에서 배치로 관리 |
| duration: 0 | 최소 duration을 1000ms로 클램프. 0 이하 값은 무시하고 defaultDuration 사용 |
| duration: Infinity | 자동 dismiss 비활성. 프로그레스 바 숨김. 수동 dismiss/스와이프만 가능 |
| Provider 미감싸고 useToast() 호출 | `useToast()` 내부에서 context가 null이면 `throw new Error("useToast must be used within a ToastProvider")` |
| 동일 show() 옵션 중복 호출 (스팸) | 각 호출은 고유 id 생성 → 중복 제거 없음. 소비자 책임으로 디바운스. maxToasts로 자연 제한 |
| promise()의 promise가 이미 settled | 즉시 success/error 토스트 표시. loading 토스트는 표시되지 않음 (microtask 체크) |
| 컴포넌트 unmount 중 타이머 | cleanup 함수에서 모든 setTimeout/requestAnimationFrame 정리 |
| SSR (Server-Side Rendering) | `createPortal`은 클라이언트에서만 실행. `typeof document !== "undefined"` 가드 |
| 브라우저 탭 비활성 | `document.visibilityState === "hidden"` 시 타이머 일시정지. 탭 복귀 시 재개 |
| 토스트 내 액션 클릭 시 bubbling | `e.stopPropagation()` — 스와이프 핸들러와 충돌 방지 |
| 매우 긴 title/description | `maxWidth: 420px` + `word-break: break-word`. description은 최대 3줄 (`-webkit-line-clamp: 3`) |
| 스와이프 중 새 토스트 추가 | 스와이프 중인 토스트는 독립적으로 처리. 새 토스트는 정상적으로 스택에 추가 |
| 호버 중 duration 만료 | `pauseOnHover=true` 시 hover 중 elapsed 증가 중단. hover out 후 남은 시간부터 재개 |
| Provider의 position prop 변경 | 기존 토스트들이 새 position으로 이동 (transition 적용) |
| Provider unmount | 모든 타이머 정리, 토스트 즉시 제거 (애니메이션 없이) |
| theme 동적 변경 | 기존 토스트들의 색상 즉시 업데이트 (transition: color/background-color 150ms) |
| render 함수와 sub-component 동시 사용 | `render`가 있으면 children 무시. render 함수가 우선 |
| toast.promise()에서 promise를 외부에서 reject | error 옵션의 함수 형태로 에러 객체 접근 가능 |

---

## Variant별 기본 아이콘 (인라인 SVG)

모든 아이콘: `width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"`

```typescript
function DefaultVariantIcon({ variant }: { variant: ToastVariant }) {
  switch (variant) {
    case "success":
      // 체크 원형: circle + polyline checkmark
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="8" />
          <polyline points="6.5,10 9,12.5 13.5,7.5" />
        </svg>
      );
    case "error":
      // X 원형: circle + 두 대각선
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="8" />
          <line x1="7.5" y1="7.5" x2="12.5" y2="12.5" />
          <line x1="12.5" y1="7.5" x2="7.5" y2="12.5" />
        </svg>
      );
    case "warning":
      // 삼각형 경고: triangle + exclamation
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2.5 L18.5 16.5 H1.5 Z" />
          <line x1="10" y1="8" x2="10" y2="11.5" />
          <circle cx="10" cy="14" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "info":
      // 정보 원형: circle + "i"
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="8" />
          <line x1="10" y1="9" x2="10" y2="14" />
          <circle cx="10" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "default":
    default:
      // 벨 아이콘
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2.5 C6.5 2.5 4 5.5 4 8.5 V12 L2.5 14.5 H17.5 L16 12 V8.5 C16 5.5 13.5 2.5 10 2.5 Z" />
          <path d="M8 14.5 C8 15.5 8.9 17 10 17 C11.1 17 12 15.5 12 14.5" />
        </svg>
      );
  }
}
```

### Loading 스피너 아이콘 (promise() loading 상태)

```typescript
function SpinnerIcon() {
  return (
    <svg
      width="20" height="20" viewBox="0 0 20 20"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round"
      style={{ animation: "plastic-toast-spin 1s linear infinite" }}
    >
      <path d="M10 2.5 A7.5 7.5 0 0 1 17.5 10" />
    </svg>
  );
}

// Provider가 주입하는 style 태그:
const KEYFRAMES_CSS = `
@keyframes plastic-toast-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
```

Provider가 마운트될 때 `<style>` 태그를 head에 삽입하여 keyframes를 등록한다.

```typescript
// ToastProvider 내부
useEffect(() => {
  const styleId = "plastic-toast-keyframes";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = KEYFRAMES_CSS;
  document.head.appendChild(style);

  return () => {
    // 다른 Provider가 있을 수 있으므로 제거하지 않음
  };
}, []);
```

---

## 자동 dismiss 타이머 구현

```typescript
// useToastTimer.ts
function useToastTimer(options: {
  duration: number;         // ms, Infinity면 비활성
  isPaused: boolean;
  onExpire: () => void;
}): { elapsed: number; progress: number } {
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (options.duration === Infinity) return;
    if (options.isPaused) return;

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      setElapsed((prev) => {
        const next = prev + delta;
        if (next >= options.duration) {
          options.onExpire();
          return options.duration;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [options.duration, options.isPaused]);

  // 탭 비활성 시 일시정지
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        // isPaused와 동일 효과 — RAF가 자동 중단됨
        cancelAnimationFrame(rafRef.current);
      }
      // visible 복귀 시 useEffect 재실행으로 자동 재개
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const progress = options.duration === Infinity
    ? 0
    : Math.min((elapsed / options.duration) * 100, 100);

  return { elapsed, progress };
}
```

---

## 고유 ID 생성

```typescript
let toastCounter = 0;

function generateToastId(): string {
  return `plastic-toast-${++toastCounter}-${Date.now().toString(36)}`;
}
```

---

## 수정 대상 파일

### 신규 생성

1. **`src/components/Toast/Toast.types.ts`**
   - 모든 타입 정의: `ToastTheme`, `ToastVariant`, `ToastPosition`, `ToastStackOrder`, `ToastPhase`, `ToastData`, `ToastAction`, `ShowToastOptions`, `PromiseToastOptions`, `UseToastReturn`, `ToastProviderProps`, `ToastRootProps`, `ToastIconProps`, `ToastContentProps`, `ToastActionProps`, `ToastCloseProps`, `ToastProgressProps`
   - 약 120줄

2. **`src/components/Toast/ToastContext.ts`**
   - `ToastContext`, `ToastItemContext` 생성 + `useToastContext()`, `useToastItemContext()` 안전 접근 hook
   - 약 40줄

3. **`src/components/Toast/useToastTimer.ts`**
   - 자동 dismiss 타이머 hook (`elapsed`, `progress` 반환)
   - `requestAnimationFrame` 기반 고정밀 타이머
   - 약 60줄

4. **`src/components/Toast/useToastSwipe.ts`**
   - 스와이프 dismiss 포인터 핸들링 hook
   - `offset`, `opacity`, pointer 이벤트 핸들러 반환
   - 약 100줄

5. **`src/components/Toast/useReducedMotion.ts`**
   - `prefers-reduced-motion` 미디어 쿼리 감지 hook
   - 약 20줄

6. **`src/components/Toast/toastReducer.ts`**
   - `ToastInternalState` 배열 관리 reducer
   - ADD, DISMISS, DISMISS_ALL, REMOVE, SET_PHASE, PAUSE, RESUME, UPDATE 액션
   - 약 90줄

7. **`src/components/Toast/ToastProvider.tsx`**
   - Provider 컴포넌트: reducer, context, portal 렌더링, keyframes 스타일 주입
   - 개별 `<ToastItem>` 래퍼 컴포넌트 포함
   - 약 200줄

8. **`src/components/Toast/useToast.ts`**
   - `useToast()` hook: context에서 `show`, `dismiss`, `dismissAll`, `promise` 추출
   - 약 30줄

9. **`src/components/Toast/ToastRoot.tsx`**
   - 개별 토스트 컨테이너. 진입/퇴장 애니메이션, 스와이프, hover 일시정지
   - `ToastItemContext.Provider` 래핑
   - 약 150줄

10. **`src/components/Toast/ToastIcon.tsx`**
    - 아이콘 영역. variant별 기본 SVG 아이콘 또는 커스텀 children
    - `DefaultVariantIcon`, `SpinnerIcon` 내부 컴포넌트 포함
    - 약 100줄

11. **`src/components/Toast/ToastContent.tsx`**
    - title + description 또는 커스텀 children
    - 약 50줄

12. **`src/components/Toast/ToastAction.tsx`**
    - 액션 버튼. variant에 따른 스타일링
    - 약 50줄

13. **`src/components/Toast/ToastClose.tsx`**
    - 닫기 버튼. X 아이콘 SVG
    - 약 40줄

14. **`src/components/Toast/ToastProgress.tsx`**
    - 프로그레스 바. `useToastItemContext()`에서 elapsed/duration 읽기
    - 약 40줄

15. **`src/components/Toast/Toast.tsx`**
    - `Object.assign` 조립: `Toast.Root`, `Toast.Icon`, `Toast.Content`, `Toast.Action`, `Toast.Close`, `Toast.Progress`
    - 약 20줄

16. **`src/components/Toast/index.ts`**
    - 배럴 export: `Toast`, `ToastProvider`, `useToast`, 모든 타입
    - 약 15줄

17. **`src/components/Toast/colors.ts`**
    - 모든 색상 맵 상수 (`toastBg`, `toastBorder`, `iconColor`, `titleColor`, `descColor`, `closeColor`, `closeHoverBg`, `actionBorderColor`, `actionTextColor`, `actionPrimaryBg`, `progressTrackColor`, `progressBarColor`)
    - 약 80줄

18. **`demo/src/pages/ToastPage.tsx`**
    - 데모 페이지 (상세 아래 참조)
    - 약 700줄

### 기존 수정

19. **`src/components/index.ts`**
    - `export * from "./Toast"` 1줄 추가

20. **`demo/src/App.tsx`**
    - `Page` type에 `"toast"` 추가
    - `import { ToastPage }` 추가
    - `NAV` 배열에 toast 엔트리 추가
    - 렌더 분기에 `{current === "toast" && <ToastPage />}` 추가
    - `<ToastProvider>` 래핑 (데모 전체가 아닌 ToastPage 내부에서 자체 Provider 사용)

---

## 데모 페이지

### NAV 엔트리

```typescript
{
  id: "toast", label: "Toast", description: "알림 토스트",
  sections: [
    { label: "Basic", id: "basic" },
    { label: "Positions", id: "positions" },
    { label: "Custom Content", id: "custom-content" },
    { label: "Auto Dismiss", id: "auto-dismiss" },
    { label: "Swipe Dismiss", id: "swipe-dismiss" },
    { label: "Stacking", id: "stacking" },
    { label: "Promise", id: "promise" },
    { label: "Persistent", id: "persistent" },
    { label: "Dark Theme", id: "dark-theme" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ],
}
```

### 데모 섹션 상세

#### 1. Basic (id: "basic")

5가지 variant 각각 버튼으로 토스트 트리거:
```tsx
<Section id="basic" title="Basic Variants">
  <button onClick={() => toast.show({ title: "알림", description: "기본 토스트입니다.", variant: "default" })}>
    Default
  </button>
  <button onClick={() => toast.show({ title: "성공", description: "작업이 완료되었습니다.", variant: "success" })}>
    Success
  </button>
  <button onClick={() => toast.show({ title: "오류", description: "문제가 발생했습니다.", variant: "error" })}>
    Error
  </button>
  <button onClick={() => toast.show({ title: "경고", description: "주의가 필요합니다.", variant: "warning" })}>
    Warning
  </button>
  <button onClick={() => toast.show({ title: "정보", description: "참고 사항입니다.", variant: "info" })}>
    Info
  </button>
</Section>
```

#### 2. Positions (id: "positions")

6개 포지션을 시각적 격자로 표시. 각 셀 클릭 시 해당 position에 토스트 표시.

```tsx
<Section id="positions" title="Positions">
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: 300 }}>
    {(["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as const).map(pos => (
      <button key={pos} onClick={() => setDemoPosition(pos)} style={{
        padding: "8px 4px", fontSize: 11,
        border: demoPosition === pos ? "2px solid #3b82f6" : "1px solid #d1d5db",
        borderRadius: 6, background: demoPosition === pos ? "#eff6ff" : "#fff",
      }}>
        {pos}
      </button>
    ))}
  </div>
  <button onClick={() => toast.show({ title: `위치: ${demoPosition}`, variant: "info" })}>
    토스트 표시
  </button>
</Section>
```
이 섹션은 자체 `<ToastProvider position={demoPosition}>` 래핑.

#### 3. Custom Content (id: "custom-content")

- 커스텀 아이콘 (이모지/이미지)
- 액션 버튼이 있는 토스트
- 긴 description
- render 함수 사용

```tsx
<Section id="custom-content" title="Custom Content">
  <button onClick={() => toast.show({
    title: "항목 삭제됨",
    description: "휴지통으로 이동했습니다.",
    action: { label: "실행 취소", onClick: () => toast.show({ title: "복원됨", variant: "success" }) },
  })}>
    액션 토스트
  </button>
  <button onClick={() => toast.show({
    variant: "default",
    render: ({ dismiss }) => (
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ fontSize: 24 }}>🎉</span>
        <div>
          <strong>축하합니다!</strong>
          <p style={{ margin: 0, fontSize: 13 }}>커스텀 렌더 토스트입니다.</p>
        </div>
        <button onClick={dismiss}>닫기</button>
      </div>
    ),
  })}>
    커스텀 렌더
  </button>
</Section>
```

#### 4. Auto Dismiss (id: "auto-dismiss")

duration 슬라이더 (1초~15초) + 프로그레스 바 활성/비활성 토글.

```tsx
<Section id="auto-dismiss" title="Auto Dismiss">
  <label>Duration: {duration}ms</label>
  <input type="range" min={1000} max={15000} step={500} value={duration} onChange={...} />
  <label>
    <input type="checkbox" checked={showProgress} onChange={...} />
    프로그레스 바 표시
  </label>
  <button onClick={() => toast.show({
    title: `${duration}ms 후 사라짐`, variant: "info", duration,
  })}>
    토스트 표시
  </button>
</Section>
```

#### 5. Swipe Dismiss (id: "swipe-dismiss")

스와이프 방향 (horizontal/vertical) 토글 + threshold 조정.
안내 텍스트: "토스트를 좌우로 스와이프하여 닫기".

#### 6. Stacking (id: "stacking")

"5개 연속 표시" 버튼 → 0.3초 간격으로 5개 토스트 추가.
maxToasts 입력으로 스택 최대 수 조정.

```tsx
<Section id="stacking" title="Stacking">
  <label>Max Toasts: {maxToasts}</label>
  <input type="range" min={1} max={10} value={maxToasts} onChange={...} />
  <button onClick={() => {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        toast.show({ title: `토스트 #${i + 1}`, variant: variants[i % 5]!, duration: 8000 });
      }, i * 300);
    }
  }}>
    5개 연속 표시
  </button>
  <button onClick={() => toast.dismissAll()}>모두 닫기</button>
</Section>
```

#### 7. Promise (id: "promise")

비동기 작업 시뮬레이션 (성공/실패 토글).

```tsx
<Section id="promise" title="Promise">
  <label>
    <input type="checkbox" checked={shouldFail} onChange={...} />
    실패 시뮬레이션
  </label>
  <button onClick={() => {
    const fakeApi = new Promise((resolve, reject) => {
      setTimeout(() => shouldFail ? reject(new Error("서버 오류")) : resolve({ id: 42 }), 2000);
    });
    toast.promise(fakeApi, {
      loading: { title: "저장 중...", description: "서버에 전송 중입니다." },
      success: { title: "저장 완료", description: "데이터가 저장되었습니다." },
      error: (err) => ({ title: "저장 실패", description: String(err) }),
    });
  }}>
    API 호출
  </button>
</Section>
```

#### 8. Persistent (id: "persistent")

`duration: Infinity` 토스트 + 수동 dismiss 버튼.

```tsx
<Section id="persistent" title="Persistent">
  <button onClick={() => {
    const id = toast.show({
      title: "영구 알림",
      description: "수동으로 닫아야 합니다.",
      variant: "warning",
      duration: Infinity,
    });
    setPersistentId(id);
  }}>
    영구 토스트 표시
  </button>
  <button onClick={() => persistentId && toast.dismiss(persistentId)}>
    수동 닫기
  </button>
</Section>
```

#### 9. Dark Theme (id: "dark-theme")

`theme="dark"` Provider로 래핑한 영역에서 5가지 variant 시연.

```tsx
<div style={{ background: "#0f172a", padding: 24, borderRadius: 8 }}>
  <ToastProvider theme="dark" position="bottom-right">
    <DarkThemeDemo />
  </ToastProvider>
</div>
```

#### 10. Props (id: "props")

PropsTable 4개:
- **ToastProvider Props** — position, stackOrder, maxToasts, defaultDuration, pauseOnHover, swipeDismissible, swipeThreshold, swipeDirection, theme, label, onDismiss, onAutoClose, className, style
- **useToast() Return** — show, dismiss, dismissAll, promise, toasts
- **ShowToastOptions** — title, description, variant, duration, action, render, pauseOnHover, swipeDismissible, ariaLive
- **Toast.Root Props** — variant, duration, pauseOnHover, swipeDismissible, onDismiss, className, style
- **Toast.Icon/Content/Action/Close/Progress Props** — 각 sub-component의 props

#### 11. Usage (id: "usage")

```tsx
const USAGE_CODE = `import { ToastProvider, useToast } from "plastic";

// 1. Provider 설정
function App() {
  return (
    <ToastProvider position="bottom-right" theme="light">
      <MyApp />
    </ToastProvider>
  );
}

// 2. 명령형 사용
function MyComponent() {
  const toast = useToast();

  return (
    <button onClick={() => toast.show({
      title: "저장 완료",
      variant: "success",
      duration: 5000,
    })}>
      저장
    </button>
  );
}

// 3. Promise 추적
const toast = useToast();
toast.promise(fetchData(), {
  loading: { title: "불러오는 중..." },
  success: { title: "완료!" },
  error: { title: "실패" },
});`;
```

#### 12. Playground (id: "playground")

인터랙티브 제어:
- `position`: 6개 라디오
- `theme`: light / dark 토글
- `variant`: 5개 라디오
- `duration`: 숫자 입력 (1000~30000, Infinity 체크박스)
- `maxToasts`: 숫자 입력 (1~20)
- `pauseOnHover`: 체크박스
- `swipeDismissible`: 체크박스
- `swipeThreshold`: 숫자 입력 (50~300)
- `title`: 텍스트 입력
- `description`: 텍스트 입력
- `action label`: 텍스트 입력 (비어있으면 액션 없음)
- [토스트 표시] 버튼
- [모두 닫기] 버튼

---

## 구현 순서

1. `src/components/Toast/Toast.types.ts` — 전체 타입 정의
2. `src/components/Toast/colors.ts` — 색상 맵 상수
3. `src/components/Toast/useReducedMotion.ts` — reduce motion hook
4. `src/components/Toast/ToastContext.ts` — context 생성 + 안전 접근 hook
5. `src/components/Toast/toastReducer.ts` — 상태 관리 reducer
6. `src/components/Toast/useToastTimer.ts` — 자동 dismiss 타이머
7. `src/components/Toast/useToastSwipe.ts` — 스와이프 dismiss
8. `src/components/Toast/ToastIcon.tsx` — 아이콘 (variant별 SVG 포함)
9. `src/components/Toast/ToastContent.tsx` — title + description
10. `src/components/Toast/ToastAction.tsx` — 액션 버튼
11. `src/components/Toast/ToastClose.tsx` — 닫기 버튼
12. `src/components/Toast/ToastProgress.tsx` — 프로그레스 바
13. `src/components/Toast/ToastRoot.tsx` — 토스트 컨테이너 (애니메이션, 스와이프, hover)
14. `src/components/Toast/ToastProvider.tsx` — Provider (reducer, portal, keyframes)
15. `src/components/Toast/useToast.ts` — 명령형 API hook
16. `src/components/Toast/Toast.tsx` — Object.assign 조립
17. `src/components/Toast/index.ts` — 배럴 export
18. `src/components/index.ts` — `export * from "./Toast"` 추가
19. `demo/src/pages/ToastPage.tsx` — 데모 페이지
20. `demo/src/App.tsx` — NAV + import + 렌더 분기 추가

---

## 검증 방법

```bash
npm run typecheck        # 타입 체크 통과
npx tsup                 # 빌드 성공 확인
cd demo && npm run dev   # http://localhost:5173/#/toast
```

- [ ] 5가지 variant 토스트 정상 렌더링 (색상, 아이콘, 테두리)
- [ ] 6개 포지션에서 올바른 방향으로 슬라이드 진입/퇴장
- [ ] duration 설정대로 자동 dismiss (기본 5000ms)
- [ ] `duration: Infinity` → 자동 dismiss 비활성, 프로그레스 바 숨김
- [ ] hover 시 타이머 일시정지, hover out 시 재개
- [ ] 프로그레스 바가 남은 시간 비율 정확히 표시
- [ ] 스와이프 → threshold 도달 시 dismiss, 미달 시 스냅백
- [ ] maxToasts 초과 시 가장 오래된 토스트 자동 퇴장
- [ ] toast.promise() — loading → success/error 전이
- [ ] toast.dismiss(id) — 특정 토스트 dismiss
- [ ] toast.dismissAll() — 전체 dismiss
- [ ] Escape 키 → 최근 토스트 dismiss
- [ ] Toast.Action 버튼 클릭 동작
- [ ] Toast.Close 버튼 클릭 → dismiss
- [ ] light/dark 테마 전환 → 즉시 색상 업데이트
- [ ] role="alert" + aria-live="assertive" (error variant)
- [ ] role="status" + aria-live="polite" (non-error variants)
- [ ] render 함수 → 커스텀 렌더링 동작
- [ ] 빠른 연속 show() → 스택 정상 관리
- [ ] 브라우저 탭 비활성 → 타이머 일시정지
- [ ] `prefers-reduced-motion: reduce` → 애니메이션 비활성
- [ ] 데모 Playground에서 모든 prop 조합 테스트
- [ ] TypeScript strict mode 통과 (exactOptionalPropertyTypes)
- [ ] verbatimModuleSyntax 호환 import 문법
