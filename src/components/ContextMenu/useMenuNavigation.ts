import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject, KeyboardEvent as ReactKeyboardEvent } from "react";
import type { MenuItemDescriptor } from "./ContextMenuContext";

export interface MenuNavigationHandle {
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  registerItem: (descriptor: MenuItemDescriptor) => () => void;
  getDescriptors: () => MenuItemDescriptor[];
  onKeyDown: (e: ReactKeyboardEvent) => void;
  descriptorsRef: MutableRefObject<MenuItemDescriptor[]>;
  getOrderedFocusable: () => MenuItemDescriptor[];
}

export interface NavigationOptions {
  openMode: "pointer" | "keyboard" | null;
  typeaheadRef: MutableRefObject<{ buf: string; timer: number | null }>;
  onEnterSelect: () => void;
  onEscape: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

function isFocusable(d: MenuItemDescriptor): boolean {
  if (d.disabled) return false;
  return (
    d.kind === "item" ||
    d.kind === "checkbox" ||
    d.kind === "radio" ||
    d.kind === "sub-trigger"
  );
}

export function useMenuNavigation(opts: NavigationOptions): MenuNavigationHandle {
  const {
    openMode,
    typeaheadRef,
    onEnterSelect,
    onEscape,
    onArrowLeft,
    onArrowRight,
  } = opts;
  const [activeIndex, setActiveIndex] = useState<number>(
    openMode === "keyboard" ? 0 : -1,
  );
  const descriptorsRef = useRef<MenuItemDescriptor[]>([]);
  const activeIndexRef = useRef<number>(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    setActiveIndex(openMode === "keyboard" ? 0 : -1);
  }, [openMode]);

  const registerItem = useCallback((d: MenuItemDescriptor) => {
    const list = descriptorsRef.current;
    const idx = list.findIndex((x) => x.id === d.id);
    if (idx >= 0) list[idx] = d;
    else list.push(d);
    return () => {
      const i = descriptorsRef.current.findIndex((x) => x.id === d.id);
      if (i >= 0) descriptorsRef.current.splice(i, 1);
    };
  }, []);

  const getDescriptors = useCallback(() => descriptorsRef.current, []);

  const getOrderedFocusable = useCallback((): MenuItemDescriptor[] => {
    const all = descriptorsRef.current;
    const withPos = all.map((d) => {
      const r = d.node.getBoundingClientRect();
      return { d, top: r.top, left: r.left };
    });
    withPos.sort((a, b) => {
      if (a.top !== b.top) return a.top - b.top;
      return a.left - b.left;
    });
    return withPos.map((x) => x.d).filter(isFocusable);
  }, []);

  const move = useCallback(
    (delta: number) => {
      const focusable = getOrderedFocusable();
      const N = focusable.length;
      if (N === 0) return;
      const cur = activeIndexRef.current;
      const next = cur < 0 ? (delta > 0 ? 0 : N - 1) : (cur + delta + N) % N;
      setActiveIndex(next);
      const target = focusable[next];
      if (target) {
        target.node.focus();
        target.node.scrollIntoView({ block: "nearest" });
      }
    },
    [getOrderedFocusable],
  );

  const toEdge = useCallback(
    (end: "start" | "end") => {
      const focusable = getOrderedFocusable();
      const N = focusable.length;
      if (N === 0) return;
      const idx = end === "start" ? 0 : N - 1;
      setActiveIndex(idx);
      const target = focusable[idx];
      if (target) {
        target.node.focus();
        target.node.scrollIntoView({ block: "nearest" });
      }
    },
    [getOrderedFocusable],
  );

  const typeahead = useCallback(
    (key: string) => {
      const ta = typeaheadRef.current;
      if (ta.timer) window.clearTimeout(ta.timer);
      ta.buf += key.toLowerCase();
      ta.timer = window.setTimeout(() => {
        ta.buf = "";
        ta.timer = null;
      }, 200);
      const focusable = getOrderedFocusable();
      const N = focusable.length;
      if (N === 0) return;
      const start = activeIndexRef.current + 1;
      for (let i = 0; i < N; i++) {
        const j = (start + i) % N;
        const d = focusable[j];
        if (d && d.textValue.toLowerCase().startsWith(ta.buf)) {
          setActiveIndex(j);
          d.node.focus();
          d.node.scrollIntoView({ block: "nearest" });
          break;
        }
      }
    },
    [typeaheadRef, getOrderedFocusable],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          move(1);
          return;
        case "ArrowUp":
          e.preventDefault();
          move(-1);
          return;
        case "Home":
          e.preventDefault();
          toEdge("start");
          return;
        case "End":
          e.preventDefault();
          toEdge("end");
          return;
        case "Enter":
        case " ":
          e.preventDefault();
          onEnterSelect();
          return;
        case "Escape":
          e.preventDefault();
          e.stopPropagation();
          onEscape();
          return;
        case "Tab":
          e.preventDefault();
          return;
        case "ArrowLeft":
          if (onArrowLeft) {
            e.preventDefault();
            onArrowLeft();
          }
          return;
        case "ArrowRight":
          if (onArrowRight) {
            e.preventDefault();
            onArrowRight();
          }
          return;
        default:
          break;
      }
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const isPrintable = /\S/.test(e.key);
        if (isPrintable) {
          e.preventDefault();
          typeahead(e.key);
        }
      }
    },
    [move, toEdge, onEnterSelect, onEscape, onArrowLeft, onArrowRight, typeahead],
  );

  return {
    activeIndex,
    setActiveIndex,
    registerItem,
    getDescriptors,
    onKeyDown,
    descriptorsRef,
    getOrderedFocusable,
  };
}
