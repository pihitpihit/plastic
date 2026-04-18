import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useControllable } from "../_shared/useControllable";
import { DataTableContext } from "./DataTableContext";
import { useColumnResize } from "./useColumnResize";
import { useVirtualList } from "./useVirtualList";
import type {
  DataTableProps,
  DataTableContextValue,
  SortState,
  FilterState,
  PaginationState,
  SelectionState,
  ColumnDef,
} from "./DataTable.types";

export function DataTableRoot<T>(props: DataTableProps<T>) {
  const {
    columns,
    data,
    children,
    rowKey: rowKeyProp,

    sortState: sortStateProp,
    defaultSortState,
    onSortChange,
    multiSort = false,

    globalFilter: globalFilterProp,
    defaultGlobalFilter,
    onGlobalFilterChange,
    globalFilterFn,
    columnFilters: columnFiltersProp,
    defaultColumnFilters,
    onColumnFiltersChange,

    pagination: paginationProp,
    defaultPagination,
    onPaginationChange,

    selectionMode = "none",
    selectedKeys: selectedKeysProp,
    defaultSelectedKeys,
    onSelectionChange,

    expandable = false,
    renderExpandedRow,
    expandedKeys: expandedKeysProp,
    defaultExpandedKeys,
    onExpandedChange,

    hiddenColumns: hiddenColumnsProp,
    defaultHiddenColumns,
    onHiddenColumnsChange,

    virtualScroll = false,
    rowHeight = 40,

    height = 400,
    stickyHeader = true,
    alternatingRows = false,

    loading = false,
    loadingRows = 5,
    emptyState,

    theme = "light",

    onRowClick,
    onRowDoubleClick,

    className,
    style,
    ...rest
  } = props;

  const rowKey = useCallback(
    (row: T, index: number): string | number => {
      if (rowKeyProp) return rowKeyProp(row, index);
      const maybe = (row as unknown as { id?: string | number }).id;
      return maybe !== undefined ? maybe : index;
    },
    [rowKeyProp],
  );

  // ── 상태 관리 ─────────────────────────────────────────
  const [sortState, setSortState] = useControllable<SortState>(
    sortStateProp,
    defaultSortState ?? [],
    onSortChange,
  );

  const [globalFilter, setGlobalFilter] = useControllable<string>(
    globalFilterProp,
    defaultGlobalFilter ?? "",
    onGlobalFilterChange,
  );

  const [columnFilters, setColumnFilters] = useControllable<FilterState>(
    columnFiltersProp,
    defaultColumnFilters ?? {},
    onColumnFiltersChange,
  );

  const [pagination, setPagination] = useControllable<PaginationState | null>(
    paginationProp ?? null,
    defaultPagination ?? null,
    onPaginationChange as ((v: PaginationState | null) => void) | undefined,
  );

  const [selectedKeys, setSelectedKeys] = useControllable<SelectionState>(
    selectedKeysProp,
    defaultSelectedKeys ?? new Set<string | number>(),
    onSelectionChange,
  );

  const [expandedKeys, setExpandedKeys] = useControllable<Set<string | number>>(
    expandedKeysProp,
    defaultExpandedKeys ?? new Set<string | number>(),
    onExpandedChange,
  );

  const [hiddenColumns, setHiddenColumns] = useControllable<Set<string>>(
    hiddenColumnsProp,
    defaultHiddenColumns ?? new Set<string>(),
    onHiddenColumnsChange,
  );

  // ── 정렬/필터/선택/확장/컬럼 토글 핸들러 ─────────────
  const toggleSort = useCallback(
    (key: string) => {
      const current = sortState.find((s) => s.key === key);
      let next: SortState;
      if (!current) {
        next = multiSort
          ? [...sortState, { key, direction: "asc" }]
          : [{ key, direction: "asc" }];
      } else if (current.direction === "asc") {
        next = sortState.map((s) =>
          s.key === key ? { ...s, direction: "desc" as const } : s,
        );
        if (!multiSort) next = [{ key, direction: "desc" }];
      } else {
        next = sortState.filter((s) => s.key !== key);
        if (!multiSort) next = [];
      }
      setSortState(next);
    },
    [sortState, multiSort, setSortState],
  );

  const setColumnFilter = useCallback(
    (key: string, value: string) => {
      const next = { ...columnFilters };
      if (value === "") delete next[key];
      else next[key] = value;
      setColumnFilters(next);
    },
    [columnFilters, setColumnFilters],
  );

  const toggleRowSelection = useCallback(
    (key: string | number) => {
      const next = new Set(selectedKeys);
      if (selectionMode === "single") {
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.clear();
          next.add(key);
        }
      } else {
        if (next.has(key)) next.delete(key);
        else next.add(key);
      }
      setSelectedKeys(next);
    },
    [selectedKeys, selectionMode, setSelectedKeys],
  );

  const toggleRowExpansion = useCallback(
    (key: string | number) => {
      const next = new Set(expandedKeys);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setExpandedKeys(next);
    },
    [expandedKeys, setExpandedKeys],
  );

  const toggleColumnVisibility = useCallback(
    (key: string) => {
      const next = new Set(hiddenColumns);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setHiddenColumns(next);
    },
    [hiddenColumns, setHiddenColumns],
  );

  // ── 가시 컬럼 + 정렬 우선순위 (left > default > right) ─
  const visibleColumns = useMemo(() => {
    const visible = columns.filter((c) => !hiddenColumns.has(c.key));
    const leftPinned = visible.filter((c) => c.pinned === "left");
    const rightPinned = visible.filter((c) => c.pinned === "right");
    const unpinned = visible.filter((c) => !c.pinned);
    return [...leftPinned, ...unpinned, ...rightPinned];
  }, [columns, hiddenColumns]);

  // ── 데이터 파이프라인: filter → sort → paginate ────────
  const filteredData = useMemo(
    () =>
      applyFilters({
        data,
        globalFilter,
        globalFilterFn,
        columnFilters,
        columns,
        visibleColumns,
      }),
    [data, globalFilter, globalFilterFn, columnFilters, columns, visibleColumns],
  );

  const sortedData = useMemo(
    () => applySort({ data: filteredData, sortState, columns }),
    [filteredData, sortState, columns],
  );

  const totalFilteredCount = sortedData.length;
  const totalPages = pagination
    ? Math.max(1, Math.ceil(totalFilteredCount / pagination.pageSize))
    : 1;

  const processedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination]);

  // 필터/정렬 변경 시 현재 페이지가 유효 범위를 벗어나면 1페이지로 리셋
  const prevFilterSortKey = useRef("");
  useEffect(() => {
    if (!pagination) return;
    const filterKey = JSON.stringify({
      g: globalFilter,
      c: columnFilters,
      s: sortState,
    });
    if (prevFilterSortKey.current !== "" && prevFilterSortKey.current !== filterKey) {
      if (pagination.page !== 1) {
        setPagination({ page: 1, pageSize: pagination.pageSize });
      }
    }
    prevFilterSortKey.current = filterKey;
  }, [globalFilter, columnFilters, sortState, pagination, setPagination]);

  // 페이지가 totalPages를 초과하면 clamp
  useEffect(() => {
    if (!pagination) return;
    if (pagination.page > totalPages) {
      setPagination({ page: totalPages, pageSize: pagination.pageSize });
    }
  }, [pagination, totalPages, setPagination]);

  // ── 전체 선택 ────────────────────────────────────────
  const allKeysOnPage = useMemo(
    () => processedData.map((row, i) => rowKey(row, i)),
    [processedData, rowKey],
  );
  const selectedOnPageCount = allKeysOnPage.filter((k) =>
    selectedKeys.has(k),
  ).length;
  const isAllSelected =
    processedData.length > 0 && selectedOnPageCount === processedData.length;
  const isIndeterminate =
    selectedOnPageCount > 0 && selectedOnPageCount < processedData.length;

  const toggleSelectAll = useCallback(() => {
    if (selectionMode !== "multi") return;
    if (isAllSelected) {
      const next = new Set(selectedKeys);
      for (const k of allKeysOnPage) next.delete(k);
      setSelectedKeys(next);
    } else {
      const next = new Set(selectedKeys);
      for (const k of allKeysOnPage) next.add(k);
      setSelectedKeys(next);
    }
  }, [selectionMode, isAllSelected, selectedKeys, allKeysOnPage, setSelectedKeys]);

  // ── 컬럼 리사이즈 ────────────────────────────────────
  const initialWidths = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const col of columns) {
      if (typeof col.width === "number") obj[col.key] = col.width;
    }
    return obj;
  }, [columns]);

  const minWidths = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const col of columns) {
      if (typeof col.minWidth === "number") obj[col.key] = col.minWidth;
    }
    return obj;
  }, [columns]);

  const maxWidths = useMemo(() => {
    const obj: Record<string, number> = {};
    for (const col of columns) {
      if (typeof col.maxWidth === "number") obj[col.key] = col.maxWidth;
    }
    return obj;
  }, [columns]);

  const resize = useColumnResize({ initialWidths, minWidths, maxWidths });

  // ── 가상 스크롤 ──────────────────────────────────────
  const virtual = useVirtualList({
    itemCount: processedData.length,
    itemHeight: rowHeight,
    viewportHeight: height,
    overscan: 5,
    threshold: virtualScroll ? 0 : Number.POSITIVE_INFINITY,
  });

  // ── 컬럼 너비 setter (resize 훅과 연계) ────────────────
  const onColumnResize = useCallback(
    (_key: string, _width: number) => {
      // resize 훅이 내부 상태로 관리하므로 별도 처리 없음
    },
    [],
  );

  const setPaginationWrapped = useCallback(
    (state: PaginationState) => {
      setPagination(state);
    },
    [setPagination],
  );

  const ctxValue = useMemo<DataTableContextValue<T>>(
    () => ({
      columns,
      data,
      rowKey,
      processedData,
      totalFilteredCount,
      visibleColumns,
      sortState,
      toggleSort,
      globalFilter,
      setGlobalFilter,
      columnFilters,
      setColumnFilter,
      pagination,
      setPagination: setPaginationWrapped,
      totalPages,
      selectionMode,
      selectedKeys,
      toggleRowSelection,
      toggleSelectAll,
      isAllSelected,
      isIndeterminate,
      expandable,
      expandedKeys,
      toggleRowExpansion,
      renderExpandedRow,
      hiddenColumns,
      toggleColumnVisibility,
      columnWidths: resize.widths,
      onColumnResize,
      onColumnResizeStart: resize.onResizeStart,
      resizingKey: resize.resizingKey,
      virtualScroll,
      rowHeight,
      height,
      virtualEnabled: virtual.enabled,
      virtualStartIndex: virtual.startIndex,
      virtualEndIndex: virtual.endIndex,
      virtualPaddingTop: virtual.paddingTop,
      virtualPaddingBottom: virtual.paddingBottom,
      loading,
      loadingRows,
      emptyState,
      theme,
      stickyHeader,
      alternatingRows,
      onRowClick,
      onRowDoubleClick,
    }),
    [
      columns,
      data,
      rowKey,
      processedData,
      totalFilteredCount,
      visibleColumns,
      sortState,
      toggleSort,
      globalFilter,
      setGlobalFilter,
      columnFilters,
      setColumnFilter,
      pagination,
      setPaginationWrapped,
      totalPages,
      selectionMode,
      selectedKeys,
      toggleRowSelection,
      toggleSelectAll,
      isAllSelected,
      isIndeterminate,
      expandable,
      expandedKeys,
      toggleRowExpansion,
      renderExpandedRow,
      hiddenColumns,
      toggleColumnVisibility,
      resize.widths,
      resize.onResizeStart,
      resize.resizingKey,
      onColumnResize,
      virtualScroll,
      rowHeight,
      height,
      virtual.enabled,
      virtual.startIndex,
      virtual.endIndex,
      virtual.paddingTop,
      virtual.paddingBottom,
      loading,
      loadingRows,
      emptyState,
      theme,
      stickyHeader,
      alternatingRows,
      onRowClick,
      onRowDoubleClick,
    ],
  );

  return (
    <DataTableContext.Provider value={ctxValue as DataTableContextValue<unknown>}>
      <DataTableRootView
        className={className}
        style={style}
        rest={rest}
        children={children}
      />
    </DataTableContext.Provider>
  );
}

interface DataTableRootViewProps {
  className: string | undefined;
  style: React.CSSProperties | undefined;
  rest: Record<string, unknown>;
  children: ReactNode | undefined;
}

function DataTableRootView(props: DataTableRootViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={wrapperRef}
      className={props.className}
      style={props.style}
      {...props.rest}
    >
      {props.children}
    </div>
  );
}

interface ApplySortArgs<T> {
  data: T[];
  sortState: SortState;
  columns: ColumnDef<T>[];
}

function applySort<T>(args: ApplySortArgs<T>): T[] {
  const { data, sortState, columns } = args;
  if (sortState.length === 0) return data;
  const arr = [...data];
  arr.sort((a, b) => {
    for (const { key, direction } of sortState) {
      const col = columns.find((c) => c.key === key);
      if (!col) continue;
      const cmp = col.sortFn
        ? col.sortFn(a, b)
        : defaultCompare(
            (a as unknown as Record<string, unknown>)[key],
            (b as unknown as Record<string, unknown>)[key],
          );
      if (cmp !== 0) return direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
  return arr;
}

interface ApplyFiltersArgs<T> {
  data: T[];
  globalFilter: string;
  globalFilterFn: ((row: T, filterValue: string) => boolean) | undefined;
  columnFilters: FilterState;
  columns: ColumnDef<T>[];
  visibleColumns: ColumnDef<T>[];
}

function applyFilters<T>(args: ApplyFiltersArgs<T>): T[] {
  const { data, globalFilter, globalFilterFn, columnFilters, columns, visibleColumns } = args;
  let result = data;

  if (globalFilter) {
    const lower = globalFilter.toLowerCase();
    result = result.filter((row) => {
      if (globalFilterFn) return globalFilterFn(row, globalFilter);
      return visibleColumns.some((col) => rowMatchesString(row, col, lower));
    });
  }

  const activeFilters = Object.entries(columnFilters).filter(
    ([, v]) => v !== "",
  );
  if (activeFilters.length > 0) {
    result = result.filter((row) =>
      activeFilters.every(([key, filterValue]) => {
        const col = columns.find((c) => c.key === key);
        if (!col) return true;
        if (col.filterFn) return col.filterFn(row, filterValue);
        const v = (row as unknown as Record<string, unknown>)[key];
        if (v === null || v === undefined) return false;
        return String(v).toLowerCase().includes(filterValue.toLowerCase());
      }),
    );
  }

  return result;
}

function rowMatchesString<T>(
  row: T,
  col: ColumnDef<T>,
  lowerQuery: string,
): boolean {
  try {
    const cell = col.cell(row, 0);
    if (typeof cell === "string" || typeof cell === "number") {
      return String(cell).toLowerCase().includes(lowerQuery);
    }
  } catch {
    /* cell renderer failed — fall through to raw value */
  }
  const v = (row as unknown as Record<string, unknown>)[col.key];
  if (v === null || v === undefined) return false;
  return String(v).toLowerCase().includes(lowerQuery);
}

function defaultCompare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
}

// ColumnDef used in closure scope
export type { ColumnDef };
