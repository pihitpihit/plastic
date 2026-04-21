import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import type {
  PipelineGraphInspectorConfig,
  PipelineGraphTheme,
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

export function PipelineGraphInspector(props: PipelineGraphInspectorProps) {
  const { selectedNode, config, theme, rootRef } = props;
  const position = config.position ?? "right";
  const defaultSize = config.defaultSize ?? (position === "right" ? 380 : 280);
  const p = themePalette[theme];
  const [size, setSize] = useState(defaultSize);
  const dragRef = useRef<{ start: number; startSize: number } | null>(null);

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
  const dividerStyle: React.CSSProperties = isRight
    ? {
        width: DIVIDER_SIZE,
        height: "100%",
        cursor: "col-resize",
      }
    : {
        width: "100%",
        height: DIVIDER_SIZE,
        cursor: "row-resize",
      };

  const panelStyle: React.CSSProperties = isRight
    ? { width: size, height: "100%" }
    : { width: "100%", height: size };

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
          <div style={{ padding: 12, flex: 1, overflow: "auto" }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedNode.label}</div>
            <div style={{ fontSize: 11, color: p.mutedFg, marginTop: 2 }}>
              {selectedNode.kind} · {selectedNode.status}
            </div>
          </div>
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
