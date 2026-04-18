import { useState } from "react";
import { Button, CommandPalette } from "plastic";
import type { CommandItem } from "plastic";

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
  const [open, setOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");

  const items: CommandItem[] = [
    { id: "new-file", label: "새 파일", onSelect: () => setLastAction("새 파일") },
    { id: "open-file", label: "파일 열기", onSelect: () => setLastAction("파일 열기") },
    { id: "save", label: "저장", onSelect: () => setLastAction("저장") },
    { id: "save-as", label: "다른 이름으로 저장", onSelect: () => setLastAction("다른 이름으로 저장") },
    { id: "close", label: "닫기", onSelect: () => setLastAction("닫기") },
    { id: "find", label: "찾기", onSelect: () => setLastAction("찾기") },
    { id: "replace", label: "바꾸기", onSelect: () => setLastAction("바꾸기") },
    { id: "undo", label: "실행 취소", onSelect: () => setLastAction("실행 취소") },
    { id: "redo", label: "다시 실행", onSelect: () => setLastAction("다시 실행") },
    { id: "preferences", label: "환경설정", onSelect: () => setLastAction("환경설정") },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button onClick={() => setOpen(true)}>CommandPalette 열기</Button>
        <span className="text-sm text-gray-500">또는 ⌘K / Ctrl+K</span>
      </div>
      {lastAction && (
        <p className="text-sm text-gray-600">
          마지막 선택: <strong>{lastAction}</strong>
        </p>
      )}
      <CommandPalette.Root open={open} onOpenChange={setOpen} items={items}>
        <CommandPalette.Input placeholder="명령 검색…" />
        <CommandPalette.List>
          {items.map((item) => (
            <CommandPalette.Item key={item.id} item={item} />
          ))}
        </CommandPalette.List>
        <CommandPalette.Empty />
        <CommandPalette.Footer />
      </CommandPalette.Root>
    </div>
  );
}

function GroupsDemo() {
  const [open, setOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");

  const navItems: CommandItem[] = [
    { id: "go-home", label: "홈으로 이동", group: "Navigation", onSelect: () => setLastAction("홈") },
    { id: "go-settings", label: "설정으로 이동", group: "Navigation", onSelect: () => setLastAction("설정") },
    { id: "go-profile", label: "프로필로 이동", group: "Navigation", onSelect: () => setLastAction("프로필") },
  ];
  const actionItems: CommandItem[] = [
    { id: "logout", label: "로그아웃", group: "Actions", onSelect: () => setLastAction("로그아웃") },
    { id: "invite", label: "팀원 초대", group: "Actions", onSelect: () => setLastAction("초대") },
    { id: "export", label: "데이터 내보내기", group: "Actions", onSelect: () => setLastAction("내보내기") },
  ];
  const helpItems: CommandItem[] = [
    { id: "docs", label: "문서 보기", group: "Help", onSelect: () => setLastAction("문서") },
    { id: "shortcuts", label: "단축키 보기", group: "Help", onSelect: () => setLastAction("단축키") },
    { id: "feedback", label: "피드백 보내기", group: "Help", onSelect: () => setLastAction("피드백") },
  ];

  const allItems = [...navItems, ...actionItems, ...helpItems];

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setOpen(true)}>Groups 열기</Button>
      {lastAction && (
        <p className="text-sm text-gray-600">
          마지막 선택: <strong>{lastAction}</strong>
        </p>
      )}
      <CommandPalette.Root open={open} onOpenChange={setOpen} items={allItems}>
        <CommandPalette.Input placeholder="명령 검색…" />
        <CommandPalette.List>
          <CommandPalette.Group heading="Navigation">
            {navItems.map((item) => (
              <CommandPalette.Item key={item.id} item={item} />
            ))}
          </CommandPalette.Group>
          <CommandPalette.Group heading="Actions">
            {actionItems.map((item) => (
              <CommandPalette.Item key={item.id} item={item} />
            ))}
          </CommandPalette.Group>
          <CommandPalette.Group heading="Help">
            {helpItems.map((item) => (
              <CommandPalette.Item key={item.id} item={item} />
            ))}
          </CommandPalette.Group>
        </CommandPalette.List>
        <CommandPalette.Empty />
        <CommandPalette.Footer />
      </CommandPalette.Root>
    </div>
  );
}

function NestedDemo() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const items: CommandItem[] = [
    {
      id: "theme",
      label: "테마 변경",
      description: "라이트/다크 전환",
      onSelect: () => {},
      children: [
        {
          id: "theme-light",
          label: "라이트 모드",
          onSelect: () => setTheme("light"),
        },
        {
          id: "theme-dark",
          label: "다크 모드",
          onSelect: () => setTheme("dark"),
        },
        {
          id: "theme-system",
          label: "시스템 설정 따름",
          onSelect: () => setTheme("light"),
        },
      ],
    },
    {
      id: "language",
      label: "언어 변경",
      description: "UI 언어 전환",
      onSelect: () => {},
      children: [
        { id: "lang-ko", label: "한국어", onSelect: () => {} },
        { id: "lang-en", label: "English", onSelect: () => {} },
        { id: "lang-ja", label: "日本語", onSelect: () => {} },
      ],
    },
    {
      id: "export",
      label: "내보내기",
      onSelect: () => {},
      children: [
        { id: "export-json", label: "JSON", onSelect: () => {} },
        { id: "export-csv", label: "CSV", onSelect: () => {} },
        { id: "export-pdf", label: "PDF", onSelect: () => {} },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={() => setOpen(true)}>Nested 열기</Button>
      <p className="text-sm text-gray-600">현재 테마: <strong>{theme}</strong></p>
      <p className="text-xs text-gray-500">
        Enter로 드릴다운, Backspace(빈 쿼리)로 상위로.
      </p>
      <CommandPalette.Root open={open} onOpenChange={setOpen} items={items}>
        <CommandPalette.Input placeholder="명령 검색…" />
        <CommandPalette.List>
          {items.map((item) => (
            <CommandPalette.Item key={item.id} item={item} />
          ))}
        </CommandPalette.List>
        <CommandPalette.Empty />
        <CommandPalette.Footer />
      </CommandPalette.Root>
    </div>
  );
}

function ShortcutsDemo() {
  const [open, setOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>("");

  const items: CommandItem[] = [
    {
      id: "new-file",
      label: "새 파일",
      shortcut: ["Mod", "N"],
      onSelect: () => setLastAction("새 파일"),
    },
    {
      id: "open-file",
      label: "파일 열기",
      shortcut: ["Mod", "O"],
      onSelect: () => setLastAction("파일 열기"),
    },
    {
      id: "save",
      label: "저장",
      shortcut: ["Mod", "S"],
      onSelect: () => setLastAction("저장"),
    },
    {
      id: "save-as",
      label: "다른 이름으로 저장",
      shortcut: ["Mod", "Shift", "S"],
      onSelect: () => setLastAction("다른 이름으로 저장"),
    },
    {
      id: "find",
      label: "찾기",
      shortcut: ["Mod", "F"],
      onSelect: () => setLastAction("찾기"),
    },
    {
      id: "replace",
      label: "바꾸기",
      shortcut: ["Mod", "H"],
      onSelect: () => setLastAction("바꾸기"),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button onClick={() => setOpen(true)}>Shortcuts 열기</Button>
        <span className="text-sm text-gray-500">
          커스텀 trigger: Ctrl+Shift+P
        </span>
      </div>
      {lastAction && (
        <p className="text-sm text-gray-600">
          마지막 선택: <strong>{lastAction}</strong>
        </p>
      )}
      <CommandPalette.Root
        open={open}
        onOpenChange={setOpen}
        shortcut={["Control", "Shift", "p"]}
        items={items}
      >
        <CommandPalette.Input placeholder="명령 검색…" />
        <CommandPalette.List>
          {items.map((item) => (
            <CommandPalette.Item key={item.id} item={item} />
          ))}
        </CommandPalette.List>
        <CommandPalette.Empty />
        <CommandPalette.Footer />
      </CommandPalette.Root>
    </div>
  );
}

export default function CommandPalettePage() {
  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">CommandPalette</h1>
      <p className="text-gray-600 mb-8">
        Cmd+K 스타일 명령 팔레트. 퍼지 검색, 중첩 탐색, 키보드 내비게이션,
        단축키 힌트를 지원합니다.
      </p>

      <Section
        id="basic"
        title="Basic"
        desc="10개 명령 아이템 + 기본 입력/목록/Empty/Footer"
      >
        <Card>
          <BasicDemo />
        </Card>
      </Section>

      <Section
        id="groups"
        title="Groups"
        desc="Navigation / Actions / Help 그룹별 분리"
      >
        <Card>
          <GroupsDemo />
        </Card>
      </Section>

      <Section
        id="nested"
        title="Nested"
        desc="children 아이템 drill-down → Backspace로 상위"
      >
        <Card>
          <NestedDemo />
        </Card>
      </Section>

      <Section
        id="shortcuts"
        title="Shortcuts"
        desc="각 아이템에 단축키 표시 + 커스텀 전역 shortcut (Ctrl+Shift+P)"
      >
        <Card>
          <ShortcutsDemo />
        </Card>
      </Section>
    </div>
  );
}
