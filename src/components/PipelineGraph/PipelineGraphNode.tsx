import { memo, type MouseEvent } from "react";

import type { PipelineGraphTheme, PipelineNode } from "./PipelineGraph.types";
import { formatDuration, type NormalizedNode, type VisibleNode } from "./PipelineGraph.utils";
import { palette as themePalette, statusPalette } from "./theme";

export interface PipelineGraphNodeProps {
  node: VisibleNode;
  normalized: NormalizedNode;
  x: number;
  y: number;
  w: number;
  h: number;
  selected: boolean;
  expanded: boolean;
  theme: PipelineGraphTheme;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDoubleClick?: (node: PipelineNode) => void;
}

function PipelineGraphNodeImpl(props: PipelineGraphNodeProps) {
  const { node, normalized, x, y, w, h, selected, theme, onSelect, onDoubleClick } = props;
  const p = themePalette[theme];
  const s = statusPalette[theme][normalized.status];

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect(node.id);
  };
  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDoubleClick?.(normalized.raw);
  };

  return (
    <div
      role="button"
      tabIndex={-1}
      data-node-id={node.id}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        border: `1px solid ${p.border}`,
        borderRadius: 8,
        background: p.cardBg,
        color: p.fg,
        overflow: "hidden",
        cursor: "pointer",
        outline: selected ? `2px solid ${p.selectionRing}` : "none",
        outlineOffset: 2,
        transition: "outline 120ms",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 4,
          height: "100%",
          background: s.accent,
        }}
      />
      <header
        style={{
          padding: "8px 10px 6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
        }}
      >
        <span aria-hidden style={{ color: s.accent }}>
          {s.icon}
        </span>
        <span
          style={{
            flex: 1,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {normalized.label}
        </span>
      </header>
      <div style={{ padding: "0 14px", fontSize: 11, color: p.mutedFg }} />
      <footer style={{ padding: "4px 14px 8px", fontSize: 10, color: p.mutedFg }}>
        {formatDuration(normalized)}
      </footer>
    </div>
  );
}

export const PipelineGraphNode = memo(PipelineGraphNodeImpl);
