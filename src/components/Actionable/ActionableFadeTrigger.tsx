import { useState, useCallback } from "react";
import type { TriggerChildProps } from "./Actionable.types";
import { ActionableActionButton } from "./ActionableActionButton";

interface FadeTriggerProps extends TriggerChildProps {
  fadeDuration: number;
  fadePosition: "top" | "bottom" | "center";
}

const overlayPosition: Record<string, React.CSSProperties> = {
  top:    { top: 0, left: 0, right: 0, alignItems: "flex-start", paddingTop: "0.5rem" },
  bottom: { bottom: 0, left: 0, right: 0, alignItems: "flex-end", paddingBottom: "0.5rem" },
  center: { top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
};

const backdropColors = {
  light: "rgba(255,255,255,0.82)",
  dark:  "rgba(17,24,39,0.82)",
} as const;

export function ActionableFadeTrigger({
  children,
  actions,
  theme,
  phase,
  disabled,
  onExecuteAction,
  fadeDuration,
  fadePosition,
}: FadeTriggerProps) {
  const [visible, setVisible] = useState(false);
  const [touchToggled, setTouchToggled] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => {
    setVisible(false);
    setTouchToggled(false);
  }, []);

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      show();
    },
    [show],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!touchToggled) hide();
    },
    [hide, touchToggled],
  );

  const handleTap = useCallback(() => {
    setTouchToggled((prev) => !prev);
    setVisible((prev) => !prev);
  }, []);

  const isVisible = visible || touchToggled;

  return (
    <div
      style={{ position: "relative", overflow: "hidden" }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) hide();
      }}
    >
      {children}
      <div
        role="toolbar"
        aria-label="Actions"
        aria-hidden={!isVisible}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[role=toolbar]") === e.currentTarget) {
            handleTap();
          }
        }}
        style={{
          position: "absolute",
          display: "flex",
          gap: "0.35rem",
          padding: "0.5rem",
          justifyContent: "center",
          ...overlayPosition[fadePosition],
          background: backdropColors[theme],
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? "auto" : "none",
          transition: `opacity ${fadeDuration}ms ease`,
          zIndex: 5,
        }}
      >
        {actions.map((action) => (
          <ActionableActionButton
            key={action.key}
            action={action}
            theme={theme}
            onClick={() => onExecuteAction(action.key)}
            disabled={disabled || phase === "executing" || phase === "dismissing"}
            mode="fade"
          />
        ))}
      </div>
    </div>
  );
}
