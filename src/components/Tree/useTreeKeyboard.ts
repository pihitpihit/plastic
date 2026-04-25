import { useCallback, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { FlatItem } from "./Tree.utils";
import type { TreeSelectionMode } from "./Tree.types";

export interface KeyboardHandlers {
  onKeyDown: (e: ReactKeyboardEvent) => void;
}

export interface KeyboardDeps {
  flatItems: FlatItem<unknown>[];
  focusedId: string | null;
  setFocus: (id: string | null) => void;
  focusDom: (id: string) => void;
  toggleExpand: (id: string) => void;
  selectNode: (id: string, mods: { shift: boolean; meta: boolean }) => void;
  toggleCheck: (id: string) => void;
  onActivate: (id: string) => void;
  expandSiblings: (id: string) => void;
  selectionMode: TreeSelectionMode;
  checkable: boolean;
  disabled: boolean;
}

export function useTreeKeyboard(deps: KeyboardDeps): KeyboardHandlers {
  const {
    flatItems,
    focusedId,
    setFocus,
    focusDom,
    toggleExpand,
    selectNode,
    toggleCheck,
    onActivate,
    expandSiblings,
    selectionMode,
    checkable,
    disabled,
  } = deps;

  const typeBufRef = useRef("");
  const typeTimerRef = useRef<number | null>(null);

  const moveTo = useCallback(
    (nextIdx: number) => {
      if (flatItems.length === 0) return;
      const clamped = Math.max(0, Math.min(flatItems.length - 1, nextIdx));
      const target = flatItems[clamped];
      if (!target) return;
      setFocus(target.node.id);
      focusDom(target.node.id);
    },
    [flatItems, setFocus, focusDom],
  );

  const typeahead = useCallback(
    (ch: string, fromIdx: number) => {
      typeBufRef.current += ch.toLowerCase();
      if (typeTimerRef.current != null) window.clearTimeout(typeTimerRef.current);
      typeTimerRef.current = window.setTimeout(() => {
        typeBufRef.current = "";
      }, 500);
      const buf = typeBufRef.current;
      const n = flatItems.length;
      if (n === 0) return;
      for (let i = 1; i <= n; i++) {
        const probe = flatItems[(fromIdx + i) % n];
        if (!probe) continue;
        const label =
          typeof probe.node.label === "string" ? probe.node.label : probe.node.id;
        if (label.toLowerCase().startsWith(buf)) {
          setFocus(probe.node.id);
          focusDom(probe.node.id);
          return;
        }
      }
    },
    [flatItems, setFocus, focusDom],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (disabled) return;
      if (flatItems.length === 0) return;

      const idx = focusedId
        ? flatItems.findIndex((it) => it.node.id === focusedId)
        : -1;
      const effIdx = idx < 0 ? 0 : idx;
      const cur = flatItems[effIdx];
      if (!cur) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          moveTo(effIdx + 1);
          return;
        case "ArrowUp":
          e.preventDefault();
          moveTo(effIdx - 1);
          return;
        case "Home":
          e.preventDefault();
          moveTo(0);
          return;
        case "End":
          e.preventDefault();
          moveTo(flatItems.length - 1);
          return;
        case "ArrowRight":
          e.preventDefault();
          if (cur.hasChildren && !cur.isExpanded) {
            toggleExpand(cur.node.id);
            return;
          }
          if (cur.isExpanded) {
            moveTo(effIdx + 1);
            return;
          }
          return;
        case "ArrowLeft":
          e.preventDefault();
          if (cur.isExpanded) {
            toggleExpand(cur.node.id);
            return;
          }
          if (cur.parentId) {
            const pIdx = flatItems.findIndex(
              (it) => it.node.id === cur.parentId,
            );
            if (pIdx >= 0) moveTo(pIdx);
          }
          return;
        case "Enter":
          e.preventDefault();
          if (selectionMode !== "none") {
            selectNode(cur.node.id, {
              shift: e.shiftKey,
              meta: e.metaKey || e.ctrlKey,
            });
          }
          onActivate(cur.node.id);
          return;
        case " ":
          e.preventDefault();
          if (checkable) {
            toggleCheck(cur.node.id);
            return;
          }
          if (selectionMode === "multiple") {
            selectNode(cur.node.id, { shift: false, meta: true });
          } else if (selectionMode === "single") {
            selectNode(cur.node.id, { shift: false, meta: false });
          }
          return;
        case "*":
          e.preventDefault();
          expandSiblings(cur.node.id);
          return;
        case "Escape":
          typeBufRef.current = "";
          return;
        default:
          if (
            e.key.length === 1 &&
            !e.metaKey &&
            !e.ctrlKey &&
            !e.altKey &&
            !(e.nativeEvent as KeyboardEvent).isComposing &&
            /\S/.test(e.key)
          ) {
            e.preventDefault();
            typeahead(e.key, effIdx);
          }
      }
    },
    [
      disabled,
      flatItems,
      focusedId,
      moveTo,
      toggleExpand,
      selectionMode,
      selectNode,
      toggleCheck,
      checkable,
      onActivate,
      expandSiblings,
      typeahead,
    ],
  );

  return { onKeyDown };
}
