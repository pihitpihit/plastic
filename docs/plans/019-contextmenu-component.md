# ContextMenu 컴포넌트 설계문서

## Context

plastic 라이브러리에 "오른쪽 버튼 클릭(또는 모바일 long-press) 시 포인터 근처에 떠오르는 맥락 메뉴" `ContextMenu` 컴포넌트를 추가한다. 역할 비유: VSCode 에디터/트리뷰 우클릭, Figma 캔버스 우클릭, macOS Finder 컨트롤-클릭, IntelliJ 의 "Show Intention Actions". 이 컴포넌트는 IDE 스타일 UI 에서 "선택된 대상에 대한 맥락적 행동 모음" 을 노출하는 표준 블록이며, plastic 상위에서 `DataTable` / `PipelineGraph` / `FileTree` 같은 컨테이너들이 장차 자체적으로 컨텍스트 메뉴를 달고 싶어할 때 공용 프리미티브로 재사용할 수 있도록 먼저 일반화한다.

참고 (prior art — UX/접근성 근거):
- **Radix `ContextMenu`** — compound API (`Root/Trigger/Portal/Content/Item/Sub/...`), `contextmenu` 이벤트 기반, 포털 포지셔닝 + collision, 키보드 nav 완비. 사실상 모던 React 표준. 본 설계의 1차 참조.
- **Ant Design `Dropdown` (`trigger: ['contextMenu']`)** — trigger 에 contextMenu 모드가 있어 우클릭으로 드롭다운 메뉴 띄우는 방식. 다만 ContextMenu 전용 컴포넌트는 분리되어 있지 않음.
- **Electron/VSCode `Menu`/`ContextMenu` (chromium)** — 네이티브 OS 메뉴를 합성. 본 설계는 브라우저-only 이므로 OS 메뉴는 기본 `contextmenu` preventDefault 로 차단하고 커스텀 레이어로 덮는다.
- **Blueprint `ContextMenu` / `<ContextMenuTarget>`** — render-prop 기반. 고전 패턴, 참고만.
- **Headless UI / react-aria `useMenuTrigger` + `useMenu`** — 접근성/roving tabindex 로직 구현 레퍼런스.
- **native `<menu type="context">`** — HTML 스펙에서 폐지(deprecated) 되어 현실적으로 쓰이지 않음. 본 컴포넌트가 polyfill 역할.

역할 비유 (UX):
- **우클릭 맥락 메뉴** — "이 요소 위에서 가능한 행동". 평소에는 숨고 요청 시에만 등장. `Dropdown` 과 달리 "버튼" 이 아니라 "임의 영역" 에 붙는다.
- **long-press 터치** — 모바일/태블릿에서 동등한 진입. 550 ms 유지 후 진동 피드백(지원 시) + 메뉴 오픈.
- **키보드 메뉴 키** — 물리 키보드의 `Menu` 키(혹은 `Shift+F10`) 도 contextmenu 이벤트를 발생시킴. 본 컴포넌트는 이를 그대로 수용하며, 발생 위치가 포인터가 아닌 "포커스된 요소의 좌측 하단" 으로 대체된다.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/Popover/` — portal 마운트 + viewport 기반 포지셔닝의 prior art. `PopoverContent` 의 `position: "fixed"` + `getBoundingClientRect` 기반 collision flip 로직을 **참조하되 이식하지 않고 자체 구현**(팝오버는 anchor 요소 기준, ContextMenu 는 포인터 좌표 기준이라 계산 입력값이 다름).
- `src/components/CommandPalette/` — 키보드 전용 리스트 네비게이션(`useKbdNav`), roving activeIndex, `Enter` activate, typeahead 등의 패턴을 직접 참조.
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅. `open`/`defaultOpen`/`onOpenChange` 에서 사용.
- `src/components/index.ts` — 배럴 등록 지점.
- `demo/src/App.tsx` — NAV 라우팅에 `"contextmenu"` 추가.
- `demo/src/pages/CommandPalettePage.tsx` — 키보드 네비게이션이 돋보이는 데모 페이지 레이아웃 관례.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약.

---

## 0. TL;DR (한 페이지 요약)

```tsx
<ContextMenu.Root>
  <ContextMenu.Trigger asChild>
    <div className="file-item">README.md</div>
  </ContextMenu.Trigger>

  <ContextMenu.Content theme="dark">
    <ContextMenu.Label>README.md</ContextMenu.Label>
    <ContextMenu.Separator />

    <ContextMenu.Item onSelect={open}>
      Open
      <ContextMenu.Shortcut>⌘O</ContextMenu.Shortcut>
    </ContextMenu.Item>

    <ContextMenu.Item onSelect={rename}>
      Rename
      <ContextMenu.Shortcut>F2</ContextMenu.Shortcut>
    </ContextMenu.Item>

    <ContextMenu.Sub>
      <ContextMenu.SubTrigger>Copy as…</ContextMenu.SubTrigger>
      <ContextMenu.SubContent>
        <ContextMenu.Item>Path</ContextMenu.Item>
        <ContextMenu.Item>Relative path</ContextMenu.Item>
        <ContextMenu.Item>Content</ContextMenu.Item>
      </ContextMenu.SubContent>
    </ContextMenu.Sub>

    <ContextMenu.Separator />

    <ContextMenu.CheckboxItem
      checked={wordWrap}
      onCheckedChange={setWordWrap}
    >
      Word Wrap
    </ContextMenu.CheckboxItem>

    <ContextMenu.RadioGroup value={theme} onValueChange={setTheme}>
      <ContextMenu.RadioItem value="light">Light</ContextMenu.RadioItem>
      <ContextMenu.RadioItem value="dark">Dark</ContextMenu.RadioItem>
    </ContextMenu.RadioGroup>

    <ContextMenu.Separator />

    <ContextMenu.Item disabled>Move to…</ContextMenu.Item>
    <ContextMenu.Item onSelect={trash} data-danger>
      Delete
      <ContextMenu.Shortcut>⌫</ContextMenu.Shortcut>
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
```

렌더 결과 (개념):
```
┌─────────────────────────┐
│ README.md               │  ← Label (dim)
├─────────────────────────┤
│ Open              ⌘O    │
│ Rename            F2    │
│ Copy as…            ▸   │ ──► ┌─────────────────┐
├─────────────────────────┤     │ Path            │
│ ✓ Word Wrap             │     │ Relative path   │
│ ● Light                 │     │ Content         │
│ ○ Dark                  │     └─────────────────┘
├─────────────────────────┤
│ Move to…        (dim)   │  ← disabled
│ Delete            ⌫     │
└─────────────────────────┘
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Root`/`Trigger`/`Content` + 아이템 계열(`Item`/`CheckboxItem`/`RadioGroup`/`RadioItem`/`Sub`/`SubTrigger`/`SubContent`/`Separator`/`Label`/`Shortcut`). Context 통해 상태·포커스·dispatch 공유. JSX 선언 자체가 메뉴 구조이며 별도 `items: MenuItem[]` 배열을 인자로 받는 "데이터형 API" 는 v1 범위 밖(§16).
- **trigger 는 임의 DOM**. `<ContextMenu.Trigger asChild>` 로 기존 요소를 래핑만 하고 `contextmenu` / `touchstart`(long-press) / `keydown`(Shift+F10, Menu) 핸들러를 attach. `asChild` 없으면 `<span>` 기본 래퍼.
- **포인터 좌표 기준 포지셔닝**. 팝오버가 "anchor rect 기준" 인 것과 달리 ContextMenu 는 "발생 포인트 `(x, y)` 기준" 으로 메뉴의 top-left 를 정렬하되, viewport 경계에 닿으면 **flip/shift** 하여 잘리지 않게 한다. 서브메뉴는 "부모 아이템 rect 의 우측 상단" 기준.
- **포털(Portal) 마운트**. `document.body` 아래 `<div data-plastic-portal="context-menu">` 에 `createPortal` 로 렌더. `z-index: 9999`. 같은 페이지에 여러 ContextMenu 가 있어도 포털은 공유(싱글톤 노드).
- **한 번에 하나만**. 전역적으로 동시에 열린 ContextMenu 는 1 개(기본). 새 `contextmenu` 이벤트가 오면 기존 메뉴는 닫히고 새 위치에서 다시 연다.
- **`DropdownMenu` 와 내부 공유**. 동일한 `useMenuNavigation` 훅, 동일 CSS 토큰, 동일 `Item/CheckboxItem/RadioItem/Sub/SubTrigger/SubContent/Separator/Label/Shortcut` 구현을 재사용한다. 두 컴포넌트 차이는 오직 "어떻게 여는가(trigger)" 와 "어디에 정렬하는가(anchor: 포인터 vs 버튼)" 둘 뿐. 본 PR 은 ContextMenu 만 공개 export 하지만, 내부 디렉터리 구조는 `_Menu/` 공용 레이어 + `ContextMenu/` 얇은 래퍼 + 장차 `DropdownMenu/` 얇은 래퍼 형태로 나눈다(§10).
- **런타임 의존 zero**. React + DOM API 만. portal, `createPortal`, `pointerEvents`, `getBoundingClientRect`, `requestAnimationFrame` 뿐.
- **접근성 우선**. `role="menu"` / `role="menuitem"` / `role="menuitemcheckbox"` / `role="menuitemradio"` / `aria-haspopup="menu"` / `aria-expanded` / `aria-checked` / 각 `aria-disabled`. 키보드 네비게이션 + typeahead 지원.
- **v1 은 다중 depth submenu 허용**. UX 관례(2~3 depth) 내에서 동작. 단 v1 에서 iframe 안쪽/바깥쪽으로 퍼지는 상호작용(iframe 좌표 보정)은 제외.

---

## 1. Goals / Non-goals

### Goals (v1)
1. `ContextMenu.Trigger` 내부 영역에서 브라우저 `contextmenu` 이벤트 발생 시 기본 동작(OS 메뉴) preventDefault 후 커스텀 메뉴 오픈.
2. 터치 환경 long-press(기본 550 ms) 로 동일 진입. `touchmove` 임계(8 px) 초과 시 취소.
3. 키보드 `Shift+F10` 및 `ContextMenu` 키로도 오픈(trigger 내부에 포커스가 있을 때). 오픈 좌표는 포커스된 요소의 bounding rect 의 좌측 하단.
4. 메뉴 아이템: 일반 `Item`, 비활성 `Item` (`disabled`), `CheckboxItem`, `RadioGroup` + `RadioItem`, `Separator`, `Label`, 우측 단축키 힌트 `Shortcut`.
5. **다중 depth 서브메뉴** (`Sub` / `SubTrigger` / `SubContent`). 호버 시 150 ms 지연 열림, 포인터 이동 의도(pointer-safe triangle) 로직으로 서브메뉴로 이동하는 대각 경로 유지 시 부모가 조기 닫히지 않도록 보장.
6. 키보드 네비게이션: `ArrowDown`/`ArrowUp` 이동(roving `activeIndex`), `ArrowRight` 서브메뉴 열고 첫 아이템 포커스, `ArrowLeft` 서브메뉴 닫고 부모로, `Enter`/`Space` 선택, `Escape` 닫기, `Home`/`End` 양 끝, typeahead (연속 타이핑 200 ms 버퍼 → 시작문자 일치).
7. 포인터 이동: `mouseenter` 시 `activeIndex` 업데이트, disabled 는 건너뜀.
8. 포털 기반 viewport 클램프 + flip. 우측/하단 경계 초과 시 좌측/상단으로 반전. 여전히 초과면 내부 스크롤(`max-height: calc(100vh - 16px)`, `overflow-y: auto`).
9. 외부 클릭(`pointerdown`, target 이 포털 밖) / `Escape` / 창 블러 / 스크롤 / resize 시 닫기.
10. controlled/uncontrolled 이중 API: `open`/`defaultOpen`/`onOpenChange`. 프로그래매틱 오픈/닫기 수단 제공 (`ContextMenu.Root` 가 `open` 을 받으면 해당 값 그대로 표시, `x`/`y` 를 동시에 받으면 그 좌표에).
11. `onSelect` 콜백이 `event.preventDefault()` 하면 메뉴가 닫히지 않음(선택 → 서브액션 연속 시나리오). 기본은 선택 즉시 닫힘.
12. Light / Dark 테마.
13. `DropdownMenu` 와 내부(훅, 공용 아이템 컴포넌트, CSS 토큰) 공유. v1 본 PR 은 ContextMenu 만 export. DropdownMenu 는 후속(§17).

### Non-goals (v1 제외)
- **iframe 교차 좌표 보정**: `contextmenu` 가 iframe 내부에서 발생해 iframe 바깥의 부모 문서 위에 메뉴를 띄우는 use case. 좌표계 변환 + `postMessage` 필요. v1.1.
- **중첩 Root 제한 해제**: 같은 트리거 내부에 또다른 Trigger 를 둔 케이스는 가장 깊은 Trigger 가 우선(DOM 이벤트 버블 순), 바깥 Trigger 는 무시되도록만 보장. "동시에 두 개 열기" 는 지원하지 않는다.
- **커스텀 포지셔닝 전략** (예: `align: "center" | "right-edge"`): v1 은 포인터 기준 top-left 정렬 + viewport 경계 flip 만. 커스텀은 v1.1.
- **드래그로 메뉴 내 선택** (press-drag-release): macOS 네이티브 메뉴의 "눌러서 드래그, 뗀 위치에서 선택" 패턴. UX 복잡도 ↑. v1 은 클릭/키보드만.
- **아이콘 슬롯 전용 prop**: `icon?: ReactNode` 같은 prop 은 두지 않고, 사용자는 children 에 자유롭게 아이콘 요소를 넣는다(예: `<Item><Icon /> Open</Item>`). `Shortcut` 은 예외적으로 정렬 관례(`margin-left: auto`) 때문에 전용 컴포넌트.
- **async 아이템(동적 로딩)**: 서브메뉴 열 때 데이터를 fetch 하는 패턴. v1 은 정적 JSX 만. `Sub` 안에서 사용자가 `useEffect` 로 로딩하는 것은 당연히 가능하지만, 공식 `loading` 슬롯/skeleton 은 없음.
- **MenuBar** (`File Edit View ...` 상단 고정 메뉴 바): 트리거 모델이 다르고 focus policy 도 다름. 별도 컴포넌트로 §17.
- **macOS 앱처럼 메뉴 자체에 포커스 링 없음**: activeIndex 의 시각적 표시는 background highlight + optional focus ring(키보드 열림일 때만 외곽선). "보이지 않는 포커스" 금지.
- **right-to-left 미러링 (서브메뉴 방향 자동 반전)**: 서브메뉴가 기본 우측으로 펼쳐지는 것을 RTL 에서 좌측으로 자동 반전하는 것은 v1 범위. 단 최상위 메뉴의 좌표 정렬 자체는 포인터 기준이므로 RTL 영향 없음. (포인터 좌표는 물리 좌표.)

---

## 2. 공개 API

### 2.1 타입 — `src/components/ContextMenu/ContextMenu.types.ts`

```ts
export type ContextMenuTheme = "light" | "dark";

export interface ContextMenuRootProps {
  /** open 제어값. 지정 시 controlled. */
  open?: boolean;
  /** 초기 open. uncontrolled. 기본 false. */
  defaultOpen?: boolean;
  /** open 변경 콜백. user interaction 및 외부 dismiss 모두. */
  onOpenChange?: (open: boolean) => void;

  /**
   * 프로그래매틱 오픈 시 좌표(viewport 기준 px).
   * controlled open=true 이면 필수. uncontrolled 는 contextmenu 이벤트 좌표 사용.
   */
  position?: { x: number; y: number };

  /** 비활성화. trigger 영역에서 contextmenu 이벤트를 완전히 무시(OS 메뉴가 뜸). */
  disabled?: boolean;

  /**
   * long-press(touch) 지속 임계 ms. 기본 550.
   * 0 이면 long-press 비활성.
   */
  longPressMs?: number;

  /** long-press 판정 시 허용 이동 임계 px. 초과 시 취소. 기본 8. */
  longPressTolerance?: number;

  /** 자식: Trigger + Content (+ 기타). */
  children: React.ReactNode;
}

export interface ContextMenuTriggerProps {
  /** true 면 자식 하나를 감싸지 않고 이벤트만 inject(cloneElement). */
  asChild?: boolean;
  /** 비활성화 (ContextMenuRootProps.disabled 와 독립적으로 trigger 만 끄고 싶을 때). */
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export interface ContextMenuContentProps {
  /** 라이트/다크. 기본 "light". (Root 에서 내려받지 않고 개별 Content 가 가짐.) */
  theme?: ContextMenuTheme;
  /** 메뉴 container 추가 클래스/스타일. */
  className?: string;
  style?: React.CSSProperties;
  /** 한 줄 최소 폭 (px). 기본 180. */
  minWidth?: number;
  /** 최대 폭 (px). 기본 320. 초과 시 줄바꿈 없이 ellipsis. */
  maxWidth?: number;
  /** 접근성 라벨(선택). 기본 "Context menu". */
  "aria-label"?: string;
  children: React.ReactNode;
}

export interface ContextMenuItemProps {
  /** 선택 콜백. event.preventDefault() 시 메뉴 닫히지 않음. */
  onSelect?: (event: ContextMenuItemEvent) => void;
  disabled?: boolean;
  /** typeahead 및 스크린리더용 텍스트 라벨 override. 기본 children 의 textContent. */
  textValue?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/** onSelect 에 전달되는 synthetic-like event. preventDefault 시 close 억제. */
export interface ContextMenuItemEvent {
  preventDefault: () => void;
  defaultPrevented: boolean;
}

export interface ContextMenuCheckboxItemProps
  extends Omit<ContextMenuItemProps, "onSelect"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** 선택 시 추가 부작용. 기본은 toggle 만. */
  onSelect?: (event: ContextMenuItemEvent) => void;
}

export interface ContextMenuRadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export interface ContextMenuRadioItemProps
  extends Omit<ContextMenuItemProps, "onSelect"> {
  value: string;
  onSelect?: (event: ContextMenuItemEvent) => void;
}

export interface ContextMenuSubProps {
  /** open 제어. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface ContextMenuSubTriggerProps {
  disabled?: boolean;
  textValue?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export interface ContextMenuSubContentProps {
  className?: string;
  style?: React.CSSProperties;
  minWidth?: number;
  maxWidth?: number;
  children: React.ReactNode;
}

export interface ContextMenuSeparatorProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface ContextMenuLabelProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export interface ContextMenuShortcutProps {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}
```

### 2.2 배럴

```ts
// src/components/ContextMenu/index.ts
export { ContextMenu } from "./ContextMenu";
export type {
  ContextMenuTheme,
  ContextMenuRootProps,
  ContextMenuTriggerProps,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuItemEvent,
  ContextMenuCheckboxItemProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuSubProps,
  ContextMenuSubTriggerProps,
  ContextMenuSubContentProps,
  ContextMenuSeparatorProps,
  ContextMenuLabelProps,
  ContextMenuShortcutProps,
} from "./ContextMenu.types";
```

그리고 `src/components/index.ts` 에 `export * from "./ContextMenu";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// ContextMenu.tsx
export const ContextMenu = {
  Root: ContextMenuRoot,
  Trigger: ContextMenuTrigger,
  Content: ContextMenuContent,
  Item: ContextMenuItem,
  CheckboxItem: ContextMenuCheckboxItem,
  RadioGroup: ContextMenuRadioGroup,
  RadioItem: ContextMenuRadioItem,
  Sub: ContextMenuSub,
  SubTrigger: ContextMenuSubTrigger,
  SubContent: ContextMenuSubContent,
  Separator: ContextMenuSeparator,
  Label: ContextMenuLabel,
  Shortcut: ContextMenuShortcut,
};
```

각 subcomponent 의 `displayName` 은 `"ContextMenu.Root"`, `"ContextMenu.Trigger"`, ... 으로 명명하여 DevTools 가독성 확보.

---

## 3. 도메인 모델

### 3.1 메뉴 트리 모델 (선언형 JSX)

v1 의 메뉴 구조는 사용자 JSX 가 곧 데이터다. 별도 `items: MenuItem[]` 을 만들지 않는다.

```
ContextMenu.Content
 ├─ Label                ("README.md")
 ├─ Separator
 ├─ Item                 (Open)
 ├─ Item                 (Rename)
 ├─ Sub
 │   ├─ SubTrigger       (Copy as…)
 │   └─ SubContent
 │       ├─ Item         (Path)
 │       ├─ Item         (Relative path)
 │       └─ Item         (Content)
 ├─ Separator
 ├─ CheckboxItem         (Word Wrap, checked)
 ├─ RadioGroup
 │   ├─ RadioItem        (light)
 │   └─ RadioItem        (dark)
 ├─ Separator
 ├─ Item (disabled)      (Move to…)
 └─ Item                 (Delete)
```

런타임에는 `Content`/`SubContent` 가 자식을 `React.Children.toArray` 하여 "선택 가능(focusable) 아이템 인덱스 배열" 을 만든다(`Label`/`Separator`/`disabled Item` 은 제외). `activeIndex` 는 이 focusable 배열 안에서 움직이는 정수. 이로써 `ArrowDown` 이 disabled 위로 뛰어 건너뛴다.

### 3.2 내부 아이템 디스크립터

```ts
type MenuItemKind =
  | "item"
  | "checkbox"
  | "radio"
  | "sub-trigger"
  | "separator"
  | "label";

interface MenuItemDescriptor {
  kind: MenuItemKind;
  disabled: boolean;
  textValue: string;      // typeahead + aria
  element: React.ReactElement;
}
```

`Content` 가 `useLayoutEffect` 로 children 을 스캔해 `descriptorsRef.current` 채운다. `Item/CheckboxItem/RadioItem/SubTrigger` 는 `useMenuItem()` 훅을 호출해 자신의 `textValue` 와 `disabled` 를 Context 에 등록. separator/label 은 "건너뛰기 대상" 표시.

### 3.3 checkbox / radio 상태

- `CheckboxItem` 은 `useControllable<boolean>` 로 checked 를 보유 (controlled 가능).
- `RadioGroup` 은 내부 Context 로 `value` + `onValueChange` 를 자식 `RadioItem` 에 내려보낸다. `RadioItem` 이 `onSelect` 시 자신의 `value` 로 그룹의 `onValueChange` 호출. 시각적으로는 현재 value 와 일치하는 radio 만 `●`.

### 3.4 서브메뉴 트리

`Sub` 는 독립적 `open` state 를 가진다 (Root 의 open 과 별개). 서브메뉴 depth 가 깊어지면 `Sub` 안에 `Sub` 를 또 넣는다. 최상위 Root 가 닫히면 모든 `Sub.open` 도 false 로 강제 리셋(`useEffect` 로 전파).

### 3.5 Root Context

```ts
interface ContextMenuContextValue {
  open: boolean;
  position: { x: number; y: number } | null;
  setOpen: (open: boolean, atPosition?: { x: number; y: number }) => void;
  disabled: boolean;
  longPressMs: number;
  longPressTolerance: number;

  /** 최상위 content 의 rootNodeId (포털 내부 식별용). */
  rootId: string;

  /** 열림 방식 (키보드 vs 포인터). 포커스 링 표시 정책용. */
  openMode: "pointer" | "keyboard" | null;

  /** typeahead 버퍼 (Content 가 공유). */
  typeaheadRef: React.MutableRefObject<{ buf: string; timer: number | null }>;
}
```

`Content` 수준 Context 는 별도:

```ts
interface ContextMenuContentContextValue {
  /** 현재 Content 의 activeIndex (focusable 배열 내 index). */
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  /** 현재 Content 에 속한 focusable items ref 리스트. */
  itemsRef: React.MutableRefObject<HTMLElement[]>;
  descriptorsRef: React.MutableRefObject<MenuItemDescriptor[]>;
  /** 선택 시 close 전파. */
  onItemSelect: (ev: ContextMenuItemEvent) => void;
  /** 서브 ↔ 부모 포커스 상호작용. */
  closeSelf: () => void;
}
```

### 3.6 dispatcher

라이브러리 외부 API 없는 내부 헬퍼:

```ts
// Root 가 소유하는 open 액션
type OpenAction =
  | { type: "open-pointer"; x: number; y: number }
  | { type: "open-keyboard"; x: number; y: number }
  | { type: "close" };
```

---

## 4. 시각 / 구조 설계

### 4.1 DOM 구조 (열린 상태 기준)

```
<body>
  <!-- 원래 Trigger 가 있던 문서 트리 -->
  <div data-plastic-context-menu-trigger="ok" oncontextmenu="...">
    … 사용자 콘텐츠 …
  </div>

  <!-- 포털: Content -->
  <div data-plastic-portal="context-menu">
    <div
      role="menu"
      aria-label="Context menu"
      tabindex="-1"
      class="cm-content cm-theme-light"
      style="position:fixed; top:120px; left:240px; min-width:180px; max-width:320px; z-index:9999;"
    >
      <div role="presentation" class="cm-label">README.md</div>
      <div role="separator" class="cm-separator" />
      <div role="menuitem" tabindex="-1" data-active="true" class="cm-item">
        <span class="cm-item-label">Open</span>
        <span class="cm-shortcut">⌘O</span>
      </div>
      <div role="menuitem" tabindex="-1" class="cm-item">
        <span class="cm-item-label">Rename</span>
        <span class="cm-shortcut">F2</span>
      </div>

      <div role="menuitem" tabindex="-1"
           aria-haspopup="menu" aria-expanded="false"
           class="cm-item cm-sub-trigger">
        <span class="cm-item-label">Copy as…</span>
        <span class="cm-sub-indicator">▸</span>
      </div>

      <div role="separator" class="cm-separator" />

      <div role="menuitemcheckbox" aria-checked="true" tabindex="-1" class="cm-item">
        <span class="cm-check">✓</span>
        <span class="cm-item-label">Word Wrap</span>
      </div>

      <div role="group" class="cm-radio-group">
        <div role="menuitemradio" aria-checked="true" tabindex="-1" class="cm-item">
          <span class="cm-radio">●</span>
          <span class="cm-item-label">Light</span>
        </div>
        <div role="menuitemradio" aria-checked="false" tabindex="-1" class="cm-item">
          <span class="cm-radio"></span>
          <span class="cm-item-label">Dark</span>
        </div>
      </div>

      <div role="separator" class="cm-separator" />

      <div role="menuitem" aria-disabled="true" class="cm-item cm-item-disabled">
        Move to…
      </div>
      <div role="menuitem" tabindex="-1" class="cm-item cm-item-danger">
        Delete
        <span class="cm-shortcut">⌫</span>
      </div>
    </div>

    <!-- 서브메뉴가 열린 경우(별도 floating container) -->
    <div role="menu" class="cm-content" style="position:fixed; top:180px; left:460px; ...">
      …
    </div>
  </div>
</body>
```

### 4.2 포지셔닝 알고리즘 (pointer 기준 flip/shift)

사용자가 `contextmenu` 이벤트 좌표 `(cx, cy)` 를 건넸다고 하자. Content 마운트 직후 `useLayoutEffect` 에서:

1. Content DOM 의 `getBoundingClientRect()` 로 `w` (width), `h` (height) 측정.
2. viewport 크기 `vw = window.innerWidth`, `vh = window.innerHeight`.
3. 바깥 padding `PAD = 8 px` (viewport 가장자리와 Content 사이 최소 여백).
4. 계산:
   ```
   left = cx
   top  = cy
   // 우측 overflow → flip
   if (left + w + PAD > vw)  left = Math.max(PAD, cx - w)
   // 좌측 underflow
   if (left < PAD)           left = PAD
   // 하단 overflow → flip
   if (top + h + PAD > vh)   top  = Math.max(PAD, cy - h)
   // 상단 underflow
   if (top < PAD)            top  = PAD
   ```
5. 여전히 `h > vh - 2*PAD` 인(메뉴가 뷰포트보다 큰) 경우: `top = PAD`, Content 에 `max-height: calc(100vh - 16px); overflow-y: auto` 적용.

### 4.3 서브메뉴 포지셔닝 (anchor 기준)

서브메뉴는 부모 `SubTrigger` 요소의 rect `r = trigger.getBoundingClientRect()` 를 기준:

1. 이상적 위치: `left = r.right + 2`, `top = r.top - 4` (살짝 위로 보정해 첫 아이템이 trigger 선과 맞도록).
2. 우측 overflow (`left + w + PAD > vw`) 이면 **좌측 플립**: `left = r.left - w - 2`.
3. 아직도 좌측 underflow 면 `left = PAD`.
4. 하단 overflow 면 `top = Math.max(PAD, r.bottom - h)` (bottom align).
5. 높이 과대면 §4.2 와 동일 max-height 적용.

### 4.4 이유 — fixed vs absolute vs body-relative

- `position: fixed` 선택. viewport 기준 좌표(`contextmenu` event 의 `clientX/Y`) 와 직결되어 스크롤/스크롤 위치 변동과 독립. 스크롤 발생 시에는 **메뉴 자체를 닫는다**(§5.x dismiss) — 팔로우 로직 불필요.
- `absolute` 에 `offsetParent` 기준이면 포털이 body 직하여 좌표 변환이 `pageX/Y` 로 달라지고 스크롤 이슈.
- iframe 내부 이벤트는 v1 에서 취급하지 않으므로 단일 문서 `clientX/Y` 로 충분.

### 4.5 palette 토큰

```ts
// ContextMenu/theme.ts
export const contextMenuPalette = {
  light: {
    contentBg:        "#ffffff",
    contentFg:        "#111827",
    contentBorder:    "rgba(0,0,0,0.08)",
    contentShadow:    "0 12px 32px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.08)",
    itemHoverBg:      "rgba(37,99,235,0.08)",
    itemActiveBg:     "rgba(37,99,235,0.14)",
    itemDisabledFg:   "rgba(17,24,39,0.35)",
    itemDangerFg:     "#dc2626",
    itemDangerBg:     "rgba(220,38,38,0.08)",
    separatorBg:      "rgba(0,0,0,0.08)",
    labelFg:          "rgba(17,24,39,0.55)",
    shortcutFg:       "rgba(17,24,39,0.50)",
    checkFg:          "#2563eb",
    radioFg:          "#2563eb",
    focusRing:        "#2563eb",
  },
  dark: {
    contentBg:        "#1f2937",
    contentFg:        "#e5e7eb",
    contentBorder:    "rgba(255,255,255,0.08)",
    contentShadow:    "0 12px 32px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.25)",
    itemHoverBg:      "rgba(96,165,250,0.12)",
    itemActiveBg:     "rgba(96,165,250,0.20)",
    itemDisabledFg:   "rgba(229,231,235,0.40)",
    itemDangerFg:     "#f87171",
    itemDangerBg:     "rgba(248,113,113,0.15)",
    separatorBg:      "rgba(255,255,255,0.08)",
    labelFg:          "rgba(229,231,235,0.55)",
    shortcutFg:       "rgba(229,231,235,0.50)",
    checkFg:          "#60a5fa",
    radioFg:          "#60a5fa",
    focusRing:        "#60a5fa",
  },
} as const;
```

### 4.6 치수 / 타이포

- Content padding: `4px 0`.
- Item: `padding: 6px 10px`, `height: 28px`, `font-size: 13px`, `line-height: 16px`.
- Shortcut: 우측 정렬, `margin-left: auto`, `font-variant-numeric: tabular-nums`, `color: var(--shortcutFg)`.
- Separator: `height: 1px`, `margin: 4px 6px`, `background: var(--separatorBg)`.
- Label: `padding: 4px 10px`, `font-size: 11px`, `text-transform: uppercase`, `letter-spacing: 0.04em`, `color: var(--labelFg)`.
- Sub indicator(`▸`): `margin-left: 6px`, `opacity: 0.7`.
- Radius: 6px (content) / 3px (item hover box-inset).
- Content shadow : §4.5 팔레트.

---

## 5. 핵심 로직

### 5.1 trigger 이벤트 attach

`ContextMenu.Trigger` 는 자식을 감싸는 얇은 wrapper. `asChild` 이면 `React.cloneElement(child, injectedProps)` 로 이벤트만 내려보낸다(Radix 방식). 그렇지 않으면 `<span data-cm-trigger>` 로 감싼다.

```ts
function useTriggerHandlers(ctx: ContextMenuContextValue) {
  const onContextMenu = (e: React.MouseEvent) => {
    if (ctx.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    ctx.setOpen(true, { x: e.clientX, y: e.clientY });
  };

  // long-press (touch)
  const touchStateRef = useRef<{ tid: number; sx: number; sy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (ctx.disabled || ctx.longPressMs <= 0) return;
    const t0 = e.touches[0];
    if (!t0) return;
    const tid = window.setTimeout(() => {
      ctx.setOpen(true, { x: t0.clientX, y: t0.clientY });
      // 진동 (지원 시)
      if (typeof navigator.vibrate === "function") navigator.vibrate(8);
    }, ctx.longPressMs);
    touchStateRef.current = { tid, sx: t0.clientX, sy: t0.clientY };
  };
  const cancel = () => {
    if (touchStateRef.current) {
      clearTimeout(touchStateRef.current.tid);
      touchStateRef.current = null;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = touchStateRef.current;
    const t = e.touches[0];
    if (!s || !t) return;
    const d = Math.hypot(t.clientX - s.sx, t.clientY - s.sy);
    if (d > ctx.longPressTolerance) cancel();
  };
  const onTouchEnd = cancel;
  const onTouchCancel = cancel;

  // 키보드: Shift+F10, ContextMenu 키
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (ctx.disabled) return;
    const isCtxKey =
      e.key === "ContextMenu" || (e.shiftKey && e.key === "F10");
    if (!isCtxKey) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctx.setOpen(true, { x: r.left, y: r.bottom });
    // openMode = "keyboard" 로 마킹 → activeIndex=0 자동
  };

  return { onContextMenu, onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, onKeyDown };
}
```

주의점:
- `onContextMenu` 에 `preventDefault` 는 필수 — OS 메뉴 띄우는 브라우저 기본 차단.
- `stopPropagation` 도 호출하여, 중첩된 상위 Trigger 가 같은 이벤트에 반응해 중복 오픈하지 않도록. (최내부 Trigger 가 이김.)
- `disabled` 이면 이벤트 무시 → OS 기본 메뉴가 그대로 뜸. (테스트/디버깅 편의.)

### 5.2 Root 상태 머신

```ts
function ContextMenuRoot(props: ContextMenuRootProps) {
  const [openUnc, setOpenUnc] = useState(props.defaultOpen ?? false);
  const [positionUnc, setPositionUnc] = useState<{ x: number; y: number } | null>(null);
  const [openMode, setOpenMode] = useState<"pointer" | "keyboard" | null>(null);

  const isControlled = props.open !== undefined;
  const open = isControlled ? props.open! : openUnc;
  const position = isControlled ? (props.position ?? null) : positionUnc;

  const setOpen = useEvent((next: boolean, atPosition?: { x: number; y: number }, mode: "pointer" | "keyboard" = "pointer") => {
    if (!isControlled) {
      setOpenUnc(next);
      if (atPosition) setPositionUnc(atPosition);
      else if (!next) setPositionUnc(null);
    }
    setOpenMode(next ? mode : null);
    props.onOpenChange?.(next);
  });

  // dev warn: controlled open=true 인데 position 미지정
  useEffect(() => {
    if (isControlled && open && !props.position) {
      console.warn("[ContextMenu] controlled `open=true` requires `position={{x,y}}`");
    }
  }, [isControlled, open, props.position]);

  // ... Context.Provider + children 렌더
}
```

`useEvent` 는 `useCallback` 가 deps 로 인한 stale handler 를 피하기 위한 ref 기반 헬퍼(내부). `CommandPalette` 에서 쓰던 패턴 재사용.

### 5.3 Content 마운트 & 포지셔닝

```tsx
function ContextMenuContent({ children, theme = "light", minWidth = 180, maxWidth = 320, ...rest }: ContextMenuContentProps) {
  const ctx = useContextMenuContext();
  const ref = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number; maxH?: number } | null>(null);

  useLayoutEffect(() => {
    if (!ctx.open || !ctx.position || !ref.current) { setPlacement(null); return; }
    const el = ref.current;
    const w = el.offsetWidth, h = el.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    const PAD = 8;
    let { x: left, y: top } = ctx.position;
    if (left + w + PAD > vw) left = Math.max(PAD, ctx.position.x - w);
    if (left < PAD) left = PAD;
    if (top + h + PAD > vh) top  = Math.max(PAD, ctx.position.y - h);
    if (top  < PAD) top  = PAD;
    const maxH = h > vh - 2 * PAD ? vh - 2 * PAD : undefined;
    setPlacement({ left, top, ...(maxH ? { maxH } : {}) });
  }, [ctx.open, ctx.position?.x, ctx.position?.y]);

  // keyboard/pointer focus mgmt + dismissers + arrow nav (자세한 로직은 §7)
  useMenuDismisser(ref, ctx);
  const contentCtx = useMenuContentStateMachine(ref, ctx, { openMode: ctx.openMode });

  if (!ctx.open) return null;
  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={rest["aria-label"] ?? "Context menu"}
      tabIndex={-1}
      className={clsx("cm-content", `cm-theme-${theme}`, rest.className)}
      style={{
        position: "fixed",
        left: placement?.left ?? -9999,
        top: placement?.top ?? -9999,
        minWidth, maxWidth,
        maxHeight: placement?.maxH,
        overflowY: placement?.maxH ? "auto" : undefined,
        opacity: placement ? 1 : 0,  // 측정 전에는 숨김 (FOUC 방지)
        zIndex: 9999,
        ...rest.style,
      }}
      onKeyDown={contentCtx.onKeyDown}
      onMouseMoveCapture={contentCtx.onMouseMoveCapture}
    >
      <ContextMenuContentContext.Provider value={contentCtx.value}>
        {children}
      </ContextMenuContentContext.Provider>
    </div>,
    getPortalNode()
  );
}
```

`getPortalNode()` 은 `document.body` 에 `data-plastic-portal="context-menu"` 를 한번만 만들어 재사용 (싱글톤, `useSyncExternalStore` 필요 없음). Popover 의 것과 **분리** — 다른 z-index 와 cleanup lifecycle.

### 5.4 서브메뉴 hover-open 지연 + pointer-safe triangle

서브메뉴는 `SubTrigger` 에 포인터가 들어오면 150 ms 후 열고, 나가면 150 ms 후 닫는다. 단 "닫힘 타이머" 동작 중 포인터가 이미 열려있는 `SubContent` 의 첫 visible rect 쪽으로 "대각 이동 중" 이라면 타이머를 연장한다(사용자가 서브메뉴로 이동하는 의도).

알고리즘 (safe triangle):
1. `SubContent` 가 열려있고 위치가 확정되었을 때, 그 좌측 세로변(왼쪽 플립이면 우측 세로변)의 두 끝점을 `P1 = (subLeft, subTop)`, `P2 = (subLeft, subBottom)` 로 기록.
2. 포인터가 `SubTrigger` 에서 벗어나는 순간 커서 좌표 `P0 = (px, py)` 를 기준점으로 삼고, 이후 `mousemove` 를 Content 레벨에서 감지.
3. 이후 매 이동 좌표 `Pn` 에 대해 **삼각형 `P0-P1-P2` 내부** 에 있는지 판정. 내부면 사용자는 서브메뉴 쪽으로 "향하는 중" 으로 해석 → 닫힘 타이머 리셋(또 150 ms 연장).
4. 삼각형 밖으로 벗어나거나 250 ms 지연 누적 시 타이머 만료 → 서브메뉴 닫기.

```ts
// pointer-safe triangle 내부 판정 (barycentric)
function isInsideTriangle(p: XY, a: XY, b: XY, c: XY): boolean {
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
function sign(p: XY, a: XY, b: XY): number {
  return (p.x - b.x) * (a.y - b.y) - (a.x - b.x) * (p.y - b.y);
}
```

UX 영향: 사용자가 "Copy as…" 위에서 우측 서브메뉴의 "Relative path" 로 대각 이동할 때 중간에 다른 Item 위를 스쳐도 서브메뉴가 닫히지 않는다. 이 부분은 Radix/Chromium native 메뉴의 사실상 표준 UX.

구현 위치: `useMenuSub` 훅이 부모 Content 의 `onMouseMoveCapture` 를 구독하여 좌표를 받는다. `P0/P1/P2` 는 `SubTrigger` 를 떠날 때 계산해 저장.

### 5.5 외부 dismiss

`Content` 마운트 시 document-level 리스너:
- `pointerdown` (capture): target 이 `data-plastic-portal="context-menu"` 의 descendant 가 아니면 `setOpen(false)`.
- `keydown` Escape: 활성 Content 가 서브면 자기만 close, 아니면 최상위 close.
- `blur` on window: `setOpen(false)` (창을 떠나면 메뉴 닫힘).
- `scroll` (capture, passive): 컨테이너가 스크롤될 때 좌표 신뢰도 잃으므로 닫음. 단 Content 자체의 내부 스크롤은 무시(리스너 target 검사).
- `resize`: 동일 이유로 닫음.
- `contextmenu` (capture): 다른 위치에서 또 우클릭이 오면, Root 의 setOpen 로직이 새 좌표로 다시 열기 — Content 는 재계산으로 움직인다. 즉 "이전 메뉴 close + 새 메뉴 open" 이 자연스럽게 흐른다.

모두 `useEffect` 내 `addEventListener` + cleanup.

### 5.6 Item 선택 & close 전파

`Item.onClick` 및 `Enter/Space` 키 처리에서:
```ts
function selectItem(userOnSelect?: (e: ContextMenuItemEvent) => void) {
  const ev: ContextMenuItemEvent = {
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
  };
  userOnSelect?.(ev);
  if (!ev.defaultPrevented) ctx.setOpen(false);
}
```

`CheckboxItem` 은 선택 시 내부 toggle + `onCheckedChange` 후 `userOnSelect` 호출. `RadioItem` 은 그룹의 `onValueChange(value)` 호출 후 close.

---

## 6. 제약 (viewport clamp, 최대 높이, 아이템 수, 길이)

### 6.1 viewport clamp 정책
- **clamp 우선**: §4.2 의 flip 로직으로 우/하단 경계를 건드리지 않는 한 원래 좌표 유지. 건드릴 때만 플립.
- **양쪽 동시 overflow**: width > vw - 2*PAD 인 극단 케이스는 left=PAD, maxWidth=vw-2*PAD. height 동일.
- **PAD=8px 이유**: OS 스타일 드롭 섀도(대략 12~16 px blur) 절반이 들여다보이도록 최소 여백.

### 6.2 max-height 와 내부 스크롤
- 아이템 수가 많아 Content 가 `vh - 16px` 보다 크면 내부 `overflow-y: auto`.
- 스크롤 컨테이너 자체가 키보드 네비로 자동 `scrollIntoView({ block: "nearest" })` 되어야 함 → `useMenuNavigation` 이 activeIndex 변경 시 해당 item DOM 을 `scrollIntoView`.
- 외부 스크롤(윈도우/부모 컨테이너)이 감지되면 Content 는 닫는다(§5.5). 그러나 **Content 내부 스크롤**은 닫지 않는다(리스너 capture 에서 `e.target` 이 Content descendant 인지 검사).

### 6.3 item width 제약
- 라벨이 길면 `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. 최대 폭 `maxWidth - padding - shortcut` 선에서 잘림. tooltip 은 v1 없음 (사용자가 필요시 `Tooltip` 으로 감싸면 됨).

### 6.4 동시 오픈 제한
- 하나의 Root 는 동시 1 개 메뉴 트리(최상위 Content + 열린 서브들)만 유지. 다른 Root 도 `document` pointerdown 이 dismiss 역할을 하므로 자연스럽게 하나만 표시된다.
- 여러 Root 가 같은 영역에 대해 `contextmenu` 를 받는다면, DOM 이벤트 버블 순서대로 최내부 Trigger 가 `stopPropagation` 호출해 이김.

### 6.5 서브메뉴 깊이
- 기술적 제한 없음. 다만 UX 관례상 3 depth 이상은 ineffective — 데모 페이지에서도 2~3 depth 예시만.

### 6.6 아이템 DOM 수
- 1000 개 이상의 Item 은 성능 경고 대상(§14). v1 은 단순 렌더, 가상화 없음. 1000 개 이상이 필요한 유스케이스는 "메뉴" 가 아니라 `CommandPalette` 로 유도.

---

## 7. 키보드

메뉴 오픈 후 포커스는 Content DOM (`tabindex=-1`, 실제 포커스는 `activeIndex` 에 해당하는 item 의 DOM 이 `ref.focus()`).

| 키 | 위치 | 동작 |
|---|---|---|
| `ArrowDown` | Content/SubContent | 다음 focusable item 으로. 끝이면 처음으로 wrap. disabled/separator/label 건너뜀. |
| `ArrowUp` | Content/SubContent | 이전 focusable item. 처음이면 끝으로 wrap. |
| `ArrowRight` | SubTrigger 에 활성일 때 | 서브메뉴 열고 첫 item 에 포커스. 일반 item 에선 무시. |
| `ArrowLeft` | SubContent 내부 | 서브메뉴 닫고 부모 Content 로 포커스 복귀(부모의 SubTrigger 가 active). Content(최상위) 에선 무시. |
| `Enter` / `Space` | item 활성 | 선택. onSelect preventDefault 면 유지, 아니면 최상위까지 close. |
| `Escape` | 임의 Content | 현재 Content 가 SubContent 면 자기만 close, 최상위면 Root close. |
| `Home` | Content | 첫 focusable item. |
| `End` | Content | 마지막 focusable item. |
| `Tab` | Content | preventDefault — Tab 포커스 순환이 메뉴 바깥으로 빠져나가지 못하게. (Radix 정책 준수.) |
| `a-z 0-9` + symbol | Content | typeahead: 200 ms 버퍼 유지, 버퍼로 `startsWith` (case-insensitive) 일치 첫 item 포커스. 같은 문자 반복 시 동일 prefix 그룹 내 순환 (`jj` 는 "j" 시작 두 번째). |

typeahead 구현:
```ts
const ta = ctx.typeaheadRef.current;
if (ta.timer) clearTimeout(ta.timer);
ta.buf += e.key.toLowerCase();
ta.timer = window.setTimeout(() => { ta.buf = ""; ta.timer = null; }, 200);

const descs = contentCtx.descriptorsRef.current.filter(d =>
  !d.disabled && (d.kind === "item" || d.kind === "checkbox" || d.kind === "radio" || d.kind === "sub-trigger")
);
// 현재 activeIndex 이후부터 순회
const start = contentCtx.activeIndex + 1;
const N = descs.length;
for (let i = 0; i < N; i++) {
  const d = descs[(start + i) % N];
  if (d && d.textValue.toLowerCase().startsWith(ta.buf)) {
    contentCtx.setActiveIndex((start + i) % N);
    break;
  }
}
```

### 7.1 첫 포커스 위치 (openMode 분기)

- `openMode === "pointer"`: 포커스 링 숨김, `activeIndex = -1` (아직 아무것도 highlight 안 됨). 이후 포인터 hover 가 activeIndex 를 정한다.
- `openMode === "keyboard"` (Shift+F10, Menu 키): `activeIndex = 0` 즉시 highlight, 포커스 링 보임.

`data-open-mode="pointer"|"keyboard"` 를 Content 에 걸고 CSS 에서 `[data-open-mode="keyboard"] .cm-item[data-active="true"] { outline: 2px solid var(--focusRing); }` 으로 분기.

### 7.2 포커스 트랩

Content 가 열리면 직전 포커스 `document.activeElement` 를 저장. 닫힐 때 저장 요소로 복원. Tab/Shift+Tab 은 preventDefault 되어 메뉴 밖으로 못 나간다.

---

## 8. 상태 관리 (open, openSub, activeIndex, controlled)

### 8.1 Root 레벨

```ts
const [openUnc, setOpenUnc] = useState(defaultOpen ?? false);
const [positionUnc, setPositionUnc] = useState<{x:number;y:number} | null>(null);
const isControlled = props.open !== undefined;
```

controlled 이면 `open`/`position` 은 props 에서 읽고, user interaction 은 `onOpenChange` 만 호출. uncontrolled 이면 내부 setState 도 함께.

controlled + `open=true` 인데 `position` 없으면 dev warn + 이전 position 재사용 (없으면 `{x:0,y:0}` fallback).

### 8.2 Content 레벨

```ts
const [activeIndex, setActiveIndex] = useState(openMode === "keyboard" ? 0 : -1);
```

포인터 mouseenter 시:
```ts
function onItemMouseEnter(index: number) {
  setActiveIndex(index);
}
```

activeIndex 가 변경되면 해당 item DOM 을 `focus()` 하여 실제 포커스 트랩을 유지 (screen reader 에서 읽힘).

### 8.3 Sub 레벨

```ts
function ContextMenuSub({ open, defaultOpen, onOpenChange, children }: ContextMenuSubProps) {
  const [openUnc, setOpenUnc] = useState(defaultOpen ?? false);
  const isControlled = open !== undefined;
  const subOpen = isControlled ? open! : openUnc;
  const setSubOpen = (next: boolean) => {
    if (!isControlled) setOpenUnc(next);
    onOpenChange?.(next);
  };
  // 최상위 Root 닫힘 → 모든 Sub close
  const rootCtx = useContextMenuContext();
  useEffect(() => {
    if (!rootCtx.open && subOpen) setSubOpen(false);
  }, [rootCtx.open]);

  return <ContextMenuSubContext.Provider value={{ open: subOpen, setOpen: setSubOpen }}>{children}</ContextMenuSubContext.Provider>;
}
```

### 8.4 프로그래매틱 오픈 예시

```tsx
const [open, setOpen] = useState(false);
const [pos, setPos] = useState({x:0, y:0});
// 외부 버튼으로 임의 좌표에 메뉴 띄우기
<button onClick={(e) => { setPos({x: e.clientX, y: e.clientY}); setOpen(true); }}>
  Show menu at cursor
</button>
<ContextMenu.Root open={open} onOpenChange={setOpen} position={pos}>
  <ContextMenu.Trigger asChild><div /></ContextMenu.Trigger>{/* no-op trigger */}
  <ContextMenu.Content>…</ContextMenu.Content>
</ContextMenu.Root>
```

Trigger 가 실제로는 사용되지 않아도 compound 구조상 존재해야 한다. v1 정책: Trigger 가 없거나 children 이 비면 dev warn 후 렌더만 수행. v1.1 에서 `<ContextMenu.Root>` 내부 Trigger 생략 허용 리팩터링.

---

## 9. 고유 기능

### 9.1 CheckboxItem / RadioGroup

- 시각적 prefix: Checkbox 는 `✓` (24 × 24 icon slot), Radio 는 `●`. 미체크 시 공백이지만 **동일 너비** 차지(메뉴 정렬 일관성).
- `RadioGroup` 은 `value` / `defaultValue` / `onValueChange` 를 받아 Context 로 자식에 전달. `RadioItem` 은 내부 Context 에서 현재 value 와 자신의 value 비교 → `aria-checked`.
- 선택 시 toggle/값변경 후 기본 close. `onSelect` 에서 `preventDefault` 시 열림 유지(연속 토글 시나리오).

### 9.2 Shortcut 표시

- `<ContextMenu.Shortcut>` 는 children 을 그대로 렌더. 내부 CSS 가 `margin-left: auto` + 색상/크기. 문자열(⌘O, Ctrl+S, F2 등) 또는 JSX 자유롭게.
- 실제 단축키 **바인딩 책임은 사용자** (주변 앱에서 전역 keydown 으로 처리). 메뉴는 표시만.
- v1 후보 확장: `shortcut="Mod+S"` 문자열 prop 으로 OS 감지 포맷팅(⌘ vs Ctrl) — v1.1(§17).

### 9.3 Sub / SubTrigger / SubContent

- `Sub` 는 독립 상태. hover 지연 open/close (§5.4).
- `SubTrigger` 는 `Item` 형태지만 `aria-haspopup="menu"`, `aria-expanded`, 우측 `▸` indicator 포함. `Enter/Space/ArrowRight` 로 open.
- `SubContent` 는 `SubTrigger` rect 기준 포지셔닝 (§4.3).
- 서브메뉴 열릴 때 부모 `activeIndex` 는 그대로(SubTrigger 에 고정), SubContent 의 `activeIndex=0` 으로 시작.

### 9.4 disabled

- `Item.disabled=true` 이면 `aria-disabled="true"`, 포커스 안 받음, 클릭/Enter 무시, typeahead/arrow nav 에서도 skip, 시각적 dim.
- focusable 배열에서 제외되므로 `ArrowDown` 이 건너뛴다.

### 9.5 safe triangle hover-intent

§5.4 에서 상술. 구현 난이도는 중간(기하 판정 + timer coordination), 그러나 서브메뉴 UX 품질의 핵심. Radix 와 동일 접근.

### 9.6 danger item

- 관례적 `data-danger` attribute. CSS 에서 `.cm-item[data-danger]` 색상 (#dc2626 / #f87171). 사용자가 `<Item data-danger onSelect={trash}>Delete</Item>` 식으로 표시.
- 별도 prop 은 두지 않음 (attribute 로 충분, 커스텀 변형 여지 열어둠).

### 9.7 label

- `<Label>` 은 `role="presentation"` (메뉴 구조에서 제외). 스크린리더는 `<menu>` 의 `aria-label` 로 맥락을 받고 Label 은 시각적 section 구분 역할.
- 대안: `role="heading" aria-level="3"` — v1 은 presentation (VoiceOver 가 메뉴 항목으로 오해하지 않도록).

---

## 10. 파일 구조

```
src/components/ContextMenu/
├── ContextMenu.tsx                    # compound 조립 + namespace
├── ContextMenu.types.ts               # 공개 타입
├── ContextMenuRoot.tsx                # Root 상태머신
├── ContextMenuTrigger.tsx             # contextmenu/long-press/키보드 핸들러
├── ContextMenuContent.tsx             # 포털 + 포지셔닝 + 디스미스 + 포커스 트랩
├── ContextMenuItem.tsx                # Item (일반/disabled/danger)
├── ContextMenuCheckboxItem.tsx        # CheckboxItem
├── ContextMenuRadioGroup.tsx          # RadioGroup + context
├── ContextMenuRadioItem.tsx           # RadioItem
├── ContextMenuSub.tsx                 # Sub (상태만)
├── ContextMenuSubTrigger.tsx          # SubTrigger (item + haspopup)
├── ContextMenuSubContent.tsx          # SubContent (anchor 기준 포지셔닝)
├── ContextMenuSeparator.tsx           # Separator
├── ContextMenuLabel.tsx               # Label
├── ContextMenuShortcut.tsx            # Shortcut
├── ContextMenuContext.ts              # Root/Content/Sub/RadioGroup Context
├── useMenuNavigation.ts               # activeIndex + arrow/home/end/typeahead (공용)
├── useMenuDismisser.ts                # pointerdown/escape/blur/scroll/resize (공용)
├── useLongPress.ts                    # touch long-press (Trigger 전용)
├── useSafeTriangle.ts                 # pointer-safe triangle (Sub 전용)
├── portal.ts                          # getPortalNode() 싱글톤
├── geometry.ts                        # isInsideTriangle, clamp, flip 계산
├── theme.ts                           # contextMenuPalette
└── index.ts                           # 배럴
```

파일 책임:

- **ContextMenu.tsx** — namespace 조립. `export const ContextMenu = { Root, Trigger, Content, ... }`. 구현은 분할 파일들.
- **ContextMenuRoot.tsx** — open/position state, openMode, Context.Provider 설정. `children` 그대로 렌더 (Trigger/Content 는 자식으로).
- **ContextMenuTrigger.tsx** — `useTriggerHandlers` 로 이벤트 attach. `asChild` 이면 `cloneElement`, 아니면 `<span>` wrap.
- **ContextMenuContent.tsx** — 포털 마운트, 포지셔닝 `useLayoutEffect`, `useMenuDismisser`, `useMenuNavigation` 조립, Content Context.Provider.
- **ContextMenuItem.tsx** — 단일 item. `useMenuItem()` 훅으로 자신의 ref 를 Content Context 에 등록(descriptorsRef 에 push). onClick/키보드는 Content 수준의 `activeIndex` 를 본다.
- **ContextMenuCheckboxItem.tsx / RadioItem.tsx** — Item 재사용 + prefix slot + aria-checked. controlled state.
- **ContextMenuSub.tsx** — 독립 open state. Context.Provider.
- **ContextMenuSubTrigger.tsx** — Item + onMouseEnter → hover-open timer + ArrowRight → open. `useSafeTriangle` 결과를 구독해 hover-leave timer 연장/취소.
- **ContextMenuSubContent.tsx** — 포털 마운트 + anchor 기준 포지셔닝. 자체 `useMenuNavigation`. `ArrowLeft` / `Escape` 는 자기만 close.
- **portal.ts** — `document.body` 에 `[data-plastic-portal="context-menu"]` 노드 한 번만 생성. HMR/언마운트 고려해 reference count. Popover portal 과 **분리**.
- **geometry.ts** — `clampToViewport`, `flipHorizontal`, `flipVertical`, `isInsideTriangle`. 순수 함수.
- **theme.ts** — palette. CSS 변수 문자열 생성기 `buildThemeVars(theme)`.
- **useMenuNavigation.ts** — focusable 배열 구축(`descriptorsRef` + MutationObserver 대신 `useSyncExternalStore`/re-register 패턴), activeIndex 관리, `onKeyDown` (Arrow/Home/End/Enter/Space/typeahead) 반환. **ContextMenu 와 DropdownMenu 가 공유**(§16).
- **useMenuDismisser.ts** — document-level 리스너 attach/cleanup. 공유.
- **useLongPress.ts** — touch timer + tolerance. Trigger 전용이지만 장차 재사용 가능.
- **useSafeTriangle.ts** — Sub 전용이지만 로직 자체는 순수. `geometry.ts` 의 `isInsideTriangle` 에 얹은 ref state-machine.

### 10.1 공용 레이어 (DropdownMenu 와의 공유)

v1 본 PR 에서는 ContextMenu 디렉터리 내부에 모든 파일을 둔다. DropdownMenu 도입(§17) 시점에 아래와 같이 `_menu/` 공용 디렉터리로 추출할 것:

```
src/components/_menu/            # 장래
├── useMenuNavigation.ts
├── useMenuDismisser.ts
├── useSafeTriangle.ts
├── portal.ts
├── geometry.ts
├── theme.ts
├── Item.tsx, CheckboxItem.tsx, RadioGroup.tsx, RadioItem.tsx,
│   Sub.tsx, SubTrigger.tsx, SubContent.tsx, Separator.tsx,
│   Label.tsx, Shortcut.tsx     # 공용 subcomponent
```

v1 당시 추출하지 않는 이유는, 공용 레이어의 shape 는 두 번째 consumer (DropdownMenu) 가 존재할 때에야 정확히 판단 가능하기 때문(premature abstraction 회피). 대신 본 PR 에서 파일 분할을 "공용화 가능" 단위로 미리 끊어두어 추후 단순 이동만으로 추출되게 한다.

---

## 11. 구현 단계 (후속 agent 가 순차 실행)

각 단계 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과.

### Step 1 — 타입 + 배럴 + 테마 스켈레톤
1. `ContextMenu.types.ts` 전부 작성 (§2.1).
2. `theme.ts` — palette.
3. `geometry.ts` — `clamp`, `isInsideTriangle`, 좌표/직사각형 헬퍼.
4. `portal.ts` — singleton portal node.
5. `index.ts` 배럴.
6. `ContextMenu.tsx` placeholder namespace.
7. `src/components/index.ts` 에 추가.
8. 커밋: `feat(ContextMenu): 타입 + 테마 + 배럴`.

### Step 2 — Root + Trigger (열고 닫기만, Content 비어있음)
1. `ContextMenuContext.ts`, `ContextMenuRoot.tsx`.
2. `ContextMenuTrigger.tsx` — `contextmenu` 이벤트 처리(long-press/키보드는 나중). `asChild` 지원.
3. `ContextMenuContent.tsx` — 포털 + 고정 position (좌표 flip 은 없음). 단순 `<div role="menu">` 에 children.
4. dev-only smoke 테스트 페이지에서 "우클릭하면 박스 뜸" 확인.
5. 커밋: `feat(ContextMenu): Root/Trigger/Content 기본 오픈`.

### Step 3 — 포지셔닝 (viewport flip/shift + max-height)
1. `useLayoutEffect` 에서 rect 측정 + §4.2 알고리즘.
2. `opacity: 0 → 1` FOUC 방지.
3. 커밋: `feat(ContextMenu): viewport 기반 포지셔닝`.

### Step 4 — 디스미스 (외부 클릭/Escape/scroll/resize/blur)
1. `useMenuDismisser.ts`.
2. Content 에서 구독.
3. 커밋: `feat(ContextMenu): dismiss 리스너`.

### Step 5 — Item + Separator + Label + Shortcut
1. 각 컴포넌트 구현.
2. `useMenuItem()` 훅으로 descriptorsRef 등록.
3. onClick → `selectItem`.
4. 시각 스타일(palette 연결).
5. 커밋: `feat(ContextMenu): Item/Separator/Label/Shortcut`.

### Step 6 — 키보드 네비게이션 + typeahead + 포커스 트랩
1. `useMenuNavigation.ts`.
2. `ArrowUp/Down/Home/End`, `Enter/Space`, `Escape`, `Tab` preventDefault, typeahead 200 ms.
3. `openMode` 분기 (포인터 vs 키보드 첫 포커스).
4. activeIndex 변경 시 item DOM focus + `scrollIntoView({ block: "nearest" })`.
5. 커밋: `feat(ContextMenu): 키보드 네비 + typeahead + 포커스 트랩`.

### Step 7 — disabled + danger
1. `ContextMenuItem` `disabled` prop 반영 (aria-disabled, skip from focusable).
2. `data-danger` 시각 분기.
3. 커밋: `feat(ContextMenu): disabled + danger`.

### Step 8 — CheckboxItem / RadioGroup / RadioItem
1. prefix slot (✓ / ●), aria-checked.
2. RadioGroup Context.
3. controlled/uncontrolled.
4. 커밋: `feat(ContextMenu): checkbox + radio`.

### Step 9 — Sub / SubTrigger / SubContent + safe triangle
1. `ContextMenuSub` state + Context.
2. `SubTrigger` hover-open 150 ms + `ArrowRight` open.
3. `SubContent` anchor 기준 포지셔닝 (§4.3).
4. `useSafeTriangle` — hover-leave 시 대각 이동 감지.
5. `ArrowLeft` / `Escape` 로 서브 close.
6. 다중 depth 테스트 (3 depth).
7. 커밋: `feat(ContextMenu): submenu + safe triangle`.

### Step 10 — long-press (touch) + 키보드 오픈(Shift+F10, Menu 키)
1. `useLongPress.ts`.
2. Trigger 에 touchstart/move/end/cancel 핸들러.
3. `onKeyDown` 에서 Shift+F10 / ContextMenu 키 처리.
4. 터치 디바이스(Chrome DevTools device mode) 검증.
5. 커밋: `feat(ContextMenu): touch long-press + keyboard open`.

### Step 11 — controlled API + 프로그래매틱 오픈 + dev warn
1. `open`/`position` controlled 지원.
2. dev warn (controlled open=true 인데 position 없음, Trigger 없음 등).
3. 커밋: `feat(ContextMenu): controlled API`.

### Step 12 — Dark 테마
1. `contextMenuPalette.dark` 통합.
2. `Content theme="dark"` 전파.
3. 커밋: `feat(ContextMenu): dark 테마`.

### Step 13 — 데모 페이지
1. `demo/src/pages/ContextMenuPage.tsx` (§12).
2. `demo/src/App.tsx` NAV 추가.
3. 커밋: `feat(ContextMenu): 데모 페이지`.

### Step 14 — 마감
1. Props 표 + Usage 4 예시.
2. §20 DoD 전부 체크.
3. 커밋: `feat(ContextMenu): 데모 props 표 + usage`.

---

## 12. 데모 페이지

`demo/src/pages/ContextMenuPage.tsx`. 기존 페이지(CommandPalettePage, HexViewPage) 구조 복제. 섹션별 `<section id="...">` + 우측 사이드바 nav 연동.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "contextmenu", label: "ContextMenu", description: "우클릭 맥락 메뉴", sections: [
  { label: "Basic",                id: "basic" },
  { label: "Submenu",              id: "submenu" },
  { label: "Checkbox items",       id: "checkbox" },
  { label: "Radio group",          id: "radio" },
  { label: "Shortcuts",            id: "shortcuts" },
  { label: "Disabled / Danger",    id: "disabled" },
  { label: "Long-press (touch)",   id: "longpress" },
  { label: "Dark",                 id: "dark" },
  { label: "Programmatic open",    id: "programmatic" },
  { label: "Playground",           id: "playground" },
  { label: "Props",                id: "props" },
  { label: "Usage",                id: "usage" },
]},
```

`Page` 타입에 `"contextmenu"` 추가 + 하단 `{current === "contextmenu" && <ContextMenuPage />}`.

### 12.2 섹션 구성

**Basic**
```tsx
<ContextMenu.Root>
  <ContextMenu.Trigger asChild>
    <div className="w-80 h-32 border rounded grid place-items-center select-none">
      Right-click me
    </div>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onSelect={() => alert("Open")}>Open</ContextMenu.Item>
    <ContextMenu.Item onSelect={() => alert("Rename")}>Rename</ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item onSelect={() => alert("Delete")} data-danger>
      Delete
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
```

**Submenu** — 2 depth 예시.
```tsx
<ContextMenu.Root>
  <ContextMenu.Trigger asChild><Box>Right-click</Box></ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item>Open</ContextMenu.Item>
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger>Copy as…</ContextMenu.SubTrigger>
      <ContextMenu.SubContent>
        <ContextMenu.Item>Path</ContextMenu.Item>
        <ContextMenu.Item>Relative path</ContextMenu.Item>
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Content…</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            <ContextMenu.Item>As plain text</ContextMenu.Item>
            <ContextMenu.Item>As markdown</ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
      </ContextMenu.SubContent>
    </ContextMenu.Sub>
  </ContextMenu.Content>
</ContextMenu.Root>
```

**Checkbox items**
```tsx
const [wordWrap, setWordWrap] = useState(true);
const [minimap, setMinimap] = useState(false);
<ContextMenu.Content>
  <ContextMenu.CheckboxItem checked={wordWrap} onCheckedChange={setWordWrap}>
    Word Wrap
  </ContextMenu.CheckboxItem>
  <ContextMenu.CheckboxItem checked={minimap} onCheckedChange={setMinimap}>
    Minimap
  </ContextMenu.CheckboxItem>
</ContextMenu.Content>
```

**Radio group**
```tsx
const [theme, setTheme] = useState("system");
<ContextMenu.Content>
  <ContextMenu.Label>Appearance</ContextMenu.Label>
  <ContextMenu.RadioGroup value={theme} onValueChange={setTheme}>
    <ContextMenu.RadioItem value="light">Light</ContextMenu.RadioItem>
    <ContextMenu.RadioItem value="dark">Dark</ContextMenu.RadioItem>
    <ContextMenu.RadioItem value="system">System</ContextMenu.RadioItem>
  </ContextMenu.RadioGroup>
</ContextMenu.Content>
```

**Shortcuts**
```tsx
<ContextMenu.Content>
  <ContextMenu.Item>Cut <ContextMenu.Shortcut>⌘X</ContextMenu.Shortcut></ContextMenu.Item>
  <ContextMenu.Item>Copy <ContextMenu.Shortcut>⌘C</ContextMenu.Shortcut></ContextMenu.Item>
  <ContextMenu.Item>Paste <ContextMenu.Shortcut>⌘V</ContextMenu.Shortcut></ContextMenu.Item>
  <ContextMenu.Separator />
  <ContextMenu.Item>Select All <ContextMenu.Shortcut>⌘A</ContextMenu.Shortcut></ContextMenu.Item>
</ContextMenu.Content>
```

**Disabled / Danger**
```tsx
<ContextMenu.Content>
  <ContextMenu.Item>Open</ContextMenu.Item>
  <ContextMenu.Item disabled>Move to… (disabled)</ContextMenu.Item>
  <ContextMenu.Separator />
  <ContextMenu.Item data-danger>Delete</ContextMenu.Item>
</ContextMenu.Content>
```

**Long-press (touch)** — 설명 문구 + "이 박스를 550 ms 누르고 있으세요". Chrome DevTools device mode 를 열어 터치로 확인.

**Dark**
```tsx
<div style={{ background: "#0f172a", padding: 24, borderRadius: 8 }}>
  <ContextMenu.Root>
    <ContextMenu.Trigger asChild>
      <div className="w-80 h-32 border border-slate-700 rounded grid place-items-center text-slate-200">
        Right-click (dark)
      </div>
    </ContextMenu.Trigger>
    <ContextMenu.Content theme="dark">
      <ContextMenu.Item>Open</ContextMenu.Item>
      <ContextMenu.Item>Rename</ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item data-danger>Delete</ContextMenu.Item>
    </ContextMenu.Content>
  </ContextMenu.Root>
</div>
```

**Programmatic open**
```tsx
const [open, setOpen] = useState(false);
const [pos, setPos] = useState({x: 200, y: 200});
return (
  <div className="flex gap-2">
    <button onClick={(e) => { setPos({x: e.clientX, y: e.clientY}); setOpen(true); }}>
      Open at cursor
    </button>
    <button onClick={() => { setPos({x: 40, y: 40}); setOpen(true); }}>
      Open at (40, 40)
    </button>
    <ContextMenu.Root open={open} onOpenChange={setOpen} position={pos}>
      <ContextMenu.Trigger asChild><span /></ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item>Item A</ContextMenu.Item>
        <ContextMenu.Item>Item B</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  </div>
);
```

**Playground** — 상단 컨트롤 바:
- `theme` 토글 (light / dark)
- `disabled` 체크박스 (Root 레벨)
- `longPressMs` slider (0~2000)
- `minWidth` / `maxWidth` number input
- `danger flag` 체크박스 (마지막 아이템 danger 여부)
- "Add 20 items" / "Reset" 버튼 (긴 메뉴 테스트)
- submenu on/off 토글

아래에 큰 Trigger 박스 + 현재 설정을 반영한 `ContextMenu.Content`.

**Props 표** — `Root` / `Trigger` / `Content` / `Item` / `CheckboxItem` / `RadioGroup` / `RadioItem` / `Sub` / `SubTrigger` / `SubContent` / `Separator` / `Label` / `Shortcut` 각각 prop × 타입 × 기본값 × 설명.

**Usage (4개)**
1. 파일 매니저: open/rename/delete + 2 depth Copy as 서브메뉴.
2. 에디터: checkbox (word wrap, minimap) + radio (theme).
3. 테이블 셀 우클릭: dynamic items (선택된 셀 수에 따라 Copy/Paste 활성화 변경).
4. 프로그래매틱: 외부 버튼으로 특정 좌표에 열기.

**샘플 코드 — 파일 매니저**:
```tsx
function FileItem({ file }: { file: FileNode }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="file-row">{file.name}</div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>{file.name}</ContextMenu.Label>
        <ContextMenu.Separator />
        <ContextMenu.Item onSelect={() => open(file)}>
          Open <ContextMenu.Shortcut>Enter</ContextMenu.Shortcut>
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => rename(file)}>
          Rename <ContextMenu.Shortcut>F2</ContextMenu.Shortcut>
        </ContextMenu.Item>
        <ContextMenu.Sub>
          <ContextMenu.SubTrigger>Copy as…</ContextMenu.SubTrigger>
          <ContextMenu.SubContent>
            <ContextMenu.Item onSelect={() => copyPath(file, "abs")}>Absolute path</ContextMenu.Item>
            <ContextMenu.Item onSelect={() => copyPath(file, "rel")}>Relative path</ContextMenu.Item>
            <ContextMenu.Item onSelect={() => copyPath(file, "url")}>URL</ContextMenu.Item>
          </ContextMenu.SubContent>
        </ContextMenu.Sub>
        <ContextMenu.Separator />
        <ContextMenu.Item disabled>Move to…</ContextMenu.Item>
        <ContextMenu.Item onSelect={() => trash(file)} data-danger>
          Delete <ContextMenu.Shortcut>⌫</ContextMenu.Shortcut>
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
```

---

## 13. 검증 계획

### 13.1 자동화
```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

주의:
- `exactOptionalPropertyTypes: true` — optional prop 은 `?:` + default merge 분기 시 `undefined` 가능성 주의.
- `noUncheckedIndexedAccess: true` — `React.Children.toArray()[i]` 는 `ReactNode | undefined`. descriptor array indexing 시 가드 필수.
- `verbatimModuleSyntax: true` — 타입 import 는 `import type`.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic: 박스 위 우클릭 → 메뉴 오픈, 좌측 상단 기준 포인터 좌표. 외부 클릭/Escape 로 닫힘.
- [ ] 포인터 우측/하단 경계: 박스를 viewport 우하단에 배치 → 메뉴가 좌/상으로 flip.
- [ ] 극단 케이스: 박스가 viewport 경계에서 20 px → 메뉴가 경계 PAD=8 안에 정렬.
- [ ] 긴 메뉴: 40 개 Item 렌더 → 내부 스크롤, 키보드 ArrowDown 누를 때 스크롤 따라감.
- [ ] Submenu: `Copy as…` hover → 150 ms 후 오픈. `Copy as…` 에서 서브메뉴 아이템으로 "대각선" 이동 시 중간 형제 위를 스쳐도 부모가 닫히지 않음(safe triangle).
- [ ] Submenu 3 depth: 정상 오픈/닫기.
- [ ] 서브메뉴 우측 overflow: 부모 메뉴가 이미 우측 경계 근처면 서브가 좌측으로 flip.
- [ ] Checkbox: 클릭 → 토글 + 메뉴 닫힘. controlled 외부 state 도 동기화.
- [ ] Radio: 선택 → value 변경 + 닫힘. 같은 값 재선택도 동일.
- [ ] Shortcuts: 라벨 우측 정렬. tabular-nums 로 수직 정렬.
- [ ] Disabled: 포인터 hover 시 highlight 없음, 클릭 무효, ArrowDown 건너뜀.
- [ ] Danger: 색상 다름, 나머지 동작 일반 item 과 동일.
- [ ] Long-press: Chrome DevTools device mode 에서 터치로 550 ms → 메뉴 뜸. 8 px 이상 이동 시 취소.
- [ ] 키보드 오픈: Trigger 박스 tabindex=0 지정 후 포커스 → `Shift+F10` / `ContextMenu` 키 → 박스 좌하단에 메뉴 오픈, `activeIndex=0` 즉시 highlight.
- [ ] 키보드 네비: ArrowUp/Down wrap, Home/End, Enter/Space 선택, Escape 닫힘.
- [ ] Typeahead: "c" → "Copy as…" 로 이동. "co" → 동일. 200 ms 후 리셋.
- [ ] Tab: 메뉴 안에서 Tab 눌러도 포커스가 메뉴 밖으로 이탈하지 않음.
- [ ] 외부 dismiss: pointerdown / Escape / window blur / 페이지 스크롤 / resize 모두 닫힘.
- [ ] Dark 테마: 색상 전환, contrast 확보.
- [ ] Programmatic: 외부 버튼에서 setOpen + position 으로 오픈, onOpenChange 콜백 수신.
- [ ] 다른 페이지 리그레션 없음 (CommandPalette/Popover/DataTable 정상 동작).

### 13.3 엣지 케이스
- [ ] **viewport 4 모서리**: 박스를 4 corners (top-left, top-right, bottom-left, bottom-right) 에 배치하고 각각 우클릭 — 메뉴가 보이는 영역 안에 완전히 표시.
- [ ] **메뉴 > viewport**: 60 개 item 을 넣고 우클릭 → 내부 스크롤, top=PAD.
- [ ] **중첩 Trigger**: `<Root A><Trigger A><div><Root B><Trigger B><div /></Trigger></Root></div></Trigger></Root>` 형태. 내부 div 위에서 우클릭 → B 만 열림(stopPropagation).
- [ ] **disabled Root**: `<Root disabled>` → 우클릭 시 OS 기본 메뉴가 뜸(커스텀 안 뜸).
- [ ] **controlled open=true with no position**: dev warn + {x:0,y:0} fallback.
- [ ] **touchstart → touchmove(10px) → 550ms 경과**: 메뉴 뜨지 않음.
- [ ] **모바일 OS 기본 long-press selection 방해**: `touch-action: none` / `user-select: none` 으로 Trigger 의 텍스트 선택이 안 일어남.
- [ ] **iframe 내부 Trigger**: 메뉴가 iframe 내부에만 렌더(포털이 iframe document.body 에). 좌표 정상. (iframe 바깥으로 퍼지는 건 v1 제외.)
- [ ] **portal 재사용**: 여러 Root 인스턴스 공존 시 같은 portal 노드를 공유, 언마운트 시 ref count 가 0 이 되면 portal 제거.
- [ ] **hot-reload (Vite HMR)**: portal 노드 중복 생성 방지.
- [ ] **SSR / 초기 렌더**: `typeof window === "undefined"` 가드 — portal 생성 useEffect 에서만 시도.
- [ ] **drag 중 우클릭**: 드래그 중(pointerdown 유지)인 상태에서 contextmenu 이벤트는 자연스럽게 억제되는 브라우저 동작에 의존. 예외 시 콘솔 경고 없이 무시.
- [ ] **RadioGroup value 변경 속도**: 빠르게 여러 번 radio 클릭 → 각 클릭마다 onValueChange 호출, 마지막이 최종 상태.
- [ ] **submenu 가 부모와 다른 theme**: v1 은 부모 theme 을 상속(SubContent theme prop 있으면 override). 시각 일관성.
- [ ] **매우 낮은 viewport (vh < 200)**: 메뉴 max-height 잘림, 정상 스크롤.

---

## 14. 성능

### 14.1 목표
- 오픈 시 첫 페인트 < 16 ms (60 fps 프레임 안에 완료).
- 언마운트 시 < 4 ms.
- 60 Hz 포인터 이동 중 activeIndex 갱신 드롭프레임 없음.

### 14.2 병목 가설 + 완화
1. **포털 재생성 비용**: Root 가 여러 개 있으면 각각 portal 노드 생성할 경우 DOM thrash. 완화: `getPortalNode()` 싱글톤 + ref count (`incRef()/decRef()`).
2. **descriptorsRef 재구축**: children 이 변할 때마다 descriptor 배열을 재구축. React key 가 안정적이면 대부분 캐시 히트. 완화: 각 Item 의 `useLayoutEffect` 내에서 자신의 index 를 등록/해제하는 방식(mount/unmount 기준).
3. **mousemove 빈도(safe triangle)**: Content 전역 onMouseMoveCapture 는 SubContent 가 열려있을 때만 active. 닫혀있으면 리스너 attach 안 함.
4. **Context value 매 렌더**: Root 의 Context value 는 `useMemo` + dispatch-style (setOpen 은 ref 기반) 로 재사용. Content 의 activeIndex Context 는 별도 Provider 이므로 Root 리렌더가 Item 까지 내려가지 않도록 분리.
5. **포지셔닝 `getBoundingClientRect` 연속 호출**: useLayoutEffect 한 번만. ResizeObserver 는 연결하지 않음(스크롤/resize 가 오면 닫기 정책이므로 재계산 불필요).

### 14.3 측정 방법
- DevTools Performance 탭: 우클릭 1 회 기록 → paint 마커 확인.
- 1000 item 스트레스 테스트: 자체 성능 경고 트리거하는 dev 모드 `console.warn` 을 Content 가 마운트 시 descriptor 수 > 500 이면 1 회 출력.

---

## 15. 접근성

### 15.1 역할

- Content root: `role="menu"`, `aria-label` (기본 "Context menu", 사용자 override 가능), `tabindex="-1"`.
- SubContent: `role="menu"` + `aria-labelledby="{subTrigger id}"`.
- Item: `role="menuitem"`, `tabindex="-1"` (실제 포커스는 JS 로 이동), `aria-disabled="true"` 시 `tabindex` 제거.
- CheckboxItem: `role="menuitemcheckbox"` + `aria-checked`.
- RadioItem: `role="menuitemradio"` + `aria-checked`.
- RadioGroup wrapper: `role="group"` + 선택적 `aria-label`.
- SubTrigger: `role="menuitem"` + `aria-haspopup="menu"` + `aria-expanded={subOpen}`.
- Separator: `role="separator"` + `aria-orientation="horizontal"`.
- Label: `role="presentation"` (의미 없이 시각 구분). 대안: `aria-label` 을 Content 로 올리고 Label 은 presentation 유지 — 현재 방식.
- Shortcut: `role="presentation"` + `aria-hidden="true"` (스크린리더가 "⌘O" 같은 문자열을 메뉴명 뒤에 엉뚱하게 읽지 않도록). 대신 `textValue` 에 shortcut 설명을 포함하는 건 사용자 책임.

### 15.2 포커스 관리

- Content 오픈 → 직전 `document.activeElement` 저장.
- `openMode==="keyboard"` → activeIndex=0 item.focus().
- `openMode==="pointer"` → 포커스 이동 안함 (activeIndex=-1). 단 Content root 자체는 `tabindex=-1` 이므로 screen reader 는 메뉴 라벨 announce.
- Content 닫힘 → 저장된 이전 요소로 `focus()` 복원.
- 서브메뉴 오픈 → 부모의 activeIndex 는 SubTrigger 에 유지, 포커스는 SubContent 의 첫 item. 닫힘 시 SubTrigger 로 복귀.

### 15.3 라이브 리전 (불필요)

메뉴 상호작용은 focus 기반이므로 별도 `aria-live` 불필요.

### 15.4 터치 스크린 리더 (TalkBack/VoiceOver Touch)

- long-press 는 TalkBack/VoiceOver 의 제스처와 충돌 가능. 대부분 SR 은 double-tap-and-hold 가 long-press 를 emit 하므로 기본 동작 유지. 추가 핸들링 없음.

### 15.5 대비

- Light: text fg vs bg ≥ 7:1 (Gray 900 on white).
- Dark: Gray 200 on #1f2937 ≈ 11:1.
- disabled: contrast 최소 3:1 확보(`rgba(0,0,0,0.35)` = 4.5:1 대략).

---

## 16. 알려진 트레이드오프 · 결정

1. **DropdownMenu 와 공유 vs 분리**:
   - ContextMenu 와 DropdownMenu 의 내부 90% 는 동일(아이템 렌더, 키보드 네비, 서브메뉴, 디스미스). 차이는 "어떻게 여는가" 뿐.
   - 선택지 A: 처음부터 `_menu/` 공용 레이어로 분리하고 두 컴포넌트를 얇은 래퍼로 만든다.
   - 선택지 B (본 설계): v1 은 ContextMenu 단독으로 먼저 완성. 파일 분할은 공용 가능한 단위로 미리 끊어두고, DropdownMenu 도입 시 `_menu/` 로 **이동**만 한다.
   - A 는 depth-first 완전함, B 는 YAGNI/premature abstraction 회피. DropdownMenu 의 독자 요구(예: anchor element rect 계산, placement prop)가 Content 포지셔닝 API 를 어떻게 틀어놓을지 v1 단계에선 정확히 예측 어려우므로 B 선택.
2. **safe triangle 난이도**:
   - 순수 기하는 단순(삼각형 내부 판정 3줄). 어려운 부분은 "언제 `P0` 을 갱신하나" (hover-leave 순간 한 번만), "timer 리셋 규칙" (in-triangle 이동 감지 시 단발성 extend), "3 depth 이상의 chained submenu" 에서 각 Sub 의 safe triangle 이 독립적으로 동작하도록 state 분리.
   - v1 은 Sub 당 하나의 safe-triangle 세션만 유지(동시 여러 Sub 의 hover-leave 가 겹치는 경우 drop). 대부분 메뉴 트리에서 발생하지 않음.
3. **포지셔닝 라이브러리 미사용 (Floating UI 등)**:
   - Floating UI 를 쓰면 collision 로직이 세밀하지만 ~10 KB 추가. 본 케이스는 "포인터 좌표 flip" 이라는 단순 수식이면 충분.
   - v1 자체 구현. 복잡 요구(예: shift+arrow+flip+virtual padding) 생기면 후속에서 Floating UI 고려.
4. **portal 싱글톤 vs Root 별 개별**:
   - 싱글톤은 DOM 하나만 유지, z-index 충돌 단일 지점에서 관리. 단 cleanup 복잡(ref count).
   - 개별은 단순하나 페이지 당 Root 수만큼 `<div>` 가 body 하위에 깔린다.
   - v1 싱글톤. ref count 구현은 ~20 lines.
5. **아이템에 별도 icon prop 없음**:
   - `icon?: ReactNode` 는 가독성 좋지만 "shortcut 과 icon 을 각각 fixed slot" 으로 강제하면 커스터마이즈 감소. children 자유 + `Shortcut` 만 전용 컴포넌트로.
6. **Label 의 role=presentation vs heading**:
   - heading 은 스크린리더가 H3 로 읽어 section 구조를 선언. presentation 은 시각 label 로만 기능.
   - v1 은 presentation — 메뉴는 선형 구조가 맞고, heading 은 과도.
7. **typeahead prefix vs substring**:
   - prefix (startsWith) 선택. 일반 OS 메뉴 관례.
   - substring 은 검색 필드 메탈 모델이 강해 ContextMenu 본질(빠른 행동 선택)과 어긋남.
8. **controlled open 에서 Trigger 의미**:
   - 프로그래매틱 오픈 유스케이스에서 Trigger 는 사실상 no-op. compound 구조를 지키기 위해 현재는 필수.
   - 대안: `<ContextMenu.Root>` 안에 Trigger 없어도 허용 + position 만으로 열기. v1.1 리팩터링.
9. **Shortcut 의 실제 키 바인딩**:
   - 컴포넌트 책임 범위 밖. 앱 전역 keyboard handler 와 중복 구현을 피하기 위해 v1 은 표시만.
   - 단축키 바인딩 + 메뉴 표시 동기화가 필요한 상위 앱은 자체 mapping 테이블 유지.
10. **"우클릭 허용 Trigger" 영역의 시각 피드백**:
    - 일부 디자인 시스템은 Trigger 위에서 마우스 hover 시 우클릭 가능 hint(커서 변경 등) 를 준다.
    - plastic v1 은 일반 커서 유지. 사용자 측 CSS 로 자유롭게.

---

## 17. 후속 작업 (v1.1+)

- **DropdownMenu export**: `_menu/` 공용 레이어로 리팩터링 후 `src/components/DropdownMenu/` 를 얇은 래퍼로 구성하여 공개. 차이: `Trigger` 가 `<button>` 으로 변환, placement(start/center/end × above/below) 추가, anchor element rect 기반 포지셔닝.
- **MenuBar**: 상단 고정 메뉴 바(`File Edit View`). roving tabindex, 좌우 arrow 로 top-level 이동, 아래 arrow 로 드롭, 각 드롭이 DropdownMenu 재사용.
- **iframe 교차 좌표**: contextmenu 가 iframe 내부에서 발생 + 메뉴를 부모 문서에 띄우고 싶을 때 postMessage + 좌표 변환.
- **custom position API**: `position: { x, y } | "pointer"` + `align: "start" | "end"` + `offset: [x, y]`.
- **shortcut prop 포맷터**: `shortcut="Mod+S"` → OS 감지(Mac: ⌘S, Others: Ctrl+S) 자동 포맷. `kbd` 요소 렌더.
- **virtualized items**: 100+ 아이템에서 내부 스크롤만 있는 v1 은 충분하나, 500+ 에서 가상화 도입.
- **theme override API**: `contextMenuPalette` 를 runtime 에 커스텀 토큰으로 덮어쓰는 PlasticProvider 레벨 API.
- **keyboard key ContextMenu 미지원 키보드**: Menu 키 없는 키보드 대안(`Shift+F10` 만 통용).
- **실제 short-key 바인딩 helper**: `useMenuShortcuts({ "Mod+C": copy })` 로 trigger 외부 전역 키 리스너 제공(옵션).
- **press-drag-release 선택**: macOS 네이티브 스타일(드래그 중 release 로 선택).
- **CommandPalette 와 통합**: 메뉴 아이템이 많을 때 검색을 시작하면 CommandPalette 로 전환.
- **animation preset**: fade/scale enter/exit (80 ms). 현재는 순간 표시.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| portal + 포지셔닝 prior art | `/Users/neo/workspace/plastic/src/components/Popover/` |
| 키보드 네비 / roving index / typeahead prior art | `/Users/neo/workspace/plastic/src/components/CommandPalette/` |
| controlled/uncontrolled dual API | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| 데모 페이지 레이아웃 관례 | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |

Popover 로부터 얻을 레슨:
- `position: fixed` + `getBoundingClientRect` + `useLayoutEffect` 순서.
- portal 싱글톤 node 생성 패턴.
- Escape/outside-click cleanup 의 시점 일관성.

CommandPalette 로부터 얻을 레슨:
- activeIndex + ArrowUp/Down + typeahead 의 간결한 구현.
- `useEvent` (ref-backed stable callback) 패턴.
- `Enter/Space` 활성 시 preventDefault → close → 선택 콜백 순서.

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18.3 (기존) + DOM API (`createPortal`, `PointerEvent`, `TouchEvent`, `getBoundingClientRect`, `document`, `navigator.vibrate` (optional)) 만 사용.

번들 영향:
- ContextMenu 자체 예상 크기: ~5.5 KB (min), ~2 KB (min+gzip). 공용 레이어가 장차 DropdownMenu 에도 쓰이면 1 인당 비용은 낮아짐.
- plastic 전체 dist 에 미치는 영향 경미.

Browser 지원:
- `createPortal`: React 16+.
- `PointerEvent`: 모던 브라우저 전체.
- `TouchEvent`: iOS Safari/Android Chrome.
- `navigator.vibrate`: Android / 일부 데스크톱. 없으면 조용히 skip.
- `Shift+F10`, `ContextMenu` key: 키 이름은 `KeyboardEvent.key === "ContextMenu"` (Windows), `e.shiftKey && e.key === "F10"` 둘 다 처리.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/contextmenu` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 확인.
- [ ] §13.3 엣지 케이스 항목 전부 확인 또는 "v1 범위 밖" 사유 명시.
- [ ] Popover / CommandPalette / DataTable / PipelineGraph / 기타 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./ContextMenu";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 의존 없음).
- [ ] Props 문서 섹션이 13 개 subcomponent (Root/Trigger/Content/Item/CheckboxItem/RadioGroup/RadioItem/Sub/SubTrigger/SubContent/Separator/Label/Shortcut) 별 표로 채워져 있음.
- [ ] Usage 섹션에 최소 4 개 스니펫 (파일 매니저 / 에디터 / 테이블 셀 / 프로그래매틱).
- [ ] 데모 Playground 에서 모든 주요 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드 단독으로 오픈/네비/선택/닫기 전 과정 수행 가능.
- [ ] 터치(Chrome DevTools device mode) 에서 long-press 오픈 확인.
- [ ] VoiceOver/NVDA 에서 메뉴 라벨 + menuitem/checkbox/radio 상태 정상 발음.
- [ ] 1000 아이템 스트레스 케이스에서 dev 경고 1 회 출력 + 렌더/스크롤 이상 없음.
- [ ] portal 노드 singleton: 여러 Root 공존 시 body 하위 `[data-plastic-portal="context-menu"]` 가 1 개만 존재.
- [ ] 모든 cleanup 확인 (dismiss 리스너, timers, portal ref count). React StrictMode double-mount 에도 leak 없음.

---

**끝.**
