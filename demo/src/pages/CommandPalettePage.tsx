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
    </div>
  );
}
