import { useState, type ReactNode } from "react";
import { ChatBubble, CodeView } from "plastic";
import type {
  ChatBubbleAlign,
  ChatBubbleTailConfig,
  ChatBubbleTheme,
  ChatBubbleTimeMode,
  ChatBubbleTimePosition,
} from "plastic";

// ── 공통 레이아웃 헬퍼 ────────────────────────────────────────────────────

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

function Card({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className={[
        "p-6 rounded-lg border",
        dark
          ? "bg-gray-900 border-gray-700"
          : "bg-white border-gray-200",
      ].join(" ")}
    >
      {children}
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
          {["Prop", "Type", "Default", "Description"].map((h) => (
            <th
              key={h}
              className="px-4 py-2 border-b border-gray-200 font-semibold"
            >
              {h}
            </th>
          ))}
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

// ── 코드 스니펫 상수 ───────────────────────────────────────────────────────

const USAGE_BASIC = `import { ChatBubble } from "@pihitpihit/plastic";

// 기본 (좌측, 꼬리 없음)
<ChatBubble.Root>
  <ChatBubble.Content>안녕하세요!</ChatBubble.Content>
  <ChatBubble.Time t={Date.now()} />
</ChatBubble.Root>

// 우측 + 꼬리 + 파란색
<ChatBubble.Root align="end" color="#3b82f6" tail>
  <ChatBubble.Content>보내는 쪽 메시지입니다.</ChatBubble.Content>
  <ChatBubble.Time t={Date.now()} position="outside-bottom-end" />
</ChatBubble.Root>`;

const USAGE_TAIL = `// 기본 꼬리 (true = align 방향)
<ChatBubble.Root align="start" tail>
  <ChatBubble.Content>기본 꼬리</ChatBubble.Content>
</ChatBubble.Root>

// 세부 설정
<ChatBubble.Root align="start" tail={{ side: "start", align: "center", size: 10 }}>
  <ChatBubble.Content>중앙 꼬리</ChatBubble.Content>
</ChatBubble.Root>

// 꼬리 없음 (기본값 = false)
<ChatBubble.Root>
  <ChatBubble.Content>꼬리 없음</ChatBubble.Content>
</ChatBubble.Root>`;

const USAGE_TIME = `// absolute (기본) — "오후 3:24"
<ChatBubble.Time t={Date.now()} mode="absolute" />

// relative — "5분 전"
<ChatBubble.Time t={Date.now() - 300_000} mode="relative" />

// both — "오후 3:24 · 5분 전"
<ChatBubble.Time t={Date.now() - 300_000} mode="both" />

// 커스텀 포매터
<ChatBubble.Time
  t={Date.now()}
  absoluteFormatter={(d) => d.toLocaleString("ko-KR")}
/>

// 위치 지정
<ChatBubble.Time t={Date.now()} position="inside-bottom-end" />
<ChatBubble.Time t={Date.now()} position="outside-top-start" />
<ChatBubble.Time t={Date.now()} position="inline-after" />`;

const USAGE_AVATAR = `// 이미지 아바타
<ChatBubble.Root>
  <ChatBubble.Avatar src="/avatar.jpg" alt="Alice" size={36} />
  <ChatBubble.Content>Hello!</ChatBubble.Content>
</ChatBubble.Root>

// 이니셜 fallback
<ChatBubble.Root>
  <ChatBubble.Avatar fallback="A" size={36} />
  <ChatBubble.Content>Hello!</ChatBubble.Content>
</ChatBubble.Root>`;

const USAGE_CONVERSATION = `const messages = [
  { id: 1, role: "other", text: "안녕하세요!", t: Date.now() - 120_000 },
  { id: 2, role: "me",    text: "안녕하세요~ 반갑습니다.", t: Date.now() - 60_000 },
  { id: 3, role: "other", text: "잘 지내셨나요?", t: Date.now() },
];

function isFirst(msgs, i) {
  return i === 0 || msgs[i - 1].role !== msgs[i].role;
}

{messages.map((msg, i) => (
  <ChatBubble.Root
    key={msg.id}
    align={msg.role === "me" ? "end" : "start"}
    color={msg.role === "me" ? "#3b82f6" : undefined}
    tail={isFirst(messages, i)}
  >
    {isFirst(messages, i) && msg.role !== "me" && (
      <ChatBubble.Avatar fallback={msg.role === "other" ? "B" : "M"} />
    )}
    <ChatBubble.Content>{msg.text}</ChatBubble.Content>
    <ChatBubble.Time t={msg.t} mode="relative" position="outside-bottom-end" />
  </ChatBubble.Root>
))}`;

// ── Props 테이블 ──────────────────────────────────────────────────────────

const ROOT_PROPS: Array<[string, string, string, string]> = [
  ["align", '"start" | "end"', '"start"', "좌(start) / 우(end) 정렬"],
  ["color", "string", "theme 기본값", "배경색 (CSS color)"],
  ["textColor", "string", "auto", "텍스트 색상. 미지정 시 배경색 명도 기반 자동 결정"],
  ["tail", "boolean | ChatBubbleTailConfig", "false", "말풍선 꼬리 표시. true = align 방향 기본 꼬리"],
  ["maxWidth", "number | string", '"70%"', "말풍선 최대 너비"],
  ["radius", "number", "12", "모서리 둥글기 (px)"],
  ["padding", "string", '"0.5rem 0.75rem"', "말풍선 내부 패딩 (CSS shorthand)"],
  ["theme", '"light" | "dark"', '"light"', "테마"],
  ["loading", "boolean", "false", "Streaming 점멸 인디케이터 표시"],
];

const TAIL_PROPS: Array<[string, string, string, string]> = [
  ["side", '"start" | "end"', "align 따라감", "꼬리가 나올 방향"],
  ["align", '"start" | "center" | "end"', '"start"', "꼬리 세로 위치 (위/중/아래)"],
  ["size", "number", "8", "꼬리 크기 (px)"],
];

const TIME_PROPS: Array<[string, string, string, string]> = [
  ["t", "number | Date | string", "—", "시간 값. epoch ms / Date / ISO string"],
  ["position", "ChatBubbleTimePosition", '"outside-bottom-end"', "표시 위치"],
  ["mode", '"absolute" | "relative" | "both"', '"absolute"', "표기 모드. both = 절대+상대 동시"],
  ["absoluteFormatter", "(d: Date) => string", "toLocaleTimeString", "절대 시간 커스텀 포매터"],
  ["relativeFormatter", "(deltaMs: number) => string", "ko 내장", '"5분 전" 형식 커스텀 포매터'],
  ["separator", "string", '" · "', '"both" 모드 구분자'],
  ["refreshInterval", "number", "60_000", "relative/both 자동 갱신 주기 (ms). 0 = 비활성"],
];

const AVATAR_PROPS: Array<[string, string, string, string]> = [
  ["src", "string", "—", "이미지 URL"],
  ["alt", "string", "—", "alt 텍스트"],
  ["fallback", "ReactNode", "—", "src 없거나 실패 시 표시 (이니셜 등)"],
  ["size", "number", "32", "크기 (px)"],
  ["position", '"outside" | "inside-leading"', '"outside"', "말풍선 외부(옆) / 내부(inline 선두)"],
];

// ── 샘플 메시지 타임스탬프 ────────────────────────────────────────────────

const NOW = Date.now();
const T = {
  m1: NOW - 8 * 60_000,
  m2: NOW - 7 * 60_000,
  m3: NOW - 6 * 60_000,
  m4: NOW - 2 * 60_000,
  m5: NOW - 60_000,
  m6: NOW - 10_000,
};

// ── 데모 섹션 컴포넌트들 ──────────────────────────────────────────────────

function BasicDemo() {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <ChatBubble.Root>
          <ChatBubble.Content>안녕하세요! 반갑습니다.</ChatBubble.Content>
          <ChatBubble.Time t={T.m1} />
        </ChatBubble.Root>
        <ChatBubble.Root align="end" color="#3b82f6">
          <ChatBubble.Content>네, 반갑습니다!</ChatBubble.Content>
          <ChatBubble.Time t={T.m2} />
        </ChatBubble.Root>
      </div>
    </Card>
  );
}

function TailDemo() {
  return (
    <Card>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">tail (기본 — align 방향)</p>
          <div className="flex flex-col gap-3">
            <ChatBubble.Root tail>
              <ChatBubble.Content>꼬리: start, top</ChatBubble.Content>
            </ChatBubble.Root>
            <ChatBubble.Root align="end" color="#3b82f6" tail>
              <ChatBubble.Content>꼬리: end, top</ChatBubble.Content>
            </ChatBubble.Root>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">tail.align — 꼬리 세로 위치</p>
          <div className="flex flex-col gap-3">
            <ChatBubble.Root tail={{ align: "start" }}>
              <ChatBubble.Content>align: start (위)</ChatBubble.Content>
            </ChatBubble.Root>
            <ChatBubble.Root tail={{ align: "center" }}>
              <ChatBubble.Content>align: center (중앙)</ChatBubble.Content>
            </ChatBubble.Root>
            <ChatBubble.Root tail={{ align: "end" }}>
              <ChatBubble.Content>align: end (아래)</ChatBubble.Content>
            </ChatBubble.Root>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">tail.size — 꼬리 크기</p>
          <div className="flex flex-col gap-3">
            <ChatBubble.Root tail={{ size: 5 }}>
              <ChatBubble.Content>size: 5px</ChatBubble.Content>
            </ChatBubble.Root>
            <ChatBubble.Root tail={{ size: 10 }}>
              <ChatBubble.Content>size: 10px</ChatBubble.Content>
            </ChatBubble.Root>
            <ChatBubble.Root tail={{ size: 16 }}>
              <ChatBubble.Content>size: 16px</ChatBubble.Content>
            </ChatBubble.Root>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-400">tail={"{false}"} — 꼬리 없음</p>
          <ChatBubble.Root>
            <ChatBubble.Content>꼬리 없음 (기본값)</ChatBubble.Content>
          </ChatBubble.Root>
        </div>
      </div>
    </Card>
  );
}

function ColorDemo() {
  const colors = [
    { color: "#3b82f6", label: "blue-500" },
    { color: "#10b981", label: "emerald-500" },
    { color: "#f59e0b", label: "amber-500" },
    { color: "#ef4444", label: "red-500" },
    { color: "#8b5cf6", label: "violet-500" },
    { color: "#f3f4f6", label: "gray-100 (기본 light)" },
  ];
  return (
    <Card>
      <div className="flex flex-col gap-3">
        {colors.map(({ color, label }) => (
          <ChatBubble.Root key={color} color={color} tail>
            <ChatBubble.Content>{label}</ChatBubble.Content>
          </ChatBubble.Root>
        ))}
      </div>
    </Card>
  );
}

function TimePositionDemo() {
  const positions: ChatBubbleTimePosition[] = [
    "outside-bottom-end",
    "outside-bottom-start",
    "outside-top-end",
    "outside-top-start",
    "inside-bottom-end",
    "inside-bottom-start",
    "inline-after",
  ];
  return (
    <Card>
      <div className="flex flex-col gap-5">
        {positions.map((pos) => (
          <div key={pos} className="flex flex-col gap-1">
            <p className="text-xs text-gray-400 font-mono">{pos}</p>
            <ChatBubble.Root color="#3b82f6">
              <ChatBubble.Content>메시지 내용</ChatBubble.Content>
              <ChatBubble.Time t={T.m3} position={pos} />
            </ChatBubble.Root>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TimeModeDemo() {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">mode="absolute" (기본)</p>
          <ChatBubble.Root>
            <ChatBubble.Content>절대 시간</ChatBubble.Content>
            <ChatBubble.Time t={T.m4} mode="absolute" />
          </ChatBubble.Root>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">mode="relative"</p>
          <ChatBubble.Root>
            <ChatBubble.Content>상대 시간 (ago)</ChatBubble.Content>
            <ChatBubble.Time t={T.m4} mode="relative" />
          </ChatBubble.Root>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">mode="both"</p>
          <ChatBubble.Root>
            <ChatBubble.Content>절대 + 상대</ChatBubble.Content>
            <ChatBubble.Time t={T.m4} mode="both" />
          </ChatBubble.Root>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">커스텀 포매터</p>
          <ChatBubble.Root>
            <ChatBubble.Content>커스텀 포매터</ChatBubble.Content>
            <ChatBubble.Time
              t={T.m4}
              mode="absolute"
              absoluteFormatter={(d) =>
                d.toLocaleString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
            />
          </ChatBubble.Root>
        </div>
      </div>
    </Card>
  );
}

function AvatarDemo() {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">position="outside" (기본)</p>
          <ChatBubble.Root tail>
            <ChatBubble.Avatar fallback="B" size={36} />
            <ChatBubble.Content>아바타가 말풍선 옆에 표시됩니다.</ChatBubble.Content>
          </ChatBubble.Root>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">position="inside-leading"</p>
          <ChatBubble.Root>
            <ChatBubble.Avatar fallback="B" size={28} position="inside-leading" />
            <ChatBubble.Content>아바타가 말풍선 내부 좌측에 표시됩니다.</ChatBubble.Content>
          </ChatBubble.Root>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">src 이미지</p>
          <ChatBubble.Root tail>
            <ChatBubble.Avatar
              src="https://api.dicebear.com/7.x/thumbs/svg?seed=plastic"
              alt="Bot"
              size={36}
            />
            <ChatBubble.Content>이미지 아바타</ChatBubble.Content>
          </ChatBubble.Root>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">src 실패 → fallback</p>
          <ChatBubble.Root tail>
            <ChatBubble.Avatar
              src="https://broken-url-that-fails.invalid/avatar.png"
              fallback="F"
              size={36}
            />
            <ChatBubble.Content>이미지 로드 실패 시 이니셜 표시</ChatBubble.Content>
          </ChatBubble.Root>
        </div>
      </div>
    </Card>
  );
}

function ActionsDemo() {
  return (
    <Card>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Actions outside-bottom (기본)</p>
          <ChatBubble.Root>
            <ChatBubble.Content>마우스를 올려보세요.</ChatBubble.Content>
            <ChatBubble.Actions showOnHover>
              <button
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100"
                onClick={() => alert("복사")}
              >
                복사
              </button>
              <button
                className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100"
                onClick={() => alert("답장")}
              >
                답장
              </button>
            </ChatBubble.Actions>
          </ChatBubble.Root>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-400">Actions 항상 표시 (showOnHover=false)</p>
          <ChatBubble.Root color="#3b82f6" align="end">
            <ChatBubble.Content>전송된 메시지</ChatBubble.Content>
            <ChatBubble.Actions>
              <button
                className="text-xs text-blue-300 hover:text-white px-2 py-0.5 rounded hover:bg-blue-500"
                onClick={() => alert("수정")}
              >
                수정
              </button>
            </ChatBubble.Actions>
          </ChatBubble.Root>
        </div>
      </div>
    </Card>
  );
}

function LoadingDemo() {
  return (
    <Card>
      <div className="flex flex-col gap-4">
        <ChatBubble.Root loading>
          <ChatBubble.Content>응답을 생성 중입니다</ChatBubble.Content>
        </ChatBubble.Root>
        <ChatBubble.Root loading>
          <ChatBubble.Content />
        </ChatBubble.Root>
      </div>
    </Card>
  );
}

function DarkDemo() {
  return (
    <Card dark>
      <div className="flex flex-col gap-4">
        <ChatBubble.Root theme="dark" tail>
          <ChatBubble.Avatar fallback="B" size={32} />
          <ChatBubble.Content>다크 테마 메시지입니다.</ChatBubble.Content>
          <ChatBubble.Time t={T.m5} mode="relative" />
        </ChatBubble.Root>
        <ChatBubble.Root theme="dark" align="end" color="#3b82f6" tail>
          <ChatBubble.Content>내가 보낸 메시지.</ChatBubble.Content>
          <ChatBubble.Time t={T.m6} />
        </ChatBubble.Root>
      </div>
    </Card>
  );
}

function ConversationDemo() {
  type Message = {
    id: number;
    role: "me" | "other";
    text: string;
    t: number;
  };

  const [messages] = useState<Message[]>([
    { id: 1, role: "other", text: "안녕하세요! 무엇을 도와드릴까요?", t: T.m1 },
    { id: 2, role: "me", text: "plastic 라이브러리 ChatBubble 컴포넌트 잘 동작하나요?", t: T.m2 },
    { id: 3, role: "other", text: "네, 잘 동작합니다!", t: T.m3 },
    { id: 4, role: "other", text: "꼬리, 타임스탬프, 색상 등 다양한 옵션을 지원합니다.", t: T.m4 },
    { id: 5, role: "me", text: "오, 좋네요. 감사합니다!", t: T.m5 },
    { id: 6, role: "other", text: "언제든지 질문하세요 😊", t: T.m6 },
  ]);

  function isFirstOfGroup(msgs: Message[], i: number): boolean {
    return i === 0 || msgs[i - 1]!.role !== msgs[i]!.role;
  }

  return (
    <Card>
      <div className="flex flex-col gap-2">
        {messages.map((msg, i) => {
          const isMe = msg.role === "me";
          const first = isFirstOfGroup(messages, i);
          return (
            <ChatBubble.Root
              key={msg.id}
              align={isMe ? "end" : "start"}
              color={isMe ? "#3b82f6" : undefined}
              tail={first}
            >
              {first && !isMe && (
                <ChatBubble.Avatar fallback="B" size={32} />
              )}
              <ChatBubble.Content>{msg.text}</ChatBubble.Content>
              <ChatBubble.Time
                t={msg.t}
                mode="relative"
                position="outside-bottom-end"
              />
            </ChatBubble.Root>
          );
        })}
      </div>
    </Card>
  );
}

// ── Playground ────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Sel<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function PlaygroundSection() {
  const [align, setAlign] = useState<ChatBubbleAlign>("start");
  const [theme, setTheme] = useState<ChatBubbleTheme>("light");
  const [color, setColor] = useState("#f3f4f6");
  const [textColor, setTextColor] = useState("");
  const [tailEnabled, setTailEnabled] = useState(false);
  const [tailSide, setTailSide] = useState<ChatBubbleAlign>("start");
  const [tailAlign, setTailAlign] = useState<Required<ChatBubbleTailConfig>["align"]>("start");
  const [tailSize, setTailSize] = useState(8);
  const [timeMode, setTimeMode] = useState<ChatBubbleTimeMode>("absolute");
  const [timePos, setTimePos] = useState<ChatBubbleTimePosition>("outside-bottom-end");
  const [showTime, setShowTime] = useState(true);
  const [showAvatar, setShowAvatar] = useState(false);
  const [maxWidth, setMaxWidth] = useState("70%");
  const [radius, setRadius] = useState(12);
  const [loading, setLoading] = useState(false);
  const [msgText, setMsgText] = useState("메시지 내용을 여기에 입력하세요.");

  const tail: boolean | ChatBubbleTailConfig = tailEnabled
    ? { side: tailSide, align: tailAlign, size: tailSize }
    : false;

  return (
    <div className={theme === "dark" ? "bg-gray-900 rounded-lg p-6" : "bg-white border border-gray-200 rounded-lg p-6"}>
      {/* 미리보기 */}
      <div className="mb-6 min-h-[80px] flex items-center">
        <ChatBubble.Root
          align={align}
          color={color || undefined}
          textColor={textColor || undefined}
          tail={tail}
          maxWidth={maxWidth}
          radius={radius}
          theme={theme}
          loading={loading}
        >
          {showAvatar && <ChatBubble.Avatar fallback="B" size={32} />}
          <ChatBubble.Content>{msgText}</ChatBubble.Content>
          {showTime && <ChatBubble.Time t={NOW - 5 * 60_000} mode={timeMode} position={timePos} />}
        </ChatBubble.Root>
      </div>

      {/* 컨트롤 */}
      <div className={["flex flex-col gap-3 pt-4 border-t", theme === "dark" ? "border-gray-700" : "border-gray-200"].join(" ")}>
        <Row label="텍스트">
          <input
            className="text-xs border border-gray-300 rounded px-2 py-1 w-64"
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
          />
        </Row>
        <Row label="align">
          <Sel value={align} onChange={setAlign} options={["start", "end"]} />
        </Row>
        <Row label="theme">
          <Sel value={theme} onChange={setTheme} options={["light", "dark"]} />
        </Row>
        <Row label="color">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          />
          <span className="text-xs text-gray-400 font-mono">{color}</span>
        </Row>
        <Row label="textColor">
          <input
            type="color"
            value={textColor || "#111827"}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          />
          <button
            onClick={() => setTextColor("")}
            className="text-xs text-gray-400 hover:text-gray-700 underline"
          >
            auto
          </button>
        </Row>
        <Row label="maxWidth">
          <input
            className="text-xs border border-gray-300 rounded px-2 py-1 w-24"
            value={maxWidth}
            onChange={(e) => setMaxWidth(e.target.value)}
          />
        </Row>
        <Row label="radius">
          <input
            type="range"
            min={0}
            max={24}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-28"
          />
          <span className="text-xs text-gray-400 font-mono">{radius}px</span>
        </Row>

        {/* Tail */}
        <Row label="꼬리 사용">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={tailEnabled}
              onChange={(e) => setTailEnabled(e.target.checked)}
            />
            enabled
          </label>
        </Row>
        {tailEnabled && (
          <>
            <Row label="tail.side">
              <Sel value={tailSide} onChange={setTailSide} options={["start", "end"]} />
            </Row>
            <Row label="tail.align">
              <Sel
                value={tailAlign}
                onChange={setTailAlign}
                options={["start", "center", "end"]}
              />
            </Row>
            <Row label="tail.size">
              <input
                type="range"
                min={4}
                max={20}
                value={tailSize}
                onChange={(e) => setTailSize(Number(e.target.value))}
                className="w-28"
              />
              <span className="text-xs text-gray-400 font-mono">{tailSize}px</span>
            </Row>
          </>
        )}

        {/* Time */}
        <Row label="시간 표시">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showTime}
              onChange={(e) => setShowTime(e.target.checked)}
            />
            enabled
          </label>
        </Row>
        {showTime && (
          <>
            <Row label="time.mode">
              <Sel
                value={timeMode}
                onChange={setTimeMode}
                options={["absolute", "relative", "both"]}
              />
            </Row>
            <Row label="time.position">
              <Sel
                value={timePos}
                onChange={setTimePos}
                options={[
                  "outside-bottom-end",
                  "outside-bottom-start",
                  "outside-top-end",
                  "outside-top-start",
                  "inside-bottom-end",
                  "inside-bottom-start",
                  "inline-after",
                ]}
              />
            </Row>
          </>
        )}

        {/* Avatar */}
        <Row label="아바타">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={showAvatar}
              onChange={(e) => setShowAvatar(e.target.checked)}
            />
            enabled
          </label>
        </Row>

        {/* Loading */}
        <Row label="loading">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={loading}
              onChange={(e) => setLoading(e.target.checked)}
            />
            enabled
          </label>
        </Row>
      </div>
    </div>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────

export function ChatBubblePage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ChatBubble</h1>
        <p className="text-gray-500 mt-1">
          채팅 말풍선 Compound 컴포넌트.{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">ChatBubble.Root</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Content</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Avatar</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Time</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Actions</code>,{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">Footer</code>를 조합합니다.
        </p>
      </div>

      <Section id="basic" title="Basic">
        <BasicDemo />
      </Section>

      <Section id="tail" title="Tail — 말풍선 꼬리" desc="tail prop으로 꼬리 유/무 및 세부 위치를 제어합니다.">
        <TailDemo />
      </Section>

      <Section id="color" title="Color" desc="color prop으로 배경색을 지정합니다. textColor 미지정 시 명도에 따라 자동 결정됩니다.">
        <ColorDemo />
      </Section>

      <Section id="time-position" title="Time — 위치" desc="position prop으로 시간 표시 위치를 7가지 중 선택합니다.">
        <TimePositionDemo />
      </Section>

      <Section id="time-mode" title="Time — 모드" desc="mode prop으로 절대/상대/both 표기를 선택합니다. ago 표기는 relative 또는 both.">
        <TimeModeDemo />
      </Section>

      <Section id="avatar" title="Avatar" desc="아바타 이미지 또는 이니셜 fallback. position으로 말풍선 외부/내부 배치를 전환합니다.">
        <AvatarDemo />
      </Section>

      <Section id="actions" title="Actions" desc="showOnHover=true 로 hover 시에만 액션 버튼을 노출합니다.">
        <ActionsDemo />
      </Section>

      <Section id="loading" title="Loading" desc="streaming 응답 등 입력 중 상태를 loading prop으로 표시합니다.">
        <LoadingDemo />
      </Section>

      <Section id="dark" title="Dark Theme">
        <DarkDemo />
      </Section>

      <Section id="conversation" title="Conversation" desc="isFirstOfGroup 패턴으로 그룹의 첫 메시지에만 꼬리/아바타를 표시합니다.">
        <ConversationDemo />
      </Section>

      <Section id="props-root" title="Props — Root">
        <PropsTable rows={ROOT_PROPS} />
      </Section>

      <Section id="props-tail" title="Props — ChatBubbleTailConfig">
        <PropsTable rows={TAIL_PROPS} />
      </Section>

      <Section id="props-time" title="Props — Time">
        <PropsTable rows={TIME_PROPS} />
      </Section>

      <Section id="props-avatar" title="Props — Avatar">
        <PropsTable rows={AVATAR_PROPS} />
      </Section>

      <Section id="usage" title="Usage">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-2">기본</p>
            <CodeView code={USAGE_BASIC} language="tsx" showAlternatingRows={false} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">꼬리</p>
            <CodeView code={USAGE_TAIL} language="tsx" showAlternatingRows={false} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">시간 표시</p>
            <CodeView code={USAGE_TIME} language="tsx" showAlternatingRows={false} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">아바타</p>
            <CodeView code={USAGE_AVATAR} language="tsx" showAlternatingRows={false} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">대화 목록</p>
            <CodeView code={USAGE_CONVERSATION} language="tsx" showAlternatingRows={false} />
          </div>
        </div>
      </Section>

      <Section id="playground" title="Playground">
        <PlaygroundSection />
      </Section>
    </div>
  );
}
