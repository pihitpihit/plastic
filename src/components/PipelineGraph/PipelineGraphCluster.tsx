import { memo, type MouseEvent } from "react";

import type { PipelineGraphTheme } from "./PipelineGraph.types";
import type { NormalizedNode } from "./PipelineGraph.utils";
import { palette as themePalette, Z } from "./theme";

export interface PipelineGraphClusterProps {
  bounds: { id: string; x: number; y: number; w: number; h: number };
  node: NormalizedNode;
  clusterPadding: number;
  theme: PipelineGraphTheme;
  onToggleExpand: (id: string) => void;
}

const HEADER_H = 22;

function PipelineGraphClusterImpl(props: PipelineGraphClusterProps) {
  const { bounds, node, clusterPadding, theme, onToggleExpand } = props;
  const p = themePalette[theme];

  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleExpand(node.id);
  };

  return (
    <div
      data-cluster-id={node.id}
      style={{
        position: "absolute",
        left: bounds.x - clusterPadding,
        top: bounds.y - clusterPadding - HEADER_H,
        width: bounds.w + clusterPadding * 2,
        height: bounds.h + clusterPadding * 2 + HEADER_H,
        background: p.clusterBg,
        border: `1px dashed ${p.clusterBorder}`,
        borderRadius: 10,
        pointerEvents: "none",
        zIndex: Z.cluster,
        boxSizing: "border-box",
      }}
    >
      <div
        data-pg-interactive="1"
        style={{
          position: "absolute",
          top: 4,
          left: 10,
          right: 10,
          height: HEADER_H - 4,
          fontSize: 11,
          color: p.mutedFg,
          display: "flex",
          alignItems: "center",
          gap: 6,
          pointerEvents: "auto",
          overflow: "hidden",
        }}
      >
        <button
          type="button"
          data-pg-interactive="1"
          onClick={handleToggle}
          aria-label="collapse"
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 11,
            color: p.mutedFg,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ▾
        </button>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {node.label}
        </span>
        {node.kind === "loop" && node.iterations != null ? (
          <span style={{ fontVariantNumeric: "tabular-nums" }}>
            ({node.iterations}×)
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const PipelineGraphCluster = memo(PipelineGraphClusterImpl);
