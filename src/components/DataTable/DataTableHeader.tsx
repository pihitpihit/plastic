import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useDataTableContext } from "./DataTableContext";
import type { ColumnDef, HeaderContext, SortDirection } from "./DataTable.types";

export interface DataTableHeaderProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  showFilterRow?: boolean | undefined;
}

function SortIcon({
  direction,
  color,
  activeColor,
}: {
  direction: SortDirection | undefined;
  color: string;
  activeColor: string;
}) {
  const upColor = direction === "asc" ? activeColor : color;
  const downColor = direction === "desc" ? activeColor : color;
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        marginLeft: "0.25rem",
        fontSize: "8px",
        lineHeight: 1,
      }}
      aria-hidden="true"
    >
      <svg width="8" height="5" viewBox="0 0 8 5" fill={upColor}>
        <path d="M4 0 L8 5 L0 5 Z" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill={downColor}
        style={{ marginTop: "2px" }}
      >
        <path d="M4 5 L0 0 L8 0 Z" />
      </svg>
    </span>
  );
}

export function DataTableHeader({
  className,
  style,
  showFilterRow = false,
}: DataTableHeaderProps) {
  const ctx = useDataTableContext();
  const theme = ctx.theme;
  const selectionEnabled = ctx.selectionMode !== "none";
  const hasFilterableColumns = ctx.visibleColumns.some(
    (c) => c.filterable === true,
  );
  const renderFilterRow = showFilterRow && hasFilterableColumns;

  const bg = theme === "dark" ? "#1f2937" : "#f9fafb";
  const text = theme === "dark" ? "#f3f4f6" : "#111827";
  const iconIdle = theme === "dark" ? "#4b5563" : "#cbd5e1";
  const iconActive = theme === "dark" ? "#60a5fa" : "#3b82f6";
  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";

  const getSortDir = (key: string): SortDirection | undefined => {
    const item = ctx.sortState.find((s) => s.key === key);
    return item?.direction;
  };

  const getColumnWidth = (col: ColumnDef<unknown>): number => {
    const ctxWidth = ctx.columnWidths[col.key];
    if (typeof ctxWidth === "number") return ctxWidth;
    if (typeof col.width === "number") return col.width;
    return 150;
  };

  const leftOffsets = new Map<string, number>();
  let leftAcc = 0;
  if (selectionEnabled) leftAcc += 40;
  if (ctx.expandable) leftAcc += 36;
  for (const col of ctx.visibleColumns) {
    if (col.pinned === "left") {
      leftOffsets.set(col.key, leftAcc);
      leftAcc += getColumnWidth(col);
    }
  }

  const rightOffsets = new Map<string, number>();
  let rightAcc = 0;
  for (let i = ctx.visibleColumns.length - 1; i >= 0; i--) {
    const col = ctx.visibleColumns[i];
    if (col && col.pinned === "right") {
      rightOffsets.set(col.key, rightAcc);
      rightAcc += getColumnWidth(col);
    }
  }

  const lastLeftPinnedKey = [...ctx.visibleColumns]
    .filter((c) => c.pinned === "left")
    .pop()?.key;
  const firstRightPinnedKey = ctx.visibleColumns.find(
    (c) => c.pinned === "right",
  )?.key;

  const pinnedStyle = (col: ColumnDef<unknown>): CSSProperties => {
    if (col.pinned === "left") {
      return {
        position: "sticky",
        left: `${leftOffsets.get(col.key) ?? 0}px`,
        zIndex: 2,
        background: bg,
        boxShadow:
          col.key === lastLeftPinnedKey
            ? theme === "dark"
              ? "4px 0 6px -2px rgba(0,0,0,0.4)"
              : "4px 0 6px -2px rgba(0,0,0,0.08)"
            : undefined,
      };
    }
    if (col.pinned === "right") {
      return {
        position: "sticky",
        right: `${rightOffsets.get(col.key) ?? 0}px`,
        zIndex: 2,
        background: bg,
        boxShadow:
          col.key === firstRightPinnedKey
            ? theme === "dark"
              ? "-4px 0 6px -2px rgba(0,0,0,0.4)"
              : "-4px 0 6px -2px rgba(0,0,0,0.08)"
            : undefined,
      };
    }
    return {};
  };

  const handleResizeStart = (key: string, e: ReactPointerEvent) => {
    ctx.onColumnResizeStart(key, e);
  };

  const renderHeaderContent = (col: ColumnDef<unknown>) => {
    if (typeof col.header === "function") {
      const headerCtx: HeaderContext<unknown> = {
        column: col,
        sortDirection: getSortDir(col.key),
        toggleSort: () => ctx.toggleSort(col.key),
      };
      return col.header(headerCtx);
    }
    return col.header;
  };

  return (
    <thead
      role="rowgroup"
      className={className}
      style={{
        background: bg,
        color: text,
        position: ctx.stickyHeader ? "sticky" : "static",
        top: 0,
        zIndex: ctx.stickyHeader ? 1 : undefined,
        ...style,
      }}
    >
      <colgroup>
        {selectionEnabled && <col style={{ width: "40px" }} />}
        {ctx.expandable && <col style={{ width: "36px" }} />}
        {ctx.visibleColumns.map((col) => {
          const width = ctx.columnWidths[col.key] ?? col.width;
          return (
            <col
              key={col.key}
              style={{
                width: typeof width === "number" ? `${width}px` : width,
              }}
            />
          );
        })}
      </colgroup>
      <tr role="row">
        {selectionEnabled && (
          <th
            role="columnheader"
            scope="col"
            style={{
              padding: "0.625rem 0.75rem",
              borderBottom: `1px solid ${borderColor}`,
              textAlign: "center",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            <input
              type="checkbox"
              checked={ctx.isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = ctx.isIndeterminate;
              }}
              onChange={() => ctx.toggleSelectAll()}
              aria-label="Select all rows"
              disabled={ctx.selectionMode !== "multi"}
              style={{ cursor: ctx.selectionMode === "multi" ? "pointer" : "default" }}
            />
          </th>
        )}
        {ctx.expandable && (
          <th
            role="columnheader"
            scope="col"
            aria-label="Expand column"
            style={{
              padding: "0.625rem 0.5rem",
              borderBottom: `1px solid ${borderColor}`,
              width: "36px",
            }}
          />
        )}
        {ctx.visibleColumns.map((col) => {
          const sortDir = getSortDir(col.key);
          const isSortable = col.sortable === true;
          const isResizable = col.resizable === true;
          const isResizing = ctx.resizingKey === col.key;
          return (
            <th
              key={col.key}
              role="columnheader"
              scope="col"
              aria-sort={
                sortDir === "asc"
                  ? "ascending"
                  : sortDir === "desc"
                    ? "descending"
                    : isSortable
                      ? "none"
                      : undefined
              }
              className={col.headerClassName}
              onClick={isSortable ? () => ctx.toggleSort(col.key) : undefined}
              style={{
                padding: "0.625rem 0.75rem",
                borderBottom: `1px solid ${borderColor}`,
                textAlign: col.align ?? "left",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: isSortable ? "pointer" : "default",
                userSelect: "none",
                whiteSpace: "nowrap",
                position: col.pinned ? "sticky" : "relative",
                ...pinnedStyle(col),
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.125rem",
                }}
              >
                {renderHeaderContent(col)}
                {isSortable && (
                  <SortIcon
                    direction={sortDir}
                    color={iconIdle}
                    activeColor={iconActive}
                  />
                )}
              </span>
              {isResizable && (
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize ${col.key}`}
                  onPointerDown={(e) => handleResizeStart(col.key, e)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "4px",
                    height: "100%",
                    cursor: "col-resize",
                    background: isResizing ? iconActive : "transparent",
                    transition: "background-color 0.12s ease",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isResizing)
                      (e.currentTarget as HTMLDivElement).style.background = iconActive;
                  }}
                  onMouseLeave={(e) => {
                    if (!isResizing)
                      (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                />
              )}
            </th>
          );
        })}
      </tr>
      {renderFilterRow && (
        <tr role="row">
          {selectionEnabled && (
            <th
              aria-hidden="true"
              style={{
                padding: "0.375rem 0.75rem",
                borderBottom: `1px solid ${borderColor}`,
              }}
            />
          )}
          {ctx.expandable && (
            <th
              aria-hidden="true"
              style={{
                padding: "0.375rem 0.5rem",
                borderBottom: `1px solid ${borderColor}`,
              }}
            />
          )}
          {ctx.visibleColumns.map((col) => {
            const value = ctx.columnFilters[col.key] ?? "";
            if (col.filterable !== true) {
              return (
                <th
                  key={col.key}
                  aria-hidden="true"
                  style={{
                    padding: "0.375rem 0.75rem",
                    borderBottom: `1px solid ${borderColor}`,
                  }}
                />
              );
            }
            return (
              <th
                key={col.key}
                style={{
                  padding: "0.375rem 0.75rem",
                  borderBottom: `1px solid ${borderColor}`,
                }}
              >
                <input
                  type="text"
                  value={value}
                  onChange={(e) => ctx.setColumnFilter(col.key, e.target.value)}
                  placeholder="Filter..."
                  aria-label={`Filter ${col.key}`}
                  style={{
                    width: "100%",
                    padding: "0.25rem 0.5rem",
                    border: `1px solid ${borderColor}`,
                    borderRadius: "0.25rem",
                    background: theme === "dark" ? "#111827" : "#ffffff",
                    color: text,
                    fontSize: "0.8125rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </th>
            );
          })}
        </tr>
      )}
    </thead>
  );
}
