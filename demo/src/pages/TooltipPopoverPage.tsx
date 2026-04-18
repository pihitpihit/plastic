import { Button, Tooltip } from "plastic";
import type { TooltipPlacement } from "plastic";

function Section({
  id,
  title,
  desc,
  children,
}: {
  id?: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 bg-white rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
      {children}
    </div>
  );
}

function TooltipBasicDemo() {
  const sides = ["top", "right", "bottom", "left"] as const;
  return (
    <Card>
      {sides.map((p) => (
        <Tooltip.Root key={p} placement={p}>
          <Tooltip.Trigger>
            <Button variant="secondary">{p}</Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <Tooltip.Arrow />
            Tooltip on {p}
          </Tooltip.Content>
        </Tooltip.Root>
      ))}
    </Card>
  );
}

function TooltipPlacementsDemo() {
  const placements: TooltipPlacement[] = [
    "top-start",
    "top",
    "top-end",
    "bottom-start",
    "bottom",
    "bottom-end",
    "left-start",
    "left",
    "left-end",
    "right-start",
    "right",
    "right-end",
  ];
  return (
    <div className="p-8 bg-white rounded-lg border border-gray-200">
      <div className="grid grid-cols-3 gap-4 justify-items-center">
        {placements.map((p) => (
          <Tooltip.Root key={p} placement={p}>
            <Tooltip.Trigger>
              <Button variant="secondary" size="sm">
                {p}
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <Tooltip.Arrow />
              {p}
            </Tooltip.Content>
          </Tooltip.Root>
        ))}
      </div>
    </div>
  );
}

export function TooltipPopoverPage() {
  return (
    <div className="max-w-4xl">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Tooltip / Popover
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Floating UI — 포지셔닝 엔진 기반 툴팁과 팝오버
        </p>
      </header>

      <Section
        id="tooltip-basic"
        title="Tooltip Basic"
        desc="4방향(top/right/bottom/left) placement 기본 툴팁"
      >
        <TooltipBasicDemo />
      </Section>

      <Section
        id="tooltip-placements"
        title="Tooltip Placements"
        desc="12가지 placement — side × alignment(start/center/end)"
      >
        <TooltipPlacementsDemo />
      </Section>
    </div>
  );
}
