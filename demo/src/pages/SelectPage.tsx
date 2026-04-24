import type { ReactNode } from "react";

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
        <Card>TODO</Card>
      </Section>
    </div>
  );
}
