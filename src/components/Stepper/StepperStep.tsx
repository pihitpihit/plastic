import { useCallback, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useStepperContext } from "./StepperContext";
import type {
  StepStatus,
  StepperStepProps,
  StepperTheme,
} from "./Stepper.types";

interface StepColorSet {
  bg: string;
  text: string;
  border: string;
  labelColor: string;
}

const STEP_STATE_COLORS: Record<StepperTheme, Record<StepStatus, StepColorSet>> = {
  light: {
    incomplete: {
      bg: "#f3f4f6",
      text: "#9ca3af",
      border: "#e5e7eb",
      labelColor: "#9ca3af",
    },
    current: {
      bg: "#3b82f6",
      text: "#ffffff",
      border: "#3b82f6",
      labelColor: "#3b82f6",
    },
    complete: {
      bg: "#22c55e",
      text: "#ffffff",
      border: "#22c55e",
      labelColor: "#16a34a",
    },
    error: {
      bg: "#fef2f2",
      text: "#ef4444",
      border: "#ef4444",
      labelColor: "#ef4444",
    },
    disabled: {
      bg: "#f9fafb",
      text: "#d1d5db",
      border: "#e5e7eb",
      labelColor: "#d1d5db",
    },
  },
  dark: {
    incomplete: {
      bg: "#374151",
      text: "#6b7280",
      border: "#4b5563",
      labelColor: "#6b7280",
    },
    current: {
      bg: "#3b82f6",
      text: "#ffffff",
      border: "#3b82f6",
      labelColor: "#60a5fa",
    },
    complete: {
      bg: "#16a34a",
      text: "#ffffff",
      border: "#16a34a",
      labelColor: "#4ade80",
    },
    error: {
      bg: "#7f1d1d",
      text: "#fca5a5",
      border: "#dc2626",
      labelColor: "#fca5a5",
    },
    disabled: {
      bg: "#1f2937",
      text: "#4b5563",
      border: "#374151",
      labelColor: "#4b5563",
    },
  },
};

export function StepperStep(props: StepperStepProps) {
  const {
    index,
    label,
    description,
    icon,
    completedIcon,
    errorIcon,
    className,
    style,
    ...rest
  } = props;
  const ctx = useStepperContext();

  const status = ctx.getStepStatus(index);
  const colors = STEP_STATE_COLORS[ctx.theme][status];
  const isHorizontal = ctx.orientation === "horizontal";

  const canClick =
    status !== "disabled" &&
    (ctx.linear
      ? ctx.completedSteps.has(index) ||
        index === ctx.activeStep ||
        index === ctx.activeStep - 1 ||
        index === ctx.activeStep + 1
      : true);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (status === "disabled") {
        e.preventDefault();
        return;
      }
      if (index === ctx.activeStep) return;
      void ctx.goToStep(index);
    },
    [ctx, index, status],
  );

  const indicatorSize = ctx.variant === "dots" ? (status === "current" ? 14 : 10) : 36;

  const indicatorStyle: CSSProperties =
    ctx.variant === "dots"
      ? {
          width: indicatorSize,
          height: indicatorSize,
          borderRadius: "50%",
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          transition:
            "width 200ms ease, height 200ms ease, background-color 200ms ease, border-color 200ms ease",
        }
      : {
          width: indicatorSize,
          height: indicatorSize,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.bg,
          color: colors.text,
          border: `2px solid ${colors.border}`,
          fontSize: 14,
          fontWeight: 600,
          transition:
            "background-color 200ms ease, border-color 200ms ease, color 200ms ease",
        };

  const buttonStyle: CSSProperties = isHorizontal
    ? {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        background: "none",
        border: "none",
        padding: 0,
        cursor: status === "disabled" ? "not-allowed" : canClick ? "pointer" : "default",
        color: colors.labelColor,
        ...style,
      }
    : {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        background: "none",
        border: "none",
        padding: 0,
        cursor: status === "disabled" ? "not-allowed" : canClick ? "pointer" : "default",
        color: colors.labelColor,
        ...style,
      };

  let indicatorContent: ReactNode = null;
  if (ctx.variant !== "dots") {
    if (status === "complete") {
      indicatorContent = completedIcon ?? <span>{index + 1}</span>;
    } else if (status === "error") {
      indicatorContent = errorIcon ?? <span>{index + 1}</span>;
    } else {
      indicatorContent = icon ?? <span>{index + 1}</span>;
    }
  }

  const labelBlock =
    ctx.variant === "dots" ? null : (
      <div
        style={
          isHorizontal
            ? { textAlign: "center" }
            : { display: "flex", flexDirection: "column", alignItems: "flex-start" }
        }
      >
        {label ? (
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: colors.labelColor,
              display: "block",
            }}
          >
            {label}
          </span>
        ) : null}
        {description ? (
          <span
            style={{
              fontSize: 11,
              color: ctx.theme === "dark" ? "#9ca3af" : "#6b7280",
              display: "block",
              marginTop: 2,
            }}
          >
            {description}
          </span>
        ) : null}
      </div>
    );

  return (
    <button
      type="button"
      role="tab"
      id={ctx.getStepId(index)}
      aria-selected={status === "current"}
      aria-controls={ctx.getPanelId(index)}
      aria-current={status === "current" ? "step" : undefined}
      aria-disabled={status === "disabled" ? true : undefined}
      aria-invalid={status === "error" ? true : undefined}
      data-status={status}
      tabIndex={status === "current" ? 0 : -1}
      className={className}
      style={buttonStyle}
      onClick={handleClick}
      {...rest}
    >
      <div style={indicatorStyle}>{indicatorContent}</div>
      {labelBlock}
    </button>
  );
}
