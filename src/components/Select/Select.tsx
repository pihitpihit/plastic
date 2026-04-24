import type {
  SelectRootProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectIconProps,
  SelectContentProps,
  SelectGroupProps,
  SelectLabelProps,
  SelectItemProps,
  SelectItemIndicatorProps,
  SelectSeparatorProps,
} from "./Select.types";

function Noop(_props: { children?: unknown }) {
  return null;
}

const SelectRoot = (_p: SelectRootProps) => null;
const SelectTrigger = (_p: SelectTriggerProps) => null;
const SelectValue = (_p: SelectValueProps) => null;
const SelectIcon = (_p: SelectIconProps) => null;
const SelectContent = (_p: SelectContentProps) => null;
const SelectGroup = (_p: SelectGroupProps) => null;
const SelectLabel = (_p: SelectLabelProps) => null;
const SelectItem = (_p: SelectItemProps) => null;
const SelectItemIndicator = (_p: SelectItemIndicatorProps) => null;
const SelectSeparator = (_p: SelectSeparatorProps) => null;

void Noop;

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Value: SelectValue,
  Icon: SelectIcon,
  Content: SelectContent,
  Group: SelectGroup,
  Label: SelectLabel,
  Item: SelectItem,
  ItemIndicator: SelectItemIndicator,
  Separator: SelectSeparator,
};
