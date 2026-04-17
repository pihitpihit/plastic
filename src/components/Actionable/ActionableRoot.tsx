import { useState, useCallback, useRef } from "react";
import type {
  ActionableProps,
  ActionablePhase,
  TriggerChildProps,
} from "./Actionable.types";
import { ActionableDismiss } from "./ActionableDismiss";
import { ActionableIconTrigger } from "./ActionableIconTrigger";
import { ActionableFadeTrigger } from "./ActionableFadeTrigger";
import { ActionableCheckboxTrigger } from "./ActionableCheckboxTrigger";
import { ActionableSwipeTrigger } from "./ActionableSwipeTrigger";
import { ActionableDragOutTrigger } from "./ActionableDragOutTrigger";
import { ActionableRevealTrigger } from "./ActionableRevealTrigger";

export function ActionableRoot({
  children,
  actions,
  trigger,
  theme = "light",
  dismissAnimation = "collapse",
  dismissDuration = 300,
  onDismiss,
  onAction,
  iconPosition = "top-right",
  iconShowOnHover = false,
  confirmTimeout = 3000,
  confirmingAction,
  onConfirmChange,
  swipeOpen,
  onSwipeOpenChange,
  swipeThreshold = 80,
  swipeDirection = "left",
  selected,
  defaultSelected = false,
  onSelectedChange,
  checkboxPosition = "left",
  dragThreshold = 100,
  onDragThreshold,
  dragZoneLabel,
  fadeDuration = 200,
  fadePosition = "top",
  revealOpen,
  onRevealOpenChange,
  revealDirection = "right",
  revealTriggerIndex = 0,
  revealTriggerRender,
  revealOverlayWidth = 40,
  revealPanelWidth,
  revealAnimationDuration = 250,
  disabled = false,
  className,
  style,
  ...rest
}: ActionableProps) {
  const [phase, setPhase] = useState<ActionablePhase>("idle");
  const dismissActionRef = useRef<string | null>(null);

  const handleExecuteAction = useCallback(
    async (actionKey: string) => {
      if (phase === "executing" || phase === "dismissing") return;
      const action = actions.find((a) => a.key === actionKey);
      if (!action) return;

      setPhase("executing");

      try {
        const actionResult = onAction?.(actionKey);
        const shouldDismiss = actionResult !== false;
        const maybePromise =
          actionResult instanceof Promise ? await actionResult : actionResult;
        if (maybePromise === false) {
          setPhase("idle");
          return;
        }

        await action.onClick();

        if (shouldDismiss && onDismiss) {
          dismissActionRef.current = actionKey;
          setPhase("dismissing");
        } else {
          setPhase("idle");
        }
      } catch {
        setPhase("idle");
      }
    },
    [phase, actions, onAction, onDismiss],
  );

  const handleDismissComplete = useCallback(() => {
    const key = dismissActionRef.current;
    dismissActionRef.current = null;
    if (key) onDismiss?.(key);
  }, [onDismiss]);

  const triggerChildProps: TriggerChildProps = {
    children,
    actions,
    theme,
    phase,
    disabled,
    onExecuteAction: handleExecuteAction,
  };

  let triggerContent: React.ReactNode;

  switch (trigger) {
    case "icon":
      triggerContent = (
        <ActionableIconTrigger
          {...triggerChildProps}
          confirm={false}
          iconPosition={iconPosition}
          iconShowOnHover={iconShowOnHover}
          confirmTimeout={confirmTimeout}
        />
      );
      break;
    case "icon-confirm":
      triggerContent = (
        <ActionableIconTrigger
          {...triggerChildProps}
          confirm={true}
          iconPosition={iconPosition}
          iconShowOnHover={iconShowOnHover}
          confirmTimeout={confirmTimeout}
          confirmingAction={confirmingAction}
          onConfirmChange={onConfirmChange}
        />
      );
      break;
    case "swipe":
      triggerContent = (
        <ActionableSwipeTrigger
          {...triggerChildProps}
          swipeOpen={swipeOpen}
          onSwipeOpenChange={onSwipeOpenChange}
          swipeThreshold={swipeThreshold}
          swipeDirection={swipeDirection}
        />
      );
      break;
    case "fade":
      triggerContent = (
        <ActionableFadeTrigger
          {...triggerChildProps}
          fadeDuration={fadeDuration}
          fadePosition={fadePosition}
        />
      );
      break;
    case "checkbox":
      triggerContent = (
        <ActionableCheckboxTrigger
          {...triggerChildProps}
          selected={selected}
          defaultSelected={defaultSelected}
          onSelectedChange={onSelectedChange}
          checkboxPosition={checkboxPosition}
        />
      );
      break;
    case "drag-out":
      triggerContent = (
        <ActionableDragOutTrigger
          {...triggerChildProps}
          dragThreshold={dragThreshold}
          onDragThreshold={onDragThreshold}
          dragZoneLabel={dragZoneLabel}
        />
      );
      break;
    case "reveal":
      triggerContent = (
        <ActionableRevealTrigger
          {...triggerChildProps}
          revealOpen={revealOpen}
          onRevealOpenChange={onRevealOpenChange}
          revealDirection={revealDirection}
          revealTriggerIndex={revealTriggerIndex}
          revealTriggerRender={revealTriggerRender}
          revealOverlayWidth={revealOverlayWidth}
          revealPanelWidth={revealPanelWidth}
          revealAnimationDuration={revealAnimationDuration}
        />
      );
      break;
  }

  return (
    <ActionableDismiss
      active={phase === "dismissing"}
      animation={dismissAnimation}
      duration={dismissDuration}
      onComplete={handleDismissComplete}
    >
      <div
        className={className}
        style={{
          ...style,
          ...(phase === "executing" || phase === "dismissing"
            ? { pointerEvents: "none" as const }
            : {}),
        }}
        {...rest}
      >
        {triggerContent}
      </div>
    </ActionableDismiss>
  );
}
