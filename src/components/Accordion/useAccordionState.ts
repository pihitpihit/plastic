import { useCallback } from "react";
import { useControllable } from "../_shared/useControllable";
import type {
  AccordionRootProps,
  AccordionRootPropsMultiple,
  AccordionRootPropsSingle,
} from "./Accordion.types";

export interface AccordionState {
  type: "single" | "multiple";
  value: string | string[] | null;
  toggle: (v: string) => void;
  isOpen: (v: string) => boolean;
  collapsible: boolean;
}

function isMultiple(
  props: AccordionRootProps,
): props is AccordionRootPropsMultiple {
  return (props as AccordionRootPropsMultiple).type === "multiple";
}

export function useAccordionState(props: AccordionRootProps): AccordionState {
  const multi = isMultiple(props);
  const single = props as AccordionRootPropsSingle;
  const multiple = props as AccordionRootPropsMultiple;

  const collapsible = !multi ? single.collapsible ?? false : false;

  const singleOnChange = !multi ? single.onValueChange : undefined;
  const multipleOnChange = multi ? multiple.onValueChange : undefined;

  const handleSingleChange = useCallback(
    (next: string | null) => {
      singleOnChange?.(next);
    },
    [singleOnChange],
  );

  const handleMultipleChange = useCallback(
    (next: string[]) => {
      multipleOnChange?.(next);
    },
    [multipleOnChange],
  );

  const [singleValue, setSingleValue] = useControllable<string | null>(
    multi ? undefined : single.value === undefined ? undefined : single.value,
    multi ? null : single.defaultValue ?? null,
    handleSingleChange,
  );

  const [multipleValue, setMultipleValue] = useControllable<string[]>(
    !multi
      ? undefined
      : multiple.value === undefined
        ? undefined
        : multiple.value,
    !multi ? [] : multiple.defaultValue ?? [],
    handleMultipleChange,
  );

  const toggle = useCallback(
    (v: string) => {
      if (multi) {
        if (multipleValue.includes(v)) {
          setMultipleValue(multipleValue.filter((x) => x !== v));
        } else {
          setMultipleValue([...multipleValue, v]);
        }
        return;
      }
      if (singleValue === v) {
        if (collapsible) setSingleValue(null);
        return;
      }
      setSingleValue(v);
    },
    [
      multi,
      multipleValue,
      setMultipleValue,
      singleValue,
      setSingleValue,
      collapsible,
    ],
  );

  const isOpen = useCallback(
    (v: string) => {
      if (multi) return multipleValue.includes(v);
      return singleValue === v;
    },
    [multi, multipleValue, singleValue],
  );

  return {
    type: multi ? "multiple" : "single",
    value: multi ? multipleValue : singleValue,
    toggle,
    isOpen,
    collapsible,
  };
}
