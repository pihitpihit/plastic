import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ContextMenuContentContext,
  ContextMenuSubContext,
  useContextMenuContentContext,
  useContextMenuRootContext,
  useContextMenuSubContext,
} from "./ContextMenuContext";
import type {
  ContextMenuContentContextValue,
  ContextMenuItemEventInternal,
  ContextMenuSubContextValue,
  MenuItemDescriptor,
} from "./ContextMenuContext";
import type {
  ContextMenuSubContentProps,
  ContextMenuSubProps,
  ContextMenuSubTriggerProps,
  ContextMenuTheme,
} from "./ContextMenu.types";
import { acquirePortalNode, releasePortalNode } from "./portal";
import { clampSubPlacement } from "./geometry";
import { contextMenuPalette } from "./theme";
import { useMenuNavigation } from "./useMenuNavigation";
import { useSafeTriangle } from "./useSafeTriangle";

export function ContextMenuSub(props: ContextMenuSubProps) {
  const {
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    children,
  } = props;
  const [unc, setUnc] = useState<boolean>(defaultOpen ?? false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : unc;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const parentContentCtx = useContextMenuContentContext();

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUnc(next);
      onOpenChangeRef.current?.(next);
    },
    [isControlled],
  );

  const value = useMemo<ContextMenuSubContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      parentContentRef: parentContentCtx.contentRef,
      parentContentCtx,
    }),
    [open, setOpen, parentContentCtx],
  );

  return (
    <ContextMenuSubContext.Provider value={value}>
      {children}
    </ContextMenuSubContext.Provider>
  );
}
ContextMenuSub.displayName = "ContextMenu.Sub";

function inferTextValue(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(inferTextValue).join("");
  return "";
}

function pickDataAttrs(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(props)) {
    if (k.startsWith("data-")) out[k] = props[k];
  }
  return out;
}

export function ContextMenuSubTrigger(props: ContextMenuSubTriggerProps) {
  const { disabled = false, textValue, className, style, children, ...rest } = props;
  const sub = useContextMenuSubContext();
  if (!sub) {
    throw new Error("ContextMenu.SubTrigger must be inside ContextMenu.Sub");
  }
  const ctx = useContextMenuContentContext();
  const id = useId();
  const ref = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const tv = textValue ?? inferTextValue(children);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const descriptor: MenuItemDescriptor = {
      kind: "sub-trigger",
      disabled,
      textValue: tv,
      node,
      id,
    };
    return ctx.registerItem(descriptor);
  }, [ctx, disabled, tv, id]);

  const setTriggerRef = useCallback(
    (n: HTMLDivElement | null) => {
      ref.current = n;
      sub.triggerRef.current = n;
    },
    [sub.triggerRef],
  );

  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const onMouseEnter = useCallback(() => {
    if (disabled) return;
    setHovered(true);
    if (ref.current) {
      ref.current.focus({ preventScroll: true });
      const list = ctx.getDescriptors();
      const i = list.findIndex((d) => d.id === id);
      if (i >= 0) ctx.setActiveIndex(i);
    }
    clearTimers();
    openTimerRef.current = window.setTimeout(() => {
      sub.setOpen(true);
    }, 100);
  }, [disabled, ctx, id, sub, clearTimers]);

  const onMouseLeave = useCallback(() => {
    setHovered(false);
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const onClick = useCallback(
    (_e: ReactMouseEvent) => {
      if (disabled) return;
      sub.setOpen(true);
    },
    [disabled, sub],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      if (disabled) return;
      if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        sub.setOpen(true);
      }
    },
    [disabled, sub],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  const theme: ContextMenuTheme =
    (ctx.contentRef.current?.getAttribute("data-theme") as ContextMenuTheme) ??
    "light";
  const p = contextMenuPalette[theme];

  const isActive =
    ctx.activeIndex >= 0 &&
    ctx.getDescriptors()[ctx.activeIndex]?.id === id;

  const dataAttrs = pickDataAttrs(rest as Record<string, unknown>);

  return (
    <div
      ref={setTriggerRef}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={sub.open}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      data-plastic-cm-subtrigger=""
      data-active={isActive ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      data-state={sub.open ? "open" : "closed"}
      {...dataAttrs}
      {...(className !== undefined ? { className } : {})}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        margin: "0 4px",
        borderRadius: 4,
        cursor: disabled ? "default" : "pointer",
        color: disabled ? p.itemDisabledFg : "inherit",
        background:
          isActive || sub.open
            ? p.itemActiveBg
            : hovered
              ? p.itemHoverBg
              : "transparent",
        outline: "none",
        userSelect: "none",
        boxSizing: "border-box",
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
    >
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      <span style={{ flexShrink: 0, opacity: 0.6, fontSize: 11 }}>▶</span>
    </div>
  );
}
ContextMenuSubTrigger.displayName = "ContextMenu.SubTrigger";

export function ContextMenuSubContent(props: ContextMenuSubContentProps) {
  const {
    className,
    style,
    minWidth = 180,
    maxWidth = 320,
    children,
  } = props;
  const sub = useContextMenuSubContext();
  if (!sub) throw new Error("ContextMenu.SubContent must be inside ContextMenu.Sub");
  const root = useContextMenuRootContext();

  const ref = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<{
    left: number;
    top: number;
    maxHeight?: number;
  } | null>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!sub.open) {
      setPortalNode(null);
      return;
    }
    const node = acquirePortalNode();
    setPortalNode(node);
    return () => {
      releasePortalNode();
    };
  }, [sub.open]);

  useLayoutEffect(() => {
    if (!sub.open) {
      setPlacement(null);
      return;
    }
    const el = ref.current;
    const trig = sub.triggerRef.current;
    if (!el || !trig) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const r = trig.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const p = clampSubPlacement(
      {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      },
      { w, h },
      { w: vw, h: vh },
    );
    setPlacement({
      left: p.left,
      top: p.top,
      ...(p.maxHeight !== undefined ? { maxHeight: p.maxHeight } : {}),
    });
  }, [sub.open, sub.triggerRef, portalNode]);

  const setRef = useCallback(
    (n: HTMLDivElement | null) => {
      ref.current = n;
      sub.contentRef.current = n;
    },
    [sub.contentRef],
  );

  const closeSelf = useCallback(() => {
    sub.setOpen(false);
    const trig = sub.triggerRef.current;
    if (trig && typeof trig.focus === "function") {
      try {
        trig.focus({ preventScroll: true } as FocusOptions);
      } catch {
        // ignore
      }
    }
  }, [sub]);

  const safeTriangle = useSafeTriangle({
    onExpired: closeSelf,
    delayMs: 150,
    maxAgeMs: 400,
    subscribeParentMove: sub.parentContentCtx.registerSubMouseListener,
  });

  useEffect(() => {
    if (!sub.open) {
      safeTriangle.reset();
      return;
    }
  }, [sub.open, safeTriangle]);

  const onContentMouseEnter = useCallback(() => {
    safeTriangle.onPointerInside();
  }, [safeTriangle]);

  const onContentMouseLeave = useCallback(
    (e: ReactMouseEvent) => {
      const r = ref.current?.getBoundingClientRect() ?? null;
      safeTriangle.onSubTriggerLeave({ x: e.clientX, y: e.clientY }, r);
    },
    [safeTriangle],
  );

  const nav = useMenuNavigation({
    openMode: "keyboard",
    typeaheadRef: root.typeaheadRef,
    onEnterSelect: () => {
      const focusable = nav.getOrderedFocusable();
      const target = focusable[nav.activeIndex];
      if (target) target.node.click();
    },
    onEscape: closeSelf,
    onArrowLeft: closeSelf,
  });

  useEffect(() => {
    if (!sub.open) return;
    const raf = requestAnimationFrame(() => {
      const focusable = nav.getOrderedFocusable();
      const first = focusable[0];
      if (first) {
        first.node.focus();
        nav.setActiveIndex(0);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [sub.open, nav, placement]);

  const onItemSelect = useCallback(
    (userOnSelect: ((e: ContextMenuItemEventInternal) => void) | undefined) => {
      const ev: ContextMenuItemEventInternal = {
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      if (userOnSelect) userOnSelect(ev);
      if (!ev.defaultPrevented) {
        sub.setOpen(false);
        root.setOpen(false);
      }
    },
    [sub, root],
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
      closeSelf,
      contentRef: ref,
      isSubContent: true,
      onMouseMoveCapture,
      registerSubMouseListener,
    }),
    [
      nav.activeIndex,
      nav.setActiveIndex,
      nav.registerItem,
      nav.getDescriptors,
      onItemSelect,
      closeSelf,
      onMouseMoveCapture,
      registerSubMouseListener,
    ],
  );

  if (!sub.open || !portalNode) return null;

  const parentTheme: ContextMenuTheme =
    (sub.parentContentRef.current?.getAttribute(
      "data-theme",
    ) as ContextMenuTheme) ?? "light";
  const p = contextMenuPalette[parentTheme];

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
    zIndex: 10000,
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
      ref={setRef}
      role="menu"
      tabIndex={-1}
      data-plastic-cm-subcontent=""
      data-theme={parentTheme}
      {...(className !== undefined ? { className } : {})}
      style={baseStyle}
      onKeyDown={nav.onKeyDown}
      onMouseEnter={onContentMouseEnter}
      onMouseLeave={onContentMouseLeave}
      onMouseMoveCapture={onMouseMoveCapture}
    >
      <ContextMenuContentContext.Provider value={contentCtxValue}>
        {children}
      </ContextMenuContentContext.Provider>
    </div>,
    portalNode,
  );
}
ContextMenuSubContent.displayName = "ContextMenu.SubContent";
