import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useControllable } from "../_shared/useControllable";
import {
  TabsContext,
  useTabsContext,
  type RegisteredTab,
} from "./TabsContext";
import { tabsPalette } from "./theme";
import type {
  TabsContentProps,
  TabsListProps,
  TabsOrientation,
  TabsRootProps,
  TabsTheme,
  TabsTriggerProps,
} from "./Tabs.types";

function sortByDocumentPosition(tabs: RegisteredTab[]): RegisteredTab[] {
  if (tabs.length < 2) return tabs;
  return [...tabs].sort((a, b) => {
    if (a.element === b.element) return 0;
    const pos = a.element.compareDocumentPosition(b.element);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

function TabsRoot(props: TabsRootProps) {
  const {
    children,
    defaultValue,
    value: controlledValue,
    onValueChange,
    orientation = "horizontal",
    activationMode = "automatic",
    theme = "light",
    disabled = false,
    id,
    className,
    style,
  } = props;

  const autoId = useId();
  const rootId = id ?? autoId;

  const valueChangeAdapter = useCallback(
    (v: string | null) => {
      if (v != null) onValueChange?.(v);
    },
    [onValueChange],
  );

  const [value, setValue] = useControllable<string | null>(
    controlledValue ?? undefined,
    defaultValue ?? null,
    valueChangeAdapter,
  );

  const valueRef = useRef<string | null>(value);
  valueRef.current = value;

  const registered = useRef<Map<string, RegisteredTab>>(new Map());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [rtl, setRtl] = useState(false);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction;
    setRtl(dir === "rtl");
  }, []);

  const getTabs = useCallback((): RegisteredTab[] => {
    return sortByDocumentPosition(Array.from(registered.current.values()));
  }, []);

  const setValueSafe = useCallback(
    (v: string) => {
      if (disabled) return;
      setValue(v);
    },
    [disabled, setValue],
  );

  const register = useCallback(
    (tab: RegisteredTab) => {
      registered.current.set(tab.value, tab);
      if (valueRef.current == null && !tab.disabled) {
        valueRef.current = tab.value;
        setValue(tab.value);
      }
      return () => {
        const cur = registered.current.get(tab.value);
        if (cur && cur.element === tab.element) {
          registered.current.delete(tab.value);
          if (valueRef.current === tab.value) {
            const remaining = sortByDocumentPosition(
              Array.from(registered.current.values()),
            ).filter((t) => !t.disabled);
            const next = remaining[0];
            if (next) {
              valueRef.current = next.value;
              setValue(next.value);
            }
          }
        }
      };
    },
    [setValue],
  );

  const onTriggerKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLElement>, triggerValue: string) => {
      if (disabled) return;
      const all = getTabs();
      const enabled = all.filter((t) => !t.disabled);
      const idx = enabled.findIndex((t) => t.value === triggerValue);
      if (idx < 0) return;

      const key = e.key;
      const isNext =
        orientation === "horizontal"
          ? (key === "ArrowRight") !== rtl
          : key === "ArrowDown";
      const isPrev =
        orientation === "horizontal"
          ? (key === "ArrowLeft") !== rtl
          : key === "ArrowUp";

      if (isNext || isPrev) {
        e.preventDefault();
        const nextIdx = isNext
          ? (idx + 1) % enabled.length
          : (idx - 1 + enabled.length) % enabled.length;
        const next = enabled[nextIdx];
        if (next) {
          next.element.focus();
          if (activationMode === "automatic") setValue(next.value);
        }
        return;
      }

      if (key === "Home") {
        e.preventDefault();
        const first = enabled[0];
        if (first) {
          first.element.focus();
          if (activationMode === "automatic") setValue(first.value);
        }
        return;
      }
      if (key === "End") {
        e.preventDefault();
        const last = enabled[enabled.length - 1];
        if (last) {
          last.element.focus();
          if (activationMode === "automatic") setValue(last.value);
        }
        return;
      }

      if (activationMode === "manual" && (key === "Enter" || key === " ")) {
        e.preventDefault();
        setValue(triggerValue);
        return;
      }

      if (key === "Delete" || key === "Backspace") {
        const tab = all.find((t) => t.value === triggerValue);
        if (tab?.closable) {
          e.preventDefault();
          tab.onClose?.(triggerValue);
        }
        return;
      }
    },
    [activationMode, disabled, getTabs, orientation, rtl, setValue],
  );

  const contextValue = useMemo(
    () => ({
      rootId,
      value,
      setValue: setValueSafe,
      orientation,
      activationMode,
      theme,
      disabled,
      rtl,
      register,
      getTabs,
      onTriggerKeyDown,
      listRef,
    }),
    [
      rootId,
      value,
      setValueSafe,
      orientation,
      activationMode,
      theme,
      disabled,
      rtl,
      register,
      getTabs,
      onTriggerKeyDown,
    ],
  );

  const rootStyle: CSSProperties = {
    display: "flex",
    flexDirection: orientation === "horizontal" ? "column" : "row",
    background: tabsPalette[theme].rootBg,
    color: tabsPalette[theme].triggerFg,
    ...style,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-orientation={orientation}
        data-theme={theme}
        data-disabled={disabled || undefined}
        className={className}
        style={rootStyle}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}
TabsRoot.displayName = "Tabs.Root";

function useTabsIndicator(
  listEl: HTMLDivElement | null,
  indicatorEl: HTMLDivElement | null,
) {
  const ctx = useTabsContext();
  const { value, orientation, getTabs } = ctx;
  const firstPaintRef = useRef(true);

  useLayoutEffect(() => {
    if (!listEl || !indicatorEl) return;
    const apply = () => {
      if (value == null) {
        indicatorEl.style.opacity = "0";
        return;
      }
      const tab = getTabs().find((t) => t.value === value);
      if (!tab) {
        indicatorEl.style.opacity = "0";
        return;
      }
      indicatorEl.style.opacity = "1";
      if (orientation === "horizontal") {
        indicatorEl.style.transform = `translateX(${tab.element.offsetLeft}px)`;
        indicatorEl.style.width = `${tab.element.offsetWidth}px`;
        indicatorEl.style.height = "2px";
      } else {
        indicatorEl.style.transform = `translateY(${tab.element.offsetTop}px)`;
        indicatorEl.style.height = `${tab.element.offsetHeight}px`;
        indicatorEl.style.width = "2px";
      }
    };

    if (firstPaintRef.current) {
      const prev = indicatorEl.style.transition;
      indicatorEl.style.transition = "none";
      apply();
      const raf = requestAnimationFrame(() => {
        indicatorEl.style.transition = prev;
      });
      firstPaintRef.current = false;
      const ro = new ResizeObserver(apply);
      ro.observe(listEl);
      const mo = new MutationObserver(apply);
      mo.observe(listEl, { childList: true, subtree: true });
      return () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        mo.disconnect();
      };
    }
    apply();

    const ro = new ResizeObserver(apply);
    ro.observe(listEl);
    const mo = new MutationObserver(apply);
    mo.observe(listEl, { childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [listEl, indicatorEl, value, orientation, getTabs]);
}

function useTabsScroll(
  listEl: HTMLDivElement | null,
  orientation: TabsOrientation,
) {
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  useEffect(() => {
    if (!listEl) {
      setCanScrollStart(false);
      setCanScrollEnd(false);
      return;
    }
    const update = () => {
      if (orientation === "horizontal") {
        const max = listEl.scrollWidth - listEl.clientWidth;
        const s = Math.abs(listEl.scrollLeft);
        setCanScrollStart(s > 1);
        setCanScrollEnd(max > 1 && s < max - 1);
      } else {
        const max = listEl.scrollHeight - listEl.clientHeight;
        const s = listEl.scrollTop;
        setCanScrollStart(s > 1);
        setCanScrollEnd(max > 1 && s < max - 1);
      }
    };
    update();
    listEl.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(listEl);
    const mo = new MutationObserver(update);
    mo.observe(listEl, { childList: true, subtree: true });
    return () => {
      listEl.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [listEl, orientation]);

  return { canScrollStart, canScrollEnd };
}

interface TabsScrollButtonProps {
  direction: "start" | "end";
  orientation: TabsOrientation;
  theme: TabsTheme;
  hidden: boolean;
  onClick: () => void;
}

function TabsScrollButton(props: TabsScrollButtonProps) {
  const { direction, orientation, theme, hidden, onClick } = props;
  const p = tabsPalette[theme];
  const [hover, setHover] = useState(false);

  const glyph =
    orientation === "horizontal"
      ? direction === "start"
        ? "\u2039"
        : "\u203A"
      : direction === "start"
        ? "\u25B2"
        : "\u25BC";

  const style: CSSProperties = {
    flex: "0 0 auto",
    width: orientation === "horizontal" ? 24 : "auto",
    height: orientation === "vertical" ? 24 : "auto",
    background: hover ? p.scrollBtnHoverBg : p.scrollBtnBg,
    color: p.scrollBtnFg,
    border: 0,
    outline: "none",
    cursor: "pointer",
    display: hidden ? "none" : "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    lineHeight: 1,
    padding: 0,
    userSelect: "none",
    zIndex: 2,
    fontFamily: "inherit",
  };

  return (
    <button
      type="button"
      aria-label={
        orientation === "horizontal"
          ? direction === "start"
            ? "Scroll tabs left"
            : "Scroll tabs right"
          : direction === "start"
            ? "Scroll tabs up"
            : "Scroll tabs down"
      }
      tabIndex={-1}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={style}
    >
      {glyph}
    </button>
  );
}
TabsScrollButton.displayName = "Tabs.ScrollButton";

function TabsList(props: TabsListProps) {
  const {
    children,
    className,
    style,
    scrollable = true,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
  } = props;
  const ctx = useTabsContext();
  const { orientation, theme, listRef, rtl, value, getTabs } = ctx;
  const p = tabsPalette[theme];

  const [listEl, setListEl] = useState<HTMLDivElement | null>(null);
  const [indicatorEl, setIndicatorEl] = useState<HTMLDivElement | null>(null);

  const listRefCb = useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node;
      setListEl(node);
    },
    [listRef],
  );

  useTabsIndicator(listEl, indicatorEl);
  const { canScrollStart, canScrollEnd } = useTabsScroll(listEl, orientation);

  useEffect(() => {
    if (!listEl || value == null) return;
    const tab = getTabs().find((t) => t.value === value);
    if (!tab) return;
    const el = tab.element;
    if (orientation === "horizontal") {
      const elLeft = el.offsetLeft;
      const elRight = elLeft + el.offsetWidth;
      const viewLeft = listEl.scrollLeft;
      const viewRight = viewLeft + listEl.clientWidth;
      if (elLeft < viewLeft || elRight > viewRight) {
        el.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
          block: "nearest",
        });
      }
    } else {
      const elTop = el.offsetTop;
      const elBottom = elTop + el.offsetHeight;
      const viewTop = listEl.scrollTop;
      const viewBottom = viewTop + listEl.clientHeight;
      if (elTop < viewTop || elBottom > viewBottom) {
        el.scrollIntoView({
          behavior: "smooth",
          inline: "nearest",
          block: "nearest",
        });
      }
    }
  }, [value, listEl, orientation, getTabs]);

  const scrollBy = useCallback(
    (dir: 1 | -1) => {
      if (!listEl) return;
      if (orientation === "horizontal") {
        const step = listEl.clientWidth * 0.8;
        const signed = rtl ? -dir * step : dir * step;
        listEl.scrollBy({ left: signed, behavior: "smooth" });
      } else {
        const step = listEl.clientHeight * 0.8;
        listEl.scrollBy({ top: dir * step, behavior: "smooth" });
      }
    },
    [listEl, orientation, rtl],
  );

  const wrapStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: orientation === "horizontal" ? "row" : "column",
    alignItems: "stretch",
    flex: "0 0 auto",
  };

  const listStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: orientation === "horizontal" ? "row" : "column",
    flex: "1 1 0",
    overflowX: orientation === "horizontal" ? "auto" : "hidden",
    overflowY: orientation === "vertical" ? "auto" : "hidden",
    scrollbarWidth: "none",
    scrollBehavior: "smooth",
    minWidth: 0,
    minHeight: 0,
    ...style,
  };

  const borderStyle: CSSProperties =
    orientation === "horizontal"
      ? { borderBottom: `1px solid ${p.listBorder}` }
      : { borderRight: `1px solid ${p.listBorder}` };

  const indicatorStyle: CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    willChange: "transform, width, height",
    background: p.indicatorBg,
    opacity: 0,
    transition:
      "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1), height 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 120ms",
    ...(orientation === "horizontal"
      ? { bottom: 0, left: 0, height: 2 }
      : { top: 0, left: 0, width: 2 }),
  };

  return (
    <div style={{ ...wrapStyle, ...borderStyle }}>
      {scrollable && (
        <TabsScrollButton
          direction="start"
          orientation={orientation}
          theme={theme}
          hidden={!canScrollStart}
          onClick={() => scrollBy(-1)}
        />
      )}
      <div
        ref={listRefCb}
        role="tablist"
        aria-orientation={orientation}
        {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
        {...(ariaLabelledBy !== undefined
          ? { "aria-labelledby": ariaLabelledBy }
          : {})}
        className={className}
        style={listStyle}
      >
        {children}
        <div ref={setIndicatorEl} style={indicatorStyle} />
      </div>
      {scrollable && (
        <TabsScrollButton
          direction="end"
          orientation={orientation}
          theme={theme}
          hidden={!canScrollEnd}
          onClick={() => scrollBy(1)}
        />
      )}
    </div>
  );
}
TabsList.displayName = "Tabs.List";

function TabsTrigger(props: TabsTriggerProps) {
  const {
    value,
    disabled = false,
    closable = false,
    onClose,
    icon,
    children,
    className,
    style,
  } = props;

  const ctx = useTabsContext();
  const {
    rootId,
    value: activeValue,
    setValue,
    theme,
    disabled: rootDisabled,
    register,
    onTriggerKeyDown,
    orientation,
  } = ctx;

  const p = tabsPalette[theme];
  const nodeRef = useRef<HTMLButtonElement | null>(null);
  const [hover, setHover] = useState(false);
  const [focusRing, setFocusRing] = useState(false);
  const [closeHover, setCloseHover] = useState(false);

  const effDisabled = rootDisabled || disabled;
  const isActive = activeValue === value;

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const tab: RegisteredTab = {
      value,
      element: node,
      disabled: effDisabled,
      closable,
      ...(onClose !== undefined ? { onClose } : {}),
    };
    const unregister = register(tab);
    return unregister;
  }, [value, effDisabled, closable, onClose, register]);

  const handleClick = useCallback(() => {
    if (effDisabled) return;
    setValue(value);
  }, [effDisabled, setValue, value]);

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (effDisabled) return;
      onTriggerKeyDown(e, value);
    },
    [effDisabled, onTriggerKeyDown, value],
  );

  const triggerId = `${rootId}-trigger-${value}`;
  const contentId = `${rootId}-content-${value}`;

  const baseStyle: CSSProperties = {
    appearance: "none",
    background: hover && !effDisabled ? p.triggerHoverBg : "transparent",
    border: 0,
    padding: orientation === "horizontal" ? "8px 12px" : "8px 16px",
    font: "inherit",
    fontSize: 13,
    color: effDisabled
      ? p.disabledFg
      : isActive
        ? p.triggerActiveFg
        : hover
          ? p.triggerHoverFg
          : p.triggerFg,
    cursor: effDisabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
    position: "relative",
    userSelect: "none",
    borderRadius: 0,
    transition: "color 120ms, background 120ms",
    opacity: effDisabled ? 0.5 : 1,
    outline: "none",
    boxShadow: focusRing ? `inset 0 0 0 2px ${p.focusRing}` : "none",
    justifyContent: orientation === "vertical" ? "flex-start" : "center",
    textAlign: orientation === "vertical" ? "left" : "center",
    flex: "0 0 auto",
    ...style,
  };

  const closeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    borderRadius: 4,
    fontSize: 14,
    lineHeight: 1,
    background: closeHover ? p.closeHoverBg : "transparent",
    opacity: hover || isActive || focusRing ? 1 : 0,
    transition: "opacity 120ms, background 120ms",
    cursor: "pointer",
    marginLeft: 4,
    color: "inherit",
  };

  const handleCloseClick = (e: ReactMouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    if (effDisabled) return;
    onClose?.(value);
  };

  const handleClosePointerDown = (e: ReactMouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
  };

  return (
    <button
      ref={nodeRef}
      type="button"
      role="tab"
      id={triggerId}
      aria-selected={isActive}
      aria-controls={contentId}
      aria-disabled={effDisabled || undefined}
      tabIndex={isActive ? 0 : -1}
      data-state={isActive ? "active" : "inactive"}
      data-disabled={effDisabled || undefined}
      disabled={effDisabled}
      className={className}
      style={baseStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => !effDisabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => setFocusRing(e.target.matches(":focus-visible"))}
      onBlur={() => setFocusRing(false)}
    >
      {icon !== undefined && (
        <span
          aria-hidden="true"
          style={{ display: "inline-flex", alignItems: "center" }}
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
      {closable && (
        <span
          role="button"
          aria-label={`Close tab ${value}`}
          tabIndex={-1}
          style={closeStyle}
          onClick={handleCloseClick}
          onMouseDown={handleClosePointerDown}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
        >
          {"\u00D7"}
        </span>
      )}
    </button>
  );
}
TabsTrigger.displayName = "Tabs.Trigger";

function TabsContent(props: TabsContentProps) {
  const {
    value,
    forceMount = false,
    children,
    className,
    style,
  } = props;
  const ctx = useTabsContext();
  const { rootId, value: activeValue } = ctx;
  const isActive = activeValue === value;

  if (!isActive && !forceMount) return null;

  const contentId = `${rootId}-content-${value}`;
  const triggerId = `${rootId}-trigger-${value}`;

  const contentStyle: CSSProperties = {
    outline: "none",
    ...style,
  };

  return (
    <div
      role="tabpanel"
      id={contentId}
      aria-labelledby={triggerId}
      tabIndex={0}
      data-state={isActive ? "active" : "inactive"}
      hidden={!isActive}
      {...(!isActive ? { "aria-hidden": true } : {})}
      className={className}
      style={contentStyle}
    >
      {children}
    </div>
  );
}
TabsContent.displayName = "Tabs.Content";

export const Tabs = {
  Root: TabsRoot,
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
};
