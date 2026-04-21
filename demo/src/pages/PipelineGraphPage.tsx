import { PipelineGraph } from "plastic";
import type { PipelineEdge, PipelineNode } from "plastic";

// ── 샘플 데이터 ────────────────────────────────────────────────────────────

const now = Date.now();

export const BASIC: { nodes: PipelineNode[]; edges: PipelineEdge[] } = {
  nodes: [
    {
      id: "ingest",
      label: "Ingest",
      status: "success",
      timing: { startedAt: now - 60_000, endedAt: now - 50_000 },
    },
    {
      id: "clean",
      label: "Clean",
      status: "success",
      timing: { startedAt: now - 50_000, endedAt: now - 30_000 },
    },
    {
      id: "analyze",
      label: "Analyze",
      status: "running",
      timing: { startedAt: now - 30_000 },
    },
    { id: "export", label: "Export", status: "pending" },
  ],
  edges: [
    { from: "ingest", to: "clean" },
    { from: "clean", to: "analyze" },
    { from: "analyze", to: "export" },
  ],
};

export const WITH_GROUP: { nodes: PipelineNode[]; edges: PipelineEdge[] } = {
  nodes: [
    { id: "load", label: "Load", status: "success" },
    {
      id: "validate",
      label: "Validate",
      kind: "group",
      status: "success",
      children: ["v.schema", "v.bounds", "v.types"],
    },
    { id: "v.schema", label: "Schema", status: "success", parent: "validate" },
    { id: "v.bounds", label: "Bounds", status: "success", parent: "validate" },
    { id: "v.types", label: "Types", status: "success", parent: "validate" },
    { id: "transform", label: "Transform", status: "running" },
  ],
  edges: [
    { from: "load", to: "validate" },
    { from: "validate", to: "transform" },
    { from: "v.schema", to: "v.bounds" },
    { from: "v.bounds", to: "v.types" },
  ],
};

export const WITH_LOOP: { nodes: PipelineNode[]; edges: PipelineEdge[] } = {
  nodes: [
    { id: "prep", label: "Prepare batch", status: "success" },
    {
      id: "train",
      label: "Train epoch",
      kind: "loop",
      status: "running",
      iterations: 10,
      currentIteration: 4,
      children: ["t.fwd", "t.loss", "t.bwd"],
    },
    { id: "t.fwd", label: "Forward", status: "success", parent: "train" },
    { id: "t.loss", label: "Loss", status: "running", parent: "train" },
    { id: "t.bwd", label: "Backward", status: "pending", parent: "train" },
    { id: "eval", label: "Evaluate", status: "pending" },
  ],
  edges: [
    { from: "prep", to: "train" },
    { from: "train", to: "eval" },
    { from: "t.fwd", to: "t.loss" },
    { from: "t.loss", to: "t.bwd" },
  ],
};

export const WITH_FANOUT: { nodes: PipelineNode[]; edges: PipelineEdge[] } = {
  nodes: [
    { id: "load", label: "Load", status: "success" },
    { id: "train", label: "Train", status: "success" },
    { id: "eval", label: "Evaluate", status: "running" },
    { id: "report", label: "Report", status: "pending" },
  ],
  edges: [
    { from: "load", to: "train" },
    {
      from: "train",
      to: "eval",
      fanOut: { count: 10, label: "per-epoch metrics" },
    },
    { from: "eval", to: "report" },
  ],
};

export const MIXED_STATUS: { nodes: PipelineNode[]; edges: PipelineEdge[] } = {
  nodes: [
    { id: "s1", label: "Success", status: "success" },
    { id: "s2", label: "Running", status: "running" },
    { id: "s3", label: "Pending", status: "pending" },
    { id: "s4", label: "Failed", status: "failed" },
    { id: "s5", label: "Skipped", status: "skipped" },
    { id: "s6", label: "Cancelled", status: "cancelled" },
  ],
  edges: [
    { from: "s1", to: "s2" },
    { from: "s2", to: "s3" },
    { from: "s3", to: "s4" },
    { from: "s4", to: "s5" },
    { from: "s5", to: "s6" },
  ],
};

export function makeLarge(n: number): {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
} {
  const COLS = 10;
  const statuses: PipelineNode["status"][] = [
    "success",
    "success",
    "success",
    "running",
    "pending",
  ];
  const nodes: PipelineNode[] = [];
  const edges: PipelineEdge[] = [];
  for (let i = 0; i < n; i++) {
    nodes.push({
      id: `n${i}`,
      label: `Step ${i}`,
      status: statuses[i % statuses.length],
    });
    const col = i % COLS;
    if (col > 0) edges.push({ from: `n${i - 1}`, to: `n${i}` });
    if (i >= COLS) edges.push({ from: `n${i - COLS}`, to: `n${i}` });
  }
  return { nodes, edges };
}

// ── 섹션 공통 ──────────────────────────────────────────────────────────────

function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {title}
      </p>
      {desc && <p className="text-sm text-gray-500 mb-3">{desc}</p>}
      {children}
    </section>
  );
}

// ── 페이지 ─────────────────────────────────────────────────────────────────

export function PipelineGraphPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">PipelineGraph</h1>
      <p className="text-sm text-gray-500 mb-8">
        스텝 기반 파이프라인을 DAG 로 시각화. 실행 상태·타이밍·profiling 데이터 인스펙션 지원.
      </p>

      <Section id="basic" title="Basic" desc="가장 단순한 4 스텝 직렬 파이프라인.">
        <div style={{ height: 360 }}>
          <PipelineGraph nodes={BASIC.nodes} edges={BASIC.edges} height="100%" />
        </div>
      </Section>

      <Section id="direction" title="Direction" desc="LR / TB 레이아웃 비교.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="grouping" title="Grouping" desc="group 카드를 펼쳐 내부 스텝을 관찰.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="loop" title="Loop" desc="3D 스택 + 진행률 바 + 펼치기.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="fanout" title="Fan-out" desc="한 스텝이 N 개 하위 실행으로 분기.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="status" title="Status palette" desc="6 종 실행 상태와 running pulse 애니메이션.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="controlled" title="Controlled" desc="외부 state 로 selection 제어.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="inspector" title="Inspector" desc="우측/하단/숨김 및 탭 구성.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="custom-node" title="Custom node render" desc="renderNode 로 카드 완전 대체.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="dark" title="Dark theme" desc="theme=dark.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="large" title="Large graph" desc="200 노드 — 팬/줌 + fit 으로 탐색.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="props" title="Props" desc="전체 prop 레퍼런스.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="usage" title="Usage" desc="자주 쓰는 패턴 스니펫.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>

      <Section id="playground" title="Playground" desc="실시간 prop 토글.">
        <p className="text-sm text-gray-500 mb-3">(다음 이슈에서 채움)</p>
      </Section>
    </div>
  );
}
