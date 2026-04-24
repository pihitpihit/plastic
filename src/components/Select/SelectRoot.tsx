import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useControllable } from "../_shared/useControllable";
import { useFloating } from "../_shared/useFloating";
import type { Alignment, Placement, Side } from "../_shared/useFloating";
import {
  SelectContext,
  type FloatingOptions,
  type RegisteredItem,
  type SelectContextValue,
} from "./SelectContext";
import { useSelectTypeahead } from "./useSelectTypeahead";
import type { SelectAlign, SelectRootProps, SelectValue } from "./Select.types";

function toPlacement(side: Side, align: SelectAlign): Placement {
  if (align === "center") return side;
  return `${side}-${align}` as Placement;
}

function sortByDocumentPosition(items: RegisteredItem[]): RegisteredItem[] {
  if (items.length < 2) return items;
  return [...items].sort((a, b) => {
    if (a.node === b.node) return 0;
    const pos = a.node.compareDocumentPosition(b.node);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

export function SelectRoot(props: SelectRootProps) {
  const {
    children,
    value: controlledValue,
    defaultValue,
    onValueChange,
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    placeholder,
    disabled = false,
    name,
    required = false,
    theme = "light",
  } = props;

  const valueChangeAdapter = useCallback(
    (v: SelectValue | undefined) => {
      if (v !== undefined) onValueChange?.(v);
    },
    [onValueChange],
  );
  const [value, setValueInternal] = useControllable<SelectValue | undefined>(
    controlledValue,
    defaultValue,
    valueChangeAdapter,
  );

  const [open, setOpenInternal] = useControllable<boolean>(
    controlledOpen,
    defaultOpen ?? false,
    onOpenChange,
  );

  const [activeValue, setActiveValue] = useState<SelectValue | null>(null);

  const [floatingOptions, setFloatingOptions] = useState<FloatingOptions>({
    side: "bottom",
    align: "start",
    sideOffset: 4,
    matchTriggerWidth: true,
  });

  const placement = toPlacement(floatingOptions.side, floatingOptions.align);

  const floating = useFloating({
    placement,
    offset: floatingOptions.sideOffset,
    enabled: open,
    flip: true,
  });

  const listboxId = useId();
  const triggerId = useId();

  const itemsRef = useRef<Map<SelectValue, RegisteredItem>>(new Map());
  const activeValueRef = useRef<SelectValue | null>(null);
  activeValueRef.current = activeValue;

  useEffect(() => {
    if (!open) {
      setActiveValue(null);
    }
  }, [open]);

  useEffect(() => {
    if (disabled && open) {
      setOpenInternal(false);
    }
  }, [disabled, open, setOpenInternal]);

  const setValue = useCallback(
    (v: SelectValue) => {
      setValueInternal(v);
      setOpenInternal(false);
    },
    [setValueInternal, setOpenInternal],
  );

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && disabled) return;
      setOpenInternal(next);
    },
    [disabled, setOpenInternal],
  );

  const close = useCallback(
    (reason: "select" | "escape" | "outside" | "blur" | "tab") => {
      setOpenInternal(false);
      if (reason === "escape" || reason === "select") {
        requestAnimationFrame(() => {
          const trig = floating.triggerRef.current;
          if (trig && typeof (trig as HTMLButtonElement).focus === "function") {
            (trig as HTMLButtonElement).focus();
          }
        });
      }
    },
    [setOpenInternal, floating.triggerRef],
  );

  const registerItem = useCallback((item: RegisteredItem) => {
    const map = itemsRef.current;
    if (map.has(item.value)) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Select] Duplicate Item value detected: "${item.value}". Only the first registration is used.`,
      );
    }
    if (!map.has(item.value)) {
      map.set(item.value, item);
    }
    return () => {
      const cur = map.get(item.value);
      if (cur && cur.id === item.id) {
        map.delete(item.value);
      }
    };
  }, []);

  const getItems = useCallback((): RegisteredItem[] => {
    const arr = Array.from(itemsRef.current.values());
    return sortByDocumentPosition(arr);
  }, []);

  const getActiveId = useCallback((): string | undefined => {
    if (activeValue == null) return undefined;
    return itemsRef.current.get(activeValue)?.id;
  }, [activeValue]);

  const getActiveValue = useCallback(() => activeValueRef.current, []);

  const onTypeAhead = useSelectTypeahead({
    getItems,
    getActiveValue,
    setActiveValue,
  });

  useEffect(() => {
    if (activeValue == null) return;
    const node = itemsRef.current.get(activeValue)?.node;
    if (node) {
      node.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activeValue]);

  const alignment: Alignment | undefined =
    floatingOptions.align === "center" ? undefined : floatingOptions.align;

  const contextValue = useMemo<SelectContextValue>(
    () => ({
      value,
      setValue,
      open,
      setOpen,
      close,
      disabled,
      theme,
      placeholder,
      activeValue,
      setActiveValue,
      registerItem,
      getItems,
      getActiveId,
      triggerRef: floating.triggerRef,
      floatingRef: floating.floatingRef,
      listboxId,
      triggerId,
      name,
      required,
      onTypeAhead,
      setFloatingOptions,
      floatingStyles: floating.floatingStyles,
      placement: floating.placement,
      isPositioned: floating.isPositioned,
      matchTriggerWidth: floatingOptions.matchTriggerWidth,
      alignment,
    }),
    [
      value,
      setValue,
      open,
      setOpen,
      close,
      disabled,
      theme,
      placeholder,
      activeValue,
      registerItem,
      getItems,
      getActiveId,
      floating.triggerRef,
      floating.floatingRef,
      floating.floatingStyles,
      floating.placement,
      floating.isPositioned,
      listboxId,
      triggerId,
      name,
      required,
      onTypeAhead,
      floatingOptions.matchTriggerWidth,
      alignment,
    ],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      {children}
      {name !== undefined ? (
        <input
          type="hidden"
          name={name}
          value={value ?? ""}
          {...(required ? { required: true } : {})}
        />
      ) : null}
    </SelectContext.Provider>
  );
}
