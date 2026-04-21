import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useControllable } from "../_shared/useControllable";

import { PipelineGraphCluster } from "./PipelineGraphCluster";
import { PipelineGraphEdge } from "./PipelineGraphEdge";
import { PipelineGraphInspector } from "./PipelineGraphInspector";
import { PipelineGraphNode } from "./PipelineGraphNode";
import type {
  PipelineGraphProps,
  PipelineGraphViewport,
} from "./PipelineGraph.types";
import { normalize } from "./PipelineGraph.utils";
import { useGraphLayout } from "./useGraphLayout";
import { usePanZoom } from "./usePanZoom";
import { palette as themePalette } from "./theme";

export function PipelineGraph(props: PipelineGraphProps) {
  const {
    nodes,
    edges,
    direction = "LR",
    rankSep = 96,
    nodeSep = 48,
    clusterPadding = 24,
    theme = "light",
    width = "100%",
    height = "70vh",
    className,
    expansion,
    defaultExpansion,
    onExpansionChange,
    selection,
    defaultSelection,
    onSelectionChange,
    onNodeDoubleClick,
    inspector,
    renderInspectorValue,
    viewport: viewportProp,
    defaultViewport,
    onViewportChange,
    interactive = true,
  } = props;

  const normalized = useMemo(() => normalize(nodes, edges), [nodes, edges]);

  const [expandedArr, setExpandedArr] = useControllable<string[]>(
    expansion,
    defaultExpansion ?? [],
    onExpansionChange,
  );
  const expanded = useMemo(() => new Set(expandedArr), [expandedArr]);

  const [selectedId, setSelectedId] = useControllable<string | null>(
    selection,
    defaultSelection ?? null,
    onSelectionChange,
  );

  const layout = useGraphLayout({
    normalized,
    expanded,
    direction,
    rankSep,
    nodeSep,
    clusterPadding,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isViewportControlled = viewportProp !== undefined;
  const [internalViewport, setInternalViewport] = useState<PipelineGraphViewport | null>(
    defaultViewport ?? null,
  );
  const viewport = isViewportControlled ? viewportProp : internalViewport;
  const setViewport = useCallback(
    (v: PipelineGraphViewport) => {
      if (!isViewportControlled) setInternalViewport(v);
      onViewportChange?.(v);
    },
    [isViewportControlled, onViewportChange],
  );

  usePanZoom({
    rootRef: canvasRef,
    viewport,
    setViewport,
    interactive,
  });

  const p = themePalette[theme];
  const isEmpty = nodes.length === 0;
  const inspectorConfig = inspector ?? {};
  const inspectorPosition = inspectorConfig.position ?? "right";
  const selectedNode = selectedId ? (normalized.byId.get(selectedId) ?? null) : null;

  const toggleExpand = useCallback(
    (id: string) => {
      const next = new Set(expandedArr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setExpandedArr([...next]);
    },
    [expandedArr, setExpandedArr],
  );

  const handleCanvasClick = () => setSelectedId(null);

  useEffect(() => {
    if (selectedId === null) return;
    const shownIds = new Set(layout.positions.map((pp) => pp.id));
    if (shownIds.has(selectedId)) return;
    let cur = normalized.byId.get(selectedId);
    while (cur?.parent) {
      if (shownIds.has(cur.parent)) {
        setSelectedId(cur.parent);
        return;
      }
      cur = normalized.byId.get(cur.parent);
    }
    setSelectedId(null);
  }, [selectedId, layout.positions, normalized, setSelectedId]);

  const transformStyle = viewport
    ? {
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: "0 0" as const,
      }
    : {};

  const canvas = (
    <div
      ref={canvasRef}
      data-pg-root="1"
      onClick={handleCanvasClick}
      style={{
        position: "relative",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        background: p.canvasBg,
        color: p.fg,
        boxSizing: "border-box",
        touchAction: "none",
      }}
    >
      {isEmpty ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: p.mutedFg,
            fontSize: 13,
          }}
        >
          No nodes
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: layout.bounds.width,
            height: layout.bounds.height,
            ...transformStyle,
          }}
        >
          {layout.clusterBounds.map((cb) => {
            const node = normalized.byId.get(cb.id);
            if (!node) return null;
            return (
              <PipelineGraphCluster
                key={cb.id}
                bounds={cb}
                node={node}
                clusterPadding={clusterPadding}
                theme={theme}
                onToggleExpand={toggleExpand}
              />
            );
          })}
          {layout.positions.map((pos) => {
            const n = normalized.byId.get(pos.id);
            const v = layout.visible.find((vv) => vv.id === pos.id);
            if (!n || !v) return null;
            return (
              <PipelineGraphNode
                key={pos.id}
                node={v}
                normalized={n}
                byId={normalized.byId}
                x={pos.x}
                y={pos.y}
                w={pos.w}
                h={pos.h}
                selected={selectedId === pos.id}
                expanded={expanded.has(pos.id)}
                theme={theme}
                onSelect={setSelectedId}
                onToggleExpand={toggleExpand}
                {...(onNodeDoubleClick ? { onDoubleClick: onNodeDoubleClick } : {})}
              />
            );
          })}
          <PipelineGraphEdge
            edgePoints={layout.edgePoints}
            bounds={layout.bounds}
            theme={theme}
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Pipeline graph"
      className={className}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        display: "flex",
        flexDirection: inspectorPosition === "bottom" ? "column" : "row",
        background: p.canvasBg,
        color: p.fg,
        boxSizing: "border-box",
      }}
    >
      {canvas}
      <PipelineGraphInspector
        selectedNode={selectedNode}
        config={inspectorConfig}
        theme={theme}
        rootRef={rootRef}
        {...(renderInspectorValue ? { renderInspectorValue } : {})}
      />
    </div>
  );
}
