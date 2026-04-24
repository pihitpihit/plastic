import type {
  SelectContentProps,
  SelectGroupProps,
  SelectLabelProps,
  SelectItemProps,
  SelectItemIndicatorProps,
  SelectSeparatorProps,
} from "./Select.types";
import { SelectRoot } from "./SelectRoot";
import { SelectTrigger } from "./SelectTrigger";
import { SelectValue } from "./SelectValue";
import { SelectIcon } from "./SelectIcon";

const SelectContent = (_p: SelectContentProps) => null;
const SelectGroup = (_p: SelectGroupProps) => null;
const SelectLabel = (_p: SelectLabelProps) => null;
const SelectItem = (_p: SelectItemProps) => null;
const SelectItemIndicator = (_p: SelectItemIndicatorProps) => null;
const SelectSeparator = (_p: SelectSeparatorProps) => null;

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
