import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  TreeContext,
  TreeItemContext,
  useTreeContext,
  useTreeItemContext,
} from "./TreeContext";
import type { TreeContextValue, TreeItemContextValue } from "./TreeContext";
import type {
  TreeChildrenProps,
  TreeExpandToggleProps,
  TreeLabelProps,
  TreeNode as TreeNodeT,
  TreeNodeProps,
  TreeRenderNodeArgs,
  TreeRootHandle,
  TreeRootProps,
} from "./Tree.types";
import {
  buildNodeById,
  collectDescendantIds,
  collectLeafIds,
  deriveCheckVM,
  EMPTY_SET,
  findPath,
  flatten,
  hasChildrenOf,
  selfCheckVM,
} from "./Tree.utils";
import type { FlatItem } from "./Tree.utils";
import { treePalette } from "./theme";
import { useTreeAsync } from "./useTreeAsync";
import { useTreeKeyboard } from "./useTreeKeyboard";

function useControlledSet(
  controlled: ReadonlySet<string> | undefined,
  defaultValue: ReadonlySet<string> | undefined,
  onChange: ((next: ReadonlySet<string>) => void) | undefined,
): [ReadonlySet<string>, (next: ReadonlySet<string>) => void] {
  const [unc, setUnc] = useState<ReadonlySet<string>>(
    () => defaultValue ?? EMPTY_SET,
  );
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : unc;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const set = useCallback(
    (next: ReadonlySet<string>) => {
      if (!isControlled) setUnc(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );
  return [value, set];
}

function withId(set: ReadonlySet<string>, id: string, on: boolean): Set<string> {
  const next = new Set(set);
  if (on) next.add(id);
  else next.delete(id);
  return next;
}

function collectFromJSXNodes(children: ReactNode): TreeNodeT[] {
  const out: TreeNodeT[] = [];
  function walk(nodes: ReactNode): TreeNodeT[] {
    const collected: TreeNodeT[] = [];
    const arr = Array.isArray(nodes) ? nodes : [nodes];
    for (const c of arr) {
      if (!c || typeof c !== "object") continue;
      const elt = c as { type?: unknown; props?: Record<string, unknown> };
      if (
        !elt.type ||
        typeof elt.type !== "function" ||
        (elt.type as { displayName?: string }).displayName !== "Tree.Node"
      ) {
        continue;
      }
      const props = (elt.props ?? {}) as unknown as TreeNodeProps;
      const childNodes = walk(props.children);
      const node: TreeNodeT = {
        id: props.id,
        label: props.label,
        ...(childNodes.length > 0 ? { children: childNodes } : {}),
        ...(props.hasChildren !== undefined
          ? { hasChildren: props.hasChildren }
          : {}),
        ...(props.disabled !== undefined ? { disabled: props.disabled } : {}),
        ...(props.icon !== undefined ? { icon: props.icon } : {}),
      };
      collected.push(node);
    }
    return collected;
  }
  out.push(...walk(children));
  return out;
}

const TreeRootImpl = forwardRef<TreeRootHandle, TreeRootProps<unknown>>(
  function TreeRoot(props, ref) {
    const {
      data: dataProp,
      expanded: expandedProp,
      defaultExpanded,
      onExpandedChange,
      selectionMode = "none",
      selected: selectedProp,
      defaultSelected,
      onSelectedChange,
      checkable = false,
      checked: checkedProp,
      defaultChecked,
      onCheckedChange,
      checkCascade = "parent-child",
      loadChildren,
      renderNode,
      indent = 16,
      showIndentGuides = false,
      maxDepth = 32,
      theme = "light",
      disabled = false,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledby,
      onNodeActivate,
      onNodeContextMenu,
      filter,
      className,
      style,
      children,
    } = props;

    const [expanded, setExpanded] = useControlledSet(
      expandedProp,
      defaultExpanded,
      onExpandedChange,
    );
    const [selected, setSelected] = useControlledSet(
      selectedProp,
      defaultSelected,
      onSelectedChange,
    );
    const [checkedRaw, setChecked] = useControlledSet(
      checkedProp,
      defaultChecked,
      onCheckedChange,
    );

    const data = useMemo<TreeNodeT[]>(() => {
      if (dataProp) return dataProp;
      return collectFromJSXNodes(children);
    }, [dataProp, children]);

    const async = useTreeAsync<unknown>(loadChildren);

    const flatItems = useMemo<FlatItem<unknown>[]>(
      () =>
        flatten(data, {
          expanded,
          maxDepth,
          loadedChildren: async.loadedChildren,
          ...(filter ? { filter } : {}),
        }),
      [data, expanded, maxDepth, async.loadedChildren, filter],
    );

    const nodeById = useMemo(
      () => buildNodeById(data, async.loadedChildren),
      [data, async.loadedChildren],
    );

    const checkedVM = useMemo(() => {
      if (!checkable) return { checked: new Set<string>(), indeterminate: new Set<string>() };
      if (checkCascade === "self") return selfCheckVM(checkedRaw);
      return deriveCheckVM(data, checkedRaw, async.loadedChildren);
    }, [checkable, checkCascade, data, checkedRaw, async.loadedChildren]);

    const [focusedId, setFocusedId] = useState<string | null>(null);

    useEffect(() => {
      if (focusedId == null) return;
      if (!flatItems.find((it) => it.node.id === focusedId)) {
        setFocusedId(flatItems[0]?.node.id ?? null);
      }
    }, [flatItems, focusedId]);

    const rowRefsRef = useRef<Map<string, HTMLElement>>(new Map());
    const registerRowEl = useCallback((id: string, el: HTMLElement | null) => {
      if (el) rowRefsRef.current.set(id, el);
      else rowRefsRef.current.delete(id);
    }, []);

    const focusDom = useCallback((id: string) => {
      const el = rowRefsRef.current.get(id);
      if (el) {
        el.focus({ preventScroll: false });
      }
    }, []);

    const toggleExpand = useCallback(
      (id: string) => {
        const node = nodeById.get(id);
        const willOpen = !expanded.has(id);
        if (
          willOpen &&
          loadChildren &&
          node &&
          !node.children &&
          !async.loadedChildren.has(id) &&
          (node.hasChildren ?? true)
        ) {
          void async.requestLoad(node);
        }
        setExpanded(withId(expanded, id, willOpen));
      },
      [expanded, nodeById, loadChildren, async, setExpanded],
    );

    const selectNode = useCallback(
      (id: string, mods: { shift: boolean; meta: boolean }) => {
        if (selectionMode === "none") return;
        const node = nodeById.get(id);
        if (!node || node.disabled) return;
        if (selectionMode === "single") {
          setSelected(new Set([id]));
          return;
        }
        if (mods.meta) {
          setSelected(withId(selected, id, !selected.has(id)));
          return;
        }
        if (mods.shift && selected.size > 0) {
          const orderedIds = flatItems.map((it) => it.node.id);
          const lastId = Array.from(selected).pop()!;
          const a = orderedIds.indexOf(lastId);
          const b = orderedIds.indexOf(id);
          if (a >= 0 && b >= 0) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            const range = orderedIds.slice(lo, hi + 1);
            setSelected(new Set(range));
            return;
          }
        }
        setSelected(new Set([id]));
      },
      [selectionMode, selected, flatItems, nodeById, setSelected],
    );

    const toggleCheck = useCallback(
      (id: string) => {
        if (!checkable) return;
        const node = nodeById.get(id);
        if (!node || node.disabled) return;
        if (checkCascade === "self") {
          setChecked(withId(checkedRaw, id, !checkedRaw.has(id)));
          return;
        }
        const leafIds = collectLeafIds(node, async.loadedChildren);
        const allOn = leafIds.every((lid) => checkedRaw.has(lid));
        const next = new Set(checkedRaw);
        if (allOn) {
          for (const lid of leafIds) next.delete(lid);
        } else {
          for (const lid of leafIds) next.add(lid);
        }
        setChecked(next);
      },
      [
        checkable,
        checkCascade,
        checkedRaw,
        async.loadedChildren,
        nodeById,
        setChecked,
      ],
    );

    const setFocusCb = useCallback((id: string | null) => {
      setFocusedId(id);
    }, []);

    const onActivateCb = useCallback(
      (id: string) => {
        const n = nodeById.get(id);
        if (n && onNodeActivate) onNodeActivate(n);
      },
      [nodeById, onNodeActivate],
    );

    const expandSiblings = useCallback(
      (id: string) => {
        const cur = flatItems.find((it) => it.node.id === id);
        if (!cur) return;
        const sibs = flatItems.filter(
          (it) => it.parentId === cur.parentId && it.hasChildren,
        );
        const next = new Set(expanded);
        for (const s of sibs) next.add(s.node.id);
        setExpanded(next);
      },
      [flatItems, expanded, setExpanded],
    );

    const onContextMenuNodeCb = useCallback(
      (n: TreeNodeT, e: React.MouseEvent) => {
        if (onNodeContextMenu) onNodeContextMenu(n, e);
      },
      [onNodeContextMenu],
    );

    const palette = treePalette[theme];

    useImperativeHandle(
      ref,
      (): TreeRootHandle => ({
        expandAll(): void {
          const all = new Set<string>();
          function walk(ns: TreeNodeT[]): void {
            for (const n of ns) {
              if (hasChildrenOf(n, async.loadedChildren)) all.add(n.id);
              if (n.children) walk(n.children);
            }
          }
          walk(data);
          setExpanded(all);
        },
        collapseAll(): void {
          setExpanded(new Set());
        },
        expandTo(id: string): void {
          const path = findPath(data, id, async.loadedChildren);
          if (!path) return;
          const next = new Set(expanded);
          for (const p of path.slice(0, -1)) next.add(p);
          setExpanded(next);
        },
        focus(id?: string): void {
          const target = id ?? flatItems[0]?.node.id ?? null;
          if (target) {
            setFocusedId(target);
            focusDom(target);
          }
        },
        getExpanded: () => expanded,
        getSelected: () => selected,
        getChecked: () => checkedRaw,
      }),
      [
        data,
        async.loadedChildren,
        expanded,
        selected,
        checkedRaw,
        flatItems,
        setExpanded,
        focusDom,
      ],
    );

    const ctxValue = useMemo<TreeContextValue<unknown>>(
      () => ({
        nodeById,
        flatItems,
        expanded,
        selected,
        checkedVM,
        loadingIds: async.loadingIds,
        errorById: async.errorById,
        focusedId,
        selectionMode,
        checkable,
        checkCascade,
        indent,
        showIndentGuides,
        disabled,
        theme,
        renderNode,
        palette,
        toggleExpand,
        selectNode,
        toggleCheck,
        setFocus: setFocusCb,
        onActivate: onActivateCb,
        onContextMenuNode: onContextMenuNodeCb,
        registerRowEl,
      }),
      [
        nodeById,
        flatItems,
        expanded,
        selected,
        checkedVM,
        async.loadingIds,
        async.errorById,
        focusedId,
        selectionMode,
        checkable,
        checkCascade,
        indent,
        showIndentGuides,
        disabled,
        theme,
        renderNode,
        palette,
        toggleExpand,
        selectNode,
        toggleCheck,
        setFocusCb,
        onActivateCb,
        onContextMenuNodeCb,
        registerRowEl,
      ],
    );

    const keyboard = useTreeKeyboard({
      flatItems,
      focusedId,
      setFocus: setFocusCb,
      focusDom,
      toggleExpand,
      selectNode,
      toggleCheck,
      onActivate: onActivateCb,
      expandSiblings,
      selectionMode,
      checkable,
      disabled,
    });

    const treeStyle: CSSProperties = {
      color: palette.textPrimary,
      fontSize: 13,
      lineHeight: "20px",
      outline: "none",
      ...style,
    };

    return (
      <TreeContext.Provider value={ctxValue}>
        <div
          role="tree"
          {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
          {...(ariaLabelledby !== undefined
            ? { "aria-labelledby": ariaLabelledby }
            : {})}
          aria-multiselectable={selectionMode === "multiple" || undefined}
          tabIndex={0}
          data-plastic-tree=""
          data-theme={theme}
          {...(className !== undefined ? { className } : {})}
          style={treeStyle}
          onKeyDown={keyboard.onKeyDown}
        >
          {flatItems.map((it) => (
            <TreeRow key={it.node.id} item={it} />
          ))}
        </div>
      </TreeContext.Provider>
    );
  },
);
TreeRootImpl.displayName = "Tree.Root";

function TreeRow({ item }: { item: FlatItem<unknown> }) {
  const ctx = useTreeContext();
  const { node, level, path, isExpanded, hasChildren } = item;

  const isSelected = ctx.selected.has(node.id);
  const isChecked = ctx.checkable && ctx.checkedVM.checked.has(node.id);
  const isIndeterminate =
    ctx.checkable && ctx.checkedVM.indeterminate.has(node.id);
  const isLoading = ctx.loadingIds.has(node.id);
  const error = ctx.errorById.get(node.id);
  const isDisabled = !!node.disabled || ctx.disabled;
  const isFocused = ctx.focusedId === node.id;

  const itemCtx = useMemo<TreeItemContextValue<unknown>>(
    () => ({
      node,
      level,
      path,
      isExpanded,
      isSelected,
      isChecked,
      isIndeterminate,
      isDisabled,
      isLoading,
      hasChildren,
      isFocused,
      ...(error !== undefined ? { error } : {}),
    }),
    [
      node,
      level,
      path,
      isExpanded,
      isSelected,
      isChecked,
      isIndeterminate,
      isDisabled,
      isLoading,
      hasChildren,
      isFocused,
      error,
    ],
  );

  const rowRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ctx.registerRowEl(node.id, rowRef.current);
    return () => ctx.registerRowEl(node.id, null);
  }, [ctx, node.id]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDisabled) return;
      ctx.setFocus(node.id);
      if (ctx.selectionMode !== "none") {
        ctx.selectNode(node.id, {
          shift: e.shiftKey,
          meta: e.metaKey || e.ctrlKey,
        });
      }
    },
    [ctx, node.id, isDisabled],
  );

  const onDoubleClick = useCallback(() => {
    if (isDisabled) return;
    if (hasChildren) ctx.toggleExpand(node.id);
    ctx.onActivate(node.id);
  }, [ctx, node.id, hasChildren, isDisabled]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      ctx.onContextMenuNode(node, e);
    },
    [ctx, node],
  );

  const baseRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    paddingLeft: level * ctx.indent + 4,
    paddingRight: 8,
    height: 24,
    cursor: isDisabled ? "default" : "pointer",
    background: isSelected ? ctx.palette.rowSelected : "transparent",
    color: isDisabled
      ? ctx.palette.disabledFg
      : isSelected
        ? ctx.palette.rowSelectedText
        : ctx.palette.textPrimary,
    outline: isFocused ? `2px solid ${ctx.palette.focus}` : "none",
    outlineOffset: -2,
    position: "relative",
    userSelect: "none",
    boxSizing: "border-box",
  };

  const renderArgs: TreeRenderNodeArgs<unknown> = {
    node,
    level,
    path,
    isExpanded,
    isSelected,
    isChecked,
    isIndeterminate,
    isDisabled,
    isLoading,
    hasChildren,
    isFocused,
    ...(error !== undefined ? { error } : {}),
  };

  const content = ctx.renderNode ? (
    ctx.renderNode(renderArgs)
  ) : (
    <DefaultNodeContent />
  );

  return (
    <TreeItemContext.Provider value={itemCtx}>
      <div
        ref={rowRef}
        role="treeitem"
        aria-level={level + 1}
        aria-posinset={item.index + 1}
        aria-setsize={item.siblingCount}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={ctx.selectionMode !== "none" ? isSelected : undefined}
        aria-checked={
          ctx.checkable
            ? isIndeterminate
              ? "mixed"
              : isChecked
            : undefined
        }
        aria-disabled={isDisabled || undefined}
        tabIndex={isFocused ? 0 : -1}
        data-tree-row=""
        data-id={node.id}
        data-level={level}
        data-selected={isSelected ? "" : undefined}
        data-disabled={isDisabled ? "" : undefined}
        style={baseRowStyle}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onMouseEnter={(e) => {
          if (!isSelected && !isDisabled) {
            (e.currentTarget as HTMLElement).style.background =
              ctx.palette.rowHover;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }
        }}
      >
        {ctx.showIndentGuides && level > 0 ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: level * ctx.indent - 8,
              top: 0,
              bottom: 0,
              width: 1,
              background: ctx.palette.guide,
            }}
          />
        ) : null}
        {content}
      </div>
    </TreeItemContext.Provider>
  );
}

function DefaultNodeContent() {
  const item = useTreeItemContext();
  const ctx = useTreeContext();
  return (
    <>
      <TreeExpandToggle />
      {ctx.checkable ? <TreeCheckbox /> : null}
      {item.node.icon ? (
        <span style={{ display: "inline-flex" }}>{item.node.icon}</span>
      ) : null}
      <TreeLabel>{item.node.label ?? item.node.id}</TreeLabel>
      {item.isLoading ? (
        <span style={{ color: ctx.palette.loadingFg, fontSize: 11 }}>…</span>
      ) : null}
      {item.error ? (
        <span style={{ color: ctx.palette.errorFg, fontSize: 11 }}>!</span>
      ) : null}
    </>
  );
}

function TreeCheckbox() {
  const item = useTreeItemContext();
  const ctx = useTreeContext();
  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      ctx.toggleCheck(item.node.id);
    },
    [ctx, item.node.id],
  );
  const size = 14;
  return (
    <span
      role="checkbox"
      aria-checked={item.isIndeterminate ? "mixed" : item.isChecked}
      aria-disabled={item.isDisabled || undefined}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        border: `1px solid ${ctx.palette.checkboxBorder}`,
        borderRadius: 3,
        background:
          item.isChecked || item.isIndeterminate
            ? ctx.palette.checkboxChecked
            : "transparent",
        color: "#fff",
        fontSize: 10,
        lineHeight: "10px",
        cursor: item.isDisabled ? "default" : "pointer",
        flexShrink: 0,
      }}
    >
      {item.isIndeterminate ? "–" : item.isChecked ? "✓" : ""}
    </span>
  );
}

function TreeNodeMarker(_props: TreeNodeProps): null {
  return null;
}
TreeNodeMarker.displayName = "Tree.Node";

function TreeLabel(props: TreeLabelProps) {
  const { className, style, children } = props;
  const item = useTreeItemContext();
  return (
    <span
      data-tree-label=""
      {...(className !== undefined ? { className } : {})}
      style={{
        flex: 1,
        minWidth: 0,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        ...style,
      }}
    >
      {children ?? item.node.label ?? item.node.id}
    </span>
  );
}
TreeLabel.displayName = "Tree.Label";

function TreeChildren(_props: TreeChildrenProps): null {
  return null;
}
TreeChildren.displayName = "Tree.Children";

function TreeExpandToggle(props: TreeExpandToggleProps = {}) {
  const {
    className,
    style,
    collapsedIcon,
    expandedIcon,
    loadingIcon,
    reserveSpaceForLeaf = true,
  } = props;
  const item = useTreeItemContext();
  const ctx = useTreeContext();

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (item.hasChildren) ctx.toggleExpand(item.node.id);
    },
    [ctx, item.hasChildren, item.node.id],
  );

  if (!item.hasChildren && !reserveSpaceForLeaf) return null;

  const size = 16;
  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    color: ctx.palette.toggleFg,
    cursor: item.hasChildren ? "pointer" : "default",
    flexShrink: 0,
    fontSize: 10,
    lineHeight: 1,
    ...style,
  };

  if (!item.hasChildren) {
    return (
      <span
        aria-hidden="true"
        data-tree-toggle=""
        {...(className !== undefined ? { className } : {})}
        style={baseStyle}
      />
    );
  }

  let content: ReactNode;
  if (item.isLoading) {
    content = loadingIcon ?? "…";
  } else if (item.isExpanded) {
    content = expandedIcon ?? "▾";
  } else {
    content = collapsedIcon ?? "▸";
  }

  return (
    <span
      role="button"
      aria-label={item.isExpanded ? "Collapse" : "Expand"}
      tabIndex={-1}
      onClick={onClick}
      data-tree-toggle=""
      {...(className !== undefined ? { className } : {})}
      style={baseStyle}
    >
      {content}
    </span>
  );
}
TreeExpandToggle.displayName = "Tree.ExpandToggle";

void collectDescendantIds;

export const Tree = {
  Root: TreeRootImpl,
  Node: TreeNodeMarker,
  Label: TreeLabel,
  Children: TreeChildren,
  ExpandToggle: TreeExpandToggle,
};
