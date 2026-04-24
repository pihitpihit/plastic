# Stepper / Wizard 컴포넌트 설계문서

## 1. Context

plastic 라이브러리에 6번째 컴포넌트 `Stepper`를 추가한다.
다단계 폼(wizard), 온보딩 플로우, 주문 프로세스 등에서 사용하는 **단계 표시기 + 콘텐츠 패널** 복합 컨트롤이다.

핵심 설계 목표:
- **Compound component 패턴**: `Object.assign(StepperRoot, { List, Step, ... })` — Card, PathInput과 동일한 구조
- **Controlled / Uncontrolled**: `useControllable` 훅으로 `activeStep` + `onStepChange` 지원
- **선형 / 비선형 네비게이션**: 선형 모드에서는 순차 이동만, 비선형 모드에서는 완료된 스텝 클릭 이동
- **검증 게이트**: `onBeforeNext` 콜백이 `false | Promise<false>` 반환 시 다음 단계 진행 차단
- **3가지 시각 변형**: `default` (번호 원), `dots` (작은 점), `progress` (진행 바)
- **수평 / 수직 방향**: 분리선 애니메이션 방향 자동 전환
- **콘텐츠 전환 애니메이션**: 방향 인식 slide + fade
- **테마**: `"light" | "dark"` Record 색상 맵
- **접근성**: WAI-ARIA stepper 패턴 (`aria-current="step"`, `role="tablist"` / `role="tabpanel"`)

---

## 2. Compound Component 구조

```
Stepper.Root              상태 관리, Context 제공, 전체 래퍼
Stepper.List              스텝 표시기 목록 (수평/수직 컨테이너)
Stepper.Step              개별 스텝 표시기 (번호/아이콘 + 라벨)
Stepper.Separator         스텝 간 연결선 (진행 애니메이션)
Stepper.Content           콘텐츠 패널 영역 (현재 스텝의 Panel 렌더)
Stepper.Panel             개별 스텝의 콘텐츠 (step 인덱스로 매칭)
Stepper.Actions           네비게이션 버튼 영역
Stepper.PrevButton        이전 단계 버튼
Stepper.NextButton        다음 단계 버튼 (검증 게이트 연동)
Stepper.CompleteButton    최종 완료 버튼
```

### 파일 구조

```
src/components/Stepper/
  Stepper.types.ts          타입 전체 정의
  StepperRoot.tsx            Context, 상태 머신 (~150줄)
  StepperList.tsx            수평/수직 스텝 목록 (~60줄)
  StepperStep.tsx            개별 스텝 인디케이터 (~120줄)
  StepperSeparator.tsx       연결선 + 진행 애니메이션 (~70줄)
  StepperContent.tsx         콘텐츠 영역 + 전환 애니메이션 (~80줄)
  StepperPanel.tsx           개별 패널 (~30줄)
  StepperActions.tsx         액션 버튼 컨테이너 (~20줄)
  StepperPrevButton.tsx      이전 버튼 (~40줄)
  StepperNextButton.tsx      다음 버튼 + 검증 (~60줄)
  StepperCompleteButton.tsx  완료 버튼 (~40줄)
  Stepper.tsx                Object.assign 조립
  index.ts                   배럴 export
```

---

## 3. 사용 패턴

### 기본 위자드

```tsx
import { Stepper } from "plastic";

function BasicWizard() {
  return (
    <Stepper.Root totalSteps={4}>
      <Stepper.List>
        <Stepper.Step index={0} label="계정 정보" />
        <Stepper.Separator />
        <Stepper.Step index={1} label="프로필 설정" />
        <Stepper.Separator />
        <Stepper.Step index={2} label="결제 정보" />
        <Stepper.Separator />
        <Stepper.Step index={3} label="확인" />
      </Stepper.List>

      <Stepper.Content>
        <Stepper.Panel index={0}>
          <AccountForm />
        </Stepper.Panel>
        <Stepper.Panel index={1}>
          <ProfileForm />
        </Stepper.Panel>
        <Stepper.Panel index={2}>
          <PaymentForm />
        </Stepper.Panel>
        <Stepper.Panel index={3}>
          <ConfirmationView />
        </Stepper.Panel>
      </Stepper.Content>

      <Stepper.Actions>
        <Stepper.PrevButton>이전</Stepper.PrevButton>
        <Stepper.NextButton>다음</Stepper.NextButton>
        <Stepper.CompleteButton>완료</Stepper.CompleteButton>
      </Stepper.Actions>
    </Stepper.Root>
  );
}
```

### 수직 방향

```tsx
<Stepper.Root totalSteps={3} orientation="vertical">
  <div style={{ display: "flex", gap: "2rem" }}>
    <Stepper.List>
      <Stepper.Step index={0} label="Step 1" description="First step" />
      <Stepper.Separator />
      <Stepper.Step index={1} label="Step 2" description="Second step" />
      <Stepper.Separator />
      <Stepper.Step index={2} label="Step 3" description="Third step" />
    </Stepper.List>

    <Stepper.Content>
      <Stepper.Panel index={0}>Content 1</Stepper.Panel>
      <Stepper.Panel index={1}>Content 2</Stepper.Panel>
      <Stepper.Panel index={2}>Content 3</Stepper.Panel>
    </Stepper.Content>
  </div>

  <Stepper.Actions>
    <Stepper.PrevButton />
    <Stepper.NextButton />
    <Stepper.CompleteButton />
  </Stepper.Actions>
</Stepper.Root>
```

### 비선형 네비게이션

```tsx
<Stepper.Root totalSteps={4} linear={false}>
  {/* Step 클릭으로 자유 이동 (단, disabled 스텝은 제외) */}
  <Stepper.List>
    <Stepper.Step index={0} label="General" />
    <Stepper.Separator />
    <Stepper.Step index={1} label="Details" />
    <Stepper.Separator />
    <Stepper.Step index={2} label="Review" />
    <Stepper.Separator />
    <Stepper.Step index={3} label="Submit" />
  </Stepper.List>
  {/* ... */}
</Stepper.Root>
```

### 검증 게이트 (비동기)

```tsx
<Stepper.Root
  totalSteps={3}
  onBeforeNext={async (currentStep) => {
    if (currentStep === 0) {
      const valid = await validateAccountForm();
      if (!valid) {
        setStepErrors({ 0: "Please fill all required fields" });
        return false;
      }
    }
    return true;
  }}
>
  {/* ... */}
</Stepper.Root>
```

### 제어 모드

```tsx
function ControlledStepper() {
  const [step, setStep] = useState(0);

  return (
    <Stepper.Root
      totalSteps={3}
      activeStep={step}
      onStepChange={setStep}
    >
      {/* ... */}
    </Stepper.Root>
  );
}
```

### 커스텀 아이콘

```tsx
<Stepper.Step index={0} label="Upload" icon={<UploadIcon />} />
<Stepper.Step index={1} label="Process" icon={<GearIcon />} />
<Stepper.Step index={2} label="Done" icon={<CheckIcon />} />
```

### 에러 상태

```tsx
<Stepper.Root totalSteps={3} stepErrors={{ 1: "Validation failed" }}>
  <Stepper.List>
    <Stepper.Step index={0} label="Step 1" />
    <Stepper.Separator />
    <Stepper.Step index={1} label="Step 2" /> {/* error 상태로 렌더 */}
    <Stepper.Separator />
    <Stepper.Step index={2} label="Step 3" />
  </Stepper.List>
  {/* ... */}
</Stepper.Root>
```

### Variant: dots

```tsx
<Stepper.Root totalSteps={4} variant="dots">
  <Stepper.List>
    <Stepper.Step index={0} />
    <Stepper.Separator />
    <Stepper.Step index={1} />
    <Stepper.Separator />
    <Stepper.Step index={2} />
    <Stepper.Separator />
    <Stepper.Step index={3} />
  </Stepper.List>
  {/* ... */}
</Stepper.Root>
```

### Variant: progress

```tsx
<Stepper.Root totalSteps={5} variant="progress">
  <Stepper.List /> {/* Step/Separator 없이 자동 진행 바 렌더 */}
  {/* ... */}
</Stepper.Root>
```

---

## 4. TypeScript 인터페이스

### 공통 타입

```typescript
export type StepperTheme = "light" | "dark";
export type StepperOrientation = "horizontal" | "vertical";
export type StepperVariant = "default" | "dots" | "progress";

export type StepStatus =
  | "incomplete"   // 미래 스텝, 비활성
  | "current"      // 현재 활성 스텝
  | "complete"     // 완료된 스텝 (체크마크)
  | "error"        // 검증 실패 (빨간 표시)
  | "disabled";    // 네비게이션 불가

export interface StepMeta {
  index: number;
  status: StepStatus;
  label?: string | undefined;
  description?: string | undefined;
  errorMessage?: string | undefined;
}
```

### Root Props

```typescript
export interface StepperRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;

  // ── 스텝 수 (필수) ──────────────────────────
  totalSteps: number;

  // ── 활성 스텝 (controlled / uncontrolled) ───
  activeStep?: number | undefined;
  defaultActiveStep?: number | undefined;
  onStepChange?: ((step: number) => void) | undefined;

  // ── 네비게이션 ──────────────────────────────
  linear?: boolean | undefined;                // default: true
  onBeforeNext?: ((currentStep: number) => boolean | Promise<boolean>) | undefined;
  onBeforePrev?: ((currentStep: number) => boolean | Promise<boolean>) | undefined;

  // ── 스텝 에러 ──────────────────────────────
  stepErrors?: Record<number, string> | undefined;

  // ── 완료된 스텝 (외부 제어) ────────────────
  completedSteps?: Set<number> | undefined;

  // ── 비활성 스텝 ────────────────────────────
  disabledSteps?: Set<number> | undefined;

  // ── 시각 ────────────────────────────────────
  orientation?: StepperOrientation | undefined; // default: "horizontal"
  variant?: StepperVariant | undefined;         // default: "default"
  theme?: StepperTheme | undefined;             // default: "light"

  // ── 콜백 ───────────────────────────────────
  onComplete?: (() => void) | undefined;        // CompleteButton 클릭 시
}
```

### List Props

```typescript
export interface StepperListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Step Props

```typescript
export interface StepperStepProps extends HTMLAttributes<HTMLButtonElement> {
  index: number;
  label?: string | undefined;
  description?: string | undefined;
  icon?: ReactNode | undefined;            // 커스텀 아이콘 (default variant에서만)
  completedIcon?: ReactNode | undefined;   // 완료 시 커스텀 아이콘 (기본: 체크마크)
  errorIcon?: ReactNode | undefined;       // 에러 시 커스텀 아이콘 (기본: 느낌표)
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Separator Props

```typescript
export interface StepperSeparatorProps extends HTMLAttributes<HTMLDivElement> {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### Content Props

```typescript
export interface StepperContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;

  // ── 전환 애니메이션 ────────────────────────
  transitionDuration?: number | undefined;   // default: 300 (ms)
  disableTransition?: boolean | undefined;   // default: false
}
```

### Panel Props

```typescript
export interface StepperPanelProps extends HTMLAttributes<HTMLDivElement> {
  index: number;
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;

  // 패널이 비활성일 때도 DOM에 유지할지 여부
  forceMount?: boolean | undefined;         // default: false
}
```

### Actions Props

```typescript
export interface StepperActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}
```

### PrevButton Props

```typescript
export interface StepperPrevButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;         // default: "Previous"
  className?: string | undefined;
  style?: CSSProperties | undefined;
  hideOnFirst?: boolean | undefined;        // default: true (첫 스텝에서 숨김)
}
```

### NextButton Props

```typescript
export interface StepperNextButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;         // default: "Next"
  className?: string | undefined;
  style?: CSSProperties | undefined;
  hideOnLast?: boolean | undefined;         // default: true (마지막 스텝에서 숨김)
}
```

### CompleteButton Props

```typescript
export interface StepperCompleteButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> {
  children?: ReactNode | undefined;         // default: "Complete"
  className?: string | undefined;
  style?: CSSProperties | undefined;
  showOnlyOnLast?: boolean | undefined;     // default: true
}
```

---

## 5. Context 구조

```typescript
interface StepperContextValue {
  // ── 상태 ────────────────────────────────────
  activeStep: number;
  totalSteps: number;
  direction: "forward" | "backward";        // 마지막 전환 방향 (애니메이션용)
  isNavigating: boolean;                    // 비동기 검증 중 여부

  // ── 스텝 메타 ──────────────────────────────
  getStepStatus: (index: number) => StepStatus;
  stepErrors: Record<number, string>;
  completedSteps: Set<number>;
  disabledSteps: Set<number>;

  // ── 네비게이션 ──────────────────────────────
  goToStep: (index: number) => Promise<void>;
  goNext: () => Promise<void>;
  goPrev: () => Promise<void>;
  complete: () => void;

  // ── 설정 ────────────────────────────────────
  orientation: StepperOrientation;
  variant: StepperVariant;
  theme: StepperTheme;
  linear: boolean;

  // ── 접근성 ──────────────────────────────────
  listId: string;                           // useId()
  getStepId: (index: number) => string;
  getPanelId: (index: number) => string;
}

const StepperContext = createContext<StepperContextValue | null>(null);

export function useStepperContext(): StepperContextValue {
  const ctx = useContext(StepperContext);
  if (!ctx) throw new Error("Stepper sub-components must be used within Stepper.Root");
  return ctx;
}
```

### 공개 훅 (소비자 유틸리티)

```typescript
// src/components/Stepper/useStepper.ts
// 소비자가 Stepper.Root 내부에서 스텝 상태에 접근할 때 사용

export function useStepper() {
  const ctx = useStepperContext();
  return {
    activeStep: ctx.activeStep,
    totalSteps: ctx.totalSteps,
    isFirst: ctx.activeStep === 0,
    isLast: ctx.activeStep === ctx.totalSteps - 1,
    goNext: ctx.goNext,
    goPrev: ctx.goPrev,
    goToStep: ctx.goToStep,
    getStepStatus: ctx.getStepStatus,
    isNavigating: ctx.isNavigating,
  };
}
```

---

## 6. 상태 머신

### 스텝 상태 결정 로직

```typescript
function getStepStatus(
  index: number,
  activeStep: number,
  completedSteps: Set<number>,
  disabledSteps: Set<number>,
  stepErrors: Record<number, string>,
): StepStatus {
  if (disabledSteps.has(index)) return "disabled";
  if (stepErrors[index] !== undefined) return "error";
  if (index === activeStep) return "current";
  if (completedSteps.has(index)) return "complete";
  return "incomplete";
}
```

### 네비게이션 전이도

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IDLE (isNavigating: false)                    │
│                                                                     │
│  goNext() ──────────────────────┬──→ onBeforeNext 없음?             │
│                                 │    YES → setActiveStep(cur + 1)   │
│                                 │         completedSteps.add(cur)   │
│                                 │         direction = "forward"     │
│                                 │                                   │
│                                 └──→ onBeforeNext 있음?             │
│                                      YES → VALIDATING 상태 전환     │
│                                                                     │
│  goPrev() ──────────────────────┬──→ onBeforePrev 없음?             │
│                                 │    YES → setActiveStep(cur - 1)   │
│                                 │         direction = "backward"    │
│                                 │                                   │
│                                 └──→ onBeforePrev 있음?             │
│                                      YES → VALIDATING 상태 전환     │
│                                                                     │
│  goToStep(i) ───────────────────┬──→ linear && !canNavigate(i)?     │
│                                 │    YES → 무시 (no-op)             │
│                                 │                                   │
│                                 └──→ disabled(i)?                   │
│                                      YES → 무시                     │
│                                      NO  → setActiveStep(i)        │
│                                           direction = i > cur       │
│                                             ? "forward"             │
│                                             : "backward"            │
│                                                                     │
│  complete() ────────────────────────→ onComplete() 호출             │
│                                       completedSteps.add(cur)       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     VALIDATING (isNavigating: true)                  │
│                                                                     │
│  const allowed = await onBeforeNext(currentStep);                   │
│                                                                     │
│  allowed === true  → 스텝 전환 실행, IDLE 복귀                      │
│  allowed === false → 전환 차단, IDLE 복귀 (스텝 유지)               │
│  Promise reject    → 전환 차단, IDLE 복귀, console.error            │
│                                                                     │
│  모든 버튼은 isNavigating === true 동안 disabled                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 선형 vs 비선형 네비게이션

```typescript
function canNavigateToStep(index: number): boolean {
  if (disabledSteps.has(index)) return false;
  if (!linear) return true; // 비선형: 어디든 이동 가능 (disabled 제외)
  // 선형: 현재 스텝 ± 1 또는 이미 완료된 스텝만
  return (
    index === activeStep - 1 ||
    index === activeStep + 1 ||
    completedSteps.has(index) ||
    index === activeStep
  );
}
```

### goNext 구현

```typescript
const goNext = useCallback(async () => {
  if (isNavigating) return;
  if (activeStep >= totalSteps - 1) return;

  if (onBeforeNext) {
    setIsNavigating(true);
    try {
      const allowed = await onBeforeNext(activeStep);
      if (!allowed) {
        setIsNavigating(false);
        return;
      }
    } catch (err) {
      console.error("Stepper: onBeforeNext threw an error:", err);
      setIsNavigating(false);
      return;
    }
  }

  setDirection("forward");
  // completedSteps 업데이트: uncontrolled 모드에서 내부 관리
  if (completedSteps === undefined) {
    setInternalCompleted(prev => {
      const next = new Set(prev);
      next.add(activeStep);
      return next;
    });
  }
  setActiveStep(activeStep + 1);
  setIsNavigating(false);
}, [activeStep, totalSteps, onBeforeNext, isNavigating, completedSteps]);
```

### goPrev 구현

```typescript
const goPrev = useCallback(async () => {
  if (isNavigating) return;
  if (activeStep <= 0) return;

  if (onBeforePrev) {
    setIsNavigating(true);
    try {
      const allowed = await onBeforePrev(activeStep);
      if (!allowed) {
        setIsNavigating(false);
        return;
      }
    } catch (err) {
      console.error("Stepper: onBeforePrev threw an error:", err);
      setIsNavigating(false);
      return;
    }
  }

  setDirection("backward");
  setActiveStep(activeStep - 1);
  setIsNavigating(false);
}, [activeStep, onBeforePrev, isNavigating]);
```

---

## 7. DOM 구조

### 수평 레이아웃 (orientation="horizontal")

```html
<!-- Stepper.Root -->
<div class="stepper-root" data-orientation="horizontal" data-theme="light">

  <!-- Stepper.List -->
  <div role="tablist" aria-label="Progress" aria-orientation="horizontal"
       style="display: flex; align-items: center; justify-content: center;">

    <!-- Stepper.Step index=0 (current) -->
    <button role="tab"
            id="stepper-{id}-step-0"
            aria-selected="true"
            aria-current="step"
            aria-controls="stepper-{id}-panel-0"
            style="display: flex; flex-direction: column; align-items: center; gap: 8px;
                   background: none; border: none; cursor: pointer; padding: 0;"
    >
      <!-- 인디케이터 원 -->
      <div style="width: 36px; height: 36px; border-radius: 50%;
                  display: flex; align-items: center; justify-content: center;
                  background: #3b82f6; color: #ffffff;
                  font-size: 14px; font-weight: 600;
                  transition: background-color 200ms ease, transform 200ms ease;">
        1
      </div>
      <!-- 라벨 -->
      <span style="font-size: 13px; font-weight: 500; color: #3b82f6;">
        계정 정보
      </span>
    </button>

    <!-- Stepper.Separator (0→1, incomplete) -->
    <div role="separator" aria-hidden="true"
         style="flex: 1; height: 2px; margin: 0 12px; position: relative;
                background: #d1d5db; align-self: flex-start; margin-top: 18px;">
      <!-- 진행 채움 오버레이 -->
      <div style="position: absolute; top: 0; left: 0; height: 100%;
                  width: 0%; background: #3b82f6;
                  transition: width 400ms ease;" />
    </div>

    <!-- Stepper.Step index=1 (incomplete) -->
    <button role="tab"
            id="stepper-{id}-step-1"
            aria-selected="false"
            aria-controls="stepper-{id}-panel-1"
            tabindex="-1"
            style="..."
    >
      <div style="... background: #e5e7eb; color: #9ca3af; ...">
        2
      </div>
      <span style="font-size: 13px; color: #9ca3af;">
        프로필 설정
      </span>
    </button>

    <!-- ... more separators and steps ... -->
  </div>

  <!-- Stepper.Content -->
  <div style="position: relative; overflow: hidden; min-height: 200px; margin-top: 24px;">

    <!-- Stepper.Panel index=0 (active) -->
    <div role="tabpanel"
         id="stepper-{id}-panel-0"
         aria-labelledby="stepper-{id}-step-0"
         style="opacity: 1; transform: translateX(0);
                transition: opacity 300ms ease, transform 300ms ease;"
    >
      <!-- 사용자 콘텐츠 -->
    </div>

    <!-- Stepper.Panel index=1 (hidden) -->
    <!-- forceMount=false: DOM에서 제거됨 -->

  </div>

  <!-- Stepper.Actions -->
  <div style="display: flex; justify-content: space-between; align-items: center;
              margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">

    <!-- Stepper.PrevButton (첫 스텝이므로 숨김) -->
    <!-- 렌더되지 않음 (hideOnFirst=true) -->

    <div style="flex: 1;" /> <!-- 스페이서 -->

    <!-- Stepper.NextButton -->
    <button style="padding: 8px 20px; border-radius: 6px;
                   background: #3b82f6; color: #ffffff; font-size: 14px;
                   font-weight: 500; border: none; cursor: pointer;">
      다음
    </button>
  </div>
</div>
```

### 수직 레이아웃 (orientation="vertical")

```html
<div class="stepper-root" data-orientation="vertical" data-theme="light">

  <div style="display: flex; gap: 32px;">

    <!-- Stepper.List (수직) -->
    <div role="tablist" aria-label="Progress" aria-orientation="vertical"
         style="display: flex; flex-direction: column; align-items: flex-start;
                gap: 0; flex-shrink: 0; width: 180px;">

      <!-- Step 0 -->
      <button role="tab" aria-selected="true" aria-current="step"
              style="display: flex; align-items: center; gap: 12px; ...">
        <div style="width: 36px; height: 36px; border-radius: 50%; ...">1</div>
        <div>
          <span style="font-size: 13px; font-weight: 500;">Step 1</span>
          <span style="font-size: 11px; color: #9ca3af; display: block;">First step</span>
        </div>
      </button>

      <!-- Separator (수직) -->
      <div role="separator" aria-hidden="true"
           style="width: 2px; height: 40px; margin-left: 17px;
                  position: relative; background: #d1d5db;">
        <div style="position: absolute; top: 0; left: 0; width: 100%;
                    height: 100%; background: #3b82f6;
                    transition: height 400ms ease;" />
      </div>

      <!-- Step 1 -->
      <!-- ... -->
    </div>

    <!-- Stepper.Content -->
    <div style="flex: 1; position: relative; overflow: hidden;">
      <!-- panels -->
    </div>

  </div>

  <!-- Stepper.Actions -->
  <div style="..."><!-- 버튼들 --></div>
</div>
```

### dots variant DOM 변형

```html
<!-- Step 인디케이터가 작은 점으로 대체됨 -->
<button role="tab" ...>
  <div style="width: 12px; height: 12px; border-radius: 50%;
              background: #3b82f6;
              transition: background-color 200ms ease, transform 200ms ease;" />
  <!-- 라벨 없음 (label prop 무시) -->
</button>

<!-- Separator 간격 축소 -->
<div role="separator" style="flex: 1; height: 2px; margin: 0 6px; ..." />
```

### progress variant DOM 변형

```html
<!-- Stepper.List가 프로그레스 바 하나로 대체됨 -->
<div role="progressbar"
     aria-valuenow={2}
     aria-valuemin={0}
     aria-valuemax={4}
     aria-label="Step 2 of 4"
     style="width: 100%; height: 8px; border-radius: 4px;
            background: #e5e7eb; overflow: hidden;">
  <div style="height: 100%; border-radius: 4px;
              width: 50%; background: #3b82f6;
              transition: width 400ms ease;" />
</div>
<!-- Step/Separator children은 progress variant에서 무시됨 -->
```

---

## 8. 분리선 애니메이션

### 원리

Separator는 두 개의 레이어로 구성된다:
1. **배경 트랙** (회색) — 전체 너비/높이
2. **채움 오버레이** (활성 색상) — 현재 진행 상태에 따라 0~100%

채움 퍼센트 결정:
```typescript
function getSeparatorFill(
  separatorIndex: number,  // 0-based, Step 사이의 순서
  activeStep: number,
  completedSteps: Set<number>,
): number {
  // separatorIndex는 step[separatorIndex]와 step[separatorIndex+1] 사이
  // step[separatorIndex]가 완료됨 → 100% 채움
  if (completedSteps.has(separatorIndex)) return 100;
  // step[separatorIndex]가 현재 활성 → 0% (아직 완료 안 됨)
  if (separatorIndex === activeStep) return 0;
  // 그 외 → 0%
  return 0;
}
```

### Separator 컴포넌트에서 separatorIndex 자동 결정

Separator는 `index` prop을 받지 않는다. 대신 Context에서 Separator가 렌더 순서를 기반으로 자신의 인덱스를 결정한다.

구현 방식 — Root에 카운터:
```typescript
// StepperRoot 내부
const separatorCountRef = useRef(0);

// reset on each render cycle
useEffect(() => {
  separatorCountRef.current = 0;
});

const getNextSeparatorIndex = useCallback(() => {
  return separatorCountRef.current++;
}, []);
```

이 접근은 렌더 순서 의존성 문제가 있다. 더 안전한 대안 — **Separator에 명시적으로 연결된 스텝 인덱스를 전달하지 않고, Separator의 위치를 List children 순서에서 추론**:

```typescript
// StepperList.tsx 내부
// children을 순회하면서 Separator에 내부 prop으로 인덱스 주입
const enhancedChildren = React.Children.map(children, (child) => {
  if (!React.isValidElement(child)) return child;

  if (child.type === StepperSeparatorInternal) {
    return React.cloneElement(child, {
      __separatorIndex: separatorCounter++,
    } as any);
  }
  return child;
});
```

실제 구현에서는 더 간단한 방법을 사용한다 — Separator가 이전 Step의 인덱스를 기준으로 채움을 결정:

```typescript
// StepperSeparator.tsx
export function StepperSeparator({ className = "", style, ...rest }: StepperSeparatorProps) {
  const ctx = useStepperContext();
  const indexRef = useRef(-1);

  // List가 children 순회 시 주입하는 내부 prop
  const __separatorIndex = (rest as any).__separatorIndex as number | undefined;
  if (__separatorIndex !== undefined) {
    indexRef.current = __separatorIndex;
  }
  const sepIndex = indexRef.current;

  // 채움 결정
  const fill = ctx.completedSteps.has(sepIndex) ? 100 : 0;

  const isHorizontal = ctx.orientation === "horizontal";

  const trackStyle: CSSProperties = {
    position: "relative",
    background: SEPARATOR_TRACK_COLORS[ctx.theme],
    ...(isHorizontal
      ? { flex: 1, height: 2, margin: "0 12px", alignSelf: "flex-start", marginTop: 18 }
      : { width: 2, height: 40, marginLeft: 17 }),
    ...style,
  };

  const fillStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    background: STEP_COLORS[ctx.theme].active,
    ...(isHorizontal
      ? { height: "100%", width: `${fill}%`, transition: "width 400ms ease" }
      : { width: "100%", height: `${fill}%`, transition: "height 400ms ease" }),
  };

  return (
    <div
      role="separator"
      aria-hidden="true"
      className={className}
      style={trackStyle}
      {...rest}
    >
      <div style={fillStyle} />
    </div>
  );
}
```

### CSS transition 스펙

| 속성 | 방향 | 시간 | 이징 |
|------|------|------|------|
| `width` | horizontal | 400ms | `ease` |
| `height` | vertical | 400ms | `ease` |

채움이 0% → 100% 전환: 이전 스텝이 `complete`로 변경될 때 자연스러운 좌→우(수평) 또는 상→하(수직) 진행 효과.

---

## 9. 콘텐츠 전환

### 전환 방향 로직

```typescript
// StepperContent.tsx 내부
const prevStepRef = useRef(activeStep);
const [transitioning, setTransitioning] = useState(false);
const [displayedStep, setDisplayedStep] = useState(activeStep);
const [exitingStep, setExitingStep] = useState<number | null>(null);

useEffect(() => {
  if (prevStepRef.current === activeStep) return;

  if (disableTransition) {
    setDisplayedStep(activeStep);
    prevStepRef.current = activeStep;
    return;
  }

  // 나가는 패널 시작
  setExitingStep(prevStepRef.current);
  setTransitioning(true);

  // 한 프레임 후 들어오는 패널 시작
  requestAnimationFrame(() => {
    setDisplayedStep(activeStep);

    // 전환 완료 후 정리
    const timer = setTimeout(() => {
      setExitingStep(null);
      setTransitioning(false);
    }, transitionDuration);

    prevStepRef.current = activeStep;
    return () => clearTimeout(timer);
  });
}, [activeStep, transitionDuration, disableTransition]);
```

### 패널 스타일 계산

```typescript
function getPanelTransitionStyle(
  panelIndex: number,
  displayedStep: number,
  exitingStep: number | null,
  direction: "forward" | "backward",
  transitionDuration: number,
): CSSProperties {
  const isActive = panelIndex === displayedStep;
  const isExiting = panelIndex === exitingStep;

  if (!isActive && !isExiting) {
    return { display: "none" };
  }

  const slideDistance = 30; // px

  if (isExiting) {
    // 나가는 패널: forward → 왼쪽으로, backward → 오른쪽으로
    const translateX = direction === "forward" ? -slideDistance : slideDistance;
    return {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      opacity: 0,
      transform: `translateX(${translateX}px)`,
      transition: `opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease`,
      pointerEvents: "none",
    };
  }

  // 들어오는 패널 (isActive)
  if (exitingStep !== null) {
    // 전환 중: forward → 오른쪽에서 들어옴, backward → 왼쪽에서 들어옴
    // 처음에는 오프셋 위치, requestAnimationFrame으로 0으로 전환
    return {
      position: "relative",
      opacity: 1,
      transform: "translateX(0)",
      transition: `opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease`,
    };
  }

  // 정상 상태
  return {
    position: "relative",
    opacity: 1,
    transform: "translateX(0)",
  };
}
```

### 진입 애니메이션 초기 오프셋

진입 패널은 처음 마운트될 때 오프셋 위치에서 시작해야 한다. 이를 위해 2단계 렌더를 사용:

```typescript
// StepperContent.tsx
const [enterOffset, setEnterOffset] = useState<number>(0);

useEffect(() => {
  if (exitingStep === null) return;

  // 1단계: 진입 패널 초기 오프셋 설정
  const slideDistance = 30;
  setEnterOffset(direction === "forward" ? slideDistance : -slideDistance);

  // 2단계: 다음 프레임에서 0으로 전환
  const raf = requestAnimationFrame(() => {
    setEnterOffset(0);
  });

  return () => cancelAnimationFrame(raf);
}, [displayedStep, exitingStep, direction]);
```

진입 패널 스타일에 `enterOffset` 적용:
```typescript
if (isActive && exitingStep !== null) {
  return {
    position: "relative",
    opacity: enterOffset === 0 ? 1 : 0,
    transform: `translateX(${enterOffset}px)`,
    transition: enterOffset === 0
      ? `opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease`
      : "none",
  };
}
```

### 전환 타이밍 요약

| 단계 | 시점 | 나가는 패널 | 들어오는 패널 |
|------|------|-------------|---------------|
| 0 | 스텝 변경 감지 | opacity 1, translateX(0) | 아직 미표시 |
| 1 | exitingStep 설정 | opacity 0, translateX(±30px) 전환 시작 | opacity 0, translateX(∓30px) 초기 위치 |
| 2 | rAF 후 | 전환 진행 중 | opacity 1, translateX(0) 전환 시작 |
| 3 | duration 경과 | DOM 제거 | 정상 상태 |

---

## 10. 테마 색상 맵

### 스텝 인디케이터 색상

```typescript
interface StepColorSet {
  bg: string;
  text: string;
  border: string;
  labelColor: string;
}

const STEP_STATE_COLORS: Record<StepperTheme, Record<StepStatus, StepColorSet>> = {
  light: {
    incomplete: {
      bg: "#f3f4f6",      // gray-100
      text: "#9ca3af",    // gray-400
      border: "#e5e7eb",  // gray-200
      labelColor: "#9ca3af",
    },
    current: {
      bg: "#3b82f6",      // blue-500
      text: "#ffffff",
      border: "#3b82f6",
      labelColor: "#3b82f6",
    },
    complete: {
      bg: "#22c55e",      // green-500
      text: "#ffffff",
      border: "#22c55e",
      labelColor: "#16a34a",
    },
    error: {
      bg: "#fef2f2",      // red-50
      text: "#ef4444",    // red-500
      border: "#ef4444",
      labelColor: "#ef4444",
    },
    disabled: {
      bg: "#f9fafb",      // gray-50
      text: "#d1d5db",    // gray-300
      border: "#e5e7eb",
      labelColor: "#d1d5db",
    },
  },
  dark: {
    incomplete: {
      bg: "#374151",      // gray-700
      text: "#6b7280",    // gray-500
      border: "#4b5563",  // gray-600
      labelColor: "#6b7280",
    },
    current: {
      bg: "#3b82f6",
      text: "#ffffff",
      border: "#3b82f6",
      labelColor: "#60a5fa", // blue-400
    },
    complete: {
      bg: "#16a34a",      // green-600
      text: "#ffffff",
      border: "#16a34a",
      labelColor: "#4ade80", // green-400
    },
    error: {
      bg: "#7f1d1d",      // red-900
      text: "#fca5a5",    // red-300
      border: "#dc2626",
      labelColor: "#fca5a5",
    },
    disabled: {
      bg: "#1f2937",      // gray-800
      text: "#4b5563",
      border: "#374151",
      labelColor: "#4b5563",
    },
  },
};
```

### Separator 색상

```typescript
const SEPARATOR_TRACK_COLORS: Record<StepperTheme, string> = {
  light: "#e5e7eb",  // gray-200
  dark: "#4b5563",   // gray-600
};

const SEPARATOR_FILL_COLORS: Record<StepperTheme, string> = {
  light: "#3b82f6",  // blue-500
  dark: "#3b82f6",
};
```

### 액션 버튼 색상

```typescript
const ACTION_BUTTON_COLORS: Record<StepperTheme, {
  primary: { bg: string; text: string; hoverBg: string; disabledBg: string; disabledText: string };
  secondary: { bg: string; text: string; hoverBg: string; border: string };
}> = {
  light: {
    primary: {
      bg: "#3b82f6",
      text: "#ffffff",
      hoverBg: "#2563eb",
      disabledBg: "#93c5fd",
      disabledText: "#ffffff",
    },
    secondary: {
      bg: "transparent",
      text: "#374151",
      hoverBg: "#f3f4f6",
      border: "#d1d5db",
    },
  },
  dark: {
    primary: {
      bg: "#3b82f6",
      text: "#ffffff",
      hoverBg: "#2563eb",
      disabledBg: "#1e40af",
      disabledText: "#93c5fd",
    },
    secondary: {
      bg: "transparent",
      text: "#d1d5db",
      hoverBg: "#374151",
      border: "#4b5563",
    },
  },
};
```

### Content 배경

```typescript
const CONTENT_BG: Record<StepperTheme, string> = {
  light: "#ffffff",
  dark: "#111827",  // gray-900
};

const ROOT_BG: Record<StepperTheme, string> = {
  light: "#ffffff",
  dark: "#111827",
};

const ACTIONS_BORDER: Record<StepperTheme, string> = {
  light: "#e5e7eb",
  dark: "#374151",
};
```

---

## 11. 접근성

### ARIA 역할 매핑

| 컴포넌트 | 요소 | ARIA 속성 |
|----------|------|-----------|
| `Stepper.Root` | `<div>` | `role="group"`, `aria-label="Stepper"` |
| `Stepper.List` | `<div>` | `role="tablist"`, `aria-orientation`, `aria-label="Progress"` |
| `Stepper.Step` | `<button>` | `role="tab"`, `aria-selected`, `aria-controls="panel-{id}"`, `id="step-{id}"` |
| `Stepper.Step` (current) | `<button>` | + `aria-current="step"` |
| `Stepper.Step` (error) | `<button>` | + `aria-invalid="true"`, `aria-errormessage` 또는 `aria-describedby` |
| `Stepper.Step` (disabled) | `<button>` | + `aria-disabled="true"`, `tabindex="-1"` |
| `Stepper.Separator` | `<div>` | `role="separator"`, `aria-hidden="true"` |
| `Stepper.Panel` | `<div>` | `role="tabpanel"`, `aria-labelledby="step-{id}"`, `id="panel-{id}"` |
| `Stepper.List` (progress) | `<div>` | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` |
| `Stepper.PrevButton` | `<button>` | `aria-label="Previous step"` (children 없을 때) |
| `Stepper.NextButton` | `<button>` | `aria-label="Next step"` (children 없을 때) |
| `Stepper.CompleteButton` | `<button>` | `aria-label="Complete"` (children 없을 때) |

### 키보드 네비게이션

`Stepper.List` (role="tablist") 내부:

| 키 | 동작 | 비고 |
|----|------|------|
| `ArrowRight` / `ArrowDown` | 다음 Step으로 포커스 이동 | 비선형 모드에서만 활성, 선형 모드에서는 완료된 스텝만 |
| `ArrowLeft` / `ArrowUp` | 이전 Step으로 포커스 이동 | 동일 |
| `Home` | 첫 번째 Step으로 포커스 이동 | |
| `End` | 마지막 접근 가능 Step으로 포커스 이동 | |
| `Enter` / `Space` | 포커스된 Step으로 이동 (goToStep) | disabled 스텝은 무시 |
| `Tab` | List에서 빠져나와 Content/Actions로 이동 | 기본 tabindex 흐름 |

```typescript
// StepperList.tsx 내부 키보드 핸들러
function handleKeyDown(e: React.KeyboardEvent) {
  const isHorizontal = ctx.orientation === "horizontal";
  const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown";
  const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp";

  // Step 버튼 요소들 수집
  const listEl = e.currentTarget;
  const stepButtons = Array.from(
    listEl.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([aria-disabled="true"])')
  );

  const currentIndex = stepButtons.findIndex((btn) => btn === document.activeElement);
  if (currentIndex === -1) return;

  let nextIndex: number | null = null;

  switch (e.key) {
    case nextKey:
      nextIndex = currentIndex + 1 < stepButtons.length ? currentIndex + 1 : 0;
      break;
    case prevKey:
      nextIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : stepButtons.length - 1;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = stepButtons.length - 1;
      break;
    default:
      return;
  }

  e.preventDefault();
  stepButtons[nextIndex]?.focus();
}
```

### 스크린 리더 안내

Step 버튼의 접근 가능한 이름 구성:
```typescript
function getStepAriaLabel(
  index: number,
  totalSteps: number,
  label: string | undefined,
  status: StepStatus,
): string {
  const stepNumber = `Step ${index + 1} of ${totalSteps}`;
  const statusText = status === "complete" ? ", completed"
    : status === "error" ? ", has error"
    : status === "current" ? ", current"
    : status === "disabled" ? ", disabled"
    : "";
  return label ? `${stepNumber}: ${label}${statusText}` : `${stepNumber}${statusText}`;
}
```

---

## 12. 스텝 인디케이터 SVG

### 체크마크 아이콘 (완료 상태)

```tsx
function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}
```

### 느낌표 아이콘 (에러 상태)

```tsx
function ExclamationIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="8" y1="4" x2="8" y2="9" />
      <circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
```

### 번호 → 체크마크 전환 애니메이션

인디케이터 내부에서 번호와 체크마크를 동시에 렌더하되, 하나만 보이도록 제어:

```tsx
function StepIndicator({
  index, status, icon, completedIcon, errorIcon, variant,
}: {
  index: number;
  status: StepStatus;
  icon?: ReactNode;
  completedIcon?: ReactNode;
  errorIcon?: ReactNode;
  variant: StepperVariant;
}) {
  if (variant === "dots") {
    return <DotIndicator status={status} />;
  }

  const showCheck = status === "complete";
  const showError = status === "error";
  const showNumber = !showCheck && !showError;

  return (
    <div style={{
      position: "relative",
      width: 36,
      height: 36,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      // 색상은 status별 STEP_STATE_COLORS에서 결정
    }}>
      {/* 번호/커스텀 아이콘 */}
      <span
        style={{
          position: "absolute",
          transition: "opacity 200ms ease, transform 200ms ease",
          opacity: showNumber ? 1 : 0,
          transform: showNumber ? "scale(1) rotate(0deg)" : "scale(0.3) rotate(-90deg)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {icon ?? index + 1}
      </span>

      {/* 체크마크 */}
      <span
        style={{
          position: "absolute",
          transition: "opacity 200ms ease, transform 200ms ease",
          opacity: showCheck ? 1 : 0,
          transform: showCheck ? "scale(1) rotate(0deg)" : "scale(0.3) rotate(90deg)",
        }}
      >
        {completedIcon ?? <CheckIcon />}
      </span>

      {/* 에러 아이콘 */}
      <span
        style={{
          position: "absolute",
          transition: "opacity 200ms ease, transform 200ms ease",
          opacity: showError ? 1 : 0,
          transform: showError ? "scale(1) rotate(0deg)" : "scale(0.3) rotate(90deg)",
        }}
      >
        {errorIcon ?? <ExclamationIcon />}
      </span>
    </div>
  );
}
```

### Dot 인디케이터

```tsx
function DotIndicator({ status }: { status: StepStatus }) {
  const ctx = useStepperContext();
  const colors = STEP_STATE_COLORS[ctx.theme][status];

  return (
    <div style={{
      width: status === "current" ? 14 : 10,
      height: status === "current" ? 14 : 10,
      borderRadius: "50%",
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      transition: "width 200ms ease, height 200ms ease, background-color 200ms ease, border-color 200ms ease",
    }} />
  );
}
```

---

## 13. 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| **스텝 1개** | Separator 렌더 없음, PrevButton/NextButton 숨김, CompleteButton만 표시 |
| **스텝 많음 (10+, 수평 오버플로)** | List에 `overflow-x: auto` + `scrollbar-width: thin` 적용. 현재 스텝이 보이도록 `scrollIntoView({ inline: "center", behavior: "smooth" })` |
| **비동기 검증 타임아웃** | `onBeforeNext` Promise가 무한 대기 가능 → 소비자 책임. 단, `isNavigating` 상태가 모든 버튼을 disabled하므로 이중 클릭 방지는 보장 |
| **비동기 검증 중 언마운트** | `useEffect` cleanup에서 `isMounted` ref 체크. 언마운트 후 setState 호출 방지 |
| **activeStep 범위 초과** | `Math.max(0, Math.min(totalSteps - 1, activeStep))`로 클램핑 |
| **totalSteps 변경** | activeStep이 범위 밖이면 마지막 스텝으로 조정 |
| **completedSteps prop 변경** | 외부 제어 시 내부 상태 무시, prop 직접 사용 |
| **Separator 없이 Step만** | 정상 동작. 연결선 없이 스텝 원만 나열 |
| **Panel 없이 List만** | Content/Panel 없어도 List + Actions로 스텝 인디케이터만 사용 가능 |
| **forceMount Panel** | 비활성 패널도 DOM 유지 (display: none 아님). 폼 상태 보존에 유용. `visibility: hidden` + `position: absolute` 사용 |
| **linear 모드에서 Step 클릭** | 완료된 스텝과 현재 스텝만 클릭 가능. 미래 스텝 클릭 시 `cursor: not-allowed` + no-op |
| **disabled 스텝** | 클릭 불가, 키보드 포커스에서 건너뜀, 시각적으로 흐리게 |
| **RTL (향후)** | 현재 구현하지 않음. 향후 `dir` prop 추가 시 slide 방향 반전 |
| **SSR** | `useId`로 고유 ID 생성. 서버/클라이언트 일치 보장 |
| **progress variant에서 Step children** | 무시. List 내부에서 children 렌더하지 않고 자동 프로그레스 바만 표시 |

---

## 14. 수정 대상 파일

### 신규 생성

| # | 파일 | 설명 | 예상 줄 수 |
|---|------|------|------------|
| 1 | `src/components/Stepper/Stepper.types.ts` | 전체 타입 정의 | ~120 |
| 2 | `src/components/Stepper/StepperRoot.tsx` | Context, 상태 관리, 네비게이션 로직 | ~180 |
| 3 | `src/components/Stepper/StepperList.tsx` | 스텝 목록 컨테이너, 키보드 핸들러, progress variant | ~100 |
| 4 | `src/components/Stepper/StepperStep.tsx` | 스텝 인디케이터, 클릭 핸들러, SVG 아이콘 | ~160 |
| 5 | `src/components/Stepper/StepperSeparator.tsx` | 연결선, 채움 애니메이션 | ~70 |
| 6 | `src/components/Stepper/StepperContent.tsx` | 콘텐츠 영역, 전환 애니메이션 | ~120 |
| 7 | `src/components/Stepper/StepperPanel.tsx` | 개별 패널, forceMount | ~50 |
| 8 | `src/components/Stepper/StepperActions.tsx` | 액션 버튼 컨테이너 | ~30 |
| 9 | `src/components/Stepper/StepperPrevButton.tsx` | 이전 버튼, hideOnFirst | ~50 |
| 10 | `src/components/Stepper/StepperNextButton.tsx` | 다음 버튼, 검증 게이트 연동, hideOnLast | ~60 |
| 11 | `src/components/Stepper/StepperCompleteButton.tsx` | 완료 버튼, showOnlyOnLast | ~50 |
| 12 | `src/components/Stepper/useStepper.ts` | 소비자용 공개 훅 | ~25 |
| 13 | `src/components/Stepper/Stepper.tsx` | Object.assign 조립 | ~30 |
| 14 | `src/components/Stepper/index.ts` | 배럴 export | ~10 |
| 15 | `demo/src/pages/StepperPage.tsx` | 데모 페이지 (12개 섹션) | ~600 |

### 기존 수정

| # | 파일 | 변경 내용 |
|---|------|-----------|
| 16 | `src/components/index.ts` | `export * from "./Stepper"` 추가 |
| 17 | `demo/src/App.tsx` | `StepperPage` import, `Page` 타입에 `"stepper"` 추가, NAV 배열에 stepper 항목 추가, 메인 라우팅에 `{current === "stepper" && <StepperPage />}` 추가 |

---

## 15. 데모 페이지

### NAV 엔트리 (demo/src/App.tsx)

```typescript
{
  id: "stepper", label: "Stepper", description: "단계별 Wizard",
  sections: [
    { label: "Basic", id: "basic" },
    { label: "Vertical", id: "vertical" },
    { label: "Non-linear", id: "non-linear" },
    { label: "Validation", id: "validation" },
    { label: "Variants", id: "variants" },
    { label: "Error State", id: "error-state" },
    { label: "Custom Icons", id: "custom-icons" },
    { label: "Controlled", id: "controlled" },
    { label: "Dark Theme", id: "dark-theme" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ],
}
```

### 데모 섹션 상세

#### 1. Basic (id="basic")

4-스텝 위자드. 각 스텝에 간단한 폼 필드:
- Step 1: 이름, 이메일 입력
- Step 2: 주소 입력
- Step 3: 결제 카드 번호 입력 (더미)
- Step 4: 입력 내용 확인 (읽기 전용)

PrevButton, NextButton, CompleteButton 포함. 완료 시 alert.

#### 2. Vertical (id="vertical")

3-스텝, `orientation="vertical"`. 각 Step에 description 추가.
List와 Content를 나란히 배치 (flex row).

#### 3. Non-linear (id="non-linear")

4-스텝, `linear={false}`. 각 스텝 클릭 가능 표시.
처음부터 모든 스텝이 클릭 가능함을 안내하는 텍스트.

#### 4. Validation (id="validation")

3-스텝. `onBeforeNext`에서:
- Step 0 → 1: 동기 검증 (이름 비어 있으면 차단)
- Step 1 → 2: 비동기 검증 (1초 setTimeout 시뮬레이션)

검증 실패 시 stepErrors 업데이트 + 에러 메시지 표시.
`isNavigating` 상태에서 버튼에 스피너 표시.

#### 5. Variants (id="variants")

3가지 variant를 나란히 비교:
- `variant="default"`: 번호 원 + 라벨
- `variant="dots"`: 작은 점
- `variant="progress"`: 진행 바

각각 독립된 Stepper.Root, 동일 activeStep으로 동기화.

#### 6. Error State (id="error-state")

3-스텝. Step 1에 에러 상태 고정 (`stepErrors={{ 1: "이 단계에 문제가 있습니다" }}`).
에러 인디케이터(빨간 원 + 느낌표)와 라벨 아래 에러 메시지 표시.

#### 7. Custom Icons (id="custom-icons")

3-스텝. 각 Step에 커스텀 SVG 아이콘 전달:
- Step 0: 사용자 아이콘 (사람 실루엣)
- Step 1: 설정 아이콘 (기어)
- Step 2: 확인 아이콘 (별)

인라인 SVG 사용 (외부 의존성 없이).

#### 8. Controlled (id="controlled")

외부 상태로 제어: `activeStep` + `onStepChange`.
별도 숫자 버튼(0, 1, 2, 3)으로 직접 스텝 이동 가능.
현재 스텝 번호 표시.

#### 9. Dark Theme (id="dark-theme")

어두운 배경 래퍼 내에 `theme="dark"` Stepper. 4-스텝.
Step 2가 complete, Step 3가 current 상태로 초기화.

#### 10. Props (id="props")

PropsTable 형식으로 각 서브 컴포넌트의 props 문서화:
- Stepper.Root: totalSteps, activeStep, onStepChange, linear, orientation, variant, theme, onBeforeNext, onBeforePrev, stepErrors, completedSteps, disabledSteps, onComplete
- Stepper.Step: index, label, description, icon, completedIcon, errorIcon
- Stepper.Content: transitionDuration, disableTransition
- Stepper.Panel: index, forceMount
- Stepper.PrevButton: hideOnFirst
- Stepper.NextButton: hideOnLast
- Stepper.CompleteButton: showOnlyOnLast

테이블 컬럼: Prop | Type | Default | Description

#### 11. Usage (id="usage")

CodeView 블록으로 기본 사용 코드, 검증 코드, 제어 모드 코드 표시.

#### 12. Playground (id="playground")

인터랙티브 제어:
- **orientation**: radio (horizontal / vertical)
- **variant**: radio (default / dots / progress)
- **linear**: checkbox
- **totalSteps**: slider (2~8, default 4)
- **theme**: radio (light / dark)
- **transitionDuration**: slider (0~500ms)
- **disableTransition**: checkbox

변경 시 즉시 반영되는 라이브 Stepper 프리뷰.

---

## 16. 구현 순서

1. **`Stepper.types.ts`** — 전체 타입 정의. `exactOptionalPropertyTypes: true`에 맞게 `| undefined` 명시
2. **`StepperRoot.tsx`** — Context 생성, `useControllable(activeStep)`, `getStepStatus`, `goNext`/`goPrev`/`goToStep`/`complete` 구현, `isNavigating` 상태, `direction` 추적
3. **`StepperList.tsx`** — 수평/수직 flex 컨테이너, `role="tablist"`, 키보드 핸들러, progress variant 분기 (children 무시하고 프로그레스 바 렌더)
4. **`StepperStep.tsx`** — 인디케이터 원/점 렌더, 클릭 핸들러 (`goToStep`), 포커스 관리, `aria-current`, `aria-selected`, 커스텀 아이콘 슬롯, CheckIcon/ExclamationIcon private 컴포넌트
5. **`StepperSeparator.tsx`** — 트랙 + 채움 오버레이, `__separatorIndex` 내부 prop 수신
6. **`StepperContent.tsx`** — 전환 애니메이션 로직 (`displayedStep`, `exitingStep`, `enterOffset`), `requestAnimationFrame` 2단계 렌더
7. **`StepperPanel.tsx`** — `index` 매칭, `forceMount` 지원 (`visibility: hidden` + `position: absolute`)
8. **`StepperActions.tsx`** — 단순 flex 컨테이너
9. **`StepperPrevButton.tsx`** — `goPrev` 호출, `hideOnFirst`, disabled 처리
10. **`StepperNextButton.tsx`** — `goNext` 호출, `hideOnLast`, `isNavigating` 중 스피너
11. **`StepperCompleteButton.tsx`** — `complete` 호출, `showOnlyOnLast`
12. **`useStepper.ts`** — 공개 훅
13. **`Stepper.tsx`** — Object.assign 조립
14. **`index.ts`** — 배럴 export
15. **`src/components/index.ts`** — `export * from "./Stepper"` 추가
16. **`demo/src/pages/StepperPage.tsx`** — 12개 섹션 데모 페이지
17. **`demo/src/App.tsx`** — NAV + 라우팅 추가

---

## 17. 검증 방법

```bash
npm run typecheck        # 타입 체크 (strict mode)
npx tsup                 # 빌드 성공 확인
cd demo && npm run dev   # http://localhost:5173/#/stepper
```

### 기능 체크리스트

- [ ] 기본 4-스텝 위자드 렌더, 각 스텝 콘텐츠 전환
- [ ] NextButton 클릭 → 다음 스텝, PrevButton 클릭 → 이전 스텝
- [ ] 첫 스텝에서 PrevButton 숨김, 마지막 스텝에서 NextButton 숨김
- [ ] CompleteButton은 마지막 스텝에서만 표시
- [ ] 스텝 완료 시 체크마크 아이콘 전환 (scale + rotate 애니메이션)
- [ ] Separator 채움 애니메이션 (좌→우 수평, 상→하 수직)
- [ ] 콘텐츠 패널 slide + fade 전환 (방향 인식)
- [ ] `orientation="vertical"` 동작 확인
- [ ] `linear={false}` — 모든 스텝 클릭 가능
- [ ] `linear={true}` — 완료된 스텝과 현재 스텝만 클릭 가능
- [ ] `onBeforeNext` 동기 검증 → false 반환 시 전진 차단
- [ ] `onBeforeNext` 비동기 검증 → Promise 대기 중 버튼 disabled
- [ ] `stepErrors` → 에러 스텝 빨간 인디케이터 + 느낌표
- [ ] `disabledSteps` → 해당 스텝 비활성, 클릭/키보드 접근 불가
- [ ] `completedSteps` 외부 제어 → 체크마크 직접 지정
- [ ] `variant="dots"` — 작은 점 인디케이터
- [ ] `variant="progress"` — 프로그레스 바 (Step children 무시)
- [ ] 커스텀 아이콘 (`icon`, `completedIcon`, `errorIcon`) 렌더
- [ ] 제어 모드: `activeStep` + `onStepChange` 외부 동기화
- [ ] `theme="dark"` — 어두운 색상 적용
- [ ] `forceMount` Panel — 비활성 패널도 DOM 유지
- [ ] `disableTransition` — 전환 애니메이션 비활성
- [ ] `transitionDuration` 변경 반영
- [ ] 키보드: Arrow 키로 Step 포커스 이동, Enter로 스텝 전환
- [ ] ARIA: `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-current="step"` 확인
- [ ] 스텝 10개 이상 수평 — 오버플로 스크롤, 현재 스텝 자동 스크롤
- [ ] 스텝 1개 — Separator 없음, CompleteButton만 표시
- [ ] 데모 Playground — 모든 제어 옵션 실시간 반영
- [ ] `useStepper` 훅 — 소비자가 내부 상태 접근 가능
