# DataTable 컴포넌트 설계문서

## Context

plastic 라이브러리에 6번째 컴포넌트 `DataTable`을 추가한다.
컬럼 정의(column definition) 기반의 데이터 테이블로, 정렬, 필터링, 페이지네이션, 행 선택, 컬럼 리사이즈, 컬럼 고정, 가상 스크롤, 행 확장 등 풍부한 기능을 제공한다.

ag-grid / TanStack Table과 유사하게 **설정 객체 기반** 접근법을 사용한다.
compound component 패턴이 아닌, 단일 `<DataTable>` 진입점에 `columns` + `data` props를 전달하는 방식이다.
다만 `DataTable.Toolbar`와 `DataTable.Pagination`은 compound sub-component로 제공하여 레이아웃 커스터마이징을 허용한다.

### 왜 config-driven인가

테이블은 행 × 열 그리드 구조상 JSX 중첩보다 배열 기반 정의가 자연스럽다.
`columns` 배열로 렌더링·정렬·필터 로직을 선언하고, `data` 배열로 행 데이터를 전달하면 내부에서 thead/tbody를 자동 생성한다.
Toolbar와 Pagination만 compound으로 분리하여 테이블 외부 UI를 소비자가 제어할 수 있게 한다.

---

## Component 구조

```
DataTable/
  DataTable.types.ts          모든 타입 정의
  DataTableContext.ts          Context 정의
  DataTableRoot.tsx            메인 테이블 렌더 + 상태 관리
  DataTableHeader.tsx          thead 렌더 (정렬 UI, 리사이즈 핸들)
  DataTableBody.tsx            tbody 렌더 (가상 스크롤 적용)
  DataTableRow.tsx             단일 행 렌더 (선택, 확장 포함)
  DataTablePagination.tsx      페이지네이션 UI
  DataTableToolbar.tsx         툴바 (글로벌 검색, 컬럼 토글)
  DataTableEmpty.tsx           빈 상태 UI
  DataTableLoading.tsx         로딩 상태 UI
  useVirtualList.ts            가상 스크롤 훅
  useColumnResize.ts           컬럼 리사이즈 훅
  DataTable.tsx                Object.assign 조립
  index.ts                     배럴 export
```

### 조립 (DataTable.tsx)

```typescript
import { DataTableRoot } from "./DataTableRoot";
import { DataTableToolbar } from "./DataTableToolbar";
import { DataTablePagination } from "./DataTablePagination";

export const DataTable = Object.assign(DataTableRoot, {
  Root: DataTableRoot,
  Toolbar: DataTableToolbar,
  Pagination: DataTablePagination,
});
```

---

## 사용 패턴

### 기본 테이블

```tsx
import { DataTable } from "plastic";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const columns: ColumnDef<User>[] = [
  { key: "name", header: "이름", cell: (row) => row.name, sortable: true },
  { key: "email", header: "이메일", cell: (row) => row.email },
  { key: "role", header: "역할", cell: (row) => row.role, sortable: true },
];

<DataTable columns={columns} data={users} />
```

### 정렬 (제어)

```tsx
const [sortState, setSortState] = useState<SortState>([
  { key: "name", direction: "asc" },
]);

<DataTable
  columns={columns}
  data={users}
  sortState={sortState}
  onSortChange={setSortState}
/>
```

### 필터링

```tsx
<DataTable
  columns={columns}
  data={users}
  globalFilter={searchText}
  onGlobalFilterChange={setSearchText}
  globalFilterDebounce={300}
/>
```

### 페이지네이션

```tsx
<DataTable
  columns={columns}
  data={users}
  pagination={{ pageSize: 10, page: 0 }}
  onPaginationChange={setPagination}
>
  <DataTable.Pagination />
</DataTable>
```

### 행 선택

```tsx
<DataTable
  columns={columns}
  data={users}
  selectionMode="multi"
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  rowKey={(row) => row.id}
/>
```

### 가상 스크롤

```tsx
<DataTable
  columns={columns}
  data={bigData}      // 10,000+ rows
  virtualScroll
  height={600}
  rowHeight={40}
/>
```

### 행 확장

```tsx
<DataTable
  columns={columns}
  data={users}
  expandable
  renderExpandedRow={(row) => (
    <div style={{ padding: "12px 16px" }}>
      <p>상세 정보: {row.email}</p>
    </div>
  )}
/>
```

### 컬럼 고정

```tsx
const columns: ColumnDef<User>[] = [
  { key: "name", header: "이름", cell: (row) => row.name, pinned: "left", width: 150 },
  { key: "email", header: "이메일", cell: (row) => row.email },
  { key: "role", header: "역할", cell: (row) => row.role },
  { key: "actions", header: "", cell: (row) => <button>편집</button>, pinned: "right", width: 80 },
];
```

### Toolbar + Pagination compound

```tsx
<DataTable columns={columns} data={users} pagination={{ pageSize: 10, page: 0 }}>
  <DataTable.Toolbar
    showGlobalFilter
    showColumnToggle
  />
  <DataTable.Pagination showPageSizeOptions pageSizeOptions={[10, 25, 50, 100]} />
</DataTable>
```

### 다크 테마

```tsx
<DataTable columns={columns} data={users} theme="dark" />
```

### 모든 기능 조합

```tsx
<DataTable
  columns={columns}
  data={users}
  theme="light"
  rowKey={(row) => row.id}
  sortState={sortState}
  onSortChange={setSortState}
  globalFilter={search}
  onGlobalFilterChange={setSearch}
  pagination={pagination}
  onPaginationChange={setPagination}
  selectionMode="multi"
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  expandable
  renderExpandedRow={(row) => <Detail user={row} />}
  alternatingRows
  stickyHeader
  height={500}
  emptyState={<p>데이터가 없습니다.</p>}
  loading={isLoading}
>
  <DataTable.Toolbar showGlobalFilter showColumnToggle />
  <DataTable.Pagination showPageSizeOptions />
</DataTable>
```

---

## TypeScript 인터페이스

### ColumnDef

```typescript
export interface HeaderContext<T = unknown> {
  column: ColumnDef<T>;
  sortDirection: SortDirection | undefined;
  toggleSort: () => void;
}

export type SortDirection = "asc" | "desc";

export interface ColumnDef<T> {
  /** 고유 컬럼 식별자. data 객체의 key와 일치할 필요 없음 (cell 함수가 추출 담당) */
  key: string;

  /** 헤더 콘텐츠. 문자열, ReactNode, 또는 HeaderContext 받는 렌더 함수 */
  header: string | React.ReactNode | ((ctx: HeaderContext<T>) => React.ReactNode);

  /** 셀 렌더 함수 */
  cell: (row: T, rowIndex: number) => React.ReactNode;

  /** 컬럼 너비. 숫자(px) 또는 CSS 문자열 ("1fr", "200px", "20%") */
  width?: number | string | undefined;

  /** 최소 너비 (px). 리사이즈 시 이 값 미만으로 줄일 수 없음. 기본값: 50 */
  minWidth?: number | undefined;

  /** 최대 너비 (px). 리사이즈 시 이 값 초과로 늘릴 수 없음 */
  maxWidth?: number | undefined;

  /** 정렬 가능 여부. 기본값: false */
  sortable?: boolean | undefined;

  /** 커스텀 정렬 함수. 반환값: 음수(a 선행), 0(동일), 양수(b 선행) */
  sortFn?: ((a: T, b: T) => number) | undefined;

  /** 필터링 가능 여부. true면 컬럼별 필터 UI 표시. 기본값: false */
  filterable?: boolean | undefined;

  /** 커스텀 필터 함수. filterValue는 해당 컬럼의 필터 입력값 */
  filterFn?: ((row: T, filterValue: string) => boolean) | undefined;

  /** 셀 텍스트 정렬. 기본값: "left" */
  align?: "left" | "center" | "right" | undefined;

  /** 컬럼 고정 방향. 설정 시 스크롤해도 해당 방향에 고정 */
  pinned?: "left" | "right" | undefined;

  /** 리사이즈 가능 여부. 기본값: false */
  resizable?: boolean | undefined;

  /** 컬럼 숨김 여부. true면 렌더 안 함. 기본값: false */
  hidden?: boolean | undefined;

  /** 헤더 셀 className */
  headerClassName?: string | undefined;

  /** 데이터 셀 className */
  cellClassName?: string | undefined;
}
```

### SortState

```typescript
export type SortState = SortItem[];

export interface SortItem {
  key: string;
  direction: SortDirection;
}
```

### FilterState

```typescript
export type FilterState = Record<string, string>;
```

### PaginationState

```typescript
export interface PaginationState {
  /** 현재 페이지 (0-indexed) */
  page: number;
  /** 페이지당 행 수 */
  pageSize: number;
}
```

### SelectionState

```typescript
/** 선택된 행의 key 집합 */
export type SelectionState = Set<string | number>;
```

### DataTableProps

```typescript
export type DataTableTheme = "light" | "dark";

export interface DataTableProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  // ── 필수 ──────────────────────────────────
  /** 컬럼 정의 배열 */
  columns: ColumnDef<T>[];
  /** 행 데이터 배열 */
  data: T[];

  // ── children (Toolbar, Pagination) ─────────
  children?: React.ReactNode | undefined;

  // ── 행 식별 ─────────────────────────────────
  /** 각 행의 고유 키 추출. 기본값: (_, index) => index */
  rowKey?: ((row: T, index: number) => string | number) | undefined;

  // ── 정렬 ──────────────────────────────────
  /** 정렬 상태 (제어 모드) */
  sortState?: SortState | undefined;
  /** 기본 정렬 상태 (비제어 모드) */
  defaultSortState?: SortState | undefined;
  /** 정렬 변경 콜백 */
  onSortChange?: ((state: SortState) => void) | undefined;
  /** 다중 컬럼 정렬 허용. 기본값: false (단일 컬럼 정렬) */
  multiSort?: boolean | undefined;

  // ── 필터링 ────────────────────────────────
  /** 글로벌 필터 값 (제어 모드) */
  globalFilter?: string | undefined;
  /** 기본 글로벌 필터 값 (비제어 모드) */
  defaultGlobalFilter?: string | undefined;
  /** 글로벌 필터 변경 콜백 */
  onGlobalFilterChange?: ((value: string) => void) | undefined;
  /** 글로벌 필터 디바운스 ms. 기본값: 300 */
  globalFilterDebounce?: number | undefined;
  /** 커스텀 글로벌 필터 함수. 미설정 시 모든 컬럼의 cell 반환값을 문자열로 변환해 포함 검사 */
  globalFilterFn?: ((row: T, filterValue: string) => boolean) | undefined;
  /** 컬럼별 필터 상태 (제어 모드) */
  columnFilters?: FilterState | undefined;
  /** 기본 컬럼별 필터 상태 (비제어 모드) */
  defaultColumnFilters?: FilterState | undefined;
  /** 컬럼별 필터 변경 콜백 */
  onColumnFiltersChange?: ((state: FilterState) => void) | undefined;
  /** 컬럼별 필터 디바운스 ms. 기본값: 300 */
  columnFilterDebounce?: number | undefined;

  // ── 페이지네이션 ──────────────────────────
  /** 페이지네이션 상태 (제어 모드). 설정 시 페이지네이션 활성화 */
  pagination?: PaginationState | undefined;
  /** 기본 페이지네이션 상태 (비제어 모드) */
  defaultPagination?: PaginationState | undefined;
  /** 페이지네이션 변경 콜백 */
  onPaginationChange?: ((state: PaginationState) => void) | undefined;

  // ── 행 선택 ───────────────────────────────
  /** 선택 모드. 기본값: "none" */
  selectionMode?: "none" | "single" | "multi" | undefined;
  /** 선택된 키 (제어 모드) */
  selectedKeys?: SelectionState | undefined;
  /** 기본 선택 키 (비제어 모드) */
  defaultSelectedKeys?: SelectionState | undefined;
  /** 선택 변경 콜백 */
  onSelectionChange?: ((keys: SelectionState) => void) | undefined;

  // ── 행 확장 ───────────────────────────────
  /** 행 확장 기능 활성화. 기본값: false */
  expandable?: boolean | undefined;
  /** 확장된 행 콘텐츠 렌더 함수 */
  renderExpandedRow?: ((row: T, index: number) => React.ReactNode) | undefined;
  /** 확장된 행 키 집합 (제어 모드) */
  expandedKeys?: Set<string | number> | undefined;
  /** 기본 확장 키 (비제어 모드) */
  defaultExpandedKeys?: Set<string | number> | undefined;
  /** 확장 변경 콜백 */
  onExpandedChange?: ((keys: Set<string | number>) => void) | undefined;

  // ── 컬럼 가시성 ────────────────────────────
  /** 숨겨진 컬럼 키 집합 (제어 모드) */
  hiddenColumns?: Set<string> | undefined;
  /** 기본 숨겨진 컬럼 (비제어 모드) */
  defaultHiddenColumns?: Set<string> | undefined;
  /** 컬럼 가시성 변경 콜백 */
  onHiddenColumnsChange?: ((keys: Set<string>) => void) | undefined;

  // ── 가상 스크롤 ────────────────────────────
  /** 가상 스크롤 활성화. 기본값: false */
  virtualScroll?: boolean | undefined;
  /** 고정 행 높이 (px). virtualScroll=true 시 필수 */
  rowHeight?: number | undefined;

  // ── 레이아웃 ──────────────────────────────
  /** 테이블 컨테이너 높이 (px). virtualScroll 또는 스크롤 테이블 시 필수 */
  height?: number | undefined;
  /** 헤더 고정 여부. 기본값: true (height 설정 시) */
  stickyHeader?: boolean | undefined;
  /** 홀짝 행 배경색 구분. 기본값: true */
  alternatingRows?: boolean | undefined;

  // ── 상태 ──────────────────────────────────
  /** 로딩 상태. true면 스켈레톤 오버레이 표시 */
  loading?: boolean | undefined;
  /** 스켈레톤 행 수 (loading=true 시). 기본값: 5 */
  loadingRows?: number | undefined;
  /** 빈 상태 커스텀 렌더 */
  emptyState?: React.ReactNode | undefined;

  // ── 테마 ──────────────────────────────────
  /** 라이트/다크 테마. 기본값: "light" */
  theme?: DataTableTheme | undefined;

  // ── 이벤트 ────────────────────────────────
  /** 행 클릭 콜백 */
  onRowClick?: ((row: T, index: number, event: React.MouseEvent) => void) | undefined;
  /** 행 더블클릭 콜백 */
  onRowDoubleClick?: ((row: T, index: number, event: React.MouseEvent) => void) | undefined;

  // ── CSS ───────────────────────────────────
  className?: string | undefined;
}
```

### DataTableToolbarProps

```typescript
export interface DataTableToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 글로벌 검색 입력 표시. 기본값: true */
  showGlobalFilter?: boolean | undefined;
  /** 글로벌 검색 placeholder */
  globalFilterPlaceholder?: string | undefined;
  /** 컬럼 표시/숨기기 토글 버튼 표시. 기본값: false */
  showColumnToggle?: boolean | undefined;
  /** 선택 카운트 표시. 기본값: true (selectionMode !== "none"일 때) */
  showSelectionCount?: boolean | undefined;
  /** 좌측 커스텀 콘텐츠 */
  left?: React.ReactNode | undefined;
  /** 우측 커스텀 콘텐츠 */
  right?: React.ReactNode | undefined;
  className?: string | undefined;
}
```

### DataTablePaginationProps

```typescript
export interface DataTablePaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 페이지 크기 선택 옵션 표시. 기본값: true */
  showPageSizeOptions?: boolean | undefined;
  /** 페이지 크기 옵션 목록. 기본값: [10, 25, 50, 100] */
  pageSizeOptions?: number[] | undefined;
  /** 총 건수 표시. 기본값: true */
  showTotal?: boolean | undefined;
  /** 페이지 번호 범위 표시 개수. 기본값: 5 */
  siblingCount?: number | undefined;
  className?: string | undefined;
}
```

### DataTableContext

```typescript
export interface DataTableContextValue<T = unknown> {
  // 원본 데이터
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;

  // 처리된 데이터 (필터 → 정렬 → 페이지네이션 적용 후)
  processedData: T[];
  /** 필터+정렬 적용 후 전체 행 수 (페이지네이션 전) */
  totalFilteredCount: number;

  // 가시 컬럼 (hidden 제외)
  visibleColumns: ColumnDef<T>[];

  // 정렬
  sortState: SortState;
  toggleSort: (key: string) => void;

  // 필터
  globalFilter: string;
  setGlobalFilter: (v: string) => void;
  columnFilters: FilterState;
  setColumnFilter: (key: string, value: string) => void;

  // 페이지네이션
  pagination: PaginationState | null;
  setPagination: (state: PaginationState) => void;
  totalPages: number;

  // 선택
  selectionMode: "none" | "single" | "multi";
  selectedKeys: SelectionState;
  toggleRowSelection: (key: string | number) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;

  // 확장
  expandable: boolean;
  expandedKeys: Set<string | number>;
  toggleRowExpansion: (key: string | number) => void;
  renderExpandedRow: ((row: T, index: number) => React.ReactNode) | undefined;

  // 컬럼 가시성
  hiddenColumns: Set<string>;
  toggleColumnVisibility: (key: string) => void;

  // 컬럼 리사이즈
  columnWidths: Record<string, number>;
  onColumnResize: (key: string, width: number) => void;

  // 가상 스크롤
  virtualScroll: boolean;
  rowHeight: number;
  height: number;

  // 상태
  loading: boolean;
  loadingRows: number;
  emptyState: React.ReactNode | undefined;

  // 테마
  theme: DataTableTheme;

  // 레이아웃
  stickyHeader: boolean;
  alternatingRows: boolean;
}
```

---

## 상태 관리

### 데이터 처리 파이프라인

DataTableRoot에서 useMemo로 다단계 처리:

```
원본 data
  ↓ [1] globalFilter 적용
  ↓ [2] columnFilters 적용
  ↓ [3] sort 적용
  = filteredSortedData (totalFilteredCount)
  ↓ [4] pagination slice
  = processedData (렌더 대상)
```

```typescript
// DataTableRoot.tsx 내부

const filteredData = useMemo(() => {
  let result = data;

  // [1] 글로벌 필터
  if (globalFilterValue.trim()) {
    const lower = globalFilterValue.trim().toLowerCase();
    result = result.filter((row) => {
      if (globalFilterFn) return globalFilterFn(row, globalFilterValue);
      // 기본: 모든 visible 컬럼의 cell 반환값을 문자열로 변환해 포함 검사
      return visibleColumns.some((col) => {
        const cellValue = col.cell(row, 0); // index는 필터에서 의미 없음
        return String(cellValue).toLowerCase().includes(lower);
      });
    });
  }

  // [2] 컬럼별 필터
  const activeColumnFilters = Object.entries(columnFiltersValue).filter(
    ([, v]) => v.trim() !== "",
  );
  if (activeColumnFilters.length > 0) {
    result = result.filter((row) =>
      activeColumnFilters.every(([colKey, filterVal]) => {
        const col = columns.find((c) => c.key === colKey);
        if (!col) return true;
        if (col.filterFn) return col.filterFn(row, filterVal);
        // 기본: cell 반환값 문자열 포함 검사
        return String(col.cell(row, 0)).toLowerCase().includes(filterVal.toLowerCase());
      }),
    );
  }

  return result;
}, [data, globalFilterValue, columnFiltersValue, visibleColumns, columns, globalFilterFn]);

const sortedData = useMemo(() => {
  if (sortStateValue.length === 0) return filteredData;

  return [...filteredData].sort((a, b) => {
    for (const { key, direction } of sortStateValue) {
      const col = columns.find((c) => c.key === key);
      if (!col) continue;

      let cmp: number;
      if (col.sortFn) {
        cmp = col.sortFn(a, b);
      } else {
        // 기본 정렬: cell 반환값 문자열 비교
        const aVal = String(col.cell(a, 0));
        const bVal = String(col.cell(b, 0));
        cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" });
      }

      if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}, [filteredData, sortStateValue, columns]);

const totalFilteredCount = sortedData.length;

const processedData = useMemo(() => {
  if (!paginationValue) return sortedData;
  const start = paginationValue.page * paginationValue.pageSize;
  return sortedData.slice(start, start + paginationValue.pageSize);
}, [sortedData, paginationValue]);
```

### 정렬 상태 사이클링 로직

헤더 클릭 시 `toggleSort(key)` 호출:

```typescript
function toggleSort(key: string): void {
  setSortState((prev) => {
    const existing = prev.find((s) => s.key === key);

    if (!multiSort) {
      // 단일 정렬: 3-state 사이클 (asc → desc → none)
      if (!existing) return [{ key, direction: "asc" }];
      if (existing.direction === "asc") return [{ key, direction: "desc" }];
      return []; // none — 정렬 해제
    }

    // 다중 정렬
    if (!existing) return [...prev, { key, direction: "asc" }];
    if (existing.direction === "asc") {
      return prev.map((s) => (s.key === key ? { ...s, direction: "desc" as const } : s));
    }
    // desc → 제거
    return prev.filter((s) => s.key !== key);
  });
}
```

사이클: `없음 → asc → desc → 없음`

Shift+클릭 시 다중 정렬 모드 (multiSort=true일 때만):
- 일반 클릭: 해당 컬럼만으로 단일 정렬 교체
- Shift+클릭: 기존 정렬에 추가/변경

```typescript
// DataTableHeader.tsx 에서 클릭 핸들러
const handleHeaderClick = (col: ColumnDef<T>, e: React.MouseEvent) => {
  if (!col.sortable) return;

  if (multiSort && e.shiftKey) {
    toggleSort(col.key); // 기존 정렬 유지하며 추가/변경
  } else if (multiSort) {
    // Shift 없이 클릭: 이 컬럼만 단일 정렬로 교체
    const existing = sortState.find((s) => s.key === col.key);
    if (!existing) setSortState([{ key: col.key, direction: "asc" }]);
    else if (existing.direction === "asc") setSortState([{ key: col.key, direction: "desc" }]);
    else setSortState([]);
  } else {
    toggleSort(col.key);
  }
};
```

### 필터 디바운스

글로벌 필터와 컬럼별 필터 모두 디바운스 적용:

```typescript
// useFilterDebounce.ts — DataTableRoot 내부에서 사용
function useFilterDebounce(value: string, delay: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // 값이 비어지면 즉시 반영 (UX: 검색 지우기가 즉각 반응)
    if (value === "") {
      setDebouncedValue("");
      return;
    }

    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debouncedValue;
}
```

DataTableRoot 내부에서 raw 필터값과 debounced 값 분리:

```typescript
// 사용자 입력은 즉시 UI에 반영 (controlled input)
const [rawGlobalFilter, setRawGlobalFilter] = useControllable(
  globalFilter, defaultGlobalFilter ?? "", onGlobalFilterChange,
);

// 실제 필터링에는 debounced 값 사용
const debouncedGlobalFilter = useFilterDebounce(rawGlobalFilter, globalFilterDebounce ?? 300);

// filteredData useMemo에서는 debouncedGlobalFilter 사용
```

### 행 선택 로직

```typescript
function toggleRowSelection(key: string | number): void {
  setSelectedKeys((prev) => {
    const next = new Set(prev);
    if (selectionMode === "single") {
      // 단일 선택: 이미 선택된 것을 클릭하면 해제, 아니면 교체
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.clear();
        next.add(key);
      }
    } else {
      // 다중 선택: 토글
      if (next.has(key)) next.delete(key);
      else next.add(key);
    }
    return next;
  });
}

function toggleSelectAll(): void {
  if (selectionMode !== "multi") return;
  setSelectedKeys((prev) => {
    // 현재 필터된 데이터 기준으로 전체 선택/해제
    const allKeys = processedData.map((row, i) => rowKey(row, i));
    const allSelected = allKeys.every((k) => prev.has(k));
    if (allSelected) {
      // 전체 해제: processedData의 키만 제거 (다른 페이지 선택은 유지)
      const next = new Set(prev);
      allKeys.forEach((k) => next.delete(k));
      return next;
    } else {
      // 전체 선택: processedData의 키 추가
      const next = new Set(prev);
      allKeys.forEach((k) => next.add(k));
      return next;
    }
  });
}

const isAllSelected = processedData.length > 0 &&
  processedData.every((row, i) => selectedKeys.has(rowKey(row, i)));

const isIndeterminate = !isAllSelected &&
  processedData.some((row, i) => selectedKeys.has(rowKey(row, i)));
```

### 상태 제어/비제어 패턴

모든 상태 (sort, filter, pagination, selection, expansion, hidden columns)는 `useControllable` 훅으로 관리:

```typescript
const [sortStateValue, setSortState] = useControllable(
  sortState, defaultSortState ?? [], onSortChange,
);

const [paginationValue, setPagination] = useControllable(
  pagination, defaultPagination ?? null, onPaginationChange,
);

const [selectedKeysValue, setSelectedKeys] = useControllable(
  selectedKeys, defaultSelectedKeys ?? new Set(), onSelectionChange,
);

const [expandedKeysValue, setExpandedKeys] = useControllable(
  expandedKeys, defaultExpandedKeys ?? new Set(), onExpandedChange,
);

const [hiddenColumnsValue, setHiddenColumns] = useControllable(
  hiddenColumns, defaultHiddenColumns ?? new Set(), onHiddenColumnsChange,
);
```

**주의**: `useControllable`의 타입 시그니처가 `T | undefined`를 받으므로, `PaginationState | null` 같은 경우는 내부에서 undefined를 null로 매핑해야 한다. pagination이 설정되지 않은 경우 null로 처리하여 "페이지네이션 비활성" 상태를 표현한다.

```typescript
// pagination은 useControllable에 직접 넣지 않고 수동 처리
const isPaginated = pagination !== undefined || defaultPagination !== undefined;
const [paginationValue, setPaginationValue] = useControllable<PaginationState>(
  pagination,
  defaultPagination ?? { page: 0, pageSize: 10 },
  onPaginationChange,
);
// isPaginated가 false면 paginationValue를 무시하고 전체 데이터 표시
```

---

## 가상 스크롤

### useVirtualList 훅 설계

```typescript
// useVirtualList.ts

export interface UseVirtualListOptions {
  /** 전체 아이템 수 */
  itemCount: number;
  /** 각 아이템 높이 (px) */
  itemHeight: number;
  /** 뷰포트 높이 (px) */
  viewportHeight: number;
  /** 뷰포트 위아래에 추가 렌더할 행 수. 기본값: 5 */
  overscan?: number | undefined;
}

export interface UseVirtualListReturn {
  /** 렌더할 아이템의 시작 인덱스 */
  startIndex: number;
  /** 렌더할 아이템의 끝 인덱스 (exclusive) */
  endIndex: number;
  /** 전체 콘텐츠 높이 (px) — 스크롤 공간 확보용 */
  totalHeight: number;
  /** 렌더 시작 위치의 오프셋 (px) — transform: translateY 용 */
  offsetY: number;
  /** 렌더할 아이템 수 */
  visibleCount: number;
  /** scroll 이벤트 핸들러 — 스크롤 컨테이너에 연결 */
  onScroll: (e: React.UIEvent<HTMLElement>) => void;
  /** 스크롤 위치를 프로그래밍적으로 설정 */
  scrollTo: (index: number) => void;
  /** 스크롤 컨테이너 ref */
  scrollRef: React.RefObject<HTMLDivElement>;
}
```

### 가상 스크롤 알고리즘

```typescript
import { useState, useCallback, useRef, useMemo } from "react";

export function useVirtualList({
  itemCount,
  itemHeight,
  viewportHeight,
  overscan = 5,
}: UseVirtualListOptions): UseVirtualListReturn {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null!);

  // 전체 콘텐츠 높이
  const totalHeight = itemCount * itemHeight;

  // 뷰포트에 들어가는 행 수
  const visibleCount = Math.ceil(viewportHeight / itemHeight);

  // 스크롤 위치 기반 시작/끝 인덱스 계산
  const startIndex = useMemo(() => {
    const raw = Math.floor(scrollTop / itemHeight);
    return Math.max(0, raw - overscan);
  }, [scrollTop, itemHeight, overscan]);

  const endIndex = useMemo(() => {
    const raw = Math.floor(scrollTop / itemHeight) + visibleCount;
    return Math.min(itemCount, raw + overscan);
  }, [scrollTop, itemHeight, visibleCount, itemCount, overscan]);

  // 렌더 시작 위치 오프셋
  const offsetY = startIndex * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollTo = useCallback((index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  return {
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    visibleCount,
    onScroll,
    scrollTo,
    scrollRef,
  };
}
```

### DataTableBody에서의 가상 스크롤 적용

```tsx
// DataTableBody.tsx

function DataTableBody<T>() {
  const ctx = useDataTableContext<T>();

  if (ctx.virtualScroll) {
    return <VirtualBody />;
  }
  return <NormalBody />;
}

function VirtualBody<T>() {
  const ctx = useDataTableContext<T>();
  const { startIndex, endIndex, totalHeight, offsetY, onScroll, scrollRef } =
    useVirtualList({
      itemCount: ctx.processedData.length,
      itemHeight: ctx.rowHeight,
      viewportHeight: ctx.height,
      overscan: 5,
    });

  const visibleRows = ctx.processedData.slice(startIndex, endIndex);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      style={{
        height: ctx.height,
        overflow: "auto",
        position: "relative",
      }}
    >
      {/* 전체 높이 확보용 spacer */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {/* 실제 렌더 영역 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          <table style={{ width: "100%", tableLayout: "fixed" }}>
            <tbody>
              {visibleRows.map((row, localIdx) => {
                const globalIdx = startIndex + localIdx;
                return (
                  <DataTableRow
                    key={ctx.rowKey(row, globalIdx)}
                    row={row}
                    index={globalIdx}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

### 가상 스크롤 — 확장 행 처리

확장 행이 있을 때 가상 스크롤은 행 높이가 가변적이므로 복잡해진다.
**결정**: `virtualScroll=true`와 `expandable=true` 동시 사용 시, 확장된 행은 고정 높이(`rowHeight`의 3배)로 처리한다. 커스텀 가변 높이는 v1에서 지원하지 않는다.

구현:
- 각 행의 높이를 `expandedKeys.has(key) ? rowHeight * 3 : rowHeight`로 계산
- useVirtualList를 확장하여 가변 높이 배열 받는 오버로드는 v2로 연기
- v1은 `virtualScroll + expandable` 사용 시 콘솔 경고 출력:
  ```
  [DataTable] virtualScroll + expandable: expanded rows use fixed height (rowHeight * 3).
  ```

---

## 컬럼 리사이즈

### useColumnResize 훅

```typescript
// useColumnResize.ts

export interface UseColumnResizeOptions {
  /** 초기 컬럼 너비 맵 */
  initialWidths: Record<string, number>;
  /** 컬럼별 최소 너비 맵 */
  minWidths: Record<string, number>;
  /** 컬럼별 최대 너비 맵 */
  maxWidths: Record<string, number>;
}

export interface UseColumnResizeReturn {
  /** 현재 컬럼 너비 맵 */
  widths: Record<string, number>;
  /** 리사이즈 시작 핸들러 — 헤더 셀의 리사이즈 핸들에 연결 */
  onResizeStart: (key: string, e: React.PointerEvent) => void;
  /** 현재 리사이즈 중인 컬럼 key (null이면 리사이즈 중 아님) */
  resizingKey: string | null;
}
```

### 포인터 이벤트 기반 드래그 구현

```typescript
export function useColumnResize({
  initialWidths,
  minWidths,
  maxWidths,
}: UseColumnResizeOptions): UseColumnResizeReturn {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const keyRef = useRef("");

  // initialWidths가 변경되면 (컬럼 추가/제거 시) widths 업데이트
  useEffect(() => {
    setWidths((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(initialWidths)) {
        if (!(k in next)) next[k] = v;
      }
      return next;
    });
  }, [initialWidths]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const key = keyRef.current;
    const delta = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + delta;
    const min = minWidths[key] ?? 50;
    const max = maxWidths[key] ?? Infinity;
    const clamped = Math.max(min, Math.min(max, newWidth));

    setWidths((prev) => ({ ...prev, [key]: clamped }));
  }, [minWidths, maxWidths]);

  const onPointerUp = useCallback(() => {
    setResizingKey(null);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const onResizeStart = useCallback((key: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation(); // 정렬 클릭 방지

    keyRef.current = key;
    startXRef.current = e.clientX;
    startWidthRef.current = widths[key] ?? 150;
    setResizingKey(key);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [widths, onPointerMove, onPointerUp]);

  return { widths, onResizeStart, resizingKey };
}
```

### 헤더 셀에서의 리사이즈 핸들 DOM

```tsx
// DataTableHeader.tsx 내부

{col.resizable && (
  <div
    onPointerDown={(e) => onResizeStart(col.key, e)}
    style={{
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: 4,
      cursor: "col-resize",
      // 시각적 가이드: hover 시 파란 라인
      background: resizingKey === col.key ? "#3b82f6" : "transparent",
      transition: "background-color 0.15s ease",
      zIndex: 1,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLElement).style.background = "rgba(59,130,246,0.3)";
    }}
    onMouseLeave={(e) => {
      if (resizingKey !== col.key) {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }
    }}
    role="separator"
    aria-orientation="vertical"
    aria-label={`Resize column ${typeof col.header === "string" ? col.header : col.key}`}
  />
)}
```

### 초기 너비 계산

```typescript
// DataTableRoot.tsx 에서 initialWidths 계산
const initialWidths = useMemo(() => {
  const result: Record<string, number> = {};
  for (const col of columns) {
    if (typeof col.width === "number") {
      result[col.key] = col.width;
    } else {
      result[col.key] = 150; // 기본 너비
    }
  }
  return result;
}, [columns]);

const minWidthsMap = useMemo(() => {
  const result: Record<string, number> = {};
  for (const col of columns) {
    result[col.key] = col.minWidth ?? 50;
  }
  return result;
}, [columns]);

const maxWidthsMap = useMemo(() => {
  const result: Record<string, number> = {};
  for (const col of columns) {
    if (col.maxWidth !== undefined) result[col.key] = col.maxWidth;
  }
  return result;
}, [columns]);
```

---

## 컬럼 고정 (Sticky Positioning)

### CSS 전략

pinned 컬럼은 `position: sticky`로 구현. 좌측 고정과 우측 고정 컬럼의 `left` / `right` 값을 누적 너비로 계산한다.

```typescript
// DataTableRoot.tsx 에서 pinned 오프셋 계산
const pinnedOffsets = useMemo(() => {
  const leftPinned = visibleColumns.filter((c) => c.pinned === "left");
  const rightPinned = visibleColumns.filter((c) => c.pinned === "right");

  const offsets: Record<string, { side: "left" | "right"; offset: number }> = {};

  // 좌측 고정: 왼쪽부터 순서대로 left 오프셋 누적
  let leftAccum = 0;
  for (const col of leftPinned) {
    offsets[col.key] = { side: "left", offset: leftAccum };
    leftAccum += columnWidths[col.key] ?? 150;
  }

  // 우측 고정: 오른쪽부터 순서대로 right 오프셋 누적
  let rightAccum = 0;
  for (let i = rightPinned.length - 1; i >= 0; i--) {
    const col = rightPinned[i]!;
    offsets[col.key] = { side: "right", offset: rightAccum };
    rightAccum += columnWidths[col.key] ?? 150;
  }

  return offsets;
}, [visibleColumns, columnWidths]);
```

### 셀 스타일 적용

```typescript
function getPinnedStyle(col: ColumnDef<unknown>, theme: DataTableTheme): React.CSSProperties {
  const pin = pinnedOffsets[col.key];
  if (!pin) return {};

  return {
    position: "sticky",
    [pin.side]: pin.offset,
    zIndex: 2, // 일반 셀보다 위
    // 고정 컬럼 배경: 스크롤 시 뒤 콘텐츠가 비치지 않도록 불투명 배경
    background: theme === "light" ? "#ffffff" : "#1f2937",
    // 고정 컬럼 경계선 그림자
    boxShadow: pin.side === "left"
      ? "2px 0 4px rgba(0,0,0,0.06)"
      : "-2px 0 4px rgba(0,0,0,0.06)",
  };
}
```

### 헤더 고정 + 컬럼 고정 조합

헤더가 sticky이면서 컬럼도 sticky인 경우, 헤더의 z-index를 더 높게 설정:

```
z-index 층:
  3 — sticky header + pinned column 교차점
  2 — pinned column (body)
  2 — sticky header (non-pinned)
  1 — 일반 셀
```

```typescript
// 헤더 셀
const headerPinnedStyle = {
  ...getPinnedStyle(col, theme),
  zIndex: col.pinned ? 3 : 2, // sticky header 기본 z-index: 2, pinned 교차: 3
};
```

### 컬럼 정렬 순서

렌더 시 컬럼 순서를 재배열하여 pinned left → normal → pinned right 순으로 정렬:

```typescript
const orderedColumns = useMemo(() => {
  const left = visibleColumns.filter((c) => c.pinned === "left");
  const center = visibleColumns.filter((c) => !c.pinned);
  const right = visibleColumns.filter((c) => c.pinned === "right");
  return [...left, ...center, ...right];
}, [visibleColumns]);
```

---

## DOM 구조

### 전체 레이아웃

```html
<div class="plastic-datatable" data-theme="light" {...rootProps}>
  <!-- Toolbar (children에서 DataTable.Toolbar를 찾아 여기 렌더) -->
  <div class="plastic-datatable-toolbar" style="...">
    <input placeholder="Search..." /> <!-- 글로벌 필터 -->
    <button>Columns</button>          <!-- 컬럼 토글 -->
  </div>

  <!-- 테이블 컨테이너 (스크롤 영역) -->
  <div class="plastic-datatable-container" style="height: {height}px; overflow: auto;">
    <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
      <colgroup>
        <!-- 선택 체크박스 컬럼 -->
        <col style="width: 40px" />
        <!-- 확장 토글 컬럼 -->
        <col style="width: 40px" />
        <!-- 데이터 컬럼들 -->
        <col style="width: {columnWidths[col.key]}px" />
        ...
      </colgroup>

      <thead>
        <tr style="position: sticky; top: 0; z-index: 2;">
          <!-- 전체 선택 체크박스 -->
          <th style="width: 40px;">
            <input type="checkbox" checked={isAllSelected} indeterminate />
          </th>
          <!-- 확장 열 빈 헤더 -->
          <th style="width: 40px;"></th>
          <!-- 컬럼 헤더들 -->
          <th style="position: relative; cursor: pointer; {...pinnedStyle}">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span>{header}</span>
              <!-- 정렬 아이콘 -->
              <SortIcon direction="asc" />
            </div>
            <!-- 리사이즈 핸들 -->
            <div class="resize-handle" />
          </th>
          ...
        </tr>
        <!-- 컬럼별 필터 행 (filterable 컬럼이 하나라도 있을 때만) -->
        <tr>
          <th></th> <!-- 선택 컬럼 빈칸 -->
          <th></th> <!-- 확장 컬럼 빈칸 -->
          <th>
            <input placeholder="Filter..." value={columnFilters[col.key]} />
          </th>
          ...
        </tr>
      </thead>

      <tbody>
        <!-- 일반 행 -->
        <tr style="background: {alternating ? altBg : normalBg}; {...hoverStyle}">
          <td><input type="checkbox" checked={isSelected} /></td>
          <td><button aria-expanded={isExpanded}>▶</button></td>
          <td style="{...pinnedStyle}; text-align: {align};">{cell(row, index)}</td>
          ...
        </tr>
        <!-- 확장된 행 (바로 아래) -->
        <tr class="expanded-row">
          <td colspan={totalColSpan}>
            {renderExpandedRow(row, index)}
          </td>
        </tr>
        ...
      </tbody>
    </table>

    <!-- 로딩 오버레이 -->
    <div style="position: absolute; inset: 0; background: rgba(255,255,255,0.7);">
      <!-- 스켈레톤 행들 -->
    </div>
  </div>

  <!-- Pagination (children에서 DataTable.Pagination을 찾아 여기 렌더) -->
  <div class="plastic-datatable-pagination" style="...">
    <span>1-10 of 100</span>
    <select>{pageSizeOptions}</select>
    <button>←</button>
    <span>1 2 3 ... 10</span>
    <button>→</button>
  </div>
</div>
```

### children 렌더 위치 결정

DataTableRoot는 children을 분석하여 Toolbar와 Pagination을 적절한 위치에 배치:

```typescript
// DataTableRoot.tsx
const childArray = React.Children.toArray(children);
const toolbar = childArray.find(
  (child) => React.isValidElement(child) && child.type === DataTableToolbar,
);
const pagination = childArray.find(
  (child) => React.isValidElement(child) && child.type === DataTablePagination,
);
const otherChildren = childArray.filter(
  (child) =>
    !React.isValidElement(child) ||
    (child.type !== DataTableToolbar && child.type !== DataTablePagination),
);

return (
  <DataTableContext.Provider value={ctx}>
    <div {...rootProps}>
      {toolbar}
      <div className="table-container">
        <table>...</table>
        {loading && <LoadingOverlay />}
        {!loading && processedData.length === 0 && <EmptyState />}
      </div>
      {pagination}
      {otherChildren}
    </div>
  </DataTableContext.Provider>
);
```

### 체크박스 렌더

선택 모드가 활성화되면 자동으로 첫 번째 컬럼으로 체크박스 열 삽입:

```tsx
// DataTableHeader.tsx
{selectionMode !== "none" && (
  <th
    style={{
      width: 40,
      padding: "0 8px",
      textAlign: "center",
      ...stickyHeaderStyle,
    }}
  >
    {selectionMode === "multi" && (
      <input
        type="checkbox"
        checked={isAllSelected}
        ref={(el) => {
          if (el) el.indeterminate = isIndeterminate;
        }}
        onChange={toggleSelectAll}
        aria-label="Select all rows"
      />
    )}
  </th>
)}
```

indeterminate 체크박스는 React의 `checked` prop으로 표현 불가하므로 ref 콜백으로 DOM 속성 직접 설정.

### 확장 토글 열

```tsx
{expandable && (
  <td style={{ width: 40, textAlign: "center", padding: "0 8px" }}>
    <button
      onClick={() => toggleRowExpansion(key)}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Collapse row" : "Expand row"}
      style={{
        border: "none",
        background: "none",
        cursor: "pointer",
        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
        fontSize: 12,
        color: theme === "light" ? "#6b7280" : "#9ca3af",
      }}
    >
      ▶
    </button>
  </td>
)}
```

---

## 테마 색상 맵

```typescript
// DataTableRoot.tsx 상단 — 내보내지 않는 내부 상수

const headerBg: Record<DataTableTheme, string> = {
  light: "#f9fafb",   // gray-50
  dark: "#111827",    // gray-900
};

const headerText: Record<DataTableTheme, string> = {
  light: "#374151",   // gray-700
  dark: "#e5e7eb",    // gray-200
};

const headerBorder: Record<DataTableTheme, string> = {
  light: "#e5e7eb",   // gray-200
  dark: "#374151",    // gray-700
};

const bodyBg: Record<DataTableTheme, string> = {
  light: "#ffffff",
  dark: "#1f2937",    // gray-800
};

const bodyText: Record<DataTableTheme, string> = {
  light: "#111827",   // gray-900
  dark: "#f3f4f6",    // gray-100
};

const alternatingRowBg: Record<DataTableTheme, string> = {
  light: "rgba(0,0,0,0.02)",
  dark: "rgba(255,255,255,0.03)",
};

const hoverRowBg: Record<DataTableTheme, string> = {
  light: "rgba(59,130,246,0.06)",   // blue tint
  dark: "rgba(96,165,250,0.08)",
};

const selectedRowBg: Record<DataTableTheme, string> = {
  light: "rgba(59,130,246,0.10)",
  dark: "rgba(96,165,250,0.14)",
};

const borderColor: Record<DataTableTheme, string> = {
  light: "#e5e7eb",   // gray-200
  dark: "#374151",    // gray-700
};

const cellPadding = "8px 12px";

const sortIconColor: Record<DataTableTheme, { active: string; inactive: string }> = {
  light: { active: "#3b82f6", inactive: "#d1d5db" },
  dark: { active: "#60a5fa", inactive: "#4b5563" },
};

const paginationBg: Record<DataTableTheme, string> = {
  light: "#f9fafb",
  dark: "#111827",
};

const paginationText: Record<DataTableTheme, string> = {
  light: "#374151",
  dark: "#d1d5db",
};

const paginationButtonBg: Record<DataTableTheme, { normal: string; hover: string; active: string; disabled: string }> = {
  light: { normal: "transparent", hover: "#e5e7eb", active: "#3b82f6", disabled: "transparent" },
  dark: { normal: "transparent", hover: "#374151", active: "#2563eb", disabled: "transparent" },
};

const paginationButtonText: Record<DataTableTheme, { normal: string; active: string; disabled: string }> = {
  light: { normal: "#374151", active: "#ffffff", disabled: "#d1d5db" },
  dark: { normal: "#d1d5db", active: "#ffffff", disabled: "#4b5563" },
};

const toolbarBg: Record<DataTableTheme, string> = {
  light: "#ffffff",
  dark: "#1f2937",
};

const toolbarInputBg: Record<DataTableTheme, string> = {
  light: "#f3f4f6",
  dark: "#111827",
};

const toolbarInputBorder: Record<DataTableTheme, string> = {
  light: "#d1d5db",
  dark: "#4b5563",
};

const toolbarInputText: Record<DataTableTheme, string> = {
  light: "#111827",
  dark: "#f3f4f6",
};

const loadingOverlayBg: Record<DataTableTheme, string> = {
  light: "rgba(255,255,255,0.7)",
  dark: "rgba(17,24,39,0.7)",
};

const skeletonBg: Record<DataTableTheme, string> = {
  light: "#e5e7eb",
  dark: "#374151",
};

const emptyText: Record<DataTableTheme, string> = {
  light: "#9ca3af",
  dark: "#6b7280",
};
```

---

## 애니메이션 스펙

| 전환 | CSS 속성 | 시간 | 이징 |
|------|----------|------|------|
| 행 hover | `background-color` | 150ms | `ease` |
| 행 선택 | `background-color` | 150ms | `ease` |
| 정렬 아이콘 방향 변경 | `transform: rotate` | 200ms | `ease` |
| 정렬 아이콘 활성화 | `opacity`, `color` | 200ms | `ease` |
| 확장 토글 화살표 | `transform: rotate(0→90deg)` | 200ms | `ease` |
| 확장 행 열림/닫힘 | `max-height`, `opacity` | 250ms | `ease-in-out` |
| 리사이즈 핸들 hover | `background-color` | 150ms | `ease` |
| 로딩 스켈레톤 펄스 | `opacity: 0.4↔1` | 1500ms | `ease-in-out` (infinite) |
| 체크박스 체크 | 브라우저 네이티브 | — | — |
| 컬럼 필터 입력 포커스 테두리 | `border-color` | 150ms | `ease` |
| 페이지 전환 | 없음 (즉시 교체) | — | — |

### 정렬 아이콘 컴포넌트

```tsx
function SortIcon({ direction, active }: { direction?: SortDirection; active: boolean }) {
  // ▲▼ 화살표 쌍. 활성 방향만 강조
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        fontSize: 8,
        lineHeight: 1,
        gap: 1,
        transition: "opacity 0.2s ease",
        opacity: active ? 1 : 0.4,
      }}
    >
      <span
        style={{
          color: active && direction === "asc" ? "currentColor" : "inherit",
          opacity: active && direction === "asc" ? 1 : 0.3,
          transition: "opacity 0.2s ease, color 0.2s ease",
        }}
      >
        ▲
      </span>
      <span
        style={{
          color: active && direction === "desc" ? "currentColor" : "inherit",
          opacity: active && direction === "desc" ? 1 : 0.3,
          transition: "opacity 0.2s ease, color 0.2s ease",
        }}
      >
        ▼
      </span>
    </span>
  );
}
```

### 확장 행 애니메이션

확장 행은 `<tr>` 내부 `<td colspan>` 안에 wrapper div를 두어 max-height transition:

```tsx
<tr>
  <td colSpan={totalColSpan} style={{ padding: 0, border: "none" }}>
    <div
      style={{
        maxHeight: isExpanded ? 500 : 0,
        opacity: isExpanded ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.25s ease-in-out, opacity 0.25s ease-in-out",
      }}
    >
      <div style={{ padding: "12px 16px" }}>
        {renderExpandedRow?.(row, index)}
      </div>
    </div>
  </td>
</tr>
```

### 로딩 스켈레톤

```tsx
function DataTableLoading({ rows, colCount, theme }: { rows: number; colCount: number; theme: DataTableTheme }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: colCount }, (_, j) => (
            <td key={j} style={{ padding: cellPadding }}>
              <div
                style={{
                  height: 16,
                  borderRadius: 4,
                  background: skeletonBg[theme],
                  animation: "plastic-skeleton-pulse 1.5s ease-in-out infinite",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
```

스켈레톤 애니메이션은 인라인 `@keyframes` 대신 컴포넌트 마운트 시 한 번만 `<style>` 태그 삽입:

```typescript
// DataTableRoot.tsx
useEffect(() => {
  const id = "plastic-datatable-keyframes";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    @keyframes plastic-skeleton-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}, []);
```

---

## 접근성

| 요소 | ARIA 속성 | 값 |
|------|-----------|---|
| 테이블 컨테이너 `<div>` | `role` | `"region"` |
| 테이블 컨테이너 `<div>` | `aria-label` | `"Data table"` (또는 사용자 지정) |
| `<table>` | `role` | `"table"` (기본값, 명시 불필요) |
| 정렬 가능 헤더 `<th>` | `aria-sort` | `"ascending"` / `"descending"` / `"none"` |
| 정렬 가능 헤더 `<th>` | `role` | `"columnheader"` (기본값) |
| 정렬 가능 헤더 `<th>` | `tabIndex` | `0` |
| 정렬 가능 헤더 `<th>` | `onKeyDown` | Enter/Space → toggleSort |
| 전체 선택 체크박스 | `aria-label` | `"Select all rows"` |
| 행 체크박스 | `aria-label` | `"Select row {rowKey}"` |
| 확장 버튼 | `aria-expanded` | `true` / `false` |
| 확장 버튼 | `aria-label` | `"Expand row"` / `"Collapse row"` |
| 리사이즈 핸들 | `role` | `"separator"` |
| 리사이즈 핸들 | `aria-orientation` | `"vertical"` |
| 로딩 오버레이 | `aria-busy` | `true` |
| 빈 상태 | `role` | `"status"` |
| 페이지네이션 `<nav>` | `aria-label` | `"Pagination"` |
| 페이지 버튼 | `aria-current` | `"page"` (현재 페이지일 때) |
| 페이지 버튼 | `aria-label` | `"Page {n}"` |
| 이전/다음 버튼 | `aria-label` | `"Previous page"` / `"Next page"` |
| 이전/다음 버튼 | `aria-disabled` | 첫/마지막 페이지일 때 `true` |
| 글로벌 필터 입력 | `aria-label` | `"Search table"` |
| 컬럼 필터 입력 | `aria-label` | `"Filter {columnHeader}"` |
| 페이지 크기 선택 | `aria-label` | `"Rows per page"` |

### 키보드 네비게이션

- **Tab**: 글로벌 필터 → 컬럼 토글 → 전체 선택 → 각 행 체크박스 → 확장 버튼 → 페이지네이션
- **Enter / Space** (정렬 헤더): 정렬 토글
- **Enter / Space** (확장 버튼): 확장 토글
- **Enter / Space** (페이지 버튼): 페이지 이동

정렬 변경 시 `aria-live="polite"` 영역에 "Sorted by {column}, {direction}" 안내 (스크린리더용 hidden 요소):

```tsx
<div
  role="status"
  aria-live="polite"
  style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
>
  {sortAnnouncement}
</div>
```

---

## 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| `data=[]` (빈 데이터) | `emptyState` 렌더. 기본: "No data" 텍스트. 헤더는 유지 |
| `columns=[]` | 아무것도 렌더하지 않음 (빈 div) |
| 단일 컬럼 | 정상 동작. 체크박스/확장 열은 별도 |
| 매우 넓은 테이블 (컬럼 20+) | 수평 스크롤. pinned 컬럼은 고정. `table-layout: fixed` + `overflow-x: auto` |
| 리사이즈로 minWidth 도달 | 더 이상 줄어들지 않음. cursor는 `col-resize` 유지 |
| 리사이즈로 maxWidth 도달 | 더 이상 늘어나지 않음 |
| `width`가 CSS string ("20%") | 리사이즈 대상 아님. `resizable=true`여도 숫자 width만 리사이즈 가능. 콘솔 경고 출력 |
| 페이지네이션 중 필터 적용 → 현재 페이지 초과 | page를 0으로 리셋 |
| 정렬/필터 중 데이터 변경 | processedData가 useMemo로 자동 재계산 |
| `rowKey` 미제공 | 기본 `(_, index) => index` 사용. 선택/확장 시 인덱스 기반이므로 데이터 변경 시 불안정. 콘솔 경고 출력 |
| `virtualScroll` + `expandable` | 확장 행 고정 높이(rowHeight*3). 콘솔 경고 |
| `virtualScroll` + `pagination` | 가상 스크롤과 페이지네이션은 상호 배타적. pagination 우선, virtualScroll 무시. 콘솔 경고 |
| `selectionMode="single"` + 전체 선택 체크박스 | 헤더 체크박스 미표시 |
| 매우 큰 데이터 (100,000+ rows) | `virtualScroll` 권장. 없이 사용 시 콘솔 경고 (10,000 rows 초과 시) |
| 컬럼 가시성 전부 hidden | 빈 테이블 (헤더 없음). 빈 상태 메시지 표시 |
| `loading=true` + `data` 있음 | 오버레이가 기존 데이터 위에 반투명 표시. 기존 행도 보임 |
| `loading=true` + `data=[]` | 스켈레톤 행만 표시 |
| 다크 테마에서 pinned 컬럼 배경 | 불투명 dark 배경 (#1f2937) 적용하여 스크롤 시 비침 방지 |
| 필터 디바운스 중 컴포넌트 unmount | clearTimeout으로 정리 |
| SSR (서버 사이드 렌더링) | useId 사용. scrollRef 등 DOM ref는 클라이언트에서만 동작. 초기 렌더는 정적 테이블 |

---

## 수정 대상 파일

### 신규 생성

1. **`src/components/DataTable/DataTable.types.ts`** — 전체 타입 정의 (~180줄)
2. **`src/components/DataTable/DataTableContext.ts`** — Context 생성 + useDataTableContext 훅 (~30줄)
3. **`src/components/DataTable/DataTableRoot.tsx`** — 메인 컴포넌트, 상태 관리, 데이터 파이프라인, Context Provider (~350줄)
4. **`src/components/DataTable/DataTableHeader.tsx`** — thead 렌더, 정렬 UI, 필터 행, 리사이즈 핸들 (~200줄)
5. **`src/components/DataTable/DataTableBody.tsx`** — tbody 렌더, 일반/가상 모드 분기 (~100줄)
6. **`src/components/DataTable/DataTableRow.tsx`** — 단일 행, 선택/확장/hover 처리 (~120줄)
7. **`src/components/DataTable/DataTablePagination.tsx`** — 페이지네이션 UI (~150줄)
8. **`src/components/DataTable/DataTableToolbar.tsx`** — 툴바 (글로벌 필터, 컬럼 토글 드롭다운) (~130줄)
9. **`src/components/DataTable/DataTableEmpty.tsx`** — 빈 상태 UI (~30줄)
10. **`src/components/DataTable/DataTableLoading.tsx`** — 로딩 스켈레톤 + 오버레이 (~50줄)
11. **`src/components/DataTable/useVirtualList.ts`** — 가상 스크롤 훅 (~60줄)
12. **`src/components/DataTable/useColumnResize.ts`** — 컬럼 리사이즈 훅 (~80줄)
13. **`src/components/DataTable/DataTable.tsx`** — Object.assign 조립 (~10줄)
14. **`src/components/DataTable/index.ts`** — 배럴 export (~5줄)
15. **`demo/src/pages/DataTablePage.tsx`** — 데모 페이지 (~800줄)

### 기존 수정

16. **`src/components/index.ts`** — `export * from "./DataTable"` 추가
17. **`demo/src/App.tsx`** — DataTable 페이지 NAV 추가 + import + 라우팅

---

## 데모 페이지

### NAV 엔트리

```typescript
{
  id: "datatable", label: "DataTable", description: "데이터 테이블",
  sections: [
    { label: "Basic", id: "basic" },
    { label: "Sorting", id: "sorting" },
    { label: "Filtering", id: "filtering" },
    { label: "Pagination", id: "pagination" },
    { label: "Selection", id: "selection" },
    { label: "Column Resize", id: "column-resize" },
    { label: "Column Pinning", id: "column-pinning" },
    { label: "Expandable Rows", id: "expandable-rows" },
    { label: "Virtual Scroll", id: "virtual-scroll" },
    { label: "Loading & Empty", id: "loading-empty" },
    { label: "Full Featured", id: "full-featured" },
    { label: "Dark Theme", id: "dark-theme" },
    { label: "Props", id: "props" },
    { label: "Usage", id: "usage" },
    { label: "Playground", id: "playground" },
  ],
}
```

### App.tsx 수정

```typescript
// import 추가
import { DataTablePage } from "./pages/DataTablePage";

// Page 타입 추가
type Page = "button" | "card" | "codeview" | "actionable" | "pathinput" | "datatable";

// NAV 배열에 datatable 추가 (위 섹션 참조)

// 렌더 분기 추가
{current === "datatable" && <DataTablePage />}
```

### 샘플 데이터

```typescript
// DataTablePage.tsx 상단

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  salary: number;
  joinDate: string;
  status: "active" | "inactive" | "pending";
}

const SAMPLE_DATA: Employee[] = [
  { id: 1, name: "김민수", email: "minsu@example.com", department: "Engineering", role: "Frontend", salary: 65000, joinDate: "2023-01-15", status: "active" },
  { id: 2, name: "이서연", email: "seoyeon@example.com", department: "Design", role: "UI/UX", salary: 58000, joinDate: "2023-03-22", status: "active" },
  { id: 3, name: "박지훈", email: "jihun@example.com", department: "Engineering", role: "Backend", salary: 72000, joinDate: "2022-08-10", status: "active" },
  { id: 4, name: "최윤아", email: "yuna@example.com", department: "Marketing", role: "Content", salary: 52000, joinDate: "2023-06-01", status: "inactive" },
  { id: 5, name: "정태현", email: "taehyun@example.com", department: "Engineering", role: "DevOps", salary: 78000, joinDate: "2021-11-30", status: "active" },
  { id: 6, name: "강하은", email: "haeun@example.com", department: "HR", role: "Manager", salary: 62000, joinDate: "2022-02-14", status: "active" },
  { id: 7, name: "조영민", email: "youngmin@example.com", department: "Engineering", role: "Full Stack", salary: 70000, joinDate: "2023-09-05", status: "pending" },
  { id: 8, name: "윤서진", email: "seojin@example.com", department: "Design", role: "Graphic", salary: 55000, joinDate: "2024-01-08", status: "active" },
  { id: 9, name: "임도현", email: "dohyun@example.com", department: "Sales", role: "Account Exec", salary: 60000, joinDate: "2022-05-20", status: "inactive" },
  { id: 10, name: "한소율", email: "soyul@example.com", department: "Engineering", role: "QA", salary: 57000, joinDate: "2023-07-12", status: "active" },
  // ... 20행까지 추가
];

// 가상 스크롤 데모용 대용량 데이터 생성
function generateLargeData(count: number): Employee[] {
  const departments = ["Engineering", "Design", "Marketing", "HR", "Sales", "Finance"];
  const roles = ["Frontend", "Backend", "Full Stack", "DevOps", "QA", "UI/UX", "Manager", "Analyst"];
  const statuses: Employee["status"][] = ["active", "inactive", "pending"];
  const lastNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "임", "한"];
  const firstNames = ["민수", "서연", "지훈", "윤아", "태현", "하은", "영민", "서진", "도현", "소율"];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${lastNames[i % lastNames.length]}${firstNames[i % firstNames.length]}`,
    email: `user${i + 1}@example.com`,
    department: departments[i % departments.length]!,
    role: roles[i % roles.length]!,
    salary: 45000 + Math.floor(Math.random() * 40000),
    joinDate: `20${20 + Math.floor(Math.random() * 6)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`,
    status: statuses[i % statuses.length]!,
  }));
}

const LARGE_DATA = generateLargeData(10000);
```

### 데모 섹션 상세

**1. Basic** — 컬럼 4개, 데이터 10행. 기본 테이블.

**2. Sorting** — `sortable: true` 컬럼 3개. 헤더 클릭으로 asc/desc/none 사이클 시연. multiSort 토글 체크박스 포함.

**3. Filtering** — 글로벌 검색 입력 + `filterable: true` 컬럼 2개. 디바운스 설정 슬라이더 (100-1000ms). 실시간 필터링 결과 확인.

**4. Pagination** — 20행 데이터, pageSize 5. DataTable.Pagination 컴포넌트 사용. 페이지 크기 변경 + 페이지 이동.

**5. Selection** — `selectionMode` 라디오 (none/single/multi) 전환. 선택된 행 표시. 아래에 선택된 ID 목록 출력.

**6. Column Resize** — `resizable: true` 컬럼 4개. 드래그로 너비 조절. minWidth/maxWidth 제약 시연. 현재 너비 값 실시간 표시.

**7. Column Pinning** — 좌측 1열 + 우측 1열 고정. 중앙 컬럼 6개로 수평 스크롤 발생시켜 고정 효과 시연.

**8. Expandable Rows** — 행 클릭 시 상세 패널 펼침. 다중 행 동시 확장 가능. 확장 콘텐츠에 추가 정보 표시.

**9. Virtual Scroll** — 10,000행 데모. `virtualScroll rowHeight={40} height={400}`. 스크롤 성능 확인. 렌더된 DOM 행 수 실시간 표시 (performance metric).

**10. Loading & Empty** — 토글 버튼으로 `loading` 상태 전환. 데이터 비움 버튼으로 빈 상태 시연. 커스텀 emptyState 렌더.

**11. Full Featured** — 모든 기능 조합. Toolbar (글로벌 필터 + 컬럼 토글) + Pagination + 정렬 + 필터 + 선택 + 확장 + 교대 행.

**12. Dark Theme** — `theme="dark"`. 어두운 배경 컨테이너에 렌더. light/dark 전환 토글.

**13. Props** — PropsTable 사용. DataTableProps, ColumnDef, DataTableToolbarProps, DataTablePaginationProps 각각 테이블.

**14. Usage** — CodeView 코드 블록. 기본 사용, 정렬/필터, 페이지네이션, 선택, 가상 스크롤, 전체 조합 예시.

**15. Playground** — 인터랙티브 컨트롤:
- theme: light/dark 토글
- alternatingRows: 체크박스
- selectionMode: none/single/multi 라디오
- expandable: 체크박스
- virtualScroll: 체크박스
- loading: 체크박스
- stickyHeader: 체크박스
- pagination pageSize: 숫자 입력
- multiSort: 체크박스
- globalFilterDebounce: 슬라이더

---

## 구현 순서

1. **`DataTable.types.ts`** — 전체 타입 정의 (ColumnDef, DataTableProps, 상태 타입, 서브컴포넌트 타입)
2. **`DataTableContext.ts`** — Context 생성, useDataTableContext 훅
3. **`useVirtualList.ts`** — 가상 스크롤 훅 (독립 테스트 가능)
4. **`useColumnResize.ts`** — 컬럼 리사이즈 훅 (독립 테스트 가능)
5. **`DataTableEmpty.tsx`** — 빈 상태 (단순)
6. **`DataTableLoading.tsx`** — 로딩 스켈레톤 (단순)
7. **`DataTableRow.tsx`** — 단일 행 렌더 (선택, 확장, hover, 교대 행)
8. **`DataTableHeader.tsx`** — 헤더 (정렬, 필터 행, 리사이즈 핸들, pinned 스타일)
9. **`DataTableBody.tsx`** — tbody (일반 + 가상 모드)
10. **`DataTableToolbar.tsx`** — 글로벌 검색, 컬럼 가시성 토글
11. **`DataTablePagination.tsx`** — 페이지네이션 UI
12. **`DataTableRoot.tsx`** — 메인 컴포넌트 (상태 관리, 데이터 파이프라인, children 분석, Context Provider)
13. **`DataTable.tsx`** — Object.assign 조립
14. **`index.ts`** — 배럴 export
15. **`src/components/index.ts`** — export 추가
16. **`demo/src/pages/DataTablePage.tsx`** — 데모 페이지
17. **`demo/src/App.tsx`** — NAV + import + 라우팅

### 의존 관계 그래프

```
types.ts ← Context.ts ← Root.tsx ← DataTable.tsx
                           ↑
            ┌──────────────┼──────────────┐
            │              │              │
         Header.tsx     Body.tsx    Toolbar.tsx
            │              │        Pagination.tsx
            │              │
      useColumnResize   DataTableRow.tsx
                           │
                     useVirtualList.ts
                     Empty.tsx
                     Loading.tsx
```

---

## 검증 방법

```bash
npm run typecheck        # 타입 체크 (strict mode, exactOptionalPropertyTypes)
npx tsup                 # 빌드 성공 확인
cd demo && npm run dev   # http://localhost:5173/#/datatable
```

### 기능 체크리스트

- [ ] 기본 테이블: columns + data → 테이블 렌더
- [ ] 정렬: 헤더 클릭 → asc → desc → none 사이클
- [ ] 다중 정렬: Shift+클릭으로 여러 컬럼 정렬
- [ ] 글로벌 필터: 입력 → 디바운스 후 필터링
- [ ] 컬럼별 필터: 개별 입력 → 디바운스 후 필터링
- [ ] 필터 + 정렬 조합 동작
- [ ] 페이지네이션: 페이지 이동, 페이지 크기 변경
- [ ] 필터 적용 후 페이지 자동 리셋 (page 0)
- [ ] 행 선택 (single): 한 행만 선택, 다른 행 클릭 시 교체
- [ ] 행 선택 (multi): 체크박스 토글, 전체 선택/해제
- [ ] indeterminate 체크박스 상태
- [ ] 컬럼 리사이즈: 드래그 → 너비 변경, min/max 제약
- [ ] 컬럼 고정: 좌/우 고정 컬럼이 수평 스크롤 시 고정
- [ ] sticky header: 세로 스크롤 시 헤더 고정
- [ ] 교대 행 배경색
- [ ] 행 hover 하이라이트
- [ ] 행 확장: 토글 → 상세 패널 펼침/접힘 (애니메이션)
- [ ] 컬럼 가시성 토글 (Toolbar)
- [ ] 가상 스크롤: 10,000행 스크롤 시 부드러움, DOM 행 수 제한 확인
- [ ] 로딩 상태: 스켈레톤 오버레이
- [ ] 빈 상태: emptyState 렌더
- [ ] 다크 테마: 모든 요소 색상 정상
- [ ] 라이트/다크 전환 시 깜빡임 없음
- [ ] 키보드: 정렬 헤더 Enter/Space, 체크박스 Tab, 확장 버튼 Enter
- [ ] 스크린리더: aria-sort, aria-expanded, aria-live 안내
- [ ] 제어/비제어 모드: sort, filter, pagination, selection 각각 동작
- [ ] `exactOptionalPropertyTypes` 통과 (undefined 타입 명시)
- [ ] `verbatimModuleSyntax` 통과 (type import 분리)
