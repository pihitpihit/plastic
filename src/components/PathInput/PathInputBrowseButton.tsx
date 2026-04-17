import type { PathInputBrowseButtonProps } from "./PathInput.types";
import { usePathInputContext } from "./PathInputRoot";

export function PathInputBrowseButton({
  children,
  className = "",
  style,
  ...rest
}: PathInputBrowseButtonProps) {
  const ctx = usePathInputContext();

  return (
    <button
      type="button"
      disabled={ctx.disabled}
      onClick={ctx.triggerBrowse}
      className={[
        "inline-flex items-center justify-center rounded font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "px-4 py-2 text-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: ctx.theme === "dark" ? "#374151" : "#f3f4f6",
        color: ctx.theme === "dark" ? "#d1d5db" : "#374151",
        border: `1px solid ${ctx.theme === "dark" ? "#4b5563" : "#d1d5db"}`,
        whiteSpace: "nowrap",
        ...style,
      }}
      {...rest}
    >
      {children ?? "Browse"}
    </button>
  );
}
