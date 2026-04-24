# PipelineGraph 컴포넌트 설계문서

## Context

plastic 라이브러리에 "스텝 기반으로 실행되는 파이프라인" 을 시각화하는 `PipelineGraph` 컴포넌트를 추가한다. 역할 비유: Airflow/Dagster/n8n/ComfyUI 가 런타임 웹 UI 에서 보여주는 DAG 실행 뷰의 독립형 React 컴포넌트. 렌더 타깃은 **정적 또는 진행 중인 파이프라인의 상태 스냅샷**이며, 사용자는 각 노드를 클릭해 입력/출력/내부 상태/로그/타이밍을 패널로 살펴볼 수 있다.

참고 (prior art — 이 컴포넌트의 UX 근거):
- **Apache Airflow** Graph View — DAG 노드 배경색으로 상태 표시, 호버/클릭으로 태스크 인스턴스 상세.
- **Dagster** Asset/Run Graph — 스텝을 박스로, 자산(asset) 을 다이아몬드로, 런 프로파일링을 타임라인으로.
- **n8n** workflow canvas — 노드 카드에 입력/출력 포트, 카드 안에 실행 시간 배지.
- **ComfyUI** — 노드 안에 프리뷰(이미지) 임베드, fan-out 엣지.
- **React Flow** (구현 레퍼런스) — HTML 포지셔닝 + SVG 엣지 레이어, 트랜스폼 래퍼로 팬/줌.
- **Dagre** (`@dagrejs/dagre`) — 레이어드 DAG 레이아웃 (Sugiyama). MIT 라이선스, ~60 KB.

본 레포 내부 참조:
- `src/components/CodeView/CodeView.tsx` — 팔레트 토큰, 폰트, 테마 스위칭, 코드/데이터 프리뷰용 blocks.
- `src/components/DataTable/useVirtualList.ts`, `src/components/HexView/useHexVirtualList.ts` — ResizeObserver + scrollTop 패턴.
- `src/components/_shared/useControllable.ts` — controlled/uncontrolled 이중 API 패턴.
- `src/components/Popover/*` — 드롭다운/툴팁 포지셔닝.
- `src/components/Stepper/*` — 수평/수직 스텝 UI 패턴 (선형 경우의 바닥).

---

## 0. TL;DR (한 페이지 요약)

```tsx
<PipelineGraph
  nodes={[
    { id: "ingest",   kind: "task",  label: "Ingest",     status: "success", timing: { startedAt, endedAt } },
    { id: "validate", kind: "group", label: "Validate",   status: "success", children: ["schema", "bounds"] },
    { id: "schema",   kind: "task",  label: "Schema",     status: "success", parent: "validate" },
    { id: "bounds",   kind: "task",  label: "Bounds",     status: "success", parent: "validate" },
    { id: "train",    kind: "loop",  label: "Train (3×)", status: "running", iterations: 3, children: [...] },
    { id: "export",   kind: "task",  label: "Export",     status: "pending" },
  ]}
  edges={[
    { from: "ingest", to: "validate" },
    { from: "validate", to: "train" },
    { from: "train", to: "export", fanOut: { count: 3, label: "per-epoch" } },
  ]}
  direction="LR"              // "LR" | "TB"
  selection={selectedId}       // controlled
  onSelectionChange={setSelectedId}
  expansion={expanded}         // controlled 집합 — 펼쳐진 group/loop id
  onExpansionChange={setExpanded}
  inspector={{ position: "right", defaultWidth: 380 }}
  theme="light"
  renderInspectorValue={(node, tab) => /* 사용자 커스텀 (예: 이미지 프리뷰) */}
  onNodeDoubleClick={(node) => openInFullScreen(node)}
/>
```

렌더 결과 (개념):
```
[Ingest ✓] ──▶ [Validate ✓ ▸] ──▶ [Train ⟳ 3× ▸] ══▶ [Export •]
                                          │               ↑
                                          └─ per-epoch ──┘
```

핵심 설계 원칙:
- **읽기 전용 뷰어**. 편집(노드 추가/이동/와이어링)은 범위 밖 — 별도 컴포넌트로 분리한다.
- **구조 + 상태를 동시에 표현**. 구조는 Dagre 레이아웃으로, 상태는 카드 배경/테두리/아이콘으로.
- **계층 지원**. group/loop 는 접힌 상태(= 단일 카드) ↔ 펼친 상태(= 내부 서브그래프 클러스터) 를 토글.
- **팬/줌 지원**. 수백 노드 파이프라인도 마우스 휠/드래그로 자유롭게 탐색.
- **인스펙터 패널**. 노드 선택 시 입력/출력/내부 상태/로그/타이밍/에러 탭으로 상세.
- **런타임 의존 zero**. 내부 레이아웃 외부 의존성은 `@dagrejs/dagre` 1 개. 아이콘은 inline SVG, 폰트는 시스템.

---

## 1. Goals / Non-goals

### Goals (v1)
1. 노드 + 엣지 배열을 받아 DAG 로 레이아웃하고 팬/줌 가능한 캔버스에 렌더.
2. 노드 3종 지원: **task** (단일 스텝), **group** (여러 스텝을 묶음), **loop** (N 회 반복되는 스텝 묶음).
3. 상태 6종: `pending`, `running`, `success`, `failed`, `skipped`, `cancelled`.
4. 타이밍 표시: 노드 카드 하단에 `startedAt → endedAt` 또는 `duration`.
5. 선택/인스펙터: 노드 클릭 → 우측(또는 하단) 패널에 Input / Output / Internal / Logs / Timing / Error 탭.
6. 계층: group/loop 는 접힘/펼침 토글. 펼치면 내부 서브그래프가 **같은 캔버스 안 클러스터**로 보임.
7. fan-out 엣지: 한 노드가 N 개의 실행을 만들어낼 때 엣지에 `N×` 배지.
8. 엣지 레이블 + 데이터 프리뷰: 엣지를 호버하면 간단한 "통과 데이터 요약" 툴팁 (사용자 제공).
9. 팬/줌: 휠=줌, 드래그 또는 스페이스+드래그=팬, 더블클릭=맞춤 줌(fit).
10. 키보드: Tab/화살표 노드 네비게이션, Enter=인스펙터 열기, Esc=선택 해제, Space+드래그=팬, +/−/0 =줌.
11. Light / Dark 테마.
12. Controlled / Uncontrolled 듀얼 API (selection, expansion, viewport).

### Non-goals (v1 제외)
- **편집**: 노드 드래그 이동, 엣지 연결, 노드 추가/삭제. 별도 컴포넌트(예: `PipelineEditor`) 에서 다룬다.
- **스트리밍 실시간 업데이트**: 노드 상태 변화 애니메이션 (pulse 등) 은 기본 CSS 수준만. WebSocket 연결·이벤트 큐는 호출자 책임.
- **미니맵**: v1.1.
- **여러 DAG 뷰 동시 표시** (diff 모드): v1.2.
- **수직/수평 자동 선택**: `direction` prop 으로 명시적으로 받는다.
- **3D / WebGL 렌더**: 모두 DOM + SVG.
- **서브그래프 페이지 이동** (group 더블클릭 → 전체 화면 교체): `onNodeDoubleClick` 콜백만 제공, 실제 페이지 전환은 호출자.

---

## 2. 공개 API

### 2.1 `src/components/PipelineGraph/PipelineGraph.types.ts`

```ts
export type PipelineGraphTheme = "light" | "dark";

export type PipelineGraphDirection = "LR" | "TB";
// LR: 좌→우 (기본), TB: 상→하. Dagre rankdir 와 1:1.

export type PipelineNodeKind = "task" | "group" | "loop";

export type PipelineNodeStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "skipped"
  | "cancelled";

export interface PipelineNodeTiming {
  /** 시작 epoch ms */
  startedAt?: number;
  /** 종료 epoch ms (running 상태면 undefined) */
  endedAt?: number;
  /** 수동 duration (startedAt/endedAt 없이 표시하고 싶을 때, 단위 ms) */
  durationMs?: number;
}

export interface PipelineNodeLog {
  /** 로그 line ts (선택적) */
  t?: number;
  level?: "debug" | "info" | "warn" | "error";
  message: string;
}

export interface PipelineNode {
  /** 전역 유일 id. */
  id: string;
  /** 카드 헤더에 표시될 이름. */
  label: string;
  /** 종류. 기본 "task". */
  kind?: PipelineNodeKind;
  /** 실행 상태. 기본 "pending". */
  status?: PipelineNodeStatus;
  /** 실행 타이밍. */
  timing?: PipelineNodeTiming;
  /** 부모 group/loop 의 id. 없으면 top-level. */
  parent?: string;
  /**
   * group/loop 자식 id 목록. (parent 와 children 는 서로를 거울처럼 반영해야 하지만,
   * 둘 중 하나만 주어도 내부에서 그래프를 구성할 수 있도록 구현)
   */
  children?: string[];
  /** kind === "loop" 일 때 총 반복 횟수. */
  iterations?: number;
  /** 현재 실행 중인 반복 번호 (1-based). running 일 때만 의미. */
  currentIteration?: number;

  /** 인스펙터 Input 탭 데이터 (모양은 자유 — renderInspectorValue 가 해석). */
  input?: unknown;
  /** 인스펙터 Output 탭 데이터. */
  output?: unknown;
  /** 인스펙터 Internal 탭 데이터 (예: 환경변수, 파라미터, 중간 상태). */
  internal?: unknown;
  /** 인스펙터 Logs 탭 — 텍스트 라인 배열 또는 구조화 로그. */
  logs?: string[] | PipelineNodeLog[];
  /** 인스펙터 Error 탭 — failed 상태에서만 사용. */
  error?: { message: string; stack?: string; cause?: unknown };

  /** 카드에 오버레이로 표시할 사용자 정의 배지(우상단). */
  badge?: string;
  /** 카드 색상 오버라이드 — status 색상을 덮어씀. */
  accentColor?: string;
  /** 추가 className. */
  className?: string;
}

export interface PipelineEdge {
  /** 소스 노드 id. */
  from: string;
  /** 타깃 노드 id. */
  to: string;
  /** 엣지 레이블 (중간 표시). */
  label?: string;
  /** Fan-out 표시 (예: train 이 3 epoch 로 분기). undefined = 단일 엣지. */
  fanOut?: { count: number; label?: string };
  /** 엣지 스타일. 기본 "solid". */
  variant?: "solid" | "dashed" | "dotted";
  /** 엣지 색상 오버라이드. */
  color?: string;
  /** 호버/클릭 시 인스펙터에 주입할 데이터. */
  dataPreview?: unknown;
}

export interface PipelineGraphViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface PipelineGraphInspectorConfig {
  /** 패널 위치. 기본 "right". */
  position?: "right" | "bottom" | "none";
  /** 초기 너비/높이 (px). right 는 width, bottom 은 height. 기본 380 / 280. */
  defaultSize?: number;
  /** 기본 탭. 기본 "output". */
  defaultTab?: PipelineInspectorTab;
  /** 사용자가 보이게 할 탭만 필터. 기본 모두. */
  tabs?: PipelineInspectorTab[];
}

export type PipelineInspectorTab =
  | "input"
  | "output"
  | "internal"
  | "logs"
  | "timing"
  | "error";

export interface PipelineGraphProps {
  /** 노드 배열. 필수. */
  nodes: PipelineNode[];
  /** 엣지 배열. 필수. */
  edges: PipelineEdge[];

  /** 레이아웃 방향. 기본 "LR". */
  direction?: PipelineGraphDirection;
  /** Dagre rank(= layer) 간격. 기본 96. */
  rankSep?: number;
  /** Dagre node 간격(동일 rank 내). 기본 48. */
  nodeSep?: number;
  /** 그룹/루프 클러스터 내부 패딩. 기본 24. */
  clusterPadding?: number;

  /** Controlled 선택. 미지정 시 내부 상태. */
  selection?: string | null;
  /** 기본 선택 (uncontrolled 용). 기본 null. */
  defaultSelection?: string | null;
  /** 선택 변경 콜백. */
  onSelectionChange?: (id: string | null) => void;

  /** Controlled 펼침 집합 (group/loop id 의 Set 직렬화 배열). */
  expansion?: string[];
  /** 기본 펼침 (uncontrolled). 기본 []. */
  defaultExpansion?: string[];
  /** 펼침 변경 콜백. */
  onExpansionChange?: (ids: string[]) => void;

  /** Controlled 뷰포트 (팬/줌). */
  viewport?: PipelineGraphViewport;
  /** 기본 뷰포트. 미지정 시 fit-to-content. */
  defaultViewport?: PipelineGraphViewport;
  /** 뷰포트 변경 콜백. */
  onViewportChange?: (vp: PipelineGraphViewport) => void;

  /** 인스펙터 설정. */
  inspector?: PipelineGraphInspectorConfig;
  /**
   * 인스펙터 탭의 값 렌더 커스터마이저.
   * 반환값이 undefined 면 기본 렌더(CodeView JSON) 사용.
   * 예: 이미지 데이터를 받아 <img> 로 프리뷰, 또는 거대한 배열을 요약.
   */
  renderInspectorValue?: (
    node: PipelineNode,
    tab: PipelineInspectorTab,
    value: unknown,
  ) => React.ReactNode | undefined;

  /** 노드 카드 렌더 커스터마이저. 반환값이 undefined 면 기본 카드. */
  renderNode?: (node: PipelineNode, ctx: { selected: boolean; expanded: boolean }) =>
    React.ReactNode | undefined;

  /** 엣지 hover 시 툴팁 내용. */
  renderEdgeTooltip?: (edge: PipelineEdge) => React.ReactNode | undefined;

  /** 노드 더블클릭 콜백(= 풀스크린/페이지 이동 훅). */
  onNodeDoubleClick?: (node: PipelineNode) => void;

  /** 라이트/다크 테마. 기본 "light". */
  theme?: PipelineGraphTheme;

  /** 컨테이너 전체 크기 (px | string). 기본 width: "100%", height: "70vh". */
  width?: number | string;
  height?: number | string;

  /** 팬/줌 비활성화. 기본 false. */
  interactive?: boolean;

  /** 추가 className. */
  className?: string;
}
```

### 2.2 배럴

```ts
// src/components/PipelineGraph/index.ts
export { PipelineGraph } from "./PipelineGraph";
export type {
  PipelineGraphProps,
  PipelineGraphTheme,
  PipelineGraphDirection,
  PipelineGraphViewport,
  PipelineGraphInspectorConfig,
  PipelineInspectorTab,
  PipelineNode,
  PipelineNodeKind,
  PipelineNodeStatus,
  PipelineNodeTiming,
  PipelineNodeLog,
  PipelineEdge,
} from "./PipelineGraph.types";
```

그리고 `src/components/index.ts` 에 `export * from "./PipelineGraph";` 한 줄 추가.

---

## 3. 도메인 모델 · 정규화

### 3.1 입력 검증 + 정규화

원시 `nodes`/`edges` 는 누락·모순이 있을 수 있다. 먼저 다음을 수행:

```ts
interface NormalizedNode extends Required<Pick<PipelineNode, "id" | "label">> {
  kind: PipelineNodeKind;            // default "task"
  status: PipelineNodeStatus;        // default "pending"
  parent: string | null;
  children: string[];                // topology 에서 재계산
  iterations: number | null;
  currentIteration: number | null;
  timing: PipelineNodeTiming | null;
  // input/output/internal/logs/error 등 passthrough
  raw: PipelineNode;
}
```

정규화 규칙:
1. 중복 id 탐지 → dev 에서 `console.warn` + 뒤쪽 노드는 버린다.
2. `children` 이 있으면 각 자식에 대해 `parent = 그룹id` 로 채운다. `parent` 만 있고 그 부모에 `children` 이 비어있으면 자식 id 를 모아 채운다. 둘 다 있지만 불일치 → warn + `children` 우선.
3. parent 가 존재하지 않는 id 로 가리키면 warn + top-level 로 승격.
4. kind === "loop" 인데 `iterations` 없음 → 기본 1 로 세팅 + warn.
5. 순환 참조(cycle) 탐지: 엣지 DAG 이어야 한다. cycle 이 발견되면 warn + 해당 엣지 무시. (부모/자식 tree 자체는 cycle 검사 별도.)

### 3.2 레이아웃 단위의 "가시 그래프" 만들기

Dagre 에 넣을 그래프는 **현재 펼침 상태에 따라 달라진다**. 접힌 group/loop 는 **하나의 노드**로, 펼친 group/loop 는 **클러스터 + 내부 노드들**로 표현해야 한다.

알고리즘 (`buildVisibleGraph`):
```ts
function buildVisibleGraph(
  nodes: NormalizedNode[],
  edges: PipelineEdge[],
  expanded: Set<string>,
): VisibleGraph {
  const visible: VisibleNode[] = [];
  const visibleEdges: VisibleEdge[] = [];

  // 1) 자식 → 가장 가까운 "표시되는 조상" 매핑을 만든다.
  //    어떤 노드가 화면에 나타나는가? 자신의 조상 체인에서 가장 가까운 접힌 group/loop 까지 올라갔을 때,
  //    그 접힌 조상이 표시된다 (자기 자신은 숨는다). 조상 체인이 전부 펼쳐져 있으면 자기 자신이 표시된다.
  const visibleAncestorOf = new Map<string, string>();
  for (const n of nodes) {
    let cur: string = n.id;
    let ptr: NormalizedNode | null = n;
    while (ptr?.parent) {
      const parent = byId.get(ptr.parent)!;
      if (!expanded.has(parent.id)) cur = parent.id; // 접힌 조상이 실제 표시 단위
      ptr = parent;
    }
    visibleAncestorOf.set(n.id, cur);
  }

  // 2) visible 집합 = 위 map 의 값 unique.
  const shownIds = new Set(visibleAncestorOf.values());
  for (const id of shownIds) visible.push(makeVisibleNode(byId.get(id)!));

  // 3) 엣지 투영: 원본 엣지의 from/to 를 각자의 visibleAncestor 로 치환.
  //    self-loop (from === to) 가 되면 드랍. 중복 엣지는 합치되 fanOut/label 은 그대로 전달.
  const seen = new Map<string, VisibleEdge>();
  for (const e of edges) {
    const f = visibleAncestorOf.get(e.from) ?? e.from;
    const t = visibleAncestorOf.get(e.to)   ?? e.to;
    if (f === t) continue;
    const key = `${f}->${t}`;
    if (!seen.has(key)) seen.set(key, { from: f, to: t, raws: [] });
    seen.get(key)!.raws.push(e);
  }
  visibleEdges.push(...seen.values());

  // 4) 클러스터 = 펼쳐진 group/loop 노드. Dagre 의 setParent() 로 구성.
  const clusters: ClusterInfo[] = [];
  for (const id of shownIds) {
    const n = byId.get(id)!;
    if ((n.kind === "group" || n.kind === "loop") && expanded.has(id)) {
      clusters.push({ id, childIds: n.children.filter(c => shownIds.has(c)) });
    }
  }

  return { visible, visibleEdges, clusters };
}
```

핵심 포인트:
- 어떤 조상이 접혀 있으면 그 조상이 **대신** 나타난다.
- 엣지는 원본 위치에서 **투영**된다(가장 가까운 가시 조상 기준).
- 같은 소스→타깃 쌍의 여러 원본 엣지는 하나로 합친다. UI 에서 "N 개의 연결" 배지 또는 fanOut 으로 요약 가능.

### 3.3 Dagre 로 좌표 얻기

```ts
import dagre from "@dagrejs/dagre";

function layout(visible: VisibleNode[], edges: VisibleEdge[], clusters: ClusterInfo[], opts: LayoutOpts) {
  const g = new dagre.graphlib.Graph({ compound: true, multigraph: false });
  g.setGraph({ rankdir: opts.direction, ranksep: opts.rankSep, nodesep: opts.nodeSep, marginx: 16, marginy: 16 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of visible) {
    const size = measureNode(n);                   // §4 의 카드 크기 계산
    g.setNode(n.id, { width: size.w, height: size.h });
  }
  for (const c of clusters) {
    // Dagre 의 compound 노드는 parent 로 등록 + children 에 대해 setParent
    g.setNode(c.id, { /* 클러스터는 크기가 자동 계산됨 */ });
    for (const child of c.childIds) g.setParent(child, c.id);
  }
  for (const e of edges) g.setEdge(e.from, e.to, {});

  dagre.layout(g);

  const positions = visible.map(n => {
    const { x, y, width, height } = g.node(n.id);
    return { id: n.id, x: x - width / 2, y: y - height / 2, w: width, h: height };
  });
  const clusterBounds = clusters.map(c => {
    const { x, y, width, height } = g.node(c.id);
    return { id: c.id, x: x - width / 2, y: y - height / 2, w: width, h: height };
  });
  const edgePoints = edges.map(e => ({ from: e.from, to: e.to, points: g.edge(e.from, e.to).points }));

  return { positions, clusterBounds, edgePoints, bounds: g.graph() };
}
```

주의:
- Dagre 좌표는 **노드 중심**이다. 위처럼 좌상단으로 변환.
- 클러스터 내부 노드와 클러스터 자신이 **동일 그래프** 에 들어간다 (compound: true). `setParent(childId, clusterId)` 로 소속 선언.
- `layout` 은 **동기** 이고 노드 수 O(n^1.5) ~ O(n²) 수준 — v1 성능 목표 구간에서 즉시 계산 (수백 ms 이내, §12).

### 3.4 노드 크기 측정

노드 카드의 렌더 사이즈는 **레이아웃 전에** 알아야 한다. 세 가지 전략:

1. **문자 기반 추정 (v1 권장)**: 라벨 길이 + 상태 아이콘 + 타이밍 텍스트 길이로 근사. `label.length * charWidth + paddings` 로 너비 계산. 높이는 고정(`kind` 에 따라 56 / 72 / 88 px).
2. **측정용 hidden 레이어**: 실제 카드를 `visibility: hidden; position: absolute` 레이어에 렌더하여 `getBoundingClientRect` 로 측정. 정확하지만 두 번 렌더 비용.
3. **사용자 제공**: `measureNode` prop. v1 에서는 제공하지 않음.

v1 은 (1) 채택. 구현:
```ts
const CHAR_WIDTH = 7.2;   // 실측 (system monospace 13px 기준)
const CARD_PAD_X = 28;    // 좌우 아이콘 + 패딩 합
function measureNode(n: NormalizedNode): { w: number; h: number } {
  const labelW = Math.max(96, Math.min(240, n.label.length * CHAR_WIDTH + CARD_PAD_X));
  const baseH = n.kind === "loop" ? 88 : n.kind === "group" ? 76 : 64;
  return { w: labelW, h: baseH };
}
```

카드 렌더 시 실제 크기가 추정보다 ±n px 작을 수 있지만 엣지는 카드 중앙점으로 연결되므로 눈에 띄는 어긋남은 없다. 필요 시 v1.1 에서 (2) 로 교체.

---

## 4. 노드 카드 시각 설계

### 4.1 공통 구조

모든 카드는 다음 3 층:
```
┌─ Header ──────────────────────────┐   ← 32 px
│ [icon] Label                [⋯]  │
├─ Body ────────────────────────────┤   ← 가변 (16~40 px)
│   subtitle / progress / stats    │
├─ Footer ──────────────────────────┤   ← 20 px
│ duration · badge                  │
└───────────────────────────────────┘
```

- 둥근 모서리 8 px, 테두리 1 px, 그림자 없음(성능).
- **상태 색**은 왼쪽 4 px accent stripe + header 텍스트 color 로 표현. 배경은 status 에 무관하게 `palette.cardBg` 고정 — 캔버스가 어두워지는 걸 방지.

### 4.2 상태 매핑

```ts
const statusPalette = {
  light: {
    pending:   { accent: "#9ca3af", fg: "#374151", icon: "⏺" },  // grey
    running:   { accent: "#3b82f6", fg: "#1e3a8a", icon: "▶" },  // blue + 애니메이션
    success:   { accent: "#10b981", fg: "#065f46", icon: "✓" },  // green
    failed:    { accent: "#ef4444", fg: "#7f1d1d", icon: "✕" },  // red
    skipped:   { accent: "#d1d5db", fg: "#6b7280", icon: "↷" },  // muted
    cancelled: { accent: "#f59e0b", fg: "#92400e", icon: "⏹" },  // amber
  },
  dark: { /* 동일 구조의 dark 톤 */ }
};
```

`running` 은 accent stripe 에 CSS 애니메이션 (opacity 0.4 → 1 → 0.4, 1.2s infinite).

### 4.3 kind 별 특화

**task**:
- Header 아이콘 = 상태 아이콘.
- Body = (subtitle 생략 가능) — 진행률 prop 이 있으면 `<ProgressBar>`.
- Footer = `1.3s` 또는 `12:04 → 12:05` 같은 duration.

**group** (접힘):
- Header 아이콘 = `▸` (펼치기) + 상태 집계 아이콘.
- Body = `3 steps · 2 succeeded · 1 running` 같은 요약.
- Footer = 집계 duration (자식 중 min startedAt ~ max endedAt).
- 클릭 시 펼침 토글 (header 의 `▸` 영역 또는 전체 카드).

**group** (펼침):
- 카드 자체는 사라지고 **클러스터 컨테이너**로 대체 (§5 참조).

**loop** (접힘):
- **3D 스택 효과**: 카드 뒤에 2 개의 살짝 어긋난 그림자 카드가 겹쳐 보인다.
  ```css
  position: relative;
  &::before, &::after {
    content: ""; position: absolute; inset: 0;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--cardBg);
  }
  &::before { transform: translate(4px, 4px); opacity: 0.5; z-index: -1; }
  &::after  { transform: translate(8px, 8px); opacity: 0.25; z-index: -2; }
  ```
- Header = `⟳ Label (3×)`. 실행 중이면 `⟳ Train (2/3)`.
- Body = 현재 반복 진행률 (`currentIteration/iterations` 을 bar 로).
- Footer = 평균 iteration 시간.
- 펼치기 버튼이 카드 우측 끝 `▸`.

**loop** (펼침):
- 기본적으로 **한 번의 서브그래프**를 클러스터로 렌더 (루프 바디).
- 추가 옵션(후속): "iteration strip" — iterations 개수만큼 가로로 바디를 반복 표시. v1 에서는 클러스터 1 개로 단순화.

### 4.4 카드 내부 DOM (의사코드)

```tsx
<div
  data-node-id={n.id}
  role="button"
  tabIndex={0}
  aria-selected={selected}
  style={{
    position: "absolute",
    left: pos.x, top: pos.y,
    width: pos.w, height: pos.h,
    borderRadius: 8,
    border: `1px solid ${palette.border}`,
    background: palette.cardBg,
    color: palette.fg,
    overflow: "hidden",
    cursor: "pointer",
    outline: selected ? `2px solid ${palette.selectionRing}` : "none",
    outlineOffset: 2,
    transition: "outline 120ms",
  }}
  onClick={e => { e.stopPropagation(); onSelect(n.id); }}
  onDoubleClick={e => { e.stopPropagation(); onNodeDoubleClick?.(n.raw); }}
  onKeyDown={handleKey}
>
  {/* accent stripe */}
  <div style={{ position: "absolute", left: 0, top: 0, width: 4, height: "100%", background: status.accent }} />

  <header style={{ padding: "8px 10px 6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
    <StatusIcon status={n.status} />
    <span style={{ flex: 1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {n.label}
    </span>
    {(n.kind === "group" || n.kind === "loop") && (
      <button onClick={e => { e.stopPropagation(); toggleExpand(n.id); }}>
        {expanded ? "▾" : "▸"}
      </button>
    )}
    {n.badge && <span className="badge">{n.badge}</span>}
  </header>

  <div className="body" style={{ padding: "0 14px", fontSize: 11, color: palette.mutedFg }}>
    {renderBody(n)}
  </div>

  <footer style={{ padding: "4px 14px 8px", fontSize: 10, color: palette.mutedFg, display: "flex", justifyContent: "space-between" }}>
    <span>{formatDuration(n)}</span>
    {n.kind === "loop" && <span>{n.currentIteration ?? "–"}/{n.iterations}</span>}
  </footer>
</div>
```

### 4.5 카드 색상 토큰

```ts
const palette = {
  light: {
    canvasBg:      "#f9fafb",
    cardBg:        "#ffffff",
    border:        "rgba(0,0,0,0.10)",
    fg:            "#111827",
    mutedFg:       "#6b7280",
    selectionRing: "#2563eb",
    edgeFg:        "rgba(0,0,0,0.45)",
    edgeFgDim:     "rgba(0,0,0,0.18)",
    clusterBg:     "rgba(0,0,0,0.025)",
    clusterBorder: "rgba(0,0,0,0.10)",
    inspectorBg:   "#ffffff",
    inspectorBorder: "rgba(0,0,0,0.08)",
    tooltipBg:     "rgba(17,24,39,0.95)",
    tooltipFg:     "#f9fafb",
  },
  dark: { /* ... */ },
};
```

---

## 5. 클러스터 (펼친 group/loop)

Dagre compound 가 계산해준 클러스터 bounds 를 받아, 내부 노드 뒤로 **배경 박스 + 제목 스트립**을 렌더한다.

```tsx
{clusterBounds.map(c => {
  const node = byId.get(c.id)!;
  return (
    <div key={c.id} style={{
      position: "absolute",
      left: c.x - clusterPadding, top: c.y - clusterPadding - 22,
      width: c.w + clusterPadding * 2, height: c.h + clusterPadding * 2 + 22,
      background: palette.clusterBg,
      border: `1px dashed ${palette.clusterBorder}`,
      borderRadius: 10,
      pointerEvents: "none",  // 안쪽 카드 클릭을 막지 않도록
      zIndex: 0,
    }}>
      <div style={{
        position: "absolute", top: 4, left: 10, fontSize: 11, color: palette.mutedFg,
        display: "flex", alignItems: "center", gap: 6,
        pointerEvents: "auto",
      }}>
        <button onClick={() => toggleExpand(c.id)}>▾</button>
        <span>{node.label}</span>
        {node.kind === "loop" && <span>({node.iterations}×)</span>}
      </div>
    </div>
  );
})}
```

주의:
- `pointerEvents: "none"` 은 클러스터 배경에만, 제목 스트립에는 `pointerEvents: "auto"` 로 되살린다 (접기 버튼 동작).
- 클러스터는 `z-index: 0`, 노드 카드는 `z-index: 1`, 엣지 레이어는 `z-index: 2` 가 기본.

**루프 스택 시각화 (대안안)**: 펼친 loop 를 "단일 바디 서브그래프" 로만 표시하면 반복성이 드러나지 않는다. 각 iteration 을 가로로 펼쳐 복제하려면 엣지 데이터 복제 + 하이라이트된 iteration 카드 등이 필요하다 — **v1 제외**, clusters[i].kind === "loop" 에는 배지 `(N×)` 만 추가.

---

## 6. 엣지 레이어 (SVG)

### 6.1 구조

팬/줌 트랜스폼 아래 `<svg>` 레이어를 두어 Dagre 가 돌려준 `points` 를 곡선으로 그린다.

```tsx
<svg
  style={{ position: "absolute", inset: 0, width: bounds.width, height: bounds.height, overflow: "visible", pointerEvents: "none" }}
>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={palette.edgeFg} />
    </marker>
  </defs>
  {edgePoints.map(e => {
    const d = catmullRom(e.points);             // §6.2
    return (
      <g key={`${e.from}->${e.to}`} style={{ pointerEvents: "stroke" }}
         onMouseEnter={() => setHoverEdge(e)} onMouseLeave={() => setHoverEdge(null)}>
        <path
          d={d}
          stroke={e.variant === "dashed" ? palette.edgeFg : e.color ?? palette.edgeFg}
          strokeWidth={hoverEdge === e ? 2.5 : 1.5}
          strokeDasharray={e.variant === "dashed" ? "6 4" : e.variant === "dotted" ? "2 3" : undefined}
          fill="none"
          markerEnd="url(#arrow)"
        />
        {e.label && <text {...labelPos(e.points)}>{e.label}</text>}
        {e.fanOut && <FanOutBadge count={e.fanOut.count} label={e.fanOut.label} {...midPoint(e.points)} />}
      </g>
    );
  })}
</svg>
```

### 6.2 곡선 보간

Dagre 는 `points: {x,y}[]` 를 돌려주는데 (첫/끝 포함), 이걸 그대로 `L` 커맨드로 이으면 각이 생겨 예쁘지 않다. **Catmull-Rom → Bezier** 변환:

```ts
function catmullRom(pts: Array<{x:number;y:number}>, tension = 0.5): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6 * tension * 2;
    const cp1y = p1.y + (p2.y - p0.y) / 6 * tension * 2;
    const cp2x = p2.x - (p3.x - p1.x) / 6 * tension * 2;
    const cp2y = p2.y - (p3.y - p1.y) / 6 * tension * 2;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}
```

### 6.3 FanOut 배지

```tsx
function FanOutBadge({ count, label, x, y }: {count:number; label?:string; x:number; y:number}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-18} y={-10} width={36} height={20} rx={10} fill={palette.cardBg} stroke={palette.edgeFg} />
      <text textAnchor="middle" y={4} fontSize={10} fill={palette.fg}>×{count}</text>
    </g>
  );
}
```

라벨은 배지 아래에 `<text>` 하나 더 (mutedFg). 짧은 텍스트만(≤ 16자) 표시.

### 6.4 중복 엣지 vs fan-out 차이

- **중복 엣지** (§3.2 에서 같은 from/to 쌍이 여럿이었던 경우) = 서로 다른 의미(예: train → export 가 model/weights/metrics 3 개를 전달). 하나의 엣지로 합치되 hover 시 툴팁에 "3 connections" 요약, 인스펙터에서 각각 볼 수 있도록 raws 배열 유지.
- **fanOut** = 한 소스에서 N 개의 runtime 인스턴스가 파생 (예: Map-Reduce, epoch-wise 분기). 엣지의 `fanOut.count` 는 사용자가 명시. 시각적으로 `×N` 배지.

### 6.5 엣지 클릭

`pointerEvents: "stroke"` 덕분에 곡선에 가까운 픽셀만 이벤트를 받는다. 클릭 → `selection` 은 노드에만 적용(엣지 선택은 v1 미지원), hover 툴팁만 표시.

---

## 7. 팬/줌 (Viewport)

### 7.1 트랜스폼 구조

```
<div class="pg-root"> (position: relative, overflow: hidden, 이 요소가 팬/줌 이벤트 수신)
  <div class="pg-viewport" style={{ transform: `translate(${x}px, ${y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
    <div class="pg-layer-clusters">  ... </div>
    <div class="pg-layer-nodes">     ... </div>
    <svg  class="pg-layer-edges">    ... </svg>
  </div>
  <div class="pg-controls">          ... </div>
  <Inspector />
</div>
```

모든 노드/엣지/클러스터 좌표는 **그래프 공간**이고, `pg-viewport` 의 transform 으로 일괄 변환.

### 7.2 입력 → 뷰포트 변환

```ts
function screenToGraph(clientX: number, clientY: number, rootRect: DOMRect, vp: Viewport) {
  return {
    x: (clientX - rootRect.left - vp.x) / vp.zoom,
    y: (clientY - rootRect.top  - vp.y) / vp.zoom,
  };
}
```

### 7.3 이벤트

- **wheel** → 줌. `ctrlKey`(맥에서는 pinch) 또는 meta 무관하게 기본 줌.
  ```ts
  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = rootRef.current!.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const scale = Math.exp(-e.deltaY * 0.001);         // 부드러운 로그 줌
    const nextZoom = clamp(vp.zoom * scale, 0.25, 2.5);
    // 커서 기준 줌 보정
    const nx = cx - (cx - vp.x) * (nextZoom / vp.zoom);
    const ny = cy - (cy - vp.y) * (nextZoom / vp.zoom);
    setViewport({ x: nx, y: ny, zoom: nextZoom });
  }
  ```
  **단, shift 누름 상태에서는 세로 스크롤을 가로 팬으로 해석**하지 않는다 (v1 단순화).

- **pointerdown + drag** → 팬. 시작 조건:
  - 루트 배경(= 노드/엣지/클러스터 헤더가 아닌 빈 공간)에서 눌렀거나,
  - Space 키를 누르고 있는 상태에서 아무 곳이나 눌렀을 때.
  ```ts
  function onPointerDown(e: PointerEvent) {
    if (!isBackground(e.target) && !isSpaceDown) return;
    rootRef.current!.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, vp0: vp };
  }
  function onPointerMove(e: PointerEvent) {
    if (!drag.current) return;
    setViewport({ ...drag.current.vp0, x: drag.current.vp0.x + (e.clientX - drag.current.startX),
                                       y: drag.current.vp0.y + (e.clientY - drag.current.startY) });
  }
  function onPointerUp() { drag.current = null; }
  ```

- **dblclick on background** → fit-to-content (= §7.4).

### 7.4 fit-to-content

```ts
function fit(bounds: { width: number; height: number }, container: { width: number; height: number }, padding = 40) {
  const zoom = Math.min(
    (container.width  - padding * 2) / bounds.width,
    (container.height - padding * 2) / bounds.height,
    1.5,  // 지나친 확대 방지
  );
  const x = (container.width  - bounds.width  * zoom) / 2;
  const y = (container.height - bounds.height * zoom) / 2;
  return { x, y, zoom };
}
```

초기 렌더 시 `defaultViewport` 가 없으면 자동 fit. 레이아웃이 바뀔 때(= expansion 변화) 는 **자동 re-fit 하지 않음** — 사용자 mental model 유지. 재적용은 우하단 `Fit` 버튼 또는 `0` 키.

### 7.5 줌 컨트롤 UI

우하단 absolute:
```
┌───┐
│ + │  줌 인
│ − │  줌 아웃
│ ⊙ │  fit
└───┘
```

각 버튼 `onClick` 은 중앙 기준 줌 ±20%, fit 은 §7.4.

### 7.6 뷰포트 상태 관리

- `useControllable` 사용:
  ```ts
  const [viewport, setViewport] = useControllable(props.viewport, props.defaultViewport ?? null, props.onViewportChange);
  ```
- `defaultViewport` 가 null 이면 마운트 후 **최초 레이아웃 계산이 끝난 시점**에 자동 fit 결과를 내부 상태로 초기화.
- `defaultViewport` 가 지정되면 그 값을 그대로 초기값으로.

---

## 8. 인스펙터 패널

### 8.1 레이아웃

`inspector.position` 에 따라 우측 사이드 또는 하단 스트립.

- `right`: root flexbox. `[Canvas flex:1] [Divider 6px] [Inspector width:defaultSize]`.
- `bottom`: column flexbox. `[Canvas flex:1] / [Divider 6px] / [Inspector height:defaultSize]`.
- `none`: 인스펙터 자체 없음. 선택 발생해도 패널 안 열림. `renderNode` 안에서 자체적으로 처리할 때 유용.

divider 는 드래그로 리사이즈 가능. 마우스 커서 `col-resize` / `row-resize`. 최소/최대는 container 의 20% ~ 80%.

### 8.2 탭

```
┌──────────────────────────────────────┐
│ [Input] [Output] [Internal] [Logs] [Timing] [Error]
├──────────────────────────────────────┤
│                                      │
│   탭 내용                            │
│                                      │
└──────────────────────────────────────┘
```

- `inspector.tabs` 로 제한 가능. 기본 순서: Output, Input, Internal, Logs, Timing, Error.
- `error` 탭은 `status === "failed"` 일 때만 active 배지 + 빨간 점.
- `logs` 탭은 logs 가 없으면 disabled (클릭 불가, opacity 0.5).

### 8.3 탭 별 기본 렌더

- **Input / Output / Internal**: 값이 `string` 이면 `<CodeView language="text">`, 그 외는 `<CodeView language="json">` 으로 `JSON.stringify(value, null, 2)` 프린트.
- **Logs**: 구조화된 로그는 표 형태 (`DataTable`?), 문자열 배열은 monospace preformatted. 레벨별 색상 (debug/info/warn/error).
- **Timing**:
  - `startedAt`, `endedAt`, `durationMs` 필드를 읽어 "2024-01-15 12:04:21.123 → 12:04:22.456 (1.333 s)" 표기.
  - loop 의 경우 `iterations`, `currentIteration`, 평균 iteration 시간 (계산 가능하면).
  - 가능하면 mini timeline bar 한 줄 — 자식 노드 타이밍을 수평 바로 (group 선택 시만).
- **Error**: `error.message` 볼드, `error.stack` 은 `<CodeView language="text">`.

### 8.4 `renderInspectorValue` 훅

사용자가 커스텀 렌더를 주입할 수 있다.
```ts
renderInspectorValue?: (node, tab, value) => React.ReactNode | undefined;
```
반환값 `undefined` 면 기본 렌더 fallback. 사용 예:
- 이미지 데이터 (`Uint8Array` + mime) → `<img src={blobUrl}>` 프리뷰.
- 거대한 배열 → 처음 100 개만 표시 + "show more" 링크.
- 도메인 특화 구조 (예: 모델 weights shape 요약).

### 8.5 CodeView 연동

인스펙터 내부 JSON 표시에는 `CodeView` 를 재사용 (라인 번호, 복사 버튼 무료). 긴 JSON 은 `CodeView` 자체의 스크롤로.

---

## 9. 상태 관리 (controlled / uncontrolled)

모든 상호작용 상태는 dual-API:

```ts
const [selection,   setSelection]   = useControllable(props.selection,   props.defaultSelection   ?? null, props.onSelectionChange);
const [expandedArr, setExpandedArr] = useControllable(props.expansion,   props.defaultExpansion   ?? [],   props.onExpansionChange);
const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);
function toggleExpand(id: string) {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id); else next.add(id);
  setExpandedArr([...next]);
}
const [viewport,   setViewport]   = useControllable(props.viewport,   props.defaultViewport   ?? null, props.onViewportChange);
```

viewport 는 initial fit 이 측정 완료 후 일어나므로 `null` 초기값을 허용하는 내부 상태를 별도 관리하는 것이 실제론 깔끔하다 (아래 §10.useGraphLayout 참조).

---

## 10. 파일 구조 · 훅 분해

```
src/components/PipelineGraph/
├── PipelineGraph.tsx              # 조립 + 렌더 (메인)
├── PipelineGraph.types.ts         # public 타입
├── PipelineGraph.utils.ts         # 정규화, 엣지 투영, 포맷터
├── PipelineGraphNode.tsx          # 노드 카드 (memo)
├── PipelineGraphEdge.tsx          # 엣지 레이어 (<svg>)
├── PipelineGraphCluster.tsx       # 클러스터 배경 + 헤더
├── PipelineGraphInspector.tsx     # 우측/하단 패널
├── useGraphLayout.ts              # nodes/edges/expansion → {positions, edgePoints, bounds}
├── usePanZoom.ts                  # wheel/drag → viewport
├── theme.ts                       # palette, statusPalette
└── index.ts                       # 배럴
```

각 파일 책임:

- **PipelineGraph.tsx**
  - props 디스트럭처링 + 정규화 (`useMemo(() => normalize(nodes, edges), [nodes, edges])`)
  - `useControllable` 3 종.
  - `useGraphLayout` 호출 → positions, edgePoints, clusterBounds, bounds.
  - `usePanZoom` 호출 → viewport 이벤트 핸들러.
  - `<div ref={rootRef}>` + `<div transform>` + `<svg edges>` + `<div nodes>` + `<Inspector>`.

- **PipelineGraph.utils.ts**
  - `normalize(nodes, edges): { byId, topoNodes, validatedEdges }`
  - `buildVisibleGraph(normalized, expanded): VisibleGraph` (§3.2)
  - `formatDuration(n: NormalizedNode): string`
  - `catmullRom(points): string`
  - `labelPos(points): {x, y}`, `midPoint(points): {x, y}`
  - `fit(bounds, container, padding): Viewport`

- **useGraphLayout.ts**
  - `useMemo` 로 Dagre 실행. 의존: normalized, expanded, direction, rankSep, nodeSep, clusterPadding.
  - 반환: `{ positions, clusterBounds, edgePoints, bounds }`.
  - 비활성 상태(마운트 전)에도 안전하도록 빈 배열 fallback.

- **usePanZoom.ts**
  - root ref 를 받아 pointer/wheel/keyboard 이벤트 바인딩.
  - `isSpaceDown` keyboard listener.
  - 반환: `{ viewport, setViewport, onWheel, onPointerDown, onPointerMove, onPointerUp, fit: () => void }`.

- **PipelineGraphNode.tsx**
  - `React.memo` + 얕은 비교. props 는 (node, selected, expanded, onSelect, onToggle, renderNode, theme).
  - 키보드 Enter → `onSelect`, Space → `onToggle` (group/loop 만).

- **PipelineGraphEdge.tsx**
  - `edgePoints` 배열을 받아 `<path>` 반복. hover 상태는 내부 useState.

- **PipelineGraphCluster.tsx**
  - `clusterBounds` 배열 + 정규화된 node 맵 + toggleExpand.

- **PipelineGraphInspector.tsx**
  - 선택된 node 를 prop 으로. 탭 state 내부. 리사이즈 divider drag 내부.
  - 탭 렌더링 `switch(tab) { ... }` — 기본 동작 + `renderInspectorValue` 훅.

- **theme.ts**
  - palette, statusPalette, 그 외 z-index 상수.

---

## 11. 구현 단계 (agent 가 순차 실행)

각 단계는 독립 커밋 권장. 각 커밋이 `npm run typecheck` + `npx tsup` 통과 상태를 유지한다.

### Step 1 — 의존성 + 타입 + 배럴
1. `npm install @dagrejs/dagre @types/dagre` (peer 아닌 dev 의존이 아니라 실제 런타임 dep).
2. `package.json` 의 `dependencies` 에 `@dagrejs/dagre` 추가 (이미 dep 인지 확인). `@types/dagre` 는 devDependencies. 단 `@dagrejs/dagre` 는 자체 타입 포함이므로 `@types/dagre` 는 필요 없을 수 있음 — `node_modules/@dagrejs/dagre/dist/dagre.d.ts` 존재 확인 후 결정.
3. `PipelineGraph.types.ts` 생성 (§2.1 전부).
4. `theme.ts` 생성 (palette, statusPalette).
5. `index.ts` 배럴.
6. `src/components/index.ts` 에 `export * from "./PipelineGraph";`.
7. `PipelineGraph.tsx` 는 일단 `export function PipelineGraph(p: PipelineGraphProps) { return <div /> }` placeholder.
8. `npm run typecheck` 통과.
9. 커밋: `feat(PipelineGraph): 타입 + 테마 토큰 + 배럴`.

### Step 2 — 정규화 유틸
1. `PipelineGraph.utils.ts` 에 `normalize`, `buildVisibleGraph`, 포맷터, catmullRom 등 구현.
2. 단위 테스트는 하지 않음 (레포에 테스트 러너 없음) — 대신 컴포넌트 사용 시 dev 콘솔 경고로 검증.
3. 커밋: `feat(PipelineGraph): 입력 정규화 + 가시 그래프 구성`.

### Step 3 — 레이아웃 훅
1. `useGraphLayout.ts` 에서 Dagre 호출 + 결과 변환 (좌상단 좌표, bounds).
2. `measureNode` 는 `PipelineGraph.utils.ts` 또는 훅 내부. v1 은 문자 기반 추정 (§3.4).
3. 커밋: `feat(PipelineGraph): Dagre 레이아웃 훅`.

### Step 4 — 정적 렌더 (팬/줌 없이)
1. `PipelineGraph.tsx` 에서 훅을 호출하고 `positions`/`clusterBounds`/`edgePoints` 를 바탕으로 DOM 을 그린다.
2. 노드 카드, 클러스터 박스, SVG 엣지 전부 렌더. 단 transform 은 고정 (0,0,1).
3. 데모 페이지 stub 에 5~6 노드 예시 하나 렌더해 시각 확인.
4. 커밋: `feat(PipelineGraph): 정적 DOM 렌더 (노드+엣지+클러스터)`.

### Step 5 — 선택 + 펼침
1. `useControllable` 3 종 통합 (viewport 는 다음 단계).
2. 노드 클릭 → selection, group/loop 카드의 ▸ 클릭 → 펼침 토글.
3. 펼침 변경 시 레이아웃 재계산(`useMemo` 키가 expanded 에 의존).
4. 커밋: `feat(PipelineGraph): 선택 + group/loop 펼침 토글`.

### Step 6 — 인스펙터 패널
1. `PipelineGraphInspector.tsx` 구현. 탭 6 종, 기본 JSON 렌더, `renderInspectorValue` 훅.
2. divider 리사이즈.
3. 커밋: `feat(PipelineGraph): 인스펙터 패널 (6 탭)`.

### Step 7 — 팬/줌
1. `usePanZoom.ts` 구현.
2. 마운트 후 최초 fit-to-content.
3. 우하단 줌 컨트롤.
4. 커밋: `feat(PipelineGraph): 팬/줌 + fit-to-content`.

### Step 8 — 키보드 네비게이션
1. viewport 또는 root 를 `tabIndex=0` 으로. Tab 으로 진입 → 첫 노드 포커스.
2. Arrow 키: 레이아웃 기준 인접 노드 이동 (방향 = LR 에서 Right/Left 는 rank 이동, Up/Down 은 sibling).
3. Enter = 선택, Space = 펼침, Esc = 해제, + / − / 0.
4. 커밋: `feat(PipelineGraph): 키보드 네비게이션`.

### Step 9 — 엣지 호버 + 배지 + 커스텀 노드 렌더
1. 엣지 hover 시 stroke 두꺼워짐 + tooltip.
2. fanOut 배지.
3. `renderNode` 훅 반영.
4. 커밋: `feat(PipelineGraph): 엣지 hover + fanOut + renderNode`.

### Step 10 — Dark 테마
1. palette dark 보강.
2. `theme="dark"` prop 전달 경로 확인.
3. 커밋: `feat(PipelineGraph): Dark 테마`.

### Step 11 — 데모 페이지
1. `demo/src/pages/PipelineGraphPage.tsx` 작성 (§12).
2. `demo/src/App.tsx` 의 `NAV` 및 `Page` 타입에 `"pipelinegraph"` 추가.
3. 시각 확인 (브라우저).
4. 커밋 단위는 섹션별 분리 권장 (Basic / Grouping / Loop / FanOut / Controlled / Inspector / Dark / Large / Props / Usage / Playground).

### Step 12 — 마감
1. Props 표 채움 + Usage 예제.
2. `docs/plans/012-pipelinegraph-component.md` 의 `§14 Definition of Done` 전부 체크.
3. 커밋: `feat(PipelineGraph): 데모 페이지 + props 표 마감`.

---

## 12. 데모 페이지 설계

`demo/src/pages/PipelineGraphPage.tsx`. 기존 페이지(CodeViewPage, HexViewPage, CommandPalettePage) 구조 복제 — 섹션별 `<section id="...">` + 우측 사이드바 `NAV` 연동.

### 12.1 샘플 데이터

```ts
// 상단 상수로
const BASIC: PipelineInput = {
  nodes: [
    { id: "ingest",   label: "Ingest",   status: "success", timing: { startedAt: 0, endedAt: 120 } },
    { id: "clean",    label: "Clean",    status: "success", timing: { startedAt: 120, endedAt: 220 } },
    { id: "analyze",  label: "Analyze",  status: "running", timing: { startedAt: 220 } },
    { id: "export",   label: "Export",   status: "pending" },
  ],
  edges: [
    { from: "ingest", to: "clean" },
    { from: "clean",  to: "analyze" },
    { from: "analyze", to: "export" },
  ],
};

const WITH_GROUP: PipelineInput = {
  nodes: [
    { id: "ingest",   label: "Ingest",  status: "success" },
    { id: "validate", label: "Validate", kind: "group", status: "success",
      children: ["schema", "bounds", "types"] },
    { id: "schema",   label: "Schema",   parent: "validate", status: "success" },
    { id: "bounds",   label: "Bounds",   parent: "validate", status: "success" },
    { id: "types",    label: "Types",    parent: "validate", status: "success" },
    { id: "export",   label: "Export",   status: "pending" },
  ],
  edges: [
    { from: "ingest", to: "validate" },
    { from: "validate", to: "export" },
    { from: "schema", to: "bounds" },
    { from: "bounds", to: "types" },
  ],
};

const WITH_LOOP: PipelineInput = {
  nodes: [
    { id: "init",    label: "Init",     status: "success" },
    { id: "train",   label: "Train",    kind: "loop", iterations: 10, currentIteration: 4,
      status: "running", children: ["fwd", "loss", "bwd"] },
    { id: "fwd",     label: "Forward",  parent: "train", status: "running" },
    { id: "loss",    label: "Loss",     parent: "train", status: "pending" },
    { id: "bwd",     label: "Backward", parent: "train", status: "pending" },
    { id: "eval",    label: "Evaluate", status: "pending" },
  ],
  edges: [
    { from: "init",  to: "train" },
    { from: "train", to: "eval", fanOut: { count: 10, label: "per-epoch metrics" } },
    { from: "fwd",   to: "loss" },
    { from: "loss",  to: "bwd" },
    { from: "bwd",   to: "fwd", label: "next iter" }, // 루프 내부 cycle — dagre 엣지로는 허용 X, 무시됨
  ],
};

function makeLarge(nodeCount: number): PipelineInput { /* 격자 형태로 N 개 생성 */ }
```

### 12.2 섹션 구성

`App.tsx` 의 NAV 에 추가:
```ts
{ id: "pipelinegraph", label: "PipelineGraph", description: "스텝 기반 DAG 뷰어", sections: [
  { label: "Basic",              id: "basic" },
  { label: "Direction",          id: "direction" },
  { label: "Grouping",           id: "grouping" },
  { label: "Loop",               id: "loop" },
  { label: "Fan-out",            id: "fanout" },
  { label: "Status palette",     id: "status" },
  { label: "Controlled",         id: "controlled" },
  { label: "Inspector",          id: "inspector" },
  { label: "Custom node render", id: "custom-node" },
  { label: "Dark theme",         id: "dark" },
  { label: "Large graph",        id: "large" },
  { label: "Props",              id: "props" },
  { label: "Usage",              id: "usage" },
  { label: "Playground",         id: "playground" },
]}
```

### 12.3 Playground

상단 컨트롤 바:
- `direction` 라디오 (LR / TB)
- `rankSep` slider (32~160)
- `nodeSep` slider (16~96)
- `theme` 토글 (light / dark)
- `inspector.position` 라디오 (right / bottom / none)
- `preset` 드롭다운 (basic / with-group / with-loop / large-50 / large-200)
- `interactive` 체크박스
- `Fit` 버튼 (= setViewport 재계산)

아래에 `<PipelineGraph>` 하나 (height 70vh).

### 12.4 Props 표

다른 페이지의 Props 표 패턴 그대로. 주요 prop × 타입 × 기본값 × 설명.

### 12.5 Usage 스니펫

- 최소 예시 (nodes/edges 만).
- Controlled selection 예시 (외부 state).
- 인스펙터 커스터마이징 예시 (`renderInspectorValue` 로 이미지 미리보기).
- 동적 업데이트 예시 (setInterval 로 상태 변화 — 실시간 감성 데모).

---

## 13. 검증 계획

### 13.1 자동화

```bash
cd /Users/neo/workspace/plastic
npm run typecheck
npx tsup
```

주의:
- `exactOptionalPropertyTypes: true` — 모든 optional prop 은 `?:` 로, 전달 시 `undefined` 분기. prop 분해 후 디폴트 머지에서 자주 걸림.
- `noUncheckedIndexedAccess: true` — `nodes[i]` 는 `T | undefined`. normalize 후의 `byId.get(id)!` 패턴 흔하게 사용.
- `verbatimModuleSyntax: true` — 타입-only import 는 `import type { ... }`.

### 13.2 수동 (demo dev server)

```bash
cd demo && npm run dev
```

체크리스트:
- [ ] **Basic**: 4 노드 LR 배치, 엣지 3 개 직선 곡선으로 연결, 상태별 accent stripe 차이.
- [ ] **Direction TB**: 같은 데이터를 세로로 배치, 엣지 방향 하향.
- [ ] **Grouping**: `validate` 카드 접힘 — 3 자식이 한 카드 안에 "집계". ▸ 클릭 → 펼쳐서 내부 클러스터 표시, 엣지 투영이 올바르게 클러스터 내부 노드로 재지정됨.
- [ ] **Loop**: `train` 접힘 상태에서 뒤에 스택 그림자 2 개, `Train (4/10)` 표시. 펼침 시 루프 바디 (fwd/loss/bwd) 가 클러스터로.
- [ ] **Fan-out**: `train → eval` 엣지 가운데에 `×10` 배지, label "per-epoch metrics" 표시.
- [ ] **Status palette**: 6 상태(pending/running/success/failed/skipped/cancelled) 모두 시각적으로 구분. running 은 accent stripe pulse.
- [ ] **Controlled selection**: 외부 버튼으로 setSelection("clean") → 카드 ring 강조, 인스펙터 패널 업데이트.
- [ ] **Inspector tabs**: failed 노드 선택 → Error 탭 자동 active. success 노드 → Output 탭 기본.
- [ ] **Inspector renderInspectorValue**: 이미지 bytes 를 주입한 노드에서 `<img>` 프리뷰.
- [ ] **Pan**: 빈 공간 드래그 → 그래프 이동.
- [ ] **Zoom**: 휠 → 커서 기준 확대/축소. Shift+휠 등 다른 수식자는 무시.
- [ ] **Fit**: 더블클릭 빈 공간 → 그래프 전체가 화면에 맞게 fit.
- [ ] **Keyboard**: Tab → 첫 노드 포커스 링. Arrow → 인접 노드. Enter → 선택 + 인스펙터 open. Space → (group/loop 일 때) 펼침 토글. Esc → 선택 해제. `+` `-` `0` 줌.
- [ ] **Large graph** (200 노드): 초기 레이아웃 < 500 ms, 팬 60 fps 유지, 줌 60 fps.
- [ ] **Dark theme**: 전환 시 엣지/클러스터/카드/인스펙터 전부 색상 전환.
- [ ] 다른 페이지(CodeView, HexView 등) 리그레션 없음.

### 13.3 엣지 케이스

- [ ] 빈 `nodes=[]` → 빈 캔버스 + "No nodes" placeholder.
- [ ] 한 개 노드만, 엣지 없음 → 중앙 정렬 fit.
- [ ] `nodes` 에 중복 id → dev warn, 뒤쪽 드랍.
- [ ] `parent` 가 존재하지 않는 id → warn, top-level 로 승격.
- [ ] `children` 과 `parent` 불일치 → warn, children 기준.
- [ ] edges 에 cycle → warn, cycle 유발 엣지 하나 드랍 (topological break).
- [ ] `from`/`to` 에 존재하지 않는 node id → warn, 해당 엣지 드랍.
- [ ] 펼친 group 을 다시 접을 때 내부에 선택된 자식이 있었으면 → selection 을 group id 로 **옮긴다** (사라지는 id 가 selection 이 되어 있으면 보이는 최근 조상으로 투영).
- [ ] `direction` 을 LR ↔ TB 바꿀 때 layout 재계산, viewport 는 유지(자동 re-fit 하지 않음).
- [ ] `viewport` 를 controlled 로 쓰면서 외부에서 `{x:0,y:0,zoom:1}` 로 강제 → 그대로 적용.
- [ ] 인스펙터 `position: "none"` → 선택은 되지만 패널 없음 (개발자가 자체 처리).
- [ ] 매우 긴 라벨 (100 자) → 카드 너비 max 240px, ellipsis. 호버 시 full label tooltip (v1 은 생략, v1.1).

---

## 14. 성능 목표 · 병목 · 최적화

### 14.1 목표
- 100 노드/150 엣지: 초기 레이아웃 < 200 ms, 인터랙션 60 fps.
- 500 노드/700 엣지: 초기 레이아웃 < 1 s, 팬/줌 30+ fps.
- 1000+ 노드: 경고 없이 동작하되 fps 는 보장하지 않음. v1.x 에서 노드 culling (뷰포트 밖 렌더 스킵) 추가.

### 14.2 병목 가설
1. **Dagre 레이아웃** — 노드 수에 민감. 500 노드 근처에서 수백 ms. 완화: nodes/edges/expansion identity 가 안 바뀌면 `useMemo` 로 캐시.
2. **DOM 노드 수** — 노드 1 개 = div 5~8 개. 500 노드 = 2500~4000 div. React 렌더 자체는 괜찮지만 style 적용 비용 존재. 완화: `React.memo` + `transform: translateZ(0)` 로 컴포짓 레이어 분리.
3. **SVG path 수** — 700 path 는 무겁지 않지만, hover 시 re-stroke 방식은 path 마다 React 리렌더 유발. 완화: hover 상태는 ref + `dataset.hover` 토글 (HexView 와 동일 전략, §6.2 재참조).
4. **팬/줌 이벤트 빈도** — pointermove 는 60 Hz 이상. 완화: `setViewport` 는 직접 호출 (debounce 없이). React 상태 업데이트가 최대 ~120 Hz 까지 60 fps 를 유지하면 OK. 만약 느리면 `requestAnimationFrame` 에서 한 번만 적용하도록 합치기.

### 14.3 메모 전략
```ts
// 최상위에서
const normalized = useMemo(() => normalize(nodes, edges), [nodes, edges]);
const visible    = useMemo(() => buildVisibleGraph(normalized, expanded), [normalized, expanded]);
const layout     = useMemo(() => doDagreLayout(visible, direction, rankSep, nodeSep), [visible, direction, rankSep, nodeSep]);
```
이 4 단계는 각자 독립적으로 캐시된다. `nodes`/`edges` prop 이 변하지 않으면 expanded 만 바뀌어도 normalize 는 재활용된다.

---

## 15. 접근성

- root: `role="region"` + `aria-label="Pipeline graph"`.
- 노드 카드: `role="button"` + `aria-label="{label}, {status}, {duration}"` + `tabIndex=0` (선택된 것 또는 포커스 후보만 `tabIndex=0`, 나머지 `-1` — roving tabindex).
- 인스펙터: `role="region"` + `aria-label="Inspector"`. 탭 그룹은 `role="tablist"` + 각 탭 `role="tab"`, 콘텐츠 `role="tabpanel"`.
- 엣지: 접근성 대상이 아님 (`aria-hidden="true"`). 엣지 정보는 인스펙터의 "Connections" 요약에 포함 (v1.1).
- 키보드: §11 Step 8 의 키 맵.
- focus ring: 카드의 `outline` 속성만 사용, 색상은 `palette.selectionRing`, 배경 변화 없음.

---

## 16. 알려진 트레이드오프 · 결정

1. **Dagre 선택 이유**: 대안으로 elkjs (더 좋은 레이아웃, but 300 KB+), klay (legacy). Dagre 는 60 KB + 즉시 사용 가능 + compound 지원. 품질은 중간이지만 v1 목표에 충분.
2. **React Flow 를 쓰지 않음**: 번들 크기 + 프로젝트 "의존 최소" 원칙. React Flow 는 편집 기능도 다 들어있어 읽기 뷰어로는 과함. 팬/줌/엣지 렌더는 직접 작성.
3. **HTML 카드 + SVG 엣지**: 순수 SVG 로 카드까지 그리는 방식(Graphviz 스타일) 도 가능하지만 폰트 제어 + 임베드 인터랙션(진행바, 배지) 이 번거롭다. React Flow 와 동일한 하이브리드가 v1 선택.
4. **레이아웃 재계산 트리거**: expansion 변화 시마다 Dagre 재실행. 500 노드에서 수백 ms 가 튈 수 있음 → 체감 더뎌지면 v1.1 에서 부분 재레이아웃 검토.
5. **loop 의 iteration 스트립 vs 단일 바디**: 단일 바디(= 다른 group 과 동일) + `(N×)` 배지. iteration 별 성공/실패는 Internal 탭 데이터로.
6. **인스펙터 위치**: right / bottom 중 "right 기본"— 가로 DAG 이 기본이므로 카드 아래 엣지 레이블과 충돌 적음. TB 방향일 때는 사용자가 `inspector.position="bottom"` 으로 바꿀 수 있다.
7. **뷰포트 자동 re-fit 정책**: expansion/direction 변경 시 **자동 fit 하지 않는다**. 사용자가 구축한 viewing angle 이 갑자기 바뀌면 혼란. 명시적으로 `Fit` 버튼 또는 `0` 키.
8. **엣지 경로 계산**: Dagre 가 돌려준 waypoints 를 catmull-rom 으로 smoothing. 직선/정사각 경로(orthogonal)는 v1 제외.
9. **노드 크기 측정**: 문자 기반 추정 (§3.4). 커스텀 렌더(`renderNode`) 노드는 크기 추정이 어긋날 수 있으므로, 필요하면 `PipelineNode` 에 `size?: {w,h}` 필드를 추후 추가 (v1.1).
10. **상태 한정 6 개**: Airflow 는 14+ 개, Dagster 는 8 개 등. v1 은 가장 공통적인 6 개만. 추가는 `accentColor` + `badge` 로 확장 가능.
11. **엣지 hover 경량 구현**: SVG group 에 React onMouseEnter/Leave 는 작동하지만 엣지 500+ 에서 빈번한 리렌더 위험 → stroke 두께 변경은 ref + DOM 속성 토글로 처리하고 state 는 tooltip 의 "누구 hover?" 에만 사용.

---

## 17. 후속 작업 (v1.1+)

- 미니맵: 우하단 작은 캔버스에 전체 구조 + viewport 프레임.
- 노드 culling: viewport 밖 노드는 `visibility: hidden` (position 은 유지) 으로 렌더 부하 감소.
- 검색 + 필터: Cmd+F → 텍스트 매치 노드 하이라이트, `filter` prop.
- 런 비교 (diff 모드): 두 파이프라인 run 을 좌우 배치 + 변경 노드 강조.
- 편집 기능: `PipelineEditor` 로 별도 컴포넌트 — 드래그로 노드 이동, 포트에서 엣지 그리기.
- 자동 애니메이션: 상태 변화 시 카드 색상 transition, running 노드의 accent pulse.
- 오프로드 레이아웃: 500 노드 이상에서 Dagre 를 Web Worker 로 이관.
- 엣지 라벨 스마트 배치: 겹침 회피 (Dagre 는 엣지 라벨 배치 약함).
- Iteration strip: 펼친 loop 에 iterations 가로 반복 배치(선택적).
- URL hash 연동: `?selected=ingest&expanded=validate,train`.
- Export: 전체 캔버스를 PNG/SVG 로.
- 접근성 2 단계: 엣지 네비게이션, 스크린리더용 요약 뷰.

---

## 18. 관련 파일 인벤토리 (구현 시 참조)

| 용도 | 경로 |
|---|---|
| theme 토큰 패턴 | `src/components/CodeView/CodeView.tsx` (palette 객체) |
| useControllable (dual API) | `src/components/_shared/useControllable.ts` |
| Popover 포지셔닝 (인스펙터 tooltip 용) | `src/components/Popover/*` |
| 가상 스크롤/ResizeObserver 패턴 | `src/components/HexView/useHexVirtualList.ts` |
| 데모 페이지 레이아웃 패턴 | `demo/src/pages/CodeViewPage.tsx`, `demo/src/pages/HexViewPage.tsx` |
| 데모 App 라우팅/NAV | `demo/src/App.tsx` |
| tsconfig 제약 | `tsconfig.json` (strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess, verbatimModuleSyntax) |
| tsup 진입점 | `tsup.config.ts` 또는 `package.json` 의 build 스크립트 |
| JSON 프리뷰 (인스펙터 기본 렌더) | `src/components/CodeView/CodeView.tsx` (language="json") |

---

## 19. 의존성 영향

새로 추가되는 런타임 의존: `@dagrejs/dagre` (~60 KB min, MIT). `package.json` dependencies 에 명시.

번들 영향:
- Tree-shakeable 하지 않은 라이브러리 (전체 포함).
- 소비자 앱 번들 증가: 60 KB (gzip 전), ~18 KB (gzip 후).
- plastic 전체 dist 증가: 현재 약 50 KB → 약 70 KB (gzip). CodeView 의 prism-react-renderer 가 이미 큰 편이므로 비율상 과하지 않음.

대안 확인:
- elkjs (~300 KB, ELK 기반 고품질 레이아웃) — v1 에는 오버킬.
- 직접 레이어드 DAG 작성 (Sugiyama 스타일) — 구현 비용 > 이득.

→ Dagre 채택.

---

## 20. 구현 완료 정의 (Definition of Done)

- [ ] `npm run typecheck` 통과.
- [ ] `npx tsup` 통과 (타입 선언 포함).
- [ ] demo 에 `/#/pipelinegraph` 라우트 동작.
- [ ] §13.2 수동 체크리스트 항목 전부 눈으로 확인.
- [ ] §13.3 엣지 케이스 항목 전부 눈으로 확인 또는 명시적으로 "v1 범위 밖" 이유 기재.
- [ ] CodeView / HexView / CommandPalette / 기타 페이지 리그레션 없음.
- [ ] `src/components/index.ts` 배럴에 export 추가됨.
- [ ] `@dagrejs/dagre` 가 `package.json` dependencies 에 기재됨.
- [ ] Props 문서 섹션이 Props 표로 채워져 있음.
- [ ] Usage 섹션에 최소 4 개 스니펫 (기본/controlled/inspector 커스텀/동적 업데이트).

---

**끝.**
