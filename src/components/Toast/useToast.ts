import { useMemo } from "react";
import { useToastContext } from "./ToastContext";
import type { UseToastReturn } from "./Toast.types";

/**
 * Imperative toast API hook.
 * `<ToastProvider>` 하위에서만 호출 가능.
 */
export function useToast(): UseToastReturn {
  const ctx = useToastContext();
  return useMemo(
    () => ({
      show: ctx.show,
      dismiss: ctx.dismiss,
      dismissAll: ctx.dismissAll,
      promise: ctx.promise,
      toasts: ctx.toasts,
    }),
    [ctx.show, ctx.dismiss, ctx.dismissAll, ctx.promise, ctx.toasts],
  );
}
