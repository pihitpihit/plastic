import type { ActionableAction, ActionableTheme } from "./Actionable.types";

const variantColors: Record<
  NonNullable<ActionableAction["variant"]>,
  Record<ActionableTheme, { bg: string; text: string; hoverBg: string }>
> = {
  default: {
    light: { bg: "transparent", text: "#374151", hoverBg: "rgba(0,0,0,0.06)" },
    dark:  { bg: "transparent", text: "#d1d5db", hoverBg: "rgba(255,255,255,0.08)" },
  },
  danger: {
    light: { bg: "transparent", text: "#dc2626", hoverBg: "rgba(220,38,38,0.08)" },
    dark:  { bg: "transparent", text: "#f87171", hoverBg: "rgba(248,113,113,0.12)" },
  },
  warning: {
    light: { bg: "transparent", text: "#d97706", hoverBg: "rgba(217,119,6,0.08)" },
    dark:  { bg: "transparent", text: "#fbbf24", hoverBg: "rgba(251,191,36,0.12)" },
  },
};

const swipeVariantColors: Record<
  NonNullable<ActionableAction["variant"]>,
  Record<ActionableTheme, { bg: string; text: string }>
> = {
  default: {
    light: { bg: "#6b7280", text: "#ffffff" },
    dark:  { bg: "#4b5563", text: "#ffffff" },
  },
  danger: {
    light: { bg: "#dc2626", text: "#ffffff" },
    dark:  { bg: "#b91c1c", text: "#ffffff" },
  },
  warning: {
    light: { bg: "#d97706", text: "#ffffff" },
    dark:  { bg: "#b45309", text: "#ffffff" },
  },
};

interface ActionButtonProps {
  action: ActionableAction;
  theme: ActionableTheme;
  onClick: () => void;
  disabled?: boolean;
  mode?: "icon" | "swipe" | "fade";
  confirmLabel?: string | null;
}

export function ActionableActionButton({
  action,
  theme,
  onClick,
  disabled,
  mode = "icon",
  confirmLabel,
}: ActionButtonProps) {
  const variant = action.variant ?? "default";
  const isConfirming = confirmLabel != null;
  const effectiveVariant = isConfirming ? "danger" : variant;

  if (mode === "swipe") {
    const colors = swipeVariantColors[effectiveVariant][theme];
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || action.disabled}
        aria-label={confirmLabel ?? action.label}
        title={confirmLabel ?? action.label}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.25rem",
          width: "4.5rem",
          height: "100%",
          border: "none",
          cursor: disabled || action.disabled ? "default" : "pointer",
          opacity: disabled || action.disabled ? 0.4 : 1,
          background: colors.bg,
          color: colors.text,
          fontSize: "0.7rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontWeight: 500,
          padding: "0.5rem 0.25rem",
          transition: "opacity 0.15s ease",
        }}
      >
        {action.icon && <span style={{ fontSize: "1.1rem" }}>{action.icon}</span>}
        <span>{confirmLabel ?? action.label}</span>
      </button>
    );
  }

  const colors = variantColors[effectiveVariant][theme];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || action.disabled}
      aria-label={confirmLabel ?? action.label}
      title={confirmLabel ?? action.label}
      className="transition-colors"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.25rem",
        border: "none",
        borderRadius: "0.25rem",
        cursor: disabled || action.disabled ? "default" : "pointer",
        opacity: disabled || action.disabled ? 0.4 : 1,
        background: colors.bg,
        color: colors.text,
        padding: isConfirming ? "0.25rem 0.5rem" : "0.25rem",
        fontSize: isConfirming ? "0.7rem" : "0.85rem",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        fontWeight: isConfirming ? 600 : 400,
        lineHeight: 1,
        minWidth: "1.5rem",
        minHeight: "1.5rem",
        whiteSpace: "nowrap",
        transition: "background 0.15s ease, color 0.15s ease, padding 0.15s ease",
      }}
      onMouseEnter={(e) => {
        if (!disabled && !action.disabled)
          e.currentTarget.style.background = colors.hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.bg;
      }}
    >
      {action.icon && !isConfirming && <span>{action.icon}</span>}
      {isConfirming && <span>{confirmLabel}</span>}
    </button>
  );
}
