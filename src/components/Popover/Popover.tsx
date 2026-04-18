import { PopoverRoot } from "./PopoverRoot";
import { PopoverTrigger } from "./PopoverTrigger";
import { PopoverContent } from "./PopoverContent";
import { PopoverArrow } from "./PopoverArrow";
import { PopoverClose } from "./PopoverClose";
import { PopoverHeader } from "./PopoverHeader";
import { PopoverBody } from "./PopoverBody";

export const Popover = Object.assign(PopoverRoot, {
  Root: PopoverRoot,
  Trigger: PopoverTrigger,
  Content: PopoverContent,
  Arrow: PopoverArrow,
  Close: PopoverClose,
  Header: PopoverHeader,
  Body: PopoverBody,
});
