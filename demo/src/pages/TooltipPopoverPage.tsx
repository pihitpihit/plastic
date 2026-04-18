import { useState } from "react";
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

      <Section
        id="tooltip-arrow"
        title="Tooltip Arrow"
        desc="화살표 유무 비교 — Arrow 컴포넌트를 선언하면 placement에 맞춰 자동 배치"
      >
        <TooltipArrowDemo />
      </Section>

      <Section
        id="tooltip-controlled"
        title="Tooltip Controlled"
        desc="외부 state로 open 제어 — open/onOpenChange prop"
      >
        <TooltipControlledDemo />
      </Section>

      <Section
        id="tooltip-delay"
        title="Tooltip Delay"
        desc="showDelay/hideDelay로 표시·숨김 타이밍 조정"
      >
        <TooltipDelayDemo />
      </Section>
    </div>
  );
}

function TooltipArrowDemo() {
  return (
    <Card>
      <Tooltip.Root placement="top">
        <Tooltip.Trigger>
          <Button variant="secondary">Without arrow</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>No arrow here</Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root placement="top">
        <Tooltip.Trigger>
          <Button>With arrow</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          Arrow tooltip
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root placement="right">
        <Tooltip.Trigger>
          <Button variant="secondary">Right + arrow</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow size={10} />
          큰 화살표(10px)
        </Tooltip.Content>
      </Tooltip.Root>
    </Card>
  );
}

function TooltipControlledDemo() {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Show"} externally
      </Button>
      <Tooltip.Root open={open} onOpenChange={setOpen} placement="top">
        <Tooltip.Trigger>
          <Button>Controlled trigger</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          외부 state로 제어됨
        </Tooltip.Content>
      </Tooltip.Root>
    </Card>
  );
}

function TooltipDelayDemo() {
  return (
    <Card>
      <Tooltip.Root showDelay={0} hideDelay={0} placement="top">
        <Tooltip.Trigger>
          <Button variant="secondary">즉시 (0/0)</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          딜레이 없음
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root placement="top">
        <Tooltip.Trigger>
          <Button>기본 (300/100)</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          기본 딜레이
        </Tooltip.Content>
      </Tooltip.Root>

      <Tooltip.Root showDelay={1000} hideDelay={500} placement="top">
        <Tooltip.Trigger>
          <Button variant="secondary">느리게 (1000/500)</Button>
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Tooltip.Arrow />
          느린 반응
        </Tooltip.Content>
      </Tooltip.Root>
    </Card>
  );
}
