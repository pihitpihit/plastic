import type { ReactNode } from "react";

export type PipelineGraphTheme = "light" | "dark";

export type PipelineGraphDirection = "LR" | "TB";

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
  /** 수동 duration 지정 (startedAt/endedAt 없이 사용 시, ms 단위) */
  durationMs?: number;
}

export interface PipelineNodeLog {
  /** 로그 라인 timestamp (epoch ms) */
  t?: number;
  level?: "debug" | "info" | "warn" | "error";
  message: string;
}

export interface PipelineNodeError {
  message: string;
  stack?: string;
  cause?: unknown;
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
  /** group/loop 자식 id 목록. */
  children?: string[];
  /** kind === "loop" 일 때 총 반복 횟수. */
  iterations?: number;
  /** 현재 실행 중인 반복 번호 (1-based). running 일 때만 의미. */
  currentIteration?: number;

  /** 인스펙터 Input 탭 데이터. */
  input?: unknown;
  /** 인스펙터 Output 탭 데이터. */
  output?: unknown;
  /** 인스펙터 Internal 탭 데이터 (환경변수/파라미터/중간 상태 등). */
  internal?: unknown;
  /** 인스펙터 Logs 탭. */
  logs?: string[] | PipelineNodeLog[];
  /** 인스펙터 Error 탭 — failed 상태에서만 의미. */
  error?: PipelineNodeError;

  /** 카드 우상단 사용자 정의 배지. */
  badge?: string;
  /** status 색상을 덮어쓰는 accent. */
  accentColor?: string;
  /** 추가 className. */
  className?: string;
}

export interface PipelineEdge {
  /** 소스 노드 id. */
  from: string;
  /** 타깃 노드 id. */
  to: string;
  /** 엣지 레이블. */
  label?: string;
  /** Fan-out 표시 (한 소스가 N 개의 runtime 인스턴스로 분기). */
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

export type PipelineInspectorTab =
  | "input"
  | "output"
  | "internal"
  | "logs"
  | "timing"
  | "error";

export interface PipelineGraphInspectorConfig {
  /** 패널 위치. 기본 "right". */
  position?: "right" | "bottom" | "none";
  /** 초기 너비/높이 (px). right = width, bottom = height. 기본 380 / 280. */
  defaultSize?: number;
  /** 기본 탭. 기본 "output" (또는 status === "failed" 일 때 "error"). */
  defaultTab?: PipelineInspectorTab;
  /** 보이게 할 탭만 필터. 기본 모두. */
  tabs?: PipelineInspectorTab[];
}

export interface PipelineGraphProps {
  /** 노드 배열. */
  nodes: PipelineNode[];
  /** 엣지 배열. */
  edges: PipelineEdge[];

  /** 레이아웃 방향. 기본 "LR". */
  direction?: PipelineGraphDirection;
  /** Dagre rank 간격. 기본 96. */
  rankSep?: number;
  /** Dagre node 간격(동일 rank 내). 기본 48. */
  nodeSep?: number;
  /** group/loop 클러스터 내부 패딩. 기본 24. */
  clusterPadding?: number;

  /** Controlled 선택. */
  selection?: string | null;
  /** 기본 선택 (uncontrolled). 기본 null. */
  defaultSelection?: string | null;
  /** 선택 변경 콜백. */
  onSelectionChange?: (id: string | null) => void;

  /** Controlled 펼침 집합. */
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
   * 인스펙터 탭 값 커스텀 렌더.
   * undefined 반환 시 기본 렌더(CodeView JSON 등) 적용.
   */
  renderInspectorValue?: (
    node: PipelineNode,
    tab: PipelineInspectorTab,
    value: unknown,
  ) => ReactNode | undefined;

  /** 노드 카드 커스텀 렌더. undefined 반환 시 기본 카드. */
  renderNode?: (
    node: PipelineNode,
    ctx: { selected: boolean; expanded: boolean },
  ) => ReactNode | undefined;

  /** 엣지 hover tooltip 커스텀 렌더. */
  renderEdgeTooltip?: (edge: PipelineEdge) => ReactNode | undefined;

  /** 노드 더블클릭 콜백. */
  onNodeDoubleClick?: (node: PipelineNode) => void;

  /** 라이트/다크 테마. 기본 "light". */
  theme?: PipelineGraphTheme;

  /** 컨테이너 너비/높이. 기본 width: "100%", height: "70vh". */
  width?: number | string;
  height?: number | string;

  /** 팬/줌/선택 비활성화. 기본 false. */
  interactive?: boolean;

  /** 추가 className. */
  className?: string;
}
