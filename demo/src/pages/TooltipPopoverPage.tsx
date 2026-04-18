import { useState } from "react";
import { Button, Popover, Tooltip } from "plastic";
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

      <Section
        id="popover-basic"
        title="Popover Basic"
        desc="Trigger + Content + Header + Body + Close 기본 조합"
      >
        <PopoverBasicDemo />
      </Section>

      <Section
        id="popover-trigger-mode"
        title="Popover Click vs Hover"
        desc="triggerMode로 click 또는 hover 활성화 방식 선택"
      >
        <PopoverTriggerModeDemo />
      </Section>

      <Section
        id="popover-form"
        title="Popover Form"
        desc="인풋과 버튼이 포함된 폼 패턴"
      >
        <PopoverFormDemo />
      </Section>

      <Section
        id="popover-nested"
        title="Popover Nested"
        desc="팝오버 안에 또 다른 팝오버 — 독립적으로 열고 닫힘"
      >
        <PopoverNestedDemo />
      </Section>

      <Section
        id="popover-modal"
        title="Popover Modal (Focus Trap)"
        desc="trapFocus=true로 Tab 포커스를 팝오버 내부로 순환"
      >
        <PopoverModalDemo />
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

function PopoverBasicDemo() {
  return (
    <Card>
      <Popover.Root>
        <Popover.Trigger>
          <Button>Click me</Button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Header>
            Popover Title
            <Popover.Close />
          </Popover.Header>
          <Popover.Body>
            <p className="text-sm text-gray-600">
              팝오버 안에 임의의 컨텐츠를 넣을 수 있습니다. 외부 클릭이나
              Escape로 닫힙니다.
            </p>
            <div className="mt-3 flex gap-2 justify-end">
              <Popover.Close
                style={{
                  width: "auto",
                  height: "auto",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.875rem",
                }}
              >
                취소
              </Popover.Close>
              <Popover.Close
                style={{
                  width: "auto",
                  height: "auto",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.875rem",
                  background: "#2563eb",
                  color: "#fff",
                }}
              >
                확인
              </Popover.Close>
            </div>
          </Popover.Body>
        </Popover.Content>
      </Popover.Root>
    </Card>
  );
}

function PopoverFormDemo() {
  const [name, setName] = useState("");
  return (
    <Card>
      <Popover.Root placement="bottom-start">
        <Popover.Trigger>
          <Button>이름 수정</Button>
        </Popover.Trigger>
        <Popover.Content minWidth={260}>
          <Popover.Arrow />
          <Popover.Header>이름 변경</Popover.Header>
          <Popover.Body>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="새 이름"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:border-blue-500"
            />
            <div className="mt-3 flex gap-2 justify-end">
              <Popover.Close
                style={{
                  width: "auto",
                  height: "auto",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.875rem",
                }}
              >
                취소
              </Popover.Close>
              <Popover.Close
                style={{
                  width: "auto",
                  height: "auto",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.875rem",
                  background: "#2563eb",
                  color: "#fff",
                }}
              >
                저장
              </Popover.Close>
            </div>
          </Popover.Body>
        </Popover.Content>
      </Popover.Root>
      <span className="text-sm text-gray-500">현재: {name || "(없음)"}</span>
    </Card>
  );
}

function PopoverNestedDemo() {
  return (
    <Card>
      <Popover.Root>
        <Popover.Trigger>
          <Button>Outer</Button>
        </Popover.Trigger>
        <Popover.Content minWidth={240}>
          <Popover.Arrow />
          <Popover.Header>Outer Popover</Popover.Header>
          <Popover.Body>
            <p className="text-sm text-gray-600 mb-3">
              이 안에 또 다른 팝오버가 있습니다.
            </p>
            <Popover.Root placement="right-start">
              <Popover.Trigger>
                <Button size="sm" variant="secondary">
                  Open inner
                </Button>
              </Popover.Trigger>
              <Popover.Content minWidth={200}>
                <Popover.Arrow />
                <Popover.Body>Inner 팝오버입니다.</Popover.Body>
              </Popover.Content>
            </Popover.Root>
          </Popover.Body>
        </Popover.Content>
      </Popover.Root>
    </Card>
  );
}

function PopoverModalDemo() {
  return (
    <Card>
      <Popover.Root trapFocus>
        <Popover.Trigger>
          <Button>Modal popover</Button>
        </Popover.Trigger>
        <Popover.Content minWidth={280}>
          <Popover.Arrow />
          <Popover.Header>Focus Trap</Popover.Header>
          <Popover.Body>
            <p className="text-sm text-gray-600 mb-3">
              Tab 키로 포커스가 팝오버 내부에서만 순환합니다. Escape로 닫으면
              트리거로 복귀합니다.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="첫 번째"
                className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 focus:outline-none focus:border-blue-500"
              />
              <Popover.Close
                style={{
                  width: "auto",
                  height: "auto",
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.875rem",
                }}
              >
                닫기
              </Popover.Close>
            </div>
          </Popover.Body>
        </Popover.Content>
      </Popover.Root>
    </Card>
  );
}

function PopoverTriggerModeDemo() {
  return (
    <Card>
      <Popover.Root triggerMode="click">
        <Popover.Trigger>
          <Button>Click mode</Button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Body>클릭으로 토글</Popover.Body>
        </Popover.Content>
      </Popover.Root>

      <Popover.Root triggerMode="hover">
        <Popover.Trigger>
          <Button variant="secondary">Hover mode</Button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Body>마우스 올리면 열림</Popover.Body>
        </Popover.Content>
      </Popover.Root>
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
