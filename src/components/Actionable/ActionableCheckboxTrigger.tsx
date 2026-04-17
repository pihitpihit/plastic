import type { TriggerChildProps } from "./Actionable.types";
import { useControllable } from "../_shared/useControllable";

interface CheckboxTriggerProps extends TriggerChildProps {
  selected?: boolean | undefined;
  defaultSelected: boolean;
  onSelectedChange?: ((selected: boolean) => void) | undefined;
  checkboxPosition: "left" | "right";
}

const selectedBg = {
  light: "rgba(59,130,246,0.06)",
  dark:  "rgba(96,165,250,0.08)",
} as const;

export function ActionableCheckboxTrigger({
  children,
  theme,
  disabled,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  checkboxPosition,
}: CheckboxTriggerProps) {
  const [selected, setSelected] = useControllable(
    selectedProp,
    defaultSelected,
    onSelectedChange,
  );

  const checkbox = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 0.5rem",
        flexShrink: 0,
      }}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={(e) => setSelected(e.target.checked)}
        aria-label="Select item"
        style={{
          width: "1rem",
          height: "1rem",
          cursor: disabled ? "default" : "pointer",
          accentColor: theme === "dark" ? "#60a5fa" : "#3b82f6",
        }}
      />
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: checkboxPosition === "right" ? "row-reverse" : "row",
        alignItems: "stretch",
        transition: "background 0.15s ease",
        background: selected ? selectedBg[theme] : "transparent",
        borderRadius: "0.25rem",
      }}
      aria-selected={selected}
    >
      {checkbox}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}
