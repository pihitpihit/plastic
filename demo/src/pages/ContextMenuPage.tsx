import { useState, type ReactNode } from "react";
import { CodeView, ContextMenu } from "plastic";

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

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      {children}
    </div>
  );
}

function DarkCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-6 rounded-lg border"
      style={{ background: "#0b0c10", borderColor: "#23262d" }}
    >
      {children}
    </div>
  );
}

function Surface({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex items-center justify-center text-gray-500 text-sm"
      style={{
        height: 160,
        background: "#f5f7fb",
        borderRadius: 8,
        border: "1px dashed #cbd5e1",
        userSelect: "none",
      }}
    >
      {children}
    </div>
  );
}

function BasicSection() {
  const [last, setLast] = useState<string>("(none)");
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3">last action: <code>{last}</code></p>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Surface>우클릭 / 길게터치</Surface>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={() => setLast("Cut")}>
            Cut <ContextMenu.Shortcut>⌘X</ContextMenu.Shortcut>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => setLast("Copy")}>
            Copy <ContextMenu.Shortcut>⌘C</ContextMenu.Shortcut>
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => setLast("Paste")}>
            Paste <ContextMenu.Shortcut>⌘V</ContextMenu.Shortcut>
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item disabled>Disabled item</ContextMenu.Item>
          <ContextMenu.Item onSelect={() => setLast("Delete")} data-danger="true">
            Delete <ContextMenu.Shortcut>⌫</ContextMenu.Shortcut>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </Card>
  );
}

function CheckboxRadioSection() {
  const [bookmarks, setBookmarks] = useState(true);
  const [urls, setUrls] = useState(false);
  const [person, setPerson] = useState("colm");
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3">
        bookmarks: <code>{String(bookmarks)}</code>, urls: <code>{String(urls)}</code>, person: <code>{person}</code>
      </p>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Surface>checkbox / radio 항목 포함 메뉴</Surface>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Label>Appearance</ContextMenu.Label>
          <ContextMenu.CheckboxItem
            checked={bookmarks}
            onCheckedChange={setBookmarks}
          >
            Show Bookmarks
          </ContextMenu.CheckboxItem>
          <ContextMenu.CheckboxItem checked={urls} onCheckedChange={setUrls}>
            Show Full URLs
          </ContextMenu.CheckboxItem>
          <ContextMenu.Separator />
          <ContextMenu.Label>People</ContextMenu.Label>
          <ContextMenu.RadioGroup value={person} onValueChange={setPerson}>
            <ContextMenu.RadioItem value="colm">Colm</ContextMenu.RadioItem>
            <ContextMenu.RadioItem value="amy">Amy</ContextMenu.RadioItem>
            <ContextMenu.RadioItem value="dee">Dee</ContextMenu.RadioItem>
          </ContextMenu.RadioGroup>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </Card>
  );
}

function SubmenuSection() {
  const [last, setLast] = useState("(none)");
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3">last: <code>{last}</code></p>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Surface>서브메뉴 (호버 / →)</Surface>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={() => setLast("New File")}>
            New File
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => setLast("Open")}>
            Open…
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger>More Tools</ContextMenu.SubTrigger>
            <ContextMenu.SubContent>
              <ContextMenu.Item onSelect={() => setLast("Save Page As")}>
                Save Page As… <ContextMenu.Shortcut>⌘S</ContextMenu.Shortcut>
              </ContextMenu.Item>
              <ContextMenu.Item onSelect={() => setLast("Create Shortcut")}>
                Create Shortcut…
              </ContextMenu.Item>
              <ContextMenu.Item onSelect={() => setLast("Name Window")}>
                Name Window…
              </ContextMenu.Item>
              <ContextMenu.Separator />
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger>Developer</ContextMenu.SubTrigger>
                <ContextMenu.SubContent>
                  <ContextMenu.Item onSelect={() => setLast("View Source")}>
                    View Source
                  </ContextMenu.Item>
                  <ContextMenu.Item onSelect={() => setLast("Inspect")}>
                    Inspect
                  </ContextMenu.Item>
                </ContextMenu.SubContent>
              </ContextMenu.Sub>
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
          <ContextMenu.Separator />
          <ContextMenu.Item onSelect={() => setLast("Print")}>
            Print… <ContextMenu.Shortcut>⌘P</ContextMenu.Shortcut>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </Card>
  );
}

function ControlledSection() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => {
            setPos({ x: 200, y: 200 });
            setOpen(true);
          }}
          className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
        >
          Open at (200,200)
        </button>
        <span className="text-xs text-gray-500">
          open: <code>{String(open)}</code>
        </span>
      </div>
      <ContextMenu.Root
        open={open}
        onOpenChange={setOpen}
        {...(pos !== null ? { position: pos } : {})}
      >
        <ContextMenu.Trigger>
          <Surface>controlled — 버튼 클릭 또는 우클릭</Surface>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item onSelect={() => setOpen(false)}>
            Close
          </ContextMenu.Item>
          <ContextMenu.Item>Action 1</ContextMenu.Item>
          <ContextMenu.Item>Action 2</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </Card>
  );
}

function DisabledSection() {
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3">
        disabled — 우클릭이 무시되고 브라우저 기본 메뉴가 뜸.
      </p>
      <ContextMenu.Root disabled>
        <ContextMenu.Trigger>
          <Surface>disabled trigger</Surface>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Item>(never shown)</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </Card>
  );
}

function DarkSection() {
  return (
    <DarkCard>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div
            className="flex items-center justify-center text-sm"
            style={{
              height: 160,
              color: "#94a3b8",
              background: "#11141a",
              borderRadius: 8,
              border: "1px dashed #334155",
              userSelect: "none",
            }}
          >
            우클릭 (dark theme)
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Content theme="dark">
          <ContextMenu.Label>Edit</ContextMenu.Label>
          <ContextMenu.Item>Undo <ContextMenu.Shortcut>⌘Z</ContextMenu.Shortcut></ContextMenu.Item>
          <ContextMenu.Item>Redo <ContextMenu.Shortcut>⇧⌘Z</ContextMenu.Shortcut></ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Sub>
            <ContextMenu.SubTrigger>Find</ContextMenu.SubTrigger>
            <ContextMenu.SubContent>
              <ContextMenu.Item>Find in Page…</ContextMenu.Item>
              <ContextMenu.Item>Replace…</ContextMenu.Item>
            </ContextMenu.SubContent>
          </ContextMenu.Sub>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </DarkCard>
  );
}

const USAGE_BASIC = `import { ContextMenu } from "plastic";

<ContextMenu.Root>
  <ContextMenu.Trigger>
    <div>우클릭 영역</div>
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onSelect={() => copy()}>
      Copy <ContextMenu.Shortcut>⌘C</ContextMenu.Shortcut>
    </ContextMenu.Item>
    <ContextMenu.Separator />
    <ContextMenu.Item data-danger="true" onSelect={() => del()}>
      Delete
    </ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>`;

const USAGE_CHECKBOX = `<ContextMenu.CheckboxItem
  checked={value}
  onCheckedChange={setValue}
>
  Show Bookmarks
</ContextMenu.CheckboxItem>

<ContextMenu.RadioGroup value={person} onValueChange={setPerson}>
  <ContextMenu.RadioItem value="colm">Colm</ContextMenu.RadioItem>
  <ContextMenu.RadioItem value="amy">Amy</ContextMenu.RadioItem>
</ContextMenu.RadioGroup>`;

const USAGE_SUBMENU = `<ContextMenu.Sub>
  <ContextMenu.SubTrigger>More Tools</ContextMenu.SubTrigger>
  <ContextMenu.SubContent>
    <ContextMenu.Item>Save Page As…</ContextMenu.Item>
  </ContextMenu.SubContent>
</ContextMenu.Sub>`;

export default function ContextMenuPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ContextMenu</h1>
        <p className="text-sm text-gray-500">
          우클릭/길게터치/Shift+F10으로 띄우는 컨텍스트 메뉴. checkbox/radio,
          다단 서브메뉴(safe-triangle 호버), 키보드 내비게이션, controlled,
          dark theme 지원.
        </p>
      </header>

      <Section id="basic" title="Basic">
        <BasicSection />
      </Section>

      <Section id="checkbox-radio" title="Checkbox / Radio">
        <CheckboxRadioSection />
      </Section>

      <Section
        id="submenu"
        title="Submenu"
        desc="다단 중첩. 호버 후 100ms 열림, safe-triangle로 대각 이동 허용."
      >
        <SubmenuSection />
      </Section>

      <Section id="controlled" title="Controlled">
        <ControlledSection />
      </Section>

      <Section id="disabled" title="Disabled">
        <DisabledSection />
      </Section>

      <Section id="dark" title="Dark Theme">
        <DarkSection />
      </Section>

      <Section id="usage" title="Usage">
        <div className="space-y-4">
          <Card>
            <p className="text-xs text-gray-500 mb-2">Basic</p>
            <CodeView
              code={USAGE_BASIC}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-2">Checkbox / Radio</p>
            <CodeView
              code={USAGE_CHECKBOX}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-2">Submenu</p>
            <CodeView
              code={USAGE_SUBMENU}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
        </div>
      </Section>
    </div>
  );
}
