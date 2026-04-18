import { useState } from "react";
import { Stepper } from "plastic";

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
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      {children}
    </div>
  );
}

function BasicDemo() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [card, setCard] = useState("");

  return (
    <Stepper.Root
      totalSteps={4}
      onComplete={() =>
        alert(`완료!\n이름: ${name}\n주소: ${address}\n카드: ${card}`)
      }
    >
      <Stepper.List>
        <Stepper.Step index={0} label="계정 정보" />
        <Stepper.Separator />
        <Stepper.Step index={1} label="주소" />
        <Stepper.Separator />
        <Stepper.Step index={2} label="결제" />
        <Stepper.Separator />
        <Stepper.Step index={3} label="확인" />
      </Stepper.List>

      <Stepper.Content>
        <Stepper.Panel index={0}>
          <div className="flex flex-col gap-2 p-4">
            <label className="text-sm font-medium">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </Stepper.Panel>
        <Stepper.Panel index={1}>
          <div className="flex flex-col gap-2 p-4">
            <label className="text-sm font-medium">주소</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="서울시 강남구"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </Stepper.Panel>
        <Stepper.Panel index={2}>
          <div className="flex flex-col gap-2 p-4">
            <label className="text-sm font-medium">카드 번호</label>
            <input
              value={card}
              onChange={(e) => setCard(e.target.value)}
              placeholder="1234-5678-9012-3456"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </Stepper.Panel>
        <Stepper.Panel index={3}>
          <div className="p-4 flex flex-col gap-1 text-sm">
            <p>
              <span className="text-gray-500">이름:</span> {name || "(미입력)"}
            </p>
            <p>
              <span className="text-gray-500">주소:</span> {address || "(미입력)"}
            </p>
            <p>
              <span className="text-gray-500">카드:</span> {card || "(미입력)"}
            </p>
          </div>
        </Stepper.Panel>
      </Stepper.Content>

      <Stepper.Actions>
        <Stepper.PrevButton>이전</Stepper.PrevButton>
        <div className="flex gap-2">
          <Stepper.NextButton>다음</Stepper.NextButton>
          <Stepper.CompleteButton>제출</Stepper.CompleteButton>
        </div>
      </Stepper.Actions>
    </Stepper.Root>
  );
}

function VerticalDemo() {
  return (
    <Stepper.Root totalSteps={3} orientation="vertical">
      <div className="flex gap-8">
        <Stepper.List>
          <Stepper.Step
            index={0}
            label="주문 접수"
            description="주문을 확인하는 중"
          />
          <Stepper.Separator />
          <Stepper.Step
            index={1}
            label="포장 중"
            description="상품을 포장합니다"
          />
          <Stepper.Separator />
          <Stepper.Step
            index={2}
            label="배송 완료"
            description="고객에게 도착"
          />
        </Stepper.List>

        <div className="flex-1">
          <Stepper.Content>
            <Stepper.Panel index={0}>
              <div className="p-4 text-sm">주문을 접수하고 있습니다. 잠시만 기다려주세요.</div>
            </Stepper.Panel>
            <Stepper.Panel index={1}>
              <div className="p-4 text-sm">상품을 정성스럽게 포장하고 있습니다.</div>
            </Stepper.Panel>
            <Stepper.Panel index={2}>
              <div className="p-4 text-sm">배송이 완료되었습니다.</div>
            </Stepper.Panel>
          </Stepper.Content>
        </div>
      </div>

      <Stepper.Actions>
        <Stepper.PrevButton>이전</Stepper.PrevButton>
        <div className="flex gap-2">
          <Stepper.NextButton>다음</Stepper.NextButton>
          <Stepper.CompleteButton>완료</Stepper.CompleteButton>
        </div>
      </Stepper.Actions>
    </Stepper.Root>
  );
}

export function StepperPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Stepper</h1>
      <p className="text-sm text-gray-500 mb-8">
        다단계 위자드, 온보딩 플로우를 위한 compound 컴포넌트.
      </p>

      <Section id="basic" title="Basic" desc="4-스텝 위자드 (이름 → 주소 → 결제 → 확인)">
        <Card>
          <BasicDemo />
        </Card>
      </Section>

      <Section id="vertical" title="Vertical" desc="orientation='vertical' + description 표시">
        <Card>
          <VerticalDemo />
        </Card>
      </Section>
    </div>
  );
}
