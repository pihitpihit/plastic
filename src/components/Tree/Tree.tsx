import { forwardRef } from "react";
import type {
  TreeRootProps,
  TreeRootHandle,
  TreeNodeProps,
  TreeLabelProps,
  TreeChildrenProps,
  TreeExpandToggleProps,
} from "./Tree.types";

const TreeRoot = forwardRef<TreeRootHandle, TreeRootProps<unknown>>(
  function TreeRoot(_props, _ref) {
    return null;
  },
);
TreeRoot.displayName = "Tree.Root";

function TreeNodeMarker(_props: TreeNodeProps): null {
  return null;
}
TreeNodeMarker.displayName = "Tree.Node";

function TreeLabel(_props: TreeLabelProps): null {
  return null;
}
TreeLabel.displayName = "Tree.Label";

function TreeChildren(_props: TreeChildrenProps): null {
  return null;
}
TreeChildren.displayName = "Tree.Children";

function TreeExpandToggle(_props: TreeExpandToggleProps): null {
  return null;
}
TreeExpandToggle.displayName = "Tree.ExpandToggle";

export const Tree = {
  Root: TreeRoot,
  Node: TreeNodeMarker,
  Label: TreeLabel,
  Children: TreeChildren,
  ExpandToggle: TreeExpandToggle,
};
