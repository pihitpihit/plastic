import type { HTMLAttributes } from "react";
import { useDataTableContext } from "./DataTableContext";
import type { DataTablePaginationProps } from "./DataTable.types";

function buildPageRange(
  current: number,
  total: number,
  sibling: number,
): (number | "...")[] {
  if (total <= 1) return [1];
  const firstPage = 1;
  const lastPage = total;
  const pages = new Set<number>();
  pages.add(firstPage);
  pages.add(lastPage);
  for (let i = current - sibling; i <= current + sibling; i++) {
    if (i >= firstPage && i <= lastPage) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    if (i > 0) {
      const prev = sorted[i - 1]!;
      if (cur - prev > 1) result.push("...");
    }
    result.push(cur);
  }
  return result;
}

export function DataTablePagination({
  showPageSizeOptions = true,
  pageSizeOptions = [10, 20, 50, 100],
  showTotal = true,
  siblingCount = 1,
  className,
  style,
  ...rest
}: DataTablePaginationProps & HTMLAttributes<HTMLDivElement>) {
  const ctx = useDataTableContext();
  const theme = ctx.theme;

  if (!ctx.pagination) return null;

  const { page, pageSize } = ctx.pagination;
  const total = ctx.totalFilteredCount;
  const totalPages = ctx.totalPages;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const text = theme === "dark" ? "#f3f4f6" : "#111827";
  const subText = theme === "dark" ? "#9ca3af" : "#6b7280";
  const borderColor = theme === "dark" ? "#374151" : "#d1d5db";
  const bg = theme === "dark" ? "#111827" : "#ffffff";
  const hoverBg = theme === "dark" ? "#1f2937" : "#f3f4f6";
  const activeBg = theme === "dark" ? "#2563eb" : "#3b82f6";
  const activeText = "#ffffff";

  const goTo = (p: number) => {
    const clamped = Math.max(1, Math.min(totalPages, p));
    ctx.setPagination({ page: clamped, pageSize });
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageRange = buildPageRange(page, totalPages, siblingCount);

  const btnBase: React.CSSProperties = {
    minWidth: "28px",
    height: "28px",
    padding: "0 0.5rem",
    border: `1px solid ${borderColor}`,
    borderRadius: "0.25rem",
    background: bg,
    color: text,
    fontSize: "0.8125rem",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      role="navigation"
      aria-label="Pagination"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem",
        borderTop: `1px solid ${borderColor}`,
        color: text,
        flexWrap: "wrap",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontSize: "0.8125rem",
          color: subText,
        }}
      >
        {showTotal && (
          <span>
            {total === 0 ? "0 of 0" : `${start}-${end} of ${total}`}
          </span>
        )}
        {showPageSizeOptions && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) =>
                ctx.setPagination({ page: 1, pageSize: Number(e.target.value) })
              }
              aria-label="Rows per page"
              style={{
                padding: "0.25rem 0.375rem",
                border: `1px solid ${borderColor}`,
                borderRadius: "0.25rem",
                background: bg,
                color: text,
                fontSize: "0.8125rem",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={!canPrev}
          aria-label="Previous page"
          style={{
            ...btnBase,
            opacity: canPrev ? 1 : 0.5,
            cursor: canPrev ? "pointer" : "not-allowed",
          }}
        >
          ‹
        </button>
        {pageRange.map((p, i) => {
          if (p === "...") {
            return (
              <span
                key={`ellipsis-${i}`}
                style={{
                  minWidth: "20px",
                  textAlign: "center",
                  color: subText,
                  fontSize: "0.8125rem",
                }}
                aria-hidden="true"
              >
                …
              </span>
            );
          }
          const isActive = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              aria-current={isActive ? "page" : undefined}
              aria-label={`Page ${p}`}
              style={{
                ...btnBase,
                background: isActive ? activeBg : bg,
                color: isActive ? activeText : text,
                borderColor: isActive ? activeBg : borderColor,
                fontWeight: isActive ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLButtonElement).style.background = bg;
              }}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={!canNext}
          aria-label="Next page"
          style={{
            ...btnBase,
            opacity: canNext ? 1 : 0.5,
            cursor: canNext ? "pointer" : "not-allowed",
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
