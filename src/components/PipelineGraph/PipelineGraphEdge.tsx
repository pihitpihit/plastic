import { memo, type MouseEvent as ReactMouseEvent } from "react";

import type { PipelineEdge, PipelineGraphTheme } from "./PipelineGraph.types";
import { catmullRom, midPoint } from "./PipelineGraph.utils";
import type { LaidOutEdge } from "./useGraphLayout";
import { palette as themePalette, Z } from "./theme";

export interface HoveredEdge {
  from: string;
  to: string;
  raws: PipelineEdge[];
  mid: { x: number; y: number };
}

export interface PipelineGraphEdgeProps {
  edgePoints: LaidOutEdge[];
  bounds: { width: number; height: number };
  theme: PipelineGraphTheme;
  onHoverChange?: (edge: HoveredEdge | null) => void;
}

const MARKER_ID = "pg-arrow";

function dashFor(variant: "solid" | "dashed" | "dotted" | undefined): string | undefined {
  if (variant === "dashed") return "6 4";
  if (variant === "dotted") return "2 3";
  return undefined;
}

function PipelineGraphEdgeImpl(props: PipelineGraphEdgeProps) {
  const { edgePoints, bounds, theme, onHoverChange } = props;
  const p = themePalette[theme];

  const handleEnter = (e: ReactMouseEvent<SVGGElement>, edge: LaidOutEdge) => {
    e.currentTarget.dataset.hover = "1";
    const path = e.currentTarget.querySelector("path");
    if (path) path.setAttribute("stroke-width", "2.5");
    onHoverChange?.({
      from: edge.from,
      to: edge.to,
      raws: edge.raws,
      mid: midPoint(edge.points),
    });
  };
  const handleLeave = (e: ReactMouseEvent<SVGGElement>) => {
    delete e.currentTarget.dataset.hover;
    const path = e.currentTarget.querySelector("path");
    if (path) path.setAttribute("stroke-width", "1.5");
    onHoverChange?.(null);
  };

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: bounds.width,
        height: bounds.height,
        overflow: "visible",
        pointerEvents: "none",
        zIndex: Z.edges,
      }}
      aria-hidden
    >
      <defs>
        <marker
          id={MARKER_ID}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={8}
          markerHeight={8}
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={p.edgeFg} />
        </marker>
      </defs>
      {edgePoints.map((e) => {
        const d = catmullRom(e.points);
        if (!d) return null;
        const raw0 = e.raws[0];
        const stroke = raw0?.color ?? p.edgeFg;
        const dash = dashFor(raw0?.variant);
        const fan = raw0?.fanOut;
        const showDupBadge = e.raws.length > 1;
        const mid = midPoint(e.points);
        return (
          <g
            key={`${e.from}->${e.to}`}
            data-edge="1"
            style={{ pointerEvents: "stroke" }}
            onMouseEnter={(ev) => handleEnter(ev, e)}
            onMouseLeave={handleLeave}
          >
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
              strokeDasharray={dash}
              markerEnd={`url(#${MARKER_ID})`}
            />
            {fan ? (
              <g transform={`translate(${mid.x}, ${mid.y})`} style={{ pointerEvents: "all" }}>
                <rect
                  x={-20}
                  y={-10}
                  width={40}
                  height={20}
                  rx={10}
                  fill={p.cardBg}
                  stroke={p.edgeFg}
                />
                <text
                  textAnchor="middle"
                  y={4}
                  fontSize={10}
                  fontWeight={600}
                  fill={p.fg}
                >{`×${fan.count}`}</text>
                {fan.label ? (
                  <text textAnchor="middle" y={24} fontSize={10} fill={p.mutedFg}>
                    {fan.label}
                  </text>
                ) : null}
              </g>
            ) : showDupBadge ? (
              <g transform={`translate(${mid.x}, ${mid.y - 14})`} style={{ pointerEvents: "all" }}>
                <circle r={8} fill={p.cardBg} stroke={p.edgeFg} />
                <text
                  textAnchor="middle"
                  y={3}
                  fontSize={10}
                  fontWeight={600}
                  fill={p.fg}
                >
                  {e.raws.length}
                </text>
              </g>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export const PipelineGraphEdge = memo(PipelineGraphEdgeImpl);
