import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useControllable } from "../_shared/useControllable";
import type {
  CommandItem,
  CommandPaletteContextValue,
  CommandPaletteRootProps,
  FuzzyMatchResult,
} from "./CommandPalette.types";
import { isMac, matchesShortcut } from "./helpers";

const CommandPaletteContext =
  createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (ctx === null) {
    throw new Error(
      "CommandPalette sub-components must be used within CommandPalette.Root",
    );
  }
  return ctx;
}

const DEFAULT_MAC_SHORTCUT = ["Meta", "k"];
const DEFAULT_WIN_SHORTCUT = ["Control", "k"];

export function CommandPaletteRoot({
  children,
  items,
  recentItems,
  pinnedItems,
  open: openProp,
  defaultOpen,
  onOpenChange,
  shortcut,
  theme,
  onSelect,
  ...rest
}: CommandPaletteRootProps) {
  const [open, setOpen] = useControllable<boolean>(
    openProp,
    defaultOpen ?? false,
    onOpenChange,
  );

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState<CommandItem[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const listId = useId();
  const getItemId = useCallback(
    (id: string) => `${listId}-item-${id}`,
    [listId],
  );

  const resolvedShortcut = useMemo(
    () => shortcut ?? (isMac() ? DEFAULT_MAC_SHORTCUT : DEFAULT_WIN_SHORTCUT),
    [shortcut],
  );

  const resolvedTheme = theme ?? "light";
  const resolvedItems = useMemo(() => items ?? [], [items]);
  const resolvedRecentItems = useMemo(
    () => recentItems ?? [],
    [recentItems],
  );
  const resolvedPinnedItems = useMemo(
    () => pinnedItems ?? [],
    [pinnedItems],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, resolvedShortcut)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [resolvedShortcut, open, setOpen]);

  const pushBreadcrumb = useCallback((item: CommandItem) => {
    if (item.children === undefined || item.children.length === 0) return;
    setBreadcrumbs((prev) => [...prev, item]);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const popBreadcrumb = useCallback(() => {
    setBreadcrumbs((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
    setQuery("");
    setActiveIndex(0);
  }, []);

  const selectItem = useCallback(
    (item: CommandItem) => {
      if (item.disabled) return;
      if (item.children !== undefined && item.children.length > 0) {
        pushBreadcrumb(item);
        return;
      }
      item.onSelect();
      onSelect?.(item);
      setOpen(false);
    },
    [onSelect, pushBreadcrumb, setOpen],
  );

  const results: CommandItem[] = useMemo(() => {
    if (breadcrumbs.length > 0) {
      const last = breadcrumbs[breadcrumbs.length - 1]!;
      return last.children ?? [];
    }
    return resolvedItems;
  }, [breadcrumbs, resolvedItems]);

  const matches = useMemo(() => new Map<string, FuzzyMatchResult>(), []);

  const contextValue = useMemo<CommandPaletteContextValue>(
    () => ({
      open,
      setOpen,
      query,
      setQuery,
      results,
      matches,
      isLoading: false,
      activeIndex,
      setActiveIndex,
      selectItem,
      theme: resolvedTheme,
      inputRef,
      listId,
      getItemId,
      breadcrumbs,
      pushBreadcrumb,
      popBreadcrumb,
      recentItems: resolvedRecentItems,
      pinnedItems: resolvedPinnedItems,
      shortcut: resolvedShortcut,
    }),
    [
      open,
      setOpen,
      query,
      results,
      matches,
      activeIndex,
      selectItem,
      resolvedTheme,
      listId,
      getItemId,
      breadcrumbs,
      pushBreadcrumb,
      popBreadcrumb,
      resolvedRecentItems,
      resolvedPinnedItems,
      resolvedShortcut,
    ],
  );

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      <div {...rest}>{children}</div>
    </CommandPaletteContext.Provider>
  );
}
