import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { useDataTableContext } from "./DataTableContext";
import type { DataTableToolbarProps } from "./DataTable.types";

function ColumnsIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function SearchIcon({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function DataTableToolbar({
  showGlobalFilter = true,
  globalFilterPlaceholder,
  showColumnToggle = false,
  showSelectionCount = false,
  left,
  right,
  className,
  style,
  ...rest
}: DataTableToolbarProps & HTMLAttributes<HTMLDivElement>) {
  const ctx = useDataTableContext();
  const theme = ctx.theme;

  const [localValue, setLocalValue] = useState(ctx.globalFilter);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement | null>(null);
  const columnButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!columnMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        columnMenuRef.current?.contains(target) ||
        columnButtonRef.current?.contains(target)
      ) {
        return;
      }
      setColumnMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setColumnMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [columnMenuOpen]);

  useEffect(() => {
    setLocalValue(ctx.globalFilter);
  }, [ctx.globalFilter]);

  useEffect(() => {
    if (localValue === ctx.globalFilter) return;
    const id = setTimeout(() => {
      ctx.setGlobalFilter(localValue);
    }, 300);
    return () => clearTimeout(id);
  }, [localValue, ctx]);

  const text = theme === "dark" ? "#f3f4f6" : "#111827";
  const subText = theme === "dark" ? "#9ca3af" : "#6b7280";
  const borderColor = theme === "dark" ? "#374151" : "#d1d5db";
  const inputBg = theme === "dark" ? "#111827" : "#ffffff";

  return (
    <div
      role="toolbar"
      aria-label="Data table toolbar"
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem",
        borderBottom: `1px solid ${borderColor}`,
        color: text,
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flex: "1 1 auto",
          minWidth: 0,
        }}
      >
        {showGlobalFilter && (
          <div
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              maxWidth: "280px",
              flex: "1 1 240px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "8px",
                display: "inline-flex",
                pointerEvents: "none",
                color: subText,
              }}
            >
              <SearchIcon color={subText} />
            </span>
            <input
              type="search"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              placeholder={globalFilterPlaceholder ?? "Search..."}
              aria-label="Search table"
              style={{
                width: "100%",
                padding: "0.375rem 0.5rem 0.375rem 1.875rem",
                border: `1px solid ${borderColor}`,
                borderRadius: "0.375rem",
                background: inputBg,
                color: text,
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
        {left}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexShrink: 0,
        }}
      >
        {showSelectionCount && ctx.selectedKeys.size > 0 && (
          <span style={{ fontSize: "0.8125rem", color: subText }}>
            {ctx.selectedKeys.size}개 선택
          </span>
        )}
        {showColumnToggle && (
          <div style={{ position: "relative" }}>
            <button
              ref={columnButtonRef}
              type="button"
              onClick={() => setColumnMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={columnMenuOpen}
              aria-label="Toggle column visibility"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.375rem 0.625rem",
                border: `1px solid ${borderColor}`,
                borderRadius: "0.375rem",
                background: inputBg,
                color: text,
                fontSize: "0.8125rem",
                cursor: "pointer",
              }}
            >
              <ColumnsIcon color={subText} />
              <span>Columns</span>
            </button>
            {columnMenuOpen && (
              <div
                ref={columnMenuRef}
                role="menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  minWidth: "180px",
                  padding: "0.375rem",
                  border: `1px solid ${borderColor}`,
                  borderRadius: "0.375rem",
                  background: inputBg,
                  boxShadow:
                    theme === "dark"
                      ? "0 4px 12px rgba(0,0,0,0.4)"
                      : "0 4px 12px rgba(0,0,0,0.12)",
                  zIndex: 10,
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                {ctx.columns.map((col) => {
                  const isHidden = ctx.hiddenColumns.has(col.key);
                  const labelText =
                    typeof col.header === "string" ? col.header : col.key;
                  return (
                    <label
                      key={col.key}
                      role="menuitemcheckbox"
                      aria-checked={!isHidden}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.375rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.8125rem",
                        color: text,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLLabelElement).style.background =
                          theme === "dark" ? "#1f2937" : "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLLabelElement).style.background =
                          "transparent";
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => ctx.toggleColumnVisibility(col.key)}
                        style={{ cursor: "pointer" }}
                      />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {labelText}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {right}
      </div>
    </div>
  );
}
