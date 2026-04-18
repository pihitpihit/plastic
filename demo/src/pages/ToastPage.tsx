import { useState } from "react";
import { ToastProvider, useToast, CodeView } from "plastic";
import type { ToastPosition, ToastVariant } from "plastic";

// ── Section 헬퍼 ────────────────────────────────────────────────────────
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
    <section id={id}>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {title}
      </p>
      {desc && <p className="text-sm text-gray-500 mb-3">{desc}</p>}
      {children}
    </section>
  );
}

function DemoButton({
  onClick,
  children,
  variant = "gray",
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "gray" | "green" | "red" | "amber" | "blue";
}) {
  const colors: Record<typeof variant, string> = {
    gray: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    green: "bg-green-100 text-green-800 hover:bg-green-200",
    red: "bg-red-100 text-red-800 hover:bg-red-200",
    amber: "bg-amber-100 text-amber-800 hover:bg-amber-200",
    blue: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  };
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${colors[variant]}`}
    >
      {children}
    </button>
  );
}

// ── 1. Basic Variants ────────────────────────────────────────────────────
function BasicDemo() {
  const toast = useToast();
  const show = (variant: ToastVariant, title: string, description?: string) => {
    toast.show({ variant, title, description });
  };
  return (
    <div className="flex flex-wrap gap-2">
      <DemoButton onClick={() => show("default", "기본 알림", "default variant 입니다.")}>
        Default
      </DemoButton>
      <DemoButton variant="green" onClick={() => show("success", "저장 완료", "변경사항이 저장되었습니다.")}>
        Success
      </DemoButton>
      <DemoButton variant="red" onClick={() => show("error", "오류 발생", "요청을 처리하지 못했습니다.")}>
        Error
      </DemoButton>
      <DemoButton variant="amber" onClick={() => show("warning", "주의", "디스크 공간이 부족합니다.")}>
        Warning
      </DemoButton>
      <DemoButton variant="blue" onClick={() => show("info", "정보", "새 업데이트가 준비되었습니다.")}>
        Info
      </DemoButton>
    </div>
  );
}

// ── 2. Positions ─────────────────────────────────────────────────────────
const ALL_POSITIONS: ToastPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

function PositionsDemo({
  position,
  setPosition,
}: {
  position: ToastPosition;
  setPosition: (p: ToastPosition) => void;
}) {
  const toast = useToast();
  return (
    <div>
      <p className="text-sm text-gray-500 mb-2">
        현재 Provider position:{" "}
        <code className="bg-gray-100 px-1 rounded">{position}</code>
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-sm">
        {ALL_POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setPosition(pos)}
            className={`px-3 py-2 text-xs rounded border transition-colors ${
              position === pos
                ? "bg-blue-100 border-blue-400 text-blue-800 font-semibold"
                : "bg-white border-gray-200 hover:border-gray-400"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <DemoButton
          onClick={() =>
            toast.show({
              variant: "info",
              title: `${position} 위치`,
              description: "이 토스트는 선택된 위치에 나타납니다.",
            })
          }
        >
          현재 위치에 토스트 표시
        </DemoButton>
      </div>
    </div>
  );
}

// ── 3. Custom Content (title + description + action) ────────────────────
function CustomContentDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <DemoButton
        onClick={() =>
          toast.show({
            variant: "default",
            title: "파일이 이동되었습니다",
            description: "1개 항목이 아카이브로 이동되었습니다.",
            action: {
              label: "실행 취소",
              onClick: () => toast.show({ title: "되돌림", variant: "info" }),
            },
          })
        }
      >
        Action 버튼 포함
      </DemoButton>
      <DemoButton
        variant="red"
        onClick={() =>
          toast.show({
            variant: "error",
            title: "연결 실패",
            description:
              "서버에 연결할 수 없습니다. 네트워크 상태를 확인한 후 다시 시도해주세요. 계속 문제가 발생하면 관리자에게 문의하세요.",
            action: {
              label: "재시도",
              variant: "primary",
              onClick: () => toast.show({ title: "재연결 중...", variant: "info" }),
            },
          })
        }
      >
        긴 설명 + Primary Action
      </DemoButton>
    </div>
  );
}

// ── 4. Auto-dismiss (duration 제어) ──────────────────────────────────────
function AutoDismissDemo() {
  const toast = useToast();
  const [duration, setDuration] = useState(5000);
  return (
    <div className="space-y-3 max-w-md">
      <div>
        <label className="text-sm text-gray-600 flex items-center gap-3">
          <span>duration (ms):</span>
          <input
            type="range"
            min={1000}
            max={10000}
            step={500}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="flex-1"
          />
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
            {duration}
          </code>
        </label>
      </div>
      <DemoButton
        onClick={() =>
          toast.show({
            variant: "success",
            title: "커스텀 duration",
            description: `${duration}ms 동안 표시됩니다. 진행바가 남은 시간을 보여줍니다.`,
            duration,
          })
        }
      >
        duration={duration}ms로 표시
      </DemoButton>
      <CodeView
        code={`toast.show({\n  variant: "success",\n  title: "알림",\n  duration: ${duration},\n});`}
        language="typescript"
        showLineNumbers={false}
      />
    </div>
  );
}

// ── 5. Swipe Dismiss ─────────────────────────────────────────────────────
function SwipeDemo() {
  const toast = useToast();
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        👆 토스트를 <strong>좌우로 드래그</strong>하거나 마우스로{" "}
        <strong>스와이프</strong>하면 dismiss됩니다. 임계치(100px)에 도달하지
        않으면 원위치로 복귀합니다.
      </p>
      <DemoButton
        onClick={() =>
          toast.show({
            variant: "info",
            title: "스와이프해서 닫기",
            description: "좌/우로 드래그하여 dismiss 해보세요.",
            duration: 20000,
          })
        }
      >
        스와이프 테스트 토스트
      </DemoButton>
    </div>
  );
}

// ── 6. Stacking (maxToasts) ─────────────────────────────────────────────
function StackingDemo() {
  const toast = useToast();
  const showBurst = () => {
    for (let i = 1; i <= 5; i += 1) {
      setTimeout(() => {
        toast.show({
          variant: (["default", "success", "warning", "info", "error"] as const)[
            (i - 1) % 5
          ],
          title: `토스트 ${i} / 5`,
          description: "maxToasts=5 설정 시 5개까지만 유지됩니다.",
        });
      }, i * 150);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        rapid-fire 5연타. maxToasts 제한 초과 시 가장 오래된 항목이 밀려나갑니다.
      </p>
      <div className="flex gap-2">
        <DemoButton onClick={showBurst}>5개 연속 생성</DemoButton>
        <DemoButton variant="red" onClick={() => toast.dismissAll()}>
          모두 닫기
        </DemoButton>
      </div>
    </div>
  );
}

// ── Page (ToastProvider wrap) ────────────────────────────────────────────
function ToastPageInner({
  position,
  setPosition,
}: {
  position: ToastPosition;
  setPosition: (p: ToastPosition) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
          Toast
        </h1>
        <p className="text-sm text-gray-500">
          자동 사라지는 알림 토스트 시스템 (variants, 6-위치, 스와이프, promise
          추적)
        </p>
      </header>

      <Section
        id="basic"
        title="Basic Variants"
        desc="5가지 variant — default / success / error / warning / info"
      >
        <BasicDemo />
      </Section>

      <Section
        id="positions"
        title="Positions"
        desc="6개 고정 포지션 중 선택. 버튼 클릭 시 현재 포지션에 토스트 표시."
      >
        <PositionsDemo position={position} setPosition={setPosition} />
      </Section>

      <Section
        id="custom-content"
        title="Custom Content"
        desc="title + description + action 버튼 조합"
      >
        <CustomContentDemo />
      </Section>

      <Section
        id="auto-dismiss"
        title="Auto-dismiss"
        desc="duration 슬라이더로 자동 dismiss 시간 제어. 진행바가 남은 시간 표시."
      >
        <AutoDismissDemo />
      </Section>

      <Section
        id="swipe-dismiss"
        title="Swipe Dismiss"
        desc="포인터 드래그로 dismiss. 임계치 도달 시 즉시 제거, 미달 시 스냅백."
      >
        <SwipeDemo />
      </Section>

      <Section
        id="stacking"
        title="Stacking (maxToasts)"
        desc="maxToasts=5 설정. 초과 생성 시 가장 오래된 토스트가 exit."
      >
        <StackingDemo />
      </Section>
    </div>
  );
}

export function ToastPage() {
  const [position, setPosition] = useState<ToastPosition>("bottom-right");
  return (
    <ToastProvider position={position} maxToasts={5} defaultDuration={5000}>
      <ToastPageInner position={position} setPosition={setPosition} />
    </ToastProvider>
  );
}
