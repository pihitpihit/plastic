import { useMemo, useState } from "react";
import { CodeView, PipelineGraph } from "plastic";
import type {
  PipelineEdge,
  PipelineGraphDirection,
  PipelineGraphInspectorConfig,
  PipelineGraphTheme,
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

const LARGE = makeLarge(200);

const PROPS_ROWS: Array<[string, string, string, string]> = [
  ["nodes", "PipelineNode[]", "—", "파이프라인 노드 배열 (필수)"],
  ["edges", "PipelineEdge[]", "—", "노드 간 연결 (필수)"],
  ["direction", '"LR" | "TB"', '"LR"', "Dagre 레이아웃 방향"],
  ["rankSep", "number", "96", "Dagre rank 간 간격"],
  ["nodeSep", "number", "48", "동일 rank 내 노드 간격"],
  ["clusterPadding", "number", "24", "group/loop 클러스터 내부 패딩"],
  ["selection", "string | null", "—", "Controlled 선택 id"],
  ["defaultSelection", "string | null", "null", "초기 선택 (uncontrolled)"],
  ["onSelectionChange", "(id) => void", "—", "선택 변경 콜백"],
  ["expansion", "string[]", "—", "Controlled 펼침 id 집합"],
  ["defaultExpansion", "string[]", "[]", "초기 펼침 (uncontrolled)"],
  ["onExpansionChange", "(ids) => void", "—", "펼침 변경 콜백"],
  ["viewport", "{x,y,zoom}", "—", "Controlled 뷰포트"],
  ["defaultViewport", "{x,y,zoom}", "fit", "초기 뷰포트 (미지정 시 fit)"],
  ["onViewportChange", "(vp) => void", "—", "뷰포트 변경 콜백"],
  [
    "inspector",
    "{ position?, defaultSize?, defaultTab?, tabs? }",
    "{position:\"right\"}",
    "인스펙터 설정",
  ],
  ["renderInspectorValue", "(node, tab, v) => ReactNode", "—", "탭 값 커스텀 렌더"],
  ["renderNode", "(node, ctx) => ReactNode", "—", "카드 커스텀 렌더"],
  ["renderEdgeTooltip", "(edge) => ReactNode", "—", "엣지 hover 툴팁 커스텀"],
  ["onNodeDoubleClick", "(node) => void", "—", "노드 더블클릭 콜백"],
  ["theme", '"light" | "dark"', '"light"', "색상 테마"],
  ["width", "number | string", '"100%"', "컨테이너 너비"],
  ["height", "number | string", '"70vh"', "컨테이너 높이"],
  ["interactive", "boolean", "true", "팬/줌/선택 활성"],
  ["className", "string", "—", "추가 className"],
];

const USAGE_MIN = `import { PipelineGraph } from "plastic";

const NODES = [
  { id: "a", label: "Load", status: "success" },
  { id: "b", label: "Run",  status: "running" },
];
const EDGES = [{ from: "a", to: "b" }];

<PipelineGraph nodes={NODES} edges={EDGES} />`;

const USAGE_CONTROLLED = `const [sel, setSel] = useState<string | null>(null);

<PipelineGraph
  nodes={NODES}
  edges={EDGES}
  selection={sel}
  onSelectionChange={setSel}
/>`;

const USAGE_INSPECTOR = `<PipelineGraph
  nodes={NODES}
  edges={EDGES}
  renderInspectorValue={(n, tab, v) => {
    if (tab === "output" && v instanceof Uint8Array) {
      return <ImagePreview bytes={v} />;
    }
    return undefined; // fallback: 기본 JSON 렌더
  }}
/>`;

const USAGE_LIVE = `const [nodes, setNodes] = useState<PipelineNode[]>(INITIAL);

useEffect(() => {
  const t = setInterval(() => {
    setNodes((prev) => simulateTick(prev));
  }, 500);
  return () => clearInterval(t);
}, []);

<PipelineGraph nodes={nodes} edges={EDGES} />`;

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

const THUMBNAIL_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#60a5fa"/>
          <stop offset="1" stop-color="#a78bfa"/>
        </linearGradient>
      </defs>
      <rect width="120" height="64" fill="url(#g)"/>
      <circle cx="36" cy="32" r="14" fill="#fff" opacity="0.6"/>
      <rect x="56" y="20" width="46" height="6" rx="3" fill="#fff" opacity="0.8"/>
      <rect x="56" y="32" width="36" height="4" rx="2" fill="#fff" opacity="0.55"/>
      <rect x="56" y="42" width="28" height="4" rx="2" fill="#fff" opacity="0.4"/>
    </svg>`,
  );

const CUSTOM_NODE_DEMO: { nodes: PipelineNode[]; edges: PipelineEdge[] } = {
  nodes: [
    { id: "decode", label: "Decode", status: "success" },
    {
      id: "render-frame",
      label: "Render Frame",
      status: "success",
      output: { dataUrl: THUMBNAIL_SVG },
    },
    { id: "encode", label: "Encode", status: "running" },
  ],
  edges: [
    { from: "decode", to: "render-frame" },
    { from: "render-frame", to: "encode" },
  ],
};

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

type PlaygroundPreset =
  | "basic"
  | "with-group"
  | "with-loop"
  | "with-fanout"
  | "mixed-status"
  | "large-50"
  | "large-200";

const PLAYGROUND_PRESETS: Record<
  PlaygroundPreset,
  { nodes: PipelineNode[]; edges: PipelineEdge[] }
> = {
  basic: BASIC,
  "with-group": WITH_GROUP,
  "with-loop": WITH_LOOP,
  "with-fanout": WITH_FANOUT,
  "mixed-status": MIXED_STATUS,
  "large-50": makeLarge(50),
  "large-200": LARGE,
};

function Playground() {
  const [preset, setPreset] = useState<PlaygroundPreset>("basic");
  const [direction, setDirection] = useState<PipelineGraphDirection>("LR");
  const [rankSep, setRankSep] = useState<number>(96);
  const [nodeSep, setNodeSep] = useState<number>(48);
  const [clusterPadding, setClusterPadding] = useState<number>(24);
  const [theme, setTheme] = useState<PipelineGraphTheme>("light");
  const [inspectorPos, setInspectorPos] = useState<"right" | "bottom" | "none">(
    "right",
  );
  const [interactive, setInteractive] = useState<boolean>(true);

  const data = PLAYGROUND_PRESETS[preset];
  const inspector = useMemo<PipelineGraphInspectorConfig>(
    () => ({ position: inspectorPos }),
    [inspectorPos],
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        gap: 12,
      }}
    >
      <aside
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 14,
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          fontSize: 12,
        }}
      >
        <Field label="Preset">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as PlaygroundPreset)}
            className="w-full px-2 py-1 text-xs rounded border border-gray-300 bg-white"
          >
            <option value="basic">basic (4)</option>
            <option value="with-group">with-group</option>
            <option value="with-loop">with-loop</option>
            <option value="with-fanout">with-fanout</option>
            <option value="mixed-status">mixed-status</option>
            <option value="large-50">large-50</option>
            <option value="large-200">large-200</option>
          </select>
        </Field>

        <Field label="Direction">
          <div style={{ display: "flex", gap: 8 }}>
            {(["LR", "TB"] as const).map((d) => (
              <label
                key={d}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <input
                  type="radio"
                  name="pg-direction"
                  value={d}
                  checked={direction === d}
                  onChange={() => setDirection(d)}
                />
                {d}
              </label>
            ))}
          </div>
        </Field>

        <Field label={`rankSep = ${rankSep}`}>
          <input
            type="range"
            min={32}
            max={160}
            step={2}
            value={rankSep}
            onChange={(e) => setRankSep(Number(e.target.value))}
            className="w-full"
          />
        </Field>

        <Field label={`nodeSep = ${nodeSep}`}>
          <input
            type="range"
            min={16}
            max={96}
            step={2}
            value={nodeSep}
            onChange={(e) => setNodeSep(Number(e.target.value))}
            className="w-full"
          />
        </Field>

        <Field label={`clusterPadding = ${clusterPadding}`}>
          <input
            type="range"
            min={8}
            max={48}
            step={1}
            value={clusterPadding}
            onChange={(e) => setClusterPadding(Number(e.target.value))}
            className="w-full"
          />
        </Field>

        <Field label="Theme">
          <div style={{ display: "flex", gap: 8 }}>
            {(["light", "dark"] as const).map((t) => (
              <label
                key={t}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <input
                  type="radio"
                  name="pg-theme"
                  value={t}
                  checked={theme === t}
                  onChange={() => setTheme(t)}
                />
                {t}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Inspector position">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(["right", "bottom", "none"] as const).map((p) => (
              <label
                key={p}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <input
                  type="radio"
                  name="pg-inspector"
                  value={p}
                  checked={inspectorPos === p}
                  onChange={() => setInspectorPos(p)}
                />
                {p}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Interactive">
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={interactive}
              onChange={(e) => setInteractive(e.target.checked)}
            />
            팬/줌/선택 활성
          </label>
        </Field>

        <p style={{ color: "#94a3b8", fontSize: 11, lineHeight: 1.4 }}>
          preset·direction 변경 시 뷰포트는 유지됩니다. 새 레이아웃에 맞춰 보려면 우하단의{" "}
          <code>⊙</code> 또는 키보드 <kbd>0</kbd> 으로 fit-to-content 를 실행하세요.
        </p>
      </aside>

      <main style={{ height: "70vh" }}>
        <PipelineGraph
          nodes={data.nodes}
          edges={data.edges}
          direction={direction}
          rankSep={rankSep}
          nodeSep={nodeSep}
          clusterPadding={clusterPadding}
          theme={theme}
          inspector={inspector}
          interactive={interactive}
          height="100%"
        />
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1">{label}</p>
      {children}
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

      <Section
        id="custom-node"
        title="Custom node render"
        desc="기본 카드를 완전히 대체하려면 renderNode prop 을 사용하세요. undefined 를 반환하면 기본 카드로 fallback 됩니다."
      >
        <div style={{ height: 260 }}>
          <PipelineGraph
            nodes={CUSTOM_NODE_DEMO.nodes}
            edges={CUSTOM_NODE_DEMO.edges}
            height="100%"
            renderNode={(n) => {
              if (n.id !== "render-frame") return undefined;
              const src = (n.output as { dataUrl?: string } | undefined)?.dataUrl;
              if (!src) return undefined;
              return (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    padding: 6,
                    boxSizing: "border-box",
                  }}
                >
                  <img
                    src={src}
                    alt={n.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 4,
                      display: "block",
                    }}
                  />
                </div>
              );
            }}
          />
        </div>
      </Section>

      <Section
        id="dark"
        title="Dark theme"
        desc="theme prop 으로 라이트/다크 전환. 캔버스·카드·엣지·인스펙터 모두 어두운 톤으로 일관됩니다."
      >
        <div
          style={{
            padding: 12,
            background: "#0f172a",
            borderRadius: 10,
          }}
        >
          <div style={{ height: 440 }}>
            <PipelineGraph
              nodes={WITH_LOOP.nodes}
              edges={WITH_LOOP.edges}
              theme="dark"
              defaultExpansion={["train"]}
              height="100%"
            />
          </div>
        </div>
      </Section>

      <Section
        id="large"
        title="Large graph"
        desc="200 노드 격자 그래프. 팬·줌으로 탐색하고 우하단 ⊙ (또는 키보드 0) 로 전체 보기로 돌아옵니다."
      >
        <div style={{ height: 640 }}>
          <PipelineGraph
            nodes={LARGE.nodes}
            edges={LARGE.edges}
            inspector={{ position: "none" }}
            height="100%"
          />
        </div>
      </Section>

      <Section id="props" title="Props" desc="전체 prop 레퍼런스.">
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Prop", "Type", "Default", "Description"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {PROPS_ROWS.map(([name, type, def, desc]) => (
                <tr key={name}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-800">{name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{type}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{def}</td>
                  <td className="px-4 py-2.5 text-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="usage" title="Usage" desc="자주 쓰는 패턴 스니펫.">
        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-500 mb-2">
              1) 최소 예시 — nodes / edges 만으로 동작합니다.
            </p>
            <CodeView code={USAGE_MIN} language="tsx" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">
              2) Controlled selection — 외부 state 로 선택 동기화.
            </p>
            <CodeView code={USAGE_CONTROLLED} language="tsx" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">
              3) 인스펙터 탭 커스텀 — 바이너리 · 이미지 등을 특수 렌더.
            </p>
            <CodeView code={USAGE_INSPECTOR} language="tsx" />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">
              4) 실시간 업데이트 — setInterval 로 node 상태를 스트리밍.
            </p>
            <CodeView code={USAGE_LIVE} language="tsx" />
          </div>
        </div>
      </Section>

      <Section
        id="playground"
        title="Playground"
        desc="모든 주요 옵션을 실시간 토글하며 관찰할 수 있습니다."
      >
        <Playground />
      </Section>
    </div>
  );
}
