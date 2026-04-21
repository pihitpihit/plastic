import { Fragment, memo, useEffect, type MouseEvent } from "react";

import type { PipelineGraphTheme, PipelineNode } from "./PipelineGraph.types";
import { formatDuration, type NormalizedNode, type VisibleNode } from "./PipelineGraph.utils";
import { palette as themePalette, statusPalette } from "./theme";

const INJECTED = new WeakSet<Document>();
function injectOnce(doc: Document): void {
  if (INJECTED.has(doc)) return;
  INJECTED.add(doc);
  const s = doc.createElement("style");
  s.setAttribute("data-pg-style", "1");
  s.textContent = `
@keyframes pg-pulse { 0%,100% { opacity: .4 } 50% { opacity: 1 } }
[data-pg-running="1"] { animation: pg-pulse 1.2s ease-in-out infinite; }
`;
  doc.head.appendChild(s);
}

export interface PipelineGraphNodeProps {
  node: VisibleNode;
  normalized: NormalizedNode;
  byId: Map<string, NormalizedNode>;
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

interface ChildAgg {
  total: number;
  counts: Record<string, number>;
  minStart: number | null;
  maxEnd: number | null;
}

function aggregateChildren(parent: NormalizedNode, byId: Map<string, NormalizedNode>): ChildAgg {
  const counts: Record<string, number> = {
    success: 0,
    failed: 0,
    running: 0,
    pending: 0,
    skipped: 0,
    cancelled: 0,
  };
  let minStart: number | null = null;
  let maxEnd: number | null = null;
  let total = 0;
  for (const id of parent.children) {
    const c = byId.get(id);
    if (!c) continue;
    total++;
    counts[c.status] = (counts[c.status] ?? 0) + 1;
    const t = c.timing;
    if (t?.startedAt != null) {
      if (minStart == null || t.startedAt < minStart) minStart = t.startedAt;
    }
    if (t?.endedAt != null) {
      if (maxEnd == null || t.endedAt > maxEnd) maxEnd = t.endedAt;
    }
  }
  return { total, counts, minStart, maxEnd };
}

function formatAggregate(agg: ChildAgg): string {
  if (agg.total === 0) return "empty";
  const parts: string[] = [`${agg.total} steps`];
  const keys: Array<[string, string]> = [
    ["success", "succeeded"],
    ["failed", "failed"],
    ["running", "running"],
    ["pending", "pending"],
    ["skipped", "skipped"],
    ["cancelled", "cancelled"],
  ];
  for (const [k, label] of keys) {
    const c = agg.counts[k] ?? 0;
    if (c > 0) parts.push(`${c} ${label}`);
  }
  return parts.join(" · ");
}

function PipelineGraphNodeImpl(props: PipelineGraphNodeProps) {
  const {
    node,
    normalized,
    byId,
    x,
    y,
    w,
    h,
    selected,
    expanded,
    theme,
    onSelect,
    onToggleExpand,
    onDoubleClick,
  } = props;
  const p = themePalette[theme];
  const s = statusPalette[theme][normalized.status];
  const accent = normalized.raw.accentColor ?? s.accent;
  const isRunning = normalized.status === "running";
  const kind = node.kind;

  useEffect(() => {
    if (typeof document !== "undefined") injectOnce(document);
  }, []);

  if (expanded && (kind === "group" || kind === "loop")) return null;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onSelect(node.id);
  };
  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDoubleClick?.(normalized.raw);
  };
  const handleToggle = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onToggleExpand(node.id);
  };

  const cardStyle = {
    position: "absolute" as const,
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
    boxSizing: "border-box" as const,
  };

  const agg = kind === "group" ? aggregateChildren(normalized, byId) : null;
  const loopIter = normalized.iterations ?? 0;
  const loopCurrent = normalized.currentIteration ?? 0;
  const loopPct = loopIter > 0 ? Math.min(100, (loopCurrent / loopIter) * 100) : 0;

  const headerIcon =
    kind === "loop" ? "⟳" : kind === "group" ? "▦" : s.icon;

  const loopLabelSuffix =
    kind === "loop"
      ? isRunning
        ? ` (${loopCurrent}/${loopIter})`
        : ` (${loopIter}×)`
      : "";

  const groupFooter = agg
    ? agg.minStart != null && agg.maxEnd != null
      ? `${((agg.maxEnd - agg.minStart) / 1000).toFixed(1)}s total`
      : ""
    : "";

  const stackShadows =
    kind === "loop" ? (
      <Fragment>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: x + 4,
            top: y + 4,
            width: w,
            height: h,
            opacity: 0.5,
            border: `1px solid ${p.border}`,
            borderRadius: 8,
            background: p.cardBg,
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: x + 8,
            top: y + 8,
            width: w,
            height: h,
            opacity: 0.25,
            border: `1px solid ${p.border}`,
            borderRadius: 8,
            background: p.cardBg,
            pointerEvents: "none",
            boxSizing: "border-box",
          }}
        />
      </Fragment>
    ) : null;

  const toggleButton =
    kind === "group" || kind === "loop" ? (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={expanded ? "collapse" : "expand"}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 12,
          color: p.mutedFg,
          padding: "0 2px",
          lineHeight: 1,
        }}
      >
        ▸
      </button>
    ) : null;

  return (
    <Fragment>
      {stackShadows}
      <div
        role="button"
        tabIndex={-1}
        data-node-id={node.id}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={cardStyle}
      >
        <div
          data-pg-running={isRunning ? "1" : "0"}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 4,
            height: "100%",
            background: accent,
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
          <span aria-hidden style={{ color: accent }}>
            {headerIcon}
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
            {loopLabelSuffix}
          </span>
          {toggleButton}
        </header>
        <div style={{ padding: "0 14px", fontSize: 11, color: p.mutedFg }}>
          {kind === "group" && agg ? formatAggregate(agg) : null}
          {kind === "loop" && loopIter > 0 ? (
            <div
              style={{
                marginTop: 4,
                height: 4,
                background: p.border,
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${loopPct}%`,
                  height: "100%",
                  background: accent,
                }}
              />
            </div>
          ) : null}
        </div>
        <footer style={{ padding: "4px 14px 8px", fontSize: 10, color: p.mutedFg }}>
          {kind === "task" ? formatDuration(normalized) : groupFooter}
        </footer>
      </div>
    </Fragment>
  );
}

export const PipelineGraphNode = memo(PipelineGraphNodeImpl);
