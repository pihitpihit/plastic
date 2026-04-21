import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { CodeView } from "../CodeView";

import type {
  PipelineGraphInspectorConfig,
  PipelineGraphTheme,
  PipelineInspectorTab,
} from "./PipelineGraph.types";
import { clamp, type NormalizedNode } from "./PipelineGraph.utils";
import { palette as themePalette, Z } from "./theme";

export interface PipelineGraphInspectorProps {
  selectedNode: NormalizedNode | null;
  config: PipelineGraphInspectorConfig;
  theme: PipelineGraphTheme;
  rootRef: React.RefObject<HTMLDivElement | null>;
}

const DIVIDER_SIZE = 6;
const TAB_ORDER: PipelineInspectorTab[] = [
  "output",
  "input",
  "internal",
  "logs",
  "timing",
  "error",
];

function isTabDisabled(tab: PipelineInspectorTab, node: NormalizedNode): boolean {
  const raw = node.raw;
  if (tab === "error") return node.status !== "failed";
  if (tab === "logs") {
    const logs = raw.logs;
    return !logs || (Array.isArray(logs) && logs.length === 0);
  }
  return false;
}

function resolveValue(tab: PipelineInspectorTab, node: NormalizedNode): unknown {
  const raw = node.raw;
  switch (tab) {
    case "input":
      return raw.input;
    case "output":
      return raw.output;
    case "internal":
      return raw.internal;
    case "logs":
      return raw.logs;
    case "timing":
      return raw.timing;
    case "error":
      return raw.error;
  }
}

function defaultRenderValue(value: unknown, theme: PipelineGraphTheme): ReactNode {
  const p = themePalette[theme];
  if (value === undefined) {
    return <div style={{ color: p.mutedFg, fontSize: 12 }}>Nothing to show</div>;
  }
  if (typeof value === "string") {
    return <CodeView code={value} language="markup" theme={theme} showLineNumbers={false} />;
  }
  const json = JSON.stringify(value, null, 2);
  return <CodeView code={json} language="json" theme={theme} showLineNumbers={false} />;
}

export function PipelineGraphInspector(props: PipelineGraphInspectorProps) {
  const { selectedNode, config, theme, rootRef } = props;
  const position = config.position ?? "right";
  const defaultSize = config.defaultSize ?? (position === "right" ? 380 : 280);
  const p = themePalette[theme];
  const [size, setSize] = useState(defaultSize);
  const dragRef = useRef<{ start: number; startSize: number } | null>(null);

  const availableTabs = useMemo<PipelineInspectorTab[]>(() => {
    const filter = config.tabs;
    if (!filter) return TAB_ORDER;
    const allowed = new Set(filter);
    return TAB_ORDER.filter((t) => allowed.has(t));
  }, [config.tabs]);

  const firstEnabled = useMemo<PipelineInspectorTab | null>(() => {
    if (!selectedNode) return null;
    const preferred =
      config.defaultTab ??
      (selectedNode.status === "failed" ? "error" : "output");
    if (
      availableTabs.includes(preferred) &&
      !isTabDisabled(preferred, selectedNode)
    ) {
      return preferred;
    }
    for (const t of availableTabs) {
      if (!isTabDisabled(t, selectedNode)) return t;
    }
    return availableTabs[0] ?? null;
  }, [selectedNode, availableTabs, config.defaultTab]);

  const [activeTab, setActiveTab] = useState<PipelineInspectorTab | null>(firstEnabled);

  useEffect(() => {
    setActiveTab(firstEnabled);
  }, [firstEnabled]);

  if (position === "none") return null;

  const onDividerPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startClient = position === "right" ? e.clientX : e.clientY;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const axis = position === "right" ? rect.width : rect.height;
    const maxSize = axis * 0.8;
    const minSize = axis * 0.2;
    dragRef.current = { start: startClient, startSize: size };

    const move = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const cur = position === "right" ? ev.clientX : ev.clientY;
      const delta = dragRef.current.start - cur;
      const next = clamp(dragRef.current.startSize + delta, minSize, maxSize);
      setSize(next);
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const isRight = position === "right";
  const dividerStyle: CSSProperties = isRight
    ? { width: DIVIDER_SIZE, height: "100%", cursor: "col-resize" }
    : { width: "100%", height: DIVIDER_SIZE, cursor: "row-resize" };
  const panelStyle: CSSProperties = isRight
    ? { width: size, height: "100%" }
    : { width: "100%", height: size };

  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!selectedNode) return;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const start = activeTab ? availableTabs.indexOf(activeTab) : 0;
    for (let i = 1; i <= availableTabs.length; i++) {
      const idx = (start + dir * i + availableTabs.length) % availableTabs.length;
      const t = availableTabs[idx];
      if (!t) continue;
      if (!isTabDisabled(t, selectedNode)) {
        setActiveTab(t);
        return;
      }
    }
  };

  const renderBody = (): ReactNode => {
    if (!selectedNode || !activeTab) return null;
    const value = resolveValue(activeTab, selectedNode);
    return defaultRenderValue(value, theme);
  };

  return (
    <>
      <div
        role="separator"
        aria-orientation={isRight ? "vertical" : "horizontal"}
        onPointerDown={onDividerPointerDown}
        style={{
          ...dividerStyle,
          background: p.inspectorBorder,
          flexShrink: 0,
          zIndex: Z.inspector,
          userSelect: "none",
          touchAction: "none",
        }}
      />
      <div
        role="complementary"
        aria-label="Inspector"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...panelStyle,
          background: p.inspectorBg,
          color: p.fg,
          borderLeft: isRight ? `1px solid ${p.inspectorBorder}` : undefined,
          borderTop: !isRight ? `1px solid ${p.inspectorBorder}` : undefined,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          flexShrink: 0,
          zIndex: Z.inspector,
          boxSizing: "border-box",
        }}
      >
        {selectedNode ? (
          <>
            <div style={{ padding: "10px 12px 6px", fontSize: 13, fontWeight: 600 }}>
              {selectedNode.label}
              <span style={{ fontWeight: 400, color: p.mutedFg, marginLeft: 8, fontSize: 11 }}>
                {selectedNode.kind} · {selectedNode.status}
              </span>
            </div>
            <div
              role="tablist"
              style={{
                display: "flex",
                borderBottom: `1px solid ${p.inspectorBorder}`,
                flexShrink: 0,
              }}
            >
              {availableTabs.map((t) => {
                const disabled = isTabDisabled(t, selectedNode);
                const active = activeTab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={disabled}
                    onClick={() => setActiveTab(t)}
                    onKeyDown={onTabKeyDown}
                    style={{
                      padding: "8px 12px",
                      border: "none",
                      background: "transparent",
                      borderBottom: active
                        ? `2px solid ${p.selectionRing}`
                        : "2px solid transparent",
                      color: disabled ? p.mutedFg : p.fg,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      textTransform: "capitalize",
                      opacity: disabled ? 0.55 : 1,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <div role="tabpanel" style={{ padding: 12, overflow: "auto", flex: 1 }}>
              {renderBody()}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: p.mutedFg,
              fontSize: 12,
            }}
          >
            No selection
          </div>
        )}
      </div>
    </>
  );
}
