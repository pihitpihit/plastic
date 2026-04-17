import { useRef, useState, useCallback } from "react";
import type { TriggerChildProps } from "./Actionable.types";
import { useActionablePointer } from "./useActionablePointer";

interface DragOutTriggerProps extends TriggerChildProps {
  dragThreshold: number;
  onDragThreshold?: ((crossed: boolean) => void) | undefined;
  dragZoneLabel?: string | undefined;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

export function ActionableDragOutTrigger({
  children,
  actions,
  theme,
  phase,
  disabled,
  onExecuteAction,
  dragThreshold,
  onDragThreshold,
  dragZoneLabel,
}: DragOutTriggerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [overThreshold, setOverThreshold] = useState(false);
  const crossedRef = useRef(false);
  const label = dragZoneLabel ?? actions[0]?.label ?? "Remove";

  const { onPointerDown } = useActionablePointer({
    axis: "both",
    onStart: () => {
      if (disabled || phase === "executing" || phase === "dismissing") return false;
      setIsDragging(true);
      crossedRef.current = false;
      if (contentRef.current) {
        contentRef.current.style.transition = "none";
      }
      return true;
    },
    onMove: (_e, { dx, dy }) => {
      if (!contentRef.current) return;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const progress = Math.min(1, dist / dragThreshold);
      const s = lerp(1, 0.95, progress);
      const o = lerp(1, 0.5, progress);
      contentRef.current.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
      contentRef.current.style.opacity = String(o);

      const crossed = dist >= dragThreshold;
      if (crossed !== crossedRef.current) {
        crossedRef.current = crossed;
        setOverThreshold(crossed);
        onDragThreshold?.(crossed);
      }
    },
    onEnd: (_e, { dx, dy }) => {
      setIsDragging(false);
      if (!contentRef.current) return;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= dragThreshold && actions.length > 0) {
        onExecuteAction(actions[0]!.key);
      } else {
        contentRef.current.style.transition =
          "transform 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 300ms ease";
        contentRef.current.style.transform = "translate(0, 0) scale(1)";
        contentRef.current.style.opacity = "1";
      }
      setOverThreshold(false);
      crossedRef.current = false;
    },
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (actions.length > 0) {
          onExecuteAction(actions[0]!.key);
        }
      }
    },
    [actions, onExecuteAction],
  );

  const zoneColor = overThreshold
    ? theme === "dark"
      ? "rgba(239,68,68,0.25)"
      : "rgba(239,68,68,0.12)"
    : theme === "dark"
      ? "rgba(255,255,255,0.04)"
      : "rgba(0,0,0,0.03)";

  const zoneBorder = overThreshold
    ? theme === "dark"
      ? "rgba(239,68,68,0.5)"
      : "rgba(239,68,68,0.4)"
    : theme === "dark"
      ? "rgba(255,255,255,0.1)"
      : "rgba(0,0,0,0.08)";

  const zoneTextColor = overThreshold
    ? theme === "dark"
      ? "rgba(252,165,165,0.9)"
      : "rgba(185,28,28,0.8)"
    : theme === "dark"
      ? "rgba(255,255,255,0.2)"
      : "rgba(0,0,0,0.15)";

  return (
    <div
      role="group"
      aria-roledescription="draggable item"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ position: "relative" }}
    >
      <div
        ref={contentRef}
        onPointerDown={onPointerDown}
        style={{
          position: "relative",
          zIndex: 2,
          cursor: "grab",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {children}
      </div>

      {/* Drop zone indicator */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "0.5rem",
          border: `2px dashed ${zoneBorder}`,
          background: zoneColor,
          color: zoneTextColor,
          fontSize: "0.8rem",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          fontWeight: 600,
          opacity: isDragging ? 1 : 0,
          transition: "opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
          pointerEvents: "none",
        }}
      >
        {overThreshold ? label : ""}
      </div>
    </div>
  );
}
