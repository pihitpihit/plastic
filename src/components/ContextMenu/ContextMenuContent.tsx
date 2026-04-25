import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import {
  ContextMenuContentContext,
  useContextMenuRootContext,
} from "./ContextMenuContext";
import type {
  ContextMenuContentContextValue,
  ContextMenuItemEventInternal,
  MenuItemDescriptor,
} from "./ContextMenuContext";
import type { ContextMenuContentProps } from "./ContextMenu.types";
import { acquirePortalNode, releasePortalNode } from "./portal";
import { clampPointerPlacement } from "./geometry";
import { contextMenuPalette } from "./theme";
import { useMenuNavigation } from "./useMenuNavigation";
import { useMenuDismisser } from "./useMenuDismisser";

export function ContextMenuContent(props: ContextMenuContentProps) {
  const {
    theme = "light",
    className,
    style,
    minWidth = 180,
    maxWidth = 320,
    "aria-label": ariaLabel = "Context menu",
    children,
  } = props;

  const ctx = useContextMenuRootContext();
  const ref = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    maxHeight?: number;
  } | null>(null);

  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!ctx.open) {
      setPortalNode(null);
      return;
    }
    const node = acquirePortalNode();
    setPortalNode(node);
    return () => {
      releasePortalNode();
    };
  }, [ctx.open]);

  useLayoutEffect(() => {
    if (!ctx.open || !ctx.position) {
      setPlacement(null);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = clampPointerPlacement(ctx.position, { w, h }, { w: vw, h: vh });
    setPlacement({
      left: p.left,
      top: p.top,
      ...(p.maxHeight !== undefined ? { maxHeight: p.maxHeight } : {}),
    });
  }, [ctx.open, ctx.position, portalNode]);

  const closeRoot = useCallback(() => {
    ctx.setOpen(false);
  }, [ctx]);

  const onEnterSelect = useCallback(() => {
    const all = nav.descriptorsRef.current;
    const focusable = nav.getOrderedFocusable();
    const target = focusable[nav.activeIndex];
    if (target) target.node.click();
    void all;
  }, []);

  const nav = useMenuNavigation({
    openMode: ctx.openMode,
    typeaheadRef: ctx.typeaheadRef,
    onEnterSelect: () => {
      const focusable = nav.getOrderedFocusable();
      const target = focusable[nav.activeIndex];
      if (target) target.node.click();
    },
    onEscape: closeRoot,
  });
  void onEnterSelect;

  useMenuDismisser({
    enabled: ctx.open,
    contentRef: ref,
    onDismiss: () => closeRoot(),
  });

  useEffect(() => {
    if (!ctx.open) return;
    if (ctx.openMode !== "keyboard") return;
    const raf = requestAnimationFrame(() => {
      const focusable = nav.getOrderedFocusable();
      const first = focusable[0];
      if (first) {
        first.node.focus();
        nav.setActiveIndex(0);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [ctx.open, ctx.openMode, nav, placement]);

  useEffect(() => {
    if (ctx.open) return;
    const prev = ctx.previousFocusRef.current;
    if (prev && typeof prev.focus === "function") {
      try {
        prev.focus();
      } catch {
        // ignore
      }
    }
  }, [ctx.open, ctx.previousFocusRef]);

  const onItemSelect = useCallback(
    (userOnSelect: ((e: ContextMenuItemEventInternal) => void) | undefined) => {
      const ev: ContextMenuItemEventInternal = {
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      if (userOnSelect) userOnSelect(ev);
      if (!ev.defaultPrevented) closeRoot();
    },
    [closeRoot],
  );

  const subMoveListenersRef = useRef<Set<(p: { x: number; y: number }) => void>>(
    new Set(),
  );

  const registerSubMouseListener = useCallback(
    (fn: (p: { x: number; y: number }) => void) => {
      subMoveListenersRef.current.add(fn);
      return () => {
        subMoveListenersRef.current.delete(fn);
      };
    },
    [],
  );

  const onMouseMoveCapture = useCallback((e: ReactMouseEvent) => {
    const listeners = subMoveListenersRef.current;
    if (listeners.size === 0) return;
    const p = { x: e.clientX, y: e.clientY };
    listeners.forEach((fn) => fn(p));
  }, []);

  const contentCtxValue = useMemo<ContextMenuContentContextValue>(
    () => ({
      activeIndex: nav.activeIndex,
      setActiveIndex: nav.setActiveIndex,
      registerItem: (d: MenuItemDescriptor) => nav.registerItem(d),
      getDescriptors: nav.getDescriptors,
      onItemSelect,
      closeSelf: closeRoot,
      contentRef: ref,
      isSubContent: false,
      onMouseMoveCapture,
      registerSubMouseListener,
    }),
    [
      nav.activeIndex,
      nav.setActiveIndex,
      nav.registerItem,
      nav.getDescriptors,
      onItemSelect,
      closeRoot,
      onMouseMoveCapture,
      registerSubMouseListener,
    ],
  );

  if (!ctx.open || !portalNode) return null;

  const p = contextMenuPalette[theme];
  const baseStyle: CSSProperties = {
    position: "fixed",
    left: placement?.left ?? -9999,
    top: placement?.top ?? -9999,
    minWidth,
    maxWidth,
    ...(placement?.maxHeight !== undefined
      ? { maxHeight: placement.maxHeight, overflowY: "auto" }
      : {}),
    opacity: placement ? 1 : 0,
    zIndex: 9999,
    background: p.contentBg,
    color: p.contentFg,
    border: `1px solid ${p.contentBorder}`,
    borderRadius: 6,
    boxShadow: p.contentShadow,
    padding: "4px 0",
    fontSize: 13,
    lineHeight: "16px",
    outline: "none",
    boxSizing: "border-box",
    ...style,
  };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={ariaLabel}
      tabIndex={-1}
      data-plastic-cm-content=""
      data-theme={theme}
      data-open-mode={ctx.openMode ?? "pointer"}
      {...(className !== undefined ? { className } : {})}
      style={baseStyle}
      onKeyDown={nav.onKeyDown}
      onMouseMoveCapture={onMouseMoveCapture}
    >
      <ContextMenuContentContext.Provider value={contentCtxValue}>
        {children}
      </ContextMenuContentContext.Provider>
    </div>,
    portalNode,
  );
}

ContextMenuContent.displayName = "ContextMenu.Content";
