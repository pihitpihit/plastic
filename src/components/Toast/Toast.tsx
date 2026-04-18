import { ToastRoot } from "./ToastRoot";
import { ToastIcon } from "./ToastIcon";
import { ToastContent } from "./ToastContent";
import { ToastAction } from "./ToastAction";
import { ToastClose } from "./ToastClose";
import { ToastProgress } from "./ToastProgress";

export const Toast = Object.assign(ToastRoot, {
  Root: ToastRoot,
  Icon: ToastIcon,
  Content: ToastContent,
  Action: ToastAction,
  Close: ToastClose,
  Progress: ToastProgress,
});
