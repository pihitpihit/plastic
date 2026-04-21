import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useControllable } from "../_shared/useControllable";

import { PipelineGraphCluster } from "./PipelineGraphCluster";
import { PipelineGraphEdge, type HoveredEdge } from "./PipelineGraphEdge";
import { PipelineGraphInspector } from "./PipelineGraphInspector";
import { PipelineGraphNode } from "./PipelineGraphNode";
import type {
  PipelineGraphProps,
  PipelineGraphViewport,
} from "./PipelineGraph.types";
import { clamp, fit, nextNodeInDirection, normalize } from "./PipelineGraph.utils";
import { useGraphLayout } from "./useGraphLayout";
import { usePanZoom } from "./usePanZoom";
import { palette as themePalette, Z } from "./theme";

function defaultEdgeTooltipText(edge: HoveredEdge): string {
  if (edge.raws.length > 1) return `${edge.raws.length} connections`;
  const raw0 = edge.raws[0];
  if (raw0?.label) return raw0.label;
  if (raw0?.fanOut) {
    return raw0.fanOut.label
      ? `${raw0.fanOut.label} (×${raw0.fanOut.count})`
      : `×${raw0.fanOut.count}`;
  }
  return `${edge.from} → ${edge.to}`;
}

interface ZoomControlButtonProps {
  theme: "light" | "dark";
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ZoomControlButton(props: ZoomControlButtonProps) {
  const { theme, onClick, label, children } = props;
  const p = themePalette[theme];
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      data-pg-interactive="1"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28,
        height: 28,
        border: `1px solid ${p.inspectorBorder}`,
        borderRadius: 6,
        background: hover ? p.controlHoverBg : p.controlBg,
        color: p.controlFg,
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

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
    renderEdgeTooltip,
    viewport: viewportProp,
    defaultViewport,
    onViewportChange,
    interactive = true,
  } = props;

  const [hoveredEdge, setHoveredEdge] = useState<HoveredEdge | null>(null);

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

  useLayoutEffect(() => {
    if (viewport !== null) return;
    if (isViewportControlled) return;
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    if (layout.bounds.width <= 0 || layout.bounds.height <= 0) return;
    const next = fit(
      { width: layout.bounds.width, height: layout.bounds.height },
      { width: rect.width, height: rect.height },
    );
    setViewport(next);
  }, [viewport, isViewportControlled, layout.bounds.width, layout.bounds.height, setViewport]);

  const zoomBy = useCallback(
    (factor: number) => {
      const el = canvasRef.current;
      const vp = viewport;
      if (!el || !vp) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const nextZoom = clamp(vp.zoom * factor, 0.25, 2.5);
      if (nextZoom === vp.zoom) return;
      const ratio = nextZoom / vp.zoom;
      const nx = cx - (cx - vp.x) * ratio;
      const ny = cy - (cy - vp.y) * ratio;
      setViewport({ x: nx, y: ny, zoom: nextZoom });
    },
    [viewport, setViewport],
  );

  const fitNow = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (layout.bounds.width <= 0 || layout.bounds.height <= 0) return;
    setViewport(
      fit(
        { width: layout.bounds.width, height: layout.bounds.height },
        { width: rect.width, height: rect.height },
      ),
    );
  }, [layout.bounds.width, layout.bounds.height, setViewport]);

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

  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const dirKey =
      e.key === "ArrowUp"
        ? "up"
        : e.key === "ArrowDown"
          ? "down"
          : e.key === "ArrowLeft"
            ? "left"
            : e.key === "ArrowRight"
              ? "right"
              : null;
    if (dirKey) {
      e.preventDefault();
      if (layout.positions.length === 0) return;
      let nextId: string | null;
      const firstPos = layout.positions[0];
      if (!selectedId) {
        nextId = firstPos ? firstPos.id : null;
      } else {
        nextId = nextNodeInDirection(selectedId, layout.positions, dirKey);
      }
      if (nextId) setSelectedId(nextId);
      return;
    }
    if (e.key === "Escape") {
      if (selectedId !== null) {
        e.preventDefault();
        setSelectedId(null);
      }
      return;
    }
    if (e.key === "Enter") {
      if (!selectedId && layout.positions.length > 0) {
        const first = layout.positions[0];
        if (first) {
          e.preventDefault();
          setSelectedId(first.id);
        }
      }
      return;
    }
    if (e.key === " " || e.code === "Space") {
      if (selectedId) {
        const sel = normalized.byId.get(selectedId);
        if (sel && (sel.kind === "group" || sel.kind === "loop")) {
          e.preventDefault();
          e.stopPropagation();
          toggleExpand(selectedId);
          return;
        }
      }
      return;
    }
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      zoomBy(1.2);
      return;
    }
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      zoomBy(1 / 1.2);
      return;
    }
    if (e.key === "0") {
      e.preventDefault();
      fitNow();
      return;
    }
  };

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
      tabIndex={0}
      onClick={handleCanvasClick}
      onKeyDown={handleCanvasKeyDown}
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
        outline: "none",
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
            onHoverChange={setHoveredEdge}
          />
        </div>
      )}
      {hoveredEdge && viewport ? (
        <div
          style={{
            position: "absolute",
            left: viewport.x + hoveredEdge.mid.x * viewport.zoom + 8,
            top: viewport.y + hoveredEdge.mid.y * viewport.zoom + 8,
            background: p.tooltipBg,
            color: p.tooltipFg,
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 11,
            pointerEvents: "none",
            zIndex: Z.tooltip,
            maxWidth: 240,
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {renderEdgeTooltip && hoveredEdge.raws[0]
            ? (renderEdgeTooltip(hoveredEdge.raws[0]) ?? defaultEdgeTooltipText(hoveredEdge))
            : defaultEdgeTooltipText(hoveredEdge)}
        </div>
      ) : null}
      {!isEmpty && interactive ? (
        <div
          data-pg-interactive="1"
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            zIndex: Z.controls,
          }}
        >
          <ZoomControlButton theme={theme} onClick={() => zoomBy(1.2)} label="Zoom in">
            +
          </ZoomControlButton>
          <ZoomControlButton theme={theme} onClick={() => zoomBy(1 / 1.2)} label="Zoom out">
            −
          </ZoomControlButton>
          <ZoomControlButton theme={theme} onClick={fitNow} label="Fit">
            ⊙
          </ZoomControlButton>
        </div>
      ) : null}
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
