import { useRef, useState, type ReactNode } from "react";
import { CodeView, Tree } from "plastic";
import type { TreeNode, TreeRootHandle } from "plastic";

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
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      {children}
    </div>
  );
}

function DarkCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{ background: "#0b0c10", borderColor: "#23262d" }}
    >
      {children}
    </div>
  );
}

const FILE_TREE: TreeNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      {
        id: "src/components",
        label: "components",
        children: [
          { id: "src/components/Button.tsx", label: "Button.tsx" },
          { id: "src/components/Card.tsx", label: "Card.tsx" },
          { id: "src/components/Tree.tsx", label: "Tree.tsx" },
        ],
      },
      {
        id: "src/utils",
        label: "utils",
        children: [
          { id: "src/utils/format.ts", label: "format.ts" },
          { id: "src/utils/parse.ts", label: "parse.ts" },
        ],
      },
      { id: "src/index.ts", label: "index.ts" },
    ],
  },
  {
    id: "public",
    label: "public",
    children: [
      { id: "public/index.html", label: "index.html" },
      { id: "public/favicon.ico", label: "favicon.ico" },
    ],
  },
  { id: "package.json", label: "package.json" },
  { id: "README.md", label: "README.md", disabled: true },
];

function BasicSection() {
  return (
    <Card>
      <Tree.Root data={FILE_TREE} defaultExpanded={new Set(["src"])} />
    </Card>
  );
}

function SelectionSection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(["src/index.ts"]),
  );
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-2">
        selected: <code>{Array.from(selected).join(", ") || "(none)"}</code>
      </p>
      <Tree.Root
        data={FILE_TREE}
        defaultExpanded={new Set(["src", "src/utils"])}
        selectionMode="single"
        selected={selected}
        onSelectedChange={setSelected}
      />
    </Card>
  );
}

function MultiSection() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-2">
        Cmd/Ctrl-click 다중 / Shift-click 범위. selected.size:{" "}
        <code>{selected.size}</code>
      </p>
      <Tree.Root
        data={FILE_TREE}
        defaultExpanded={new Set(["src", "src/components", "src/utils"])}
        selectionMode="multiple"
        selected={selected}
        onSelectedChange={setSelected}
      />
    </Card>
  );
}

function CheckboxSection() {
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-2">
        cascade: parent-child + indeterminate. checked.size:{" "}
        <code>{checked.size}</code>
      </p>
      <Tree.Root
        data={FILE_TREE}
        defaultExpanded={new Set(["src", "src/components"])}
        checkable
        checked={checked}
        onCheckedChange={setChecked}
      />
    </Card>
  );
}

function AsyncSection() {
  const data: TreeNode[] = [
    { id: "remote", label: "remote://", hasChildren: true },
    { id: "local", label: "local://", hasChildren: true },
  ];
  const loadChildren = async (n: TreeNode): Promise<TreeNode[]> => {
    await new Promise((r) => setTimeout(r, 800));
    return [
      { id: `${n.id}/a.txt`, label: "a.txt" },
      { id: `${n.id}/b.txt`, label: "b.txt" },
      { id: `${n.id}/sub`, label: "sub", hasChildren: true },
    ];
  };
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-2">
        펼치면 800ms 지연 후 자식 로딩 (loadChildren).
      </p>
      <Tree.Root data={data} loadChildren={loadChildren} />
    </Card>
  );
}

function ImperativeSection() {
  const ref = useRef<TreeRootHandle | null>(null);
  return (
    <Card>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => ref.current?.expandAll()}
          className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
        >
          expandAll()
        </button>
        <button
          onClick={() => ref.current?.collapseAll()}
          className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
        >
          collapseAll()
        </button>
        <button
          onClick={() => ref.current?.expandTo("src/utils/parse.ts")}
          className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
        >
          expandTo("parse.ts")
        </button>
        <button
          onClick={() => ref.current?.focus()}
          className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
        >
          focus()
        </button>
      </div>
      <Tree.Root ref={ref} data={FILE_TREE} />
    </Card>
  );
}

function CustomRenderSection() {
  return (
    <Card>
      <Tree.Root
        data={FILE_TREE}
        defaultExpanded={new Set(["src"])}
        showIndentGuides
        renderNode={({ node, hasChildren, isExpanded }) => (
          <>
            <Tree.ExpandToggle />
            <span style={{ width: 14, display: "inline-flex" }}>
              {hasChildren ? (isExpanded ? "📂" : "📁") : "📄"}
            </span>
            <Tree.Label>{node.label}</Tree.Label>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{node.id}</span>
          </>
        )}
      />
    </Card>
  );
}

function DarkSection() {
  return (
    <DarkCard>
      <Tree.Root
        data={FILE_TREE}
        defaultExpanded={new Set(["src", "src/components"])}
        selectionMode="single"
        theme="dark"
        showIndentGuides
      />
    </DarkCard>
  );
}

const USAGE_BASIC = `import { Tree } from "plastic";

const data = [
  { id: "src", label: "src", children: [
    { id: "src/index.ts", label: "index.ts" },
  ]},
];

<Tree.Root data={data} defaultExpanded={new Set(["src"])} />`;

const USAGE_SELECT = `<Tree.Root
  data={data}
  selectionMode="single"
  selected={selected}
  onSelectedChange={setSelected}
/>`;

const USAGE_CHECK = `<Tree.Root
  data={data}
  checkable
  checkCascade="parent-child"
  checked={checked}
  onCheckedChange={setChecked}
/>`;

const USAGE_ASYNC = `<Tree.Root
  data={[{ id: "root", label: "Remote", hasChildren: true }]}
  loadChildren={async (node) => fetchChildren(node.id)}
/>`;

export default function TreePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tree</h1>
        <p className="text-sm text-gray-500">
          계층적 트리 — flatten + Set 상태 모델. 확장/선택/체크(indeterminate
          포함), async lazy load, 키보드 내비게이션, 커스텀 렌더, light/dark
          theme.
        </p>
      </header>

      <Section id="basic" title="Basic">
        <BasicSection />
      </Section>

      <Section
        id="single"
        title="Single Select"
        desc="selectionMode='single' + controlled."
      >
        <SelectionSection />
      </Section>

      <Section
        id="multiple"
        title="Multiple Select"
        desc="selectionMode='multiple' — Cmd/Ctrl/Shift modifier 지원."
      >
        <MultiSection />
      </Section>

      <Section id="checkbox" title="Checkbox + Cascade">
        <CheckboxSection />
      </Section>

      <Section id="async" title="Async loadChildren">
        <AsyncSection />
      </Section>

      <Section id="imperative" title="Imperative Handle">
        <ImperativeSection />
      </Section>

      <Section id="custom-render" title="Custom Render + Indent guides">
        <CustomRenderSection />
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
            <p className="text-xs text-gray-500 mb-2">Selection</p>
            <CodeView
              code={USAGE_SELECT}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-2">Checkbox cascade</p>
            <CodeView
              code={USAGE_CHECK}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-2">Async</p>
            <CodeView
              code={USAGE_ASYNC}
              language="tsx"
              showLineNumbers={false}
            />
          </Card>
        </div>
      </Section>
    </div>
  );
}
