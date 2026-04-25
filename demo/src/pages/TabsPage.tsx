import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, CodeView, Tabs } from "plastic";
import type { TabsActivationMode, TabsOrientation, TabsTheme } from "plastic";

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

function DemoCard({ children }: { children: ReactNode }) {
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
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">
            Prop
          </th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">
            Type
          </th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">
            Default
          </th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">
            Description
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([prop, type, def, desc]) => (
          <tr key={prop} className="border-t border-gray-100">
            <td className="px-4 py-2 font-mono text-xs">{prop}</td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">
              {type}
            </td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">{def}</td>
            <td className="px-4 py-2 text-gray-700">{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ROOT_PROPS: Array<[string, string, string, string]> = [
  ["value", "string", "—", "활성 탭 value (controlled)"],
  ["defaultValue", "string", "—", "초기 활성 탭 value (uncontrolled)"],
  ["onValueChange", "(value: string) => void", "—", "탭 전환 콜백"],
  ["orientation", "'horizontal' | 'vertical'", "'horizontal'", "탭 배치 방향"],
  [
    "activationMode",
    "'automatic' | 'manual'",
    "'automatic'",
    "automatic: 화살표 즉시 activate, manual: 화살표 focus만 + Enter/Space activate",
  ],
  ["theme", "'light' | 'dark'", "'light'", "테마"],
  ["disabled", "boolean", "false", "전체 비활성"],
  ["id", "string", "(useId)", "내부 ARIA id 접두사"],
];

const LIST_PROPS: Array<[string, string, string, string]> = [
  ["aria-label", "string", "—", "스크린리더 라벨"],
  ["aria-labelledby", "string", "—", "라벨 요소 id 참조"],
  ["scrollable", "boolean", "true", "오버플로우 시 ⟨ ⟩ 버튼 노출"],
];

const TRIGGER_PROPS: Array<[string, string, string, string]> = [
  ["value", "string", "— (필수)", "Content 와 매칭되는 식별자"],
  ["disabled", "boolean", "false", "해당 탭 비활성"],
  ["closable", "boolean", "false", "× 닫기 버튼 노출"],
  ["onClose", "(value: string) => void", "—", "× 클릭/Delete 키 핸들러"],
  ["icon", "ReactNode", "—", "라벨 앞쪽 아이콘 슬롯"],
];

const CONTENT_PROPS: Array<[string, string, string, string]> = [
  ["value", "string", "— (필수)", "Trigger 와 매칭되는 식별자"],
  [
    "forceMount",
    "boolean",
    "false",
    "true: inactive 일 때도 DOM 유지 (hidden 속성). false: inactive 시 unmount",
  ],
];

const USAGE_BASIC = `import { Tabs } from "plastic";

function App() {
  return (
    <Tabs.Root defaultValue="logs">
      <Tabs.List aria-label="Inspector">
        <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
        <Tabs.Trigger value="timing">Timing</Tabs.Trigger>
        <Tabs.Trigger value="error">Error</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="logs">로그 출력...</Tabs.Content>
      <Tabs.Content value="timing">타이밍 차트...</Tabs.Content>
      <Tabs.Content value="error">에러 상세...</Tabs.Content>
    </Tabs.Root>
  );
}`;

const USAGE_VSCODE = `function EditorTabs() {
  const [items, setItems] = useState([
    { value: "a.ts", label: "a.ts" },
    { value: "b.ts", label: "b.ts" },
    { value: "c.ts", label: "c.ts" },
  ]);
  const [active, setActive] = useState("a.ts");

  return (
    <Tabs.Root value={active} onValueChange={setActive}>
      <Tabs.List aria-label="editor tabs">
        {items.map((it) => (
          <Tabs.Trigger
            key={it.value}
            value={it.value}
            closable
            onClose={(v) => {
              const next = items.filter((i) => i.value !== v);
              setItems(next);
              if (active === v) {
                const first = next[0];
                if (first) setActive(first.value);
              }
            }}
          >
            {it.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((it) => (
        <Tabs.Content key={it.value} value={it.value} forceMount>
          Editor for {it.label}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}`;

const USAGE_VERTICAL = `<Tabs.Root
  orientation="vertical"
  activationMode="manual"
  defaultValue="general"
  style={{ display: "flex", height: 300 }}
>
  <Tabs.List aria-label="Settings">
    <Tabs.Trigger value="general">General</Tabs.Trigger>
    <Tabs.Trigger value="account">Account</Tabs.Trigger>
    <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
    <Tabs.Trigger value="advanced" disabled>
      Advanced
    </Tabs.Trigger>
  </Tabs.List>
  <div style={{ flex: 1, padding: 16 }}>
    <Tabs.Content value="general">General settings</Tabs.Content>
    <Tabs.Content value="account">Account settings</Tabs.Content>
    <Tabs.Content value="appearance">Appearance settings</Tabs.Content>
  </div>
</Tabs.Root>`;

const USAGE_CONTROLLED = `function RoutedTabs() {
  const [tab, setTab] = useState(() => {
    const h = new URLSearchParams(location.search);
    return h.get("tab") ?? "logs";
  });
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("tab", tab);
    history.replaceState(null, "", url.toString());
  }, [tab]);

  return (
    <Tabs.Root value={tab} onValueChange={setTab}>
      <Tabs.List>
        <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
        <Tabs.Trigger value="timing">Timing</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="logs">Logs panel</Tabs.Content>
      <Tabs.Content value="timing">Timing panel</Tabs.Content>
    </Tabs.Root>
  );
}`;

function PanelBox({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        fontSize: 13,
        color: "#374151",
        minHeight: 80,
      }}
    >
      {children}
    </div>
  );
}

function BasicDemo() {
  return (
    <Tabs.Root defaultValue="logs">
      <Tabs.List aria-label="Inspector tabs">
        <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
        <Tabs.Trigger value="timing">Timing</Tabs.Trigger>
        <Tabs.Trigger value="error">Error</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="logs">
        <PanelBox>로그 출력 패널. 자동 mount/unmount 전환됩니다.</PanelBox>
      </Tabs.Content>
      <Tabs.Content value="timing">
        <PanelBox>타이밍 차트 패널.</PanelBox>
      </Tabs.Content>
      <Tabs.Content value="error">
        <PanelBox>에러 상세 패널.</PanelBox>
      </Tabs.Content>
    </Tabs.Root>
  );
}

function IconsDemo() {
  return (
    <Tabs.Root defaultValue="file">
      <Tabs.List aria-label="Icon tabs">
        <Tabs.Trigger value="file" icon={<span>{"\uD83D\uDCC4"}</span>}>
          File
        </Tabs.Trigger>
        <Tabs.Trigger value="search" icon={<span>{"\uD83D\uDD0D"}</span>}>
          Search
        </Tabs.Trigger>
        <Tabs.Trigger value="git" icon={<span>{"\uD83C\uDF31"}</span>}>
          Git
        </Tabs.Trigger>
        <Tabs.Trigger
          value="ext"
          disabled
          icon={<span>{"\uD83E\uDDE9"}</span>}
        >
          Extensions
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="file">
        <PanelBox>File explorer.</PanelBox>
      </Tabs.Content>
      <Tabs.Content value="search">
        <PanelBox>Search in files.</PanelBox>
      </Tabs.Content>
      <Tabs.Content value="git">
        <PanelBox>Git status.</PanelBox>
      </Tabs.Content>
      <Tabs.Content value="ext">
        <PanelBox>Extensions market.</PanelBox>
      </Tabs.Content>
    </Tabs.Root>
  );
}

function VerticalDemo() {
  return (
    <div style={{ height: 280 }}>
      <Tabs.Root
        orientation="vertical"
        defaultValue="general"
        style={{ height: "100%" }}
      >
        <Tabs.List aria-label="Settings tabs">
          <Tabs.Trigger value="general">General</Tabs.Trigger>
          <Tabs.Trigger value="account">Account</Tabs.Trigger>
          <Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
          <Tabs.Trigger value="advanced" disabled>
            Advanced
          </Tabs.Trigger>
          <Tabs.Trigger value="shortcuts">Shortcuts</Tabs.Trigger>
        </Tabs.List>
        <div style={{ flex: 1, padding: 16 }}>
          <Tabs.Content value="general">
            <PanelBox>General preferences.</PanelBox>
          </Tabs.Content>
          <Tabs.Content value="account">
            <PanelBox>Account profile + email.</PanelBox>
          </Tabs.Content>
          <Tabs.Content value="appearance">
            <PanelBox>Theme, font, colors.</PanelBox>
          </Tabs.Content>
          <Tabs.Content value="shortcuts">
            <PanelBox>Keybindings.</PanelBox>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

function ClosableDemo() {
  const [items, setItems] = useState<Array<{ value: string; label: string }>>([
    { value: "tab-a.ts", label: "tab-a.ts" },
    { value: "tab-b.ts", label: "tab-b.ts" },
    { value: "tab-c.ts", label: "tab-c.ts" },
    { value: "tab-d.ts", label: "tab-d.ts" },
  ]);
  const [active, setActive] = useState<string>("tab-a.ts");

  const reset = () => {
    setItems([
      { value: "tab-a.ts", label: "tab-a.ts" },
      { value: "tab-b.ts", label: "tab-b.ts" },
      { value: "tab-c.ts", label: "tab-c.ts" },
      { value: "tab-d.ts", label: "tab-d.ts" },
    ]);
    setActive("tab-a.ts");
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button variant="secondary" onClick={reset}>
          reset
        </Button>
      </div>
      <Tabs.Root value={active} onValueChange={setActive}>
        <Tabs.List aria-label="Closable tabs">
          {items.map((it) => (
            <Tabs.Trigger
              key={it.value}
              value={it.value}
              closable
              onClose={(v) => {
                const next = items.filter((i) => i.value !== v);
                setItems(next);
                if (active === v) {
                  const first = next[0];
                  if (first) setActive(first.value);
                }
              }}
            >
              {it.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {items.map((it) => (
          <Tabs.Content key={it.value} value={it.value}>
            <PanelBox>{it.label} 의 컨텐츠입니다.</PanelBox>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}

function OverflowDemo() {
  const values = Array.from({ length: 18 }, (_, i) => `tab-${i + 1}`);
  return (
    <div style={{ maxWidth: 420 }}>
      <Tabs.Root defaultValue="tab-1">
        <Tabs.List aria-label="Overflow scroll tabs">
          {values.map((v) => (
            <Tabs.Trigger key={v} value={v}>
              {v}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {values.map((v) => (
          <Tabs.Content key={v} value={v}>
            <PanelBox>Content of {v}</PanelBox>
          </Tabs.Content>
        ))}
      </Tabs.Root>
      <p className="text-xs text-gray-500 mt-2">
        탭이 많으면 양 끝에 ⟨ ⟩ 버튼이 자동으로 나타납니다. 키보드 End 로 이동 시
        active 탭이 자동 스크롤 in-view 됩니다.
      </p>
    </div>
  );
}

function ActivationModeDemo() {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 260px", minWidth: 260 }}>
        <p className="text-xs font-semibold text-gray-500 mb-2">automatic</p>
        <Tabs.Root defaultValue="a" activationMode="automatic">
          <Tabs.List aria-label="automatic tabs">
            <Tabs.Trigger value="a">Alpha</Tabs.Trigger>
            <Tabs.Trigger value="b">Beta</Tabs.Trigger>
            <Tabs.Trigger value="c">Gamma</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">
            <PanelBox>ArrowKey 로 이동 시 즉시 활성.</PanelBox>
          </Tabs.Content>
          <Tabs.Content value="b">
            <PanelBox>Beta panel.</PanelBox>
          </Tabs.Content>
          <Tabs.Content value="c">
            <PanelBox>Gamma panel.</PanelBox>
          </Tabs.Content>
        </Tabs.Root>
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 260 }}>
        <p className="text-xs font-semibold text-gray-500 mb-2">manual</p>
        <Tabs.Root defaultValue="a" activationMode="manual">
          <Tabs.List aria-label="manual tabs">
            <Tabs.Trigger value="a">Alpha</Tabs.Trigger>
            <Tabs.Trigger value="b">Beta</Tabs.Trigger>
            <Tabs.Trigger value="c">Gamma</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a">
            <PanelBox>Arrow 는 focus 만 이동. Enter/Space 로 activate.</PanelBox>
          </Tabs.Content>
          <Tabs.Content value="b">
            <PanelBox>Beta panel.</PanelBox>
          </Tabs.Content>
          <Tabs.Content value="c">
            <PanelBox>Gamma panel.</PanelBox>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}

function LoggingMount({ name }: { name: string }) {
  const mountedAt = useRef<number>(Date.now());
  useEffect(() => {
    mountedAt.current = Date.now();
    return () => {};
  }, []);
  return (
    <PanelBox>
      <code className="text-xs">{name}</code> mounted at{" "}
      <code className="text-xs">{new Date(mountedAt.current).toLocaleTimeString()}</code>
      <div className="text-xs text-gray-400 mt-1">
        탭을 전환한 뒤 다시 돌아왔을 때 시간이 바뀌면 re-mount, 그대로면 cache.
      </div>
    </PanelBox>
  );
}

function LazyMountDemo() {
  return (
    <Tabs.Root defaultValue="a">
      <Tabs.List aria-label="lazy mount tabs">
        <Tabs.Trigger value="a">A (lazy)</Tabs.Trigger>
        <Tabs.Trigger value="b">B (forceMount)</Tabs.Trigger>
        <Tabs.Trigger value="c">C (lazy)</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="a">
        <LoggingMount name="A" />
      </Tabs.Content>
      <Tabs.Content value="b" forceMount>
        <LoggingMount name="B" />
      </Tabs.Content>
      <Tabs.Content value="c">
        <LoggingMount name="C" />
      </Tabs.Content>
    </Tabs.Root>
  );
}

function DarkDemo() {
  return (
    <div
      style={{
        background: "#0f172a",
        padding: 16,
        borderRadius: 8,
      }}
    >
      <Tabs.Root defaultValue="logs" theme="dark">
        <Tabs.List aria-label="Dark tabs">
          <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
          <Tabs.Trigger value="timing">Timing</Tabs.Trigger>
          <Tabs.Trigger value="error" closable onClose={() => {}}>
            Error
          </Tabs.Trigger>
          <Tabs.Trigger value="disabled" disabled>
            Disabled
          </Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="logs">
          <div style={{ padding: 16, color: "#e5e7eb", fontSize: 13 }}>
            Dark 로그 패널.
          </div>
        </Tabs.Content>
        <Tabs.Content value="timing">
          <div style={{ padding: 16, color: "#e5e7eb", fontSize: 13 }}>
            Dark 타이밍 패널.
          </div>
        </Tabs.Content>
        <Tabs.Content value="error">
          <div style={{ padding: 16, color: "#e5e7eb", fontSize: 13 }}>
            Dark 에러 패널.
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function ControlledDemo() {
  const [value, setValue] = useState<string>("logs");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => setValue("logs")}>
          → Logs
        </Button>
        <Button variant="secondary" onClick={() => setValue("timing")}>
          → Timing
        </Button>
        <Button variant="secondary" onClick={() => setValue("error")}>
          → Error
        </Button>
        <span className="text-sm text-gray-500 self-center">
          active ={" "}
          <code className="font-mono">{value}</code>
        </span>
      </div>
      <Tabs.Root value={value} onValueChange={setValue}>
        <Tabs.List aria-label="Controlled tabs">
          <Tabs.Trigger value="logs">Logs</Tabs.Trigger>
          <Tabs.Trigger value="timing">Timing</Tabs.Trigger>
          <Tabs.Trigger value="error">Error</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="logs">
          <PanelBox>Logs panel</PanelBox>
        </Tabs.Content>
        <Tabs.Content value="timing">
          <PanelBox>Timing panel</PanelBox>
        </Tabs.Content>
        <Tabs.Content value="error">
          <PanelBox>Error panel</PanelBox>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function PlaygroundDemo() {
  const [orientation, setOrientation] =
    useState<TabsOrientation>("horizontal");
  const [activationMode, setActivationMode] =
    useState<TabsActivationMode>("automatic");
  const [theme, setTheme] = useState<TabsTheme>("light");
  const [disabled, setDisabled] = useState(false);
  const [scrollable, setScrollable] = useState(true);
  const [closable, setClosable] = useState(false);
  const [forceMount, setForceMount] = useState(false);
  const [tabs, setTabs] = useState<string[]>(["one", "two", "three"]);
  const [active, setActive] = useState<string>("one");

  const addTab = () => {
    const v = `tab-${tabs.length + 1}`;
    setTabs([...tabs, v]);
  };
  const removeLast = () => {
    if (tabs.length <= 1) return;
    const last = tabs[tabs.length - 1];
    const next = tabs.slice(0, -1);
    setTabs(next);
    if (active === last) {
      const first = next[0];
      if (first) setActive(first);
    }
  };

  const config = {
    orientation,
    activationMode,
    theme,
    disabled,
    scrollable,
    closable,
    forceMount,
    tabs,
    active,
  };

  const rootStyle =
    orientation === "vertical"
      ? { display: "flex", height: 260 }
      : undefined;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "260px minmax(0, 1fr)" }}
    >
      <div
        style={{
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          fontSize: 12,
          background: "#fafafa",
        }}
      >
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Controls</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label>
            <span className="block text-xs text-gray-500 mb-1">orientation</span>
            <select
              value={orientation}
              onChange={(e) =>
                setOrientation(e.target.value as TabsOrientation)
              }
              className="border border-gray-300 rounded px-2 py-1 w-full"
            >
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </select>
          </label>
          <label>
            <span className="block text-xs text-gray-500 mb-1">
              activationMode
            </span>
            <select
              value={activationMode}
              onChange={(e) =>
                setActivationMode(e.target.value as TabsActivationMode)
              }
              className="border border-gray-300 rounded px-2 py-1 w-full"
            >
              <option value="automatic">automatic</option>
              <option value="manual">manual</option>
            </select>
          </label>
          <label>
            <span className="block text-xs text-gray-500 mb-1">theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as TabsTheme)}
              className="border border-gray-300 rounded px-2 py-1 w-full"
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
            <span>disabled (Root)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scrollable}
              onChange={(e) => setScrollable(e.target.checked)}
            />
            <span>scrollable</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={closable}
              onChange={(e) => setClosable(e.target.checked)}
            />
            <span>closable (all)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={forceMount}
              onChange={(e) => setForceMount(e.target.checked)}
            />
            <span>forceMount (all)</span>
          </label>
          <div className="flex gap-2 mt-1">
            <Button variant="secondary" size="sm" onClick={addTab}>
              + tab
            </Button>
            <Button variant="secondary" size="sm" onClick={removeLast}>
              − tab
            </Button>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            active: <code>{active}</code>
            <br />
            tabs: <code>{tabs.length}</code>
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            padding: 12,
            background: theme === "dark" ? "#0f172a" : "#ffffff",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <Tabs.Root
            value={active}
            onValueChange={setActive}
            orientation={orientation}
            activationMode={activationMode}
            theme={theme}
            disabled={disabled}
            {...(rootStyle ? { style: rootStyle } : {})}
          >
            <Tabs.List
              aria-label="Playground tabs"
              scrollable={scrollable}
              {...(orientation === "vertical"
                ? { style: { width: 160 } }
                : {})}
            >
              {tabs.map((v) => (
                <Tabs.Trigger
                  key={v}
                  value={v}
                  closable={closable}
                  {...(closable
                    ? {
                        onClose: (vv) => {
                          const next = tabs.filter((t) => t !== vv);
                          setTabs(next);
                          if (active === vv) {
                            const first = next[0];
                            if (first) setActive(first);
                          }
                        },
                      }
                    : {})}
                >
                  {v}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            <div
              style={
                orientation === "vertical"
                  ? { flex: 1, padding: 16 }
                  : undefined
              }
            >
              {tabs.map((v) => (
                <Tabs.Content key={v} value={v} forceMount={forceMount}>
                  <div
                    style={{
                      padding: 16,
                      color: theme === "dark" ? "#e5e7eb" : "#374151",
                      fontSize: 13,
                    }}
                  >
                    Content for <code>{v}</code>
                  </div>
                </Tabs.Content>
              ))}
            </div>
          </Tabs.Root>
        </div>
        <pre className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-[11px] overflow-x-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default function TabsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Tabs
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          수평/수직, automatic/manual, closable, overflow scroll, lazy-mount,
          animated indicator 를 갖춘 compound 탭 프리미티브.
        </p>
      </header>

      <Section id="basic" title="Basic" desc="3개 탭 — 클릭 + Arrow 로 전환.">
        <DemoCard>
          <BasicDemo />
        </DemoCard>
      </Section>

      <Section
        id="icons"
        title="Icons"
        desc="Trigger 의 icon prop 으로 앞쪽 아이콘 슬롯 지정."
      >
        <DemoCard>
          <IconsDemo />
        </DemoCard>
      </Section>

      <Section
        id="vertical"
        title="Vertical"
        desc="orientation='vertical' — 좌측 List, 우측 Content. 좌측 2px 인디케이터."
      >
        <DemoCard>
          <VerticalDemo />
        </DemoCard>
      </Section>

      <Section
        id="closable"
        title="Closable"
        desc="closable + onClose — × 버튼 클릭 또는 Delete 키로 close. 부모가 items 관리."
      >
        <DemoCard>
          <ClosableDemo />
        </DemoCard>
      </Section>

      <Section
        id="overflow"
        title="Overflow scroll"
        desc="List 폭을 초과하면 양 끝 ⟨ ⟩ 버튼 자동 노출. active 탭 auto scrollIntoView."
      >
        <DemoCard>
          <OverflowDemo />
        </DemoCard>
      </Section>

      <Section
        id="activation"
        title="Auto vs Manual"
        desc="automatic: Arrow 로 이동 시 content 즉시 전환. manual: Arrow 는 focus 만, Enter/Space 로 activate."
      >
        <DemoCard>
          <ActivationModeDemo />
        </DemoCard>
      </Section>

      <Section
        id="lazy"
        title="Lazy mount"
        desc="기본은 active 만 렌더. forceMount 지정 시 inactive 도 hidden 상태로 유지. B 탭만 forceMount — 전환 후 돌아와도 mount time 이 유지됨."
      >
        <DemoCard>
          <LazyMountDemo />
        </DemoCard>
      </Section>

      <Section id="dark" title="Dark Theme" desc="theme='dark'.">
        <DemoCard>
          <DarkDemo />
        </DemoCard>
      </Section>

      <Section
        id="controlled"
        title="Controlled"
        desc="외부 state + onValueChange 로 프로그램적 전환."
      >
        <DemoCard>
          <ControlledDemo />
        </DemoCard>
      </Section>

      <Section
        id="playground"
        title="Playground"
        desc="모든 prop 토글."
      >
        <DemoCard>
          <PlaygroundDemo />
        </DemoCard>
      </Section>

      <Section id="props" title="Props" desc="Root / List / Trigger / Content.">
        <div className="grid gap-6">
          <div>
            <p className="text-sm font-semibold mb-2">Tabs.Root</p>
            <PropsTable rows={ROOT_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Tabs.List</p>
            <PropsTable rows={LIST_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Tabs.Trigger</p>
            <PropsTable rows={TRIGGER_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Tabs.Content</p>
            <PropsTable rows={CONTENT_PROPS} />
          </div>
        </div>
      </Section>

      <Section id="usage" title="Usage" desc="4 개 스니펫.">
        <div className="grid gap-6">
          <div>
            <p className="text-sm font-semibold mb-2">Basic</p>
            <CodeView code={USAGE_BASIC} language="tsx" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">VSCode-style Editor</p>
            <CodeView code={USAGE_VSCODE} language="tsx" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Settings (vertical / manual)</p>
            <CodeView code={USAGE_VERTICAL} language="tsx" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Controlled + URL router</p>
            <CodeView code={USAGE_CONTROLLED} language="tsx" />
          </div>
        </div>
      </Section>
    </div>
  );
}
