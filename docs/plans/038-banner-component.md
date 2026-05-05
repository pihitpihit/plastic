# Banner 컴포넌트 설계문서

## Context

페이지 최상단 풀폭 가로 띠 공지 `Banner` 컴포넌트. Alert(037)와 형제 관계 — 공통 `_shared/severity.ts` 토큰 의존.

**vs Alert 차별점**:

| | Banner | Alert |
|---|---|---|
| 위치 | 페이지 최상단 풀폭 띠 | 컨텐츠 흐름 내부 박스 |
| 너비 | 100% (뷰포트) | 부모 종속 |
| 시각 무게 | 얇은 띠, 보더 위/아래만 | 풀 보더 + radius + 패딩 |
| 의미 | 페이지/사이트 전반 공지 | 컨텐츠 영역 메시지 |
| stack | 페이지 상단 1~몇 개 | 본문 곳곳 분산 |

전제: plan 037이 Phase 0 (severity 추출)을 완료해야 본 plan 진행 가능.

참고:
- **Slack** 상단 banner — 워크스페이스 공지.
- **GitHub** 상단 banner — incident, security alert.
- **Linear** — 시스템 공지.
- **Mantine** Banner 미제공 (Notification 또는 Alert로 대체).
- **Apple HIG**: status bar / notification bar 가까움.

본 레포 내부 참조:
- `src/components/_shared/severity.ts` (plan 037 Phase 0).
- `src/components/_shared/SeverityIcon.tsx`.
- `src/components/_shared/DismissButton.tsx`.

---

## 0. TL;DR

```tsx
// 1. 가장 단순
<Banner severity="info">새 기능이 출시되었습니다.</Banner>

// 2. dismissable
<Banner severity="info" dismissable onDismiss={() => setVisible(false)}>
  Beta 기능을 사용하고 있습니다.
</Banner>

// 3. action 슬롯
<Banner severity="warning" action={<Button size="sm">자세히 보기</Button>}>
  유지보수가 예정되어 있습니다 (2026-04-30 02:00 KST).
</Banner>

// 4. sticky (스크롤해도 상단 고정)
<Banner severity="error" sticky>중요: 시스템 점검 중</Banner>

// 5. height variant
<Banner severity="info" height="thin">한 줄짜리 얇은 띠</Banner>
<Banner severity="info" height="normal">기본 (32px)</Banner>
<Banner severity="info" height="tall">제목 + 본문</Banner>

// 6. icon override
<Banner severity="info" icon={false}>아이콘 없음</Banner>
<Banner severity="info" icon={<Icon name="info" />}>커스텀</Banner>

// 7. AppShell Header 안에 합성
<AppShell>
  <Banner severity="warning">유지보수 예정</Banner>
  <Header>...</Header>
  <Sidebar>...</Sidebar>
  <Main>...</Main>
</AppShell>

// 8. compound
<Banner.Root severity="info">
  <Banner.Icon />
  <Banner.Content>새 기능이 출시되었습니다.</Banner.Content>
  <Banner.Action><Button>확인</Button></Banner.Action>
  <Banner.Dismiss />
</Banner.Root>
```

핵심 원칙:
- **풀폭** — `width: 100%`. 부모가 풀폭 컨테이너여야 함 (AppShell, body 등).
- **얇은 띠** — Alert보다 vertical padding 작음. height variant 3종.
- **severity 토큰** — _shared/severity.ts 사용.
- **선택적 sticky** — 스크롤 무관 상단 고정.
- **dismissable** — 외부 상태 (또는 자동 unmount).
- **a11y**: severity별 role/aria-live (Alert와 동일).

---

## 1. Goals / Non-goals

### Goals (v1)
1. severity (5종).
2. height: "thin" (24) | "normal" (32) | "tall" (48+ — title+desc).
3. variant: "subtle"(기본) | "solid".
4. dismissable + onDismiss.
5. action 슬롯.
6. icon prop (or false).
7. sticky.
8. theme.
9. compound: Root, Icon, Content, Action, Dismiss.
10. children = 단순 텍스트 또는 React 노드.

### Non-goals (v1)
- 자동 dismiss timer.
- stacking 다중 banner 자동 큐.
- 마키 / 슬라이드 텍스트.
- countdown 자동 갱신.
- close 후 localStorage로 영구 숨김 (v1.1+).

---

## 2. 공개 API

### 2.1 타입 — `src/components/Banner/Banner.types.ts`

```ts
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { Severity, SeverityTheme } from "../_shared/severity";

export type BannerVariant = "subtle" | "solid";
export type BannerHeight = "thin" | "normal" | "tall";

export interface BannerProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  severity?: Severity;
  variant?: BannerVariant;
  height?: BannerHeight;
  theme?: SeverityTheme;

  title?: ReactNode;          // height="tall" 일 때 사용
  description?: ReactNode;
  children?: ReactNode;       // description shorthand

  icon?: ReactNode | false;
  dismissable?: boolean;
  onDismiss?: () => void;
  action?: ReactNode;

  sticky?: boolean;
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 컴포넌트 — `src/components/Banner/Banner.tsx`

```tsx
const heightMap: Record<BannerHeight, { padding: string; fontSize: number }> = {
  thin: { padding: "4px 12px", fontSize: 12 },
  normal: { padding: "8px 16px", fontSize: 13 },
  tall: { padding: "12px 16px", fontSize: 13 },
};

export function Banner(props: BannerProps) {
  const {
    severity = "info", variant = "subtle", height = "normal", theme = "light",
    title, description, children,
    icon, dismissable = false, onDismiss,
    action, sticky = false,
    className, style, ...rest
  } = props;

  const palette = severityPalettes[severity][theme];
  const h = heightMap[height];

  let bgStyle: CSSProperties;
  if (variant === "solid") {
    bgStyle = { background: palette.solidBg, color: palette.solidFg };
  } else {
    bgStyle = {
      background: palette.subtleBg,
      color: palette.subtleFg,
      borderTop: `1px solid ${palette.subtleBorder}`,
      borderBottom: `1px solid ${palette.subtleBorder}`,
    };
  }

  const iconNode = icon === false ? null : (icon ?? <SeverityIcon severity={severity} theme={theme} size="md" />);

  return (
    <div
      role={palette.ariaRole}
      aria-live={palette.ariaLive}
      className={className}
      style={{
        width: "100%",
        display: "flex",
        alignItems: height === "tall" ? "flex-start" : "center",
        gap: 12,
        padding: h.padding,
        fontSize: h.fontSize,
        fontFamily: "inherit",
        boxSizing: "border-box",
        ...(sticky ? { position: "sticky", top: 0, zIndex: 50 } : {}),
        ...bgStyle,
        ...style,
      }}
      {...rest}
    >
      {iconNode && <div style={{flexShrink:0,display:"flex"}}>{iconNode}</div>}
      <div style={{flex:1,minWidth:0}}>
        {title && height === "tall" && <div style={{fontWeight:600,marginBottom:2}}>{title}</div>}
        {description ?? children}
      </div>
      {action && <div style={{flexShrink:0}}>{action}</div>}
      {dismissable && (
        <DismissButton onClick={onDismiss} aria-label="Dismiss" style={{flexShrink:0,color:"currentColor"}} />
      )}
    </div>
  );
}
```

### 2.3 Compound

```tsx
const BannerCtx = createContext<{...} | null>(null);

export const BannerRoot = ...
export const BannerIcon = ...
export const BannerContent = ...
export const BannerAction = ...
export const BannerDismiss = ...

Banner.Root = BannerRoot;
Banner.Icon = BannerIcon;
Banner.Content = BannerContent;
Banner.Action = BannerAction;
Banner.Dismiss = BannerDismiss;
```

### 2.4 배럴

```ts
export { Banner } from "./Banner";
export type { BannerProps, BannerVariant, BannerHeight } from "./Banner.types";
```

---

## 3. 파일 구조

```
src/components/Banner/
├── Banner.tsx
├── BannerRoot.tsx
├── BannerIcon.tsx
├── BannerContent.tsx
├── BannerAction.tsx
├── BannerDismiss.tsx
├── BannerContext.ts
├── Banner.types.ts
└── index.ts
```

---

## 4. 데모 페이지

```tsx
export function BannerPage() {
  const [visible, setVisible] = useState(true);

  return (
    <div>
      <h1>Banner</h1>

      <Card.Root><Card.Header>Severities (subtle)</Card.Header><Card.Body>
        <Stack gap={4}>
          <Banner severity="default">Default</Banner>
          <Banner severity="info">Info</Banner>
          <Banner severity="success">Success</Banner>
          <Banner severity="warning">Warning</Banner>
          <Banner severity="error">Error</Banner>
        </Stack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Variants</Card.Header><Card.Body>
        <Stack gap={4}>
          <Banner severity="info" variant="subtle">Subtle</Banner>
          <Banner severity="info" variant="solid">Solid</Banner>
        </Stack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Heights</Card.Header><Card.Body>
        <Stack gap={4}>
          <Banner severity="info" height="thin">Thin (24)</Banner>
          <Banner severity="info" height="normal">Normal (32)</Banner>
          <Banner severity="info" height="tall" title="제목">본문 텍스트</Banner>
        </Stack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dismissable</Card.Header><Card.Body>
        {visible && <Banner severity="warning" dismissable onDismiss={() => setVisible(false)}>닫기 가능</Banner>}
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Action</Card.Header><Card.Body>
        <Banner severity="info" action={<button>자세히</button>}>새 업데이트</Banner>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Sticky (이 카드 안에서만 sticky)</Card.Header><Card.Body style={{maxHeight:200,overflow:"auto"}}>
        <Banner severity="warning" sticky>Sticky banner</Banner>
        <div style={{height:600,padding:16}}>스크롤 컨텐츠...</div>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Compound</Card.Header><Card.Body>
        <Banner.Root severity="info">
          <Banner.Icon />
          <Banner.Content>compound API</Banner.Content>
          <Banner.Action><button>OK</button></Banner.Action>
          <Banner.Dismiss />
        </Banner.Root>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark</Card.Header><Card.Body style={{background:"#1f2937",padding:0}}>
        <Banner theme="dark" severity="info">Dark theme info</Banner>
        <Banner theme="dark" severity="warning" variant="solid">Dark theme warning solid</Banner>
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성

- severity별 role/aria-live (Alert와 동일).
- dismiss button: aria-label.
- sticky banner는 키보드 사용자에게 항상 보임 — 좋음.

## 6. Edge cases
- 부모가 풀폭이 아니면 banner도 풀폭 아님. 사용자 책임.
- height="tall" + title 없음: 정상 렌더 (description만).
- action + dismiss 동시 — 우측 정렬 순서 (action → dismiss).

## 7. 구현 단계
- Phase 1: Banner 신설 (severity는 plan 037에서 이미 추출됨)
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 9개 파일
- [ ] typecheck/build
- [ ] severity × variant × height × theme 매트릭스
- [ ] dismissable, action, icon, sticky 정상
- [ ] candidates / README
