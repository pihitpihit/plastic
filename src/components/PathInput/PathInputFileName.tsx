import type { PathInputFileNameProps } from "./PathInput.types";
import { usePathInputContext } from "./PathInputRoot";

export function PathInputFileName({
  placeholder = "No file selected",
  maxWidth = 200,
  className = "",
  style,
  ...rest
}: PathInputFileNameProps) {
  const ctx = usePathInputContext();
  const hasValue = ctx.value.length > 0;
  const displayName = hasValue ? ctx.value : placeholder;

  return (
    <span
      title={hasValue ? ctx.value : undefined}
      className={className}
      style={{
        display: "inline-block",
        maxWidth,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: "0.875rem",
        color: hasValue
          ? ctx.theme === "dark" ? "#e5e7eb" : "#111827"
          : ctx.theme === "dark" ? "#6b7280" : "#9ca3af",
        ...style,
      }}
      {...rest}
    >
      {displayName}
    </span>
  );
}
