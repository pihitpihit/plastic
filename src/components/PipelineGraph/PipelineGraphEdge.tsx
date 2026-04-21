import { memo } from "react";

import type { PipelineGraphTheme } from "./PipelineGraph.types";
import { catmullRom } from "./PipelineGraph.utils";
import type { LaidOutEdge } from "./useGraphLayout";
import { palette as themePalette, Z } from "./theme";

export interface PipelineGraphEdgeProps {
  edgePoints: LaidOutEdge[];
  bounds: { width: number; height: number };
  theme: PipelineGraphTheme;
}

const MARKER_ID = "pg-arrow";

function dashFor(variant: "solid" | "dashed" | "dotted" | undefined): string | undefined {
  if (variant === "dashed") return "6 4";
  if (variant === "dotted") return "2 3";
  return undefined;
}

function PipelineGraphEdgeImpl(props: PipelineGraphEdgeProps) {
  const { edgePoints, bounds, theme } = props;
  const p = themePalette[theme];

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
        return (
          <g key={`${e.from}->${e.to}`} style={{ pointerEvents: "stroke" }}>
            <path
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={1.5}
              strokeDasharray={dash}
              markerEnd={`url(#${MARKER_ID})`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export const PipelineGraphEdge = memo(PipelineGraphEdgeImpl);
