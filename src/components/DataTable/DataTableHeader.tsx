import type { CSSProperties } from "react";
import { useDataTableContext } from "./DataTableContext";
import type { ColumnDef, HeaderContext, SortDirection } from "./DataTable.types";

export interface DataTableHeaderProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
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

export function DataTableHeader({ className, style }: DataTableHeaderProps) {
  const ctx = useDataTableContext();
  const theme = ctx.theme;
  const selectionEnabled = ctx.selectionMode !== "none";

  const bg = theme === "dark" ? "#1f2937" : "#f9fafb";
  const text = theme === "dark" ? "#f3f4f6" : "#111827";
  const iconIdle = theme === "dark" ? "#4b5563" : "#cbd5e1";
  const iconActive = theme === "dark" ? "#60a5fa" : "#3b82f6";
  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";

  const getSortDir = (key: string): SortDirection | undefined => {
    const item = ctx.sortState.find((s) => s.key === key);
    return item?.direction;
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
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
