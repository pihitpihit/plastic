# Dialog · Tooltip · Popover 동작 불가 — 진단 및 수정 계획

> 증상 (사용자 보고): demo 기준으로 Dialog와 Tooltip/Popover가 **전혀 동작하지 않는다**.

본 문서는 증상의 원인을 코드 레벨에서 규명하고, 구체적인 수정 계획을 정리한다.
컴포넌트 문제 / 데모 문제 둘 다를 후보로 두고 조사한 결과 **근본 원인은 모두 컴포넌트 코드**에 있다.
데모 페이지의 사용 패턴은 표준 compound component 사용법이며, 실제 API 계약대로 쓰고 있다.

---

## 0. 결론 (TL;DR)

| 컴포넌트 | 원인 | 한 줄 요약 |
|---|---|---|
| **Dialog** | 컴포넌트 (DialogPortal + DialogContent 간 상호 교착) | `DialogPortal`이 `animationState !== "closed"`일 때만 자식을 렌더하는데, `animationState`를 변경하는 effect는 `DialogContent` 안에 있음. `open=true`가 되어도 Portal이 계속 `null`을 반환해 DialogContent가 영원히 마운트되지 않음. |
| **Tooltip / Popover** | 컴포넌트 (트리거 ref 유실) + 데모 (Button에 forwardRef 미적용) | `Tooltip.Trigger` / `Popover.Trigger`가 `cloneElement`로 `ref={mergedRef}`를 주입하는데, 데모가 넘기는 `<Button>`은 `forwardRef`로 감싸져 있지 않아 ref가 누락. `triggerRef.current`가 영영 `null`이라 `useFloating.update()`가 early-return → `isPositioned=false` → 컨텐츠는 마운트되지만 `opacity: 0`으로 남음. |

**모두 즉시 재현 가능하고 결정적인 버그**이며, 타이밍 의존성이 있는 회색지대가 아니다.

---

## 1. 조사 범위 및 방법

### 1.1 검토한 파일

**Dialog:**
- `src/components/Dialog/Dialog.tsx` (조립)
- `src/components/Dialog/DialogRoot.tsx` (Context, 초기 상태)
- `src/components/Dialog/DialogTrigger.tsx`
- `src/components/Dialog/DialogPortal.tsx` ← **버그 지점**
- `src/components/Dialog/DialogOverlay.tsx`
- `src/components/Dialog/DialogContent.tsx` ← **교착 지점**
- `src/components/Dialog/DialogClose.tsx`
- `src/components/Dialog/DialogContext.ts`
- `src/components/Dialog/Dialog.types.ts`
- `src/components/Dialog/index.ts`

**Tooltip:**
- `src/components/Tooltip/Tooltip.tsx`
- `src/components/Tooltip/TooltipRoot.tsx`
- `src/components/Tooltip/TooltipTrigger.tsx` ← **ref 주입 지점**
- `src/components/Tooltip/TooltipContent.tsx`
- `src/components/Tooltip/TooltipArrow.tsx`
- `src/components/Tooltip/TooltipContext.ts`

**Popover:**
- `src/components/Popover/Popover.tsx`
- `src/components/Popover/PopoverRoot.tsx`
- `src/components/Popover/PopoverTrigger.tsx` ← **ref 주입 지점**
- `src/components/Popover/PopoverContent.tsx`
- `src/components/Popover/PopoverContext.ts`

**공유 모듈:**
- `src/components/_shared/useFloating.ts` ← **ref 의존성**
- `src/components/_shared/useAnimationState.ts`
- `src/components/_shared/useControllable.ts`
- `src/components/_shared/Portal.tsx`

**Button:**
- `src/components/Button/Button.tsx` ← **forwardRef 미적용** (Tooltip/Popover 버그의 나머지 절반)

**데모 페이지:**
- `demo/src/pages/DialogPage.tsx` (확인 — 표준 사용)
- `demo/src/pages/TooltipPopoverPage.tsx` (확인 — 표준 사용)

### 1.2 판정 기준

- **컴포넌트 문제**로 분류: 데모가 문서화된 공개 API를 표준적인 방식으로 호출하는데 동작하지 않을 때.
- **데모 문제**로 분류: 공개 API의 계약을 위반(필수 prop 누락, 잘못된 중첩, 잘못된 타입)했을 때.
- **둘 다 문제**로 분류: 컴포넌트의 계약이 명시돼 있지 않거나 가정이 숨어있어서 데모가 당연한 방식으로 쓰면 터지는 경우 — 이 경우 컴포넌트 쪽이 계약을 명시하거나 방어해야 함.

---

## 2. Dialog 결함 상세

### 2.1 증상

```tsx
<Dialog.Root>
  <Dialog.Trigger><Button>열기</Button></Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay />
    <Dialog.Content size="md">
      <Dialog.Header><Dialog.Title>...</Dialog.Title></Dialog.Header>
      <Dialog.Body>...</Dialog.Body>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

버튼 클릭 → 아무 일도 안 일어남. DOM에 overlay / content 요소가 전혀 추가되지 않음.

### 2.2 근본 원인 — Portal / Content 간 상호 교착 (deadlock)

**DialogRoot.tsx:26-28**
```tsx
const [animationState, setAnimationState] = useState<DialogAnimationState>(
  open ? "open" : "closed",
);
```
초기 `open=false` → `animationState = "closed"`.

**DialogPortal.tsx:8-13**
```tsx
if (typeof document === "undefined") return null;
if (ctx.animationState === "closed") return null;     // ← 게이트

const target = container ?? document.body;
return createPortal(children, target);
```
`animationState === "closed"`이면 자식을 **절대** 렌더하지 않음.

**DialogContent.tsx:66-81**
```tsx
useEffect(() => {
  if (ctx.open) {
    ctx.setAnimationState("opening");
    const timer = setTimeout(() => ctx.setAnimationState("open"), ENTER_DURATION);
    return () => clearTimeout(timer);
  }
  ...
}, [ctx.open]);
```
`animationState`를 `"opening"` → `"open"`으로 바꾸는 유일한 effect. **그런데 이 effect는 `DialogContent`가 마운트돼야 실행됨**.

**교착 단계:**

1. 초기 렌더: `open=false`, `animationState="closed"`, Portal이 null 반환. `DialogContent`는 React 트리에 **마운트되지 않음**. useEffect는 돌지 않음. ✅ 정상.
2. 사용자 클릭: `DialogTrigger`가 `setOpen(true)` 호출. `open=true`.
3. 재렌더: `DialogRoot` 컨텍스트 갱신. `DialogPortal`이 다시 평가됨.
4. **여전히 `animationState === "closed"`**. 이 값을 바꿀 effect가 아직 한 번도 안 돌았기 때문.
5. Portal은 또 null 반환. DialogContent는 여전히 안 마운트. effect는 안 돔.
6. 무한 정지 상태.

다이얼로그가 열리는 "자연스러운" 경로가 없다. 외부에서 `animationState`를 강제로 바꿔주는 주체가 어디에도 없다.

### 2.3 왜 이런 버그가 생겼나 (설계 가설)

- 의도: "닫힌 동안엔 Content를 언마운트해서 메모리/이벤트 리스너를 낭비하지 말자"
- 구현 위치 잘못: 언마운트 판정이 `animationState`에 의존하지만, `animationState`를 움직이는 로직은 **마운트돼야만 돌아감**. 체인이 자기 자신을 먹는 구조.

올바른 구현: 언마운트 판정은 **`open` 또는 `animationState !== "closed"`** 중 어느 하나라도 true면 마운트 유지. 그래야 `open=true`가 Portal을 열고, 마운트된 Content가 `animationState`를 `"opening" → "open"`으로 움직이고, `open=false`가 되면 Content가 `"closing" → "closed"`로 끝맺고, 그 후 Portal이 언마운트.

### 2.4 부수 관찰 (블로커는 아님)

- `DialogContent.tsx:73` — `setAnimationState((prev) => { if (prev === "open" || prev === "opening") return "closing"; return prev; });` — 초기 `prev === "closed"`일 때 그대로 반환. 만약 Portal 교착이 풀린 뒤에도 open이 true인 상태에서 재마운트되는 케이스라면 괜찮음.
- `DialogContent.tsx:81` — 의존성 배열이 `[ctx.open]`. `ctx` 자체가 매 렌더 새 객체지만 `ctx.open`만 보므로 무한 루프는 없다.
- `DialogRoot.tsx:38` — `const nestingLevel = parentLevel;`. 가장 바깥 Dialog가 `nestingLevel=0`, 그 안의 Dialog가 `nestingLevel=1`로 올라감. Provider로 `parentLevel+1`을 전달하므로 논리적으로 맞다.

### 2.5 수정안

**핵심 수정 (필수, 최소 변경):**

`src/components/Dialog/DialogPortal.tsx`

```tsx
import { createPortal } from "react-dom";
import { useDialogContext } from "./DialogContext";
import type { DialogPortalProps } from "./Dialog.types";

export function DialogPortal({ children, container }: DialogPortalProps) {
  const ctx = useDialogContext();

  if (typeof document === "undefined") return null;

  // open이 true이거나, 닫히는 애니메이션이 아직 끝나지 않은 동안 마운트 유지
  const shouldRender = ctx.open || ctx.animationState !== "closed";
  if (!shouldRender) return null;

  const target = container ?? document.body;
  return createPortal(children, target);
}
```

이 한 줄로 교착이 풀린다.
- `open=true`가 되면 Portal이 children을 커밋 → DialogContent 마운트 → `useEffect([ctx.open])` 실행 → `animationState`가 `"opening" → "open"`으로 이동.
- `open=false`가 되면 DialogContent useEffect가 `"closing"`으로 이동 → `EXIT_DURATION` 후 `"closed"`. 그 사이에도 `open=false` & `animationState!=="closed"`이므로 Portal은 계속 children 유지 → exit 애니메이션 정상 재생 → 마지막에 Portal이 null 반환하며 언마운트.

**검증 포인트:** DialogContent의 `useEffect([ctx.open])` 진입점이 open/close 양쪽을 다룸을 재확인. 코드를 봤을 때 이미 그렇다. 따라서 Portal 수정만으로 충분하다.

**대안 (채택하지 않음):**

- DialogRoot에서 `useEffect([open])`로 `animationState`를 직접 움직이기: 가능하지만 DialogContent의 useEffect와 이원화되어 중복 업데이트 위험. 지금 구조는 "Content가 자기 마운트 수명주기에 맞춰 애니메이션 상태를 관리"하는 단일 주인 원칙을 지키고 있으므로 그대로 두는 게 낫다.

---

## 3. Tooltip / Popover 결함 상세

### 3.1 증상

```tsx
<Tooltip.Root placement="top">
  <Tooltip.Trigger>
    <Button>hover</Button>
  </Tooltip.Trigger>
  <Tooltip.Content>
    <Tooltip.Arrow />
    Hello
  </Tooltip.Content>
</Tooltip.Root>
```

마우스 오버해도 툴팁이 시각적으로 뜨지 않음. Popover 역시 클릭 해도 보이지 않음.

### 3.2 근본 원인 — 트리거 ref 유실

**TooltipTrigger.tsx:65-84** (PopoverTrigger도 동일 구조)
```tsx
const existingRef = child.ref;
const mergedRef: Ref<HTMLElement> = (node) => {
  composedRef(node);              // triggerRef.current = node
  setRef(existingRef, node);
};

const injectedProps: TriggerChildProps = {
  onMouseEnter: handleMouseEnter,
  ...
  ref: mergedRef,                 // ← child.ref로 주입
};

return cloneElement<TriggerChildProps>(child, injectedProps);
```

`cloneElement`는 두 번째 인자의 `ref`를 새 element의 `ref`로 설정한다. 새 element의 `ref`가 호출되려면 해당 컴포넌트가 **`forwardRef`로 감싸져 있어야** 한다.

**Button.tsx:16**
```tsx
export function Button({ variant = "primary", size = "md", ... }: ButtonProps) {
  ...
  return <button {...rest}>...</button>;
}
```

`Button`은 **일반 함수 컴포넌트**. `forwardRef`가 적용돼 있지 않다. 따라서:

1. `cloneElement(<Button/>, { ref: mergedRef })` → React가 새 element에 `ref`를 단다.
2. 렌더 시점: React는 "function component에 ref를 달 수 없다"는 경고를 콘솔에 띄운다 (`Warning: Function components cannot be given refs...`).
3. `mergedRef`는 **호출되지 않는다**.
4. `triggerRef.current`는 영원히 `null`.

**결과 체인:**

**useFloating.ts:283-292**
```tsx
const update = useCallback(() => {
  const triggerEl = triggerRef.current;
  const floatingEl = floatingRef.current;
  if (!triggerEl || !floatingEl) return;     // ← 여기서 빠져나감
  ...
}, [desiredPlacement, offset, arrowPadding, flip]);
```

`triggerEl=null`이라 `update()`는 매번 no-op. `setPosition(...)`이 호출되지 않으므로 `isPositioned`는 초기값 `false`에 고정.

**TooltipContent.tsx:67,84**
```tsx
if (!isVisible) return null;
...
opacity: isPositioned ? opacity : 0,
```

`isVisible`은 `useAnimationState`가 `open`을 보고 결정하므로 true가 된다. 그러나 `opacity: isPositioned ? opacity : 0` 때문에 최종 스타일은 **`opacity: 0`**. DOM에는 툴팁 노드가 존재하지만 화면에 안 보인다. `pointerEvents: "none"`까지 걸려 있어 덧 투명한 요소를 클릭할 일도 없다.

Popover도 동일 경로: `PopoverContent.tsx:105` `opacity: isPositioned ? opacity : 0`.

> 확인하려면: DevTools로 body 끝쪽에 `role="tooltip"` 또는 `role="dialog"` 노드가 마운트는 되어 있지만 `opacity: 0`인지 확인하면 됨.

### 3.3 책임 분배 — 어느 쪽을 고쳐야 하나?

이 버그는 **두 지점의 합성**이다:

1. **Button이 ref를 받지 못한다** — 가장 일반적인 트리거 요소가 DOM 노드 참조를 밖으로 노출하지 않음. 재사용 가능한 "버튼" 원시로서는 결함.
2. **Trigger가 ref 유실을 방어하지 못한다** — cloneElement 전략은 `forwardRef` 컴포넌트에만 동작하는데, 명세에 이 요구사항이 명시돼 있지 않음.

Radix, Headless UI 등 업계 표준은 (1)을 **강제**한다 (`asChild`의 자식은 반드시 forwardRef여야 함). 여기서도 같은 방향이 맞다. Button을 forwardRef로 감싸는 것이 **주 수정**, Trigger 쪽 안전망은 **보조 수정**.

### 3.4 수정안

#### 3.4.1 주 수정 — `Button`을 forwardRef로 감싼다

`src/components/Button/Button.tsx`

```tsx
import { forwardRef } from "react";
import type { ButtonProps } from "./Button.types";

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      {...rest}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center rounded font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? <span aria-hidden="true">...</span> : children}
    </button>
  );
});
```

**영향도 검사:**

- `Button.types.ts`는 그대로. `ButtonProps`가 `ButtonHTMLAttributes<HTMLButtonElement>`를 extends한다는 가정.
- `export { Button }` 계약은 유지 (forwardRef로 감싼 것도 함수 호출로 사용 가능).
- 기존 호출부(`<Button variant="primary">...</Button>`)는 시그니처 변경 없음. 단, `Button.displayName`이 없으면 DevTools에 `Anonymous`로 찍힐 수 있으니 `Button.displayName = "Button"`를 추가해도 됨 (forwardRef의 function 문법 사용 시 자동으로 함수명이 잡히지만 명시 권장).

#### 3.4.2 보조 수정 — Close, PathInput.BrowseButton 등 다른 forward 지점 점검

`Dialog.Close` asChild 패턴 (`<Dialog.Close asChild><Button>취소</Button></Dialog.Close>`)도 같은 문제를 일으킬 수 있다. 현재 `DialogClose.tsx:48-56`은 ref를 주입하지 않으므로 바로 터지진 않지만, 추후 포커스 복귀 등에 ref가 필요해지면 같은 버그가 재현된다. 이번 범위에선 손대지 않는다 (기능 안전).

`PopoverClose`도 다시 봐야 한다. 그러나 Popover 동작 자체를 막지는 않으므로 후순위.

#### 3.4.3 방어적 보강 — Trigger가 ref 유실을 개발 모드에서 경고하도록 (옵션)

```tsx
// TooltipTrigger.tsx, PopoverTrigger.tsx, DialogTrigger.tsx 공통
if (process.env.NODE_ENV !== "production") {
  const child = children as ReactElement & { type?: unknown };
  const t: unknown = (child as { type?: unknown }).type;
  if (typeof t === "function" && !(t as { $$typeof?: symbol }).$$typeof) {
    // forwardRef는 $$typeof === Symbol.for("react.forward_ref")
    // 없으면 경고
    console.warn(
      "Trigger child must be a forwardRef component or a DOM element.",
    );
  }
}
```

**채택 여부:** 이번 수정에서는 **생략**한다. 런타임 경고보다는 타입으로 잡는 게 낫고, 현재 범위를 넘어선다. 필요하면 후속 PR.

#### 3.4.4 useFloating의 ref 활성화 타이밍 점검

현재 흐름을 되짚어 보면:

1. `open` false → `useFloating({ enabled: false })` — effect는 `setPosition(isPositioned: false)`만 하고 return.
2. 트리거 mouseenter → `scheduleShow()` → `setOpen(true)`.
3. 재렌더. `TooltipRoot`에서 `enabled: true`로 `useFloating` 재호출 → effect 재실행.
4. 이때 `floatingRef.current`는 아직 null (TooltipContent 렌더는 같은 commit에서 일어나지만, 자식 ref 커밋 → 자식 effect → 부모 effect 순으로 실행됨. useFloating effect는 TooltipRoot effect).
5. 자식 ref는 React의 commit 단계에서 부모 effect보다 **먼저** 붙는다. 따라서 effect 시점에는 `floatingRef.current !== null`, `triggerRef.current !== null`이어야 정상.

**현재 문제의 핵심은 (4)의 타이밍이 아니라** `triggerRef.current`가 Button의 forwardRef 부재로 **영영 null이라는 것**. Button을 forwardRef로 고치면 자연스럽게 해결된다.

부수적으로, `useFloating.ts:336-365`의 effect에서 `update()` 직후 ResizeObserver 등을 붙이는데, ref가 null이면 early return하고 observer도 못 붙는 상황이 있다. Button fix 후에는 문제없음.

### 3.5 데모 코드 확인 — 수정 필요 없음

`demo/src/pages/TooltipPopoverPage.tsx`의 모든 Tooltip/Popover 사용은 표준 compound 패턴이다. 컴포넌트 계약(자식은 ref를 forward해야 함)을 명시하지 않은 게 문제이지, 데모 쪽은 그 암묵 계약을 위반하지 않았다.

Button fix 후 데모는 **수정 없이** 동작한다.

---

## 4. Popover 추가 리스크 (블로커 아님, 참고)

- `PopoverRoot.tsx:102-113` — 외부 클릭 감지가 `pointerdown` 리스너로 되어 있음. 트리거가 `triggerRef.current`에 있어야 "트리거 자체를 클릭한 경우는 닫지 않는다" 조건이 동작. Button fix 후에만 제대로 작동. 그 전엔 트리거 클릭이 외부 클릭으로 잘못 판정되어 열자마자 닫히는 경합이 발생할 수도 있다.
- `PopoverContent.tsx:73-77` — `trapFocus` 시 `floatingRef`를 기반으로 포커스 트랩. Button fix 후 `triggerRef`가 유효해지면 `returnFocusTo: ctx.triggerRef` 복귀도 동작.
- **Popover.Close**는 내부 구현이 별도 버튼일 가능성이 높음 (`src/components/Popover/PopoverClose.tsx`). 닫기 동작 자체는 ref 의존이 아니므로 정상 작동한다고 가정.

이상은 Button fix로 자동 해결되는 파생 효과.

---

## 5. Dialog 파생 리스크 (블로커 아님, 참고)

- `DialogContent.tsx:83-100` — `pointerdown` 바깥 클릭 감지. `contentRef.current`로 비교. Content가 마운트된 뒤에만 리스너가 붙으므로 Portal fix 후 정상.
- `DialogContent.tsx:102-118` — `onKeyDown`에서 Escape 처리. Content가 포커스를 받지 못하면 Escape가 안 먹힐 수 있지만, `useFocusTrap`이 initialFocus를 잡아주므로 정상.
- `DialogContent.tsx:55` — `useScrollLock(isOpenState)`. Portal fix 후 정상.
- `DialogContent.tsx:57-64` — `useFocusTrap(contentRef, { enabled: isOpenState, returnFocusTo: ctx.triggerRef, ... })`. `triggerRef`는 `DialogTrigger`가 cloneElement ref 주입으로 세팅. `<Dialog.Trigger><Button/></Dialog.Trigger>` 패턴에서는 **Button이 forwardRef가 아니라서 triggerRef가 null이 된다**. 포커스 복귀가 작동하지 않는다. **따라서 Dialog도 Button forwardRef 수정의 수혜자**.

즉 Button fix는 Dialog의 포커스 복귀 문제도 동시에 해결한다.

---

## 6. 수정 대상 파일 (최종)

### 필수 수정

1. **`src/components/Dialog/DialogPortal.tsx`** — Portal 마운트 조건을 `open || animationState !== "closed"`로 확장 (§2.5)
2. **`src/components/Button/Button.tsx`** — `forwardRef<HTMLButtonElement, ButtonProps>`로 감싸고 `ref={ref}`를 내부 `<button>`에 전달 (§3.4.1)

### 수정 불필요 (확인만)

- `src/components/Dialog/DialogContent.tsx` — 현재 `useEffect([ctx.open])`가 open/close 양방향 애니메이션을 모두 관리. Portal fix 후 자연스럽게 동작.
- `src/components/Dialog/DialogRoot.tsx` — animationState 초기값 `open ? "open" : "closed"`는 controlled open 케이스에도 호환.
- `src/components/Tooltip/*`, `src/components/Popover/*` — 로직 수정 없음.
- `demo/src/pages/DialogPage.tsx`, `demo/src/pages/TooltipPopoverPage.tsx` — 수정 없음.

### 선택 수정 (이번 PR에서는 생략 권장)

- Trigger들에 dev-mode forwardRef 경고 (§3.4.3)
- `DialogClose`, `PopoverClose`의 asChild ref 전파 (현재 기능 안전, 포커스 향상 여지만 있음)
- `Button.displayName = "Button"` 명시

---

## 7. 검증 계획

### 7.1 자동화

```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

- 타입 에러 없어야 함. `forwardRef` 도입으로 `Button`의 export shape가 ForwardRefExoticComponent로 바뀌므로, 이를 타입으로 쓰는 지점이 있는지 grep 확인.

```bash
grep -r "typeof Button" src/ demo/
grep -r "ReturnType<typeof Button>" src/ demo/
```

없으면 안전.

### 7.2 수동 (demo dev server)

```bash
cd demo && npm run dev
```

**Dialog 시나리오** (`#/dialog` 라우트):
- [ ] "기본 다이얼로그 열기" 클릭 → overlay + content가 body에 붙고 중앙 정렬, 페이드 인.
- [ ] Escape 키 → 다이얼로그 닫힘 + 버튼으로 포커스 복귀.
- [ ] overlay 클릭 → 닫힘.
- [ ] "계정 삭제" (variant="alert", closeOnEscape=false) → Escape로 안 닫힘, 외부 클릭으로도 안 닫힘, 버튼 클릭만 동작.
- [ ] "긴 본문" → body 영역만 스크롤되고 footer는 고정.
- [ ] 중첩 다이얼로그 → 내부 다이얼로그가 외부 위에 렌더, zIndex 순서 맞음, 내부 닫기 시 외부는 열린 채 유지.
- [ ] "링크로 열기" (asChild `<a>`) → 링크 클릭으로 열림.
- [ ] 폼 다이얼로그에서 저장 → `onOpenChange(false)` 호출, 다이얼로그 닫힘, 제출된 값 표시.

**Tooltip 시나리오** (`#/tooltip` 라우트):
- [ ] Tooltip Basic: top/right/bottom/left 4개 버튼에 hover → 각 방향에 툴팁, 화살표 위치 정상.
- [ ] Tooltip Placements 12종 전부 표시 확인.
- [ ] Controlled 외부 state 토글 → 툴팁 제어 가능.
- [ ] Delay 0/0 → 즉시 표시, 1000/500 → 느림.
- [ ] Dark 테마 → 어두운 배경으로 전환.

**Popover 시나리오** (같은 라우트):
- [ ] Basic: 클릭 → 열림, overlay는 없지만 외부 클릭 시 닫힘, Escape로 닫힘.
- [ ] Click vs Hover 모드 전환 확인.
- [ ] Form: 인풋에 타이핑, 저장 → 닫힘, "현재: 이름" 반영.
- [ ] Nested: 외부 열고 내부 열기 → 내부만 별도 위치, 내부 닫기 시 외부 유지.
- [ ] Modal (trapFocus): Tab이 팝오버 내에서 순환.

**회귀 확인:**
- [ ] CommandPalette 여는 트리거 버튼 (Button을 사용하는 모든 페이지) 정상.
- [ ] Actionable의 내부 버튼류 정상 (Button을 쓰지는 않지만 ref 경로를 공유할 수 있어 체크).
- [ ] PathInput의 BrowseButton (Button 래핑) 정상.

---

## 8. 롤아웃 순서

1. Button forwardRef 전환 (`src/components/Button/Button.tsx`)
2. `npm run typecheck` → 타입 에러 없음 확인
3. DialogPortal 수정 (`src/components/Dialog/DialogPortal.tsx`)
4. `npx tsup` → 빌드 성공
5. `cd demo && npm run dev` → §7.2 체크리스트 통과
6. 커밋 단위: **두 수정 각각 개별 커밋** (`fix: Button forwardRef`, `fix: DialogPortal mount gate`) — 원인-결과가 다른 두 버그이므로 분리. bisect 친화.

---

## 9. 예상 후속 작업 (본 PR 범위 외)

- 모든 Trigger류(Tooltip.Trigger, Popover.Trigger, Dialog.Trigger, Actionable의 Trigger 계열)가 자식 컴포넌트에 forwardRef를 요구한다는 사실을 README 또는 compound pattern 가이드에 명시.
- `DialogClose asChild` / `PopoverClose asChild`의 ref 전파 구현 (자식이 버튼 외 요소일 때 포커스 체인 보존).
- Tooltip/Popover의 `content`에도 ref를 노출하는 공개 API (고급 사용자가 외부에서 floating 요소에 접근하고 싶을 때).
- E2E 테스트 도입 (Playwright 등)으로 이런 교착·ref 유실 류 이슈가 dev server 없이도 감지되도록.

---

## 10. 진단 근거 요약 (한 페이지)

```
Dialog:
  초기:   open=false  animationState="closed"
  클릭:   open=true   (DialogTrigger.setOpen)
  Portal: animationState !== "closed" 이어야 render
          → false → null 반환 → DialogContent 안 마운트
          → useEffect([ctx.open]) 안 실행
          → animationState는 영원히 "closed"
  교착.  fix: Portal의 게이트를 `open || animationState !== "closed"`로.

Tooltip / Popover:
  Trigger: cloneElement(<Button/>, { ref: mergedRef })
  Button:  function component, forwardRef 없음
           → React: "Function components cannot be given refs" warn
           → ref 호출되지 않음 → triggerRef.current = null
  useFloating.update(): !triggerEl → early return
           → isPositioned = false (고정)
  Content: opacity: isPositioned ? opacity : 0
           → opacity: 0, DOM에는 있지만 안 보임
  fix:    Button을 forwardRef<HTMLButtonElement, ButtonProps>로 전환.
```

---

**끝.**
