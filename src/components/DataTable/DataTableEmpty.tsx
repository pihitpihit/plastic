import type { HTMLAttributes, ReactNode } from "react";
import { useDataTableContext } from "./DataTableContext";

export interface DataTableEmptyProps extends HTMLAttributes<HTMLDivElement> {
  message?: string | undefined;
  icon?: ReactNode | undefined;
  className?: string | undefined;
}

function EmptyIcon({ theme }: { theme: "light" | "dark" }) {
  const color = theme === "dark" ? "#6b7280" : "#9ca3af";
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

export function DataTableEmpty({
  message,
  icon,
  className,
  style,
  children,
  ...rest
}: DataTableEmptyProps) {
  const ctx = useDataTableContext();
  const theme = ctx.theme;
  const text = message ?? "표시할 데이터가 없습니다";
  const textColor = theme === "dark" ? "#9ca3af" : "#6b7280";

  return (
    <div
      role="status"
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "3rem 1rem",
        color: textColor,
        fontSize: "0.875rem",
        ...style,
      }}
      {...rest}
    >
      {children ?? (
        <>
          {icon ?? <EmptyIcon theme={theme} />}
          <span>{text}</span>
        </>
      )}
    </div>
  );
}
