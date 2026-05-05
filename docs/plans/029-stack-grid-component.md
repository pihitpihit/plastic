# Stack / HStack / VStack / Grid 레이아웃 primitive 설계문서

## Context

`gap` 기반 flex/grid 레이아웃 primitive 4종 추가. 라이브러리 사용자(및 라이브러리 자체 데모·문서·Form)가 매번 손으로 `display: flex; gap: 12px; align-items: center` 같은 inline style 적는 비용을 제거.

라이브러리는 현재 layout helper가 없음 — 모든 컴포넌트가 자체 layout을 직접 처리. Form 4종(향후), AppShell parts(plan 039), 데모 페이지 등이 모두 이 primitive에 의존하면 일관성·생산성 모두 개선.

참고 (prior art):
- **Chakra `Stack`/`HStack`/`VStack`** — direction prop, divider 지원. 가장 영향력.
- **Mantine `Stack`/`Group`/`Grid`** — Group은 horizontal stack alias.
- **Radix UI primitives** — layout primitive 미제공.
- **Tailwind UI** — utility class 직접 (라이브러리 추상 없음).
- **Vanilla Extract / Stitches** — `Box`, `Stack` 같은 primitive 권장.
- **TanStack Layout** — primitives N/A.

본 레포 내부 참조:
- `src/components/Card/` — Card 자체가 flex layout 사용 — 참고용.
- `tsconfig.json` — strict 옵션.

---

## 0. TL;DR

```tsx
// 1. Stack — 기본 vertical (= VStack)
<Stack gap={12}>
  <button>One</button>
  <button>Two</button>
  <button>Three</button>
</Stack>

// 2. HStack — horizontal
<HStack gap={8} align="center">
  <Avatar />
  <span>Name</span>
  <button>Action</button>
</HStack>

// 3. VStack — vertical (Stack alias)
<VStack gap={16}>...</VStack>

// 4. Stack with direction prop
<Stack direction="row" gap={12} wrap>
  <Tag>react</Tag>
  <Tag>typescript</Tag>
</Stack>

// 5. align / justify
<HStack align="center" justify="space-between">
  <Logo />
  <Nav />
  <UserMenu />
</HStack>

// 6. divider
<VStack gap={12} divider={<hr />}>
  <Section1 />
  <Section2 />
  <Section3 />
</VStack>

// 7. Grid — CSS grid
<Grid columns={3} gap={16}>
  <Card />
  <Card />
  <Card />
</Grid>

// 8. Grid with template
<Grid templateColumns="200px 1fr 100px" gap={12}>
  <Sidebar />
  <Main />
  <Aside />
</Grid>

// 9. Responsive (단순 — number 또는 object)
<Grid columns={{ base: 1, md: 2, lg: 3 }} gap={16}>
  ...
</Grid>
```

핵심 원칙:
- **gap 기반** — margin 사용 안 함. CSS gap (`gap: 12px`)으로 일관 spacing.
- **HStack/VStack은 Stack의 thin wrapper** — direction 고정.
- **Grid는 별도** — flex와 기능 다름.
- **divider는 자식 사이에만 — `Children.toArray + map + insert`** 패턴.
- **inline style 기반** — CSS class 추가 의존 없음 (Tailwind 무관).
- **HTMLAttributes pass-through** — 추가 props 자유.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `Stack` (default vertical) — `direction`, `gap`, `align`, `justify`, `wrap`, `divider`.
2. `HStack` — Stack with direction="row".
3. `VStack` — Stack with direction="column" (default와 동일, alias).
4. `Grid` — CSS grid 기반. `columns`, `templateColumns`, `templateRows`, `gap`, `rowGap`, `columnGap`.
5. `inline?: boolean` — display: inline-flex / inline-grid.
6. responsive `columns` (단순 객체 기반).
7. divider 패턴 (자식 사이에만).
8. `as?` polymorphic (default `<div>`).
9. HTMLAttributes pass-through.

### Non-goals (v1)
- **Box primitive** — generic styled `<div>`. 별도 후보.
- **Container primitive** — max-width centered. 별도 후보 (검토 대상).
- **Center / Spacer / AspectRatio** — 별도 후보.
- **CSS class 기반 시스템** — inline style만.
- **Theme-aware spacing tokens** (예: `gap="md"` → 토큰 매핑) — v1.1+. 일단 number/string만.
- **breakpoints 자체 정의** — 사용자가 외부에서 미디어쿼리로 처리하거나, columns 단순 객체 기반 접근.
- **container queries** — v2+.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Stack/Stack.types.ts`

```ts
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

export type StackDirection = "row" | "column" | "row-reverse" | "column-reverse";
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify = "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";

/** Responsive value type. */
export type Responsive<T> = T | { base?: T; sm?: T; md?: T; lg?: T; xl?: T };

export interface StackProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** flex-direction. 기본 "column". */
  direction?: StackDirection;

  /** gap. number(px) 또는 string. 기본 0. */
  gap?: number | string;

  /** align-items. */
  align?: StackAlign;

  /** justify-content. */
  justify?: StackJustify;

  /** flex-wrap. 기본 false (nowrap). */
  wrap?: boolean;

  /** inline-flex. 기본 false. */
  inline?: boolean;

  /** 자식 사이에 삽입할 divider 노드 (또는 () => ReactNode). */
  divider?: ReactNode | (() => ReactNode);

  /** polymorphic — default "div". */
  as?: ElementType;

  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface GridProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** 단순 columns. 1 = 1단, 3 = 3단. 또는 responsive 객체. */
  columns?: Responsive<number>;

  /** 직접 grid-template-columns. 우선순위 높음. */
  templateColumns?: string;

  /** 직접 grid-template-rows. */
  templateRows?: string;

  /** auto rows. */
  autoRows?: string;

  /** gap. */
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;

  /** align-items. */
  align?: StackAlign;
  justify?: StackJustify;

  /** inline-grid. */
  inline?: boolean;

  as?: ElementType;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 Stack 컴포넌트 — `src/components/Stack/Stack.tsx`

```tsx
import { Children, isValidElement, type CSSProperties } from "react";
import type { StackProps } from "./Stack.types";

const alignMap: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

const justifyMap: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  "space-between": "space-between",
  "space-around": "space-around",
  "space-evenly": "space-evenly",
};

export function Stack(props: StackProps) {
  const {
    direction = "column",
    gap = 0,
    align,
    justify,
    wrap = false,
    inline = false,
    divider,
    as: Component = "div",
    children,
    className,
    style,
    ...rest
  } = props;

  const baseStyle: CSSProperties = {
    display: inline ? "inline-flex" : "flex",
    flexDirection: direction,
    gap: typeof gap === "number" ? `${gap}px` : gap,
    flexWrap: wrap ? "wrap" : "nowrap",
    ...(align ? { alignItems: alignMap[align] } : {}),
    ...(justify ? { justifyContent: justifyMap[justify] } : {}),
    ...style,
  };

  // divider가 있으면 자식 사이에 삽입
  let content: ReactNode = children;
  if (divider !== undefined && children !== undefined) {
    const arr = Children.toArray(children).filter(Boolean);
    const interleaved: ReactNode[] = [];
    arr.forEach((child, i) => {
      if (i > 0) {
        const div = typeof divider === "function" ? divider() : divider;
        interleaved.push(<Fragment key={`__div-${i}`}>{div}</Fragment>);
      }
      interleaved.push(child);
    });
    content = interleaved;
  }

  return (
    <Component className={className} style={baseStyle} {...rest}>
      {content}
    </Component>
  );
}
```

### 2.3 HStack / VStack — `src/components/Stack/HStack.tsx`

```tsx
export function HStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="row" {...props} />;
}

export function VStack(props: Omit<StackProps, "direction">) {
  return <Stack direction="column" {...props} />;
}
```

### 2.4 Grid — `src/components/Stack/Grid.tsx`

```tsx
export function Grid(props: GridProps) {
  const {
    columns,
    templateColumns,
    templateRows,
    autoRows,
    gap, rowGap, columnGap,
    align, justify,
    inline = false,
    as: Component = "div",
    children, className, style, ...rest
  } = props;

  // columns → templateColumns 변환
  let resolvedTemplate = templateColumns;
  if (!resolvedTemplate && columns !== undefined) {
    if (typeof columns === "number") {
      resolvedTemplate = `repeat(${columns}, minmax(0, 1fr))`;
    } else {
      // responsive 객체 — base만 처리 (sm/md/lg는 v1 미디어쿼리 미지원, base 사용)
      // v1.1+에서 useMediaQuery로 동적 결정
      const base = columns.base ?? columns.md ?? columns.sm ?? columns.lg ?? columns.xl ?? 1;
      resolvedTemplate = `repeat(${base}, minmax(0, 1fr))`;
    }
  }

  const baseStyle: CSSProperties = {
    display: inline ? "inline-grid" : "grid",
    ...(resolvedTemplate ? { gridTemplateColumns: resolvedTemplate } : {}),
    ...(templateRows ? { gridTemplateRows: templateRows } : {}),
    ...(autoRows ? { gridAutoRows: autoRows } : {}),
    ...(gap !== undefined ? { gap: typeof gap === "number" ? `${gap}px` : gap } : {}),
    ...(rowGap !== undefined ? { rowGap: typeof rowGap === "number" ? `${rowGap}px` : rowGap } : {}),
    ...(columnGap !== undefined ? { columnGap: typeof columnGap === "number" ? `${columnGap}px` : columnGap } : {}),
    ...(align ? { alignItems: alignMap[align] } : {}),
    ...(justify ? { justifyContent: justifyMap[justify] } : {}),
    ...style,
  };

  return <Component className={className} style={baseStyle} {...rest}>{children}</Component>;
}
```

### 2.5 배럴 — `src/components/Stack/index.ts`

```ts
export { Stack } from "./Stack";
export { HStack } from "./HStack";
export { VStack } from "./VStack";
export { Grid } from "./Grid";
export type {
  StackProps,
  GridProps,
  StackDirection,
  StackAlign,
  StackJustify,
  Responsive,
} from "./Stack.types";
```

---

## 3. 파일 구조

```
src/components/Stack/
├── Stack.tsx
├── HStack.tsx
├── VStack.tsx
├── Grid.tsx
├── Stack.types.ts
└── index.ts
```

---

## 4. 데모 페이지 — `demo/src/pages/StackPage.tsx`

```tsx
export function StackPage() {
  return (
    <div>
      <h1>Stack / HStack / VStack / Grid</h1>

      <Card.Root><Card.Header>Stack (vertical default)</Card.Header><Card.Body>
        <Stack gap={12}>
          <Btn>One</Btn><Btn>Two</Btn><Btn>Three</Btn>
        </Stack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>HStack</Card.Header><Card.Body>
        <HStack gap={8} align="center">
          <Btn>One</Btn><Btn>Two</Btn><Btn>Three</Btn>
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>HStack with align/justify</Card.Header><Card.Body>
        <HStack align="center" justify="space-between" style={{width:300}}>
          <span>Logo</span><nav>Nav</nav><span>User</span>
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Stack with divider</Card.Header><Card.Body>
        <VStack gap={12} divider={<hr style={{border:0,borderTop:"1px solid #ddd",margin:0}} />}>
          <p>Section 1</p>
          <p>Section 2</p>
          <p>Section 3</p>
        </VStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Wrap</Card.Header><Card.Body>
        <HStack gap={6} wrap>
          {Array.from({length:20},(_,i)=><Tag key={i}>tag-{i}</Tag>)}
        </HStack>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Grid columns=3</Card.Header><Card.Body>
        <Grid columns={3} gap={12}>
          {Array.from({length:9},(_,i)=><div key={i} style={{padding:16,background:"#f3f4f6"}}>{i+1}</div>)}
        </Grid>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Grid templateColumns</Card.Header><Card.Body>
        <Grid templateColumns="200px 1fr 100px" gap={12}>
          <div style={{background:"#dbeafe",padding:8}}>Sidebar 200</div>
          <div style={{background:"#fef3c7",padding:8}}>Main 1fr</div>
          <div style={{background:"#fee2e2",padding:8}}>Aside 100</div>
        </Grid>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Grid 다양한 row/column gap</Card.Header><Card.Body>
        <Grid columns={3} rowGap={20} columnGap={4}>
          {Array.from({length:6},(_,i)=><div key={i} style={{padding:8,background:"#f3f4f6"}}>{i+1}</div>)}
        </Grid>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>polymorphic as</Card.Header><Card.Body>
        <Stack as="ul" gap={4}>
          <li>List item 1</li>
          <li>List item 2</li>
        </Stack>
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성 (a11y)

- 시맨틱 영향 없음 (단순 div).
- `as` prop으로 의미 있는 태그 (ul, nav, section 등)로 변경 가능.
- divider는 시각만 — `<hr>` 사용 시 자동 a11y.

---

## 6. Edge cases

- **자식 0개**: 빈 컨테이너. style 적용되지만 시각 영향 없음.
- **자식 1개 + divider**: divider 삽입 안 됨 (사이가 없음). 의도된 동작.
- **gap=0**: 기본 — 동작 정상.
- **wrap + nowrap이 혼재**: `wrap=true` 우선.
- **inline + 부모가 inline 아님**: 자체 inline-flex 시각만 영향.
- **responsive columns**: v1은 base만 사용 — sm/md/lg 무시. 사용자가 미디어쿼리 직접 처리. v1.1+에서 `useMediaQuery` 통합.

---

## 7. 구현 단계

### Phase 1: 코어
1. types
2. Stack
3. HStack / VStack alias
4. Grid
5. 배럴
6. components/index.ts

### Phase 2: 데모

### Phase 3: 정리
- candidates.md에서 4번 제거 + 링크
- README

---

## 8. 체크리스트
- [ ] 6개 파일
- [ ] typecheck / build
- [ ] 데모 모든 섹션
- [ ] divider 작동
- [ ] polymorphic as 작동
- [ ] candidates / README
