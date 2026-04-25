import type { TreeNode } from "./Tree.types";

export const EMPTY_SET: ReadonlySet<string> = new Set<string>();

export interface FlatItem<T = unknown> {
  node: TreeNode<T>;
  level: number;
  path: string[];
  parentId: string | null;
  index: number;
  siblingCount: number;
  isExpanded: boolean;
  hasChildren: boolean;
  isLeaf: boolean;
}

export interface FlattenOptions<T = unknown> {
  expanded: ReadonlySet<string>;
  maxDepth: number;
  loadedChildren: ReadonlyMap<string, TreeNode<T>[]>;
  filter?: ((node: TreeNode<T>) => boolean) | undefined;
}

function resolveChildren<T>(
  node: TreeNode<T>,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): TreeNode<T>[] | undefined {
  const fromLoaded = loaded.get(node.id);
  if (fromLoaded) return fromLoaded;
  return node.children;
}

export function hasChildrenOf<T>(
  node: TreeNode<T>,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): boolean {
  if (node.hasChildren != null) return node.hasChildren;
  const kids = resolveChildren(node, loaded);
  return kids != null && kids.length > 0;
}

function nodeMatches<T>(
  node: TreeNode<T>,
  filter: (node: TreeNode<T>) => boolean,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): boolean {
  if (filter(node)) return true;
  const kids = resolveChildren(node, loaded) ?? [];
  for (const k of kids) if (nodeMatches(k, filter, loaded)) return true;
  return false;
}

export function flatten<T>(
  roots: TreeNode<T>[],
  opts: FlattenOptions<T>,
): FlatItem<T>[] {
  const out: FlatItem<T>[] = [];
  const seen = new Set<string>();
  const { expanded, maxDepth, loadedChildren, filter } = opts;

  function walk(
    nodes: TreeNode<T>[],
    level: number,
    path: string[],
    parentId: string | null,
  ): void {
    if (level >= maxDepth) {
      console.warn(
        `[Tree] maxDepth(${maxDepth}) exceeded at ${parentId ?? "<root>"}`,
      );
      return;
    }

    const visible = filter
      ? nodes.filter((n) => nodeMatches(n, filter, loadedChildren))
      : nodes;

    visible.forEach((node, i) => {
      if (seen.has(node.id)) {
        throw new Error(`[Tree] duplicate id: "${node.id}"`);
      }
      seen.add(node.id);

      const kids = resolveChildren(node, loadedChildren);
      const hasChildren = node.hasChildren ?? (kids != null && kids.length > 0);
      const isLeaf = !hasChildren;
      const isExpanded = expanded.has(node.id) || (filter != null && hasChildren);
      const nextPath = [...path, node.id];

      out.push({
        node,
        level,
        path: nextPath,
        parentId,
        index: i,
        siblingCount: visible.length,
        isExpanded,
        hasChildren,
        isLeaf,
      });

      if (isExpanded && kids && kids.length > 0) {
        walk(kids, level + 1, nextPath, node.id);
      }
    });
  }

  walk(roots, 0, [], null);
  return out;
}

export function buildNodeById<T>(
  roots: TreeNode<T>[] | undefined,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): Map<string, TreeNode<T>> {
  const map = new Map<string, TreeNode<T>>();
  function walk(ns: TreeNode<T>[]): void {
    for (const n of ns) {
      map.set(n.id, n);
      if (n.children) walk(n.children);
    }
  }
  if (roots) walk(roots);
  loaded.forEach((cs) => walk(cs));
  return map;
}

export function findPath<T>(
  roots: TreeNode<T>[],
  id: string,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): string[] | null {
  function search(ns: TreeNode<T>[], trail: string[]): string[] | null {
    for (const n of ns) {
      const nextTrail = [...trail, n.id];
      if (n.id === id) return nextTrail;
      const kids = resolveChildren(n, loaded) ?? [];
      const found = search(kids, nextTrail);
      if (found) return found;
    }
    return null;
  }
  return search(roots, []);
}

export function collectLeafIds<T>(
  node: TreeNode<T>,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): string[] {
  const kids = resolveChildren(node, loaded) ?? [];
  if (kids.length === 0) return [node.id];
  const out: string[] = [];
  for (const k of kids) out.push(...collectLeafIds(k, loaded));
  return out;
}

export function collectDescendantIds<T>(
  node: TreeNode<T>,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): string[] {
  const out: string[] = [];
  const kids = resolveChildren(node, loaded) ?? [];
  for (const k of kids) {
    out.push(k.id);
    out.push(...collectDescendantIds(k, loaded));
  }
  return out;
}

export interface CheckViewModel {
  checked: Set<string>;
  indeterminate: Set<string>;
}

export function deriveCheckVM<T>(
  roots: TreeNode<T>[],
  rawChecked: ReadonlySet<string>,
  loaded: ReadonlyMap<string, TreeNode<T>[]>,
): CheckViewModel {
  const checked = new Set<string>();
  const indeterminate = new Set<string>();

  function walk(node: TreeNode<T>): { fully: boolean; any: boolean } {
    const kids = resolveChildren(node, loaded) ?? [];
    if (kids.length === 0) {
      const on = rawChecked.has(node.id);
      if (on) checked.add(node.id);
      return { fully: on, any: on };
    }
    let allFully = true;
    let anyOn = false;
    for (const k of kids) {
      const r = walk(k);
      if (!r.fully) allFully = false;
      if (r.any) anyOn = true;
    }
    if (allFully) {
      checked.add(node.id);
      return { fully: true, any: true };
    }
    if (anyOn) {
      indeterminate.add(node.id);
      return { fully: false, any: true };
    }
    return { fully: false, any: false };
  }

  for (const r of roots) walk(r);
  return { checked, indeterminate };
}

export function selfCheckVM(rawChecked: ReadonlySet<string>): CheckViewModel {
  return { checked: new Set(rawChecked), indeterminate: new Set() };
}
