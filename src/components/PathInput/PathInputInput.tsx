import { useState, useCallback } from "react";
import type { PathInputInputProps, PathInputTheme, ValidationState } from "./PathInput.types";
import { usePathInputContext } from "./PathInputRoot";

const inputBg: Record<PathInputTheme, string> = {
  light: "#ffffff",
  dark: "#1f2937",
};

const inputText: Record<PathInputTheme, string> = {
  light: "#111827",
  dark: "#f3f4f6",
};

const borderColors: Record<PathInputTheme, Record<ValidationState["status"], string>> = {
  light: { idle: "#d1d5db", valid: "#22c55e", invalid: "#ef4444", warning: "#f59e0b" },
  dark: { idle: "#4b5563", valid: "#16a34a", invalid: "#dc2626", warning: "#d97706" },
};

const dragOverBg: Record<PathInputTheme, string> = {
  light: "rgba(59,130,246,0.04)",
  dark: "rgba(96,165,250,0.06)",
};

const DRAG_OVER_BORDER = "#3b82f6";

export function PathInputInput({
  className = "",
  style,
  placeholder,
  ...rest
}: PathInputInputProps) {
  const ctx = usePathInputContext();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCount, setDragCount] = useState(0);

  const borderColor = isDragOver
    ? DRAG_OVER_BORDER
    : borderColors[ctx.theme][ctx.validationState.status];

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (ctx.disabled) return;
      setDragCount((c) => c + 1);
      setIsDragOver(true);
    },
    [ctx.disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (ctx.disabled) return;
      e.dataTransfer.dropEffect = "copy";
    },
    [ctx.disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setDragCount((c) => {
      const next = c - 1;
      if (next <= 0) setIsDragOver(false);
      return Math.max(0, next);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLInputElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      setDragCount(0);
      if (ctx.disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      ctx.setFiles(droppedFiles);
      ctx.onFilesSelected?.(droppedFiles);

      const file = droppedFiles[0]!;
      const path = file.webkitRelativePath || file.name;

      if (ctx.multiple && droppedFiles.length > 1) {
        ctx.setValue(droppedFiles.map((f) => f.webkitRelativePath || f.name).join(", "));
      } else {
        ctx.setValue(path);
      }
    },
    [ctx],
  );

  return (
    <input
      type="text"
      value={ctx.value}
      disabled={ctx.disabled}
      placeholder={placeholder}
      onChange={(e) => ctx.setValue(e.target.value)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-invalid={ctx.validationState.status === "invalid" || undefined}
      aria-describedby={ctx.statusId}
      className={className}
      style={{
        width: "100%",
        border: `1px solid ${borderColor}`,
        borderStyle: isDragOver ? "dashed" : "solid",
        borderRadius: "0.375rem",
        padding: "0.5rem 0.75rem",
        fontSize: "0.875rem",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        lineHeight: 1.5,
        background: isDragOver ? dragOverBg[ctx.theme] : inputBg[ctx.theme],
        color: inputText[ctx.theme],
        outline: "none",
        transition: "border-color 0.15s ease, background-color 0.15s ease",
        ...style,
      }}
      {...rest}
    />
  );
}
