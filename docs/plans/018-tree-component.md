# Tree 컴포넌트 설계문서

## Context

plastic 라이브러리에 "계층적(재귀적) 트리를 렌더링하고 확장/축소/선택/체크를 관리하는" `Tree` 컴포넌트를 추가한다. 역할 비유: VSCode 의 Explorer(파일 트리), Chrome DevTools 의 JSON 패널, Figma 의 레이어 패널, Finder 의 column/tree 뷰, 조직도(Org chart). 헤드리스 스타일(시각 최소, 상호작용·상태·접근성 코어만 제공) + runtime-zero(DOM + React 만) + VSCode 급 품질(키보드·ARIA·성능) 기조로 구성한다.

참고 (prior art — UX 근거):
- **Ant Design `Tree`** — checkable, multiple, draggable, async loadData, showLine, virtual. 풍부한 prop 셋은 본 v1 의 주요 참조 모델.
- **react-arborist** — flatten + fixed-height virtual scroll + keyboard 일등시민. 성능·키보드 모델의 대표 구현.
- **rc-tree** (antd 내부) — `TreeNode` + key 기반 state (expandedKeys, selectedKeys, checkedKeys) + halfCheckedKeys. Set 기반 모델 원형.
- **Blueprint `Tree`** — `TreeNode<T>` 재귀 구조 + controlled props. TypeScript generic 타입 디자인 참조.
- **MUI `TreeView`** (x-tree-view) — ARIA tree pattern 준수. role=tree/treeitem/group 표준.
- **WAI-ARIA Authoring Practices — Tree View Pattern** — `role`, `aria-expanded`, `aria-selected`, `aria-level`, `aria-posinset`, `aria-setsize` 규약, typeahead 패턴.

본 레포 내부 참조 (읽어야 할 파일):
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 표준 훅. Set 값에도 그대로 사용 가능.
- `src/components/PipelineGraph/PipelineGraphCluster.tsx` — 계층 구조(cluster > node) 의 expand/collapse 상태를 Set 으로 관리하는 prior 구현. 재귀 flatten 과 expand 토글 패턴 참조.
- `src/components/DataTable/DataTableRow.tsx`, `DataTable.tsx` — 행 선택, 키보드 포커스 링, rowSelection Set 패턴. Tree 의 selection 구현에 동일 mental model 재사용.
- `src/components/DataTable/useVirtualList.ts` — flattened row 가상 스크롤 prior. v1.1 virtualization 도입 시 동일 훅을 재사용/이식.
- `src/components/CommandPalette/*` — typeahead(입력 기반 필터) 구현 및 ARIA focus 이동 패턴. Tree 의 typeahead 로직 참조.
- `src/components/index.ts` — 배럴 파일. `export * from "./Tree";` 한 줄 추가 지점.
- `demo/src/App.tsx` — NAV 추가 지점 + 사이드바 라우팅 패턴.
- `demo/src/pages/CommandPalettePage.tsx` — 최근 데모 페이지 구조 (Basic / Nested / Async / Controlled / Dark / Playground / Props / Usage). 본 문서 §12 가 동일 패턴을 따름.
- `tsconfig.json` — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` 제약 준수 필요.

---

## 0. TL;DR (한 페이지 요약)

```tsx
<Tree.Root
  data={data}                              // TreeNode<T>[] — 루트 배열
  defaultExpanded={new Set(["src"])}
  defaultSelected={new Set()}
  selectionMode="single"                   // "none" | "single" | "multiple"
  checkable                                 // checkbox 표시
  defaultChecked={new Set()}
  onExpandedChange={setExpanded}
  onSelectedChange={setSelected}
  onCheckedChange={setChecked}
  loadChildren={async (node) => fetchChildren(node.id)}
  theme="light"
  indent={16}
  renderNode={({ node, level, isExpanded, isSelected, isChecked }) => (
    <>
      <Tree.ExpandToggle />
      <span>{node.icon}</span>
      <Tree.Label>{node.label}</Tree.Label>
    </>
  )}
>
  {/* 또는 JSX 재귀로 직접 기술:
      <Tree.Node id="src" label="src">
        <Tree.Node id="src/index.ts" label="index.ts" />
      </Tree.Node>
  */}
</Tree.Root>
```

렌더 결과 (VSCode 파일 트리 개념):
```
▾ src
  ▸ components
  ▾ utils
      format.ts
      parse.ts
    index.ts
▸ public
  package.json
```

핵심 설계 원칙:
- **compound 컴포넌트**. `Tree.Root / Tree.Node / Tree.Label / Tree.Children / Tree.ExpandToggle` 다섯 요소로 Context 상태 공유. 데이터 기반(`data` prop) 과 JSX 기반(`Tree.Node` 재귀) 양쪽 모두 지원.
- **flatten-based 상태**. 트리 자체는 재귀 구조지만 상태는 `Set<id>` 3 개 (expanded / selected / checked) 로 평탄화 관리. VSCode · react-arborist 와 동일한 모델.
- **id 는 유일 키**. `TreeNode<T>.id: string` 은 트리 전체에서 유일해야 하며, 중복 시 dev throw. path(경로) 는 자동 유도.
- **controlled / uncontrolled 이중 API**. `expanded`/`defaultExpanded`, `selected`/`defaultSelected`, `checked`/`defaultChecked` 각 Set. `useControllable` 와 동일 계약.
- **headless-first 렌더**. 기본 스타일은 얇게 제공하되 `renderNode` 훅 또는 `Tree.Node` children 조합으로 아이콘·라벨·메뉴·뱃지 등 자유 커스터마이즈.
- **runtime 의존 zero**. React + DOM 만. virtualization/DnD 는 v1.1+ 로 미룸.
- **접근성 · 키보드 우선**. `role="tree" + treeitem + group`, `aria-expanded/selected/level/posinset/setsize`, Arrow/Home/End/Space/Enter/`*`/typeahead.
- **async lazy load**. `loadChildren(node)` 한 번만 호출, loading/error/cached 상태 유도.
- **v1 은 DOM 렌더(비가상화)**. 노드 수 ~500 까지 체감 60 fps 목표. 1k+ 은 v1.1 virtualization.
- **DnD 는 v1.1**. 본 v1 에서는 hook point(콜백 슬롯·데이터 모델 Set 기반 이동 함수) 만 확보하고 구현은 다음 마이너.

---

## 1. Goals / Non-goals

### Goals (v1)

1. 제네릭 `TreeNode<T>` 기반 계층 데이터 렌더 (재귀). `T` 는 사용자 payload.
2. 확장/축소 상태(Set<id>) controlled/uncontrolled. `defaultExpanded` 또는 `expanded`, `onExpandedChange`.
3. 선택 상태(Set<id>) 3 모드: `"none" | "single" | "multiple"`.
4. 체크박스 모드 (`checkable`): 체크 상태 Set + **indeterminate(부분 체크)** 자동 계산 + 부모/자식 cascade.
5. 비활성 노드 (`disabled: boolean` per node) — expand/selection/check 모두 무시.
6. 재귀 자식: 데이터 모드(`children?: TreeNode<T>[]`) 및 JSX 모드(`<Tree.Node>` 재귀) 양립.
7. 지연 로딩 (`loadChildren(node)`): 최초 expand 시점에 1회 호출, loading/error 상태 노출.
8. 키보드 네비게이션: ↑ ↓ (flatten 기준 prev/next), → (닫혀있으면 열기, 열려있으면 첫 자식으로), ← (열려있으면 닫기, 닫혀있으면 부모로), Home/End (처음/끝), Space (선택 토글 / 체크 토글), Enter (선택), `*` (현재 레벨 전체 확장), 문자열 typeahead.
9. custom node render: `renderNode` prop 또는 `Tree.Node` children 로 커스터마이즈. 기본 렌더는 `▸/▾ {label}`.
10. indent guide(얇은 세로선): prop 토글 (`showIndentGuides`).
11. 아이콘 슬롯: `TreeNode.icon?: React.ReactNode` 또는 `renderNode` 내에서 렌더.
12. Light / Dark 테마 (`theme="light" | "dark"`).
13. 완전한 ARIA: `role="tree" / "treeitem" / "group"`, `aria-expanded`, `aria-selected`, `aria-level`, `aria-posinset`, `aria-setsize`, `aria-checked="mixed"` (indeterminate).
14. 중복 id 감지: 전체 트리를 flatten 하면서 Set 으로 중복 체크. dev 에서 throw.
15. max depth 제약 (기본 32). 넘으면 dev warn + 렌더 중단.
16. "전체 펴기/접기" 유틸: `expandAll()`, `collapseAll()` ref API (`Tree.Root` forwardRef).
17. controlled expanded 가 아닐 때: mount 직후 `defaultExpanded` 에 포함된 id 만 열림. 이후 사용자 토글로 변경.

### Non-goals (v1 제외)

- **Virtualization (가상 스크롤)**: flatten 후 고정 높이 기반 virtual list 는 v1.1. v1 은 DOM 전체 렌더. 500 노드 기준 60 fps 을 목표로 설계.
- **Drag and Drop**: 노드 이동/복사 UX. v1.1 에서 `onMove(src, dst, position)` + drop indicator + `dragHandle` 로 도입.
- **멀티 루트(시각적 포레스트) 고급 API**: `data` prop 은 이미 배열이므로 멀티 루트 자체는 v1 지원. 다만 "각 루트 간 교차 선택 범위(shift-click 범위 선택)" 같은 고급 상호작용은 v1 단일 루트 가정으로 단순 구현.
- **트리 편집 (rename / add / delete)**: 셀 편집 UI. v1 범위 밖. 사용자가 외부에서 data 조작 후 재렌더하는 것은 언제나 가능.
- **필터/검색 내장 UI**: 검색 박스와 match highlighting. v1 은 매치 API (`filter?: (node) => boolean`) 만 데이터 레벨에서 지원, UI 는 사용자가.
- **드래그 rubber-band 범위 선택**: v1 은 클릭 + Shift+클릭 + Ctrl/Cmd+클릭 만.
- **애니메이션**: expand/collapse 의 height 애니메이션은 CSS transition 한 줄로만. 복잡한 stagger 애니메이션 아님.
- **무한 depth 스크롤 들여쓰기 자동 조정**: level \* indent 가 컨테이너 폭 초과 시 horizontal scroll 로 맡김. 자동 wrap 아님.
- **contextmenu**: 우클릭 메뉴 본체는 별도 Menu 컴포넌트(후속). v1 은 `onContextMenu` prop 만 forward.

---

## 2. 공개 API

### 2.1 타입 — `src/components/Tree/Tree.types.ts`

```ts
import type React from "react";

export type TreeTheme = "light" | "dark";

export type TreeSelectionMode = "none" | "single" | "multiple";

/**
 * 제네릭 트리 노드.
 * - id: 트리 내 전역 유일. 중복 시 dev throw.
 * - label: 기본 렌더 텍스트. renderNode 사용 시 무시 가능.
 * - children: 자식 배열. undefined = "unknown"(loadChildren 사용 가능). [] = "확실히 없음(leaf)".
 * - hasChildren: lazy load 일 때 children 이 undefined 여도 "확장 가능" 표시용. true/false 명시 가능.
 * - disabled: 해당 노드 및 하위 상호작용 차단.
 * - icon: 선택적 아이콘 슬롯.
 * - data: 사용자 payload (제네릭 T).
 */
export interface TreeNode<T = unknown> {
  id: string;
  label?: React.ReactNode;
  children?: TreeNode<T>[];
  hasChildren?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  data?: T;
}

export interface TreeRenderNodeArgs<T> {
  node: TreeNode<T>;
  level: number;        // 0-based
  path: string[];       // root → self 의 id 체인 (포함)
  isExpanded: boolean;
  isSelected: boolean;
  isChecked: boolean;
  isIndeterminate: boolean;
  isDisabled: boolean;
  isLoading: boolean;   // async 진행 중
  hasChildren: boolean; // 확장 가능 여부
  isFocused: boolean;   // 현재 키보드 포커스
}

export interface TreeRootProps<T = unknown> {
  /** 데이터 배열(루트). JSX 모드(`<Tree.Node>` 재귀)로 대체 가능. */
  data?: TreeNode<T>[];

  /** 확장된 id 집합. controlled. */
  expanded?: ReadonlySet<string>;
  defaultExpanded?: ReadonlySet<string>;
  onExpandedChange?: (next: ReadonlySet<string>) => void;

  /** 선택 모드. 기본 "none". */
  selectionMode?: TreeSelectionMode;
  /** 선택된 id 집합. */
  selected?: ReadonlySet<string>;
  defaultSelected?: ReadonlySet<string>;
  onSelectedChange?: (next: ReadonlySet<string>) => void;

  /** 체크박스 모드 활성. 기본 false. */
  checkable?: boolean;
  /** 체크된 id 집합. indeterminate 는 제외(자동 유도). */
  checked?: ReadonlySet<string>;
  defaultChecked?: ReadonlySet<string>;
  onCheckedChange?: (next: ReadonlySet<string>) => void;
  /**
   * 부모-자식 cascade 정책. 기본 "parent-child".
   * - "parent-child": 부모 체크 → 자식 전부 체크, 자식 전부 체크 → 부모 체크.
   * - "self":        cascade 없음 (독립 체크). indeterminate 도 계산 안 함.
   */
  checkCascade?: "parent-child" | "self";

  /** async 자식 로더. 최초 expand 시 1회 호출. */
  loadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>;

  /** 노드 렌더 커스터마이즈. 미지정 시 기본 렌더. */
  renderNode?: (args: TreeRenderNodeArgs<T>) => React.ReactNode;

  /** 들여쓰기 픽셀 (level * indent). 기본 16. */
  indent?: number;
  /** 얇은 세로 가이드 라인 표시. 기본 false. */
  showIndentGuides?: boolean;

  /** 최대 depth (재귀 안전장치). 기본 32. */
  maxDepth?: number;

  /** Light / Dark. 기본 "light". */
  theme?: TreeTheme;

  /** 전체 비활성. */
  disabled?: boolean;

  /** ARIA 라벨 (role=tree). 스크린리더용. */
  "aria-label"?: string;
  "aria-labelledby"?: string;

  /** 이벤트 */
  onNodeActivate?: (node: TreeNode<T>) => void;   // Enter 또는 더블클릭
  onNodeContextMenu?: (node: TreeNode<T>, e: React.MouseEvent) => void;

  /** 필터. true 리턴한 노드만 렌더. 부모는 매칭 자식이 있으면 유지. */
  filter?: (node: TreeNode<T>) => boolean;

  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;                      // JSX 모드
}

export interface TreeNodeProps {
  /** 전역 유일 id. */
  id: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  hasChildren?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** JSX 자식 (다시 Tree.Node 들). 없거나 [] 면 leaf. */
  children?: React.ReactNode;
}

export interface TreeLabelProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface TreeExpandToggleProps {
  className?: string;
  style?: React.CSSProperties;
  /** 커스텀 ▸/▾. 미지정 시 기본 텍스트 triangle. */
  collapsedIcon?: React.ReactNode;
  expandedIcon?: React.ReactNode;
  loadingIcon?: React.ReactNode;
  /** leaf 에서 공간 예약(alignment) 유지 여부. 기본 true. */
  reserveSpaceForLeaf?: boolean;
}

export interface TreeChildrenProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** forwardRef 로 노출되는 imperative API. */
export interface TreeRootHandle {
  expandAll(): void;
  collapseAll(): void;
  expandTo(id: string): void;   // id 의 모든 조상 확장
  focus(id?: string): void;     // 특정 노드 포커스 (미지정 시 첫 노드)
  getExpanded(): ReadonlySet<string>;
  getSelected(): ReadonlySet<string>;
  getChecked(): ReadonlySet<string>;
}
```

### 2.2 배럴

```ts
// src/components/Tree/index.ts
export { Tree } from "./Tree";
export type {
  TreeNode,
  TreeTheme,
  TreeSelectionMode,
  TreeRootProps,
  TreeNodeProps,
  TreeLabelProps,
  TreeExpandToggleProps,
  TreeChildrenProps,
  TreeRenderNodeArgs,
  TreeRootHandle,
} from "./Tree.types";
```

그리고 `src/components/index.ts` 에 `export * from "./Tree";` 한 줄 추가.

### 2.3 Compound namespace

```ts
// Tree.tsx
export const Tree = {
  Root: TreeRoot,            // forwardRef<TreeRootHandle>
  Node: TreeNode_,           // JSX 모드에서 사용자 사용
  Label: TreeLabel,
  Children: TreeChildren,    // JSX 모드에서 children 슬롯 명시
  ExpandToggle: TreeExpandToggle,
};
```

displayName: `"Tree.Root"`, `"Tree.Node"`, `"Tree.Label"`, `"Tree.Children"`, `"Tree.ExpandToggle"`.

### 2.4 사용 모드 2 가지

**(A) Data-driven (권장)** — 외부에서 `TreeNode<T>[]` 만들어 주입. renderNode 로 커스터마이즈.
```tsx
<Tree.Root data={fileTreeData} renderNode={({ node, isExpanded }) => ...} />
```

**(B) JSX-recursive** — 선언형 스크립트 인라인. 정적·적은 노드에 유리.
```tsx
<Tree.Root>
  <Tree.Node id="src" label="src">
    <Tree.Node id="src/index.ts" label="index.ts" />
  </Tree.Node>
  <Tree.Node id="public" label="public" />
</Tree.Root>
```
JSX 모드는 내부에서 children 을 순회해 `TreeNode<T>[]` 로 변환 후 동일 파이프라인에 투입.

---

## 3. 도메인 모델

### 3.1 id · path · depth

- `id: string` — 트리 전역 유일. 중복 시 dev throw `[Tree] duplicate id: "src/index.ts"` + 해당 노드 렌더 skip.
- `path: string[]` — root → self 의 id 체인. 예: `["src", "utils", "format.ts"]`. renderNode 에 전달. 내부 breadcrumb/선택 범위 계산 등 다용도.
- `level: number` — 0-based depth. root 노드는 `level=0`. JSX 모드에서도 중첩 깊이로 계산.
- `index.ts` 라는 label 이 여러 폴더에 있어도 id 만 다르면 문제 없음.

### 3.2 flatten

렌더 파이프라인은 항상 `flatten(data, expanded)` 으로 평탄화한 뒤 순차 렌더. 평탄화는 pre-order DFS.

```ts
interface FlatItem<T> {
  node: TreeNode<T>;
  level: number;
  path: string[];
  parentId: string | null;
  index: number;          // 부모 내 순서 (posinset)
  siblingCount: number;   // 부모의 자식 수 (setsize)
  isExpanded: boolean;
  hasChildren: boolean;
  isLeaf: boolean;
}

function flatten<T>(
  roots: TreeNode<T>[],
  expanded: ReadonlySet<string>,
  maxDepth: number,
  loadedChildren: Map<string, TreeNode<T>[]>,
): FlatItem<T>[] {
  const out: FlatItem<T>[] = [];
  const seen = new Set<string>();
  function walk(nodes: TreeNode<T>[], level: number, path: string[], parentId: string | null) {
    if (level >= maxDepth) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Tree] maxDepth(${maxDepth}) exceeded at ${parentId}`);
      }
      return;
    }
    nodes.forEach((node, i) => {
      if (seen.has(node.id)) {
        if (process.env.NODE_ENV !== "production") {
          throw new Error(`[Tree] duplicate id: "${node.id}"`);
        }
        return;
      }
      seen.add(node.id);
      const loaded = loadedChildren.get(node.id);
      const children = loaded ?? node.children;
      const hasChildren = node.hasChildren ?? (children != null && children.length > 0);
      const isLeaf = !hasChildren;
      const isExpanded = expanded.has(node.id);
      const nextPath = [...path, node.id];
      out.push({
        node, level, path: nextPath, parentId,
        index: i, siblingCount: nodes.length,
        isExpanded, hasChildren, isLeaf,
      });
      if (isExpanded && children && children.length > 0) {
        walk(children, level + 1, nextPath, node.id);
      }
    });
  }
  walk(roots, 0, [], null);
  return out;
}
```

`flatten` 은 `useMemo` 로 캐싱 (deps: `data`, `expanded`, `loadedChildren`, `maxDepth`).

### 3.3 indexByPath / nodeById

```ts
const nodeById = useMemo(() => {
  const m = new Map<string, TreeNode<T>>();
  function walk(ns: TreeNode<T>[]) {
    for (const n of ns) {
      m.set(n.id, n);
      if (n.children) walk(n.children);
    }
  }
  if (data) walk(data);
  // loadedChildren 에서 로드된 것도 등록
  loadedChildren.forEach((cs) => walk(cs));
  return m;
}, [data, loadedChildren]);
```

### 3.4 상태 Set

3 개 독립 Set, 각기 controlled/uncontrolled:

```ts
const [expanded, setExpanded] = useControllable<ReadonlySet<string>>(
  props.expanded, props.defaultExpanded ?? EMPTY_SET, props.onExpandedChange,
);
const [selected, setSelected] = useControllable<ReadonlySet<string>>(
  props.selected, props.defaultSelected ?? EMPTY_SET, props.onSelectedChange,
);
const [checked, setChecked] = useControllable<ReadonlySet<string>>(
  props.checked, props.defaultChecked ?? EMPTY_SET, props.onCheckedChange,
);
```

`EMPTY_SET = new Set<string>()` 는 모듈 상수 (매 렌더 새 Set 생성 회피).

Set 변경은 항상 **새 Set 생성 후 치환** (immutable). `setExpanded(new Set([...expanded, id]))`.

### 3.5 indeterminate 계산

`checkable + checkCascade === "parent-child"` 일 때:

```ts
interface CheckViewModel {
  checked: Set<string>;        // UI 상 "완전 체크"
  indeterminate: Set<string>;  // UI 상 "부분 체크"
}

function deriveCheckVM<T>(
  roots: TreeNode<T>[],
  rawChecked: ReadonlySet<string>,
  loadedChildren: Map<string, TreeNode<T>[]>,
): CheckViewModel {
  const checked = new Set<string>();
  const indeterminate = new Set<string>();

  function walk(node: TreeNode<T>): { fully: boolean; any: boolean } {
    const kids = loadedChildren.get(node.id) ?? node.children ?? [];
    if (kids.length === 0) {
      const on = rawChecked.has(node.id);
      if (on) checked.add(node.id);
      return { fully: on, any: on };
    }
    let allFully = true;
    let anyOn = false;
    for (const k of kids) {
      const r = walk(k);
      if (!r.fully) allFully = false;
      if (r.any) anyOn = true;
    }
    if (allFully) {
      checked.add(node.id);
      return { fully: true, any: true };
    }
    if (anyOn) {
      indeterminate.add(node.id);
      return { fully: false, any: true };
    }
    return { fully: false, any: false };
  }

  for (const r of roots) walk(r);
  return { checked, indeterminate };
}
```

사용자가 제공하는 `checked` Set 은 "leaf 체크 의도" 로 해석. 내부 렌더 시 위 함수로 부모 checked/indeterminate 를 **유도**. 체크박스 클릭 시:
- leaf: toggle raw.
- non-leaf: 모든 하위 leaf 를 대상으로 raw set 에서 추가/제거.

`checkCascade === "self"` 면 이 유도 없이 raw Set 그대로 사용(부모 체크는 자식과 독립).

### 3.6 async loadedChildren

```ts
const [loadedChildren, setLoadedChildren] = useState<Map<string, TreeNode<T>[]>>(new Map());
const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
const [errorById, setErrorById] = useState<Map<string, Error>>(new Map());
```

### 3.7 root Context

```ts
interface TreeContextValue<T = unknown> {
  // 데이터
  nodeById: Map<string, TreeNode<T>>;
  flatItems: FlatItem<T>[];
  // 상태
  expanded: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  checkedVM: CheckViewModel;
  loadingIds: ReadonlySet<string>;
  errorById: ReadonlyMap<string, Error>;
  focusedId: string | null;
  // 설정
  selectionMode: TreeSelectionMode;
  checkable: boolean;
  checkCascade: "parent-child" | "self";
  indent: number;
  showIndentGuides: boolean;
  disabled: boolean;
  theme: TreeTheme;
  renderNode: TreeRootProps<T>["renderNode"];
  // 액션
  toggleExpand(id: string): void;
  selectNode(id: string, modifiers: { shift: boolean; meta: boolean }): void;
  toggleCheck(id: string): void;
  setFocus(id: string | null): void;
  onActivate(id: string): void;
}

const TreeContext = createContext<TreeContextValue<any> | null>(null);
```

---

## 4. 시각 / 구조

### 4.1 DOM 구조

```html
<ul role="tree" aria-label="..." class="tr-root" data-theme="light">
  <li role="treeitem"
      aria-expanded="true"
      aria-selected="false"
      aria-level="1"
      aria-posinset="1"
      aria-setsize="3"
      tabindex="0"
      data-id="src"
      class="tr-item"
      style="--tr-level: 0">
    <div class="tr-row">
      <!-- indent 가이드 (level 개수 만큼) -->
      <span class="tr-indent" aria-hidden="true" />
      <button class="tr-toggle" aria-hidden="true">▾</button>
      <span class="tr-icon">📁</span>
      <span class="tr-label">src</span>
    </div>
    <ul role="group">
      <li role="treeitem" aria-level="2" ...>...</li>
    </ul>
  </li>
</ul>
```

`<ul><li>` 의미론 + role 로 ARIA Tree 패턴 준수.

**단일 tabindex**: 전체 tree 에서 한 번에 한 노드만 `tabindex="0"`, 나머지는 `tabindex="-1"`. focus 이동 시 동적 업데이트. (roving tabindex)

### 4.2 indent + guide

```css
.tr-item {
  padding-inline-start: calc(var(--tr-level) * var(--tr-indent, 16px));
  position: relative;
}
.tr-row {
  display: flex; align-items: center; gap: 6px;
  min-height: 24px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: default;
}
.tr-row:hover     { background: var(--tr-row-hover); }
.tr-item[aria-selected="true"] > .tr-row { background: var(--tr-row-selected); }
.tr-item[data-focused="true"]  > .tr-row { outline: 2px solid var(--tr-focus); outline-offset: -2px; }
.tr-item[aria-disabled="true"] > .tr-row { opacity: 0.5; pointer-events: none; }

.tr-root[data-indent-guides="true"] .tr-item::before {
  content: ""; position: absolute;
  left: calc(var(--tr-level) * var(--tr-indent, 16px) + 8px);
  top: 0; bottom: 0; width: 1px;
  background: var(--tr-guide);
}
```

### 4.3 toggle 아이콘

- 기본 collapsed: `▸` (U+25B8)
- 기본 expanded: `▾` (U+25BE)
- loading: 작은 스피너 (CSS 애니메이션 `@keyframes tr-spin`) 또는 `…` fallback.
- leaf: reserveSpaceForLeaf=true (기본) 시 같은 폭의 invisible span 으로 alignment 유지.

크기: 12×12 (사각형 hit area 는 24×24 로 확장 via padding).

### 4.4 palette 토큰

```ts
// Tree/theme.ts
export const treePalette = {
  light: {
    rowHover:        "rgba(0,0,0,0.04)",
    rowSelected:     "rgba(37,99,235,0.10)",
    rowSelectedText: "#1d4ed8",
    textPrimary:     "#111827",
    textSecondary:   "#6b7280",
    focus:           "#2563eb",
    guide:           "rgba(0,0,0,0.10)",
    toggleFg:        "#6b7280",
    checkboxBorder:  "rgba(0,0,0,0.25)",
    checkboxChecked: "#2563eb",
    disabledFg:      "rgba(0,0,0,0.40)",
    loadingFg:       "#9ca3af",
    errorFg:         "#dc2626",
  },
  dark: {
    rowHover:        "rgba(255,255,255,0.06)",
    rowSelected:     "rgba(96,165,250,0.18)",
    rowSelectedText: "#bfdbfe",
    textPrimary:     "#e5e7eb",
    textSecondary:   "#9ca3af",
    focus:           "#60a5fa",
    guide:           "rgba(255,255,255,0.10)",
    toggleFg:        "#9ca3af",
    checkboxBorder:  "rgba(255,255,255,0.25)",
    checkboxChecked: "#60a5fa",
    disabledFg:      "rgba(255,255,255,0.40)",
    loadingFg:       "#6b7280",
    errorFg:         "#f87171",
  },
} as const;
```

### 4.5 기본 renderNode

```tsx
function defaultRenderNode<T>(args: TreeRenderNodeArgs<T>) {
  return (
    <>
      <Tree.ExpandToggle />
      {args.node.icon && <span className="tr-icon">{args.node.icon}</span>}
      {/* checkable 일 때 내부에서 체크박스 자동 삽입 — Root 레벨 책임이므로
          여기서는 생략하거나 context 에서 checkable 시 checkbox 노드 반환 */}
      <Tree.Label>{args.node.label}</Tree.Label>
    </>
  );
}
```

checkable 인 경우 Root 가 renderNode 호출 직후 checkbox 를 앞에 붙여주는 방식(§5.7).

---

## 5. 핵심 로직

### 5.1 JSX → data 변환

JSX 모드에서 `Tree.Root` 의 children (`<Tree.Node>...</Tree.Node>`) 을 순회하여 `TreeNode<T>[]` 로 변환.

```ts
function jsxToData(children: React.ReactNode, level = 0, maxDepth = 32): TreeNode<unknown>[] {
  const arr: TreeNode<unknown>[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if ((child.type as any).displayName !== "Tree.Node") return;
    const props = child.props as TreeNodeProps;
    if (level >= maxDepth) return;
    const kids = jsxToData(props.children, level + 1, maxDepth);
    arr.push({
      id: props.id,
      label: props.label,
      icon: props.icon,
      disabled: props.disabled,
      hasChildren: props.hasChildren ?? kids.length > 0,
      children: kids.length > 0 ? kids : undefined,
    });
  });
  return arr;
}
```

`data` prop 이 있으면 data 우선, 없으면 JSX 변환 결과 사용. 둘 다 있으면 dev warn + data 사용.

### 5.2 toggleExpand

```ts
function toggleExpand(id: string) {
  const node = nodeById.get(id);
  if (!node || node.disabled) return;

  const isOpen = expanded.has(id);
  if (isOpen) {
    const next = new Set(expanded);
    next.delete(id);
    setExpanded(next);
    return;
  }

  // 열기 — async load 필요 여부
  const kids = loadedChildren.get(id) ?? node.children;
  const needsLoad =
    loadChildren != null &&
    kids == null &&
    (node.hasChildren === true || kids == null);

  if (needsLoad && !loadingIds.has(id) && !loadedChildren.has(id)) {
    setLoadingIds((s) => new Set(s).add(id));
    loadChildren(node).then(
      (result) => {
        setLoadedChildren((m) => {
          const next = new Map(m);
          next.set(id, result);
          return next;
        });
        setLoadingIds((s) => {
          const n = new Set(s); n.delete(id); return n;
        });
        setExpanded((e) => new Set(e).add(id));
      },
      (err: Error) => {
        setErrorById((m) => {
          const n = new Map(m); n.set(id, err); return n;
        });
        setLoadingIds((s) => {
          const n = new Set(s); n.delete(id); return n;
        });
      },
    );
    return;
  }

  setExpanded(new Set(expanded).add(id));
}
```

> `loadChildren` 호출은 "한 번만" 이 원칙. 이미 `loadedChildren.has(id)` 면 재호출 금지. 재시도는 사용자가 외부에서 명시(예: `treeRef.current?.collapse(id)` 후 재expand, 또는 future API `reload(id)`).

### 5.3 expandAll / collapseAll

```ts
function expandAll() {
  const all = new Set<string>();
  flatItems.forEach((it) => {
    if (it.hasChildren) all.add(it.node.id);
  });
  setExpanded(all);
}
function collapseAll() {
  setExpanded(new Set());
}
function expandTo(id: string) {
  const path = findPath(data ?? jsxData, id);  // root → id
  if (!path) return;
  const next = new Set(expanded);
  path.slice(0, -1).forEach((p) => next.add(p));
  setExpanded(next);
}
```

### 5.4 selection

```ts
function selectNode(id: string, mods: { shift: boolean; meta: boolean }) {
  const node = nodeById.get(id);
  if (!node || node.disabled) return;
  if (selectionMode === "none") return;
  if (selectionMode === "single") {
    setSelected(new Set([id]));
    return;
  }
  // multiple
  if (mods.meta) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
    return;
  }
  if (mods.shift && lastAnchorIdRef.current) {
    // flatten 기준 anchor..id 구간 선택
    const flat = flatItems.map((it) => it.node.id);
    const a = flat.indexOf(lastAnchorIdRef.current);
    const b = flat.indexOf(id);
    if (a < 0 || b < 0) { setSelected(new Set([id])); return; }
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    setSelected(new Set(flat.slice(lo, hi + 1)));
    return;
  }
  lastAnchorIdRef.current = id;
  setSelected(new Set([id]));
}
```

### 5.5 checkbox toggle (parent-child cascade)

```ts
function toggleCheck(id: string) {
  const node = nodeById.get(id);
  if (!node || node.disabled) return;
  const descendantLeaves = collectLeafIds(node);
  const isFullyOn = descendantLeaves.every((lid) => checked.has(lid));
  const next = new Set(checked);
  if (isFullyOn) {
    descendantLeaves.forEach((lid) => next.delete(lid));
  } else {
    descendantLeaves.forEach((lid) => next.add(lid));
  }
  setChecked(next);
}

function collectLeafIds(node: TreeNode<T>): string[] {
  const kids = loadedChildren.get(node.id) ?? node.children ?? [];
  if (kids.length === 0) return [node.id];
  const out: string[] = [];
  for (const k of kids) out.push(...collectLeafIds(k));
  return out;
}
```

`checkCascade === "self"` 일 때는 위 대신 단순 toggle:
```ts
const next = new Set(checked);
if (next.has(id)) next.delete(id); else next.add(id);
setChecked(next);
```

### 5.6 focused node (roving tabindex)

```ts
const [focusedId, setFocusedId] = useState<string | null>(null);

useEffect(() => {
  if (focusedId == null && flatItems.length > 0) {
    setFocusedId(flatItems[0]!.node.id);
  }
}, [flatItems, focusedId]);
```

컨테이너 focus 시 focusedId 노드의 DOM 에 `focus()` 호출. row 클릭 시 focusedId 업데이트.

### 5.7 row 렌더

```tsx
function TreeRow({ item }: { item: FlatItem<T> }) {
  const ctx = useTreeContext();
  const { node, level, path, isExpanded, hasChildren } = item;
  const isSelected = ctx.selected.has(node.id);
  const isChecked = ctx.checkedVM.checked.has(node.id);
  const isIndeterminate = ctx.checkedVM.indeterminate.has(node.id);
  const isFocused = ctx.focusedId === node.id;
  const isDisabled = !!node.disabled || ctx.disabled;
  const isLoading = ctx.loadingIds.has(node.id);
  const err = ctx.errorById.get(node.id);

  const content = (ctx.renderNode ?? defaultRenderNode)({
    node, level, path, isExpanded, isSelected, isChecked,
    isIndeterminate, isDisabled, isLoading, hasChildren, isFocused,
  });

  return (
    <li role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={ctx.selectionMode !== "none" ? isSelected : undefined}
        aria-checked={ctx.checkable ? (isIndeterminate ? "mixed" : isChecked) : undefined}
        aria-level={level + 1}
        aria-posinset={item.index + 1}
        aria-setsize={item.siblingCount}
        aria-disabled={isDisabled || undefined}
        tabIndex={isFocused ? 0 : -1}
        data-id={node.id}
        data-focused={isFocused || undefined}
        class="tr-item"
        style={{ "--tr-level": level } as React.CSSProperties}
        onClick={(e) => ctx.selectNode(node.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey })}
        onDoubleClick={() => ctx.onActivate(node.id)}
    >
      <div class="tr-row">
        {ctx.checkable && !isDisabled && (
          <input type="checkbox"
                 checked={isChecked}
                 ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                 onChange={() => ctx.toggleCheck(node.id)}
                 onClick={(e) => e.stopPropagation()}
                 aria-label={`Check ${node.id}`} />
        )}
        {content}
        {err && <span class="tr-error" title={err.message}>!</span>}
      </div>
      {isExpanded && hasChildren && (
        <ul role="group">
          {/* 자식 row 들은 flatItems 가 이미 펼친 상태로 상위에서 렌더되므로
              실제로는 Root 에서 하나의 flat 리스트로 렌더하는 방법도 가능.
              하지만 ARIA 의 계층 구조를 살리기 위해 재귀 렌더를 권장. */}
        </ul>
      )}
    </li>
  );
}
```

> 설계 결정: ARIA `role="tree"` 의 DOM 구조는 `ul > li > ul > li` 계층이어야 스크린리더가 올바르게 계층을 읽는다. 따라서 **v1 은 재귀 JSX 렌더**(flat list 아님). flatten 배열은 "어느 id 가 현재 보여야 하는지" 계산 + 키보드 탐색용으로만 사용하고, 실제 render 는 데이터 재귀. v1.1 virtualization 도입 시 flat list 로 전환하면서 `aria-owns`/`aria-level` 로 계층을 보조한다 (복잡도 ↑, 별도 설계).

---

## 6. 제약

### 6.1 중복 id

flatten 도중 `Set<string>` 으로 감지. 중복 발견 시 development (`process.env.NODE_ENV !== "production"`) 에서 **throw**:
```
[Tree] duplicate id: "src/index.ts"
```
production 빌드에서는 첫 번째 노드만 채택, 중복 노드는 skip (crash 회피).

### 6.2 maxDepth

기본 32. `prop maxDepth` 로 조절 가능. 초과 시:
- development: `console.warn("[Tree] maxDepth(32) exceeded at ...")`
- 더 이상 재귀 안 함 (해당 서브트리 leaf 처리).
- 사용자가 명시적으로 큰 값 주면 책임 이전.

### 6.3 빈 children 의 의미

- `children: undefined` — "아직 모른다". `loadChildren` 있으면 async load 가능, toggle 아이콘 보임.
- `children: []` — "확실히 없다". leaf 처리, toggle 아이콘 숨김 (reserveSpace 는 유지).
- `hasChildren: true` + `children: undefined` — "있을 텐데 로드 전". 가장 흔한 lazy load 패턴.
- `hasChildren: false` — "없음" 명시 (children 유무 무시).

### 6.4 filter 적용 시

`filter` prop 이 있으면 flatten 도중 매칭 여부 계산:
- leaf: `filter(node)` true 면 표시.
- 내부 노드: `filter(node)` true **or** 하위 중 하나라도 매칭되면 표시.
- 매칭된 내부 노드는 자동 expand (filter 활성 시 한정).

### 6.5 controlled checked + loadChildren

async 로드 전 자식 id 를 외부에서 미리 알 수 없으므로, 부모 체크 시 "현재 시점에 아는 leaf 만" 업데이트. 이후 자식 로드되면 indeterminate 로 표시되는 위험 존재 — 문서화.

---

## 7. 키보드

root `ul` 에 `onKeyDown` 핸들러. focusedId 기준 동작.

| 키 | 동작 |
|---|---|
| `ArrowDown` | flatten 기준 다음 표시 노드로 이동. 마지막이면 유지. |
| `ArrowUp` | 이전 표시 노드로 이동. 처음이면 유지. |
| `ArrowRight` | (hasChildren && !expanded) → expand. (expanded) → 첫 자식으로 이동. leaf → noop. |
| `ArrowLeft` | (expanded) → collapse. (collapsed 또는 leaf) → 부모로 이동. 루트 노드면 유지. |
| `Home` | 첫 번째 표시 노드로 이동. |
| `End` | 마지막 표시 노드로 이동. |
| `Enter` | onActivate 호출. selectionMode!=="none" 이면 함께 select. |
| `Space` | selectionMode!=="none" 이면 toggle select (multi 에선 meta 처럼). checkable 이면 toggle check (우선). |
| `*` | 현재 포커스 노드와 **같은 레벨 형제 전체** expand (VSCode 관례). |
| `a..z / 0..9` | typeahead: 입력 문자열로 시작하는 다음 노드로 포커스. 300 ms 무입력 시 buffer reset. |
| `Escape` | typeahead buffer reset + focus 는 유지. |
| `Tab` | 트리 밖으로 빠져나감 (roving tabindex 이므로 자연스럽게). |

```ts
function onRootKeyDown(e: React.KeyboardEvent) {
  if (disabled) return;
  const idx = flatItems.findIndex((it) => it.node.id === focusedId);
  if (idx < 0) return;
  const cur = flatItems[idx]!;

  const moveTo = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(flatItems.length - 1, nextIdx));
    setFocusedId(flatItems[clamped]!.node.id);
    focusDom(flatItems[clamped]!.node.id);
  };

  switch (e.key) {
    case "ArrowDown":  e.preventDefault(); moveTo(idx + 1); return;
    case "ArrowUp":    e.preventDefault(); moveTo(idx - 1); return;
    case "Home":       e.preventDefault(); moveTo(0); return;
    case "End":        e.preventDefault(); moveTo(flatItems.length - 1); return;
    case "ArrowRight":
      e.preventDefault();
      if (cur.hasChildren && !cur.isExpanded) { toggleExpand(cur.node.id); return; }
      if (cur.isExpanded) { moveTo(idx + 1); return; }
      return;
    case "ArrowLeft":
      e.preventDefault();
      if (cur.isExpanded) { toggleExpand(cur.node.id); return; }
      if (cur.parentId) {
        const pIdx = flatItems.findIndex((it) => it.node.id === cur.parentId);
        if (pIdx >= 0) moveTo(pIdx);
      }
      return;
    case "Enter":
      e.preventDefault();
      if (selectionMode !== "none") selectNode(cur.node.id, { shift: e.shiftKey, meta: e.metaKey || e.ctrlKey });
      onActivate(cur.node.id);
      return;
    case " ":
      e.preventDefault();
      if (checkable) { toggleCheck(cur.node.id); return; }
      if (selectionMode === "multiple") selectNode(cur.node.id, { shift: false, meta: true });
      else if (selectionMode === "single") selectNode(cur.node.id, { shift: false, meta: false });
      return;
    case "*":
      e.preventDefault();
      expandSiblings(cur);
      return;
    case "Escape":
      typeaheadBufferRef.current = "";
      return;
    default:
      if (e.key.length === 1 && /\S/.test(e.key)) {
        e.preventDefault();
        typeahead(e.key, idx);
      }
  }
}
```

### 7.1 typeahead

```ts
const typeaheadBufferRef = useRef("");
const typeaheadTimerRef = useRef<number | null>(null);
function typeahead(ch: string, fromIdx: number) {
  typeaheadBufferRef.current += ch.toLowerCase();
  if (typeaheadTimerRef.current) window.clearTimeout(typeaheadTimerRef.current);
  typeaheadTimerRef.current = window.setTimeout(() => {
    typeaheadBufferRef.current = "";
  }, 500);
  const buf = typeaheadBufferRef.current;
  const n = flatItems.length;
  for (let i = 1; i <= n; i++) {
    const probe = flatItems[(fromIdx + i) % n]!;
    const label = typeof probe.node.label === "string" ? probe.node.label : probe.node.id;
    if (label.toLowerCase().startsWith(buf)) {
      setFocusedId(probe.node.id);
      focusDom(probe.node.id);
      return;
    }
  }
}
```

### 7.2 expandSiblings (VSCode `*`)

```ts
function expandSiblings(cur: FlatItem<T>) {
  const siblings = flatItems.filter((it) => it.parentId === cur.parentId && it.hasChildren);
  const next = new Set(expanded);
  siblings.forEach((s) => next.add(s.node.id));
  setExpanded(next);
}
```

---

## 8. 상태 관리 (controlled / uncontrolled)

### 8.1 useControllable 적용

3 개 독립 축 (expanded, selected, checked) 각기 `useControllable<ReadonlySet<string>>` 사용. 기존 훅은 "값 그대로 동기화" 계약이며, Set 타입도 그대로 쓸 수 있다 (참조 비교라 새 Set 을 매번 만들어 치환해야 onChange 가 rebroadcast 됨 — 문서화).

```ts
const [expanded, setExpanded] = useControllable(
  props.expanded, props.defaultExpanded ?? EMPTY_SET, props.onExpandedChange,
);
```

### 8.2 controlled 규칙

- controlled 상태(예: `props.expanded !== undefined`) 에서는 사용자가 `onExpandedChange` 에 응답해 외부 state 를 갱신해야 변화 반영. 외부에서 응답 없으면 토글이 적용되지 않는 것으로 보인다 (React controlled 관례).
- `defaultExpanded` / `defaultSelected` / `defaultChecked` 는 mount 이후 변경해도 무시 (표준 uncontrolled 관례).

### 8.3 Set identity 주의

`new Set(expanded)` 처럼 매번 새 Set 반환 — 외부에서 `useState<ReadonlySet<string>>` 으로 받아 그대로 pass 하면 안정적. 부모가 매 렌더 `new Set(...)` 을 만들면 Tree 가 flatten 재계산 → 성능 이슈. `useMemo` 권장 안내를 Usage 섹션에 명시.

### 8.4 loadedChildren / loading / error

이 3 가지는 **항상 internal state**. controlled API 없음. 이유:
- async 호출 시점/결과는 컴포넌트 본인이 가장 잘 안다.
- 외부에서 "재시도" 또는 "강제 리로드" 하려면 향후 `treeRef.current?.reload(id)` imperative API 로 해결 (v1.1+).

v1 에서 외부가 꼭 필요하면 `loadChildren` 을 사용자 state 와 얽어 `setXxx` 호출 후 다음 렌더에 반영하는 패턴 문서화.

---

## 9. Async load

### 9.1 계약

```ts
loadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>;
```

- 반환값은 `TreeNode<T>[]` (children). 빈 배열이면 "확인했는데 자식 없음" 으로 저장, 이후 toggle 시 다시 호출하지 않음.
- reject 되면 `errorById` 에 저장, 행 옆에 `!` 표시 + title 에 메시지. 재시도는 사용자가 페이지 refresh 또는 (v1.1) `treeRef.reload(id)`.

### 9.2 라이프사이클

```
click toggle (collapsed, needs load)
 → loadingIds.add(id)
 → loadChildren(node)
    ├─ resolved  → loadedChildren.set(id, kids); loadingIds.delete(id); expanded.add(id)
    └─ rejected  → errorById.set(id, err);      loadingIds.delete(id); (expanded 변화 없음)
```

### 9.3 취소 (cancel)

v1 은 AbortController 내장 없음. 사용자가 `loadChildren` 내부에서 own Promise 관리. 컴포넌트 unmount / 동일 id 재호출 방지만 담당:
```ts
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);
// then 콜백에서 if (!mountedRef.current) return;
```

§13.3 에 "unmount 중 resolve 했을 때 setState 경고 없음" 검증 항목 추가.

### 9.4 에러 표시

행 우측에 빨간 `!` 표시, `title=err.message`. renderNode 사용자는 `args.node` 와 `ctx.errorById` 에 접근해 맞춤 표시 가능 (renderNode 인자에 포함되어 있지 않으므로, 필요 시 Context hook `useTreeNodeState(id)` 제공 예정 — v1 에서는 단순화 위해 error 도 renderNode args 에 추가):

```ts
// v1 최종: renderNode args 에 error?: Error 추가
export interface TreeRenderNodeArgs<T> {
  // ...기존
  error?: Error;
}
```

---

## 10. 파일 구조

```
src/components/Tree/
├── Tree.tsx                 # Root + Node + Label + Children + ExpandToggle + context 조립
├── Tree.types.ts            # 공개 타입
├── Tree.utils.ts            # flatten, jsxToData, deriveCheckVM, collectLeafIds, findPath
├── TreeContext.ts           # Context + useTreeContext
├── useTreeKeyboard.ts       # keydown 핸들러 + typeahead
├── useTreeAsync.ts          # loadedChildren / loadingIds / errorById 상태 + loader
├── theme.ts                 # treePalette
├── tree.css (or inline)     # 기본 스타일 (인라인 style 로 병합 권장)
└── index.ts                 # 배럴
```

각 파일 책임:

- **Tree.tsx**
  - `TreeRoot` (forwardRef) — data/JSX 양립, useControllable 3 축, flatten memo, Context provide.
  - `TreeRow` — 재귀 렌더 단위.
  - `TreeNode_` — JSX 모드 마커 컴포넌트 (실제 렌더 하지 않음, displayName 기반 변환).
  - `TreeLabel` — 단순 `<span>`.
  - `TreeExpandToggle` — context 에서 현재 노드 상태 조회, 클릭 시 toggleExpand.
  - `TreeChildren` — JSX 모드의 명시적 children 슬롯.
  - `Tree` namespace export.

- **Tree.utils.ts**
  - `flatten`, `jsxToData`, `deriveCheckVM`, `collectLeafIds`, `findPath`, `EMPTY_SET`.
  - `assertUniqueIds` (dev-only).

- **TreeContext.ts**
  - `createContext<TreeContextValue | null>(null)`.
  - `useTreeContext()` — null 이면 throw `"must be used within Tree.Root"`.
  - `useTreeCurrentNode()` — 현재 `TreeRow` 가 자기 context 를 얻기 위한 서브 context (option). 간단화: props drilling 대신 renderNode args 로 전부 제공.

- **useTreeKeyboard.ts**
  - `onRootKeyDown` 핸들러 생성 훅. typeahead buffer, expandSiblings 포함.

- **useTreeAsync.ts**
  - loadedChildren/loadingIds/errorById state + `requestLoad(node)` 함수.

- **theme.ts**
  - `treePalette` light/dark.

- **index.ts**
  - `export { Tree } from "./Tree"` + 타입 재노출.

---

## 11. 구현 단계 (후속 agent 순차 실행)

각 단계 독립 커밋 권장. 매 커밋 `npm run typecheck` + `npx tsup` 통과.

### Step 1 — 타입 + 배럴 + 테마 스켈레톤
1. `Tree.types.ts` 작성 (§2.1 전부).
2. `theme.ts` 작성 (`treePalette`).
3. `Tree.utils.ts` 에 `EMPTY_SET`, `flatten` skeleton (expand 상태 미반영, 단순 DFS 만), `assertUniqueIds`.
4. `index.ts` 배럴.
5. `src/components/index.ts` 에 `export * from "./Tree";`.
6. `Tree.tsx` placeholder: `export const Tree = { Root: () => null, Node: () => null, Label: () => null, Children: () => null, ExpandToggle: () => null };`.
7. `npm run typecheck` 통과.
8. 커밋: `feat(Tree): 타입 + 테마 + 배럴`.

### Step 2 — 데이터 파이프라인 + 기본 렌더
1. `TreeContext.ts` + `useTreeContext`.
2. `flatten` 에 expanded Set 반영.
3. `TreeRoot` 가 `data` prop 을 받아 `flatten` 후 **재귀 렌더** (expand 는 아직 고정 값).
4. 기본 `defaultRenderNode` (toggle ▸/▾ + label).
5. JSX 변환은 아직 생략 (data 전용).
6. 커밋: `feat(Tree): 기본 데이터 렌더`.

### Step 3 — expand/collapse 상태 + toggle
1. `useControllable` 로 expanded state.
2. `toggleExpand` 구현.
3. `Tree.ExpandToggle` 컴포넌트 연결 (context 의 현재 노드 id 를 얻기 위해 `TreeRow` 가 `TreeItemContext` 를 별도로 제공 — 서브 context).
4. 클릭으로 열고 닫기 동작.
5. 커밋: `feat(Tree): expand/collapse 토글`.

### Step 4 — JSX 재귀 모드
1. `Tree.Node`, `Tree.Children` 마커 + `jsxToData` 구현.
2. `data` 없고 children 있으면 JSX 변환 사용.
3. data + JSX 동시 존재 시 dev warn.
4. 커밋: `feat(Tree): JSX 모드 지원`.

### Step 5 — selection (single/multiple)
1. `useControllable` 로 selected state.
2. `selectNode(id, mods)` — single/multi/none + shift 범위 + meta 토글.
3. 클릭 시 selection, aria-selected 반영.
4. 커밋: `feat(Tree): 선택 모드`.

### Step 6 — checkable + indeterminate
1. `useControllable` 로 checked state.
2. `deriveCheckVM` 구현 + 렌더에 반영.
3. checkbox 렌더 + indeterminate DOM 동기화 (ref).
4. `toggleCheck` 구현 (parent-child cascade).
5. `checkCascade="self"` 경로 분기.
6. 커밋: `feat(Tree): 체크박스 + indeterminate`.

### Step 7 — async loadChildren
1. `useTreeAsync` 훅.
2. toggleExpand 가 필요 시 load 를 먼저 호출.
3. loadingIds/errorById 상태 노출.
4. 에러 `!` 표시.
5. unmount 가드.
6. 커밋: `feat(Tree): async lazy load`.

### Step 8 — 키보드 + ARIA
1. `useTreeKeyboard` 훅 (Arrow/Home/End/Space/Enter/`*`/typeahead/Escape).
2. roving tabindex: focusedId 변화 시 해당 DOM 에 focus.
3. `role="tree"/"treeitem"/"group"` + `aria-expanded/selected/level/posinset/setsize/checked(mixed)/disabled`.
4. `aria-label`/`aria-labelledby` 지원.
5. 커밋: `feat(Tree): 키보드 + ARIA`.

### Step 9 — maxDepth / 중복 id / filter
1. flatten 에 maxDepth 제한.
2. 중복 id dev throw.
3. `filter` prop 반영 (매칭 노드 + 조상 유지, 자동 expand).
4. 커밋: `feat(Tree): 제약 + 필터`.

### Step 10 — imperative ref + Dark 테마
1. `TreeRootHandle` forwardRef 로 노출.
2. `expandAll`/`collapseAll`/`expandTo`/`focus`.
3. Dark 테마 palette 전파.
4. 커밋: `feat(Tree): imperative API + Dark`.

### Step 11 — 데모 페이지
1. `demo/src/pages/TreePage.tsx` (§12).
2. `demo/src/App.tsx` NAV 추가.
3. 3 개 샘플 데이터 (FileTree, JsonTree, OrgChart) 작성.
4. 커밋: `feat(Tree): 데모 페이지`.

### Step 12 — 마감
1. Props 표 + Usage 예제 (§12.10).
2. §20 DoD 전부 체크.
3. 커밋: `feat(Tree): 데모 props 표 + usage`.

---

## 12. 데모 페이지

`demo/src/pages/TreePage.tsx`. 구조는 CommandPalettePage 와 동일: `<section id="...">` + 좌측 NAV 연동.

### 12.1 NAV 추가 (App.tsx)

```ts
{ id: "tree", label: "Tree", description: "계층 트리 / 체크 / async", sections: [
  { label: "Basic",            id: "basic" },
  { label: "Checkable",        id: "checkable" },
  { label: "Async load",       id: "async" },
  { label: "Custom render",    id: "custom" },
  { label: "Disabled",         id: "disabled" },
  { label: "Dark",             id: "dark" },
  { label: "Controlled",       id: "controlled" },
  { label: "Playground",       id: "playground" },
  { label: "Props",            id: "props" },
  { label: "Usage",            id: "usage" },
]},
```

`Page` 타입에 `"tree"` 추가 + 하단 `{current === "tree" && <TreePage />}`.

### 12.2 샘플 데이터 — FileTree

```ts
const fileTree: TreeNode[] = [
  { id: "src", label: "src", icon: "📁", children: [
    { id: "src/components", label: "components", icon: "📁", children: [
      { id: "src/components/Tree.tsx", label: "Tree.tsx", icon: "📄" },
      { id: "src/components/Button.tsx", label: "Button.tsx", icon: "📄" },
    ]},
    { id: "src/utils", label: "utils", icon: "📁", children: [
      { id: "src/utils/format.ts", label: "format.ts", icon: "📄" },
    ]},
    { id: "src/index.ts", label: "index.ts", icon: "📄" },
  ]},
  { id: "public", label: "public", icon: "📁", children: [
    { id: "public/favicon.ico", label: "favicon.ico", icon: "🖼" },
  ]},
  { id: "package.json", label: "package.json", icon: "📄" },
];
```

### 12.3 샘플 데이터 — JsonTree

임의 JSON 객체를 재귀적으로 TreeNode 변환:

```ts
function jsonToTree(value: unknown, path = "$"): TreeNode {
  if (Array.isArray(value)) {
    return {
      id: path, label: `Array(${value.length})`,
      children: value.map((v, i) => jsonToTree(v, `${path}[${i}]`)),
    };
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    return {
      id: path, label: `Object(${entries.length})`,
      children: entries.map(([k, v]) => jsonToTree(v, `${path}.${k}`)),
    };
  }
  return { id: path + ":" + String(value), label: `${JSON.stringify(value)}` };
}
```

### 12.4 샘플 데이터 — OrgChart

```ts
const orgChart: TreeNode[] = [
  { id: "ceo", label: "Alice (CEO)", icon: "👤", children: [
    { id: "cto", label: "Bob (CTO)", icon: "👤", children: [
      { id: "eng1", label: "Carol (Engineer)", icon: "👤" },
      { id: "eng2", label: "Dave (Engineer)", icon: "👤" },
    ]},
    { id: "cfo", label: "Eve (CFO)", icon: "👤", children: [
      { id: "fin1", label: "Frank (Finance)", icon: "👤" },
    ]},
  ]},
];
```

### 12.5 섹션 — Basic

```tsx
<Tree.Root
  data={fileTree}
  defaultExpanded={new Set(["src", "src/components"])}
  selectionMode="single"
  style={{ width: 320, border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}
/>
```

세 샘플 각각 전시 (탭 또는 나란히).

### 12.6 섹션 — Checkable

```tsx
const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
<Tree.Root
  data={fileTree}
  defaultExpanded={new Set(["src", "src/components"])}
  checkable
  checked={checked}
  onCheckedChange={setChecked}
/>
<div>Checked: {Array.from(checked).join(", ") || "(none)"}</div>
```

별도로 `checkCascade="self"` 비교 샘플.

### 12.7 섹션 — Async load

```tsx
async function fakeLoad(node: TreeNode) {
  await new Promise((r) => setTimeout(r, 600));
  if (node.id === "slow") throw new Error("Load failed");
  return [
    { id: node.id + "/a", label: "a.ts", hasChildren: false },
    { id: node.id + "/b", label: "b.ts", hasChildren: false },
  ];
}
<Tree.Root
  data={[
    { id: "remote-1", label: "remote folder 1", hasChildren: true },
    { id: "remote-2", label: "remote folder 2", hasChildren: true },
    { id: "slow", label: "broken (reject)", hasChildren: true },
  ]}
  loadChildren={fakeLoad}
/>
```

### 12.8 섹션 — Custom render

파일 크기 뱃지, 수정일, 상태 dot 등 복잡 renderNode 예제.

```tsx
<Tree.Root
  data={files}
  renderNode={({ node, level, isExpanded, isSelected, hasChildren }) => (
    <>
      <Tree.ExpandToggle />
      <span>{hasChildren ? (isExpanded ? "📂" : "📁") : "📄"}</span>
      <Tree.Label>{node.label}</Tree.Label>
      <span style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 11 }}>
        {(node.data as any)?.size ?? ""}
      </span>
      {(node.data as any)?.modified && (
        <span style={{ color: "#2563eb", fontSize: 11 }}>
          M
        </span>
      )}
    </>
  )}
/>
```

### 12.9 섹션 — Disabled / Dark / Controlled / Playground

**Disabled** — 일부 노드에 `disabled: true` + root `disabled` prop 동시 비교.

**Dark** — `<div style={{ background: "#0f172a" }}><Tree.Root theme="dark" ... /></div>`.

**Controlled** — 외부 버튼으로 "Expand all", "Collapse all", "Select src/*" 제공.
```tsx
const ref = useRef<TreeRootHandle>(null);
<button onClick={() => ref.current?.expandAll()}>Expand all</button>
<button onClick={() => ref.current?.collapseAll()}>Collapse all</button>
<Tree.Root ref={ref} data={fileTree} />
```

**Playground** — 컨트롤:
- data source (FileTree / JsonTree / OrgChart)
- selectionMode (none/single/multiple)
- checkable (on/off) + checkCascade (parent-child/self)
- showIndentGuides (on/off)
- indent (8/16/24 px)
- theme (light/dark)
- disabled (on/off)
- async 토글 (루트 일부 자식을 lazy 로 교체)

하단에 현재 expanded/selected/checked Set 상태를 `<pre>` 로 실시간 표시.

### 12.10 Props 표

`Tree.Root` 의 모든 prop × 타입 × 기본값 × 설명 (기존 페이지 관례 동일). `TreeNode<T>` 타입 필드도 별도 표.

### 12.11 Usage (4 개 스니펫)

1. **기본 파일 트리**: data + defaultExpanded + single select.
2. **체크박스 + indeterminate**: checkable + onCheckedChange.
3. **Async 파일 탐색기**: loadChildren + hasChildren flag.
4. **커스텀 렌더**: 아이콘/뱃지/메타 칩 복합 행.

---

## 13. 검증 계획

### 13.1 자동화
```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```
주의: `exactOptionalPropertyTypes` — `ReadonlySet<string> | undefined` 구분, `noUncheckedIndexedAccess` — `flatItems[i]` 는 `FlatItem<T> | undefined` → `!` non-null assertion 신중 사용, `verbatimModuleSyntax` — 타입은 `import type`.

### 13.2 수동 (demo dev server)
```bash
cd demo && npm run dev
```

체크리스트:
- [ ] Basic FileTree: `src` 펼치면 components/utils/index.ts 보임. 클릭 시 선택 하이라이트.
- [ ] JsonTree: 중첩 Object/Array 재귀 표시, 깊이 10+ 도 동작.
- [ ] OrgChart: 3 depth 조직도 렌더, 선택.
- [ ] ArrowDown/Up 네비, ArrowRight/Left 가 expand/collapse + 자식/부모 이동.
- [ ] Home/End 가 flatten 의 맨 처음/끝으로.
- [ ] `*` 키로 현재 레벨 전체 펼침.
- [ ] Typeahead: `co` 입력 시 "components" 로 포커스, 500 ms 후 버퍼 초기화.
- [ ] selectionMode="multiple": Shift+클릭 범위, Ctrl/Cmd+클릭 토글.
- [ ] Checkable parent-child: 부모 체크 → 모든 leaf 체크, 일부 leaf 해제 → 부모 indeterminate, 모든 leaf 해제 → 부모 해제.
- [ ] Checkable self: cascade 없이 각자 토글.
- [ ] Async: `remote folder 1` 클릭 → spinner 600 ms → children 펼침. 같은 노드 재 collapse/expand 시 재로드 안 함.
- [ ] Async error: `broken (reject)` 클릭 → 에러 `!` 표시, collapse 유지.
- [ ] Disabled 노드: 클릭/키보드 무시, 자식 expand 도 불가.
- [ ] Dark 테마: row hover/selected/toggle 색 모두 전환.
- [ ] Controlled + expandAll/collapseAll ref API.
- [ ] showIndentGuides on/off 시각 차이.
- [ ] 다른 페이지 리그레션 없음.

### 13.3 엣지 케이스
- [ ] **중복 id**: dev 모드에서 두 노드 id 같게 주면 throw. prod 는 두 번째 skip.
- [ ] **깊이 32 초과**: maxDepth 에서 warn + leaf 처리.
- [ ] **hasChildren=true + children=undefined + loadChildren 없음**: toggle 클릭 시 아무 것도 일어나지 않음 (spinner 도 안 뜸). dev warn `loadChildren missing`.
- [ ] **loadChildren resolve 가 []**: "빈 폴더" 로 저장, 이후 같은 노드 재 expand 에도 재호출 없음.
- [ ] **loadChildren reject**: error 저장, 재시도 API 없음 (v1.1 예정).
- [ ] **unmount 중 loadChildren resolve**: mountedRef 가드로 setState 경고 없음.
- [ ] **매 렌더 새 `data` 참조**: flatten useMemo 재계산 → 성능 degradation. 부모에게 `useMemo` 권장 문서화.
- [ ] **controlled checked 에 없는 id 포함**: 무시 (경고 없음, 그냥 매칭 안 됨).
- [ ] **filter 가 전부 false**: 빈 트리 렌더 + `role="tree"` 여전 + tabindex 없음.
- [ ] **RTL**: Arrow 방향 반전은 **하지 않음**. VSCode/Finder 동일 정책 (Right=expand, Left=collapse). RTL 에서도 동일 (논리적 방향).
  > 만약 "물리 방향" 을 원하면 v1.1 `arrowDirection: "logical" | "physical"` prop 도입 고려.
- [ ] **IME 입력 중 typeahead**: `e.isComposing` 체크 후 버퍼에 안 넣음.
- [ ] **매우 긴 label**: overflow 처리는 사용자 스타일 책임. 기본은 white-space:nowrap 없이 natural wrap (VSCode 와 차별).
- [ ] **data가 비어있음([])**: 아무 것도 렌더되지 않고 tree role 도 빈 `<ul>` 로 유지, focus 불가능.

---

## 14. 성능

### 14.1 목표
- 초기 마운트 (200 노드): < 10 ms
- 300 노드 트리 전체 expand + 재 flatten: < 5 ms
- 키보드 Arrow 연타 (10 회/s): 드롭 프레임 없음
- 500 노드 기준 60 fps
- 1000+ 노드는 v1.1 virtualization 전제

### 14.2 병목 가설 + 완화

1. **flatten 의 O(N)**: 매번 새 배열. 상태 변경(예: expanded 토글) 시 전체 재계산. N 이 1k 이상이면 체감 가능. 완화: `useMemo(() => flatten(...), [data, expanded, loadedChildren, maxDepth])`. `data` 참조 안정성 요구.
2. **Set identity**: 부모가 매 렌더 새 Set 주면 memo miss. 문서화 + controlled 일 때 `useMemo(() => expanded, [expanded])` 권장.
3. **deriveCheckVM 의 O(N)**: checkable 일 때 매 렌더 전체 subtree 순회. Memo (`[data, checked, loadedChildren]`). 1k 노드에 <3 ms 예상.
4. **재귀 렌더의 React reconciliation**: 깊은 트리에서 `React.Children.map` 대신 `.map()` 사용, key 는 `node.id` 로 안정화. reconcile 비용은 N 에 비례, 1k 까진 허용.
5. **checkbox indeterminate DOM 동기화**: `ref={(el) => { if (el) el.indeterminate = ... }}` 는 매 렌더 실행 → 변화 없으면 no-op 이지만 ref 콜백 잦은 호출 우려. `useEffect` 로 변경 시에만 적용하는 변형도 가능 (측정 후 결정).
6. **키보드 typeahead 의 string scan**: `flatItems` 를 `label` 기준 선형 scan. 1k 노드여도 < 1 ms. OK.
7. **roving focus DOM 이동**: `document.querySelector('[data-id="..."]')` 는 O(N) 이지만 탐색 결과를 `flatItems` index 기반 DOM ref array 로 캐시. 매 렌더 `useLayoutEffect` 에서 ref array 갱신.

### 14.3 측정
- DevTools Performance 로 1k 노드 전체 펼치기 → 한 프레임 < 16 ms 확인.
- React Profiler 로 toggleExpand 시 렌더 대상이 트리 전체인지 확인. Context value 변경은 Provider 아래 모든 subscriber 를 재렌더 시키므로, 일부 컴포넌트는 `React.memo + useMemo` 로 stable props 유지.

### 14.4 큰 트리 한계

- 500 노드 이하: v1 그대로 사용 권장.
- 500~1500: 약간의 랙 허용 가능. showIndentGuides=false, 얕은 renderNode 로 완화.
- 1500 초과: v1.1 virtualization 기다리거나, 사용자가 직접 가상 스크롤 래퍼 작성.

이 가이드라인은 README/Props 문서에 명시.

---

## 15. 접근성

### 15.1 role / aria

- 컨테이너: `role="tree"` + `aria-label`/`aria-labelledby` (사용자 provide 또는 기본 "Tree").
- 각 노드: `role="treeitem"`.
- 자식 `<ul>`: `role="group"`.
- `aria-expanded`: hasChildren 인 노드에만 true/false. leaf 는 미설정.
- `aria-selected`: selectionMode!=="none" 일 때만 설정.
- `aria-checked`: checkable 일 때만 설정. indeterminate → `"mixed"`.
- `aria-level`: 1-based (level + 1).
- `aria-posinset`: 1-based (index + 1).
- `aria-setsize`: 부모의 자식 수.
- `aria-disabled`: disabled 노드에 true.

### 15.2 roving tabindex

트리 전체에서 한 노드만 `tabindex="0"`, 나머지 `-1`. focus 이동은 키보드 핸들러가 직접 DOM focus 이동.

### 15.3 스크린리더 기대 동작 (VoiceOver 기준)

- 트리 진입: "Tree, src, 1 of 3, expanded, level 1".
- ArrowDown: "components, 1 of 3, collapsed, level 2".
- Space (checkable): "checked" / "unchecked" / "mixed".
- expand 시: 상태 변화 announce.

### 15.4 Focus visible

CSS:
```css
.tr-item:focus { outline: none; }
.tr-item:focus-visible > .tr-row {
  outline: 2px solid var(--tr-focus);
  outline-offset: -2px;
}
```
data-focused 와 `:focus-visible` 이중 경로. data-focused 는 JS 로 제어(키보드 탐색이 DOM focus 이동을 수반), `:focus-visible` 은 브라우저가 결정.

### 15.5 추가 권장

- `aria-label` 은 사용자 필수 권장. 미지정 시 기본 "Tree" (dev 콘솔 info).
- async loading 중 `aria-busy="true"` 를 treeitem 에 부여.
- error 있는 treeitem 에 `aria-invalid="true"` + description id 로 에러 메시지 연결.

---

## 16. 알려진 트레이드오프 · 결정

1. **재귀 DOM vs flat DOM**: ARIA tree 패턴은 계층 DOM 요구. v1 은 재귀 유지. virtualization(v1.1) 은 flat + `aria-owns` 보조로 전환 — 설계 변경 수반.
2. **Set 불변성 요구**: 외부가 매 렌더 새 Set 을 만들면 memo miss. 가이드 문서화로 해소. 대안(deep equality 비교) 은 비용이 큼.
3. **indeterminate 자동 유도**: controlled checked 는 "leaf 의도" 만 받고 부모 상태는 유도. 장점: 단일 진실 원천. 단점: 사용자가 "서버에서 받은 부모 체크 상태" 를 직접 표시하기 어려움. 그 경우 `checkCascade="self"` 로 우회.
4. **async 재시도 없음**: v1 은 단순성 위주. `reload(id)` 는 v1.1 imperative API.
5. **RTL Arrow 방향**: 논리 방향 고정(Right=expand, VSCode 관례). 물리 방향은 v1.1 옵션.
6. **lastAnchor ref**: shift 범위 선택의 anchor 는 내부 ref. 첫 클릭에 설정, 이후 shift+클릭 시 anchor~target 구간 선택. 일반 클릭 시 anchor 갱신. 포커스 이동만으로는 anchor 변화 없음 (DataTable 과 동일 모델).
7. **Context value fat**: Context 1 개에 많은 필드. 성능 민감하면 "데이터 context" + "상태 context" 분리 가능. v1 은 단일 context.
8. **toggle 아이콘 UTF-8**: ▸/▾ 글꼴 렌더 차이. 필요 시 사용자가 `collapsedIcon`/`expandedIcon` 로 SVG 주입.
9. **checkbox onClick stopPropagation**: row 의 select 이벤트와 분리. checkbox 클릭은 오직 check toggle (row select 안 일어남). 디자인 선택.
10. **onActivate 시점**: Enter 키 + 더블클릭. single selection 은 Click 으로 선택 + Enter/더블클릭으로 activate (파일 열기) 패턴. VSCode 관례.
11. **빈 children vs undefined children**: leaf vs unknown 구분 명시. hasChildren flag 로 override 가능. 문서화 필수.
12. **filter 시 자동 expand**: 매칭 된 노드의 모든 조상을 자동 expand. controlled 상태에 충돌 가능 — filter 활성 시에는 임시 expand 를 "view-only" 로 적용하고 expanded state 는 변경 안 함 (내부 effective-expanded 계산). 복잡도 있으나 사용자 혼란 최소화.

---

## 17. 후속 작업 (v1.1+)

- **Virtualization**: flat list + fixed item height + `useVirtualList` 재사용. `aria-owns` 로 계층 보조. ~10k 노드까지 60 fps 목표.
- **Drag and Drop**: `draggable` + `onDragStart/Over/Drop` + drop indicator (`data-drop="before" | "inside" | "after"`) + `onMove(srcIds, dstId, position)` 콜백. drag handle 렌더 슬롯.
- **Multi-root 고급**: 루트 간 shift-click 범위, 루트 간 이동 제약.
- **reload API**: `treeRef.current?.reload(id)` — errorById 삭제 + loadedChildren 재실행.
- **편집 모드**: inline rename / add / delete. renderNode 로도 가능하지만 표준 컴포넌트 제공.
- **검색 UI 내장**: `<Tree.Search />` 하위 컴포넌트 + highlight 유틸.
- **persist expanded**: `storageKey` prop → localStorage.
- **drag 범위 선택 (rubber band)**.
- **Context menu**: `<Tree.ContextMenu />` 하위 + items prop.
- **물리 RTL Arrow**: `arrowDirection` prop.
- **애니메이션**: `transition: max-height` 기반 expand/collapse.
- **단축키 커스터마이징**: shortcut 매핑 prop.
- **SSR / React Server Components 호환 재점검**.
- **i18n**: 기본 aria-label 텍스트 locale override.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| useControllable (dual API, 3 축) | `/Users/neo/workspace/plastic/src/components/_shared/useControllable.ts` |
| 계층 상태 Set / expand 토글 prior (cluster) | `/Users/neo/workspace/plastic/src/components/PipelineGraph/PipelineGraphCluster.tsx` |
| PipelineGraph 배럴 (참조) | `/Users/neo/workspace/plastic/src/components/PipelineGraph/index.ts` |
| 행 선택 / focused row / 키보드 prior | `/Users/neo/workspace/plastic/src/components/DataTable/DataTableRow.tsx` |
| rowSelection Set 패턴 | `/Users/neo/workspace/plastic/src/components/DataTable/DataTable.tsx` |
| 가상 스크롤 훅 (v1.1 재사용) | `/Users/neo/workspace/plastic/src/components/DataTable/useVirtualList.ts` |
| 입력 기반 typeahead/ARIA 패턴 | `/Users/neo/workspace/plastic/src/components/CommandPalette/` |
| 배럴 등록 | `/Users/neo/workspace/plastic/src/components/index.ts` |
| 데모 페이지 레이아웃 (섹션 + 사이드바) | `/Users/neo/workspace/plastic/demo/src/pages/CommandPalettePage.tsx` |
| 데모 App 라우팅 / NAV | `/Users/neo/workspace/plastic/demo/src/App.tsx` |
| tsconfig 제약 | `/Users/neo/workspace/plastic/tsconfig.json` |
| 이전 plan 템플릿 참고 | `/Users/neo/workspace/plastic/docs/plans/017-splitpane-component.md` |

---

## 19. 의존성 영향

신규 런타임 의존 없음. React 18.3 (기존) + DOM API 만 사용.

번들 영향:
- Tree 자체 예상 크기: ~6.5 KB (min), ~2.5 KB (min+gzip).
  - 핵심 로직 (flatten/deriveCheckVM/keyboard): ~3 KB
  - 타입/palette/util: ~0.5 KB
  - 렌더 컴포넌트들: ~3 KB
- plastic 전체 dist 영향 미미.

Browser 지원:
- ES2020 (optional chaining, nullish coalescing).
- `Set<string>` / `Map` 기본.
- focus/ARIA: 모든 모던 브라우저.
- `compositionstart/end` (IME typeahead 가드): 모두 지원.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/tree` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 "v1 범위 밖" 이유 기재.
- [ ] PipelineGraph / CodeView / HexView / CommandPalette / DataTable / SplitPane / 기타 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 `export * from "./Tree";` 추가됨.
- [ ] `package.json` dependencies 변경 없음 (신규 의존 없음).
- [ ] Props 문서 섹션이 Props 표로 채워져 있음 (Root/Node/Label/Children/ExpandToggle + TreeNode 타입).
- [ ] Usage 섹션에 최소 4 개 스니펫 (기본 / checkable / async / custom render).
- [ ] 데모 Playground 에서 모든 주요 prop 토글 가능.
- [ ] Light/Dark 테마 전환 시 시각 이상 없음.
- [ ] 키보드 단독으로 (마우스 없이) expand/collapse/select/check/typeahead 가능.
- [ ] 스크린리더(VoiceOver) 에서 role=tree/treeitem, aria-expanded/selected/checked(mixed)/level/posinset/setsize 올바르게 읽힘.
- [ ] 500 노드 샘플에서 expand/collapse 드롭 프레임 없음.
- [ ] 중복 id 주입 시 dev throw 확인.
- [ ] async loadChildren 한 번만 호출되고 error/success 경로 모두 동작 확인.
- [ ] JSX 모드 (`<Tree.Node>` 재귀) 와 data 모드 결과 동일 확인.
- [ ] imperative API (`expandAll`/`collapseAll`/`expandTo`/`focus`) 동작 확인.

---

**끝.**
