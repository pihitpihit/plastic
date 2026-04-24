import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button, CodeView, SplitPane } from "plastic";
import type { SplitPaneCollapsible, SplitPaneSize, SplitPaneTheme } from "plastic";

function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  const sectionProps = id !== undefined ? { id } : {};
  return (
    <section {...sectionProps} className="mb-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {title}
      </p>
      {desc !== undefined ? (
        <p className="text-sm text-gray-500 mb-3">{desc}</p>
      ) : null}
      {children}
    </section>
  );
}

function Frame({
  height = 240,
  children,
  dark = false,
  style,
}: {
  height?: number;
  children: ReactNode;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        height,
        border: dark
          ? "1px solid rgba(255,255,255,0.1)"
          : "1px solid #e5e7eb",
        borderRadius: 8,
        background: dark ? "#0f172a" : "#fff",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function FakeFileTree({ dark = false }: { dark?: boolean }) {
  const items = [
    "src/",
    "  components/",
    "    Button.tsx",
    "    Dialog.tsx",
    "    SplitPane.tsx",
    "  pages/",
    "    index.tsx",
    "  main.tsx",
    "package.json",
    "tsconfig.json",
    "README.md",
  ];
  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: 12,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
        color: dark ? "#e5e7eb" : "#111827",
        background: dark ? "#111827" : "#f9fafb",
      }}
    >
      {items.map((line) => (
        <div key={line} style={{ lineHeight: "20px", whiteSpace: "pre" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function FakeEditor({ dark = false }: { dark?: boolean }) {
  const lines = [
    "import { SplitPane } from 'plastic';",
    "",
    "export function IDELayout() {",
    "  return (",
    "    <SplitPane.Root defaultSize=\"30%\">",
    "      <SplitPane.Pane>",
    "        <FileTree />",
    "      </SplitPane.Pane>",
    "      <SplitPane.Divider />",
    "      <SplitPane.Pane>",
    "        <Editor />",
    "      </SplitPane.Pane>",
    "    </SplitPane.Root>",
    "  );",
    "}",
  ];
  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: 16,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 13,
        color: dark ? "#e5e7eb" : "#111827",
        background: dark ? "#0b1220" : "#ffffff",
      }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 12,
            whiteSpace: "pre",
            lineHeight: "20px",
          }}
        >
          <span style={{ color: dark ? "#475569" : "#9ca3af", width: 24, textAlign: "right" }}>
            {i + 1}
          </span>
          <span>{line}</span>
        </div>
      ))}
    </div>
  );
}

function FakeTerminal({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: 12,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
        color: dark ? "#d1fae5" : "#065f46",
        background: dark ? "#0b1220" : "#f0fdf4",
      }}
    >
      <div>$ npm run dev</div>
      <div>&gt; plastic-demo dev</div>
      <div>&gt; vite</div>
      <div>  VITE v5  ready in 120 ms</div>
      <div>  ➜ Local:   http://localhost:5173/</div>
      <div>  ➜ Network: use --host to expose</div>
      <div>  ➜ press h to show help</div>
    </div>
  );
}

function PaneLabel({
  title,
  sub,
  dark = false,
}: {
  title: string;
  sub?: string;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 4,
        color: dark ? "#e5e7eb" : "#374151",
        background: dark ? "#111827" : "#f9fafb",
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 600 }}>{title}</span>
      {sub !== undefined ? (
        <span style={{ fontSize: 11, color: dark ? "#9ca3af" : "#9ca3af" }}>
          {sub}
        </span>
      ) : null}
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
        {rows.map(([p, t, d, desc]) => (
          <tr key={p} className="border-t border-gray-100">
            <td className="px-4 py-2 font-mono text-xs">{p}</td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">{t}</td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">{d}</td>
            <td className="px-4 py-2 text-gray-700">{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ROOT_PROPS: Array<[string, string, string, string]> = [
  ["direction", "'horizontal' | 'vertical'", "'horizontal'", "분할 방향"],
  ["defaultSize", "number | `${number}%`", "'50%'", "초기 사이즈(첫 번째 pane 기준), uncontrolled"],
  ["size", "number | `${number}%`", "—", "사이즈(controlled). 지정 시 내부 상태 무시"],
  ["onSizeChange", "(px: number, pct: number) => void", "—", "사이즈 변경 (매 프레임)"],
  ["onSizeChangeEnd", "(px: number, pct: number) => void", "—", "pointerup 시 1회"],
  ["minSize", "number | `${number}%`", "48", "최소 사이즈"],
  ["maxSize", "number | `${number}%`", "'90%'", "최대 사이즈"],
  ["snapSize", "number | `${number}%`", "—", "드래그 중 이 근처 통과 시 snap"],
  ["snapThreshold", "number", "8", "snap 활성 거리 (px)"],
  ["collapsible", "'start' | 'end' | 'both' | 'none'", "'none'", "접기 대상"],
  ["collapsedSize", "number", "0", "접힘 상태 크기 (px)"],
  ["collapseThreshold", "number", "minPx * 0.5", "드래그 중 이 값 미만이면 자동 접힘"],
  ["storageKey", "string", "—", "localStorage persist key (uncontrolled 전용)"],
  ["theme", "'light' | 'dark'", "'light'", "테마"],
  ["disabled", "boolean", "false", "드래그/키보드 전부 차단"],
  ["aria-label", "string", "—", "root group 라벨 (Divider 기본 라벨과는 별개)"],
];

const PANE_PROPS: Array<[string, string, string, string]> = [
  ["label", "string", "—", "ARIA label, 기본은 'Pane 1' / 'Pane 2'"],
  ["className / style", "—", "—", "pane 래퍼 스타일"],
  ["children", "ReactNode", "—", "pane 내용"],
];

const DIVIDER_PROPS: Array<[string, string, string, string]> = [
  ["aria-label", "string", "'Resize panes'", "divider ARIA label"],
  ["children", "ReactNode", "기본 핸들", "divider 내부 affordance override"],
  ["className / style", "—", "—", "divider 스타일"],
];

const COLLAPSE_BTN_PROPS: Array<[string, string, string, string]> = [
  ["which", "'start' | 'end'", "—", "접기 대상"],
  ["aria-label", "string", "자동", "버튼 ARIA label"],
  ["children", "ReactNode", "자동 아이콘", "아이콘 override"],
  ["className / style", "—", "—", "버튼 스타일"],
];

function BasicHorizontalSection() {
  return (
    <Section id="basic" title="Basic horizontal" desc="기본 수평 분할 (40% start).">
      <Frame>
        <SplitPane.Root defaultSize="40%">
          <SplitPane.Pane label="File tree">
            <FakeFileTree />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane label="Editor">
            <FakeEditor />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function VerticalSection() {
  return (
    <Section id="vertical" title="Vertical" desc="상/하 분할, cursor=row-resize.">
      <Frame height={320}>
        <SplitPane.Root direction="vertical" defaultSize="60%">
          <SplitPane.Pane label="Editor">
            <FakeEditor />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane label="Terminal">
            <FakeTerminal />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function MinMaxSection() {
  return (
    <Section
      id="minmax"
      title="Min / Max"
      desc="defaultSize=240, minSize=160, maxSize=520."
    >
      <Frame>
        <SplitPane.Root defaultSize={240} minSize={160} maxSize={520}>
          <SplitPane.Pane>
            <PaneLabel title="min 160 / max 520" sub="드래그해도 이 범위를 벗어나지 않음" />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <PaneLabel title="End pane" sub="flex: 1" />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function CollapsibleSection() {
  return (
    <Section
      id="collapsible"
      title="Collapsible"
      desc="collapsible='start' + CollapseButton. 드래그로 80px 미만 → 0 으로 자동 접힘."
    >
      <Frame>
        <SplitPane.Root
          defaultSize="30%"
          collapsible="start"
          collapsedSize={0}
          collapseThreshold={80}
        >
          <SplitPane.Pane label="Sidebar">
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 8,
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                }}
              >
                <span>Sidebar</span>
                <SplitPane.CollapseButton which="start" />
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                <FakeFileTree />
              </div>
            </div>
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane label="Editor">
            <FakeEditor />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function NestedSection() {
  return (
    <Section
      id="nested"
      title="Nested (2×2)"
      desc="좌/우 분할 + 우측의 상/하 분할 (SplitPane 중첩)."
    >
      <Frame height={360}>
        <SplitPane.Root defaultSize="30%">
          <SplitPane.Pane>
            <FakeFileTree />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <SplitPane.Root direction="vertical" defaultSize="65%">
              <SplitPane.Pane>
                <FakeEditor />
              </SplitPane.Pane>
              <SplitPane.Divider />
              <SplitPane.Pane>
                <FakeTerminal />
              </SplitPane.Pane>
            </SplitPane.Root>
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function SnapSection() {
  return (
    <Section
      id="snap"
      title="Snap"
      desc="snapSize='50%' + snapThreshold=12. 드래그 중 중앙 근처 12px 내 진입 시 고정."
    >
      <Frame>
        <SplitPane.Root defaultSize="30%" snapSize="50%" snapThreshold={12}>
          <SplitPane.Pane>
            <PaneLabel title="Start" sub="50% 근처에서 snap" />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <PaneLabel title="End" />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function PersistSection() {
  const clear = () => {
    try {
      localStorage.removeItem("demo:splitpane:persist");
      location.reload();
    } catch {
      /* noop */
    }
  };
  return (
    <Section
      id="persist"
      title="Persist"
      desc="storageKey 지정 시 드래그 결과가 새로고침 후에도 유지된다."
    >
      <div className="mb-2 flex gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear storage
        </Button>
        <span className="text-gray-500 self-center">
          새로고침해도 드래그한 크기가 그대로 유지됩니다.
        </span>
      </div>
      <Frame>
        <SplitPane.Root storageKey="demo:splitpane:persist" defaultSize="40%">
          <SplitPane.Pane>
            <PaneLabel title="Persist start" />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <PaneLabel title="End" />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function DarkSection() {
  return (
    <Section
      id="dark"
      title="Dark theme"
      desc="theme='dark' 시 divider/handle 색상 톤이 다크로 전환."
    >
      <Frame dark>
        <SplitPane.Root theme="dark" defaultSize="35%">
          <SplitPane.Pane>
            <FakeFileTree dark />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <FakeEditor dark />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function ControlledSection() {
  const [size, setSize] = useState<SplitPaneSize>("50%");
  return (
    <Section
      id="controlled"
      title="Controlled size"
      desc="외부 state 로 size 제어. 드래그 시 onSizeChange 로 역동기화."
    >
      <div className="mb-2 flex gap-2">
        <Button variant={size === "30%" ? "primary" : "ghost"} size="sm" onClick={() => setSize("30%")}>30%</Button>
        <Button variant={size === "50%" ? "primary" : "ghost"} size="sm" onClick={() => setSize("50%")}>50%</Button>
        <Button variant={size === "70%" ? "primary" : "ghost"} size="sm" onClick={() => setSize("70%")}>70%</Button>
        <span className="text-sm text-gray-500 self-center">current: {size}</span>
      </div>
      <Frame>
        <SplitPane.Root
          size={size}
          onSizeChange={(_, pct) => setSize(`${Math.round(pct)}%`)}
        >
          <SplitPane.Pane>
            <PaneLabel title="Start" sub={String(size)} />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <PaneLabel title="End" />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function PlaygroundSection() {
  const [direction, setDirection] = useState<"horizontal" | "vertical">("horizontal");
  const [defaultSize, setDefaultSize] = useState<string>("50%");
  const [minSize, setMinSize] = useState<number>(48);
  const [maxSize, setMaxSize] = useState<string>("90%");
  const [collapsible, setCollapsible] = useState<SplitPaneCollapsible>("none");
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [snapVal, setSnapVal] = useState<string>("50%");
  const [storageEnabled, setStorageEnabled] = useState(false);
  const [theme, setTheme] = useState<SplitPaneTheme>("light");
  const [disabled, setDisabled] = useState(false);
  const [key, setKey] = useState(0);
  const [liveSize, setLiveSize] = useState<{ px: number; pct: number }>({
    px: 0,
    pct: 0,
  });

  const parsedDefault: SplitPaneSize = /^\d+$/.test(defaultSize)
    ? Number(defaultSize)
    : (defaultSize as `${number}%`);
  const parsedMax: SplitPaneSize = /^\d+$/.test(maxSize)
    ? Number(maxSize)
    : (maxSize as `${number}%`);
  const parsedSnap: SplitPaneSize | undefined = snapEnabled
    ? /^\d+$/.test(snapVal)
      ? Number(snapVal)
      : (snapVal as `${number}%`)
    : undefined;

  return (
    <Section id="playground" title="Playground" desc="모든 prop 조합을 실시간으로 시험.">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">direction</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "horizontal" | "vertical")}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="horizontal">horizontal</option>
            <option value="vertical">vertical</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">defaultSize</span>
          <select
            value={defaultSize}
            onChange={(e) => setDefaultSize(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="25%">25%</option>
            <option value="50%">50%</option>
            <option value="75%">75%</option>
            <option value="200">200 (px)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">minSize (px)</span>
          <input
            type="number"
            value={minSize}
            onChange={(e) => setMinSize(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">maxSize</span>
          <input
            type="text"
            value={maxSize}
            onChange={(e) => setMaxSize(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">collapsible</span>
          <select
            value={collapsible}
            onChange={(e) => setCollapsible(e.target.value as SplitPaneCollapsible)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="none">none</option>
            <option value="start">start</option>
            <option value="end">end</option>
            <option value="both">both</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">snapSize</span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.target.checked)}
            />
            <input
              type="text"
              value={snapVal}
              onChange={(e) => setSnapVal(e.target.value)}
              disabled={!snapEnabled}
              className="border border-gray-300 rounded px-2 py-1 font-mono text-xs flex-1"
            />
          </div>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={storageEnabled}
            onChange={(e) => setStorageEnabled(e.target.checked)}
          />
          <span className="text-gray-600">storageKey</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-gray-600">theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as SplitPaneTheme)}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(e) => setDisabled(e.target.checked)}
          />
          <span className="text-gray-600">disabled</span>
        </label>
        <div className="flex items-end">
          <Button variant="ghost" size="sm" onClick={() => setKey((k) => k + 1)}>
            Reset
          </Button>
        </div>
      </div>
      <Frame height={400} dark={theme === "dark"}>
        <SplitPane.Root
          key={key}
          direction={direction}
          defaultSize={parsedDefault}
          minSize={minSize}
          maxSize={parsedMax}
          collapsible={collapsible}
          theme={theme}
          disabled={disabled}
          onSizeChange={(px, pct) => setLiveSize({ px: Math.round(px), pct: Math.round(pct) })}
          {...(parsedSnap !== undefined ? { snapSize: parsedSnap } : {})}
          {...(storageEnabled ? { storageKey: "demo:splitpane:playground" } : {})}
        >
          <SplitPane.Pane>
            <PaneLabel
              title="Start"
              sub={`${liveSize.px} px / ${liveSize.pct}%`}
              dark={theme === "dark"}
            />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <PaneLabel title="End" dark={theme === "dark"} />
          </SplitPane.Pane>
        </SplitPane.Root>
      </Frame>
    </Section>
  );
}

function PropsSection() {
  return (
    <Section id="props" title="Props">
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2">SplitPane.Root</h4>
        <PropsTable rows={ROOT_PROPS} />
      </div>
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2">SplitPane.Pane</h4>
        <PropsTable rows={PANE_PROPS} />
      </div>
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2">SplitPane.Divider</h4>
        <PropsTable rows={DIVIDER_PROPS} />
      </div>
      <div className="mb-6">
        <h4 className="text-sm font-semibold mb-2">SplitPane.CollapseButton</h4>
        <PropsTable rows={COLLAPSE_BTN_PROPS} />
      </div>
    </Section>
  );
}

const USAGE_BASIC = `import { SplitPane } from "plastic";

export function Basic() {
  return (
    <div style={{ height: 300 }}>
      <SplitPane.Root defaultSize="40%">
        <SplitPane.Pane>
          <FileTree />
        </SplitPane.Pane>
        <SplitPane.Divider />
        <SplitPane.Pane>
          <Editor />
        </SplitPane.Pane>
      </SplitPane.Root>
    </div>
  );
}`;

const USAGE_IDE = `import { SplitPane } from "plastic";

export function IDELayout() {
  return (
    <SplitPane.Root
      defaultSize={240}
      minSize={160}
      maxSize="40%"
      collapsible="start"
      collapsedSize={32}
      storageKey="ide:sidebar"
    >
      <SplitPane.Pane label="File tree">
        <aside>
          <FileTree />
        </aside>
      </SplitPane.Pane>
      <SplitPane.Divider />
      <SplitPane.Pane label="Editor">
        <SplitPane.Root direction="vertical" defaultSize="70%" minSize={80}>
          <SplitPane.Pane>
            <Editor />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <Terminal />
          </SplitPane.Pane>
        </SplitPane.Root>
      </SplitPane.Pane>
    </SplitPane.Root>
  );
}`;

const USAGE_CONTROLLED = `import { useState } from "react";
import { SplitPane, type SplitPaneSize } from "plastic";

export function ControlledSplit() {
  const [size, setSize] = useState<SplitPaneSize>("50%");
  return (
    <SplitPane.Root
      size={size}
      onSizeChange={(_, pct) => setSize(\`\${Math.round(pct)}%\`)}
      storageKey="app:layout"
    >
      <SplitPane.Pane>
        <Left />
      </SplitPane.Pane>
      <SplitPane.Divider />
      <SplitPane.Pane>
        <Right />
      </SplitPane.Pane>
    </SplitPane.Root>
  );
}`;

const USAGE_NESTED = `import { SplitPane } from "plastic";

export function Quadrant() {
  return (
    <SplitPane.Root defaultSize="30%">
      <SplitPane.Pane>
        <Left />
      </SplitPane.Pane>
      <SplitPane.Divider />
      <SplitPane.Pane>
        <SplitPane.Root direction="vertical" defaultSize="70%">
          <SplitPane.Pane>
            <Editor />
          </SplitPane.Pane>
          <SplitPane.Divider />
          <SplitPane.Pane>
            <Terminal />
          </SplitPane.Pane>
        </SplitPane.Root>
      </SplitPane.Pane>
    </SplitPane.Root>
  );
}`;

function UsageSection() {
  return (
    <Section id="usage" title="Usage">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-600 mb-2">기본 2-pane</p>
          <CodeView code={USAGE_BASIC} language="tsx" />
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">IDE 스타일 (sidebar + editor + terminal)</p>
          <CodeView code={USAGE_IDE} language="tsx" />
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Controlled + persist</p>
          <CodeView code={USAGE_CONTROLLED} language="tsx" />
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Nested 2×2</p>
          <CodeView code={USAGE_NESTED} language="tsx" />
        </div>
      </div>
    </Section>
  );
}

export function SplitPanePage() {
  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold mb-2">SplitPane</h2>
      <p className="text-sm text-gray-500 mb-8">
        드래그 가능한 divider 로 두 영역을 분할하는 레이아웃 프리미티브.
      </p>
      <BasicHorizontalSection />
      <VerticalSection />
      <MinMaxSection />
      <CollapsibleSection />
      <NestedSection />
      <SnapSection />
      <PersistSection />
      <DarkSection />
      <ControlledSection />
      <PlaygroundSection />
      <PropsSection />
      <UsageSection />
    </div>
  );
}

export default SplitPanePage;
