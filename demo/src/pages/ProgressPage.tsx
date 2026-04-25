import { useEffect, useState } from "react";
import { CodeView, Progress } from "plastic";
import type {
  ProgressLabelPlacement,
  ProgressShape,
  ProgressSize,
  ProgressStrokeLinecap,
  ProgressTheme,
  ProgressVariant,
} from "plastic";

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      {children}
    </div>
  );
}

function PropsTable({
  rows,
}: {
  rows: Array<[string, string, string, string]>;
}) {
  return (
    <table className="w-full text-left text-sm border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Prop</th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Type</th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Default</th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([prop, type, def, desc]) => (
          <tr key={prop} className="border-t border-gray-100">
            <td className="px-4 py-2 font-mono text-xs">{prop}</td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">{type}</td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">{def}</td>
            <td className="px-4 py-2 text-gray-700">{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LinearBasicDemo() {
  return (
    <div className="flex flex-col gap-4">
      <Progress value={0} aria-label="0%" />
      <Progress value={25} aria-label="25%" />
      <Progress value={60} aria-label="60%" />
      <Progress value={100} aria-label="완료" />
    </div>
  );
}

function IndeterminateDemo() {
  return (
    <div className="flex flex-col gap-4">
      <Progress indeterminate aria-label="로딩 중" />
      <div className="flex items-center gap-6">
        <Progress shape="circular" indeterminate aria-label="처리 중" />
        <span className="text-sm text-gray-500">Circular indeterminate</span>
      </div>
      <Progress indeterminate striped aria-label="업로드 중" />
    </div>
  );
}

function BufferDemo() {
  return (
    <div className="flex flex-col gap-4">
      <Progress value={42} buffer={68} aria-label="다운로드 vs 재생" />
      <Progress.Root value={30} buffer={80} variant="success" aria-label="compound 버퍼">
        <Progress.Track>
          <Progress.Indicator kind="buffer" value={80} />
          <Progress.Indicator />
        </Progress.Track>
      </Progress.Root>
    </div>
  );
}

function SegmentedDemo() {
  return (
    <div className="flex flex-col gap-4">
      <Progress segments={5} value={3} aria-label="단계 3/5" />
      <Progress segments={10} value={7} variant="success" aria-label="Quiz 7/10" />
      <Progress segments={4} value={0} aria-label="시작 전" />
      <Progress segments={6} value={6} variant="success" aria-label="완료" />
    </div>
  );
}

function CircularDemo() {
  return (
    <div className="flex items-center gap-8 flex-wrap">
      <Progress shape="circular" value={25} size="sm" aria-label="25%" />
      <Progress shape="circular" value={50} size="md" labelPlacement="outside" aria-label="50%">
        50%
      </Progress>
      <Progress shape="circular" value={75} size="lg" strokeWidth={8} aria-label="75%">
        75%
      </Progress>
      <Progress shape="circular" indeterminate size="md" aria-label="처리 중" />
      <Progress shape="circular" value={90} variant="success" size="md" aria-label="90%">
        <span style={{ fontWeight: 600 }}>OK</span>
      </Progress>
    </div>
  );
}

function StatesDemo() {
  return (
    <div className="flex flex-col gap-3">
      <Progress value={30} variant="default" aria-label="default" />
      <Progress value={80} variant="success" aria-label="success" />
      <Progress value={90} variant="warning" aria-label="warning" />
      <Progress value={45} variant="error" aria-label="error" />
    </div>
  );
}

function StripedDemo() {
  return (
    <div className="flex flex-col gap-3">
      <Progress value={60} striped aria-label="striped" />
      <Progress value={60} striped animated aria-label="striped animated" />
      <Progress
        value={60}
        striped
        animated
        variant="success"
        size="lg"
        aria-label="striped animated large"
      />
    </div>
  );
}

function SizesDemo() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Progress value={40} size="sm" aria-label="sm" />
        <Progress value={40} size="md" aria-label="md" />
        <Progress value={40} size="lg" aria-label="lg" />
      </div>
      <div className="flex items-center gap-6">
        <Progress shape="circular" value={40} size="sm" aria-label="circular sm" />
        <Progress shape="circular" value={40} size="md" aria-label="circular md" />
        <Progress shape="circular" value={40} size="lg" aria-label="circular lg" />
      </div>
    </div>
  );
}

function DarkDemo() {
  return (
    <div
      style={{ background: "#0b1220", padding: 24, borderRadius: 8 }}
    >
      <div className="flex flex-col gap-4">
        <Progress value={50} theme="dark" aria-label="dark default" />
        <Progress
          value={80}
          theme="dark"
          variant="success"
          aria-label="dark success"
        />
        <Progress
          value={45}
          theme="dark"
          variant="error"
          striped
          animated
          aria-label="dark error animated"
        />
        <div className="flex items-center gap-6">
          <Progress
            shape="circular"
            value={65}
            theme="dark"
            aria-label="dark circular"
          />
          <Progress
            shape="circular"
            indeterminate
            theme="dark"
            aria-label="dark circular indeterminate"
          />
        </div>
      </div>
    </div>
  );
}

function ControlledDemo() {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (v >= 100) return;
    const t = setTimeout(() => setV((x) => Math.min(100, x + 5)), 300);
    return () => clearTimeout(t);
  }, [v]);
  return (
    <div className="flex flex-col gap-3">
      <Progress value={v} aria-label="자동 증가" announce />
      <div className="flex gap-2">
        <button
          onClick={() => setV(0)}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Reset
        </button>
        <button
          onClick={() => setV(100)}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          Jump to 100
        </button>
        <button
          onClick={() => setV((x) => Math.min(100, x + 10))}
          className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
        >
          +10
        </button>
      </div>
      <div className="text-sm text-slate-600">current: {v}</div>
    </div>
  );
}

function Playground() {
  const [shape, setShape] = useState<ProgressShape>("linear");
  const [variant, setVariant] = useState<ProgressVariant>("default");
  const [size, setSize] = useState<ProgressSize>("md");
  const [theme, setTheme] = useState<ProgressTheme>("light");
  const [value, setValue] = useState(40);
  const [indeterminate, setIndeterminate] = useState(false);
  const [buffer, setBuffer] = useState(70);
  const [useBuffer, setUseBuffer] = useState(false);
  const [segments, setSegments] = useState(0);
  const [striped, setStriped] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [labelPlacement, setLabelPlacement] =
    useState<ProgressLabelPlacement>("none");
  const [announce, setAnnounce] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [strokeLinecap, setStrokeLinecap] =
    useState<ProgressStrokeLinecap>("round");

  const isLinear = shape === "linear";
  const effectiveSegments = isLinear && segments >= 2 ? segments : undefined;
  const effectiveBuffer =
    isLinear && useBuffer && !indeterminate && effectiveSegments === undefined
      ? buffer
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span>shape</span>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value as ProgressShape)}
            className="px-2 py-1 rounded border border-gray-300"
          >
            <option value="linear">linear</option>
            <option value="circular">circular</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>variant</span>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as ProgressVariant)}
            className="px-2 py-1 rounded border border-gray-300"
          >
            <option value="default">default</option>
            <option value="success">success</option>
            <option value="warning">warning</option>
            <option value="error">error</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>size</span>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value as ProgressSize)}
            className="px-2 py-1 rounded border border-gray-300"
          >
            <option value="sm">sm</option>
            <option value="md">md</option>
            <option value="lg">lg</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ProgressTheme)}
            className="px-2 py-1 rounded border border-gray-300"
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>labelPlacement</span>
          <select
            value={labelPlacement}
            onChange={(e) =>
              setLabelPlacement(e.target.value as ProgressLabelPlacement)
            }
            className="px-2 py-1 rounded border border-gray-300"
          >
            <option value="none">none</option>
            <option value="outside">outside</option>
            <option value="inside">inside</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>strokeLinecap (circular)</span>
          <select
            value={strokeLinecap}
            onChange={(e) =>
              setStrokeLinecap(e.target.value as ProgressStrokeLinecap)
            }
            className="px-2 py-1 rounded border border-gray-300"
          >
            <option value="round">round</option>
            <option value="butt">butt</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>value ({value})</span>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>buffer ({buffer})</span>
          <input
            type="range"
            min={0}
            max={100}
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
            disabled={!isLinear}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>segments ({segments === 0 ? "none" : segments})</span>
          <input
            type="range"
            min={0}
            max={10}
            value={segments}
            onChange={(e) => setSegments(Number(e.target.value))}
            disabled={!isLinear}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>strokeWidth ({strokeWidth})</span>
          <input
            type="range"
            min={2}
            max={12}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            disabled={isLinear}
          />
        </label>
      </div>
      <div className="flex gap-4 flex-wrap text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={indeterminate}
            onChange={(e) => setIndeterminate(e.target.checked)}
          />
          indeterminate
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useBuffer}
            onChange={(e) => setUseBuffer(e.target.checked)}
            disabled={!isLinear}
          />
          use buffer
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={striped}
            onChange={(e) => setStriped(e.target.checked)}
          />
          striped
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={animated}
            onChange={(e) => setAnimated(e.target.checked)}
          />
          animated
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={announce}
            onChange={(e) => setAnnounce(e.target.checked)}
          />
          announce
        </label>
      </div>
      <div
        style={{
          background: theme === "dark" ? "#0b1220" : "#f9fafb",
          padding: 24,
          borderRadius: 8,
          minHeight: 120,
          display: "flex",
          alignItems: "center",
          justifyContent: shape === "circular" ? "center" : "stretch",
        }}
      >
        <div style={{ width: shape === "circular" ? "auto" : "100%" }}>
          <Progress
            shape={shape}
            variant={variant}
            size={size}
            theme={theme}
            value={indeterminate ? undefined : value}
            indeterminate={indeterminate}
            {...(effectiveBuffer !== undefined ? { buffer: effectiveBuffer } : {})}
            {...(effectiveSegments !== undefined ? { segments: effectiveSegments } : {})}
            striped={striped}
            animated={animated}
            labelPlacement={labelPlacement}
            announce={announce}
            strokeWidth={strokeWidth}
            strokeLinecap={strokeLinecap}
            aria-label="Playground"
          >
            {shape === "circular" && !indeterminate ? `${value}%` : null}
          </Progress>
        </div>
      </div>
    </div>
  );
}

const COMMON_PROPS: Array<[string, string, string, string]> = [
  ["value", "number", "—", "현재 값 (0 ~ max). 미지정 시 indeterminate 자동"],
  ["defaultValue", "number", "—", "uncontrolled 초기값"],
  ["max", "number", "100", "value 상한"],
  ["indeterminate", "boolean", "auto", "true 면 강제 indeterminate 애니메이션"],
  ["shape", "'linear' | 'circular'", "'linear'", "선형/원형"],
  ["size", "'sm' | 'md' | 'lg'", "'md'", "크기 (linear 높이 또는 circular 직경)"],
  ["variant", "'default' | 'success' | 'warning' | 'error'", "'default'", "상태별 팔레트"],
  ["theme", "'light' | 'dark'", "'light'", "Light/Dark 테마"],
  ["segments", "number", "—", "단계형 막대. 2 이상 (Linear 전용)"],
  ["buffer", "number", "—", "보조 게이지 (Linear determinate 전용)"],
  ["striped", "boolean", "false", "대각선 줄무늬 (Linear)"],
  ["animated", "boolean", "false", "줄무늬 애니메이션 (striped 조합)"],
  ["labelPlacement", "'inside' | 'outside' | 'none'", "'none'", "라벨/값 텍스트 배치"],
  ["formatLabel", "(value, max) => ReactNode", "'% 반올림'", "ValueText 포매터"],
  ["strokeWidth", "number", "size 별", "Circular stroke 두께"],
  ["strokeLinecap", "'butt' | 'round'", "'round'", "Circular stroke 끝 모양"],
  ["trackOpacity", "number", "1", "Circular 트랙 투명도"],
  ["aria-label", "string", "—", "접근성 라벨 (또는 aria-labelledby)"],
  ["announce", "boolean", "false", "aria-live='polite' 활성"],
  ["className", "string", "—", "루트 className"],
  ["style", "CSSProperties", "—", "루트 style"],
];

const SHORTCUT_PROPS: Array<[string, string, string, string]> = [
  ...COMMON_PROPS,
  ["children", "ReactNode", "—", "Circular 중앙 텍스트 또는 Linear outside 라벨"],
];

const ROOT_PROPS: Array<[string, string, string, string]> = [
  ...COMMON_PROPS,
  ["children", "ReactNode", "—", "Track / Indicator / Label / ValueText 조합"],
];

const TRACK_PROPS: Array<[string, string, string, string]> = [
  ["children", "ReactNode", "—", "Indicator (Linear 1~2 개, Circular 1 개)"],
  ["className", "string", "—", "트랙 className"],
  ["style", "CSSProperties", "—", "트랙 style"],
];

const INDICATOR_PROPS: Array<[string, string, string, string]> = [
  ["kind", "'primary' | 'buffer'", "'primary'", "primary 또는 buffer. buffer 는 Linear 전용"],
  ["value", "number", "—", "kind='buffer' 일 때 별도 값"],
  ["className", "string", "—", "인디케이터 className"],
  ["style", "CSSProperties", "—", "인디케이터 style"],
];

const LABEL_PROPS: Array<[string, string, string, string]> = [
  ["placement", "'inside' | 'outside'", "'outside'", "라벨 위치 (Linear)"],
  ["children", "ReactNode", "—", "라벨 콘텐츠"],
  ["className", "string", "—", "라벨 className"],
  ["style", "CSSProperties", "—", "라벨 style"],
];

const VALUE_TEXT_PROPS: Array<[string, string, string, string]> = [
  ["format", "(value, max) => ReactNode", "formatLabel", "포매터 override"],
  ["className", "string", "—", "value text className"],
  ["style", "CSSProperties", "—", "value text style"],
];

const USAGE_CODE = `import { Progress } from "plastic";

// 1) 기본 Linear determinate
<Progress value={42} aria-label="업로드" />

// 2) Indeterminate (값 미정)
<Progress indeterminate aria-label="로딩" />

// 3) Circular
<Progress shape="circular" value={72} aria-label="72%">72%</Progress>

// 4) Segmented (Quiz)
<Progress segments={10} value={q} variant="success" aria-label={\`문제 \${q}/10\`} />

// 5) Buffer (비디오 재생 위치)
<Progress.Root value={played} buffer={loaded} max={duration} aria-label="재생">
  <Progress.Track>
    <Progress.Indicator kind="buffer" value={loaded} />
    <Progress.Indicator />
  </Progress.Track>
</Progress.Root>

// 6) 파일 업로드 인라인
function UploadRow({ filename, percent }: { filename: string; percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 truncate text-sm">{filename}</span>
      <Progress value={percent} size="sm" className="flex-1" aria-label={\`\${filename} 업로드\`} />
      <span className="w-10 text-xs text-slate-500">{percent}%</span>
    </div>
  );
}

// 7) 모달 로딩 스피너
<Progress shape="circular" indeterminate size="lg" aria-label="처리 중" />
`;

export default function ProgressPage() {
  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Progress</h1>
        <p className="text-sm text-gray-500 mt-1">
          Linear / Circular 진행 상태 인디케이터. determinate · indeterminate ·
          buffer · segmented · striped 조합 지원. runtime-zero.
        </p>
      </header>

      <Section id="linear" title="Linear Basic" desc="value 0 ~ 100">
        <Card>
          <LinearBasicDemo />
        </Card>
      </Section>

      <Section
        id="indeterminate"
        title="Indeterminate"
        desc="value 미지정 또는 indeterminate 로 무한 애니메이션"
      >
        <Card>
          <IndeterminateDemo />
        </Card>
      </Section>

      <Section
        id="buffer"
        title="Buffer"
        desc="Linear 전용 보조 게이지 (다운로드 vs 재생)"
      >
        <Card>
          <BufferDemo />
        </Card>
      </Section>

      <Section
        id="segmented"
        title="Segmented"
        desc="단계형 막대 (Linear 전용). segments={n}, value 0..n"
      >
        <Card>
          <SegmentedDemo />
        </Card>
      </Section>

      <Section
        id="circular"
        title="Circular"
        desc="SVG 기반 원형. children 은 중앙에 배치"
      >
        <Card>
          <CircularDemo />
        </Card>
      </Section>

      <Section
        id="states"
        title="States (variant)"
        desc="default / success / warning / error"
      >
        <Card>
          <StatesDemo />
        </Card>
      </Section>

      <Section
        id="striped"
        title="Striped + Animated"
        desc="Linear 전용 대각선 줄무늬. animated 는 흐르는 애니메이션"
      >
        <Card>
          <StripedDemo />
        </Card>
      </Section>

      <Section id="sizes" title="Sizes" desc="sm / md / lg">
        <Card>
          <SizesDemo />
        </Card>
      </Section>

      <Section id="dark" title="Dark Theme" desc="theme='dark'">
        <DarkDemo />
      </Section>

      <Section
        id="controlled"
        title="Controlled Counter"
        desc="외부 state 로 value 주입. announce 로 보조공학 읽기"
      >
        <Card>
          <ControlledDemo />
        </Card>
      </Section>

      <Section
        id="playground"
        title="Playground"
        desc="모든 prop 을 토글해 실시간 미리보기"
      >
        <Card>
          <Playground />
        </Card>
      </Section>

      <Section id="props" title="Props">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-semibold mb-2">Progress (단축)</p>
            <PropsTable rows={SHORTCUT_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Progress.Root</p>
            <PropsTable rows={ROOT_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Progress.Track</p>
            <PropsTable rows={TRACK_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Progress.Indicator</p>
            <PropsTable rows={INDICATOR_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Progress.Label</p>
            <PropsTable rows={LABEL_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Progress.ValueText</p>
            <PropsTable rows={VALUE_TEXT_PROPS} />
          </div>
        </div>
      </Section>

      <Section id="usage" title="Usage">
        <CodeView code={USAGE_CODE} language="tsx" />
      </Section>
    </div>
  );
}
