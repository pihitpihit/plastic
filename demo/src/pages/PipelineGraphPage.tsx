import { useState } from "react";
import { PipelineGraph } from "plastic";
import type {
  PipelineEdge,
  PipelineGraphInspectorConfig,
  PipelineNode,
  PipelineNodeStatus,
} from "plastic";

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

export const INSPECTOR_DEMO: {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
} = {
  nodes: [
    {
      id: "load",
      label: "Load",
      status: "success",
      timing: { startedAt: now - 40_000, endedAt: now - 35_000 },
      input: { path: "/data/foo.csv", format: "csv" },
      output: { rows: 1024, cols: 8 },
    },
    {
      id: "transform",
      label: "Transform",
      status: "success",
      timing: { startedAt: now - 35_000, endedAt: now - 30_000 },
      input: { rows: 1024 },
      output: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      internal: { timingBreakdown: { parse: 120, cast: 60, pack: 45 } },
    },
    {
      id: "model",
      label: "Model",
      status: "failed",
      timing: { startedAt: now - 30_000, endedAt: now - 29_500 },
      input: { batch: 32 },
      error: {
        message: "ValueError: shape mismatch (got (32,8), expected (32,16))",
        stack:
          "  at Model.forward (model.py:142)\n  at train_step (train.py:88)\n  at main (run.py:21)",
        cause: { kind: "ShapeError", expected: [32, 16], actual: [32, 8] },
      },
    },
  ],
  edges: [
    { from: "load", to: "transform" },
    { from: "transform", to: "model" },
  ],
};

const STATUS_LEGEND: Array<{ status: PipelineNodeStatus; color: string; label: string }> = [
  { status: "success", color: "#16a34a", label: "success" },
  { status: "running", color: "#2563eb", label: "running (pulse)" },
  { status: "pending", color: "#94a3b8", label: "pending" },
  { status: "failed", color: "#dc2626", label: "failed" },
  { status: "skipped", color: "#a78bfa", label: "skipped" },
  { status: "cancelled", color: "#f59e0b", label: "cancelled" },
];

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

function ControlledDemo() {
  const [sel, setSel] = useState<string | null>(null);
  const ids = BASIC.nodes.map((n) => n.id);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        {ids.map((id) => (
          <button
            key={id}
            onClick={() => setSel(id)}
            className={[
              "px-3 py-1 text-xs rounded border transition-colors",
              sel === id
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
            ].join(" ")}
            type="button"
          >
            {id}
          </button>
        ))}
        <button
          onClick={() => setSel(null)}
          className="px-3 py-1 text-xs rounded border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
          type="button"
        >
          clear
        </button>
        <span className="ml-auto text-xs text-gray-500">
          selection: <code className="px-1 py-0.5 bg-gray-100 rounded">{sel ?? "null"}</code>
        </span>
      </div>
      <div style={{ height: 380 }}>
        <PipelineGraph
          nodes={BASIC.nodes}
          edges={BASIC.edges}
          selection={sel}
          onSelectionChange={setSel}
          height="100%"
        />
      </div>
    </div>
  );
}

function InspectorDemo() {
  const [pos, setPos] = useState<"right" | "bottom" | "none">("right");
  const cfg: PipelineGraphInspectorConfig = { position: pos };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {(["right", "bottom", "none"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPos(p)}
            className={[
              "px-3 py-1 text-xs rounded border transition-colors",
              pos === p
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
            ].join(" ")}
            type="button"
          >
            position = {p}
          </button>
        ))}
      </div>
      <div style={{ height: 440 }}>
        <PipelineGraph
          nodes={INSPECTOR_DEMO.nodes}
          edges={INSPECTOR_DEMO.edges}
          inspector={cfg}
          defaultSelection="transform"
          height="100%"
        />
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Load / Transform 선택 시 Output 탭이 기본 노출됩니다. Model (failed) 선택 시 Error 탭이 자동 활성화됩니다.
      </p>
    </div>
  );
}

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

      <Section
        id="direction"
        title="Direction"
        desc="LR (기본, 좌→우) 과 TB (상→하) 레이아웃 비교."
      >
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p className="text-xs text-gray-400 mb-1">LR</p>
            <div style={{ height: 320 }}>
              <PipelineGraph
                nodes={BASIC.nodes}
                edges={BASIC.edges}
                direction="LR"
                height="100%"
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p className="text-xs text-gray-400 mb-1">TB</p>
            <div style={{ height: 320 }}>
              <PipelineGraph
                nodes={BASIC.nodes}
                edges={BASIC.edges}
                direction="TB"
                height="100%"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="grouping"
        title="Grouping"
        desc="group 카드의 ▸ 를 눌러 내부 스텝을 펼칠 수 있습니다. 펼쳐진 카드는 점선 클러스터로 감싸집니다."
      >
        <div style={{ height: 420 }}>
          <PipelineGraph
            nodes={WITH_GROUP.nodes}
            edges={WITH_GROUP.edges}
            defaultExpansion={["validate"]}
            height="100%"
          />
        </div>
      </Section>

      <Section
        id="loop"
        title="Loop"
        desc="loop 카드는 접힌 상태에서 3D 스택 그림자와 진행률 바를 보입니다. 펼치면 내부 바디가 클러스터 안에 드러납니다."
      >
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p className="text-xs text-gray-400 mb-1">Collapsed</p>
            <div style={{ height: 360 }}>
              <PipelineGraph
                nodes={WITH_LOOP.nodes}
                edges={WITH_LOOP.edges}
                height="100%"
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <p className="text-xs text-gray-400 mb-1">Expanded</p>
            <div style={{ height: 360 }}>
              <PipelineGraph
                nodes={WITH_LOOP.nodes}
                edges={WITH_LOOP.edges}
                defaultExpansion={["train"]}
                height="100%"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="fanout"
        title="Fan-out"
        desc="한 스텝이 N 개 하위 실행으로 분기할 때 엣지 중앙에 fan-out 배지로 표현합니다."
      >
        <div style={{ height: 360 }}>
          <PipelineGraph
            nodes={WITH_FANOUT.nodes}
            edges={WITH_FANOUT.edges}
            height="100%"
          />
        </div>
      </Section>

      <Section
        id="status"
        title="Status palette"
        desc="6 종 실행 상태. running 은 pulse 애니메이션으로 진행 중임을 표시합니다."
      >
        <div style={{ height: 260 }}>
          <PipelineGraph
            nodes={MIXED_STATUS.nodes}
            edges={MIXED_STATUS.edges}
            direction="LR"
            height="100%"
          />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
          {STATUS_LEGEND.map((s) => (
            <div
              key={s.status}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: s.color,
                  display: "inline-block",
                }}
              />
              <span className="text-gray-600">{s.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="controlled"
        title="Controlled"
        desc="외부 state 로 selection 을 제어합니다. 버튼으로 선택을 바꾸고 캔버스 클릭으로도 갱신됩니다."
      >
        <ControlledDemo />
      </Section>

      <Section
        id="inspector"
        title="Inspector"
        desc="선택된 노드의 input / output / internal / logs / timing / error 를 탭으로 표시합니다."
      >
        <InspectorDemo />
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
