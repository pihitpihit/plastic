import type {
  SelectGroupProps,
  SelectLabelProps,
  SelectSeparatorProps,
} from "./Select.types";
import { SelectRoot } from "./SelectRoot";
import { SelectTrigger } from "./SelectTrigger";
import { SelectValue } from "./SelectValue";
import { SelectIcon } from "./SelectIcon";
import { SelectContent } from "./SelectContent";
import { SelectItem } from "./SelectItem";
import { SelectItemIndicator } from "./SelectItemIndicator";

const SelectGroup = (_p: SelectGroupProps) => null;
const SelectLabel = (_p: SelectLabelProps) => null;
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
