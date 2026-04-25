import {
  createElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useContentHeight } from "./useContentHeight";
import { useReducedMotion } from "../_shared/useReducedMotion";
import { injectAccordionStyles } from "./Accordion.css";
import {
  AccordionItemContext,
  AccordionRootContext,
  useAccordionItemContext,
  useAccordionRootContext,
  type AccordionItemContextValue,
  type AccordionRootContextValue,
  type AccordionTriggerEntry,
} from "./AccordionContext";
import { paletteToCssVars } from "./theme";
import type {
  AccordionContentProps,
  AccordionHeaderProps,
  AccordionItemProps,
  AccordionRootProps,
  AccordionTriggerProps,
} from "./Accordion.types";
import { useAccordionState } from "./useAccordionState";

function AccordionRoot(props: AccordionRootProps) {
  const {
    disabled = false,
    disabledFocus = "skip",
    theme = "light",
    className,
    style,
    children,
  } = props;

  injectAccordionStyles();
  const state = useAccordionState(props);
  const reducedMotion = useReducedMotion();

  const triggersRef = useRef<
    Map<string, { el: HTMLButtonElement | null; disabled: boolean }>
  >(new Map());
  const orderRef = useRef<string[]>([]);

  const registerTrigger = useCallback(
    (id: string, el: HTMLButtonElement | null, triggerDisabled: boolean) => {
      const map = triggersRef.current;
      if (el === null) {
        map.delete(id);
        orderRef.current = orderRef.current.filter((x) => x !== id);
        return;
      }
      map.set(id, { el, disabled: triggerDisabled });
      if (!orderRef.current.includes(id)) {
        orderRef.current.push(id);
      }
    },
    [],
  );

  const getTriggers = useCallback((): AccordionTriggerEntry[] => {
    const map = triggersRef.current;
    const entries: AccordionTriggerEntry[] = [];
    for (const id of orderRef.current) {
      const v = map.get(id);
      if (!v) continue;
      entries.push({ id, el: v.el, disabled: v.disabled });
    }
    if (entries.length < 2) return entries;
    return [...entries].sort((a, b) => {
      const ea = a.el;
      const eb = b.el;
      if (!ea || !eb || ea === eb) return 0;
      const pos = ea.compareDocumentPosition(eb);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
  }, []);

  const focusTrigger = useCallback((id: string) => {
    const v = triggersRef.current.get(id);
    v?.el?.focus();
  }, []);

  const ctxValue = useMemo<AccordionRootContextValue>(
    () => ({
      type: state.type,
      value: state.value,
      toggle: state.toggle,
      collapsible: state.collapsible,
      disabled,
      disabledFocus,
      theme,
      reducedMotion,
      registerTrigger,
      focusTrigger,
      getTriggers,
    }),
    [
      state.type,
      state.value,
      state.toggle,
      state.collapsible,
      disabled,
      disabledFocus,
      theme,
      reducedMotion,
      registerTrigger,
      focusTrigger,
      getTriggers,
    ],
  );

  const mergedStyle: CSSProperties = {
    ...(paletteToCssVars(theme) as CSSProperties),
    ...style,
  };

  const rootClass = ["acc-root", className].filter(Boolean).join(" ");

  return (
    <AccordionRootContext.Provider value={ctxValue}>
      <div
        className={rootClass}
        data-theme={theme}
        {...(disabled ? { "data-disabled": "true" } : {})}
        style={mergedStyle}
      >
        {children}
      </div>
    </AccordionRootContext.Provider>
  );
}
AccordionRoot.displayName = "Accordion.Root";

function AccordionItem(props: AccordionItemProps) {
  const { value, disabled: itemDisabled = false, className, style, children } =
    props;
  const root = useAccordionRootContext();
  const itemId = useId();
  const triggerId = `${itemId}-trigger`;
  const contentId = `${itemId}-content`;

  const isOpen =
    root.type === "multiple"
      ? Array.isArray(root.value) && root.value.includes(value)
      : root.value === value;
  const isDisabled = root.disabled || itemDisabled;

  const ctx = useMemo<AccordionItemContextValue>(
    () => ({
      value,
      itemId,
      triggerId,
      contentId,
      isOpen,
      isDisabled,
    }),
    [value, itemId, triggerId, contentId, isOpen, isDisabled],
  );

  const itemClass = ["acc-item", className].filter(Boolean).join(" ");

  return (
    <AccordionItemContext.Provider value={ctx}>
      <div
        className={itemClass}
        data-state={isOpen ? "open" : "closed"}
        {...(isDisabled ? { "data-disabled": "true" } : {})}
        style={style}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}
AccordionItem.displayName = "Accordion.Item";

function AccordionHeader(props: AccordionHeaderProps) {
  const { as = "h3", className, style, children } = props;
  const cls = ["acc-header", className].filter(Boolean).join(" ");
  return createElement(
    as,
    { className: cls, style },
    children,
  );
}
AccordionHeader.displayName = "Accordion.Header";

function Chevron() {
  return (
    <svg
      className="acc-chevron"
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
    >
      <path
        d="M3 4.5 L6 7.5 L9 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccordionTrigger(props: AccordionTriggerProps) {
  const { children, className, style, onClick, onKeyDown, hideChevron, ...rest } =
    props;
  const root = useAccordionRootContext();
  const item = useAccordionItemContext();
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    root.registerTrigger(item.value, ref.current, item.isDisabled);
    return () => root.registerTrigger(item.value, null, false);
  }, [root, item.value, item.isDisabled]);

  const cls = ["acc-trigger", className].filter(Boolean).join(" ");

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (item.isDisabled) return;
    root.toggle(item.value);
    onClick?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const all = root.getTriggers();
    const candidates =
      root.disabledFocus === "skip" ? all.filter((t) => !t.disabled) : all;
    const idx = candidates.findIndex((t) => t.id === item.value);

    const moveTo = (targetIdx: number) => {
      if (candidates.length === 0) return;
      const safeIdx =
        ((targetIdx % candidates.length) + candidates.length) %
        candidates.length;
      const target = candidates[safeIdx];
      if (target) root.focusTrigger(target.id);
    };

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveTo(idx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveTo(idx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveTo(candidates.length - 1);
    }

    onKeyDown?.(e);
  };

  const tabIndex =
    item.isDisabled && root.disabledFocus === "skip" ? -1 : undefined;

  return (
    <button
      ref={ref}
      type="button"
      id={item.triggerId}
      aria-expanded={item.isOpen}
      aria-controls={item.contentId}
      {...(item.isDisabled ? { "aria-disabled": true } : {})}
      {...(item.isDisabled ? { disabled: true } : {})}
      {...(tabIndex !== undefined ? { tabIndex } : {})}
      data-state={item.isOpen ? "open" : "closed"}
      className={cls}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <span className="acc-trigger-label">{children}</span>
      {!hideChevron && <Chevron />}
    </button>
  );
}
AccordionTrigger.displayName = "Accordion.Trigger";

function AccordionContent(props: AccordionContentProps) {
  const { children, className, style, forceMount, ...rest } = props;
  const root = useAccordionRootContext();
  const item = useAccordionItemContext();
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const contentHeight = useContentHeight(innerRef);

  const isOpen = item.isOpen;
  const [hiddenAttr, setHiddenAttr] = useState<boolean>(!isOpen);

  useEffect(() => {
    if (isOpen) {
      setHiddenAttr(false);
      return;
    }
    if (root.reducedMotion) {
      setHiddenAttr(true);
      return;
    }
    const el = outerRef.current;
    if (!el) {
      setHiddenAttr(true);
      return;
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "max-height") return;
      if (el.getAttribute("data-state") !== "closed") return;
      setHiddenAttr(true);
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, [isOpen, root.reducedMotion]);

  if (!isOpen && !forceMount && hiddenAttr) return null;

  const measuredMaxHeight =
    contentHeight == null ? undefined : `${contentHeight}px`;

  const baseStyle: CSSProperties = {
    overflow: "hidden",
    maxHeight: root.reducedMotion
      ? isOpen
        ? "none"
        : 0
      : isOpen
        ? measuredMaxHeight ?? "none"
        : 0,
    transition: root.reducedMotion
      ? "none"
      : "max-height 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const mergedStyle: CSSProperties = { ...baseStyle, ...style };

  const cls = ["acc-content", className].filter(Boolean).join(" ");

  return (
    <div
      ref={outerRef}
      role="region"
      id={item.contentId}
      aria-labelledby={item.triggerId}
      data-state={isOpen ? "open" : "closed"}
      className={cls}
      style={mergedStyle}
      {...(!isOpen && hiddenAttr ? { hidden: true } : {})}
      {...rest}
    >
      <div ref={innerRef} className="acc-content-inner">
        {children}
      </div>
    </div>
  );
}
AccordionContent.displayName = "Accordion.Content";

export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
};
