import { useState, type ReactNode } from "react";
import { Accordion, CodeView } from "plastic";

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

function DarkCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-6 rounded-lg border"
      style={{ background: "#0b0c10", borderColor: "#23262d" }}
    >
      {children}
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  {
    q: "What is plastic?",
    a: "A runtime-zero, headless React component library focused on accessible primitives.",
  },
  {
    q: "How is theming handled?",
    a: "Each component exposes light/dark palettes injected as CSS custom properties on the root element.",
  },
  {
    q: "Can I bring my own styles?",
    a: "Yes — every Accordion subcomponent accepts className and style props for full customization.",
  },
];

function BasicSection() {
  return (
    <Card>
      <Accordion.Root type="single" collapsible defaultValue="item-1">
        {FAQ.map((it, i) => (
          <Accordion.Item key={i} value={`item-${i + 1}`}>
            <Accordion.Header>
              <Accordion.Trigger>{it.q}</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <p className="text-sm text-gray-600 px-4 pb-3">{it.a}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Card>
  );
}

function MultipleSection() {
  return (
    <Card>
      <Accordion.Root
        type="multiple"
        defaultValue={["item-1", "item-3"]}
      >
        {FAQ.map((it, i) => (
          <Accordion.Item key={i} value={`item-${i + 1}`}>
            <Accordion.Header>
              <Accordion.Trigger>{it.q}</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <p className="text-sm text-gray-600 px-4 pb-3">{it.a}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Card>
  );
}

function DisabledSection() {
  return (
    <Card>
      <Accordion.Root type="single" collapsible defaultValue="enabled-1">
        <Accordion.Item value="enabled-1">
          <Accordion.Header>
            <Accordion.Trigger>Enabled item</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <p className="text-sm text-gray-600 px-4 pb-3">
              This item can be toggled normally.
            </p>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="disabled-1" disabled>
          <Accordion.Header>
            <Accordion.Trigger>Disabled item</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <p className="text-sm text-gray-600 px-4 pb-3">
              This panel cannot be opened.
            </p>
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="enabled-2">
          <Accordion.Header>
            <Accordion.Trigger>Another enabled item</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <p className="text-sm text-gray-600 px-4 pb-3">
              Tab/Arrow navigation skips disabled items by default.
            </p>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </Card>
  );
}

function ControlledSection() {
  const [value, setValue] = useState<string | null>("item-1");
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <span>open:</span>
        <code className="px-1.5 py-0.5 bg-gray-100 rounded">
          {value ?? "null"}
        </code>
      </div>
      <Accordion.Root
        type="single"
        collapsible
        value={value}
        onValueChange={setValue}
      >
        {FAQ.map((it, i) => (
          <Accordion.Item key={i} value={`item-${i + 1}`}>
            <Accordion.Header>
              <Accordion.Trigger>{it.q}</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <p className="text-sm text-gray-600 px-4 pb-3">{it.a}</p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </Card>
  );
}

function DarkSection() {
  return (
    <DarkCard>
      <Accordion.Root
        type="single"
        collapsible
        defaultValue="item-1"
        theme="dark"
      >
        {FAQ.map((it, i) => (
          <Accordion.Item key={i} value={`item-${i + 1}`}>
            <Accordion.Header>
              <Accordion.Trigger>{it.q}</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content>
              <p
                className="text-sm px-4 pb-3"
                style={{ color: "#9ba3af" }}
              >
                {it.a}
              </p>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </DarkCard>
  );
}

function PropsSection() {
  return (
    <Card>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 uppercase">
            <th className="py-2 pr-4">Prop</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Default</th>
            <th className="py-2">Notes</th>
          </tr>
        </thead>
        <tbody className="text-gray-700">
          <tr className="border-t border-gray-100">
            <td className="py-2 pr-4 font-mono">type</td>
            <td className="py-2 pr-4 font-mono">"single" | "multiple"</td>
            <td className="py-2 pr-4 font-mono">"single"</td>
            <td className="py-2">Single allows one open item; multiple allows many.</td>
          </tr>
          <tr className="border-t border-gray-100">
            <td className="py-2 pr-4 font-mono">collapsible</td>
            <td className="py-2 pr-4 font-mono">boolean</td>
            <td className="py-2 pr-4 font-mono">false</td>
            <td className="py-2">single 모드에서만; 열린 항목 재클릭 시 닫힘.</td>
          </tr>
          <tr className="border-t border-gray-100">
            <td className="py-2 pr-4 font-mono">value / defaultValue</td>
            <td className="py-2 pr-4 font-mono">string | string[] | null</td>
            <td className="py-2 pr-4">—</td>
            <td className="py-2">Controlled / uncontrolled selected value(s).</td>
          </tr>
          <tr className="border-t border-gray-100">
            <td className="py-2 pr-4 font-mono">disabled</td>
            <td className="py-2 pr-4 font-mono">boolean</td>
            <td className="py-2 pr-4 font-mono">false</td>
            <td className="py-2">Root 또는 Item 별로 비활성화.</td>
          </tr>
          <tr className="border-t border-gray-100">
            <td className="py-2 pr-4 font-mono">disabledFocus</td>
            <td className="py-2 pr-4 font-mono">"skip" | "stay"</td>
            <td className="py-2 pr-4 font-mono">"skip"</td>
            <td className="py-2">키보드 포커스 시 disabled 항목 건너뛰기 여부.</td>
          </tr>
          <tr className="border-t border-gray-100">
            <td className="py-2 pr-4 font-mono">theme</td>
            <td className="py-2 pr-4 font-mono">"light" | "dark"</td>
            <td className="py-2 pr-4 font-mono">"light"</td>
            <td className="py-2">CSS 변수 팔레트 토글.</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

const USAGE_BASIC = `import { Accordion } from "plastic";

<Accordion.Root type="single" collapsible defaultValue="a">
  <Accordion.Item value="a">
    <Accordion.Header>
      <Accordion.Trigger>Question A</Accordion.Trigger>
    </Accordion.Header>
    <Accordion.Content>Answer A</Accordion.Content>
  </Accordion.Item>
</Accordion.Root>`;

const USAGE_MULTIPLE = `<Accordion.Root type="multiple" defaultValue={["a", "b"]}>
  {/* multiple panels can be open simultaneously */}
</Accordion.Root>`;

const USAGE_CONTROLLED = `const [value, setValue] = useState<string | null>("a");

<Accordion.Root
  type="single"
  collapsible
  value={value}
  onValueChange={setValue}
>
  {/* ... */}
</Accordion.Root>`;

function UsageSection() {
  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-gray-500 mb-2">Basic</p>
        <CodeView code={USAGE_BASIC} language="tsx" showLineNumbers={false} />
      </Card>
      <Card>
        <p className="text-xs text-gray-500 mb-2">Multiple</p>
        <CodeView code={USAGE_MULTIPLE} language="tsx" showLineNumbers={false} />
      </Card>
      <Card>
        <p className="text-xs text-gray-500 mb-2">Controlled</p>
        <CodeView
          code={USAGE_CONTROLLED}
          language="tsx"
          showLineNumbers={false}
        />
      </Card>
    </div>
  );
}

export default function AccordionPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accordion</h1>
        <p className="text-sm text-gray-500">
          접고 펼치는 패널 그룹. single/multiple, collapsible, controlled,
          키보드 내비게이션, dark theme 지원.
        </p>
      </header>

      <Section id="basic" title="Basic" desc="single + collapsible. 한 번에 하나만 열림.">
        <BasicSection />
      </Section>

      <Section id="multiple" title="Multiple" desc="여러 항목을 동시에 열 수 있음.">
        <MultipleSection />
      </Section>

      <Section id="disabled" title="Disabled" desc="Item 단위로 비활성화. 키보드는 기본적으로 건너뜀.">
        <DisabledSection />
      </Section>

      <Section id="controlled" title="Controlled" desc="value/onValueChange로 외부 상태 제어.">
        <ControlledSection />
      </Section>

      <Section id="dark" title="Dark Theme">
        <DarkSection />
      </Section>

      <Section id="props" title="Props">
        <PropsSection />
      </Section>

      <Section id="usage" title="Usage">
        <UsageSection />
      </Section>
    </div>
  );
}
