import type { PathInputStatusProps, PathInputTheme, ValidationState } from "./PathInput.types";
import { usePathInputContext } from "./PathInputRoot";

const statusTextColors: Record<PathInputTheme, Record<ValidationState["status"], string>> = {
  light: { idle: "#6b7280", valid: "#16a34a", invalid: "#dc2626", warning: "#d97706" },
  dark: { idle: "#9ca3af", valid: "#22c55e", invalid: "#ef4444", warning: "#f59e0b" },
};

function ValidIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function InvalidIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: "pathinput-spin 1s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function StatusIcon({ status }: { status: ValidationState["status"] }) {
  switch (status) {
    case "valid": return <ValidIcon />;
    case "invalid": return <InvalidIcon />;
    case "warning": return <WarningIcon />;
    default: return null;
  }
}

export function PathInputStatus({
  children: renderFn,
  className = "",
  style,
  ...rest
}: PathInputStatusProps) {
  const ctx = usePathInputContext();
  const { validationState, isValidating } = ctx;

  if (validationState.status === "idle" && !isValidating) return null;

  if (renderFn) {
    return (
      <div id={ctx.statusId} {...rest}>
        {renderFn(validationState)}
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes pathinput-spin{to{transform:rotate(360deg)}}`}</style>
      <div
        id={ctx.statusId}
        role="status"
        aria-live="polite"
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.375rem",
          fontSize: "0.8rem",
          marginTop: "0.375rem",
          color: statusTextColors[ctx.theme][isValidating ? "idle" : validationState.status],
          transition: "color 0.15s ease",
          ...style,
        }}
        {...rest}
      >
        {isValidating ? <SpinnerIcon /> : <StatusIcon status={validationState.status} />}
        <span>{isValidating ? "Validating..." : validationState.message}</span>
      </div>
    </>
  );
}
