# Alert 컴포넌트 설계문서 (severity 추출 포함)

## Context

본 plan은 **2개 단계**로 구성:

### Phase 0 — `_shared/severity.ts` 횡단 추상 추출 (Toast 마이그레이션 포함)
- 현재 Toast가 자체 `colors.ts`로 갖고 있는 severity(`success/error/warning/info/default`) 토큰 + 아이콘 매핑을 `src/components/_shared/severity.ts`로 추출.
- `_shared/SeverityIcon.tsx`, `_shared/DismissButton.tsx` 부품 추출 — 향후 Alert/Banner/InlineMessage가 모두 공유.
- Toast가 새 추출된 토큰·부품을 사용하도록 마이그레이션.

### Phase 1 — `Alert` 컴포넌트 신설
- 컨텐츠 흐름 내부 영구 알림 박스.
- `_shared/severity.ts` 사용.
- title/description/action/dismiss 슬롯.

본 문서가 두 Phase를 모두 정의 — 서로 의존이라 분리 시 불필요한 PR 분할.

참고:
- **Mantine Alert** — `variant: filled | light | outline`, `color`, `icon`, `withCloseButton`.
- **Chakra Alert** — `Alert.Root`, `Alert.Icon`, `Alert.Title`, `Alert.Description` compound.
- **Material UI Alert** — `severity`, `variant`, `action` slot, `onClose`.
- **Ant Design Alert** — `type`, `closable`, `banner` (인라인이지만 풀폭).
- **Apple HIG** — banner은 다름 (지속). Alert는 모달성.

본 레포 내부 참조:
- `src/components/Toast/colors.ts` — 추출 대상 (line 18~).
- `src/components/Toast/ToastIcon.tsx` — DefaultVariantIcon (line 18~) 추출 대상.
- `src/components/Toast/ToastClose.tsx` — DismissButton 추출 대상.
- `src/components/Icon/` (plan 023) — 아이콘 시스템.
- `src/components/_shared/` — 추출 위치.
- `tsconfig.json` — strict.

---

## 0. TL;DR

```tsx
// 1. 가장 단순 — severity만
<Alert severity="info">정보 메시지입니다.</Alert>
<Alert severity="warning">경고가 있습니다.</Alert>
<Alert severity="error">에러가 발생했습니다.</Alert>
<Alert severity="success">성공했습니다.</Alert>

// 2. title + description
<Alert severity="error" title="저장 실패">
  네트워크 연결을 확인하고 다시 시도해주세요.
</Alert>

// 3. dismissable
<Alert severity="info" dismissable onDismiss={() => setVisible(false)}>
  Beta 기능입니다.
</Alert>

// 4. variant
<Alert severity="warning" variant="solid">Solid bg</Alert>
<Alert severity="warning" variant="subtle">Subtle bg (default)</Alert>
<Alert severity="warning" variant="outline">Outline only</Alert>
<Alert severity="warning" variant="left-accent">Left accent bar</Alert>

// 5. action 슬롯
<Alert severity="info" action={<Button size="sm">자세히</Button>}>
  새 업데이트가 있습니다.
</Alert>

// 6. icon override
<Alert severity="info" icon={<Icon name="info" />}>...</Alert>
<Alert severity="info" icon={false}>아이콘 없음</Alert>

// 7. compound
<Alert.Root severity="success">
  <Alert.Icon />
  <Alert.Content>
    <Alert.Title>완료</Alert.Title>
    <Alert.Description>작업이 성공적으로 완료되었습니다.</Alert.Description>
  </Alert.Content>
  <Alert.Action><Button size="sm">보기</Button></Alert.Action>
  <Alert.Dismiss />
</Alert.Root>
```

핵심 원칙:
- **severity 기반** — `_shared/severity.ts` 토큰 사용.
- **4 variant**: solid / subtle / outline / left-accent.
- **compound**: Root + Icon + Content (Title/Description) + Action + Dismiss.
- **dismissable optional**: 외부 상태 또는 자동 unmount.
- **a11y**: `role="alert"` (error/warning) 또는 `role="status"` (info/success).

---

## 1. Goals / Non-goals

### Phase 0 Goals
- `src/components/_shared/severity.ts`:
  - `Severity` 타입.
  - `SeverityPalette` 인터페이스 + 5 severity × light/dark 토큰.
  - `severityIcons` 맵 (severity → IconName).
- `src/components/_shared/SeverityIcon.tsx` — severity 받아 아이콘 렌더.
- `src/components/_shared/DismissButton.tsx` — X 버튼.
- Toast 마이그레이션:
  - Toast/colors.ts 삭제 (또는 import severity).
  - ToastIcon이 `<SeverityIcon variant={variant} theme={theme} />` 사용.
  - ToastClose가 `<DismissButton />` 사용 또는 같은 디자인.
  - 시각·동작 100% 동일.

### Phase 1 Goals (Alert)
1. `severity: "default" | "success" | "info" | "warning" | "error"`.
2. `variant: "solid" | "subtle" | "outline" | "left-accent"` (기본 "subtle").
3. `title?: ReactNode`, `description?: ReactNode`, children = description shorthand.
4. `icon?: ReactNode | false` — false면 미표시.
5. `dismissable?: boolean` + `onDismiss?: () => void`.
6. `action?: ReactNode` 슬롯.
7. theme.
8. compound: Root, Icon, Content, Title, Description, Action, Dismiss.
9. a11y: severity별 role/aria-live.

### Non-goals (v1)
- Auto-dismiss timer (Toast 영역).
- Banner 통합 (별도 plan 038).
- Animation (페이드 등) — v1 즉시 표시/제거.
- Stacking — 단일 Alert.

---

## 2. Phase 0 — `_shared/severity.ts` 추출

### 2.1 타입 — `src/components/_shared/severity.ts`

```ts
export type Severity = "default" | "success" | "info" | "warning" | "error";
export type SeverityTheme = "light" | "dark";

export interface SeverityPalette {
  /** solid bg + fg */
  solidBg: string;
  solidFg: string;
  /** subtle bg + fg + border */
  subtleBg: string;
  subtleFg: string;
  subtleBorder: string;
  /** outline border + fg */
  outlineBorder: string;
  outlineFg: string;
  /** left-accent bar 색상 */
  accentBar: string;
  /** icon foreground (subtle/outline variant에서) */
  iconFg: string;
  /** ARIA role */
  ariaRole: "alert" | "status";
  /** ARIA live */
  ariaLive: "assertive" | "polite";
}

export const severityPalettes: Record<Severity, Record<SeverityTheme, SeverityPalette>> = {
  default: {
    light: {
      solidBg: "#374151", solidFg: "#fff",
      subtleBg: "#f3f4f6", subtleFg: "#374151", subtleBorder: "rgba(0,0,0,0.06)",
      outlineBorder: "#9ca3af", outlineFg: "#374151",
      accentBar: "#9ca3af",
      iconFg: "#374151",
      ariaRole: "status", ariaLive: "polite",
    },
    dark: {
      solidBg: "#9ca3af", solidFg: "#0f172a",
      subtleBg: "rgba(255,255,255,0.06)", subtleFg: "#e5e7eb", subtleBorder: "rgba(255,255,255,0.08)",
      outlineBorder: "rgba(255,255,255,0.2)", outlineFg: "#e5e7eb",
      accentBar: "#9ca3af",
      iconFg: "#e5e7eb",
      ariaRole: "status", ariaLive: "polite",
    },
  },
  success: {
    light: {
      solidBg: "#16a34a", solidFg: "#fff",
      subtleBg: "#dcfce7", subtleFg: "#166534", subtleBorder: "rgba(22,163,74,0.18)",
      outlineBorder: "#16a34a", outlineFg: "#166534",
      accentBar: "#16a34a",
      iconFg: "#16a34a",
      ariaRole: "status", ariaLive: "polite",
    },
    dark: {
      solidBg: "#22c55e", solidFg: "#0f172a",
      subtleBg: "rgba(34,197,94,0.14)", subtleFg: "#86efac", subtleBorder: "rgba(34,197,94,0.3)",
      outlineBorder: "#22c55e", outlineFg: "#86efac",
      accentBar: "#22c55e",
      iconFg: "#22c55e",
      ariaRole: "status", ariaLive: "polite",
    },
  },
  info: {
    light: {
      solidBg: "#2563eb", solidFg: "#fff",
      subtleBg: "#dbeafe", subtleFg: "#1e40af", subtleBorder: "rgba(37,99,235,0.18)",
      outlineBorder: "#2563eb", outlineFg: "#1e40af",
      accentBar: "#2563eb",
      iconFg: "#2563eb",
      ariaRole: "status", ariaLive: "polite",
    },
    dark: {
      solidBg: "#3b82f6", solidFg: "#0f172a",
      subtleBg: "rgba(59,130,246,0.14)", subtleFg: "#93c5fd", subtleBorder: "rgba(59,130,246,0.3)",
      outlineBorder: "#3b82f6", outlineFg: "#93c5fd",
      accentBar: "#3b82f6",
      iconFg: "#3b82f6",
      ariaRole: "status", ariaLive: "polite",
    },
  },
  warning: {
    light: {
      solidBg: "#d97706", solidFg: "#fff",
      subtleBg: "#fef3c7", subtleFg: "#92400e", subtleBorder: "rgba(217,119,6,0.18)",
      outlineBorder: "#d97706", outlineFg: "#92400e",
      accentBar: "#d97706",
      iconFg: "#d97706",
      ariaRole: "alert", ariaLive: "assertive",
    },
    dark: {
      solidBg: "#f59e0b", solidFg: "#0f172a",
      subtleBg: "rgba(245,158,11,0.14)", subtleFg: "#fcd34d", subtleBorder: "rgba(245,158,11,0.3)",
      outlineBorder: "#f59e0b", outlineFg: "#fcd34d",
      accentBar: "#f59e0b",
      iconFg: "#f59e0b",
      ariaRole: "alert", ariaLive: "assertive",
    },
  },
  error: {
    light: {
      solidBg: "#dc2626", solidFg: "#fff",
      subtleBg: "#fee2e2", subtleFg: "#991b1b", subtleBorder: "rgba(220,38,38,0.18)",
      outlineBorder: "#dc2626", outlineFg: "#991b1b",
      accentBar: "#dc2626",
      iconFg: "#dc2626",
      ariaRole: "alert", ariaLive: "assertive",
    },
    dark: {
      solidBg: "#ef4444", solidFg: "#0f172a",
      subtleBg: "rgba(239,68,68,0.14)", subtleFg: "#fca5a5", subtleBorder: "rgba(239,68,68,0.3)",
      outlineBorder: "#ef4444", outlineFg: "#fca5a5",
      accentBar: "#ef4444",
      iconFg: "#ef4444",
      ariaRole: "alert", ariaLive: "assertive",
    },
  },
};

import type { IconName } from "../Icon";

/** severity → 기본 아이콘 이름 매핑. Icon 시스템(plan 023) 의존. */
export const severityIcons: Record<Severity, IconName> = {
  default: "info",
  success: "success",
  info: "info",
  warning: "warning",
  error: "error",
};
```

### 2.2 SeverityIcon — `src/components/_shared/SeverityIcon.tsx`

```tsx
import type { CSSProperties } from "react";
import { Icon, type IconSize } from "../Icon";
import { severityIcons, severityPalettes, type Severity, type SeverityTheme } from "./severity";

export interface SeverityIconProps {
  severity: Severity;
  theme?: SeverityTheme;
  size?: IconSize | number;
  className?: string;
  style?: CSSProperties;
}

export function SeverityIcon(props: SeverityIconProps) {
  const { severity, theme = "light", size = "md", className, style } = props;
  const color = severityPalettes[severity][theme].iconFg;
  return (
    <span style={{ color, display: "inline-flex", ...style }} className={className}>
      <Icon name={severityIcons[severity]} size={size} aria-hidden="true" />
    </span>
  );
}
```

### 2.3 DismissButton — `src/components/_shared/DismissButton.tsx`

```tsx
import type { CSSProperties, ButtonHTMLAttributes } from "react";
import { Icon } from "../Icon";

export interface DismissButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
}

export function DismissButton(props: DismissButtonProps) {
  const { size = "md", className, style, "aria-label": ariaLabel = "Dismiss", ...rest } = props;
  const px = { sm: 14, md: 16, lg: 20 }[size];
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: px + 8, height: px + 8,
        background: "transparent", border: "none", cursor: "pointer",
        color: "currentColor", borderRadius: 4, opacity: 0.6,
        transition: "opacity 120ms ease, background 120ms ease",
        ...style,
      }}
      {...rest}
    >
      <Icon name="x" size={px} />
    </button>
  );
}
```

### 2.4 _shared 배럴 — `src/components/_shared/index.ts`

```ts
export { useCopyToClipboard } from "./useCopyToClipboard";
export type { UseCopyToClipboardOptions, UseCopyToClipboardReturn } from "./useCopyToClipboard";

export { SeverityIcon } from "./SeverityIcon";
export type { SeverityIconProps } from "./SeverityIcon";

export { DismissButton } from "./DismissButton";
export type { DismissButtonProps } from "./DismissButton";

export { severityPalettes, severityIcons } from "./severity";
export type { Severity, SeverityTheme, SeverityPalette } from "./severity";
```

### 2.5 Toast 마이그레이션

**삭제:**
- `src/components/Toast/colors.ts`의 severity 색상 (또는 keep — 일단 severity import로 변경).
- `ToastIcon.tsx`의 `DefaultVariantIcon` (5 케이스) — `<SeverityIcon severity={variant} theme={theme} />`로 교체.

**수정:**
- `ToastIcon.tsx`:
  ```tsx
  import { SeverityIcon } from "../_shared";

  export const ToastIcon = forwardRef<HTMLDivElement, ToastIconProps>(
    function ToastIcon({ children, className, style, ...rest }, ref) {
      const { variant, theme } = useToastItemContext();
      return (
        <div ref={ref} className={className} style={{ ...iconWrapStyle, ...style }} {...rest}>
          {children ?? <SeverityIcon severity={variant === "default" ? "default" : variant} theme={theme} size={20} />}
        </div>
      );
    },
  );
  ```
- `ToastClose.tsx` → `<DismissButton />` 사용.

**검증:** Toast 데모 페이지에서 5 variants × light/dark 모두 시각·동작 동일.

---

## 3. Phase 1 — Alert 컴포넌트

### 3.1 타입 — `src/components/Alert/Alert.types.ts`

```ts
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { Severity, SeverityTheme } from "../_shared/severity";

export type AlertVariant = "solid" | "subtle" | "outline" | "left-accent";

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  severity?: Severity;
  variant?: AlertVariant;
  theme?: SeverityTheme;

  title?: ReactNode;
  description?: ReactNode;
  /** description shorthand. */
  children?: ReactNode;

  icon?: ReactNode | false;

  dismissable?: boolean;
  onDismiss?: () => void;

  action?: ReactNode;

  className?: string;
  style?: CSSProperties;
}

// compound
export interface AlertRootProps extends Omit<AlertProps, "title" | "description" | "icon" | "dismissable" | "onDismiss" | "action"> {
  children: ReactNode;
}
export interface AlertIconProps { children?: ReactNode; className?: string; style?: CSSProperties; }
export interface AlertContentProps { children: ReactNode; className?: string; style?: CSSProperties; }
export interface AlertTitleProps { children: ReactNode; className?: string; style?: CSSProperties; }
export interface AlertDescriptionProps { children: ReactNode; className?: string; style?: CSSProperties; }
export interface AlertActionProps { children: ReactNode; className?: string; style?: CSSProperties; }
export interface AlertDismissProps { onClick?: () => void; className?: string; style?: CSSProperties; "aria-label"?: string; }
```

### 3.2 Context

```ts
const AlertContext = createContext<{ severity: Severity; theme: SeverityTheme; variant: AlertVariant; onDismiss?: () => void } | null>(null);
function useAlertContext() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("Alert.* must be used within Alert.Root");
  return ctx;
}
```

### 3.3 Root 단순 컴포넌트 — Alert

```tsx
export function Alert(props: AlertProps) {
  const {
    severity = "info",
    variant = "subtle",
    theme = "light",
    title, description, children,
    icon, dismissable = false, onDismiss,
    action, className, style, ...rest
  } = props;

  const palette = severityPalettes[severity][theme];

  // variant 별 스타일
  let containerStyle: CSSProperties;
  switch (variant) {
    case "solid":
      containerStyle = { background: palette.solidBg, color: palette.solidFg, border: "none" };
      break;
    case "subtle":
      containerStyle = { background: palette.subtleBg, color: palette.subtleFg, border: `1px solid ${palette.subtleBorder}` };
      break;
    case "outline":
      containerStyle = { background: "transparent", color: palette.outlineFg, border: `1px solid ${palette.outlineBorder}` };
      break;
    case "left-accent":
      containerStyle = { background: palette.subtleBg, color: palette.subtleFg, border: "none", borderLeft: `4px solid ${palette.accentBar}` };
      break;
  }

  const iconNode = icon === false ? null : (
    icon ?? <SeverityIcon severity={severity} theme={theme} size="lg" />
  );

  return (
    <div
      role={palette.ariaRole}
      aria-live={palette.ariaLive}
      className={className}
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: 12, borderRadius: 8,
        ...containerStyle,
        ...style,
      }}
      {...rest}
    >
      {iconNode && <div style={{flexShrink:0,marginTop:2}}>{iconNode}</div>}
      <div style={{flex:1,minWidth:0}}>
        {title && <div style={{fontWeight:600,marginBottom:description||children?2:0}}>{title}</div>}
        {description && <div style={{fontSize:13}}>{description}</div>}
        {children && !description && <div style={{fontSize:13}}>{children}</div>}
        {action && <div style={{marginTop:8}}>{action}</div>}
      </div>
      {dismissable && (
        <DismissButton
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{flexShrink:0,color:"currentColor"}}
        />
      )}
    </div>
  );
}
```

### 3.4 Compound — `Alert.Root`, `.Icon`, `.Content`, `.Title`, `.Description`, `.Action`, `.Dismiss`

(전체 코드 생략 — 위 단일 Alert와 동일 패턴, 부품별 분리. 사용자가 자유 합성 가능.)

### 3.5 배럴

```ts
export { Alert } from "./Alert";
export type { AlertProps, AlertVariant, ... } from "./Alert.types";
```

---

## 4. 파일 구조

```
src/components/_shared/
├── severity.ts              ← 신설
├── SeverityIcon.tsx          ← 신설
└── DismissButton.tsx         ← 신설

src/components/Alert/
├── Alert.tsx
├── AlertRoot.tsx
├── AlertIcon.tsx
├── AlertContent.tsx
├── AlertTitle.tsx
├── AlertDescription.tsx
├── AlertAction.tsx
├── AlertDismiss.tsx
├── AlertContext.ts
├── Alert.types.ts
└── index.ts
```

---

## 5. 데모 페이지

```tsx
export function AlertPage() {
  return (
    <div>
      <h1>Alert</h1>

      <Card.Root><Card.Header>Severities</Card.Header><Card.Body>
        <Stack gap={12}>
          <Alert severity="default">Default 메시지</Alert>
          <Alert severity="info">정보 메시지</Alert>
          <Alert severity="success">성공 메시지</Alert>
          <Alert severity="warning">경고 메시지</Alert>
          <Alert severity="error">에러 메시지</Alert>
        </Stack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Variants</Card.Header><Card.Body>
        <Stack gap={12}>
          {(["solid","subtle","outline","left-accent"] as const).map(v => (
            <Alert key={v} severity="info" variant={v} title={v}>Variant: {v}</Alert>
          ))}
        </Stack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Title + Description</Card.Header><Card.Body>
        <Alert severity="error" title="저장 실패">
          네트워크 연결을 확인하고 다시 시도해주세요.
        </Alert>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dismissable</Card.Header><Card.Body>
        <Alert severity="info" dismissable onDismiss={() => alert("dismiss")}>닫기 가능</Alert>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Action 슬롯</Card.Header><Card.Body>
        <Alert severity="info" title="새 업데이트" action={<button>업데이트</button>}>
          새로운 버전이 있습니다.
        </Alert>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Custom icon</Card.Header><Card.Body>
        <Alert severity="info" icon={<Icon name="help" />}>커스텀 아이콘</Alert>
        <Alert severity="info" icon={false}>아이콘 없음</Alert>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Compound</Card.Header><Card.Body>
        <Alert.Root severity="success">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Title>완료</Alert.Title>
            <Alert.Description>작업이 성공적으로 완료되었습니다.</Alert.Description>
          </Alert.Content>
          <Alert.Action><button>보기</button></Alert.Action>
          <Alert.Dismiss />
        </Alert.Root>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark theme</Card.Header><Card.Body style={{background:"#1f2937",padding:16}}>
        <Stack gap={12}>
          <Alert theme="dark" severity="info">Dark info</Alert>
          <Alert theme="dark" severity="error" variant="solid">Dark error solid</Alert>
        </Stack>
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 6. 접근성

- error/warning: `role="alert"` + `aria-live="assertive"` (자동).
- info/success: `role="status"` + `aria-live="polite"`.
- dismiss: 별도 button, aria-label.
- action 안의 button: 표준 button (사용자 책임).

## 7. Edge cases
- title만, description만, children만, 모두 없음 — 모두 정상 렌더 (빈 컨텐츠).
- description + children 둘 다 — description 우선 (children 무시).
- icon=false + description 없음 → 빈 컨텐츠 영역 (의도 — 사용자 자유).
- dismissable=true 인데 onDismiss 없음 — 클릭해도 동작 없음 (외부 상태 미관리).

## 8. 구현 단계

### Phase 0
1. `_shared/severity.ts` 작성
2. `_shared/SeverityIcon.tsx`, `_shared/DismissButton.tsx` 작성
3. `_shared/index.ts` 갱신
4. Toast 마이그레이션 (ToastIcon, ToastClose 내부 교체)
5. Toast 데모 회귀 검증

### Phase 1
6. Alert.tsx + compound 8개 파일
7. 배럴
8. components/index.ts
9. typecheck/build

### Phase 2
10. AlertPage 데모

### Phase 3
11. candidates.md 1번 제거 + 링크
12. README

## 9. 체크리스트
- [ ] _shared/severity.ts + SeverityIcon + DismissButton
- [ ] Toast 마이그레이션 (시각 회귀 0)
- [ ] Alert 신설 (compound + 단일)
- [ ] 5 severity × 4 variant × 2 theme 매트릭스 시각 정상
- [ ] dismissable / action / icon prop 정상
- [ ] role/aria 자동 분기
- [ ] candidates / README
