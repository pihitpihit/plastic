import type {
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export type CommandPaletteTheme = "light" | "dark";

export interface CommandItem {
  id: string;
  label: string;
  description?: string | undefined;
  icon?: ReactNode | undefined;
  shortcut?: string[] | undefined;
  group?: string | undefined;
  keywords?: string[] | undefined;
  onSelect: () => void;
  disabled?: boolean | undefined;
  children?: CommandItem[] | undefined;
}

export interface FuzzyMatchResult {
  item: CommandItem;
  score: number;
  labelMatches: number[];
  descriptionMatches: number[];
}

export interface CommandPaletteRootProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  children: ReactNode;

  items?: CommandItem[] | undefined;
  recentItems?: CommandItem[] | undefined;
  pinnedItems?: CommandItem[] | undefined;

  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  defaultOpen?: boolean | undefined;

  filter?:
    | ((query: string, items: CommandItem[]) => CommandItem[])
    | undefined;
  onSearch?: ((query: string) => Promise<CommandItem[]>) | undefined;
  searchDebounce?: number | undefined;
  maxResults?: number | undefined;

  shortcut?: string[] | undefined;

  theme?: CommandPaletteTheme | undefined;

  onSelect?: ((item: CommandItem) => void) | undefined;
}

export interface CommandPaletteInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  placeholder?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface CommandPaletteListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface CommandPaletteGroupProps
  extends HTMLAttributes<HTMLDivElement> {
  heading: string;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface CommandPaletteItemProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  id?: string | undefined;
  item?: CommandItem | undefined;
  onSelect?: (() => void) | undefined;
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface CommandPaletteEmptyProps
  extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface CommandPaletteLoadingProps
  extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export interface CommandPaletteFooterProps
  extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  showKeyboardHints?: boolean | undefined;
}

export interface CommandPaletteContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  query: string;
  setQuery: (next: string) => void;
  results: CommandItem[];
  matches: Map<string, FuzzyMatchResult>;
  isLoading: boolean;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  selectItem: (item: CommandItem) => void;
  theme: CommandPaletteTheme;
  inputRef: React.RefObject<HTMLInputElement | null>;
  listId: string;
  getItemId: (id: string) => string;
  breadcrumbs: CommandItem[];
  pushBreadcrumb: (item: CommandItem) => void;
  popBreadcrumb: () => void;
  recentItems: CommandItem[];
  pinnedItems: CommandItem[];
  shortcut: string[];
}
