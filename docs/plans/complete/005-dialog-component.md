# Dialog 컴포넌트 설계문서

## Context

plastic 라이브러리에 6번째 컴포넌트 `Dialog`를 추가한다.
모달 다이얼로그는 사용자의 흐름을 일시 중단하고 중요한 정보를 표시하거나 결정을 요구하는 오버레이 패널이다.
WAI-ARIA Dialog (Modal) 패턴을 완전히 준수하며, 포커스 트랩, 스크롤 잠금, 중첩 다이얼로그, 애니메이션, 키보드 내비게이션을 포함한다.

기존 컴포넌트와 동일하게 **Compound component 패턴** (`Object.assign`)을 사용하고,
`useControllable` 훅으로 controlled/uncontrolled 양쪽을 지원한다.
`variant="alert"` 모드를 통해 파괴적 확인 다이얼로그(Alert Dialog)도 지원한다.

---

## Compound Component 구조

```
Dialog.Root           상태 관리 (open/close), Context 제공, controlled/uncontrolled
Dialog.Trigger        다이얼로그를 여는 트리거 요소 (children을 래핑)
Dialog.Portal         createPortal로 document.body에 렌더링
Dialog.Overlay        반투명 배경막, 클릭 시 닫기 (alert 모드 제외)
Dialog.Content        다이얼로그 패널, 포커스 트랩, 키보드 핸들링
Dialog.Header         제목 영역 (border-bottom)
Dialog.Body           스크롤 가능한 콘텐츠 영역
Dialog.Footer         액션 버튼 영역 (border-top)
Dialog.Close          닫기 버튼, Content 내 어디에나 배치 가능
Dialog.Title          접근성 제목 (aria-labelledby 연결)
Dialog.Description    접근성 설명 (aria-describedby 연결)
```

---

## 사용 패턴

### 기본 사용

```tsx
import { Dialog, Button } from "plastic";

<Dialog.Root>
  <Dialog.Trigger>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content size="md">
      <Dialog.Header>
        <Dialog.Title>Confirm Action</Dialog.Title>
        <Dialog.Close />
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description>
          Are you sure you want to proceed?
        </Dialog.Description>
      </Dialog.Body>
      <Dialog.Footer>
        <Dialog.Close>
          <Button variant="ghost">Cancel</Button>
        </Dialog.Close>
        <Button>Confirm</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Alert Dialog (파괴적 확인)

```tsx
<Dialog.Root variant="alert">
  <Dialog.Trigger>
    <Button variant="ghost">Delete Account</Button>
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content size="sm">
      <Dialog.Header>
        <Dialog.Title>Delete Account</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <Dialog.Description>
          This action cannot be undone. All your data will be permanently removed.
        </Dialog.Description>
      </Dialog.Body>
      <Dialog.Footer>
        <Dialog.Close>
          <Button variant="ghost">Cancel</Button>
        </Dialog.Close>
        <Button variant="primary">Delete</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### 폼 내장

```tsx
<Dialog.Root>
  <Dialog.Trigger>
    <Button>Edit Profile</Button>
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content size="md">
      <form onSubmit={handleSubmit}>
        <Dialog.Header>
          <Dialog.Title>Edit Profile</Dialog.Title>
          <Dialog.Close />
        </Dialog.Header>
        <Dialog.Body>
          <label>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} />
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close>
            <Button variant="ghost" type="button">Cancel</Button>
          </Dialog.Close>
          <Button type="submit">Save</Button>
        </Dialog.Footer>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### 중첩 다이얼로그

```tsx
<Dialog.Root>
  <Dialog.Trigger>
    <Button>Open Outer</Button>
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content size="lg">
      <Dialog.Header>
        <Dialog.Title>Outer Dialog</Dialog.Title>
        <Dialog.Close />
      </Dialog.Header>
      <Dialog.Body>
        <p>This is the outer dialog.</p>

        {/* 중첩 다이얼로그 */}
        <Dialog.Root>
          <Dialog.Trigger>
            <Button size="sm">Open Inner</Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay />
            <Dialog.Content size="sm">
              <Dialog.Header>
                <Dialog.Title>Inner Dialog</Dialog.Title>
                <Dialog.Close />
              </Dialog.Header>
              <Dialog.Body>
                <p>This is the inner dialog.</p>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.Close>
                  <Button>Close Inner</Button>
                </Dialog.Close>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </Dialog.Body>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Controlled 모드

```tsx
const [open, setOpen] = useState(false);

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger>
    <Button>Open</Button>
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content size="md">
      <Dialog.Header>
        <Dialog.Title>Controlled Dialog</Dialog.Title>
        <Dialog.Close />
      </Dialog.Header>
      <Dialog.Body>
        <p>Externally controlled dialog.</p>
      </Dialog.Body>
      <Dialog.Footer>
        <Button onClick={() => setOpen(false)}>Done</Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

{/* 외부에서 열기/닫기 */}
<Button onClick={() => setOpen(true)}>Open from outside</Button>
<Button onClick={() => setOpen(false)}>Close from outside</Button>
```

---

## TypeScript 인터페이스

### 공유 타입

```typescript
export type DialogTheme = "light" | "dark";
export type DialogSize = "sm" | "md" | "lg" | "xl" | "full";
export type DialogVariant = "default" | "alert";

// 애니메이션 상태 (내부 사용)
export type DialogAnimationState = "closed" | "opening" | "open" | "closing";
```

### Root Props

```typescript
export interface DialogRootProps {
  children: ReactNode;

  // ── 열림/닫힘 ──────────────────────────────
  open?: boolean | undefined;
  defaultOpen?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;

  // ── 변형 ────────────────────────────────────
  variant?: DialogVariant | undefined;       // default: "default"

  // ── 닫기 동작 ──────────────────────────────
  closeOnEscape?: boolean | undefined;       // default: true (alert이면 false)
  closeOnOverlayClick?: boolean | undefined; // default: true (alert이면 false)

  // ── 테마 ────────────────────────────────────
  theme?: DialogTheme | undefined;           // default: "light"
}
```

### Trigger Props

```typescript
export interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean | undefined;             // default: true
}
```

### Portal Props

```typescript
export interface DialogPortalProps {
  children: ReactNode;
  container?: HTMLElement | undefined;       // default: document.body
}
```

### Overlay Props

```typescript
export interface DialogOverlayProps extends HTMLAttributes<HTMLDivElement> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Content Props

```typescript
export interface DialogContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  size?: DialogSize | undefined;             // default: "md"
  className?: string | undefined;
  style?: CSSProperties | undefined;

  // ── 포커스 ──────────────────────────────────
  initialFocus?: RefObject<HTMLElement> | undefined;
  returnFocus?: boolean | undefined;         // default: true

  // ── 콜백 ───────────────────────────────────
  onOpenAutoFocus?: ((e: Event) => void) | undefined;
  onCloseAutoFocus?: ((e: Event) => void) | undefined;
  onEscapeKeyDown?: ((e: KeyboardEvent) => void) | undefined;
  onPointerDownOutside?: ((e: PointerEvent) => void) | undefined;
}
```

### Header Props

```typescript
export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Body Props

```typescript
export interface DialogBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Footer Props

```typescript
export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Close Props

```typescript
export interface DialogCloseProps extends HTMLAttributes<HTMLButtonElement> {
  children?: ReactNode | undefined;          // 없으면 X 아이콘 렌더링
  asChild?: boolean | undefined;             // default: false
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Title Props

```typescript
export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Description Props

```typescript
export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

---

## Context 구조

```typescript
interface DialogContextValue {
  // ── 상태 ────────────────────────────────────
  open: boolean;
  setOpen: (next: boolean) => void;
  animationState: DialogAnimationState;

  // ── 변형 & 동작 ────────────────────────────
  variant: DialogVariant;
  closeOnEscape: boolean;
  closeOnOverlayClick: boolean;

  // ── 테마 ────────────────────────────────────
  theme: DialogTheme;

  // ── 접근성 ID ──────────────────────────────
  titleId: string;                           // useId()로 생성
  descriptionId: string;                     // useId()로 생성
  contentId: string;                         // useId()로 생성

  // ── 포커스 관리 ────────────────────────────
  triggerRef: RefObject<HTMLElement | null>;

  // ── 중첩 관리 ──────────────────────────────
  nestingLevel: number;                      // 0부터 시작, 중첩 시 +1
}
```

Context는 `createContext<DialogContextValue | null>(null)`로 생성하고,
소비 훅 `useDialogContext()`에서 null이면 에러를 던진다:

```typescript
function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (ctx === null) {
    throw new Error("Dialog compound components must be used within <Dialog.Root>");
  }
  return ctx;
}
```

---

## 상태 머신

```
┌──────────────────────────────────────────────────────────────┐
│  CLOSED (open: false, animationState: "closed")              │
│    ├─ Trigger 클릭 ────────────→ OPENING                     │
│    ├─ open prop 변경 (true) ───→ OPENING                     │
│    └─ setOpen(true) 호출 ──────→ OPENING                     │
└──────────────────────────────────────────────────────────────┘
                                        │
                                        ↓
┌──────────────────────────────────────────────────────────────┐
│  OPENING (animationState: "opening")                         │
│    ├─ Portal 마운트                                          │
│    ├─ body scroll 잠금                                       │
│    ├─ Overlay fade-in 애니메이션 시작 (150ms)                  │
│    ├─ Content scale+fade 애니메이션 시작 (200ms)               │
│    ├─ 포커스 트랩 활성화                                      │
│    ├─ initialFocus로 포커스 이동 (또는 첫 focusable 요소)      │
│    └─ 200ms 후 ──────────────→ OPEN                          │
└──────────────────────────────────────────────────────────────┘
                                        │
                                        ↓
┌──────────────────────────────────────────────────────────────┐
│  OPEN (open: true, animationState: "open")                   │
│    ├─ Escape 키 ───────────────→ CLOSING (closeOnEscape)     │
│    ├─ Overlay 클릭 ────────────→ CLOSING (closeOnOverlay)    │
│    ├─ Close 버튼 클릭 ─────────→ CLOSING                     │
│    ├─ open prop 변경 (false) ──→ CLOSING                     │
│    └─ setOpen(false) 호출 ─────→ CLOSING                     │
└──────────────────────────────────────────────────────────────┘
                                        │
                                        ↓
┌──────────────────────────────────────────────────────────────┐
│  CLOSING (animationState: "closing")                         │
│    ├─ Overlay fade-out 애니메이션 시작 (150ms)                │
│    ├─ Content scale+fade 애니메이션 시작 (150ms)              │
│    ├─ 150ms 후:                                              │
│    │   ├─ Portal 언마운트                                     │
│    │   ├─ body scroll 잠금 해제                               │
│    │   ├─ 포커스 트랩 비활성화                                 │
│    │   ├─ Trigger로 포커스 복귀 (returnFocus)                  │
│    │   └─ ──────────────────→ CLOSED                          │
└──────────────────────────────────────────────────────────────┘

Alert 변형:
  - Escape 키 → 무시 (closeOnEscape 기본값 false)
  - Overlay 클릭 → 무시 (closeOnOverlayClick 기본값 false)
  - Close 버튼/명시적 액션으로만 닫기 가능
```

### 애니메이션 상태 관리

```typescript
// DialogContent 내부
const [animationState, setAnimationState] = useState<DialogAnimationState>("closed");

useEffect(() => {
  if (open) {
    setAnimationState("opening");
    const timer = setTimeout(() => setAnimationState("open"), 200);
    return () => clearTimeout(timer);
  } else {
    if (animationState === "open" || animationState === "opening") {
      setAnimationState("closing");
      const timer = setTimeout(() => setAnimationState("closed"), 150);
      return () => clearTimeout(timer);
    }
  }
}, [open]);
```

Portal은 `animationState !== "closed"` 일 때만 마운트한다.
이를 통해 닫기 애니메이션이 완료된 후 DOM에서 제거된다.

---

## DOM 구조

```html
<!-- Dialog.Root — DOM 요소 없음, Context.Provider만 -->

<!-- Dialog.Trigger — children을 clone하여 onClick 주입 -->
<button onClick={handleOpen} aria-haspopup="dialog" aria-expanded="true|false" ref={triggerRef}>
  Open Dialog
</button>

<!-- Dialog.Portal — createPortal(children, container) -->
<!-- document.body 끝에 렌더링 -->

<!-- Dialog.Overlay -->
<div
  data-dialog-overlay
  data-state="open|closed"
  aria-hidden="true"
  style="
    position: fixed;
    inset: 0;
    z-index: {1000 + nestingLevel * 10};
    background: rgba(0, 0, 0, 0.5);
    opacity: {0|1};
    transition: opacity 150ms ease;
  "
  onClick={handleOverlayClick}
/>

<!-- Dialog.Content -->
<div
  id={contentId}
  data-dialog-content
  data-state="open|closed"
  role="dialog"                              <!-- variant="alert" → role="alertdialog" -->
  aria-modal="true"
  aria-labelledby={titleId}
  aria-describedby={descriptionId}
  tabIndex={-1}
  style="
    position: fixed;
    z-index: {1001 + nestingLevel * 10};
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale({0.95|1});
    width: {sizeMap[size]};
    max-height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
    border-radius: 0.75rem;
    background: {contentBg};
    border: 1px solid {contentBorder};
    box-shadow: {contentShadow};
    opacity: {0|1};
    transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1),
                transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
    outline: none;
  "
  onKeyDown={handleKeyDown}
>
  <!-- Dialog.Header -->
  <div
    style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid {borderColor};
      flex-shrink: 0;
    "
  >
    <!-- Dialog.Title -->
    <h2
      id={titleId}
      style="
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        line-height: 1.5rem;
        color: {titleColor};
      "
    >
      Confirm Action
    </h2>

    <!-- Dialog.Close (X 버튼, Header 내 배치 시) -->
    <button
      aria-label="Close dialog"
      onClick={handleClose}
      style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 0.375rem;
        border: none;
        background: transparent;
        cursor: pointer;
        color: {closeIconColor};
        transition: background-color 150ms ease;
      "
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="4" y1="4" x2="12" y2="12" />
        <line x1="12" y1="4" x2="4" y2="12" />
      </svg>
    </button>
  </div>

  <!-- Dialog.Body -->
  <div
    style="
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
      color: {bodyTextColor};
    "
  >
    <!-- Dialog.Description -->
    <p
      id={descriptionId}
      style="
        margin: 0;
        font-size: 0.875rem;
        line-height: 1.25rem;
        color: {descriptionColor};
      "
    >
      Are you sure you want to proceed?
    </p>
  </div>

  <!-- Dialog.Footer -->
  <div
    style="
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-top: 1px solid {borderColor};
      flex-shrink: 0;
    "
  >
    <button>Cancel</button>
    <button>Confirm</button>
  </div>
</div>
```

### 사이즈 맵

```typescript
const sizeMap: Record<DialogSize, string> = {
  sm:   "400px",
  md:   "500px",
  lg:   "640px",
  xl:   "800px",
  full: "calc(100vw - 4rem)",
};

// full 사이즈의 max-height도 더 크게
const maxHeightMap: Record<DialogSize, string> = {
  sm:   "calc(100vh - 4rem)",
  md:   "calc(100vh - 4rem)",
  lg:   "calc(100vh - 4rem)",
  xl:   "calc(100vh - 4rem)",
  full: "calc(100vh - 4rem)",
};
```

---

## 포커스 트랩 구현

### useFocusTrap 훅

파일: `src/components/_shared/useFocusTrap.ts`

```typescript
import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable]",
].join(",");

interface UseFocusTrapOptions {
  enabled: boolean;
  initialFocus?: React.RefObject<HTMLElement | null> | undefined;
  returnFocusTo?: React.RefObject<HTMLElement | null> | undefined;
  returnFocus?: boolean;
  onOpenAutoFocus?: ((e: Event) => void) | undefined;
  onCloseAutoFocus?: ((e: Event) => void) | undefined;
}

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions,
) {
  const {
    enabled,
    initialFocus,
    returnFocusTo,
    returnFocus = true,
    onOpenAutoFocus,
    onCloseAutoFocus,
  } = options;

  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // focusable 요소 목록 구하기
  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];
    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    // 보이는 요소만 (offsetParent가 null이 아닌)
    return elements.filter(
      (el) => el.offsetParent !== null && !el.hasAttribute("aria-hidden"),
    );
  }, [containerRef]);

  // 열릴 때: 포커스 이동
  useEffect(() => {
    if (!enabled) return;

    // 현재 포커스 저장
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // 초기 포커스 설정
    const focusEvent = new Event("dialog:openfocus", { cancelable: true });
    onOpenAutoFocus?.(focusEvent);

    if (!focusEvent.defaultPrevented) {
      requestAnimationFrame(() => {
        if (initialFocus?.current) {
          initialFocus.current.focus();
        } else {
          const focusable = getFocusableElements();
          if (focusable.length > 0) {
            focusable[0]!.focus();
          } else {
            // focusable 요소가 없으면 Content 자체에 포커스
            containerRef.current?.focus();
          }
        }
      });
    }

    // 닫힐 때 포커스 복귀
    return () => {
      const closeEvent = new Event("dialog:closefocus", { cancelable: true });
      onCloseAutoFocus?.(closeEvent);

      if (!closeEvent.defaultPrevented && returnFocus) {
        const returnTarget = returnFocusTo?.current ?? previouslyFocusedRef.current;
        requestAnimationFrame(() => {
          returnTarget?.focus();
        });
      }
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tab 키 트래핑
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        // Shift+Tab: 첫 요소에서 → 마지막으로
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: 마지막 요소에서 → 첫 요소로
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [enabled, getFocusableElements]);
}
```

### 포커스 복귀 로직

1. Dialog가 열릴 때 `document.activeElement`를 `previouslyFocusedRef`에 저장
2. Dialog가 닫힐 때:
   - `returnFocusTo` ref가 있으면 해당 요소로 포커스
   - 없으면 `previouslyFocusedRef` (= Trigger)로 포커스 복귀
   - `returnFocus={false}`이면 복귀하지 않음
3. `onCloseAutoFocus` 콜백에서 `preventDefault()`하면 자동 복귀 중단

### 중첩 다이얼로그 포커스

- 내부 Dialog가 열리면 내부 Dialog로 포커스 이동
- 내부 Dialog가 닫히면 외부 Dialog의 Trigger (내부 Dialog를 연 버튼)로 포커스 복귀
- 외부 Dialog의 포커스 트랩은 내부 Dialog가 열려 있는 동안 비활성 상태
- 이를 위해 `document.addEventListener("keydown", ...)` 사용 시 capture phase로 등록하고, 가장 안쪽 Dialog만 Tab 이벤트를 처리

---

## 스크롤 잠금

### useScrollLock 훅

파일: `src/components/_shared/useScrollLock.ts`

```typescript
import { useEffect, useRef } from "react";

// 전역 스택: 여러 Dialog가 열려도 마지막 것이 닫힐 때만 스크롤 복원
let lockCount = 0;
let originalStyles: {
  overflow: string;
  paddingRight: string;
} | null = null;

function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
}

function lock() {
  lockCount++;
  if (lockCount === 1) {
    // 첫 잠금: 원래 스타일 저장
    originalStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };

    const scrollbarWidth = getScrollbarWidth();
    document.body.style.overflow = "hidden";

    // 스크롤바 사라짐으로 인한 레이아웃 쉬프트 방지
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && originalStyles) {
    document.body.style.overflow = originalStyles.overflow;
    document.body.style.paddingRight = originalStyles.paddingRight;
    originalStyles = null;
  }
}

export function useScrollLock(enabled: boolean) {
  const wasEnabledRef = useRef(false);

  useEffect(() => {
    if (enabled && !wasEnabledRef.current) {
      lock();
      wasEnabledRef.current = true;
    }

    return () => {
      if (wasEnabledRef.current) {
        unlock();
        wasEnabledRef.current = false;
      }
    };
  }, [enabled]);
}
```

### 스크롤 잠금 동작

1. Dialog가 열릴 때 (`animationState === "opening"` 또는 `"open"`) → `useScrollLock(true)`
2. Dialog가 완전히 닫힐 때 (`animationState === "closed"`) → cleanup에서 `unlock()`
3. 중첩 시: `lockCount` 스택으로 관리. 2개 Dialog가 열려 있으면 `lockCount === 2`. 안쪽 것이 닫혀도 `lockCount === 1`이므로 스크롤 잠금 유지. 모두 닫히면 복원.
4. 스크롤바 너비만큼 `padding-right` 추가하여 레이아웃 쉬프트 방지

### Dialog.Body 독립 스크롤

```typescript
// DialogBody.tsx
<div
  style={{
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    // 커스텀 스크롤바 (선택적)
    scrollbarWidth: "thin",
    scrollbarColor: `${scrollThumbColor} transparent`,
  }}
>
  {children}
</div>
```

Body 영역은 `flex: 1` + `overflow-y: auto`로 Content 높이(`max-height`)를 초과하는 콘텐츠를 독립적으로 스크롤한다. Header와 Footer는 `flex-shrink: 0`으로 고정.

---

## 테마 색상 맵

### Overlay

```typescript
const overlayBg: Record<DialogTheme, string> = {
  light: "rgba(0, 0, 0, 0.5)",
  dark:  "rgba(0, 0, 0, 0.7)",
};
```

### Content 패널

```typescript
const contentBg: Record<DialogTheme, string> = {
  light: "#ffffff",
  dark:  "#1f2937",          // gray-800
};

const contentBorder: Record<DialogTheme, string> = {
  light: "#e5e7eb",          // gray-200
  dark:  "#374151",          // gray-700
};

const contentShadow: Record<DialogTheme, string> = {
  light: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  dark:  "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
};
```

### Header

```typescript
const headerBorderColor: Record<DialogTheme, string> = {
  light: "#e5e7eb",          // gray-200
  dark:  "#374151",          // gray-700
};
```

### Title

```typescript
const titleColor: Record<DialogTheme, string> = {
  light: "#111827",          // gray-900
  dark:  "#f9fafb",          // gray-50
};
```

### Description

```typescript
const descriptionColor: Record<DialogTheme, string> = {
  light: "#6b7280",          // gray-500
  dark:  "#9ca3af",          // gray-400
};
```

### Body 텍스트

```typescript
const bodyTextColor: Record<DialogTheme, string> = {
  light: "#374151",          // gray-700
  dark:  "#d1d5db",          // gray-300
};
```

### Footer

```typescript
const footerBorderColor: Record<DialogTheme, string> = {
  light: "#e5e7eb",          // gray-200
  dark:  "#374151",          // gray-700
};

const footerBg: Record<DialogTheme, string> = {
  light: "#f9fafb",          // gray-50
  dark:  "#111827",          // gray-900
};
```

### Close 버튼 (X 아이콘)

```typescript
const closeIconColor: Record<DialogTheme, string> = {
  light: "#9ca3af",          // gray-400
  dark:  "#6b7280",          // gray-500
};

const closeIconHoverBg: Record<DialogTheme, string> = {
  light: "#f3f4f6",          // gray-100
  dark:  "#374151",          // gray-700
};
```

### 스크롤바 (Body)

```typescript
const scrollThumbColor: Record<DialogTheme, string> = {
  light: "#d1d5db",          // gray-300
  dark:  "#4b5563",          // gray-600
};
```

---

## 애니메이션 스펙

### Overlay 애니메이션

```
열기 (opening):
  opacity: 0 → 1
  duration: 150ms
  easing: ease

닫기 (closing):
  opacity: 1 → 0
  duration: 150ms
  easing: ease
```

인라인 스타일 구현:

```typescript
const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000 + nestingLevel * 10,
  background: overlayBg[theme],
  opacity: animationState === "opening" || animationState === "open" ? 1 : 0,
  transition: "opacity 150ms ease",
  // 닫기 애니메이션 중 포인터 이벤트 차단
  pointerEvents: animationState === "closing" ? "none" : "auto",
};
```

### Content 애니메이션

```
열기 (opening):
  opacity: 0 → 1
  transform: translate(-50%, -50%) scale(0.95) → translate(-50%, -50%) scale(1)
  duration: 200ms
  easing: cubic-bezier(0.16, 1, 0.3, 1)  — "easeOutExpo" 유사, 빠른 시작 후 부드러운 착지

닫기 (closing):
  opacity: 1 → 0
  transform: translate(-50%, -50%) scale(1) → translate(-50%, -50%) scale(0.95)
  duration: 150ms
  easing: cubic-bezier(0.16, 1, 0.3, 1)
```

인라인 스타일 구현:

```typescript
const isVisible = animationState === "open";
const isAnimating = animationState === "opening" || animationState === "closing";

const contentStyle: CSSProperties = {
  position: "fixed",
  zIndex: 1001 + nestingLevel * 10,
  top: "50%",
  left: "50%",
  transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0.95})`,
  width: sizeMap[size],
  maxWidth: "calc(100vw - 2rem)",
  maxHeight: "calc(100vh - 4rem)",
  display: "flex",
  flexDirection: "column",
  borderRadius: "0.75rem",
  background: contentBg[theme],
  border: `1px solid ${contentBorder[theme]}`,
  boxShadow: contentShadow[theme],
  opacity: isVisible ? 1 : 0,
  transition: [
    `opacity ${isAnimating && animationState === "closing" ? 150 : 200}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    `transform ${isAnimating && animationState === "closing" ? 150 : 200}ms cubic-bezier(0.16, 1, 0.3, 1)`,
  ].join(", "),
  outline: "none",
};
```

### 애니메이션 타이밍 시퀀스

```
열기:
  t=0ms    animationState → "opening", Portal 마운트, opacity: 0, scale: 0.95
  t=1ms    requestAnimationFrame → animationState 유지, CSS transition 시작
           Overlay: opacity 0 → 1 (150ms)
           Content: opacity 0 → 1, scale 0.95 → 1 (200ms)
  t=200ms  animationState → "open", 포커스 이동

닫기:
  t=0ms    animationState → "closing"
           Overlay: opacity 1 → 0 (150ms)
           Content: opacity 1 → 0, scale 1 → 0.95 (150ms)
  t=150ms  animationState → "closed", Portal 언마운트, 포커스 복귀
```

### 초기 렌더링 깜빡임 방지

opening 상태에서 컴포넌트가 마운트된 직후에는 opacity: 0으로 렌더링되고,
다음 프레임에서 CSS transition이 시작되어야 한다.
이를 위해 2단계 접근:

```typescript
// DialogContent 내부
const [mounted, setMounted] = useState(false);

useEffect(() => {
  if (animationState === "opening") {
    // 다음 프레임에서 mounted → true로 transition 트리거
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }
  if (animationState === "closing") {
    setMounted(false);
  }
  if (animationState === "closed") {
    setMounted(false);
  }
}, [animationState]);

// style에서 mounted를 사용
const isVisible = mounted && (animationState === "opening" || animationState === "open");
```

---

## 접근성

| 요소 | 속성 | 값 | 비고 |
|------|------|---|------|
| Trigger | `aria-haspopup` | `"dialog"` | Dialog 존재를 알림 |
| Trigger | `aria-expanded` | `"true" \| "false"` | 열림 상태 반영 |
| Content | `role` | `"dialog"` | `variant="alert"` → `"alertdialog"` |
| Content | `aria-modal` | `"true"` | 모달임을 선언 |
| Content | `aria-labelledby` | `titleId` | Title 요소와 연결 |
| Content | `aria-describedby` | `descriptionId` | Description 요소와 연결 (있을 때만) |
| Content | `tabIndex` | `-1` | 프로그래밍적 포커스 수신 가능 |
| Title `<h2>` | `id` | `titleId` | `useId()` 생성 |
| Description `<p>` | `id` | `descriptionId` | `useId()` 생성 |
| Overlay | `aria-hidden` | `"true"` | 스크린리더에서 무시 |
| Close (X 아이콘) | `aria-label` | `"Close dialog"` | children 없을 때 |
| Close (children) | — | — | children 텍스트가 레이블 역할 |

### 키보드 인터랙션

| 키 | 동작 |
|---|------|
| `Escape` | Dialog 닫기 (`closeOnEscape: true`일 때). Alert 변형에서는 기본 비활성 |
| `Tab` | 다음 focusable 요소로 이동. 마지막 요소에서 → 첫 요소로 순환 |
| `Shift+Tab` | 이전 focusable 요소로 이동. 첫 요소에서 → 마지막 요소로 순환 |
| `Enter/Space` | Trigger 활성화 (Dialog 열기), Close 버튼 활성화 (Dialog 닫기) |

### 스크린리더 동작

1. Dialog가 열리면 `role="dialog"` + `aria-modal="true"`로 인해 가상 커서가 Dialog 내부로 제한됨
2. Title은 `aria-labelledby`를 통해 Dialog의 이름으로 읽힘
3. Description은 `aria-describedby`를 통해 Dialog의 설명으로 읽힘
4. `variant="alert"` → `role="alertdialog"` → 스크린리더가 더 긴급한 톤으로 알림

### Description 조건부 연결

Dialog.Description이 렌더링되지 않을 수 있으므로, `aria-describedby`는 Description이 실제 마운트되었을 때만 설정한다:

```typescript
// DialogContext에 hasDescription 상태 추가
const [hasDescription, setHasDescription] = useState(false);

// DialogDescription 마운트 시
useEffect(() => {
  ctx.setHasDescription(true);
  return () => ctx.setHasDescription(false);
}, []);

// DialogContent에서
aria-describedby={hasDescription ? descriptionId : undefined}
```

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| Trigger 없이 controlled | `open` prop + `onOpenChange`만으로 사용 가능. Trigger 생략 허용 |
| Portal container 제거 | `container` prop의 DOM 노드가 사라지면 Portal unmount. 에러 방지 |
| Dialog 안에 Dialog | 각 Dialog.Root가 독립적인 Context를 갖고, `nestingLevel`로 z-index 스택 관리 |
| 중첩 Dialog에서 Escape | 가장 위(안쪽) Dialog만 닫힘. `stopPropagation` 사용 |
| Content에 focusable 요소 없음 | Content `<div>` 자체에 `tabIndex={-1}`로 포커스 수신 |
| SSR 환경 | Portal에서 `typeof document !== "undefined"` 체크. SSR 시 렌더링 안 함 |
| `open` prop이 빠르게 토글 | 애니메이션 중 반대 방향 전환 처리. opening 중 close → 즉시 closing으로 전환 |
| 모바일 가상 키보드 | `100vh` 문제 → `100dvh` 미사용, `window.innerHeight` 기반 계산 또는 CSS `max-height` |
| 스크롤바 레이아웃 쉬프트 | body `padding-right`에 스크롤바 너비 보상 |
| Close 버튼 children으로 Button 래핑 | `asChild` prop으로 children에 onClick 주입 (cloneElement) |
| `variant="alert"` + `closeOnEscape={true}` | 명시적 prop 우선. `closeOnEscape={true}`이면 alert에서도 Escape 닫기 허용 |
| Dialog 열린 상태에서 route 변경 | 소비자 책임. `onOpenChange`에서 상태 관리 |
| Content 외부 클릭 감지 | `onPointerDownOutside` 콜백 + `e.preventDefault()`로 닫기 방지 가능 |
| 빈 Header/Footer | 빈 상태로 렌더링됨 (border만 표시). 의도적 사용일 수 있으므로 경고 없음 |
| 긴 Title 텍스트 | `text-overflow: ellipsis` + `overflow: hidden` + `white-space: nowrap` |

---

## 수정 대상 파일

### 신규 생성

| # | 파일 경로 | 설명 | 예상 LOC |
|---|-----------|------|---------|
| 1 | `src/components/Dialog/Dialog.types.ts` | 전체 타입 정의 | ~90 |
| 2 | `src/components/Dialog/DialogRoot.tsx` | Context Provider, 상태 관리, useControllable | ~100 |
| 3 | `src/components/Dialog/DialogTrigger.tsx` | 트리거 래핑, cloneElement로 onClick/aria 주입 | ~40 |
| 4 | `src/components/Dialog/DialogPortal.tsx` | createPortal, 조건부 렌더링, SSR 가드 | ~30 |
| 5 | `src/components/Dialog/DialogOverlay.tsx` | 배경막, 클릭 핸들러, 애니메이션 스타일 | ~50 |
| 6 | `src/components/Dialog/DialogContent.tsx` | 포커스 트랩, 키보드, 애니메이션, 스크롤 잠금 | ~150 |
| 7 | `src/components/Dialog/DialogHeader.tsx` | 헤더 래퍼 | ~25 |
| 8 | `src/components/Dialog/DialogBody.tsx` | 스크롤 가능 콘텐츠 영역 | ~25 |
| 9 | `src/components/Dialog/DialogFooter.tsx` | 푸터 래퍼 | ~30 |
| 10 | `src/components/Dialog/DialogClose.tsx` | 닫기 버튼, X 아이콘 SVG, asChild | ~60 |
| 11 | `src/components/Dialog/DialogTitle.tsx` | 접근성 제목, id 연결 | ~25 |
| 12 | `src/components/Dialog/DialogDescription.tsx` | 접근성 설명, id 연결, hasDescription 등록 | ~30 |
| 13 | `src/components/Dialog/Dialog.tsx` | Object.assign 조립 | ~30 |
| 14 | `src/components/Dialog/index.ts` | 배럴 export | ~15 |
| 15 | `src/components/_shared/useFocusTrap.ts` | 포커스 트랩 훅 (재사용 가능) | ~80 |
| 16 | `src/components/_shared/useScrollLock.ts` | 스크롤 잠금 훅 (재사용 가능) | ~50 |
| 17 | `demo/src/pages/DialogPage.tsx` | 데모 페이지 | ~500 |

### 기존 수정

| # | 파일 경로 | 변경 내용 |
|---|-----------|-----------|
| 18 | `src/components/index.ts` | `export * from "./Dialog"` 추가 |
| 19 | `demo/src/App.tsx` | Dialog 페이지 NAV 항목 + import + 라우팅 추가 |

---

## 데모 페이지

### NAV 엔트리 (`demo/src/App.tsx`)

```typescript
{
  id: "dialog", label: "Dialog", description: "모달 다이얼로그",
  sections: [
    { label: "Basic", id: "basic" },
    { label: "Sizes", id: "sizes" },
    { label: "Alert Dialog", id: "alert-dialog" },
    { label: "Scrollable", id: "scrollable" },
    { label: "Nested", id: "nested" },
    { label: "Custom Trigger", id: "custom-trigger" },
    { label: "Form", id: "form" },
    { label: "Controlled", id: "controlled" },
    { label: "Dark Theme", id: "dark-theme" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ],
}
```

### Page 타입 수정

```typescript
type Page = "button" | "card" | "codeview" | "actionable" | "pathinput" | "dialog";
```

### 라우팅 추가

```tsx
{current === "dialog" && <DialogPage />}
```

### 데모 섹션 상세

#### 1. Basic (`id="basic"`)

기본 Dialog: Title, Body 텍스트, Footer에 Cancel + Confirm 버튼.
Header 우측에 X 닫기 버튼.

```tsx
<section id="basic">
  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
    Basic
  </p>
  <div className="p-6 bg-white rounded-lg border border-gray-200">
    <Dialog.Root>
      <Dialog.Trigger>
        <Button>기본 다이얼로그 열기</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content size="md">
          <Dialog.Header>
            <Dialog.Title>기본 다이얼로그</Dialog.Title>
            <Dialog.Close />
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Description>
              이것은 기본 다이얼로그입니다. Overlay 클릭 또는 Escape 키로 닫을 수 있습니다.
            </Dialog.Description>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Close><Button variant="ghost">취소</Button></Dialog.Close>
            <Button>확인</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>
</section>
```

#### 2. Sizes (`id="sizes"`)

5개 사이즈 각각의 트리거 버튼을 나란히 배치. 클릭하면 해당 사이즈의 Dialog가 열림.

```tsx
{(["sm", "md", "lg", "xl", "full"] as const).map((size) => (
  <Dialog.Root key={size}>
    <Dialog.Trigger>
      <Button size="sm" variant="secondary">{size}</Button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay />
      <Dialog.Content size={size}>
        <Dialog.Header>
          <Dialog.Title>Size: {size}</Dialog.Title>
          <Dialog.Close />
        </Dialog.Header>
        <Dialog.Body>
          <Dialog.Description>
            이 다이얼로그의 너비는 {sizeMap[size]}입니다.
          </Dialog.Description>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Close><Button>닫기</Button></Dialog.Close>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
))}
```

#### 3. Alert Dialog (`id="alert-dialog"`)

`variant="alert"` 사용. 파괴적 동작 확인 패턴.
Overlay 클릭, Escape 키 모두 비활성. 명시적 버튼으로만 닫기.

#### 4. Scrollable (`id="scrollable"`)

Body에 긴 텍스트 (lorem ipsum 여러 단락). Body 영역만 스크롤되고 Header/Footer는 고정.

#### 5. Nested (`id="nested"`)

외부 Dialog (lg) 안에 내부 Dialog (sm). 내부 Dialog가 열리면 외부 위에 표시됨.
Escape는 안쪽 것만 닫음.

#### 6. Custom Trigger (`id="custom-trigger"`)

다양한 트리거 요소: `<a>`, `<div>`, 아이콘 버튼, 텍스트 링크.

#### 7. Form (`id="form"`)

폼 입력 필드 (이름, 이메일, 메시지). 제출 시 Dialog 닫기. 유효성 검사 표시.
`initialFocus` 사용하여 첫 번째 입력 필드에 자동 포커스.

#### 8. Controlled (`id="controlled"`)

`open`/`onOpenChange` 외부 상태 제어. 버튼으로 외부에서 열기/닫기.
현재 상태 표시 (열림/닫힘).

#### 9. Dark Theme (`id="dark-theme"`)

`theme="dark"` + 어두운 배경 래퍼. 모든 색상이 다크 테마에 맞게 표시.

#### 10. Props (`id="props"`)

각 서브 컴포넌트별 Props 테이블:

**Dialog.Root Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controlled 열림 상태 |
| `defaultOpen` | `boolean` | `false` | Uncontrolled 초기 열림 상태 |
| `onOpenChange` | `(open: boolean) => void` | — | 열림/닫힘 상태 변경 콜백 |
| `variant` | `"default" \| "alert"` | `"default"` | 다이얼로그 변형 |
| `closeOnEscape` | `boolean` | `true` (alert: `false`) | Escape 키로 닫기 허용 |
| `closeOnOverlayClick` | `boolean` | `true` (alert: `false`) | Overlay 클릭으로 닫기 허용 |
| `theme` | `"light" \| "dark"` | `"light"` | 테마 |

**Dialog.Content Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `"sm" \| "md" \| "lg" \| "xl" \| "full"` | `"md"` | 패널 너비 |
| `initialFocus` | `RefObject<HTMLElement>` | — | 열릴 때 초기 포커스 대상 |
| `returnFocus` | `boolean` | `true` | 닫힐 때 트리거로 포커스 복귀 |
| `onOpenAutoFocus` | `(e: Event) => void` | — | 열릴 때 포커스 이동 전 콜백 |
| `onCloseAutoFocus` | `(e: Event) => void` | — | 닫힐 때 포커스 복귀 전 콜백 |
| `onEscapeKeyDown` | `(e: KeyboardEvent) => void` | — | Escape 키 다운 콜백 |
| `onPointerDownOutside` | `(e: PointerEvent) => void` | — | 외부 클릭 콜백 |

(나머지 서브 컴포넌트들도 동일 형식)

#### 11. Usage (`id="usage"`)

CodeView로 기본 사용법, Alert Dialog, Controlled 모드 코드 예제 표시.

#### 12. Playground (`id="playground"`)

인터랙티브 제어 패널:
- `size`: select (sm/md/lg/xl/full)
- `variant`: select (default/alert)
- `theme`: select (light/dark)
- `closeOnEscape`: checkbox
- `closeOnOverlayClick`: checkbox
- 라이브 Dialog 프리뷰

---

## 구현 순서

1. **공유 훅 생성**
   - `src/components/_shared/useFocusTrap.ts` — 포커스 트랩 훅
   - `src/components/_shared/useScrollLock.ts` — 스크롤 잠금 훅

2. **타입 정의**
   - `src/components/Dialog/Dialog.types.ts`

3. **DialogRoot** — Context Provider, useControllable, 애니메이션 상태 관리

4. **DialogPortal** — createPortal 래퍼, SSR 가드, 조건부 렌더링

5. **DialogOverlay** — 배경막, 클릭 핸들러, 애니메이션

6. **DialogContent** — 핵심 패널, useFocusTrap, useScrollLock, 키보드 핸들링, 애니메이션

7. **구조 서브 컴포넌트**
   - `DialogHeader.tsx`
   - `DialogBody.tsx`
   - `DialogFooter.tsx`

8. **접근성 서브 컴포넌트**
   - `DialogTitle.tsx`
   - `DialogDescription.tsx`

9. **DialogClose** — 닫기 버튼, X 아이콘 SVG, asChild 지원

10. **DialogTrigger** — cloneElement, aria 속성 주입

11. **조립 & 배럴**
    - `Dialog.tsx` — Object.assign 조립
    - `index.ts` — 배럴 export
    - `src/components/index.ts` 수정

12. **데모 페이지**
    - `demo/src/pages/DialogPage.tsx` — 12개 섹션
    - `demo/src/App.tsx` — NAV + 라우팅 추가

---

## 검증 방법

```bash
npm run typecheck        # 타입 체크 통과
npx tsup                 # 빌드 성공
cd demo && npm run dev   # http://localhost:5173/#/dialog
```

- [ ] Basic: 트리거 클릭 → 다이얼로그 열림 → X/Cancel/Overlay/Escape로 닫힘
- [ ] Sizes: sm/md/lg/xl/full 모두 올바른 너비로 열림
- [ ] Alert Dialog: Overlay 클릭, Escape 무시. 명시적 버튼으로만 닫힘
- [ ] Scrollable: Body만 스크롤, Header/Footer 고정
- [ ] Nested: 중첩 시 z-index 올바르게 스택. Escape는 안쪽만 닫힘
- [ ] Custom Trigger: 다양한 트리거 요소 동작
- [ ] Form: initialFocus 동작, 폼 제출 후 닫기
- [ ] Controlled: 외부 상태로 열기/닫기 제어
- [ ] Dark Theme: 모든 색상 다크 테마 적용
- [ ] 포커스 트랩: Tab/Shift+Tab 순환, Dialog 밖으로 포커스 탈출 불가
- [ ] 포커스 복귀: 닫힌 후 Trigger로 포커스 복귀
- [ ] 스크롤 잠금: Dialog 열림 시 body 스크롤 불가, 닫히면 복원
- [ ] 스크롤바 레이아웃 쉬프트: padding-right 보상 동작
- [ ] 애니메이션: 열기/닫기 부드러운 전환, 깜빡임 없음
- [ ] ARIA: role="dialog"/"alertdialog", aria-modal, aria-labelledby, aria-describedby 스크린리더 테스트
- [ ] 키보드: Escape, Tab, Shift+Tab, Enter/Space 모두 동작
- [ ] 중첩 스크롤 잠금: 내부 Dialog 닫아도 외부 Dialog 스크롤 잠금 유지
- [ ] SSR: document 미존재 시 Portal 렌더링 안 함
- [ ] `exactOptionalPropertyTypes` 호환: 모든 optional props에 `| undefined` 명시
- [ ] `verbatimModuleSyntax` 호환: 타입 import에 `import type` 사용
