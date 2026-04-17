import { useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import type { TriggerChildProps, ActionableAction } from "./Actionable.types";
import { ActionableActionButton } from "./ActionableActionButton";
import { useControllable } from "../_shared/useControllable";

interface RevealTriggerProps extends TriggerChildProps {
  revealOpen?: boolean | undefined;
  onRevealOpenChange?: ((open: boolean) => void) | undefined;
  revealDirection: "left" | "right";
  revealTriggerIndex: number;
  revealTriggerRender?: ((action: ActionableAction) => ReactNode) | undefined;
  revealOverlayWidth: number;
  revealPanelWidth?: number | undefined;
  revealAnimationDuration: number;
}

const ACTION_BUTTON_WIDTH = 72;

function DefaultMoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

export function ActionableRevealTrigger({
  children,
  actions,
  theme,
  phase,
  disabled,
  onExecuteAction,
  revealOpen,
  onRevealOpenChange,
  revealDirection,
  revealTriggerIndex,
  revealTriggerRender,
  revealOverlayWidth,
  revealPanelWidth,
  revealAnimationDuration,
}: RevealTriggerProps) {
  const [isOpen, setIsOpen] = useControllable(revealOpen, false, onRevealOpenChange);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [panelWidth, setPanelWidth] = useState(
    revealPanelWidth ?? actions.length * ACTION_BUTTON_WIDTH,
  );

  useLayoutEffect(() => {
    if (revealPanelWidth !== undefined) {
      setPanelWidth(revealPanelWidth);
      return;
    }
    if (panelRef.current) {
      setPanelWidth(panelRef.current.getBoundingClientRect().width);
    }
  }, [actions.length, revealPanelWidth]);

  if (actions.length === 0) return <>{children}</>;

  const isBlocked = disabled || phase === "executing" || phase === "dismissing";
  const dirSign = revealDirection === "right" ? -1 : 1;
  const duration = revealAnimationDuration;

  const triggerIdx = Math.min(revealTriggerIndex, actions.length - 1);
  const triggerAction = actions[triggerIdx]!;
  const triggerContent = revealTriggerRender
    ? revealTriggerRender(triggerAction)
    : triggerAction.icon ?? <DefaultMoreIcon />;

  const open = useCallback(() => {
    setOverlayVisible(false);
    setIsOpen(true);
  }, [setIsOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleAction = useCallback(
    (key: string) => {
      close();
      onExecuteAction(key);
    },
    [close, onExecuteAction],
  );

  const handleOverlayClick = useCallback(() => {
    if (isBlocked) return;
    open();
  }, [isBlocked, open]);

  const handleContentClick = useCallback(() => {
    if (isOpen) {
      close();
    }
  }, [isOpen, close]);

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch" || isBlocked) return;
      if (!isOpen) setOverlayVisible(true);
    },
    [isOpen, isBlocked],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (!isOpen) setOverlayVisible(false);
    },
    [isOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isBlocked) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (isOpen) {
          close();
        } else {
          open();
        }
      }
      if (e.key === "Escape") {
        if (isOpen) {
          e.stopPropagation();
          close();
          containerRef.current?.focus();
        } else if (overlayVisible) {
          setOverlayVisible(false);
        }
      }
    },
    [isBlocked, isOpen, overlayVisible, open, close],
  );

  // Outside click + Escape (document-level)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  // Focus first panel button when opening via keyboard
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const firstBtn = panelRef.current.querySelector("button");
      firstBtn?.focus();
    }
  }, [isOpen]);

  const themeBg = theme === "dark" ? "#1f2937" : "#ffffff";

  const gradientDir = revealDirection === "right" ? "left" : "right";
  const gradientSolid =
    theme === "dark" ? "rgba(31,41,55,0.95)" : "rgba(255,255,255,0.95)";
  const gradientTransparent =
    theme === "dark" ? "rgba(31,41,55,0)" : "rgba(255,255,255,0)";

  return (
    <div
      ref={containerRef}
      role="group"
      aria-roledescription="revealable item"
      tabIndex={0}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* z-index 1: action panel (behind content) */}
      <div
        ref={panelRef}
        role="toolbar"
        aria-label="Actions"
        aria-hidden={!isOpen}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [revealDirection === "right" ? "right" : "left"]: 0,
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {actions.map((action) => (
          <ActionableActionButton
            key={action.key}
            action={action}
            theme={theme}
            onClick={() => handleAction(action.key)}
            disabled={isBlocked}
            mode="reveal"
          />
        ))}
      </div>

      {/* z-index 2: content layer */}
      <div
        ref={contentRef}
        onClick={handleContentClick}
        style={{
          position: "relative",
          zIndex: 2,
          background: themeBg,
          transform: isOpen ? `translateX(${dirSign * panelWidth}px)` : "translateX(0)",
          transition: `transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1)`,
          cursor: isOpen ? "pointer" : "default",
        }}
      >
        {children}
      </div>

      {/* z-index 3: overlay trigger button */}
      <button
        type="button"
        aria-label={triggerAction.label}
        aria-expanded={isOpen}
        onClick={handleOverlayClick}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [revealDirection === "right" ? "right" : "left"]: 0,
          width: revealOverlayWidth,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
          color: theme === "dark" ? "#9ca3af" : "#6b7280",
          fontSize: "1rem",
          background: `linear-gradient(to ${gradientDir}, ${gradientSolid}, ${gradientTransparent})`,
          opacity: overlayVisible && !isOpen ? 1 : 0,
          pointerEvents: overlayVisible && !isOpen ? "auto" : "none",
          transition: `opacity ${duration / 2}ms ease`,
        }}
      >
        {triggerContent}
      </button>
    </div>
  );
}
