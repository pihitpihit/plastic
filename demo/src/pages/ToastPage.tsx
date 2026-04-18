import { useState } from "react";
import { ToastProvider, useToast, CodeView } from "plastic";
import type { ToastPosition, ToastTheme, ToastVariant } from "plastic";

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

// ── 7. Promise (loading → success/error) ─────────────────────────────────
function PromiseDemo() {
  const toast = useToast();
  const runSuccess = () => {
    toast.promise(
      new Promise<string>((resolve) => setTimeout(() => resolve("OK"), 2000)),
      {
        loading: { title: "저장 중...", description: "서버에 전송하고 있습니다." },
        success: {
          title: "저장 완료",
          description: "모든 변경사항이 적용되었습니다.",
        },
        error: {
          title: "저장 실패",
          description: "다시 시도해주세요.",
        },
      },
    );
  };
  const runError = () => {
    toast
      .promise(
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Network timeout")), 2000),
        ),
        {
          loading: { title: "업로드 중...", description: "파일을 전송합니다." },
          success: { title: "업로드 완료" },
          error: (err) => ({
            title: "업로드 실패",
            description: err instanceof Error ? err.message : String(err),
          }),
        },
      )
      .catch(() => {
        // 사용자가 잡을 수 있도록 재발생. 데모에서는 의도적으로 무시.
      });
  };
  return (
    <div className="flex flex-wrap gap-2">
      <DemoButton variant="green" onClick={runSuccess}>
        Resolve (2s 후 success)
      </DemoButton>
      <DemoButton variant="red" onClick={runError}>
        Reject (2s 후 error)
      </DemoButton>
    </div>
  );
}

// ── 8. Persistent (duration: Infinity) ──────────────────────────────────
function PersistentDemo() {
  const toast = useToast();
  const [lastId, setLastId] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600">
        <code className="bg-gray-100 px-1 rounded">duration: Infinity</code>{" "}
        사용 시 자동 dismiss 비활성. 진행바도 숨겨집니다.
      </p>
      <div className="flex gap-2">
        <DemoButton
          onClick={() => {
            const id = toast.show({
              variant: "info",
              title: "업로드 진행 중",
              description: "이 토스트는 수동으로 닫기 전까지 유지됩니다.",
              duration: Infinity,
            });
            setLastId(id);
          }}
        >
          영구 토스트 표시
        </DemoButton>
        <DemoButton
          variant="red"
          onClick={() => {
            if (lastId) {
              toast.dismiss(lastId);
              setLastId(null);
            }
          }}
        >
          수동 dismiss (마지막)
        </DemoButton>
      </div>
    </div>
  );
}

// ── 9. Dark Theme (theme toggle) ────────────────────────────────────────
function DarkThemeDemo({
  theme,
  setTheme,
}: {
  theme: ToastTheme;
  setTheme: (t: ToastTheme) => void;
}) {
  const toast = useToast();
  return (
    <div
      className="rounded-lg p-6 transition-colors"
      style={{
        background: theme === "dark" ? "#0f172a" : "#f8fafc",
        color: theme === "dark" ? "#e2e8f0" : "#0f172a",
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm">현재 테마:</span>
        <button
          onClick={() => setTheme("light")}
          className={`px-3 py-1 text-xs rounded border ${
            theme === "light"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          light
        </button>
        <button
          onClick={() => setTheme("dark")}
          className={`px-3 py-1 text-xs rounded border ${
            theme === "dark"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-slate-700 text-gray-300 border-slate-600"
          }`}
        >
          dark
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["default", "success", "error", "warning", "info"] as ToastVariant[]).map(
          (v) => (
            <button
              key={v}
              onClick={() =>
                toast.show({ variant: v, title: `${v} 토스트`, description: `테마=${theme}` })
              }
              className="px-3 py-1.5 text-sm rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              {v}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

// ── Props 테이블 ────────────────────────────────────────────────────────
function PropsTable({
  title,
  rows,
}: {
  title: string;
  rows: [string, string, string, string][];
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Prop", "Type", "Default", "Description"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(([prop, type, def, desc]) => (
              <tr key={prop}>
                <td className="px-4 py-2.5 font-mono text-xs text-blue-700">
                  {prop}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">
                  {type}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                  {def}
                </td>
                <td className="px-4 py-2.5 text-gray-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const PROPS_PROVIDER: [string, string, string, string][] = [
  ["position", "ToastPosition", '"bottom-right"', "토스트 고정 위치 (6종)"],
  ["stackOrder", '"newest-first" | "oldest-first"', '"newest-first"', "스택 정렬"],
  ["maxToasts", "number", "5", "동시 표시 최대 개수"],
  ["defaultDuration", "number", "5000", "기본 자동 dismiss 시간 (ms)"],
  ["pauseOnHover", "boolean", "true", "hover 시 타이머 일시정지"],
  ["swipeDismissible", "boolean", "true", "스와이프 dismiss 허용"],
  ["swipeThreshold", "number", "100", "스와이프 임계치 (px)"],
  ["swipeDirection", '"horizontal" | "vertical"', '"horizontal"', "스와이프 축"],
  ["theme", '"light" | "dark"', '"light"', "색상 테마"],
  ["label", "string", '"Notifications"', "portal aria-label"],
  ["onDismiss", "(id: string) => void", "—", "수동/스와이프 dismiss 콜백"],
  ["onAutoClose", "(id: string) => void", "—", "duration 만료 자동 dismiss 콜백"],
];

const PROPS_USE_TOAST: [string, string, string, string][] = [
  ["show", "(options: ShowToastOptions) => string", "—", "토스트 추가, id 반환"],
  ["dismiss", "(id: string) => void", "—", "특정 토스트 dismiss"],
  ["dismissAll", "() => void", "—", "모든 토스트 dismiss"],
  ["promise", "(p, options) => Promise<T>", "—", "loading → success/error 자동 전환"],
  ["toasts", "readonly ToastData[]", "[]", "현재 활성 토스트 목록 (read-only)"],
];

const PROPS_SHOW: [string, string, string, string][] = [
  ["title", "string", "—", "타이틀 (필수)"],
  ["description", "string", "—", "부가 설명"],
  ["variant", "ToastVariant", '"default"', "5종: default/success/error/warning/info"],
  ["duration", "number", "5000", "ms 또는 Infinity (영구)"],
  ["action", "ToastAction", "—", "액션 버튼 (label + onClick + variant)"],
  ["render", "({ dismiss }) => ReactNode", "—", "커스텀 렌더 함수"],
  ["pauseOnHover", "boolean", "inherit", "개별 오버라이드"],
  ["swipeDismissible", "boolean", "inherit", "개별 오버라이드"],
  ["ariaLive", '"polite" | "assertive"', "auto", "스크린리더 안내 긴급도"],
];

const PROPS_ROOT: [string, string, string, string][] = [
  ["variant", "ToastVariant", '"default"', "색상/아이콘/aria-live 변경"],
  ["children", "ReactNode", "—", "Icon/Content/Action/Close/Progress 조합"],
  ["pauseOnHover", "boolean", "inherit", "개별 토스트 오버라이드"],
  ["swipeDismissible", "boolean", "inherit", "개별 토스트 오버라이드"],
];

const PROPS_ICON: [string, string, string, string][] = [
  ["children", "ReactNode", "default SVG", "커스텀 아이콘 (variant별 기본 아이콘 대체)"],
];

const PROPS_CONTENT: [string, string, string, string][] = [
  ["title", "string", "—", "타이틀"],
  ["description", "string", "—", "부가 설명"],
  ["children", "ReactNode", "—", "완전 커스텀 content slot"],
];

const PROPS_ACTION: [string, string, string, string][] = [
  ["label", "string", "—", "버튼 텍스트 (필수)"],
  ["onClick", "() => void", "—", "클릭 핸들러 (필수)"],
  ["variant", '"default" | "primary"', '"default"', "버튼 스타일"],
];

const PROPS_CLOSE: [string, string, string, string][] = [
  ["children", "ReactNode", "default X SVG", "커스텀 닫기 아이콘"],
];

const PROPS_PROGRESS: [string, string, string, string][] = [
  ["variant", "ToastVariant", "inherit", "프로그레스 바 색상 오버라이드"],
];

// ── Playground ──────────────────────────────────────────────────────────
function Playground() {
  const toast = useToast();
  const [pgVariant, setPgVariant] = useState<ToastVariant>("default");
  const [pgDuration, setPgDuration] = useState(5000);
  const [pgTitle, setPgTitle] = useState("플레이그라운드 알림");
  const [pgDesc, setPgDesc] = useState("모든 prop을 실시간으로 조정하세요.");
  const [pgAction, setPgAction] = useState(false);
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">variant</span>
          <select
            value={pgVariant}
            onChange={(e) => setPgVariant(e.target.value as ToastVariant)}
            className="px-2 py-1 border border-gray-300 rounded"
          >
            {(["default", "success", "error", "warning", "info"] as const).map(
              (v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">
            duration ({pgDuration === Infinity ? "Infinity" : `${pgDuration}ms`})
          </span>
          <input
            type="range"
            min={0}
            max={10000}
            step={500}
            value={pgDuration === Infinity ? 10500 : pgDuration}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPgDuration(v >= 10500 ? Infinity : v);
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">title</span>
          <input
            type="text"
            value={pgTitle}
            onChange={(e) => setPgTitle(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">description</span>
          <input
            type="text"
            value={pgDesc}
            onChange={(e) => setPgDesc(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pgAction}
            onChange={(e) => setPgAction(e.target.checked)}
          />
          <span>Action 버튼 포함</span>
        </label>
      </div>
      <DemoButton
        onClick={() =>
          toast.show({
            variant: pgVariant,
            title: pgTitle,
            description: pgDesc,
            duration: pgDuration,
            action: pgAction
              ? {
                  label: "Undo",
                  variant: "primary",
                  onClick: () =>
                    toast.show({ variant: "info", title: "되돌림" }),
                }
              : undefined,
          })
        }
      >
        토스트 표시
      </DemoButton>
    </div>
  );
}

const USAGE_CODE = `import { ToastProvider, useToast } from "plastic";

function App() {
  return (
    <ToastProvider position="bottom-right" maxToasts={5}>
      <MyPage />
    </ToastProvider>
  );
}

function MyPage() {
  const toast = useToast();
  return (
    <button onClick={() => toast.show({
      variant: "success",
      title: "저장 완료",
      description: "변경사항이 저장되었습니다.",
      action: { label: "Undo", onClick: () => undo() },
    })}>
      저장
    </button>
  );
}

// Promise 추적
toast.promise(saveData(), {
  loading: { title: "저장 중..." },
  success: { title: "완료" },
  error: (err) => ({ title: "실패", description: String(err) }),
});`;

// ── Page (ToastProvider wrap) ────────────────────────────────────────────
function ToastPageInner({
  position,
  setPosition,
  theme,
  setTheme,
}: {
  position: ToastPosition;
  setPosition: (p: ToastPosition) => void;
  theme: ToastTheme;
  setTheme: (t: ToastTheme) => void;
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

      <Section
        id="promise"
        title="Promise (loading → success/error)"
        desc="toast.promise(p, { loading, success, error })로 비동기 상태 자동 전환"
      >
        <PromiseDemo />
      </Section>

      <Section
        id="persistent"
        title="Persistent"
        desc="duration: Infinity — 수동 dismiss 전까지 유지"
      >
        <PersistentDemo />
      </Section>

      <Section
        id="dark-theme"
        title="Dark Theme"
        desc="Provider theme='dark' 토글. 토스트 배경/테두리/텍스트가 전역적으로 변경."
      >
        <DarkThemeDemo theme={theme} setTheme={setTheme} />
      </Section>

      <Section id="props" title="Props">
        <PropsTable title="ToastProvider" rows={PROPS_PROVIDER} />
        <PropsTable title="useToast() 반환" rows={PROPS_USE_TOAST} />
        <PropsTable title="toast.show() options" rows={PROPS_SHOW} />
        <PropsTable title="Toast.Root" rows={PROPS_ROOT} />
        <PropsTable title="Toast.Icon" rows={PROPS_ICON} />
        <PropsTable title="Toast.Content" rows={PROPS_CONTENT} />
        <PropsTable title="Toast.Action" rows={PROPS_ACTION} />
        <PropsTable title="Toast.Close" rows={PROPS_CLOSE} />
        <PropsTable title="Toast.Progress" rows={PROPS_PROGRESS} />
      </Section>

      <Section id="usage" title="Usage" desc="기본 사용 패턴 + promise 추적">
        <CodeView code={USAGE_CODE} language="typescript" />
      </Section>

      <Section
        id="playground"
        title="Playground"
        desc="variant, duration, title, description, action 인터랙티브 조정"
      >
        <Playground />
      </Section>
    </div>
  );
}

export function ToastPage() {
  const [position, setPosition] = useState<ToastPosition>("bottom-right");
  const [theme, setTheme] = useState<ToastTheme>("light");
  return (
    <ToastProvider
      position={position}
      theme={theme}
      maxToasts={5}
      defaultDuration={5000}
    >
      <ToastPageInner
        position={position}
        setPosition={setPosition}
        theme={theme}
        setTheme={setTheme}
      />
    </ToastProvider>
  );
}
