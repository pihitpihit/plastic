import { useMemo, useState } from "react";
import { DataTable, CodeView } from "plastic";
import type { ColumnDef, SelectionState } from "plastic";

// ── Section 헬퍼 ─────────────────────────────────────────────────────────
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

// ── 데이터 타입 ──────────────────────────────────────────────────────────
interface Person {
  id: number;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  createdAt: string;
  score: number;
}

function createPeople(n: number): Person[] {
  const roles: Person["role"][] = ["admin", "editor", "viewer"];
  const names = [
    "Alice",
    "Bob",
    "Charlie",
    "Diana",
    "Eve",
    "Frank",
    "Grace",
    "Heidi",
    "Ivan",
    "Judy",
  ];
  return Array.from({ length: n }).map((_, i) => ({
    id: i + 1,
    name: `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
    email: `user${i + 1}@example.com`,
    role: roles[i % roles.length]!,
    createdAt: new Date(2024, i % 12, (i % 27) + 1).toISOString().slice(0, 10),
    score: (i * 37) % 100,
  }));
}

// ── Section 1: Basic ─────────────────────────────────────────────────────
function BasicDemo() {
  const data = useMemo(() => createPeople(10), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "id", header: "ID", cell: (r) => r.id, width: 60, align: "right" },
      { key: "name", header: "Name", cell: (r) => r.name, width: 160 },
      { key: "email", header: "Email", cell: (r) => r.email, width: 220 },
      { key: "role", header: "Role", cell: (r) => r.role, width: 120 },
    ],
    [],
  );
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      <DataTable columns={columns} data={data}>
        <DataTable.Header />
        <DataTable.Body />
      </DataTable>
    </div>
  );
}

// ── Section 2: Sorting ───────────────────────────────────────────────────
function SortingDemo() {
  const data = useMemo(() => createPeople(15), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        cell: (r) => r.id,
        width: 60,
        align: "right",
        sortable: true,
      },
      { key: "name", header: "Name", cell: (r) => r.name, width: 160, sortable: true },
      { key: "email", header: "Email", cell: (r) => r.email, width: 220 },
      {
        key: "role",
        header: "Role",
        cell: (r) => r.role,
        width: 120,
        sortable: true,
      },
      {
        key: "score",
        header: "Score",
        cell: (r) => r.score,
        width: 100,
        align: "right",
        sortable: true,
      },
    ],
    [],
  );
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      <DataTable columns={columns} data={data} multiSort>
        <DataTable.Header />
        <DataTable.Body />
      </DataTable>
      <p className="text-xs text-gray-500 px-3 py-2 bg-gray-50 border-t">
        컬럼 헤더 클릭: asc → desc → 해제. Shift 없이도 여러 컬럼 클릭하여
        multi-sort 누적.
      </p>
    </div>
  );
}

// ── Section 3: Filtering ─────────────────────────────────────────────────
function FilteringDemo() {
  const data = useMemo(() => createPeople(30), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "id", header: "ID", cell: (r) => r.id, width: 60, align: "right" },
      {
        key: "name",
        header: "Name",
        cell: (r) => r.name,
        width: 160,
        filterable: true,
      },
      {
        key: "email",
        header: "Email",
        cell: (r) => r.email,
        width: 220,
        filterable: true,
      },
      {
        key: "role",
        header: "Role",
        cell: (r) => r.role,
        width: 120,
        filterable: true,
      },
      { key: "score", header: "Score", cell: (r) => r.score, width: 100, align: "right" },
    ],
    [],
  );
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      <DataTable columns={columns} data={data}>
        <DataTable.Toolbar showGlobalFilter globalFilterPlaceholder="전체 검색..." />
        <DataTable.Header showFilterRow />
        <DataTable.Body />
      </DataTable>
    </div>
  );
}

// ── Section 4: Pagination ────────────────────────────────────────────────
function PaginationDemo() {
  const data = useMemo(() => createPeople(50), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "id", header: "ID", cell: (r) => r.id, width: 60, align: "right", sortable: true },
      { key: "name", header: "Name", cell: (r) => r.name, width: 160, sortable: true },
      { key: "email", header: "Email", cell: (r) => r.email, width: 220 },
      { key: "role", header: "Role", cell: (r) => r.role, width: 120, sortable: true },
      {
        key: "score",
        header: "Score",
        cell: (r) => r.score,
        width: 100,
        align: "right",
        sortable: true,
      },
    ],
    [],
  );
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      <DataTable
        columns={columns}
        data={data}
        defaultPagination={{ page: 1, pageSize: 10 }}
      >
        <DataTable.Header />
        <DataTable.Body />
        <DataTable.Pagination pageSizeOptions={[5, 10, 20, 50]} />
      </DataTable>
    </div>
  );
}

// ── Section 5: Selection ─────────────────────────────────────────────────
function SelectionDemo() {
  const data = useMemo(() => createPeople(12), []);
  const [selected, setSelected] = useState<SelectionState>(
    () => new Set<string | number>(),
  );
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "id", header: "ID", cell: (r) => r.id, width: 60, align: "right" },
      { key: "name", header: "Name", cell: (r) => r.name, width: 160 },
      { key: "email", header: "Email", cell: (r) => r.email, width: 220 },
      { key: "role", header: "Role", cell: (r) => r.role, width: 120 },
    ],
    [],
  );
  return (
    <div className="space-y-2">
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
        <DataTable
          columns={columns}
          data={data}
          selectionMode="multi"
          selectedKeys={selected}
          onSelectionChange={setSelected}
        >
          <DataTable.Toolbar showSelectionCount />
          <DataTable.Header />
          <DataTable.Body />
        </DataTable>
      </div>
      <p className="text-xs text-gray-500">
        선택된 ID: {selected.size === 0 ? "없음" : [...selected].sort().join(", ")}
      </p>
    </div>
  );
}

// ── Section 6: Expandable ────────────────────────────────────────────────
function ExpandableDemo() {
  const data = useMemo(() => createPeople(8), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "name", header: "Name", cell: (r) => r.name, width: 160 },
      { key: "email", header: "Email", cell: (r) => r.email, width: 220 },
      { key: "role", header: "Role", cell: (r) => r.role, width: 120 },
    ],
    [],
  );
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      <DataTable
        columns={columns}
        data={data}
        expandable
        renderExpandedRow={(row) => (
          <div className="space-y-1">
            <div>
              <strong>Score:</strong> {row.score}
            </div>
            <div>
              <strong>Created:</strong> {row.createdAt}
            </div>
            <div className="text-xs text-gray-500">
              이 행의 세부 정보는 renderExpandedRow로 렌더링됩니다.
            </div>
          </div>
        )}
      >
        <DataTable.Header />
        <DataTable.Body />
      </DataTable>
    </div>
  );
}

// ── Section 7: Column Resize ─────────────────────────────────────────────
function ResizeDemo() {
  const data = useMemo(() => createPeople(10), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        cell: (r) => r.id,
        width: 80,
        minWidth: 60,
        maxWidth: 140,
        align: "right",
        resizable: true,
      },
      {
        key: "name",
        header: "Name",
        cell: (r) => r.name,
        width: 160,
        minWidth: 100,
        resizable: true,
      },
      {
        key: "email",
        header: "Email",
        cell: (r) => r.email,
        width: 220,
        minWidth: 120,
        resizable: true,
      },
      {
        key: "role",
        header: "Role",
        cell: (r) => r.role,
        width: 120,
        minWidth: 80,
        resizable: true,
      },
    ],
    [],
  );
  return (
    <div className="space-y-2">
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
        <DataTable columns={columns} data={data}>
          <DataTable.Header />
          <DataTable.Body />
        </DataTable>
      </div>
      <p className="text-xs text-gray-500">
        컬럼 헤더 우측 4px 영역을 드래그해서 너비 조정 (min/max 범위 clamp).
      </p>
    </div>
  );
}

// ── Section 8: Column Pinning ────────────────────────────────────────────
function PinningDemo() {
  const data = useMemo(() => createPeople(15), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      {
        key: "id",
        header: "ID",
        cell: (r) => r.id,
        width: 60,
        align: "right",
        pinned: "left",
      },
      { key: "name", header: "Name", cell: (r) => r.name, width: 160 },
      { key: "email", header: "Email", cell: (r) => r.email, width: 260 },
      { key: "role", header: "Role", cell: (r) => r.role, width: 140 },
      { key: "createdAt", header: "Created", cell: (r) => r.createdAt, width: 140 },
      {
        key: "score",
        header: "Score",
        cell: (r) => r.score,
        width: 100,
        align: "right",
        pinned: "right",
      },
    ],
    [],
  );
  return (
    <div className="space-y-2">
      <div
        className="border border-gray-200 rounded-md bg-white"
        style={{ overflowX: "auto" }}
      >
        <DataTable columns={columns} data={data}>
          <DataTable.Header />
          <DataTable.Body />
        </DataTable>
      </div>
      <p className="text-xs text-gray-500">
        ID 컬럼은 좌측 고정, Score 컬럼은 우측 고정. 가로 스크롤 시 sticky.
      </p>
    </div>
  );
}

// ── Section 9: Virtual Scroll ────────────────────────────────────────────
function VirtualDemo() {
  const data = useMemo(() => createPeople(10000), []);
  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "id", header: "ID", cell: (r) => r.id, width: 80, align: "right" },
      { key: "name", header: "Name", cell: (r) => r.name, width: 180 },
      { key: "email", header: "Email", cell: (r) => r.email, width: 240 },
      { key: "role", header: "Role", cell: (r) => r.role, width: 120 },
      {
        key: "score",
        header: "Score",
        cell: (r) => r.score,
        width: 100,
        align: "right",
      },
    ],
    [],
  );
  return (
    <div className="space-y-2">
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
        <DataTable
          columns={columns}
          data={data}
          virtualScroll
          rowHeight={36}
          height={400}
        >
          <DataTable.Header />
          <DataTable.Body />
        </DataTable>
      </div>
      <p className="text-xs text-gray-500">
        10,000행 더미 데이터, virtualScroll=true, rowHeight=36, height=400.
        현재 뷰포트에 보이는 행만 렌더링.
      </p>
    </div>
  );
}

// ── Section 10: Custom Cell ──────────────────────────────────────────────
function CustomCellDemo() {
  const data = useMemo(() => createPeople(8), []);

  const roleBadge = (role: Person["role"]) => {
    const colors: Record<Person["role"], string> = {
      admin: "bg-red-100 text-red-700",
      editor: "bg-blue-100 text-blue-700",
      viewer: "bg-gray-100 text-gray-700",
    };
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[role]}`}
      >
        {role}
      </span>
    );
  };

  const scoreBar = (score: number) => (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs tabular-nums">{score}</span>
    </div>
  );

  const avatar = (name: string) => {
    const initials = name
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2);
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
          {initials}
        </div>
        <span>{name}</span>
      </div>
    );
  };

  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "id", header: "ID", cell: (r) => r.id, width: 60, align: "right" },
      {
        key: "name",
        header: "Name",
        cell: (r) => avatar(r.name),
        width: 200,
      },
      {
        key: "role",
        header: "Role",
        cell: (r) => roleBadge(r.role),
        width: 120,
        align: "center",
      },
      {
        key: "score",
        header: "Score",
        cell: (r) => scoreBar(r.score),
        width: 180,
      },
      {
        key: "actions",
        header: "Actions",
        cell: () => (
          <button
            type="button"
            className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
            onClick={(e) => {
              e.stopPropagation();
              alert("Edit clicked");
            }}
          >
            Edit
          </button>
        ),
        width: 100,
        align: "center",
      },
    ],
    [],
  );
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      <DataTable columns={columns} data={data}>
        <DataTable.Header />
        <DataTable.Body />
      </DataTable>
    </div>
  );
}

// ── Section: Props ───────────────────────────────────────────────────────
function PropRow({
  name,
  type,
  def,
  desc,
}: {
  name: string;
  type: string;
  def?: string;
  desc: string;
}) {
  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="py-1.5 pr-3 font-mono text-xs text-gray-900">{name}</td>
      <td className="py-1.5 pr-3 font-mono text-xs text-blue-700">{type}</td>
      <td className="py-1.5 pr-3 font-mono text-xs text-gray-500">
        {def ?? "—"}
      </td>
      <td className="py-1.5 text-xs text-gray-600">{desc}</td>
    </tr>
  );
}

function PropsTable({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; type: string; def?: string; desc: string }[];
}) {
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      <div className="px-3 py-1.5 bg-gray-50 border-b text-xs font-semibold text-gray-700">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-400">
            <th className="py-1.5 px-3">Prop</th>
            <th className="py-1.5 px-3">Type</th>
            <th className="py-1.5 px-3">Default</th>
            <th className="py-1.5 px-3">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <PropRow key={r.name} {...r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PropsSection() {
  const rootRows = [
    { name: "columns", type: "ColumnDef<T>[]", desc: "컬럼 정의 배열 (필수)" },
    { name: "data", type: "T[]", desc: "행 데이터 배열 (필수)" },
    { name: "rowKey", type: "(row, i) => string | number", def: "row.id ?? i", desc: "행 고유 키" },
    { name: "defaultSortState", type: "SortState", def: "[]", desc: "초기 정렬 상태" },
    { name: "multiSort", type: "boolean", def: "false", desc: "다중 정렬 허용" },
    { name: "defaultPagination", type: "PaginationState", def: "null", desc: "초기 페이지 상태" },
    { name: "selectionMode", type: "'none' | 'single' | 'multi'", def: "'none'", desc: "선택 모드" },
    { name: "expandable", type: "boolean", def: "false", desc: "행 확장 가능 여부" },
    { name: "renderExpandedRow", type: "(row, i) => ReactNode", desc: "확장 행 렌더" },
    { name: "virtualScroll", type: "boolean", def: "false", desc: "가상 스크롤 활성화" },
    { name: "rowHeight", type: "number", def: "40", desc: "행 높이 (virtual 필수)" },
    { name: "height", type: "number", def: "400", desc: "스크롤 컨테이너 최대 높이" },
    { name: "stickyHeader", type: "boolean", def: "true", desc: "헤더 고정" },
    { name: "alternatingRows", type: "boolean", def: "false", desc: "교대 행 색상" },
    { name: "loading", type: "boolean", def: "false", desc: "로딩 상태" },
    { name: "theme", type: "'light' | 'dark'", def: "'light'", desc: "테마" },
  ];
  const colRows = [
    { name: "key", type: "string", desc: "컬럼 고유 키 (필수)" },
    { name: "header", type: "string | ReactNode | (ctx) => ReactNode", desc: "헤더 렌더" },
    { name: "cell", type: "(row, i) => ReactNode", desc: "셀 렌더 (필수)" },
    { name: "width", type: "number | string", desc: "컬럼 너비" },
    { name: "minWidth / maxWidth", type: "number", desc: "리사이즈 clamp 범위" },
    { name: "sortable", type: "boolean", def: "false", desc: "정렬 가능 여부" },
    { name: "filterable", type: "boolean", def: "false", desc: "필터 가능 여부" },
    { name: "pinned", type: "'left' | 'right'", desc: "컬럼 고정" },
    { name: "resizable", type: "boolean", def: "false", desc: "리사이즈 가능 여부" },
    { name: "align", type: "'left' | 'center' | 'right'", def: "'left'", desc: "셀 정렬" },
  ];
  const toolbarRows = [
    { name: "showGlobalFilter", type: "boolean", def: "true", desc: "글로벌 검색 표시" },
    { name: "globalFilterPlaceholder", type: "string", def: "'Search...'", desc: "검색 placeholder" },
    { name: "showColumnToggle", type: "boolean", def: "false", desc: "컬럼 가시성 드롭다운" },
    { name: "showSelectionCount", type: "boolean", def: "false", desc: "선택 개수 표시" },
    { name: "left / right", type: "ReactNode", desc: "좌/우 슬롯" },
  ];
  const paginationRows = [
    { name: "showPageSizeOptions", type: "boolean", def: "true", desc: "pageSize select 표시" },
    { name: "pageSizeOptions", type: "number[]", def: "[10,20,50,100]", desc: "pageSize 옵션" },
    { name: "showTotal", type: "boolean", def: "true", desc: "'X-Y of Z' 표시" },
    { name: "siblingCount", type: "number", def: "1", desc: "현재 페이지 주변 표시 수" },
  ];
  return (
    <div className="space-y-4">
      <PropsTable title="DataTable (Root)" rows={rootRows} />
      <PropsTable title="ColumnDef<T>" rows={colRows} />
      <PropsTable title="DataTable.Toolbar" rows={toolbarRows} />
      <PropsTable title="DataTable.Pagination" rows={paginationRows} />
    </div>
  );
}

// ── Section: Usage ───────────────────────────────────────────────────────
const USAGE_CODE = `import { DataTable } from "plastic";
import type { ColumnDef } from "plastic";

interface User {
  id: number;
  name: string;
  email: string;
}

const columns: ColumnDef<User>[] = [
  { key: "id", header: "ID", cell: (r) => r.id, sortable: true, width: 60 },
  { key: "name", header: "Name", cell: (r) => r.name, sortable: true, filterable: true },
  { key: "email", header: "Email", cell: (r) => r.email, filterable: true },
];

export function UserTable({ users }: { users: User[] }) {
  return (
    <DataTable
      columns={columns}
      data={users}
      selectionMode="multi"
      defaultPagination={{ page: 1, pageSize: 20 }}
    >
      <DataTable.Toolbar showGlobalFilter showSelectionCount />
      <DataTable.Header showFilterRow />
      <DataTable.Body />
      <DataTable.Pagination />
    </DataTable>
  );
}`;

function UsageSection() {
  return <CodeView code={USAGE_CODE} language="tsx" showLineNumbers theme="dark" />;
}

// ── Section: Playground ──────────────────────────────────────────────────
function PlaygroundDemo() {
  const [multiSort, setMultiSort] = useState(true);
  const [selectionMode, setSelectionMode] = useState<"none" | "single" | "multi">("multi");
  const [alternating, setAlternating] = useState(true);
  const [stickyHeader, setStickyHeader] = useState(true);
  const [expandable, setExpandable] = useState(false);
  const [virtualScroll, setVirtualScroll] = useState(false);
  const [rowHeight, setRowHeight] = useState(40);
  const [pageSize, setPageSize] = useState(10);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showPagination, setShowPagination] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const rowCount = virtualScroll ? 5000 : 120;
  const data = useMemo(() => createPeople(rowCount), [rowCount]);

  const columns: ColumnDef<Person>[] = useMemo(
    () => [
      { key: "id", header: "ID", cell: (r) => r.id, width: 70, align: "right", sortable: true },
      { key: "name", header: "Name", cell: (r) => r.name, width: 180, sortable: true, filterable: true },
      { key: "email", header: "Email", cell: (r) => r.email, width: 240, filterable: true },
      { key: "role", header: "Role", cell: (r) => r.role, width: 120, sortable: true, filterable: true },
      { key: "score", header: "Score", cell: (r) => r.score, width: 100, align: "right", sortable: true },
    ],
    [],
  );

  const wrapperBg = theme === "dark" ? "#0f172a" : "#ffffff";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs p-3 bg-gray-50 border border-gray-200 rounded-md">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={multiSort} onChange={(e) => setMultiSort(e.target.checked)} />
          multiSort
        </label>
        <label className="flex items-center gap-2">
          <span>selectionMode</span>
          <select value={selectionMode} onChange={(e) => setSelectionMode(e.target.value as "none" | "single" | "multi")} className="border rounded px-1 py-0.5">
            <option value="none">none</option>
            <option value="single">single</option>
            <option value="multi">multi</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={alternating} onChange={(e) => setAlternating(e.target.checked)} />
          alternatingRows
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={stickyHeader} onChange={(e) => setStickyHeader(e.target.checked)} />
          stickyHeader
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={expandable} onChange={(e) => setExpandable(e.target.checked)} />
          expandable
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={virtualScroll} onChange={(e) => setVirtualScroll(e.target.checked)} />
          virtualScroll
        </label>
        <label className="flex items-center gap-2">
          <span>rowHeight</span>
          <input type="number" value={rowHeight} onChange={(e) => setRowHeight(Number(e.target.value))} className="w-16 border rounded px-1 py-0.5" min={24} max={80} />
        </label>
        <label className="flex items-center gap-2">
          <span>pageSize</span>
          <input type="number" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="w-16 border rounded px-1 py-0.5" min={1} max={100} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showToolbar} onChange={(e) => setShowToolbar(e.target.checked)} />
          Toolbar
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={showPagination} onChange={(e) => setShowPagination(e.target.checked)} />
          Pagination
        </label>
        <label className="flex items-center gap-2">
          <span>theme</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")} className="border rounded px-1 py-0.5">
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
      </div>
      <div
        className="border border-gray-200 rounded-md overflow-hidden"
        style={{ background: wrapperBg }}
      >
        <DataTable
          columns={columns}
          data={data}
          multiSort={multiSort}
          selectionMode={selectionMode}
          alternatingRows={alternating}
          stickyHeader={stickyHeader}
          expandable={expandable}
          renderExpandedRow={(row) => (
            <div className="text-xs">상세 (id={row.id}): {row.email}</div>
          )}
          virtualScroll={virtualScroll}
          rowHeight={rowHeight}
          height={virtualScroll ? 400 : 500}
          defaultPagination={showPagination ? { page: 1, pageSize } : undefined}
          theme={theme}
        >
          {showToolbar && (
            <DataTable.Toolbar
              showGlobalFilter
              showColumnToggle
              showSelectionCount
            />
          )}
          <DataTable.Header showFilterRow />
          <DataTable.Body />
          {showPagination && <DataTable.Pagination />}
        </DataTable>
      </div>
    </div>
  );
}

// ── 페이지 ───────────────────────────────────────────────────────────────
export default function DataTablePage() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-10">
      <header className="pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">DataTable</h1>
        <p className="text-sm text-gray-500 mt-1">
          정렬 / 필터 / 페이지네이션 / 선택 / 가상 스크롤을 지원하는 고성능
          테이블.
        </p>
      </header>

      <Section id="basic" title="Basic" desc="기본 테이블 렌더링">
        <BasicDemo />
      </Section>

      <Section
        id="sorting"
        title="Sorting"
        desc="sortable 컬럼 헤더 클릭, multiSort=true로 다중 정렬"
      >
        <SortingDemo />
      </Section>

      <Section
        id="filtering"
        title="Filtering"
        desc="Toolbar 글로벌 검색 + 컬럼별 필터 행 (showFilterRow)"
      >
        <FilteringDemo />
      </Section>

      <Section
        id="pagination"
        title="Pagination"
        desc="50행 데이터, pageSize 10, pageSizeOptions 선택 가능"
      >
        <PaginationDemo />
      </Section>

      <Section
        id="selection"
        title="Selection"
        desc="selectionMode='multi' + Toolbar showSelectionCount, controlled"
      >
        <SelectionDemo />
      </Section>

      <Section
        id="expandable"
        title="Expandable"
        desc="expandable=true, 화살표 클릭으로 renderExpandedRow 토글"
      >
        <ExpandableDemo />
      </Section>

      <Section
        id="resize"
        title="Column Resize"
        desc="resizable=true 컬럼의 우측 핸들을 드래그해서 너비 조정"
      >
        <ResizeDemo />
      </Section>

      <Section
        id="pinning"
        title="Column Pinning"
        desc="pinned: 'left' | 'right', 가로 스크롤 시 sticky"
      >
        <PinningDemo />
      </Section>

      <Section
        id="virtual"
        title="Virtual Scroll"
        desc="10,000행 데이터, virtualScroll=true + rowHeight로 가시 영역만 렌더"
      >
        <VirtualDemo />
      </Section>

      <Section
        id="custom-cell"
        title="Custom Cell"
        desc="column.cell 함수로 뱃지 / 아바타 / 프로그레스 / 버튼 렌더"
      >
        <CustomCellDemo />
      </Section>

      <Section id="props" title="Props" desc="각 서브 컴포넌트의 prop 레퍼런스">
        <PropsSection />
      </Section>

      <Section id="usage" title="Usage" desc="기본 사용 예제">
        <UsageSection />
      </Section>

      <Section id="playground" title="Playground" desc="인터랙티브로 설정 조합 실험">
        <PlaygroundDemo />
      </Section>
    </div>
  );
}
