import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ContextMenuRootContext } from "./ContextMenuContext";
import type { ContextMenuRootContextValue } from "./ContextMenuContext";
import type { ContextMenuRootProps } from "./ContextMenu.types";

export function ContextMenuRoot(props: ContextMenuRootProps) {
  const {
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    position: controlledPosition,
    disabled = false,
    longPressMs = 550,
    longPressTolerance = 8,
    children,
  } = props;

  const [openUnc, setOpenUnc] = useState<boolean>(defaultOpen ?? false);
  const [positionUnc, setPositionUnc] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [openMode, setOpenMode] = useState<"pointer" | "keyboard" | null>(
    defaultOpen ? "pointer" : null,
  );

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : openUnc;
  const position = isControlled
    ? (controlledPosition ?? positionUnc)
    : positionUnc;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const typeaheadRef = useRef<{ buf: string; timer: number | null }>({
    buf: "",
    timer: null,
  });
  const triggerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const setOpen = useCallback(
    (
      next: boolean,
      atPosition?: { x: number; y: number },
      mode: "pointer" | "keyboard" = "pointer",
    ) => {
      if (!isControlled) {
        setOpenUnc(next);
        if (atPosition) setPositionUnc(atPosition);
        else if (!next) setPositionUnc(null);
      } else {
        if (atPosition) setPositionUnc(atPosition);
      }
      setOpenMode(next ? mode : null);
      onOpenChangeRef.current?.(next);
    },
    [isControlled],
  );

  useEffect(() => {
    if (isControlled && open && !controlledPosition && !positionUnc) {
      console.warn(
        "[ContextMenu] controlled `open=true` requires `position={{x,y}}`",
      );
    }
  }, [isControlled, open, controlledPosition, positionUnc]);

  const value = useMemo<ContextMenuRootContextValue>(
    () => ({
      open,
      position,
      setOpen,
      disabled,
      longPressMs,
      longPressTolerance,
      openMode,
      typeaheadRef,
      triggerRef,
      previousFocusRef,
    }),
    [open, position, setOpen, disabled, longPressMs, longPressTolerance, openMode],
  );

  return (
    <ContextMenuRootContext.Provider value={value}>
      {children}
    </ContextMenuRootContext.Provider>
  );
}

ContextMenuRoot.displayName = "ContextMenu.Root";
