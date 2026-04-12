import { Button, CodeView } from "plastic";

const USAGE_CODE = `import { Button } from "plastic";

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
<Button loading>Loading...</Button>`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        {title}
      </p>
      <div className="flex flex-wrap items-center gap-3 px-6 py-5 bg-white rounded-lg border border-gray-200">
        {children}
      </div>
    </section>
  );
}

export function ButtonPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Button</h1>
        <p className="text-gray-500 mt-1">
          클릭 가능한 기본 버튼 컴포넌트입니다.{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">
            HTMLButtonElement
          </code>{" "}
          의 모든 속성을 그대로 사용할 수 있습니다.
        </p>
      </div>

      <Section title="Variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </Section>

      <Section title="Sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </Section>

      <Section title="States">
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button variant="secondary" disabled>
          Secondary Disabled
        </Button>
      </Section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Props
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Prop", "Type", "Default", "Description"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["variant", '"primary" | "secondary" | "ghost"', '"primary"', "버튼 스타일"],
                ["size", '"sm" | "md" | "lg"', '"md"', "버튼 크기"],
                ["loading", "boolean", "false", "로딩 상태 (disabled 포함)"],
                ["disabled", "boolean", "false", "비활성화"],
                ["children", "ReactNode", "—", "버튼 내용 (필수)"],
              ].map(([prop, type, def, desc]) => (
                <tr key={prop}>
                  <td className="px-4 py-2.5 font-mono text-xs text-blue-700">{prop}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{type}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{def}</td>
                  <td className="px-4 py-2.5 text-gray-600">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Usage
        </p>
        <CodeView code={USAGE_CODE} language="tsx" showAlternatingRows={false} />
      </section>
    </div>
  );
}
