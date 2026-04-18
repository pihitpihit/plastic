import { useState } from "react";
import { ToastProvider, useToast } from "plastic";
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
