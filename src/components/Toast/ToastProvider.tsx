import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ToastContext,
  ToastItemContext,
  type ToastContextValue,
  type ToastItemContextValue,
} from "./ToastContext";
import { toastReducer, type ToastInternalState } from "./toastReducer";
import { useToastTimer } from "./useToastTimer";
import { ToastRoot } from "./ToastRoot";
import { ToastIcon } from "./ToastIcon";
import { ToastContent } from "./ToastContent";
import { ToastAction } from "./ToastAction";
import { ToastClose } from "./ToastClose";
import { ToastProgress } from "./ToastProgress";
import { ENTER_DURATION, EXIT_DURATION } from "./animations";
import type {
  PromiseToastOptions,
  ShowToastOptions,
  ToastData,
  ToastPosition,
  ToastProviderProps,
} from "./Toast.types";

const KEYFRAMES_CSS = `
@keyframes plastic-toast-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

const POSITION_STYLES: Record<ToastPosition, CSSProperties> = {
  "top-left": { top: 0, left: 0, alignItems: "flex-start" },
  "top-center": {
    top: 0,
    left: "50%",
    transform: "translateX(-50%)",
    alignItems: "center",
  },
  "top-right": { top: 0, right: 0, alignItems: "flex-end" },
  "bottom-left": { bottom: 0, left: 0, alignItems: "flex-start" },
  "bottom-center": {
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    alignItems: "center",
  },
  "bottom-right": { bottom: 0, right: 0, alignItems: "flex-end" },
};

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `toast-${Date.now()}-${idCounter}`;
}

interface ToastItemWrapperProps {
  state: ToastInternalState;
  dispatch: React.Dispatch<Parameters<typeof toastReducer>[1]>;
  providerCtx: ToastContextValue;
  toastClassName?: string | undefined;
  toastStyle?: CSSProperties | undefined;
}

function ToastItemWrapper({
  state,
  dispatch,
  providerCtx,
  toastClassName,
  toastStyle,
}: ToastItemWrapperProps) {
  const { id, data, phase, isPaused } = state;

  const onExpire = useCallback(() => {
    dispatch({ type: "DISMISS", id });
    providerCtx.onAutoClose?.(id);
  }, [dispatch, id, providerCtx]);

  const { elapsed } = useToastTimer({
    duration: phase === "idle" ? data.duration : Infinity,
    isPaused,
    onExpire,
  });

  // entering → idle 전환 (ENTER_DURATION 후)
  useEffect(() => {
    if (phase !== "entering") return;
    const timer = setTimeout(() => {
      dispatch({ type: "SET_PHASE", id, phase: "idle" });
    }, ENTER_DURATION);
    return () => clearTimeout(timer);
  }, [phase, id, dispatch]);

  // exiting → REMOVE 전환 (EXIT_DURATION 후)
  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(() => {
      dispatch({ type: "REMOVE", id });
    }, EXIT_DURATION);
    return () => clearTimeout(timer);
  }, [phase, id, dispatch]);

  const dismiss = useCallback(() => {
    dispatch({ type: "DISMISS", id });
    providerCtx.onDismiss?.(id);
  }, [dispatch, id, providerCtx]);

  const pause = useCallback(() => {
    dispatch({ type: "PAUSE", id });
  }, [dispatch, id]);

  const resume = useCallback(() => {
    dispatch({ type: "RESUME", id });
  }, [dispatch, id]);

  const swipeDismiss = useCallback(() => {
    dispatch({ type: "REMOVE", id });
    providerCtx.onDismiss?.(id);
  }, [dispatch, id, providerCtx]);

  const itemCtx: ToastItemContextValue = useMemo(
    () => ({
      id,
      variant: data.variant,
      phase,
      duration: data.duration,
      elapsed,
      isPaused,
      dismiss,
      pause,
      resume,
      swipeDismiss,
      theme: providerCtx.theme,
    }),
    [
      id,
      data.variant,
      phase,
      data.duration,
      elapsed,
      isPaused,
      dismiss,
      pause,
      resume,
      swipeDismiss,
      providerCtx.theme,
    ],
  );

  const content = data.render ? (
    <ToastRoot
      variant={data.variant}
      pauseOnHover={data.pauseOnHover ?? providerCtx.pauseOnHover}
      swipeDismissible={
        data.swipeDismissible ?? providerCtx.swipeDismissible
      }
      className={toastClassName}
      style={toastStyle}
    >
      {data.render({ dismiss })}
    </ToastRoot>
  ) : (
    <ToastRoot
      variant={data.variant}
      pauseOnHover={data.pauseOnHover ?? providerCtx.pauseOnHover}
      swipeDismissible={
        data.swipeDismissible ?? providerCtx.swipeDismissible
      }
      className={toastClassName}
      style={toastStyle}
    >
      <ToastIcon />
      <ToastContent title={data.title} description={data.description} />
      {data.action ? (
        <ToastAction
          label={data.action.label}
          onClick={data.action.onClick}
          variant={data.action.variant ?? "default"}
        />
      ) : null}
      <ToastClose />
      {data.duration !== Infinity ? <ToastProgress /> : null}
    </ToastRoot>
  );

  return (
    <ToastItemContext.Provider value={itemCtx}>
      {content}
    </ToastItemContext.Provider>
  );
}

export function ToastProvider(props: ToastProviderProps): ReactNode {
  const {
    children,
    position = "bottom-right",
    stackOrder = "newest-first",
    maxToasts = 5,
    defaultDuration = 5000,
    pauseOnHover = true,
    swipeDismissible = true,
    swipeThreshold = 100,
    swipeDirection = "horizontal",
    theme = "light",
    label = "Notifications",
    onDismiss,
    onAutoClose,
    className,
    style,
    toastClassName,
    toastStyle,
  } = props;

  const [state, dispatch] = useReducer(toastReducer, []);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // keyframes 주입
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "plastic-toast-keyframes";
    if (document.getElementById(styleId)) return;
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = KEYFRAMES_CSS;
    document.head.appendChild(styleEl);
  }, []);

  const show = useCallback(
    (options: ShowToastOptions): string => {
      const id = nextId();
      const data: ToastData = {
        id,
        title: options.title,
        description: options.description,
        variant: options.variant ?? "default",
        duration: options.duration ?? defaultDuration,
        action: options.action,
        render: options.render,
        pauseOnHover: options.pauseOnHover,
        swipeDismissible: options.swipeDismissible,
        createdAt: Date.now(),
        ariaLive: options.ariaLive,
      };
      dispatch({ type: "ADD", data, maxToasts, stackOrder });
      return id;
    },
    [defaultDuration, maxToasts, stackOrder],
  );

  const dismiss = useCallback(
    (id: string) => {
      dispatch({ type: "DISMISS", id });
      onDismiss?.(id);
    },
    [onDismiss],
  );

  const dismissAll = useCallback(() => {
    dispatch({ type: "DISMISS_ALL" });
  }, []);

  const promise = useCallback(
    <T,>(
      promiseArg: Promise<T>,
      options: PromiseToastOptions<T>,
    ): Promise<T> => {
      const { loading, success, error } = options;
      const id = nextId();
      const loadingData: ToastData = {
        id,
        title: loading.title,
        description: loading.description,
        variant: "info",
        duration: Infinity,
        action: loading.action,
        render: loading.render,
        pauseOnHover: loading.pauseOnHover,
        swipeDismissible: loading.swipeDismissible,
        createdAt: Date.now(),
        ariaLive: loading.ariaLive,
      };
      dispatch({ type: "ADD", data: loadingData, maxToasts, stackOrder });

      return promiseArg
        .then((result) => {
          const resolved = typeof success === "function" ? success(result) : success;
          dispatch({
            type: "UPDATE",
            id,
            data: {
              title: resolved.title,
              description: resolved.description,
              variant: "success",
              duration: resolved.duration ?? defaultDuration,
              action: resolved.action,
              render: resolved.render,
              pauseOnHover: resolved.pauseOnHover,
              swipeDismissible: resolved.swipeDismissible,
              ariaLive: resolved.ariaLive,
            },
          });
          return result;
        })
        .catch((err: unknown) => {
          const rejected = typeof error === "function" ? error(err) : error;
          dispatch({
            type: "UPDATE",
            id,
            data: {
              title: rejected.title,
              description: rejected.description,
              variant: "error",
              duration: rejected.duration ?? 8000,
              action: rejected.action,
              render: rejected.render,
              pauseOnHover: rejected.pauseOnHover,
              swipeDismissible: rejected.swipeDismissible,
              ariaLive: rejected.ariaLive,
            },
          });
          throw err;
        });
    },
    [defaultDuration, maxToasts, stackOrder],
  );

  const providerCtx: ToastContextValue = useMemo(
    () => ({
      toasts: state.map((t) => t.data),
      show,
      dismiss,
      dismissAll,
      promise,
      position,
      stackOrder,
      maxToasts,
      defaultDuration,
      pauseOnHover,
      swipeDismissible,
      swipeThreshold,
      swipeDirection,
      theme,
      label,
      onDismiss,
      onAutoClose,
    }),
    [
      state,
      show,
      dismiss,
      dismissAll,
      promise,
      position,
      stackOrder,
      maxToasts,
      defaultDuration,
      pauseOnHover,
      swipeDismissible,
      swipeThreshold,
      swipeDirection,
      theme,
      label,
      onDismiss,
      onAutoClose,
    ],
  );

  const visibleToasts = state;
  const orderedToasts =
    stackOrder === "newest-first" ? [...visibleToasts].reverse() : visibleToasts;

  const isServer = typeof document === "undefined";

  const portalContent = isServer ? null : (
    <div
      role="region"
      aria-label={label}
      aria-live="polite"
      className={className}
      style={{
        position: "fixed",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "16px",
        pointerEvents: "none",
        maxHeight: "100vh",
        overflow: "hidden",
        ...POSITION_STYLES[position],
        ...style,
      }}
    >
      {orderedToasts.map((t) => (
        <ToastItemWrapper
          key={t.id}
          state={t}
          dispatch={dispatch}
          providerCtx={providerCtx}
          toastClassName={toastClassName}
          toastStyle={toastStyle}
        />
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={providerCtx}>
      {children}
      {portalContent && createPortal(portalContent, document.body)}
    </ToastContext.Provider>
  );
}
