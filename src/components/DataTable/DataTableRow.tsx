import { useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
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

export function DataTableRow<T = unknown>(props: DataTableRowProps<T>) {
  const { row, rowIndex, rowKey, className, style } = props;
  const ctx = useDataTableContext<T>();
  const cols = props.columns ?? ctx.visibleColumns;
  const [isHover, setIsHover] = useState(false);

  const isSelected = ctx.selectedKeys.has(rowKey);
  const isAlternating = ctx.alternatingRows && rowIndex % 2 === 1;
  const theme = ctx.theme;

  const borderColor = theme === "dark" ? "#374151" : "#e5e7eb";
  const textColor = theme === "dark" ? "#f3f4f6" : "#111827";

  const handleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    ctx.onRowClick?.(row, rowIndex, e);
  };
  const handleDoubleClick = (e: MouseEvent<HTMLTableRowElement>) => {
    ctx.onRowDoubleClick?.(row, rowIndex, e);
  };

  return (
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
  );
}
