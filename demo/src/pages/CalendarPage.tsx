import { useState, type ReactNode } from "react";
import { Calendar, weekdayOf } from "plastic";
import type {
  CalendarDate,
  CalendarRangeValue,
  CalendarMultipleValue,
  CalendarSingleValue,
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

function fmt(v: CalendarDate | null): string {
  if (!v) return "(none)";
  return `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const [single, setSingle] = useState<CalendarSingleValue>(null);
  const [range, setRange] = useState<CalendarRangeValue>({ start: null, end: null });
  const [multi, setMulti] = useState<CalendarMultipleValue>([]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold mb-1">Calendar</h1>
        <p className="text-sm text-gray-500">
          월 그리드 단독 컴포넌트. DatePicker가 내부에서 사용함.
        </p>
      </header>

      <Section id="single" title="Single mode" desc="단일 날짜 선택">
        <Card>
          <Calendar.Root mode="single" value={single} onValueChange={setSingle}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-year" />
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
              <Calendar.Nav direction="next-year" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
          <p className="mt-3 text-sm">Selected: <strong>{fmt(single)}</strong></p>
        </Card>
      </Section>

      <Section id="range" title="Range mode" desc="시작/종료 두 날짜 선택. 호버 시 미리보기 음영.">
        <Card>
          <Calendar.Root mode="range" value={range} onValueChange={setRange}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
          <p className="mt-3 text-sm">
            Range: <strong>{fmt(range.start)}</strong> ~ <strong>{fmt(range.end)}</strong>
          </p>
        </Card>
      </Section>

      <Section id="multiple" title="Multiple mode" desc="여러 날짜 동시 선택 (toggle).">
        <Card>
          <Calendar.Root mode="multiple" value={multi} onValueChange={setMulti}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
          <p className="mt-3 text-sm">Selected: {multi.length} dates — {multi.map(fmt).join(", ") || "(none)"}</p>
        </Card>
      </Section>

      <Section id="constrained" title="Constrained" desc="minDate/maxDate + 일요일 비활성">
        <Card>
          <Calendar.Root
            mode="single"
            minDate={{ year: 2026, month: 4, day: 10 }}
            maxDate={{ year: 2026, month: 6, day: 20 }}
            isDisabled={(d) => weekdayOf(d) === 0}
          >
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
        </Card>
      </Section>

      <Section id="locale-ko" title="Locale (ko-KR, weekStartsOn=1)" desc="한국어 월/요일 라벨, 월요일 시작">
        <Card>
          <Calendar.Root mode="single" locale="ko-KR" weekStartsOn={1}>
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader format="narrow" />
            <Calendar.Grid />
          </Calendar.Root>
        </Card>
      </Section>

      <Section id="custom-day" title="Custom day render" desc="render prop으로 셀 컨텐츠 커스터마이징 (이벤트 마킹 등).">
        <Card>
          <Calendar.Root mode="single">
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid>
              {(day) => (
                <div style={{ position: "relative" }}>
                  <Calendar.Day day={day} />
                  {[5, 12, 19].includes(day.date.day) && day.inCurrentMonth && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        bottom: 2,
                        right: 4,
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "#dc2626",
                      }}
                    />
                  )}
                </div>
              )}
            </Calendar.Grid>
          </Calendar.Root>
        </Card>
      </Section>

      <Section id="dark" title="Dark theme">
        <DarkCard>
          <Calendar.Root mode="single" theme="dark">
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
        </DarkCard>
      </Section>

      <Section id="disabled" title="Disabled (전체 비활성)">
        <Card>
          <Calendar.Root mode="single" disabled>
            <Calendar.Header>
              <Calendar.Nav direction="prev-month" />
              <Calendar.MonthLabel />
              <Calendar.Nav direction="next-month" />
            </Calendar.Header>
            <Calendar.WeekdayHeader />
            <Calendar.Grid />
          </Calendar.Root>
        </Card>
      </Section>
    </div>
  );
}
