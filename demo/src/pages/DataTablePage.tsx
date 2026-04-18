import { useMemo, useState } from "react";
import { DataTable } from "plastic";
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
    </div>
  );
}
