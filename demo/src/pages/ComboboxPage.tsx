import { useState, type ReactNode } from "react";
import { CodeView, Combobox, type ComboboxOption } from "plastic";

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

const FRUITS: ComboboxOption[] = [
  { value: "apple", label: "Apple" },
  { value: "apricot", label: "Apricot" },
  { value: "banana", label: "Banana" },
  { value: "blueberry", label: "Blueberry" },
  { value: "cherry", label: "Cherry" },
  { value: "coconut", label: "Coconut" },
  { value: "date", label: "Date" },
  { value: "fig", label: "Fig" },
  { value: "grape", label: "Grape" },
  { value: "kiwi", label: "Kiwi" },
  { value: "lemon", label: "Lemon" },
  { value: "lime", label: "Lime" },
  { value: "mango", label: "Mango" },
  { value: "melon", label: "Melon" },
  { value: "orange", label: "Orange" },
  { value: "papaya", label: "Papaya" },
  { value: "peach", label: "Peach" },
  { value: "pear", label: "Pear" },
  { value: "pineapple", label: "Pineapple" },
  { value: "plum", label: "Plum" },
];

const GROUPED: ComboboxOption[] = [
  { value: "react", label: "React", group: "Frontend" },
  { value: "vue", label: "Vue", group: "Frontend" },
  { value: "svelte", label: "Svelte", group: "Frontend" },
  { value: "node", label: "Node.js", group: "Backend" },
  { value: "deno", label: "Deno", group: "Backend" },
  { value: "bun", label: "Bun", group: "Backend" },
  { value: "postgres", label: "PostgreSQL", group: "Database" },
  { value: "redis", label: "Redis", group: "Database" },
];

function BasicSection() {
  return (
    <Card>
      <Combobox.Root options={FRUITS} placeholder="Pick a fruit…">
        <Combobox.Input />
        <Combobox.Content>
          {FRUITS.map((opt) => (
            <Combobox.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Combobox.Item>
          ))}
          <Combobox.Empty>No matches</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>
    </Card>
  );
}

function GroupedSection() {
  const groups = Array.from(new Set(GROUPED.map((o) => o.group ?? "other")));
  return (
    <Card>
      <Combobox.Root options={GROUPED} placeholder="Pick a tech…">
        <Combobox.Input />
        <Combobox.Content>
          {groups.map((g) => (
            <Combobox.Group key={g} heading={g}>
              {GROUPED.filter((o) => (o.group ?? "other") === g).map((opt) => (
                <Combobox.Item key={opt.value} value={opt.value}>
                  {opt.label}
                </Combobox.Item>
              ))}
            </Combobox.Group>
          ))}
          <Combobox.Empty>No matches</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>
    </Card>
  );
}

function MultipleSection() {
  return (
    <Card>
      <Combobox.Root multiple options={FRUITS} placeholder="Pick fruits…">
        <Combobox.Input />
        <Combobox.Content>
          {FRUITS.map((opt) => (
            <Combobox.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Combobox.Item>
          ))}
          <Combobox.Empty>No matches</Combobox.Empty>
        </Combobox.Content>
      </Combobox.Root>
    </Card>
  );
}

function ControlledSection() {
  const [value, setValue] = useState<string | null>("apple");
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <span>value:</span>
        <code className="px-1.5 py-0.5 bg-gray-100 rounded">
          {value ?? "null"}
        </code>
      </div>
      <Combobox.Root
        options={FRUITS}
        value={value}
        onValueChange={setValue}
        placeholder="Pick a fruit…"
      >
        <Combobox.Input />
        <Combobox.Content>
          {FRUITS.map((opt) => (
            <Combobox.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Root>
    </Card>
  );
}

function FreeformSection() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-2">
        freeform: 옵션에 없는 값도 입력 가능. value: <code>{value ?? "null"}</code>
      </p>
      <Combobox.Root
        freeform
        options={FRUITS}
        value={value}
        onValueChange={setValue}
        placeholder="Type or pick…"
      >
        <Combobox.Input />
        <Combobox.Content>
          {FRUITS.map((opt) => (
            <Combobox.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Root>
    </Card>
  );
}

function DarkSection() {
  return (
    <DarkCard>
      <Combobox.Root options={FRUITS} theme="dark" placeholder="Pick a fruit…">
        <Combobox.Input />
        <Combobox.Content>
          {FRUITS.map((opt) => (
            <Combobox.Item key={opt.value} value={opt.value}>
              {opt.label}
            </Combobox.Item>
          ))}
        </Combobox.Content>
      </Combobox.Root>
    </DarkCard>
  );
}

const USAGE_BASIC = `import { Combobox } from "plastic";

<Combobox.Root options={options} placeholder="Pick…">
  <Combobox.Input />
  <Combobox.Content>
    {options.map((o) => (
      <Combobox.Item key={o.value} value={o.value}>
        {o.label}
      </Combobox.Item>
    ))}
    <Combobox.Empty>No matches</Combobox.Empty>
  </Combobox.Content>
</Combobox.Root>`;

const USAGE_MULTIPLE = `<Combobox.Root multiple options={options} />`;

const USAGE_CONTROLLED = `<Combobox.Root
  value={value}
  onValueChange={setValue}
  options={options}
/>`;

export default function ComboboxPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Combobox</h1>
        <p className="text-sm text-gray-500">
          입력 가능한 옵션 선택. single/multiple, grouped, controlled, freeform,
          dark theme 지원.
        </p>
      </header>

      <Section id="basic" title="Basic">
        <BasicSection />
      </Section>

      <Section id="grouped" title="Grouped">
        <GroupedSection />
      </Section>

      <Section id="multiple" title="Multiple selection">
        <MultipleSection />
      </Section>

      <Section id="controlled" title="Controlled">
        <ControlledSection />
      </Section>

      <Section
        id="freeform"
        title="Freeform"
        desc="freeform 모드에서 사용자 입력값도 그대로 채택."
      >
        <FreeformSection />
      </Section>

      <Section id="dark" title="Dark Theme">
        <DarkSection />
      </Section>

      <Section id="usage" title="Usage">
        <div className="space-y-4">
          <Card>
            <p className="text-xs text-gray-500 mb-2">Basic</p>
            <CodeView
              code={USAGE_BASIC}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-2">Multiple</p>
            <CodeView
              code={USAGE_MULTIPLE}
              language="tsx"
              showLineNumbers={false}
            />
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
      </Section>
    </div>
  );
}
