import { createContext, useContext } from "react";
import type {
  TreeNode,
  TreeSelectionMode,
  TreeCheckCascade,
  TreeTheme,
  TreeRenderNodeArgs,
} from "./Tree.types";
import type { FlatItem, CheckViewModel } from "./Tree.utils";

export interface TreeContextValue<T = unknown> {
  nodeById: ReadonlyMap<string, TreeNode<T>>;
  flatItems: FlatItem<T>[];
  expanded: ReadonlySet<string>;
  selected: ReadonlySet<string>;
  checkedVM: CheckViewModel;
  loadingIds: ReadonlySet<string>;
  errorById: ReadonlyMap<string, Error>;
  focusedId: string | null;
  selectionMode: TreeSelectionMode;
  checkable: boolean;
  checkCascade: TreeCheckCascade;
  indent: number;
  showIndentGuides: boolean;
  disabled: boolean;
  theme: TreeTheme;
  renderNode: ((args: TreeRenderNodeArgs<T>) => React.ReactNode) | undefined;
  palette: {
    rowHover: string;
    rowSelected: string;
    rowSelectedText: string;
    textPrimary: string;
    textSecondary: string;
    focus: string;
    guide: string;
    toggleFg: string;
    checkboxBorder: string;
    checkboxChecked: string;
    disabledFg: string;
    loadingFg: string;
    errorFg: string;
  };
  toggleExpand: (id: string) => void;
  selectNode: (id: string, modifiers: { shift: boolean; meta: boolean }) => void;
  toggleCheck: (id: string) => void;
  setFocus: (id: string | null) => void;
  onActivate: (id: string) => void;
  onContextMenuNode: (node: TreeNode<T>, e: React.MouseEvent) => void;
  registerRowEl: (id: string, el: HTMLElement | null) => void;
}

export const TreeContext = createContext<TreeContextValue<unknown> | null>(null);

export function useTreeContext<T = unknown>(): TreeContextValue<T> {
  const ctx = useContext(TreeContext);
  if (ctx === null) {
    throw new Error("Tree compound components must be used within <Tree.Root>");
  }
  return ctx as TreeContextValue<T>;
}

export interface TreeItemContextValue<T = unknown> {
  node: TreeNode<T>;
  level: number;
  path: string[];
  isExpanded: boolean;
  isSelected: boolean;
  isChecked: boolean;
  isIndeterminate: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  hasChildren: boolean;
  isFocused: boolean;
  error?: Error | undefined;
}

export const TreeItemContext = createContext<TreeItemContextValue<unknown> | null>(
  null,
);

export function useTreeItemContext<T = unknown>(): TreeItemContextValue<T> {
  const ctx = useContext(TreeItemContext);
  if (ctx === null) {
    throw new Error(
      "Tree.ExpandToggle / Tree.Label must be used within <Tree.Node> render",
    );
  }
  return ctx as TreeItemContextValue<T>;
}
