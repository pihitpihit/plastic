import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import {
  SplitPaneContext,
  useSplitPaneContext,
} from "./SplitPaneContext";
import type { SplitPaneContextValue } from "./SplitPaneContext";
import { usePaneResize } from "./usePaneResize";
import {
  DIVIDER_PX,
  clamp,
  isSizeString,
  toPct,
  toPx,
} from "./SplitPane.utils";
import { splitPanePalette } from "./theme";
import type {
  SplitPaneCollapseButtonProps,
  SplitPaneDividerProps,
  SplitPaneProps,
  SplitPaneRootProps,
  SplitPaneSize,
} from "./SplitPane.types";

interface PaneIndexProps {
  "data-sp-pane-index"?: 0 | 1;
}

function readStorage(
  key: string,
): { unit: "px" | "pct"; value: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "unit" in parsed &&
      "value" in parsed &&
      (parsed.unit === "px" || parsed.unit === "pct") &&
      typeof parsed.value === "number" &&
      Number.isFinite(parsed.value)
    ) {
      return { unit: parsed.unit, value: parsed.value };
    }
    return null;
  } catch {
    return null;
  }
}

function writeStorage(
  key: string,
  payload: { unit: "px" | "pct"; value: number },
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

function SplitPaneRoot(props: SplitPaneRootProps) {
  const {
    direction = "horizontal",
    defaultSize = "50%",
    size: controlledSize,
    onSizeChange,
    onSizeChangeEnd,
    minSize = 48,
    maxSize = "90%",
    snapSize,
    snapThreshold = 8,
    collapsible = "none",
    collapsedSize = 0,
    collapseThreshold,
    storageKey,
    theme = "light",
    disabled = false,
    className,
    style,
    "aria-label": ariaLabel,
    children,
  } = props;

  const isControlled = controlledSize !== undefined;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);

  const [containerPx, setContainerPx] = useState<number>(0);
  const [internalPx, setInternalPx] = useState<number | null>(null);
  const [rtl, setRtl] = useState<boolean>(false);
  const preCollapseRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const axis = direction === "horizontal" ? el.offsetWidth : el.offsetHeight;
    if (axis > 0) setContainerPx(axis);

    if (typeof window !== "undefined") {
      try {
        const cssDir = window.getComputedStyle(el).direction;
        setRtl(cssDir === "rtl");
      } catch {
        /* noop */
      }
    }
  }, [direction]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const box = entry.contentBoxSize?.[0];
      const w = box ? box.inlineSize : entry.contentRect.width;
      const h = box ? box.blockSize : entry.contentRect.height;
      const nextAxis = direction === "horizontal" ? w : h;
      if (nextAxis > 0) setContainerPx(nextAxis);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [direction]);

  const minPx = useMemo(() => {
    if (containerPx <= 0) return 0;
    const raw = toPx(minSize, containerPx);
    return Math.max(0, Math.min(raw, containerPx / 2));
  }, [minSize, containerPx]);

  const maxPx = useMemo(() => {
    if (containerPx <= 0) return 0;
    const raw = toPx(maxSize, containerPx);
    return Math.max(minPx, Math.min(raw, containerPx - DIVIDER_PX));
  }, [maxSize, containerPx, minPx]);

  const snapPx = useMemo<number | null>(() => {
    if (snapSize === undefined) return null;
    if (containerPx <= 0) return null;
    return toPx(snapSize, containerPx);
  }, [snapSize, containerPx]);

  const effectiveCollapseThreshold = useMemo(() => {
    if (collapseThreshold !== undefined) return collapseThreshold;
    return Math.max(minPx * 0.5, 0);
  }, [collapseThreshold, minPx]);

  useLayoutEffect(() => {
    if (containerPx <= 0) return;
    if (isControlled) return;
    if (internalPx != null) return;

    if (storageKey) {
      const loaded = readStorage(storageKey);
      if (loaded) {
        const initPx =
          loaded.unit === "px" ? loaded.value : (loaded.value / 100) * containerPx;
        setInternalPx(clamp(initPx, minPx, maxPx));
        return;
      }
    }
    const initial = toPx(defaultSize, containerPx);
    setInternalPx(clamp(initial, minPx, maxPx));
  }, [containerPx, isControlled, internalPx, storageKey, defaultSize, minPx, maxPx]);

  const sizePx = useMemo<number>(() => {
    if (isControlled) {
      if (containerPx <= 0) return 0;
      return clamp(toPx(controlledSize, containerPx), minPx, maxPx);
    }
    if (internalPx == null) return 0;
    return internalPx;
  }, [isControlled, controlledSize, containerPx, minPx, maxPx, internalPx]);

  useEffect(() => {
    if (isControlled) return;
    if (internalPx == null) return;
    if (containerPx <= 0) return;
    if (internalPx < minPx || internalPx > maxPx) {
      setInternalPx(clamp(internalPx, minPx, maxPx));
    }
  }, [isControlled, internalPx, minPx, maxPx, containerPx]);

  useEffect(() => {
    if (!storageKey) return;
    if (isControlled) {
      // eslint-disable-next-line no-console
      console.warn(
        "[SplitPane] storageKey is ignored when `size` (controlled) is provided.",
      );
      return;
    }
    if (internalPx == null) return;
    writeStorage(storageKey, { unit: "px", value: Math.round(internalPx) });
  }, [storageKey, isControlled, internalPx]);

  const commitSize = useCallback(
    (next: number) => {
      if (!isControlled) {
        setInternalPx(next);
      }
      if (onSizeChange) {
        onSizeChange(next, toPct(next, containerPx));
      }
    },
    [isControlled, onSizeChange, containerPx],
  );

  const isCollapsedStart = sizePx <= collapsedSize + 0.5;
  const isCollapsedEnd =
    containerPx > 0 &&
    containerPx - sizePx - DIVIDER_PX <= collapsedSize + 0.5;

  const toggleCollapse = useCallback(
    (which: "start" | "end") => {
      if (containerPx <= 0) return;
      if (which === "start") {
        if (isCollapsedStart) {
          const restore = preCollapseRef.current ?? toPx(defaultSize, containerPx);
          preCollapseRef.current = null;
          commitSize(clamp(restore, minPx, maxPx));
        } else {
          preCollapseRef.current = sizePx;
          commitSize(collapsedSize);
        }
      } else {
        if (isCollapsedEnd) {
          const restore = preCollapseRef.current ?? toPx(defaultSize, containerPx);
          preCollapseRef.current = null;
          commitSize(clamp(restore, minPx, maxPx));
        } else {
          preCollapseRef.current = sizePx;
          commitSize(containerPx - collapsedSize - DIVIDER_PX);
        }
      }
    },
    [
      containerPx,
      isCollapsedStart,
      isCollapsedEnd,
      sizePx,
      collapsedSize,
      minPx,
      maxPx,
      defaultSize,
      commitSize,
    ],
  );

  const { onDividerPointerDown, onDividerKeyDown, isDragging } = usePaneResize({
    direction,
    disabled,
    rtl,
    sizePx,
    containerPx,
    minPx,
    maxPx,
    snapPx,
    snapThreshold,
    collapsible,
    collapsedSize,
    collapseThreshold: effectiveCollapseThreshold,
    dividerRef,
    commitSize,
    onSizeChangeEnd,
    toggleCollapse,
  });

  const baseId = useId();
  const startPaneId = `${baseId}-start`;
  const endPaneId = `${baseId}-end`;
  const dividerLabel = ariaLabel ?? "Resize panes";

  const ctxValue = useMemo<SplitPaneContextValue>(
    () => ({
      direction,
      sizePx,
      containerPx,
      minPx,
      maxPx,
      collapsible,
      collapsedSize,
      isCollapsedStart,
      isCollapsedEnd,
      disabled,
      theme,
      onDividerPointerDown,
      onDividerKeyDown,
      toggleCollapse,
      isDragging,
      rtl,
      dividerRef,
      startPaneId,
      endPaneId,
      dividerLabel,
    }),
    [
      direction,
      sizePx,
      containerPx,
      minPx,
      maxPx,
      collapsible,
      collapsedSize,
      isCollapsedStart,
      isCollapsedEnd,
      disabled,
      theme,
      onDividerPointerDown,
      onDividerKeyDown,
      toggleCollapse,
      isDragging,
      rtl,
      startPaneId,
      endPaneId,
      dividerLabel,
    ],
  );

  const palette = splitPanePalette[theme];

  const rootStyle: CSSProperties = {
    display: "flex",
    flexDirection: direction === "horizontal" ? "row" : "column",
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    position: "relative",
    ...style,
  };

  const mapped = useMemo(() => {
    let paneIdx = 0;
    const arr = Children.toArray(children);
    return arr.map((child) => {
      if (!isValidElement(child)) return child;
      const type = (child.type as { displayName?: string }).displayName;
      if (type === "SplitPane.Pane") {
        const idx = paneIdx as 0 | 1;
        paneIdx += 1;
        return cloneElement(child as ReactElement<PaneIndexProps>, {
          "data-sp-pane-index": idx,
        });
      }
      return child;
    });
  }, [children]);

  const cssVars: CSSProperties & Record<string, string> = {
    ["--sp-divider-bg"]: palette.dividerBg,
    ["--sp-divider-hover"]: palette.dividerHover,
    ["--sp-divider-active"]: palette.dividerActive,
    ["--sp-divider-handle-fg"]: palette.dividerHandleFg,
    ["--sp-collapse-btn-bg"]: palette.collapseBtnBg,
    ["--sp-collapse-btn-fg"]: palette.collapseBtnFg,
    ["--sp-collapse-btn-border"]: palette.collapseBtnBorder,
    ["--sp-focus-ring"]: palette.focusRing,
  };

  return (
    <SplitPaneContext.Provider value={ctxValue}>
      <div
        ref={rootRef}
        role="group"
        {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
        data-splitpane-root=""
        data-direction={direction}
        data-theme={theme}
        data-dragging={isDragging ? "true" : "false"}
        className={className}
        style={{ ...cssVars, ...rootStyle }}
      >
        {mapped}
        {isDragging ? (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              cursor:
                direction === "horizontal" ? "col-resize" : "row-resize",
            }}
          />
        ) : null}
      </div>
    </SplitPaneContext.Provider>
  );
}
SplitPaneRoot.displayName = "SplitPane.Root";

function SplitPanePane(props: SplitPaneProps & PaneIndexProps) {
  const {
    children,
    className,
    style,
    label,
    "data-sp-pane-index": paneIndex,
  } = props;
  const ctx = useSplitPaneContext();
  const isStart = paneIndex === 0;
  const {
    direction,
    sizePx,
    containerPx,
    startPaneId,
    endPaneId,
  } = ctx;

  const baseStyle: CSSProperties = isStart
    ? {
        flex: containerPx > 0 ? `0 0 ${Math.round(sizePx)}px` : "0 0 50%",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }
    : {
        flex: "1 1 0",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      };

  const paneId = isStart ? startPaneId : endPaneId;

  return (
    <div
      id={paneId}
      role="region"
      aria-label={label ?? (isStart ? "Pane 1" : "Pane 2")}
      data-splitpane-pane={isStart ? "start" : "end"}
      data-direction={direction}
      className={className}
      style={{ ...baseStyle, ...style }}
    >
      {children}
    </div>
  );
}
SplitPanePane.displayName = "SplitPane.Pane";

function SplitPaneDivider(props: SplitPaneDividerProps) {
  const {
    className,
    style,
    "aria-label": ariaLabel,
    children,
  } = props;
  const ctx = useSplitPaneContext();
  const {
    direction,
    sizePx,
    containerPx,
    minPx,
    maxPx,
    disabled,
    isDragging,
    onDividerPointerDown,
    onDividerKeyDown,
    dividerRef,
    startPaneId,
    endPaneId,
    dividerLabel,
  } = ctx;

  const orientation = direction === "horizontal" ? "vertical" : "horizontal";
  const pct = containerPx > 0 ? toPct(sizePx, containerPx) : 0;
  const minPct = containerPx > 0 ? toPct(minPx, containerPx) : 0;
  const maxPct = containerPx > 0 ? toPct(maxPx, containerPx) : 100;

  const baseStyle: CSSProperties = {
    flex:
      direction === "horizontal"
        ? `0 0 ${DIVIDER_PX}px`
        : `0 0 ${DIVIDER_PX}px`,
    width: direction === "horizontal" ? DIVIDER_PX : "100%",
    height: direction === "horizontal" ? "100%" : DIVIDER_PX,
    cursor: disabled
      ? "default"
      : direction === "horizontal"
        ? "col-resize"
        : "row-resize",
    background: isDragging
      ? "var(--sp-divider-active)"
      : "var(--sp-divider-bg)",
    transition: "background 120ms",
    userSelect: "none",
    touchAction: "none",
    position: "relative",
    outline: "none",
  };

  return (
    <div
      ref={dividerRef}
      role="separator"
      tabIndex={disabled ? -1 : 0}
      aria-orientation={orientation}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={Math.round(minPct)}
      aria-valuemax={Math.round(maxPct)}
      aria-label={ariaLabel ?? dividerLabel}
      aria-controls={`${startPaneId} ${endPaneId}`}
      aria-disabled={disabled || undefined}
      data-splitpane-divider=""
      data-direction={direction}
      data-orientation={orientation}
      data-dragging={isDragging ? "true" : "false"}
      data-disabled={disabled ? "true" : undefined}
      onPointerDown={onDividerPointerDown}
      onKeyDown={onDividerKeyDown}
      className={className}
      style={{ ...baseStyle, ...style }}
    >
      {children ?? (
        <span
          aria-hidden="true"
          data-splitpane-divider-handle=""
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: direction === "horizontal" ? 2 : 18,
            height: direction === "horizontal" ? 18 : 2,
            background: "var(--sp-divider-handle-fg)",
            borderRadius: 1,
            opacity: isDragging ? 0.7 : 0,
            transition: "opacity 120ms",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
SplitPaneDivider.displayName = "SplitPane.Divider";

function SplitPaneCollapseButton(props: SplitPaneCollapseButtonProps) {
  const {
    which,
    className,
    style,
    children,
    "aria-label": ariaLabel,
  } = props;
  const ctx = useSplitPaneContext();
  const { direction, isCollapsedStart, isCollapsedEnd, toggleCollapse, theme } =
    ctx;

  const isCollapsed = which === "start" ? isCollapsedStart : isCollapsedEnd;

  const icon = useMemo<ReactNode>(() => {
    if (children !== undefined) return children;
    if (direction === "horizontal") {
      if (which === "start") return isCollapsed ? "\u25B8" : "\u25C2";
      return isCollapsed ? "\u25C2" : "\u25B8";
    }
    if (which === "start") return isCollapsed ? "\u25BE" : "\u25B4";
    return isCollapsed ? "\u25B4" : "\u25BE";
  }, [children, direction, which, isCollapsed]);

  const paneId = which === "start" ? ctx.startPaneId : ctx.endPaneId;

  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    fontSize: 12,
    lineHeight: 1,
    padding: 0,
    border: "1px solid var(--sp-collapse-btn-border)",
    borderRadius: 4,
    background: "var(--sp-collapse-btn-bg)",
    color: "var(--sp-collapse-btn-fg)",
    cursor: "pointer",
    outline: "none",
  };

  return (
    <button
      type="button"
      aria-expanded={!isCollapsed}
      aria-controls={paneId}
      aria-label={ariaLabel ?? (isCollapsed ? "Expand pane" : "Collapse pane")}
      data-splitpane-collapse-button={which}
      data-theme={theme}
      onClick={() => toggleCollapse(which)}
      className={className}
      style={{ ...baseStyle, ...style }}
    >
      {icon}
    </button>
  );
}
SplitPaneCollapseButton.displayName = "SplitPane.CollapseButton";

export const SplitPane = {
  Root: SplitPaneRoot,
  Pane: SplitPanePane,
  Divider: SplitPaneDivider,
  CollapseButton: SplitPaneCollapseButton,
};

export { isSizeString };
