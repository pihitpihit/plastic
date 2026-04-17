import { useRef, useCallback } from "react";
import type { TriggerChildProps } from "./Actionable.types";
import { ActionableActionButton } from "./ActionableActionButton";
import { useControllable } from "./useControllable";
import { useActionablePointer } from "./useActionablePointer";

interface SwipeTriggerProps extends TriggerChildProps {
  swipeOpen?: boolean | undefined;
  onSwipeOpenChange?: ((open: boolean) => void) | undefined;
  swipeThreshold: number;
  swipeDirection: "left" | "right";
}

const ACTION_BUTTON_WIDTH = 72;

export function ActionableSwipeTrigger({
  children,
  actions,
  theme,
  phase,
  disabled,
  onExecuteAction,
  swipeOpen,
  onSwipeOpenChange,
  swipeThreshold,
  swipeDirection,
}: SwipeTriggerProps) {
  const [isOpen, setIsOpen] = useControllable(swipeOpen, false, onSwipeOpenChange);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const panelWidth = actions.length * ACTION_BUTTON_WIDTH;
  const dirSign = swipeDirection === "left" ? -1 : 1;

  const clampOffset = useCallback(
    (raw: number) => {
      const max = panelWidth;
      const abs = Math.abs(raw);
      if (abs <= max) return raw;
      return Math.sign(raw) * (max + (abs - max) * 0.3);
    },
    [panelWidth],
  );

  const { onPointerDown } = useActionablePointer({
    axis: "x",
    onStart: () => {
      if (disabled || phase === "executing" || phase === "dismissing") return false;
      dragging.current = true;
      if (contentRef.current) {
        contentRef.current.style.transition = "none";
      }
      return true;
    },
    onMove: (_e, { dx }) => {
      if (!contentRef.current) return;
      const base = isOpen ? -dirSign * panelWidth : 0;
      const raw = base + dx;
      const sign = dirSign;
      const clamped =
        sign === -1
          ? Math.min(0, clampOffset(raw))
          : Math.max(0, clampOffset(raw));
      contentRef.current.style.transform = `translateX(${clamped}px)`;
    },
    onEnd: (_e, { dx }) => {
      dragging.current = false;
      if (!contentRef.current) return;
      contentRef.current.style.transition =
        "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)";
      const base = isOpen ? -dirSign * panelWidth : 0;
      const total = base + dx;
      const shouldOpen = Math.abs(total) > swipeThreshold;
      if (shouldOpen) {
        contentRef.current.style.transform = `translateX(${-dirSign * panelWidth}px)`;
        setIsOpen(true);
      } else {
        contentRef.current.style.transform = "translateX(0)";
        setIsOpen(false);
      }
    },
  });

  const snapToClose = useCallback(() => {
    if (!contentRef.current) return;
    contentRef.current.style.transition =
      "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)";
    contentRef.current.style.transform = "translateX(0)";
    setIsOpen(false);
  }, [setIsOpen]);

  const handleAction = (key: string) => {
    snapToClose();
    onExecuteAction(key);
  };

  const handleContentClick = () => {
    if (isOpen) snapToClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen) {
        snapToClose();
      } else {
        if (!contentRef.current) return;
        contentRef.current.style.transition =
          "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)";
        contentRef.current.style.transform = `translateX(${-dirSign * panelWidth}px)`;
        setIsOpen(true);
      }
    }
  };

  return (
    <div
      role="group"
      aria-roledescription="swipeable item"
      style={{
        position: "relative",
        overflow: "hidden",
        touchAction: "pan-y",
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Action panel behind content */}
      <div
        aria-hidden={!isOpen}
        style={{
          position: "absolute",
          top: 0,
          [swipeDirection === "left" ? "right" : "left"]: 0,
          height: "100%",
          display: "flex",
          flexDirection: swipeDirection === "left" ? "row" : "row-reverse",
        }}
      >
        {actions.map((action) => (
          <ActionableActionButton
            key={action.key}
            action={action}
            theme={theme}
            onClick={() => handleAction(action.key)}
            disabled={disabled || phase === "executing" || phase === "dismissing"}
            mode="swipe"
          />
        ))}
      </div>

      {/* Content layer */}
      <div
        ref={contentRef}
        onPointerDown={onPointerDown}
        onClick={handleContentClick}
        style={{
          position: "relative",
          zIndex: 1,
          background: theme === "dark" ? "#1f2937" : "#ffffff",
          transform: isOpen
            ? `translateX(${-dirSign * panelWidth}px)`
            : "translateX(0)",
          transition: dragging.current
            ? "none"
            : "transform 300ms cubic-bezier(0.25, 1, 0.5, 1)",
          cursor: "grab",
          userSelect: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
