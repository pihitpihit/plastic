# Sidebar + Header + Footer (AppShell parts) 설계문서

## Context

AppShell 레이아웃의 1차 부품 3종 — `Sidebar`, `Header`, `Footer` — 묶음 신설.

**왜 묶음인가**: 세 부품은 시각 토큰·간격·테마를 공유하며, 한 PR로 묶어 컨벤션 일관성 확보. 단독 사용도 가능하나 보통 함께 쓰임.

**AppShell 본체와의 관계**: AppShell은 `검토 대상`(잠정 후보 아님). 본 plan은 부품만 정의하고 AppShell은 사용자가 자유롭게 grid/flex로 합성. 향후 AppShell이 후보로 채택되면 별도 plan으로 추가 (이 부품들이 그 슬롯에 들어감).

전제: plan 029 (Stack/Grid)가 선행되면 합성 깔끔. 하지만 본 plan은 029 없이도 자체 구현 가능 (단순 flex/grid).

참고:
- **Mantine AppShell** — `<AppShell.Header>`, `<AppShell.Navbar>`, `<AppShell.Footer>`, `<AppShell.Aside>`. 가장 영향력.
- **Chakra UI** — Layout primitives (Flex, Grid)로 직접 합성. 자체 AppShell 없음.
- **Tailwind UI** — 패턴 제공 (코드 복사). 컴포넌트 없음.
- **shadcn/ui** — Sidebar, Header 자체 컴포넌트 (최근 추가).

본 레포 내부 참조:
- `src/components/Stack/` (plan 029) — Stack/HStack 사용.
- `src/components/Icon/` (plan 023) — collapse/menu 아이콘.
- `src/components/_shared/` — Theme 토큰.

---

## 0. TL;DR

```tsx
// 1. 단독 Sidebar
<Sidebar>
  <SidebarItem>Home</SidebarItem>
  <SidebarItem>Settings</SidebarItem>
</Sidebar>

// 2. collapsible
<Sidebar collapsible defaultCollapsed>
  ...
</Sidebar>

// 3. Header 단독
<Header>
  <Header.Section>
    <Logo />
  </Header.Section>
  <Header.Section align="center">
    <Nav />
  </Header.Section>
  <Header.Section align="end">
    <UserMenu />
  </Header.Section>
</Header>

// 4. Footer
<Footer>
  <p>© 2026 Plastic</p>
</Footer>

// 5. 합성된 AppShell-like layout (사용자가 grid 직접)
<div style={{display:"grid",gridTemplate:"'h h' auto 's m' 1fr 'f f' auto / auto 1fr",height:"100vh"}}>
  <Header style={{gridArea:"h"}}>...</Header>
  <Sidebar style={{gridArea:"s"}}>...</Sidebar>
  <main style={{gridArea:"m",overflow:"auto"}}>...</main>
  <Footer style={{gridArea:"f"}}>...</Footer>
</div>

// 6. Sidebar with sections
<Sidebar>
  <Sidebar.Section title="Main">
    <Sidebar.Item icon={<Icon name="home" />}>Home</Sidebar.Item>
    <Sidebar.Item icon={<Icon name="search" />}>Search</Sidebar.Item>
  </Sidebar.Section>
  <Sidebar.Section title="Tools">
    <Sidebar.Item>Reports</Sidebar.Item>
  </Sidebar.Section>
</Sidebar>

// 7. selected state
<Sidebar.Item selected>Active</Sidebar.Item>
```

핵심 원칙:
- **단독 사용 가능** — Header/Sidebar/Footer 각각 독립.
- **시각 일관성** — 같은 background/border 토큰.
- **theme** light/dark.
- **collapsible Sidebar** — 토글, narrow mode (icon-only).
- **Header sections** — left/center/right 슬롯.
- **Sidebar Item** — icon + label + selected/active state.
- **a11y** — `<header>`, `<nav>`, `<footer>` 시맨틱.

---

## 1. Goals / Non-goals

### Goals (v1)
1. **`Header`** + `Header.Section`.
2. **`Sidebar`** + `Sidebar.Section` + `Sidebar.Item`.
3. **`Footer`**.
4. Sidebar collapsible (icon-only mode).
5. Sidebar.Item selected/disabled/icon.
6. Header sections (start/center/end alignment).
7. theme light/dark.
8. width/height props.
9. sticky props.
10. polymorphic `as`.

### Non-goals (v1)
- Aside / right sidebar — v1.1.
- nested sidebar items (tree).
- breadcrumb 자동 — 별도 후보.
- mobile drawer 모드 자동 전환 — v1.1.
- backgrounds animation.
- header search bar baked-in.

---

## 2. 공개 API

### 2.1 타입 — `src/components/AppShellParts/types.ts`

```ts
import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from "react";

export type AppShellPartsTheme = "light" | "dark";

// Header
export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  height?: number | string;     // 기본 56
  sticky?: boolean;
  theme?: AppShellPartsTheme;
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface HeaderSectionProps extends HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

// Sidebar
export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  width?: number | string;            // 기본 240
  collapsedWidth?: number | string;   // 기본 60
  collapsible?: boolean;
  collapsed?: boolean;                // controlled
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  sticky?: boolean;
  theme?: AppShellPartsTheme;
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface SidebarSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface SidebarItemProps extends Omit<HTMLAttributes<HTMLAnchorElement>, "onClick"> {
  icon?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Footer
export interface FooterProps extends HTMLAttributes<HTMLElement> {
  height?: number | string;     // 기본 auto
  sticky?: boolean;
  theme?: AppShellPartsTheme;
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}
```

### 2.2 Sidebar Context (collapse 상태 공유)

```ts
const SidebarContext = createContext<{ collapsed: boolean; theme: AppShellPartsTheme } | null>(null);
function useSidebarContext() {
  const ctx = useContext(SidebarContext);
  return ctx ?? { collapsed: false, theme: "light" as const };
}
```

### 2.3 Header — `src/components/AppShellParts/Header.tsx`

```tsx
const themes = {
  light: { bg: "#fff", border: "#e5e7eb", fg: "#0f172a" },
  dark: { bg: "#0f172a", border: "rgba(255,255,255,0.08)", fg: "#e5e7eb" },
} as const;

export function Header(props: HeaderProps) {
  const { height = 56, sticky = false, theme = "light", as: Component = "header", children, className, style, ...rest } = props;
  const t = themes[theme];

  return (
    <Component
      className={className}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        height: typeof height === "number" ? `${height}px` : height,
        padding: "0 16px",
        background: t.bg, color: t.fg,
        borderBottom: `1px solid ${t.border}`,
        ...(sticky ? { position: "sticky", top: 0, zIndex: 30 } : {}),
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function HeaderSection(props: HeaderSectionProps) {
  const { align = "start", className, style, children, ...rest } = props;
  const justifyMap = { start: "flex-start", center: "center", end: "flex-end" } as const;

  return (
    <div
      className={className}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        flex: align === "center" ? 1 : "none",
        justifyContent: justifyMap[align],
        ...(align === "end" ? { marginLeft: "auto" } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

Header.Section = HeaderSection;
```

### 2.4 Sidebar — `src/components/AppShellParts/Sidebar.tsx`

```tsx
export function Sidebar(props: SidebarProps) {
  const {
    width = 240, collapsedWidth = 60,
    collapsible = false,
    collapsed: controlledCollapsed, defaultCollapsed = false, onCollapseChange,
    sticky = false, theme = "light", as: Component = "nav",
    children, className, style, ...rest
  } = props;

  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const setCollapsed = (next: boolean) => {
    if (controlledCollapsed === undefined) setInternalCollapsed(next);
    onCollapseChange?.(next);
  };

  const t = themes[theme];
  const w = collapsed ? collapsedWidth : width;

  return (
    <SidebarContext.Provider value={{ collapsed, theme }}>
      <Component
        className={className}
        style={{
          display: "flex", flexDirection: "column",
          width: typeof w === "number" ? `${w}px` : w,
          height: "100%",
          background: t.bg, color: t.fg,
          borderRight: `1px solid ${t.border}`,
          ...(sticky ? { position: "sticky", top: 0 } : {}),
          transition: "width 200ms ease",
          overflowY: "auto", overflowX: "hidden",
          boxSizing: "border-box",
          ...style,
        }}
        {...rest}
      >
        {children}
        {collapsible && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              marginTop: "auto", padding: "8px 16px",
              background: "transparent", border: "none", color: t.fg,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <Icon name={collapsed ? "chevron-right" : "chevron-left"} size="sm" />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </Component>
    </SidebarContext.Provider>
  );
}

export function SidebarSection(props: SidebarSectionProps) {
  const { title, children, className, style, ...rest } = props;
  const { collapsed, theme } = useSidebarContext();
  const t = themes[theme];

  return (
    <div className={className} style={{padding:"8px 0",...style}} {...rest}>
      {title && !collapsed && (
        <div style={{padding:"4px 16px",fontSize:11,fontWeight:600,color:`${t.fg}99`,textTransform:"uppercase",letterSpacing:0.5}}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function SidebarItem(props: SidebarItemProps) {
  const { icon, selected = false, disabled = false, href, onClick, children, className, style, ...rest } = props;
  const { collapsed, theme } = useSidebarContext();
  const t = themes[theme];

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) { e.preventDefault(); return; }
    onClick?.(e);
  };

  const Component: ElementType = href ? "a" : "button";

  return (
    <Component
      href={href}
      onClick={handleClick}
      disabled={Component === "button" ? disabled : undefined}
      aria-current={selected ? "page" : undefined}
      aria-disabled={disabled || undefined}
      data-selected={selected || undefined}
      className={className}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: collapsed ? "10px" : "8px 16px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: selected ? (theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
        color: selected ? "#2563eb" : t.fg,
        textDecoration: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontSize: 13, fontWeight: selected ? 600 : 400,
        width: "100%", textAlign: "left",
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    >
      {icon && <span style={{flexShrink:0,display:"flex"}}>{icon}</span>}
      {!collapsed && <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{children}</span>}
    </Component>
  );
}

Sidebar.Section = SidebarSection;
Sidebar.Item = SidebarItem;
```

### 2.5 Footer — `src/components/AppShellParts/Footer.tsx`

```tsx
export function Footer(props: FooterProps) {
  const { height, sticky = false, theme = "light", as: Component = "footer", children, className, style, ...rest } = props;
  const t = themes[theme];

  return (
    <Component
      className={className}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
        padding: "12px 16px",
        background: t.bg, color: t.fg,
        borderTop: `1px solid ${t.border}`,
        ...(sticky ? { position: "sticky", bottom: 0, zIndex: 30 } : {}),
        boxSizing: "border-box",
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
```

### 2.6 배럴 — `src/components/AppShellParts/index.ts`

```ts
export { Header, HeaderSection } from "./Header";
export { Sidebar, SidebarSection, SidebarItem } from "./Sidebar";
export { Footer } from "./Footer";
export type {
  HeaderProps, HeaderSectionProps,
  SidebarProps, SidebarSectionProps, SidebarItemProps,
  FooterProps,
  AppShellPartsTheme,
} from "./types";
```

---

## 3. 파일 구조

```
src/components/AppShellParts/
├── Header.tsx
├── Sidebar.tsx
├── Footer.tsx
├── SidebarContext.ts
├── types.ts
└── index.ts
```

---

## 4. 데모 페이지

```tsx
export function AppShellPartsPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div>
      <h1>AppShell Parts (Sidebar + Header + Footer)</h1>

      <Card.Root><Card.Header>Standalone Header</Card.Header><Card.Body style={{padding:0}}>
        <Header>
          <Header.Section>
            <strong>plastic</strong>
          </Header.Section>
          <Header.Section align="center">
            <button>Docs</button>
            <button>Components</button>
          </Header.Section>
          <Header.Section align="end">
            <button>Login</button>
          </Header.Section>
        </Header>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Standalone Sidebar</Card.Header><Card.Body style={{padding:0,height:400,display:"flex"}}>
        <Sidebar collapsible collapsed={collapsed} onCollapseChange={setCollapsed}>
          <Sidebar.Section title="Main">
            <Sidebar.Item icon={<Icon name="search" />} selected>Search</Sidebar.Item>
            <Sidebar.Item icon={<Icon name="info" />}>Info</Sidebar.Item>
          </Sidebar.Section>
          <Sidebar.Section title="Tools">
            <Sidebar.Item icon={<Icon name="copy" />}>Copy</Sidebar.Item>
            <Sidebar.Item icon={<Icon name="trash" />} disabled>Delete (disabled)</Sidebar.Item>
          </Sidebar.Section>
        </Sidebar>
        <main style={{flex:1,padding:16}}>Main content</main>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Standalone Footer</Card.Header><Card.Body style={{padding:0}}>
        <Footer>
          <p style={{margin:0}}>© 2026 Plastic. All rights reserved.</p>
        </Footer>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Full AppShell-like layout</Card.Header><Card.Body style={{padding:0}}>
        <div style={{display:"grid",gridTemplate:"'h h' auto 's m' 1fr 'f f' auto / auto 1fr",height:500}}>
          <Header style={{gridArea:"h"}}>
            <Header.Section><strong>App</strong></Header.Section>
            <Header.Section align="end"><Avatar /></Header.Section>
          </Header>
          <Sidebar style={{gridArea:"s"}} collapsible>
            <Sidebar.Item icon={<Icon name="home" />} selected>Home</Sidebar.Item>
            <Sidebar.Item icon={<Icon name="info" />}>About</Sidebar.Item>
          </Sidebar>
          <main style={{gridArea:"m",padding:16,overflow:"auto"}}>Main</main>
          <Footer style={{gridArea:"f"}}><p>Footer</p></Footer>
        </div>
      </Card.Body></Card.Root>

      <Card.Root><Card.Header>Dark theme</Card.Header><Card.Body style={{padding:0}}>
        <Header theme="dark"><Header.Section>Dark App</Header.Section></Header>
        <div style={{display:"flex",height:200}}>
          <Sidebar theme="dark">
            <Sidebar.Item icon={<Icon name="home" />} selected>Home</Sidebar.Item>
          </Sidebar>
          <main style={{flex:1,padding:16,background:"#1f2937",color:"#e5e7eb"}}>Dark</main>
        </div>
        <Footer theme="dark"><p>Dark Footer</p></Footer>
      </Card.Body></Card.Root>
    </div>
  );
}
```

---

## 5. 접근성

- Header: `<header>` 시맨틱 + role="banner" 자동.
- Sidebar: `<nav>` 시맨틱 + role="navigation" 자동.
- Footer: `<footer>` 시맨틱 + role="contentinfo" 자동.
- Sidebar.Item: anchor (href) 또는 button. `aria-current="page"` for selected.
- Sidebar collapsible 토글: `aria-label` 동적.
- 키보드: anchor/button 표준.

## 6. Edge cases
- Header height < icon — 자동 잘림. 사용자 책임.
- Sidebar 아주 좁은 collapsedWidth (예: 40px): 아이콘만 → 정상.
- Sidebar.Item children + icon 둘 다 없음: 빈 행.
- Sidebar in horizontal layout: 사용자 책임 (parent flex 가정).
- sticky + 부모 overflow auto 없음: sticky 작동 안 함.
- href + onClick 동시: 둘 다 동작 (preventDefault 사용자 책임).

## 7. 구현 단계
- Phase 1: 6개 파일 작성
- Phase 2: 데모
- Phase 3: 정리

## 8. 체크리스트
- [ ] 6개 파일
- [ ] typecheck/build
- [ ] Header sections (start/center/end) 정상
- [ ] Sidebar collapsible toggle
- [ ] Sidebar.Item selected/disabled
- [ ] Footer 정상
- [ ] Full grid layout 데모 정상
- [ ] dark theme
- [ ] candidates / README
