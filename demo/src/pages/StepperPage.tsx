import { useState } from "react";
import { CodeView, Stepper } from "plastic";
import type {
  StepperOrientation,
  StepperTheme,
  StepperVariant,
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

function NonLinearDemo() {
  return (
    <Stepper.Root totalSteps={4} linear={false}>
      <p className="text-xs text-gray-500 mb-3">
        linear=false — 아무 스텝이나 클릭해서 자유롭게 이동할 수 있습니다.
      </p>
      <Stepper.List>
        <Stepper.Step index={0} label="General" />
        <Stepper.Separator />
        <Stepper.Step index={1} label="Details" />
        <Stepper.Separator />
        <Stepper.Step index={2} label="Review" />
        <Stepper.Separator />
        <Stepper.Step index={3} label="Submit" />
      </Stepper.List>

      <Stepper.Content>
        <Stepper.Panel index={0}>
          <div className="p-4 text-sm">General 정보 입력 섹션입니다.</div>
        </Stepper.Panel>
        <Stepper.Panel index={1}>
          <div className="p-4 text-sm">상세 정보 섹션입니다.</div>
        </Stepper.Panel>
        <Stepper.Panel index={2}>
          <div className="p-4 text-sm">입력 내용을 검토합니다.</div>
        </Stepper.Panel>
        <Stepper.Panel index={3}>
          <div className="p-4 text-sm">최종 제출 단계입니다.</div>
        </Stepper.Panel>
      </Stepper.Content>

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

function ValidationDemo() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<number, string>>({});

  return (
    <Stepper.Root
      totalSteps={3}
      stepErrors={errors}
      onBeforeNext={async (currentStep) => {
        if (currentStep === 0) {
          if (name.trim().length === 0) {
            setErrors({ 0: "이름을 입력해주세요" });
            return false;
          }
          setErrors((prev) => {
            const next = { ...prev };
            delete next[0];
            return next;
          });
          return true;
        }
        if (currentStep === 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (!email.includes("@")) {
            setErrors({ 1: "올바른 이메일 형식이 아닙니다" });
            return false;
          }
          setErrors((prev) => {
            const next = { ...prev };
            delete next[1];
            return next;
          });
          return true;
        }
        return true;
      }}
      onComplete={() => alert("검증 통과!")}
    >
      <Stepper.List>
        <Stepper.Step index={0} label="이름" />
        <Stepper.Separator />
        <Stepper.Step index={1} label="이메일 (비동기)" />
        <Stepper.Separator />
        <Stepper.Step index={2} label="완료" />
      </Stepper.List>

      <Stepper.Content>
        <Stepper.Panel index={0}>
          <div className="flex flex-col gap-2 p-4">
            <label className="text-sm font-medium">이름 (필수)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors[0] && (
              <p className="text-xs text-red-500">{errors[0]}</p>
            )}
          </div>
        </Stepper.Panel>
        <Stepper.Panel index={1}>
          <div className="flex flex-col gap-2 p-4">
            <label className="text-sm font-medium">
              이메일 (다음 버튼 클릭 시 1초 비동기 검증)
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors[1] && (
              <p className="text-xs text-red-500">{errors[1]}</p>
            )}
          </div>
        </Stepper.Panel>
        <Stepper.Panel index={2}>
          <div className="p-4 text-sm">모든 검증을 통과했습니다.</div>
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

function VariantsDemo() {
  const [step, setStep] = useState(1);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs text-gray-500 mb-2">variant="default"</p>
        <Stepper.Root totalSteps={4} activeStep={step} onStepChange={setStep}>
          <Stepper.List>
            <Stepper.Step index={0} label="A" />
            <Stepper.Separator />
            <Stepper.Step index={1} label="B" />
            <Stepper.Separator />
            <Stepper.Step index={2} label="C" />
            <Stepper.Separator />
            <Stepper.Step index={3} label="D" />
          </Stepper.List>
        </Stepper.Root>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">variant="dots"</p>
        <Stepper.Root
          totalSteps={4}
          activeStep={step}
          onStepChange={setStep}
          variant="dots"
        >
          <Stepper.List>
            <Stepper.Step index={0} />
            <Stepper.Separator />
            <Stepper.Step index={1} />
            <Stepper.Separator />
            <Stepper.Step index={2} />
            <Stepper.Separator />
            <Stepper.Step index={3} />
          </Stepper.List>
        </Stepper.Root>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">variant="progress"</p>
        <Stepper.Root
          totalSteps={4}
          activeStep={step}
          onStepChange={setStep}
          variant="progress"
        >
          <Stepper.List />
        </Stepper.Root>
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-500">동기화된 스텝: {step + 1} / 4</span>
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-2 py-1 text-xs border rounded"
        >
          이전
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(3, s + 1))}
          className="px-2 py-1 text-xs border rounded"
        >
          다음
        </button>
      </div>
    </div>
  );
}

function ErrorStateDemo() {
  return (
    <Stepper.Root
      totalSteps={3}
      defaultActiveStep={1}
      stepErrors={{ 1: "이 단계에 오류가 있습니다" }}
    >
      <Stepper.List>
        <Stepper.Step index={0} label="Step 1" />
        <Stepper.Separator />
        <Stepper.Step index={1} label="Step 2" />
        <Stepper.Separator />
        <Stepper.Step index={2} label="Step 3" />
      </Stepper.List>

      <Stepper.Content>
        <Stepper.Panel index={0}>
          <div className="p-4 text-sm">Step 1 컨텐츠</div>
        </Stepper.Panel>
        <Stepper.Panel index={1}>
          <div className="p-4">
            <p className="text-sm text-red-500">
              이 단계에 오류가 있습니다. 입력을 확인해주세요.
            </p>
          </div>
        </Stepper.Panel>
        <Stepper.Panel index={2}>
          <div className="p-4 text-sm">Step 3 컨텐츠</div>
        </Stepper.Panel>
      </Stepper.Content>

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

function UserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 2v1.5M8 12.5V14M3.5 8H2M14 8h-1.5M4.8 4.8l-1-1M12.2 12.2l-1-1M4.8 11.2l-1 1M12.2 3.8l-1 1" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="8 2 10 6 14 6.5 11 9.5 12 14 8 12 4 14 5 9.5 2 6.5 6 6 8 2" />
    </svg>
  );
}

function CustomIconsDemo() {
  return (
    <Stepper.Root totalSteps={3}>
      <Stepper.List>
        <Stepper.Step index={0} label="사용자" icon={<UserIcon />} />
        <Stepper.Separator />
        <Stepper.Step index={1} label="설정" icon={<GearIcon />} />
        <Stepper.Separator />
        <Stepper.Step index={2} label="완료" icon={<StarIcon />} />
      </Stepper.List>

      <Stepper.Content>
        <Stepper.Panel index={0}>
          <div className="p-4 text-sm">사용자 정보를 입력해주세요.</div>
        </Stepper.Panel>
        <Stepper.Panel index={1}>
          <div className="p-4 text-sm">설정을 조정해주세요.</div>
        </Stepper.Panel>
        <Stepper.Panel index={2}>
          <div className="p-4 text-sm">모든 설정이 완료되었습니다.</div>
        </Stepper.Panel>
      </Stepper.Content>

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

function ControlledDemo() {
  const [step, setStep] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">현재 스텝:</span>
        <span className="font-mono text-sm">{step}</span>
        <div className="flex gap-2 ml-4">
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`px-3 py-1 text-xs border rounded ${
                step === i
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <Stepper.Root totalSteps={4} activeStep={step} onStepChange={setStep}>
        <Stepper.List>
          <Stepper.Step index={0} label="One" />
          <Stepper.Separator />
          <Stepper.Step index={1} label="Two" />
          <Stepper.Separator />
          <Stepper.Step index={2} label="Three" />
          <Stepper.Separator />
          <Stepper.Step index={3} label="Four" />
        </Stepper.List>

        <Stepper.Content>
          <Stepper.Panel index={0}>
            <div className="p-4 text-sm">첫 번째 패널 — 외부 상태로 제어됨</div>
          </Stepper.Panel>
          <Stepper.Panel index={1}>
            <div className="p-4 text-sm">두 번째 패널</div>
          </Stepper.Panel>
          <Stepper.Panel index={2}>
            <div className="p-4 text-sm">세 번째 패널</div>
          </Stepper.Panel>
          <Stepper.Panel index={3}>
            <div className="p-4 text-sm">네 번째 패널</div>
          </Stepper.Panel>
        </Stepper.Content>
      </Stepper.Root>
    </div>
  );
}

function DarkDemo() {
  return (
    <div className="p-6 rounded-lg" style={{ background: "#0f172a" }}>
      <Stepper.Root
        totalSteps={4}
        defaultActiveStep={2}
        completedSteps={new Set([0, 1])}
        theme="dark"
      >
        <Stepper.List>
          <Stepper.Step index={0} label="계정" />
          <Stepper.Separator />
          <Stepper.Step index={1} label="프로필" />
          <Stepper.Separator />
          <Stepper.Step index={2} label="확인" />
          <Stepper.Separator />
          <Stepper.Step index={3} label="완료" />
        </Stepper.List>

        <Stepper.Content>
          <Stepper.Panel index={0}>
            <div className="p-4 text-sm text-gray-300">계정 정보</div>
          </Stepper.Panel>
          <Stepper.Panel index={1}>
            <div className="p-4 text-sm text-gray-300">프로필 정보</div>
          </Stepper.Panel>
          <Stepper.Panel index={2}>
            <div className="p-4 text-sm text-gray-300">입력 내용 확인</div>
          </Stepper.Panel>
          <Stepper.Panel index={3}>
            <div className="p-4 text-sm text-gray-300">모든 단계 완료</div>
          </Stepper.Panel>
        </Stepper.Content>

        <Stepper.Actions>
          <Stepper.PrevButton>이전</Stepper.PrevButton>
          <div className="flex gap-2">
            <Stepper.NextButton>다음</Stepper.NextButton>
            <Stepper.CompleteButton>완료</Stepper.CompleteButton>
          </div>
        </Stepper.Actions>
      </Stepper.Root>
    </div>
  );
}

function PropsTable({
  rows,
}: {
  rows: Array<[string, string, string, string]>;
}) {
  return (
    <table className="w-full text-left text-sm border border-gray-200 rounded-lg overflow-hidden">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Prop</th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Type</th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Default</th>
          <th className="px-4 py-2 border-b border-gray-200 font-semibold">Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([prop, type, def, desc]) => (
          <tr key={prop} className="border-t border-gray-100">
            <td className="px-4 py-2 font-mono text-xs">{prop}</td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">{type}</td>
            <td className="px-4 py-2 font-mono text-xs text-gray-600">{def}</td>
            <td className="px-4 py-2 text-gray-700">{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const ROOT_PROPS: Array<[string, string, string, string]> = [
  ["totalSteps", "number", "—", "전체 스텝 수 (필수)"],
  ["activeStep", "number", "—", "현재 활성 스텝 (controlled)"],
  ["defaultActiveStep", "number", "0", "초기 활성 스텝 (uncontrolled)"],
  ["onStepChange", "(step: number) => void", "—", "스텝 변경 콜백"],
  ["linear", "boolean", "true", "선형 네비게이션 모드"],
  ["onBeforeNext", "(cur: number) => bool | Promise<bool>", "—", "다음 스텝 진입 검증"],
  ["onBeforePrev", "(cur: number) => bool | Promise<bool>", "—", "이전 스텝 복귀 검증"],
  ["stepErrors", "Record<number, string>", "—", "스텝별 에러 메시지"],
  ["completedSteps", "Set<number>", "—", "완료된 스텝 (외부 제어)"],
  ["disabledSteps", "Set<number>", "—", "비활성 스텝"],
  ["orientation", "'horizontal' | 'vertical'", "'horizontal'", "레이아웃 방향"],
  ["variant", "'default' | 'dots' | 'progress'", "'default'", "시각 변형"],
  ["theme", "'light' | 'dark'", "'light'", "테마"],
  ["onComplete", "() => void", "—", "CompleteButton 클릭 시 콜백"],
];

const STEP_PROPS: Array<[string, string, string, string]> = [
  ["index", "number", "—", "스텝 인덱스 (필수)"],
  ["label", "string", "—", "스텝 라벨"],
  ["description", "string", "—", "스텝 설명 (vertical 권장)"],
  ["icon", "ReactNode", "—", "기본 상태 커스텀 아이콘"],
  ["completedIcon", "ReactNode", "CheckIcon", "완료 상태 아이콘"],
  ["errorIcon", "ReactNode", "ExclamationIcon", "에러 상태 아이콘"],
];

const CONTENT_PROPS: Array<[string, string, string, string]> = [
  ["transitionDuration", "number", "300", "전환 애니메이션 시간 (ms)"],
  ["disableTransition", "boolean", "false", "전환 애니메이션 비활성화"],
];

const PANEL_PROPS: Array<[string, string, string, string]> = [
  ["index", "number", "—", "패널 매칭 인덱스 (필수)"],
  ["forceMount", "boolean", "false", "비활성 시에도 DOM 유지"],
];

const BUTTON_PROPS: Array<[string, string, string, string]> = [
  ["hideOnFirst (Prev)", "boolean", "true", "첫 스텝에서 숨김"],
  ["hideOnLast (Next)", "boolean", "true", "마지막 스텝에서 숨김"],
  ["showOnlyOnLast (Complete)", "boolean", "true", "마지막 스텝에서만 표시"],
];

const USAGE_CODE = `import { Stepper } from "plastic";

export function Example() {
  return (
    <Stepper.Root totalSteps={3} onComplete={() => alert("완료!")}>
      <Stepper.List>
        <Stepper.Step index={0} label="계정" />
        <Stepper.Separator />
        <Stepper.Step index={1} label="프로필" />
        <Stepper.Separator />
        <Stepper.Step index={2} label="확인" />
      </Stepper.List>

      <Stepper.Content>
        <Stepper.Panel index={0}>계정 입력</Stepper.Panel>
        <Stepper.Panel index={1}>프로필 입력</Stepper.Panel>
        <Stepper.Panel index={2}>확인</Stepper.Panel>
      </Stepper.Content>

      <Stepper.Actions>
        <Stepper.PrevButton>이전</Stepper.PrevButton>
        <Stepper.NextButton>다음</Stepper.NextButton>
        <Stepper.CompleteButton>완료</Stepper.CompleteButton>
      </Stepper.Actions>
    </Stepper.Root>
  );
}`;

function PlaygroundDemo() {
  const [orientation, setOrientation] = useState<StepperOrientation>("horizontal");
  const [variant, setVariant] = useState<StepperVariant>("default");
  const [linear, setLinear] = useState(true);
  const [totalSteps, setTotalSteps] = useState(4);
  const [theme, setTheme] = useState<StepperTheme>("light");
  const [transitionDuration, setTransitionDuration] = useState(300);
  const [disableTransition, setDisableTransition] = useState(false);

  const wrapperStyle: React.CSSProperties =
    theme === "dark"
      ? { background: "#0f172a", padding: 24, borderRadius: 8 }
      : {};

  const content = (
    <Stepper.Root
      key={`${orientation}-${variant}-${linear}-${totalSteps}-${theme}-${transitionDuration}-${disableTransition}`}
      totalSteps={totalSteps}
      orientation={orientation}
      variant={variant}
      linear={linear}
      theme={theme}
    >
      {orientation === "vertical" && variant !== "progress" ? (
        <div style={{ display: "flex", gap: 32 }}>
          <Stepper.List>
            {Array.from({ length: totalSteps }).flatMap((_, i) =>
              i === 0
                ? [<Stepper.Step key={i} index={i} label={`Step ${i + 1}`} />]
                : [
                    <Stepper.Separator key={`sep-${i}`} />,
                    <Stepper.Step key={i} index={i} label={`Step ${i + 1}`} />,
                  ],
            )}
          </Stepper.List>
          <div style={{ flex: 1 }}>
            <Stepper.Content
              transitionDuration={transitionDuration}
              disableTransition={disableTransition}
            >
              {Array.from({ length: totalSteps }).map((_, i) => (
                <Stepper.Panel key={i} index={i}>
                  <div
                    style={{
                      padding: 16,
                      color: theme === "dark" ? "#e5e7eb" : "#111827",
                    }}
                  >
                    Panel {i + 1}
                  </div>
                </Stepper.Panel>
              ))}
            </Stepper.Content>
          </div>
        </div>
      ) : (
        <>
          {variant === "progress" ? (
            <Stepper.List />
          ) : (
            <Stepper.List>
              {Array.from({ length: totalSteps }).flatMap((_, i) =>
                i === 0
                  ? [<Stepper.Step key={i} index={i} label={`Step ${i + 1}`} />]
                  : [
                      <Stepper.Separator key={`sep-${i}`} />,
                      <Stepper.Step key={i} index={i} label={`Step ${i + 1}`} />,
                    ],
              )}
            </Stepper.List>
          )}
          <Stepper.Content
            transitionDuration={transitionDuration}
            disableTransition={disableTransition}
          >
            {Array.from({ length: totalSteps }).map((_, i) => (
              <Stepper.Panel key={i} index={i}>
                <div
                  style={{
                    padding: 16,
                    color: theme === "dark" ? "#e5e7eb" : "#111827",
                  }}
                >
                  Panel {i + 1}
                </div>
              </Stepper.Panel>
            ))}
          </Stepper.Content>
        </>
      )}

      <Stepper.Actions>
        <Stepper.PrevButton>Previous</Stepper.PrevButton>
        <div style={{ display: "flex", gap: 8 }}>
          <Stepper.NextButton>Next</Stepper.NextButton>
          <Stepper.CompleteButton>Complete</Stepper.CompleteButton>
        </div>
      </Stepper.Actions>
    </Stepper.Root>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">orientation</span>
          <select
            value={orientation}
            onChange={(e) => setOrientation(e.target.value as StepperOrientation)}
            className="px-2 py-1 border rounded"
          >
            <option value="horizontal">horizontal</option>
            <option value="vertical">vertical</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">variant</span>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as StepperVariant)}
            className="px-2 py-1 border rounded"
          >
            <option value="default">default</option>
            <option value="dots">dots</option>
            <option value="progress">progress</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">theme</span>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as StepperTheme)}
            className="px-2 py-1 border rounded"
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">
            totalSteps: {totalSteps}
          </span>
          <input
            type="range"
            min={2}
            max={8}
            value={totalSteps}
            onChange={(e) => setTotalSteps(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">
            transitionDuration: {transitionDuration}ms
          </span>
          <input
            type="range"
            min={0}
            max={600}
            step={50}
            value={transitionDuration}
            onChange={(e) => setTransitionDuration(Number(e.target.value))}
          />
        </label>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={linear}
              onChange={(e) => setLinear(e.target.checked)}
            />
            linear
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
            <input
              type="checkbox"
              checked={disableTransition}
              onChange={(e) => setDisableTransition(e.target.checked)}
            />
            disableTransition
          </label>
        </div>
      </div>

      <div style={wrapperStyle}>{content}</div>
    </div>
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

      <Section id="non-linear" title="Non-linear" desc="linear=false — 자유 이동">
        <Card>
          <NonLinearDemo />
        </Card>
      </Section>

      <Section id="validation" title="Validation" desc="onBeforeNext 동기/비동기 검증">
        <Card>
          <ValidationDemo />
        </Card>
      </Section>

      <Section id="variants" title="Variants" desc="default / dots / progress — 동일 activeStep 동기화">
        <Card>
          <VariantsDemo />
        </Card>
      </Section>

      <Section id="error-state" title="Error State" desc="stepErrors로 특정 스텝에 에러 상태 고정">
        <Card>
          <ErrorStateDemo />
        </Card>
      </Section>

      <Section id="custom-icons" title="Custom Icons" desc="icon prop으로 번호 대신 커스텀 SVG 표시">
        <Card>
          <CustomIconsDemo />
        </Card>
      </Section>

      <Section id="controlled" title="Controlled" desc="activeStep + onStepChange 외부 상태로 제어">
        <Card>
          <ControlledDemo />
        </Card>
      </Section>

      <Section id="dark-theme" title="Dark Theme" desc="theme='dark' + completedSteps 외부 제어">
        <DarkDemo />
      </Section>

      <Section id="props" title="Props">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-semibold mb-2">Stepper.Root</p>
            <PropsTable rows={ROOT_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Stepper.Step</p>
            <PropsTable rows={STEP_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Stepper.Content</p>
            <PropsTable rows={CONTENT_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Stepper.Panel</p>
            <PropsTable rows={PANEL_PROPS} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Action Buttons</p>
            <PropsTable rows={BUTTON_PROPS} />
          </div>
        </div>
      </Section>

      <Section id="usage" title="Usage">
        <CodeView code={USAGE_CODE} language="tsx" />
      </Section>

      <Section id="playground" title="Playground">
        <PlaygroundDemo />
      </Section>
    </div>
  );
}
