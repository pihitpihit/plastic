import { useState, type ReactNode } from "react";
import { Button, Select } from "plastic";

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
      <Button variant="outline" onClick={() => setValue("ts")}>
        TS
      </Button>
      <Button variant="outline" onClick={() => setValue("py")}>
        Python
      </Button>
      <Button variant="outline" onClick={() => setValue("go")}>
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
    </div>
  );
}
