import { useState, type ReactNode } from "react";
import { CodeView, DatePicker } from "plastic";
import type { CalendarDate, SingleValue } from "plastic";

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

function fmt(v: SingleValue): string {
  if (!v) return "null";
  return `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`;
}

function BasicCalendar() {
  return (
    <DatePicker.Root>
      <DatePicker.Calendar>
        <DatePicker.Header>
          <DatePicker.Nav direction="prev-month" />
          <DatePicker.MonthLabel />
          <DatePicker.Nav direction="next-month" />
        </DatePicker.Header>
        <DatePicker.Grid>
          {(day) => <DatePicker.Day day={day} />}
        </DatePicker.Grid>
      </DatePicker.Calendar>
    </DatePicker.Root>
  );
}

function InputAndPopover() {
  return (
    <DatePicker.Root format="YYYY-MM-DD">
      <div className="flex items-center gap-2">
        <DatePicker.Input />
        <DatePicker.Trigger>📅</DatePicker.Trigger>
      </div>
      <DatePicker.Calendar>
        <DatePicker.Header>
          <DatePicker.Nav direction="prev-month" />
          <DatePicker.MonthLabel />
          <DatePicker.Nav direction="next-month" />
        </DatePicker.Header>
        <DatePicker.Grid>
          {(day) => <DatePicker.Day day={day} />}
        </DatePicker.Grid>
      </DatePicker.Calendar>
    </DatePicker.Root>
  );
}

function ControlledSection() {
  const [value, setValue] = useState<SingleValue>(null);
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <span>value:</span>
        <code className="px-1.5 py-0.5 bg-gray-100 rounded">{fmt(value)}</code>
      </div>
      <DatePicker.Root value={value} onValueChange={setValue}>
        <DatePicker.Calendar>
          <DatePicker.Header>
            <DatePicker.Nav direction="prev-month" />
            <DatePicker.MonthLabel />
            <DatePicker.Nav direction="next-month" />
          </DatePicker.Header>
          <DatePicker.Grid>
            {(day) => <DatePicker.Day day={day} />}
          </DatePicker.Grid>
        </DatePicker.Calendar>
      </DatePicker.Root>
    </Card>
  );
}

function MinMaxSection() {
  const min: CalendarDate = { year: 2026, month: 4, day: 10 };
  const max: CalendarDate = { year: 2026, month: 5, day: 20 };
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3">
        min: 2026-04-10, max: 2026-05-20
      </p>
      <DatePicker.Root minDate={min} maxDate={max}>
        <DatePicker.Calendar>
          <DatePicker.Header>
            <DatePicker.Nav direction="prev-month" />
            <DatePicker.MonthLabel />
            <DatePicker.Nav direction="next-month" />
          </DatePicker.Header>
          <DatePicker.Grid>
            {(day) => <DatePicker.Day day={day} />}
          </DatePicker.Grid>
        </DatePicker.Calendar>
      </DatePicker.Root>
    </Card>
  );
}

function DarkSection() {
  return (
    <DarkCard>
      <DatePicker.Root theme="dark">
        <DatePicker.Calendar>
          <DatePicker.Header>
            <DatePicker.Nav direction="prev-month" />
            <DatePicker.MonthLabel />
            <DatePicker.Nav direction="next-month" />
          </DatePicker.Header>
          <DatePicker.Grid>
            {(day) => <DatePicker.Day day={day} />}
          </DatePicker.Grid>
        </DatePicker.Calendar>
      </DatePicker.Root>
    </DarkCard>
  );
}

const USAGE_BASIC = `import { DatePicker } from "plastic";

<DatePicker.Root>
  <DatePicker.Calendar>
    <DatePicker.Header>
      <DatePicker.Nav direction="prev-month" />
      <DatePicker.MonthLabel />
      <DatePicker.Nav direction="next-month" />
    </DatePicker.Header>
    <DatePicker.Grid>
      {(day) => <DatePicker.Day day={day} />}
    </DatePicker.Grid>
  </DatePicker.Calendar>
</DatePicker.Root>`;

const USAGE_INPUT = `<DatePicker.Root format="YYYY-MM-DD">
  <DatePicker.Input />
  <DatePicker.Trigger>📅</DatePicker.Trigger>
  <DatePicker.Calendar>{/* ... */}</DatePicker.Calendar>
</DatePicker.Root>`;

const USAGE_CONTROLLED = `const [value, setValue] = useState<SingleValue>(null);

<DatePicker.Root value={value} onValueChange={setValue}>
  {/* ... */}
</DatePicker.Root>`;

export default function DatePickerPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">DatePicker</h1>
        <p className="text-sm text-gray-500">
          캘린더 기반 날짜 선택. 컴파운드 (Root/Calendar/Header/Grid/Day),
          single/range, controlled, locale, dark theme.
        </p>
      </header>

      <Section id="basic" title="Basic Calendar">
        <Card>
          <BasicCalendar />
        </Card>
      </Section>

      <Section
        id="input"
        title="Input + Popover"
        desc="Input과 Trigger 함께. format 지정."
      >
        <Card>
          <InputAndPopover />
        </Card>
      </Section>

      <Section id="controlled" title="Controlled">
        <ControlledSection />
      </Section>

      <Section id="min-max" title="Min/Max">
        <MinMaxSection />
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
            <p className="text-xs text-gray-500 mb-2">Input + Popover</p>
            <CodeView
              code={USAGE_INPUT}
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
