import { useCallback, useEffect, useRef } from "react";
import type { RegisteredItem } from "./SelectContext";
import type { SelectValue } from "./Select.types";

export interface UseSelectTypeaheadOptions {
  getItems: () => RegisteredItem[];
  getActiveValue: () => SelectValue | null;
  setActiveValue: (v: SelectValue) => void;
  resetMs?: number;
}

export function useSelectTypeahead(
  options: UseSelectTypeaheadOptions,
): (char: string) => void {
  const { getItems, getActiveValue, setActiveValue, resetMs = 500 } = options;
  const bufferRef = useRef("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(
    (char: string) => {
      if (!/^[\w\s-]$/.test(char)) return;
      bufferRef.current += char.toLowerCase();
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        bufferRef.current = "";
        timerRef.current = null;
      }, resetMs);

      const items = getItems().filter((i) => !i.disabled);
      if (items.length === 0) return;

      const current = getActiveValue();
      const startFrom = current != null
        ? items.findIndex((i) => i.value === current)
        : -1;
      const ordered = [
        ...items.slice(startFrom + 1),
        ...items.slice(0, startFrom + 1),
      ];
      const buffer = bufferRef.current;
      const match = ordered.find((i) =>
        i.textValue.toLowerCase().startsWith(buffer),
      );
      if (match) {
        setActiveValue(match.value);
        match.node.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    },
    [getItems, getActiveValue, setActiveValue, resetMs],
  );
}
