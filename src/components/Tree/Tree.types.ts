import type { ReactNode, CSSProperties, MouseEvent as ReactMouseEvent } from "react";

export type TreeTheme = "light" | "dark";

export type TreeSelectionMode = "none" | "single" | "multiple";

export type TreeCheckCascade = "parent-child" | "self";

export interface TreeNode<T = unknown> {
  id: string;
  label?: ReactNode | undefined;
  children?: TreeNode<T>[] | undefined;
  hasChildren?: boolean | undefined;
  disabled?: boolean | undefined;
  icon?: ReactNode | undefined;
  data?: T | undefined;
}

export interface TreeRenderNodeArgs<T = unknown> {
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

export interface TreeRootProps<T = unknown> {
  data?: TreeNode<T>[] | undefined;

  expanded?: ReadonlySet<string> | undefined;
  defaultExpanded?: ReadonlySet<string> | undefined;
  onExpandedChange?: ((next: ReadonlySet<string>) => void) | undefined;

  selectionMode?: TreeSelectionMode | undefined;
  selected?: ReadonlySet<string> | undefined;
  defaultSelected?: ReadonlySet<string> | undefined;
  onSelectedChange?: ((next: ReadonlySet<string>) => void) | undefined;

  checkable?: boolean | undefined;
  checked?: ReadonlySet<string> | undefined;
  defaultChecked?: ReadonlySet<string> | undefined;
  onCheckedChange?: ((next: ReadonlySet<string>) => void) | undefined;
  checkCascade?: TreeCheckCascade | undefined;

  loadChildren?: ((node: TreeNode<T>) => Promise<TreeNode<T>[]>) | undefined;

  renderNode?: ((args: TreeRenderNodeArgs<T>) => ReactNode) | undefined;

  indent?: number | undefined;
  showIndentGuides?: boolean | undefined;

  maxDepth?: number | undefined;

  theme?: TreeTheme | undefined;

  disabled?: boolean | undefined;

  "aria-label"?: string | undefined;
  "aria-labelledby"?: string | undefined;

  onNodeActivate?: ((node: TreeNode<T>) => void) | undefined;
  onNodeContextMenu?: ((node: TreeNode<T>, e: ReactMouseEvent) => void) | undefined;

  filter?: ((node: TreeNode<T>) => boolean) | undefined;

  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export interface TreeNodeProps {
  id: string;
  label?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  disabled?: boolean | undefined;
  hasChildren?: boolean | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export interface TreeLabelProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export interface TreeExpandToggleProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  collapsedIcon?: ReactNode | undefined;
  expandedIcon?: ReactNode | undefined;
  loadingIcon?: ReactNode | undefined;
  reserveSpaceForLeaf?: boolean | undefined;
}

export interface TreeChildrenProps {
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

export interface TreeRootHandle {
  expandAll(): void;
  collapseAll(): void;
  expandTo(id: string): void;
  focus(id?: string): void;
  getExpanded(): ReadonlySet<string>;
  getSelected(): ReadonlySet<string>;
  getChecked(): ReadonlySet<string>;
}
