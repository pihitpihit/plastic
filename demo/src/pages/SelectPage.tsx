import { useState, type ReactNode } from "react";
import { Button, CodeView, Select } from "plastic";

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

function Card({ children }: { children: ReactNode }) {
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
  ["value", "string", "—", "선택값 (controlled)"],
  ["defaultValue", "string", "—", "초기 선택값 (uncontrolled)"],
  ["onValueChange", "(value: string) => void", "—", "선택값 변경 콜백"],
  ["open", "boolean", "—", "열림 상태 (controlled)"],
  ["defaultOpen", "boolean", "false", "초기 열림 상태"],
  ["onOpenChange", "(open: boolean) => void", "—", "열림 상태 변경 콜백"],
  ["placeholder", "string", "—", "선택값 없을 때 Trigger 표시 문구"],
  ["disabled", "boolean", "false", "전체 비활성"],
  ["name", "string", "—", "form hidden input name (있으면 hidden input 렌더)"],
  ["required", "boolean", "false", "form required"],
  ["theme", "'light' | 'dark'", "'light'", "테마"],
];

const TRIGGER_PROPS: Array<[string, string, string, string]> = [
  [
    "...ButtonHTMLAttributes",
    "—",
    "—",
    "type / onClick 제외한 button 속성 전부 전달",
  ],
  ["style / className", "—", "—", "스타일 오버라이드"],
];

const CONTENT_PROPS: Array<[string, string, string, string]> = [
  ["side", "'top' | 'right' | 'bottom' | 'left'", "'bottom'", "팝업 배치 면"],
  ["align", "'start' | 'center' | 'end'", "'start'", "Trigger 기준 정렬"],
  ["sideOffset", "number", "4", "Trigger ↔ 팝업 간격 (px)"],
  ["maxHeight", "number", "320", "팝업 최대 높이 (px)"],
  ["matchTriggerWidth", "boolean", "true", "Trigger 너비에 맞춤"],
  ["minWidth", "number", "—", "matchTriggerWidth=false 일 때 최소 너비"],
  ["closeOnOutsideClick", "boolean", "true", "바깥 클릭 시 닫힘"],
  ["closeOnEscape", "boolean", "true", "Escape 시 닫힘"],
];

const ITEM_PROPS: Array<[string, string, string, string]> = [
  ["value", "string", "—", "아이템 값 (필수, 고유)"],
  ["disabled", "boolean", "false", "비활성 — 마우스/키보드 선택 불가"],
  [
    "textValue",
    "string",
    "(textContent)",
    "type-ahead 매칭용 문자열. 커스텀 render 시 명시 권장",
  ],
];

const GROUP_PROPS: Array<[string, string, string, string]> = [
  ["label", "ReactNode", "—", "그룹 헤더 — 내부에 Label 자동 렌더"],
];

const VALUE_PROPS: Array<[string, string, string, string]> = [
  ["placeholder", "string", "—", "ctx.placeholder 대신 로컬 override"],
  [
    "children",
    "ReactNode | (value) => ReactNode",
    "—",
    "커스텀 표시. 함수 형태면 render-prop",
  ],
];

const USAGE_BASIC = `import { Select } from "plastic";

function App() {
  return (
    <Select.Root placeholder="언어 선택…">
      <Select.Trigger>
        <Select.Value />
        <Select.Icon />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="ts">TypeScript</Select.Item>
        <Select.Item value="js">JavaScript</Select.Item>
        <Select.Item value="py">Python</Select.Item>
      </Select.Content>
    </Select.Root>
  );
}`;

const USAGE_GROUPED = `<Select.Root defaultValue="ts">
  <Select.Trigger>
    <Select.Value />
    <Select.Icon />
  </Select.Trigger>
  <Select.Content>
    <Select.Group label="프론트엔드">
      <Select.Item value="ts">
        <Select.ItemIndicator />
        <span>TypeScript</span>
      </Select.Item>
      <Select.Item value="js">
        <Select.ItemIndicator />
        <span>JavaScript</span>
      </Select.Item>
    </Select.Group>
    <Select.Separator />
    <Select.Group label="백엔드">
      <Select.Item value="py">
        <Select.ItemIndicator />
        <span>Python</span>
      </Select.Item>
    </Select.Group>
  </Select.Content>
</Select.Root>`;

const USAGE_CONTROLLED_FORM = `function FormSelect() {
  const [lang, setLang] = useState("ts");
  return (
    <form onSubmit={handleSubmit}>
      <Select.Root name="lang" required value={lang} onValueChange={setLang}>
        <Select.Trigger>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ts">TypeScript</Select.Item>
          <Select.Item value="py">Python</Select.Item>
        </Select.Content>
      </Select.Root>
      <button type="submit">제출</button>
    </form>
  );
}`;

const USAGE_CUSTOM = `<Select.Item value="ts" textValue="TypeScript">
  <TSBadge />
  <span style={{ flex: 1 }}>TypeScript</span>
  <span style={{ marginLeft: "auto", color: "#9ca3af" }}>.ts</span>
</Select.Item>`;

function BasicDemo() {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <div className="flex items-center gap-4">
      <Select.Root
        value={value}
        onValueChange={setValue}
        placeholder="언어 선택…"
      >
        <Select.Trigger aria-label="언어" style={{ minWidth: 180 }}>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ts">TypeScript</Select.Item>
          <Select.Item value="js">JavaScript</Select.Item>
          <Select.Item value="py">Python</Select.Item>
          <Select.Item value="go">Go</Select.Item>
          <Select.Item value="rs">Rust</Select.Item>
        </Select.Content>
      </Select.Root>
      <span className="text-sm text-gray-500">
        현재: <code className="font-mono">{value ?? "(없음)"}</code>
      </span>
    </div>
  );
}

function GroupedDemo() {
  return (
    <Select.Root defaultValue="ts" placeholder="언어">
      <Select.Trigger aria-label="언어" style={{ minWidth: 220 }}>
        <Select.Value />
        <Select.Icon />
      </Select.Trigger>
      <Select.Content>
        <Select.Group label="프론트엔드">
          <Select.Item value="ts">
            <Select.ItemIndicator />
            <span>TypeScript</span>
          </Select.Item>
          <Select.Item value="js">
            <Select.ItemIndicator />
            <span>JavaScript</span>
          </Select.Item>
        </Select.Group>
        <Select.Separator />
        <Select.Group label="백엔드">
          <Select.Item value="py">
            <Select.ItemIndicator />
            <span>Python</span>
          </Select.Item>
          <Select.Item value="go">
            <Select.ItemIndicator />
            <span>Go</span>
          </Select.Item>
          <Select.Item value="rs">
            <Select.ItemIndicator />
            <span>Rust</span>
          </Select.Item>
        </Select.Group>
      </Select.Content>
    </Select.Root>
  );
}

function DisabledDemo() {
  return (
    <div className="flex items-center gap-4">
      <Select.Root defaultValue="ts" placeholder="언어">
        <Select.Trigger aria-label="언어 (Item 일부 disabled)" style={{ minWidth: 220 }}>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ts">TypeScript</Select.Item>
          <Select.Item value="js">JavaScript</Select.Item>
          <Select.Item value="rs" disabled>
            Rust (준비 중)
          </Select.Item>
          <Select.Item value="ko" disabled>
            Kotlin (준비 중)
          </Select.Item>
          <Select.Item value="py">Python</Select.Item>
        </Select.Content>
      </Select.Root>
      <Select.Root disabled defaultValue="ts" placeholder="비활성">
        <Select.Trigger aria-label="Select 전체 disabled" style={{ minWidth: 180 }}>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ts">TypeScript</Select.Item>
          <Select.Item value="js">JavaScript</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>
  );
}

function ControlledDemo() {
  const [value, setValue] = useState<string>("ts");
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button variant="secondary" onClick={() => setValue("ts")}>
        TS
      </Button>
      <Button variant="secondary" onClick={() => setValue("py")}>
        Python
      </Button>
      <Button variant="secondary" onClick={() => setValue("go")}>
        Go
      </Button>
      <Select.Root value={value} onValueChange={setValue}>
        <Select.Trigger aria-label="언어" style={{ minWidth: 200 }}>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ts">TypeScript</Select.Item>
          <Select.Item value="py">Python</Select.Item>
          <Select.Item value="go">Go</Select.Item>
        </Select.Content>
      </Select.Root>
      <span className="text-sm text-gray-500">
        현재: <code className="font-mono">{value}</code>
      </span>
    </div>
  );
}

function CustomRenderDemo() {
  const languages = [
    { value: "ts", label: "TypeScript", ext: ".ts", badge: "TS", color: "#3178c6" },
    { value: "js", label: "JavaScript", ext: ".js", badge: "JS", color: "#f7df1e" },
    { value: "py", label: "Python", ext: ".py", badge: "Py", color: "#306998" },
    { value: "go", label: "Go", ext: ".go", badge: "Go", color: "#00add8" },
    { value: "rs", label: "Rust", ext: ".rs", badge: "Rs", color: "#dea584" },
  ];
  return (
    <Select.Root defaultValue="ts" placeholder="언어">
      <Select.Trigger aria-label="언어" style={{ minWidth: 260 }}>
        <Select.Value />
        <Select.Icon />
      </Select.Trigger>
      <Select.Content minWidth={260}>
        {languages.map((l) => (
          <Select.Item key={l.value} value={l.value} textValue={l.label}>
            <span
              style={{
                width: 18,
                height: 18,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: l.color,
                color: l.value === "js" ? "#000" : "#fff",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 3,
                flexShrink: 0,
              }}
            >
              {l.badge}
            </span>
            <span style={{ flex: 1 }}>{l.label}</span>
            <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
              {l.ext}
            </span>
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

const TIMEZONES = [
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Halifax",
  "America/Lima",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Bangkok",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Ho_Chi_Minh",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Taipei",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Atlantic/Azores",
  "Atlantic/Reykjavik",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Honolulu",
  "UTC",
];

function LongListDemo() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select.Root defaultValue="Asia/Seoul" placeholder="타임존">
        <Select.Trigger aria-label="타임존" style={{ minWidth: 260 }}>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content maxHeight={320}>
          {TIMEZONES.map((tz) => (
            <Select.Item key={tz} value={tz}>
              {tz}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <span className="text-sm text-gray-500">
        팝업 open 상태에서 <code className="font-mono">"as"</code> 타이핑 → Asia 로 점프
      </span>
    </div>
  );
}

function DarkDemo() {
  return (
    <div
      style={{
        background: "#0f172a",
        padding: 24,
        borderRadius: 8,
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Select.Root theme="dark" defaultValue="ts" placeholder="언어">
        <Select.Trigger aria-label="언어" style={{ minWidth: 200 }}>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Group label="프론트엔드">
            <Select.Item value="ts">
              <Select.ItemIndicator />
              <span>TypeScript</span>
            </Select.Item>
            <Select.Item value="js">
              <Select.ItemIndicator />
              <span>JavaScript</span>
            </Select.Item>
          </Select.Group>
          <Select.Separator />
          <Select.Group label="백엔드">
            <Select.Item value="py">
              <Select.ItemIndicator />
              <span>Python</span>
            </Select.Item>
            <Select.Item value="go">
              <Select.ItemIndicator />
              <span>Go</span>
            </Select.Item>
            <Select.Item value="rs" disabled>
              Rust (준비 중)
            </Select.Item>
          </Select.Group>
        </Select.Content>
      </Select.Root>
      <span style={{ color: "#94a3b8", fontSize: 13 }}>
        dark theme — Trigger/Content/Item 전체 색상 전환
      </span>
    </div>
  );
}

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

function PlaygroundDemo() {
  const [placeholder, setPlaceholder] = useState("선택하세요…");
  const [side, setSide] = useState<Side>("bottom");
  const [align, setAlign] = useState<Align>("start");
  const [sideOffset, setSideOffset] = useState(4);
  const [maxHeight, setMaxHeight] = useState(320);
  const [matchTriggerWidth, setMatchTriggerWidth] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [value, setValue] = useState<string | undefined>(undefined);

  const demoBg = theme === "dark" ? "#0f172a" : "#f9fafb";
  const demoFg = theme === "dark" ? "#e5e7eb" : "#374151";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-md border border-gray-200">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          placeholder
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          side
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as Side)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="top">top</option>
            <option value="right">right</option>
            <option value="bottom">bottom</option>
            <option value="left">left</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          align
          <select
            value={align}
            onChange={(e) => setAlign(e.target.value as Align)}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="start">start</option>
            <option value="center">center</option>
            <option value="end">end</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          sideOffset
          <input
            type="number"
            value={sideOffset}
            onChange={(e) => setSideOffset(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          maxHeight
          <input
            type="number"
            value={maxHeight}
            onChange={(e) => setMaxHeight(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 pt-4">
          <input
            type="checkbox"
            checked={matchTriggerWidth}
            onChange={(e) => setMatchTriggerWidth(e.target.checked)}
          />
          matchTriggerWidth
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-600 pt-4">
          <input
            type="checkbox"
            checked={disabled}
            onChange={(e) => setDisabled(e.target.checked)}
          />
          disabled
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          theme
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark")}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
      </div>

      <div
        style={{
          background: demoBg,
          color: demoFg,
          padding: 40,
          borderRadius: 8,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Select.Root
          value={value}
          onValueChange={setValue}
          placeholder={placeholder}
          disabled={disabled}
          theme={theme}
        >
          <Select.Trigger aria-label="Playground" style={{ minWidth: 220 }}>
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Content
            side={side}
            align={align}
            sideOffset={sideOffset}
            maxHeight={maxHeight}
            matchTriggerWidth={matchTriggerWidth}
          >
            <Select.Item value="ts">TypeScript</Select.Item>
            <Select.Item value="js">JavaScript</Select.Item>
            <Select.Item value="py">Python</Select.Item>
            <Select.Item value="go">Go</Select.Item>
            <Select.Item value="rs">Rust</Select.Item>
            <Select.Item value="java">Java</Select.Item>
            <Select.Item value="kt">Kotlin</Select.Item>
            <Select.Item value="swift">Swift</Select.Item>
          </Select.Content>
        </Select.Root>
        <span style={{ fontSize: 13 }}>
          value: <code className="font-mono">{value ?? "(없음)"}</code>
        </span>
      </div>
    </div>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setSubmitted(String(data.get("lang") ?? ""));
      }}
      className="flex items-center gap-3 flex-wrap"
    >
      <Select.Root name="lang" required defaultValue="ts">
        <Select.Trigger aria-label="언어" style={{ minWidth: 200 }}>
          <Select.Value />
          <Select.Icon />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="ts">TypeScript</Select.Item>
          <Select.Item value="js">JavaScript</Select.Item>
          <Select.Item value="py">Python</Select.Item>
          <Select.Item value="go">Go</Select.Item>
        </Select.Content>
      </Select.Root>
      <Button type="submit">제출</Button>
      {submitted !== null && (
        <span className="text-sm text-gray-600">
          제출됨: <code className="font-mono">lang={submitted}</code>
        </span>
      )}
    </form>
  );
}

export default function SelectPage() {
  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Select</h1>
        <p className="text-sm text-gray-500 mt-1">
          옵션이 유한한 enumerable 값 중 하나를 선택하는 폼 컨트롤. Radix Select
          와 동일한 compound API.
        </p>
      </header>

      <Section id="basic" title="Basic" desc="Trigger + Content + Item 기본 구조.">
        <Card>
          <BasicDemo />
        </Card>
      </Section>

      <Section
        id="grouped"
        title="Grouped + ItemIndicator"
        desc="Group/Label/Separator. 선택된 항목에 ✓ 인디케이터."
      >
        <Card>
          <GroupedDemo />
        </Card>
      </Section>

      <Section
        id="disabled"
        title="Disabled"
        desc="개별 Item 과 Select 전체 disabled. 키보드 이동 시 disabled Item 은 건너뜀."
      >
        <Card>
          <DisabledDemo />
        </Card>
      </Section>

      <Section
        id="controlled"
        title="Controlled"
        desc="외부 state 로 value 제어. 외부 버튼 변경 → Trigger 라벨 즉시 갱신."
      >
        <Card>
          <ControlledDemo />
        </Card>
      </Section>

      <Section
        id="form"
        title="Form"
        desc="name prop 을 주면 hidden input 으로 값이 form submit 에 포함됨."
      >
        <Card>
          <FormDemo />
        </Card>
      </Section>

      <Section
        id="custom-render"
        title="Custom Render"
        desc="Item 에 임의 children. textValue prop 으로 type-ahead 문자열 명시."
      >
        <Card>
          <CustomRenderDemo />
        </Card>
      </Section>

      <Section
        id="long-list"
        title="Long List + Type-ahead"
        desc="많은 옵션 + maxHeight 스크롤. 팝업 open 중 문자 타이핑 → startsWith 매칭으로 점프. 500ms 미입력 시 버퍼 리셋."
      >
        <Card>
          <LongListDemo />
        </Card>
      </Section>

      <Section
        id="dark"
        title="Dark Theme"
        desc="theme='dark' — Trigger / Content / Item / Group label 전체가 어두운 팔레트로 전환."
      >
        <DarkDemo />
      </Section>

      <Section id="props" title="Props">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-semibold mb-2">Select.Root</p>
            <PropsTable rows={ROOT_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Select.Trigger</p>
            <PropsTable rows={TRIGGER_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Select.Value</p>
            <PropsTable rows={VALUE_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Select.Content</p>
            <PropsTable rows={CONTENT_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Select.Item</p>
            <PropsTable rows={ITEM_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Select.Group</p>
            <PropsTable rows={GROUP_PROPS} />
          </div>
        </div>
      </Section>

      <Section id="usage" title="Usage">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-semibold mb-2">1. 기본 Select</p>
            <CodeView code={USAGE_BASIC} language="tsx" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">2. 그룹 + 구분선 + ✓</p>
            <CodeView code={USAGE_GROUPED} language="tsx" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">3. Controlled + form</p>
            <CodeView code={USAGE_CONTROLLED_FORM} language="tsx" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">4. Custom render</p>
            <CodeView code={USAGE_CUSTOM} language="tsx" />
          </div>
        </div>
      </Section>

      <Section
        id="playground"
        title="Playground"
        desc="모든 제어 가능한 옵션을 실시간으로 조합해 볼 수 있는 섹션."
      >
        <PlaygroundDemo />
      </Section>
    </div>
  );
}
