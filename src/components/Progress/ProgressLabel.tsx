import type { ProgressLabelProps } from "./Progress.types";
import { useProgressContext } from "./ProgressContext";

export function ProgressLabel(props: ProgressLabelProps) {
  const { placement, className, style, children } = props;
  const { shape, labelPlacement, size } = useProgressContext();

  const effective = placement ?? (labelPlacement === "none" ? "outside" : labelPlacement);

  if (shape === "circular") {
    const cls = ["plastic-progress__center", className ?? ""].filter(Boolean).join(" ");
    return (
      <div className={cls} {...(style ? { style } : {})}>
        {children}
      </div>
    );
  }

  if (effective === "inside" && size === "sm") {
    console.warn("[Progress] labelPlacement=\"inside\" is not supported for size=sm. Fallback to outside.");
  }
  const resolved = effective === "inside" && size === "sm" ? "outside" : effective;

  const cls = [
    "plastic-progress__label",
    resolved === "inside" ? "plastic-progress__label--inside" : "plastic-progress__label--outside",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...(style ? { style } : {})}>
      {children}
    </div>
  );
}

ProgressLabel.displayName = "Progress.Label";
