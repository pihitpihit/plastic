import { PathInputRoot } from "./PathInputRoot";
import { PathInputInput } from "./PathInputInput";
import { PathInputBrowseButton } from "./PathInputBrowseButton";
import { PathInputStatus } from "./PathInputStatus";
import { PathInputFileName } from "./PathInputFileName";

export const PathInput = Object.assign(PathInputRoot, {
  Root: PathInputRoot,
  Input: PathInputInput,
  BrowseButton: PathInputBrowseButton,
  Status: PathInputStatus,
  FileName: PathInputFileName,
});
