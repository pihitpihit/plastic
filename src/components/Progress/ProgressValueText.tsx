import type { ProgressValueTextProps } from "./Progress.types";
import { useProgressContext } from "./ProgressContext";

export function ProgressValueText(props: ProgressValueTextProps) {
  const { format, className, style } = props;
  const { mode, value, max, formatLabel, shape, labelPlacement, size } = useProgressContext();

  if (mode === "indeterminate") return null;
  if (value == null) return null;

  const fn = format ?? formatLabel;
  const content = fn(value, max);

  if (shape === "circular") {
    const cls = ["plastic-progress__center", className ?? ""].filter(Boolean).join(" ");
    return (
      <div className={cls} {...(style ? { style } : {})}>
        {content}
      </div>
    );
  }

  const effectivePlacement =
    labelPlacement === "inside" && size !== "sm" ? "inside" : "outside";

  const cls = [
    "plastic-progress__value-text",
    effectivePlacement === "inside"
      ? "plastic-progress__value-text--inside"
      : "plastic-progress__value-text--outside",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={cls} {...(style ? { style } : {})}>
      {content}
    </span>
  );
}

ProgressValueText.displayName = "Progress.ValueText";
