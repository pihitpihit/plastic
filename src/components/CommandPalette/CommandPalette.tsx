import { CommandPaletteEmpty } from "./CommandPaletteEmpty";
import { CommandPaletteFooter } from "./CommandPaletteFooter";
import { CommandPaletteGroup } from "./CommandPaletteGroup";
import { CommandPaletteInput } from "./CommandPaletteInput";
import { CommandPaletteItem } from "./CommandPaletteItem";
import { CommandPaletteList } from "./CommandPaletteList";
import { CommandPaletteLoading } from "./CommandPaletteLoading";
import { CommandPaletteRoot } from "./CommandPaletteRoot";

export const CommandPalette = Object.assign(CommandPaletteRoot, {
  Root: CommandPaletteRoot,
  Input: CommandPaletteInput,
  List: CommandPaletteList,
  Group: CommandPaletteGroup,
  Item: CommandPaletteItem,
  Empty: CommandPaletteEmpty,
  Loading: CommandPaletteLoading,
  Footer: CommandPaletteFooter,
});
