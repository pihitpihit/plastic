import type {
  ContextMenuRootProps,
  ContextMenuTriggerProps,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuCheckboxItemProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuSubProps,
  ContextMenuSubTriggerProps,
  ContextMenuSubContentProps,
  ContextMenuSeparatorProps,
  ContextMenuLabelProps,
  ContextMenuShortcutProps,
} from "./ContextMenu.types";

function Placeholder(name: string) {
  const C = (_props: Record<string, unknown>) => null;
  C.displayName = name;
  return C;
}

export const ContextMenu = {
  Root: Placeholder("ContextMenu.Root") as unknown as (p: ContextMenuRootProps) => null,
  Trigger: Placeholder("ContextMenu.Trigger") as unknown as (p: ContextMenuTriggerProps) => null,
  Content: Placeholder("ContextMenu.Content") as unknown as (p: ContextMenuContentProps) => null,
  Item: Placeholder("ContextMenu.Item") as unknown as (p: ContextMenuItemProps) => null,
  CheckboxItem: Placeholder("ContextMenu.CheckboxItem") as unknown as (p: ContextMenuCheckboxItemProps) => null,
  RadioGroup: Placeholder("ContextMenu.RadioGroup") as unknown as (p: ContextMenuRadioGroupProps) => null,
  RadioItem: Placeholder("ContextMenu.RadioItem") as unknown as (p: ContextMenuRadioItemProps) => null,
  Sub: Placeholder("ContextMenu.Sub") as unknown as (p: ContextMenuSubProps) => null,
  SubTrigger: Placeholder("ContextMenu.SubTrigger") as unknown as (p: ContextMenuSubTriggerProps) => null,
  SubContent: Placeholder("ContextMenu.SubContent") as unknown as (p: ContextMenuSubContentProps) => null,
  Separator: Placeholder("ContextMenu.Separator") as unknown as (p: ContextMenuSeparatorProps) => null,
  Label: Placeholder("ContextMenu.Label") as unknown as (p: ContextMenuLabelProps) => null,
  Shortcut: Placeholder("ContextMenu.Shortcut") as unknown as (p: ContextMenuShortcutProps) => null,
};
