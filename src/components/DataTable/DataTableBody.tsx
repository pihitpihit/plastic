import type { CSSProperties, ReactNode } from "react";
import { useDataTableContext } from "./DataTableContext";
import { DataTableRow } from "./DataTableRow";
import { DataTableEmpty } from "./DataTableEmpty";

export interface DataTableBodyProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  emptyState?: ReactNode | undefined;
}

export function DataTableBody({
  className,
  style,
  emptyState,
}: DataTableBodyProps) {
  const ctx = useDataTableContext();
  const rows = ctx.processedData;
  const extraCols =
    (ctx.selectionMode !== "none" ? 1 : 0) + (ctx.expandable ? 1 : 0);
  const totalColSpan = extraCols + ctx.visibleColumns.length;

  if (rows.length === 0) {
    return (
      <tbody role="rowgroup" className={className} style={style}>
        <tr role="row">
          <td colSpan={totalColSpan} style={{ padding: 0 }}>
            {emptyState ?? ctx.emptyState ?? <DataTableEmpty />}
          </td>
        </tr>
      </tbody>
    );
  }

  if (ctx.virtualEnabled) {
    const start = ctx.virtualStartIndex;
    const end = ctx.virtualEndIndex;
    const visibleRows = rows.slice(start, end);

    return (
      <tbody role="rowgroup" className={className} style={style}>
        {ctx.virtualPaddingTop > 0 && (
          <tr
            aria-hidden="true"
            style={{ height: `${ctx.virtualPaddingTop}px` }}
          >
            <td colSpan={totalColSpan} style={{ padding: 0, border: "none" }} />
          </tr>
        )}
        {visibleRows.map((row, i) => {
          const absoluteIndex = start + i;
          const key = ctx.rowKey(row, absoluteIndex);
          return (
            <DataTableRow
              key={key}
              row={row}
              rowIndex={absoluteIndex}
              rowKey={key}
              style={{ height: `${ctx.rowHeight}px` }}
            />
          );
        })}
        {ctx.virtualPaddingBottom > 0 && (
          <tr
            aria-hidden="true"
            style={{ height: `${ctx.virtualPaddingBottom}px` }}
          >
            <td colSpan={totalColSpan} style={{ padding: 0, border: "none" }} />
          </tr>
        )}
      </tbody>
    );
  }

  return (
    <tbody role="rowgroup" className={className} style={style}>
      {rows.map((row, index) => {
        const key = ctx.rowKey(row, index);
        return (
          <DataTableRow
            key={key}
            row={row}
            rowIndex={index}
            rowKey={key}
          />
        );
      })}
    </tbody>
  );
}
