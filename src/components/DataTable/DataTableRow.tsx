import { Fragment, useState } from "react";
import type { CSSProperties, MouseEvent, ChangeEvent } from "react";
import { useDataTableContext } from "./DataTableContext";
import type { ColumnDef } from "./DataTable.types";

export interface DataTableRowProps<T = unknown> {
  row: T;
  rowIndex: number;
  rowKey: string | number;
  columns?: ColumnDef<T>[] | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

function getRowBg(
  theme: "light" | "dark",
  isHover: boolean,
  isSelected: boolean,
  isAlternating: boolean,
): string {
  if (theme === "dark") {
    if (isSelected) return "rgba(96,165,250,0.18)";
    if (isHover) return "#1f2937";
    if (isAlternating) return "#111827";
    return "transparent";
  }
  if (isSelected) return "rgba(59,130,246,0.12)";
  if (isHover) return "#f3f4f6";
  if (isAlternating) return "#f9fafb";
  return "transparent";
}

function getCellAlign(align: ColumnDef<unknown>["align"]): CSSProperties["textAlign"] {
  return align ?? "left";
}

function ExpandIcon({ expanded, color }: { expanded: boolean; color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.15s ease",
      }}
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function DataTableRow<T = unknown>(props: DataTableRowProps<T>) {
  const { row, rowIndex, rowKey, className, style } = props;
  const ctx = useDataTableContext<T>();
  const cols = props.columns ?? ctx.visibleColumns;
  const [isHover, setIsHover] = useState(false);

  const isSelected = ctx.selectedKeys.has(rowKey);
  const isExpanded = ctx.expandedKeys.has(rowKey);
  const isAlternating = ctx.alternatingRows && rowIndex % 2 === 1;
  const theme = ctx.theme;
  const selectionEnabled = ctx.selectionMode !== "none";

  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#f3f4f6" : "#111827";
  const iconColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    ctx.onRowClick?.(row, rowIndex, e);
  };
  const handleDoubleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    ctx.onRowDoubleClick?.(row, rowIndex, e);
  };

  const handleSelectionChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    ctx.toggleRowSelection(rowKey);
  };
  const handleExpandToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    ctx.toggleRowExpansion(rowKey);
  };

  const extraColSpan =
    (selectionEnabled ? 1 : 0) + (ctx.expandable ? 1 : 0) + cols.length;

  return (
    <Fragment>
      <tr
        role="row"
        aria-selected={isSelected || undefined}
        className={className}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{
          background: getRowBg(theme, isHover, isSelected, isAlternating),
          color: textColor,
          cursor: ctx.onRowClick ? "pointer" : "default",
          transition: "background-color 0.12s ease",
          ...style,
        }}
      >
        {selectionEnabled && (
          <td
            role="cell"
            style={{
              padding: "0.625rem 0.75rem",
              borderBottom: `1px solid ${borderColor}`,
              width: "40px",
              textAlign: "center",
              verticalAlign: "middle",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleSelectionChange}
              aria-label={`Select row ${rowIndex + 1}`}
              style={{ cursor: "pointer" }}
            />
          </td>
        )}
        {ctx.expandable && (
          <td
            role="cell"
            style={{
              padding: "0.625rem 0.5rem",
              borderBottom: `1px solid ${borderColor}`,
              width: "36px",
              textAlign: "center",
              verticalAlign: "middle",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleExpandToggle}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse row" : "Expand row"}
              style={{
                background: "transparent",
                border: "none",
                padding: "4px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "4px",
              }}
            >
              <ExpandIcon expanded={isExpanded} color={iconColor} />
            </button>
          </td>
        )}
        {cols.map((col) => {
          const width = ctx.columnWidths[col.key] ?? col.width;
          return (
            <td
              key={col.key}
              role="cell"
              className={col.cellClassName}
              style={{
                padding: "0.625rem 0.75rem",
                borderBottom: `1px solid ${borderColor}`,
                textAlign: getCellAlign(col.align),
                width: width,
                minWidth: col.minWidth,
                maxWidth: col.maxWidth,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                verticalAlign: "middle",
              }}
            >
              {col.cell(row, rowIndex)}
            </td>
          );
        })}
      </tr>
      {ctx.expandable && isExpanded && ctx.renderExpandedRow && (
        <tr role="row" aria-hidden={false}>
          <td
            colSpan={extraColSpan}
            style={{
              padding: "0.75rem 1rem",
              borderBottom: `1px solid ${borderColor}`,
              background: theme === "dark" ? "#0f172a" : "#f9fafb",
              color: textColor,
            }}
          >
            {ctx.renderExpandedRow(row, rowIndex)}
          </td>
        </tr>
      )}
    </Fragment>
  );
}
