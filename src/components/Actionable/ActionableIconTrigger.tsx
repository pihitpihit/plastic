import { useEffect, useRef, useCallback } from "react";
import type { TriggerChildProps, ActionableTheme } from "./Actionable.types";
import { ActionableActionButton } from "./ActionableActionButton";
import { useControllable } from "../_shared/useControllable";

interface IconTriggerProps extends TriggerChildProps {
  confirm: boolean;
  iconPosition: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  iconShowOnHover: boolean;
  confirmTimeout: number;
  confirmingAction?: string | null | undefined;
  onConfirmChange?: ((actionKey: string | null) => void) | undefined;
}

const positionStyle: Record<string, React.CSSProperties> = {
  "top-right":    { top: "0.35rem", right: "0.35rem" },
  "top-left":     { top: "0.35rem", left: "0.35rem" },
  "bottom-right": { bottom: "0.35rem", right: "0.35rem" },
  "bottom-left":  { bottom: "0.35rem", left: "0.35rem" },
};

export function ActionableIconTrigger({
  children,
  actions,
  theme,
  phase,
  disabled,
  onExecuteAction,
  confirm: isConfirmMode,
  iconPosition,
  iconShowOnHover,
  confirmTimeout,
  confirmingAction,
  onConfirmChange,
}: IconTriggerProps) {
  const [confirmingKey, setConfirmingKey] = useControllable<string | null>(
    confirmingAction,
    null,
    onConfirmChange,
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearConfirmTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetConfirm = useCallback(() => {
    clearConfirmTimer();
    setConfirmingKey(null);
  }, [clearConfirmTimer, setConfirmingKey]);

  useEffect(() => {
    if (!confirmingKey) return;
    clearConfirmTimer();
    timeoutRef.current = setTimeout(resetConfirm, confirmTimeout);
    return clearConfirmTimer;
  }, [confirmingKey, confirmTimeout, resetConfirm, clearConfirmTimer]);

  useEffect(() => {
    if (!confirmingKey) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        resetConfirm();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetConfirm();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [confirmingKey, resetConfirm]);

  const handleClick = (actionKey: string) => {
    if (disabled || phase === "executing" || phase === "dismissing") return;
    const action = actions.find((a) => a.key === actionKey);
    if (!action || action.disabled) return;

    if (isConfirmMode && action.confirm) {
      if (confirmingKey === actionKey) {
        resetConfirm();
        onExecuteAction(actionKey);
      } else {
        setConfirmingKey(actionKey);
      }
    } else {
      onExecuteAction(actionKey);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {children}
      <div
        role="toolbar"
        aria-label="Actions"
        className="actionable-icon-toolbar"
        style={{
          position: "absolute",
          ...positionStyle[iconPosition],
          display: "flex",
          gap: "0.15rem",
          zIndex: 5,
          ...(iconShowOnHover
            ? {
                opacity: 0,
                pointerEvents: "none",
                transition: "opacity 0.15s ease",
              }
            : {}),
        }}
      >
        {actions.map((action) => {
          const isThisConfirming = confirmingKey === action.key;
          const confirmLabel = isThisConfirming
            ? typeof action.confirm === "string"
              ? action.confirm
              : `${action.label}?`
            : null;
          return (
            <ActionableActionButton
              key={action.key}
              action={action}
              theme={theme}
              onClick={() => handleClick(action.key)}
              disabled={disabled || phase === "executing" || phase === "dismissing"}
              mode="icon"
              confirmLabel={confirmLabel}
            />
          );
        })}
      </div>
      {iconShowOnHover && <HoverStyle />}
      {confirmingKey && (
        <div role="status" aria-live="assertive" className="sr-only">
          한 번 더 클릭하면 실행됩니다
        </div>
      )}
    </div>
  );
}

function HoverStyle() {
  return (
    <style>{`
      .actionable-icon-toolbar {
        opacity: 0;
        pointer-events: none;
      }
      *:hover > .actionable-icon-toolbar,
      *:focus-within > .actionable-icon-toolbar {
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    `}</style>
  );
}
