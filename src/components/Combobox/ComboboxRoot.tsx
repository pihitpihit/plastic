import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useControllable } from "../_shared/useControllable";
import { ComboboxContext, type ComboboxContextValue } from "./ComboboxContext";
import { filterOptions } from "./filter";
import type {
  ComboboxMatchResult,
  ComboboxOption,
  ComboboxRootProps,
  ComboboxRootPropsMultiple,
  ComboboxRootPropsSingle,
  ComboboxTheme,
} from "./Combobox.types";

function isMultipleProps(
  p: ComboboxRootProps,
): p is ComboboxRootPropsMultiple {
  return p.multiple === true;
}

export function ComboboxRoot(props: ComboboxRootProps) {
  const multiple = isMultipleProps(props);
  const {
    options: propOptions,
    inputValue: controlledInputValue,
    defaultInputValue,
    onInputValueChange,
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    filter,
    onSearch,
    searchDebounce = 200,
    minChars = 0,
    maxResults = 50,
    freeform = false,
    strict,
    disabled = false,
    readOnly = false,
    placeholder,
    theme = "light" as ComboboxTheme,
    getOptionLabel: getOptionLabelProp,
    children,
    style,
    className,
  } = props;

  const options = useMemo<ComboboxOption[]>(
    () => propOptions ?? [],
    [propOptions],
  );

  const isFreeform = freeform === true && strict !== true;
  const isStrict = !isFreeform;

  const listId = useId();
  const itemIdPrefix = useId();

  const getItemId = useCallback(
    (value: string) => `${itemIdPrefix}-${value}`,
    [itemIdPrefix],
  );

  const [internalValueSingle, setInternalValueSingle] = useState<string | null>(
    () => {
      if (multiple) return null;
      const sp = props as ComboboxRootPropsSingle;
      return sp.defaultValue ?? null;
    },
  );
  const [internalValueMulti, setInternalValueMulti] = useState<string[]>(() => {
    if (!multiple) return [];
    const mp = props as ComboboxRootPropsMultiple;
    return mp.defaultValue ?? [];
  });

  const singleControlled = !multiple
    ? (props as ComboboxRootPropsSingle).value !== undefined
    : false;
  const multiControlled = multiple
    ? (props as ComboboxRootPropsMultiple).value !== undefined
    : false;

  const valueRaw: string | string[] | null = multiple
    ? multiControlled
      ? ((props as ComboboxRootPropsMultiple).value ?? [])
      : internalValueMulti
    : singleControlled
      ? ((props as ComboboxRootPropsSingle).value ?? null)
      : internalValueSingle;

  const singleOnChangeRef = useRef<
    ((next: string | null) => void) | undefined
  >(undefined);
  const multiOnChangeRef = useRef<((next: string[]) => void) | undefined>(
    undefined,
  );
  singleOnChangeRef.current = !multiple
    ? (props as ComboboxRootPropsSingle).onValueChange
    : undefined;
  multiOnChangeRef.current = multiple
    ? (props as ComboboxRootPropsMultiple).onValueChange
    : undefined;

  const setValueSingle = useCallback(
    (next: string | null) => {
      if (!singleControlled) setInternalValueSingle(next);
      singleOnChangeRef.current?.(next);
    },
    [singleControlled],
  );

  const setValueMulti = useCallback(
    (next: string[]) => {
      if (!multiControlled) setInternalValueMulti(next);
      multiOnChangeRef.current?.(next);
    },
    [multiControlled],
  );

  const [inputValue, setInputValue] = useControllable<string>(
    controlledInputValue,
    defaultInputValue ?? "",
    onInputValueChange,
  );

  const [open, setOpen] = useControllable<boolean>(
    controlledOpen,
    defaultOpen ?? false,
    onOpenChange,
  );

  const [asyncResults, setAsyncResults] = useState<ComboboxOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const searchSeqRef = useRef(0);

  useEffect(() => {
    if (!onSearch) return;
    const q = inputValue;
    if (q.trim().length < minChars) {
      searchSeqRef.current++;
      setAsyncResults([]);
      setIsLoading(false);
      return;
    }
    const seq = ++searchSeqRef.current;
    setIsLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await onSearch(q);
          if (seq !== searchSeqRef.current) return;
          setAsyncResults(res);
        } catch {
          if (seq !== searchSeqRef.current) return;
          setAsyncResults([]);
        } finally {
          if (seq === searchSeqRef.current) setIsLoading(false);
        }
      })();
    }, searchDebounce);
    return () => clearTimeout(timer);
  }, [inputValue, onSearch, searchDebounce, minChars]);

  const { results, matches } = useMemo<{
    results: ComboboxOption[];
    matches: Map<string, ComboboxMatchResult>;
  }>(() => {
    const map = new Map<string, ComboboxMatchResult>();
    if (onSearch) {
      const arr = asyncResults;
      for (const o of arr) {
        map.set(o.value, { option: o, score: 0, labelMatches: [] });
      }
      return { results: arr, matches: map };
    }
    const q = inputValue;
    if (filter) {
      const raw = filter(q, options);
      const out: ComboboxOption[] = [];
      for (const entry of raw) {
        if ("option" in entry) {
          out.push(entry.option);
          map.set(entry.option.value, entry);
        } else {
          out.push(entry);
          map.set(entry.value, { option: entry, score: 0, labelMatches: [] });
        }
      }
      return { results: out.slice(0, maxResults), matches: map };
    }
    const matched = filterOptions(q, options, maxResults);
    const out: ComboboxOption[] = [];
    for (const m of matched) {
      out.push(m.option);
      map.set(m.option.value, m);
    }
    return { results: out, matches: map };
  }, [onSearch, asyncResults, inputValue, filter, options, maxResults]);

  useEffect(() => {
    setActiveIndex((prev) => {
      if (results.length === 0) return 0;
      if (prev < 0) return 0;
      if (prev >= results.length) return results.length - 1;
      return prev;
    });
  }, [results]);

  const getOptionLabel = useCallback(
    (value: string) => {
      if (getOptionLabelProp) return getOptionLabelProp(value);
      const found = options.find((o) => o.value === value);
      return found ? found.label : value;
    },
    [getOptionLabelProp, options],
  );

  const inputRef = useRef<HTMLInputElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemNodeMapRef = useRef<Map<string, HTMLElement>>(new Map());

  const registerItemNode = useCallback(
    (value: string, node: HTMLElement | null) => {
      if (node === null) {
        itemNodeMapRef.current.delete(value);
      } else {
        itemNodeMapRef.current.set(value, node);
      }
    },
    [],
  );

  const selectOption = useCallback(
    (opt: ComboboxOption) => {
      if (opt.disabled) return;
      if (multiple) {
        const cur = (valueRaw as string[]) ?? [];
        if (cur.includes(opt.value)) return;
        setValueMulti([...cur, opt.value]);
        setInputValue("");
        setActiveIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        setValueSingle(opt.value);
        setInputValue(opt.label);
        setOpen(false);
      }
    },
    [multiple, valueRaw, setValueMulti, setValueSingle, setInputValue, setOpen],
  );

  const commitFreeform = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      if (multiple) {
        const cur = (valueRaw as string[]) ?? [];
        if (cur.includes(t)) return;
        setValueMulti([...cur, t]);
        setInputValue("");
      } else {
        setValueSingle(t);
        setInputValue(t);
        setOpen(false);
      }
    },
    [multiple, valueRaw, setValueMulti, setValueSingle, setInputValue, setOpen],
  );

  const removeValue = useCallback(
    (v: string) => {
      if (multiple) {
        const cur = (valueRaw as string[]) ?? [];
        setValueMulti(cur.filter((x) => x !== v));
      } else {
        setValueSingle(null);
        setInputValue("");
      }
    },
    [multiple, valueRaw, setValueMulti, setValueSingle, setInputValue],
  );

  const clearAll = useCallback(() => {
    if (multiple) {
      setValueMulti([]);
    } else {
      setValueSingle(null);
    }
    setInputValue("");
  }, [multiple, setValueMulti, setValueSingle, setInputValue]);

  const ctxValue = useMemo<ComboboxContextValue>(
    () => ({
      listId,
      getItemId,
      theme,
      disabled,
      readOnly,
      multiple,
      freeform: isFreeform,
      strict: isStrict,
      placeholder,
      minChars,
      maxResults,
      value: valueRaw,
      open,
      setOpen,
      inputValue,
      setInputValue,
      options,
      results,
      matches,
      isLoading,
      activeIndex,
      setActiveIndex,
      selectOption,
      commitFreeform,
      removeValue,
      clearAll,
      inputRef,
      anchorRef,
      listRef,
      getOptionLabel,
      registerItemNode,
    }),
    [
      listId,
      getItemId,
      theme,
      disabled,
      readOnly,
      multiple,
      isFreeform,
      isStrict,
      placeholder,
      minChars,
      maxResults,
      valueRaw,
      open,
      setOpen,
      inputValue,
      setInputValue,
      options,
      results,
      matches,
      isLoading,
      activeIndex,
      selectOption,
      commitFreeform,
      removeValue,
      clearAll,
      getOptionLabel,
      registerItemNode,
    ],
  );

  const rootStyle = {
    position: "relative" as const,
    ...style,
  };

  return (
    <ComboboxContext.Provider value={ctxValue}>
      <div
        className={className}
        style={rootStyle}
        data-theme={theme}
        data-disabled={disabled || undefined}
        data-readonly={readOnly || undefined}
      >
        {children}
      </div>
    </ComboboxContext.Provider>
  );
}

ComboboxRoot.displayName = "Combobox.Root";
