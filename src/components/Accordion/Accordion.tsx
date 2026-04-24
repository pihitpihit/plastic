import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";
import { useReducedMotion } from "../_shared/useReducedMotion";
import {
  AccordionRootContext,
  type AccordionRootContextValue,
  type AccordionTriggerEntry,
} from "./AccordionContext";
import { paletteToCssVars } from "./theme";
import type { AccordionRootProps } from "./Accordion.types";
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

const Noop = () => null;

export const Accordion = {
  Root: AccordionRoot,
  Item: Noop,
  Header: Noop,
  Trigger: Noop,
  Content: Noop,
};
