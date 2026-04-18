import type {
  HTMLAttributes,
  ReactNode,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

export type DataTableTheme = "light" | "dark";
export type SortDirection = "asc" | "desc";

export interface HeaderContext<T = unknown> {
  column: ColumnDef<T>;
  sortDirection: SortDirection | undefined;
  toggleSort: () => void;
}

export interface ColumnDef<T> {
  key: string;
  header: string | ReactNode | ((ctx: HeaderContext<T>) => ReactNode);
  cell: (row: T, rowIndex: number) => ReactNode;
  width?: number | string | undefined;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
  sortable?: boolean | undefined;
  sortFn?: ((a: T, b: T) => number) | undefined;
  filterable?: boolean | undefined;
  filterFn?: ((row: T, filterValue: string) => boolean) | undefined;
  align?: "left" | "center" | "right" | undefined;
  pinned?: "left" | "right" | undefined;
  resizable?: boolean | undefined;
  hidden?: boolean | undefined;
  headerClassName?: string | undefined;
  cellClassName?: string | undefined;
}

export interface SortItem {
  key: string;
  direction: SortDirection;
}
export type SortState = SortItem[];

export type FilterState = Record<string, string>;

export interface PaginationState {
  page: number;
  pageSize: number;
}

export type SelectionState = Set<string | number>;
export type SelectionMode = "none" | "single" | "multi";

export interface DataTableProps<T>
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  columns: ColumnDef<T>[];
  data: T[];
  children?: ReactNode | undefined;

  rowKey?: ((row: T, index: number) => string | number) | undefined;

  sortState?: SortState | undefined;
  defaultSortState?: SortState | undefined;
  onSortChange?: ((state: SortState) => void) | undefined;
  multiSort?: boolean | undefined;

  globalFilter?: string | undefined;
  defaultGlobalFilter?: string | undefined;
  onGlobalFilterChange?: ((value: string) => void) | undefined;
  globalFilterDebounce?: number | undefined;
  globalFilterFn?: ((row: T, filterValue: string) => boolean) | undefined;
  columnFilters?: FilterState | undefined;
  defaultColumnFilters?: FilterState | undefined;
  onColumnFiltersChange?: ((state: FilterState) => void) | undefined;
  columnFilterDebounce?: number | undefined;

  pagination?: PaginationState | undefined;
  defaultPagination?: PaginationState | undefined;
  onPaginationChange?: ((state: PaginationState) => void) | undefined;

  selectionMode?: SelectionMode | undefined;
  selectedKeys?: SelectionState | undefined;
  defaultSelectedKeys?: SelectionState | undefined;
  onSelectionChange?: ((keys: SelectionState) => void) | undefined;

  expandable?: boolean | undefined;
  renderExpandedRow?: ((row: T, index: number) => ReactNode) | undefined;
  expandedKeys?: Set<string | number> | undefined;
  defaultExpandedKeys?: Set<string | number> | undefined;
  onExpandedChange?: ((keys: Set<string | number>) => void) | undefined;

  hiddenColumns?: Set<string> | undefined;
  defaultHiddenColumns?: Set<string> | undefined;
  onHiddenColumnsChange?: ((keys: Set<string>) => void) | undefined;

  virtualScroll?: boolean | undefined;
  rowHeight?: number | undefined;

  height?: number | undefined;
  stickyHeader?: boolean | undefined;
  alternatingRows?: boolean | undefined;

  loading?: boolean | undefined;
  loadingRows?: number | undefined;
  emptyState?: ReactNode | undefined;

  theme?: DataTableTheme | undefined;

  onRowClick?: ((row: T, index: number, event: MouseEvent) => void) | undefined;
  onRowDoubleClick?:
    | ((row: T, index: number, event: MouseEvent) => void)
    | undefined;

  className?: string | undefined;
}

export interface DataTableToolbarProps extends HTMLAttributes<HTMLDivElement> {
  showGlobalFilter?: boolean | undefined;
  globalFilterPlaceholder?: string | undefined;
  showColumnToggle?: boolean | undefined;
  showSelectionCount?: boolean | undefined;
  left?: ReactNode | undefined;
  right?: ReactNode | undefined;
  className?: string | undefined;
}

export interface DataTablePaginationProps
  extends HTMLAttributes<HTMLDivElement> {
  showPageSizeOptions?: boolean | undefined;
  pageSizeOptions?: number[] | undefined;
  showTotal?: boolean | undefined;
  siblingCount?: number | undefined;
  className?: string | undefined;
}

export interface DataTableContextValue<T = unknown> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;

  processedData: T[];
  totalFilteredCount: number;

  visibleColumns: ColumnDef<T>[];

  sortState: SortState;
  toggleSort: (key: string) => void;

  globalFilter: string;
  setGlobalFilter: (v: string) => void;
  columnFilters: FilterState;
  setColumnFilter: (key: string, value: string) => void;

  pagination: PaginationState | null;
  setPagination: (state: PaginationState) => void;
  totalPages: number;

  selectionMode: SelectionMode;
  selectedKeys: SelectionState;
  toggleRowSelection: (key: string | number) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;

  expandable: boolean;
  expandedKeys: Set<string | number>;
  toggleRowExpansion: (key: string | number) => void;
  renderExpandedRow: ((row: T, index: number) => ReactNode) | undefined;

  hiddenColumns: Set<string>;
  toggleColumnVisibility: (key: string) => void;

  columnWidths: Record<string, number>;
  onColumnResize: (key: string, width: number) => void;
  onColumnResizeStart: (key: string, e: ReactPointerEvent) => void;
  resizingKey: string | null;

  virtualScroll: boolean;
  rowHeight: number;
  height: number;

  virtualEnabled: boolean;
  virtualStartIndex: number;
  virtualEndIndex: number;
  virtualPaddingTop: number;
  virtualPaddingBottom: number;

  loading: boolean;
  loadingRows: number;
  emptyState: ReactNode | undefined;

  theme: DataTableTheme;

  stickyHeader: boolean;
  alternatingRows: boolean;

  onRowClick?: ((row: T, index: number, event: MouseEvent) => void) | undefined;
  onRowDoubleClick?:
    | ((row: T, index: number, event: MouseEvent) => void)
    | undefined;
}
