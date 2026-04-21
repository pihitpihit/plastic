import { useMemo } from "react";
import * as dagre from "@dagrejs/dagre";

import type { PipelineEdge, PipelineGraphDirection } from "./PipelineGraph.types";
import {
  buildVisibleGraph,
  measureNode,
  type ClusterInfo,
  type Normalized,
  type VisibleNode,
} from "./PipelineGraph.utils";

export interface UseGraphLayoutOptions {
  normalized: Normalized;
  expanded: Set<string>;
  direction: PipelineGraphDirection;
  rankSep: number;
  nodeSep: number;
  clusterPadding: number;
}

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LaidOutEdge {
  from: string;
  to: string;
  points: { x: number; y: number }[];
  raws: PipelineEdge[];
}

export interface GraphLayout {
  positions: LaidOutNode[];
  clusterBounds: LaidOutNode[];
  edgePoints: LaidOutEdge[];
  bounds: { width: number; height: number };
  visible: VisibleNode[];
  clusters: ClusterInfo[];
}

const EMPTY: GraphLayout = {
  positions: [],
  clusterBounds: [],
  edgePoints: [],
  bounds: { width: 0, height: 0 },
  visible: [],
  clusters: [],
};

export function useGraphLayout(opts: UseGraphLayoutOptions): GraphLayout {
  const { normalized, expanded, direction, rankSep, nodeSep, clusterPadding } = opts;

  return useMemo<GraphLayout>(() => {
    if (normalized.topoNodes.length === 0) return EMPTY;

    const vg = buildVisibleGraph(normalized, expanded);
    if (vg.visible.length === 0) return EMPTY;

    const g = new dagre.graphlib.Graph({ compound: true, multigraph: false });
    g.setGraph({
      rankdir: direction,
      ranksep: rankSep,
      nodesep: nodeSep,
      marginx: 16,
      marginy: 16,
    });
    g.setDefaultEdgeLabel(() => ({}));

    for (const n of vg.visible) {
      const s = measureNode(n);
      g.setNode(n.id, { width: s.w, height: s.h });
    }

    for (const c of vg.clusters) {
      g.setNode(c.id, { paddingX: clusterPadding, paddingY: clusterPadding });
    }
    for (const c of vg.clusters) {
      for (const child of c.childIds) g.setParent(child, c.id);
    }

    for (const e of vg.visibleEdges) {
      g.setEdge(e.from, e.to, {});
    }

    dagre.layout(g);

    const positions: LaidOutNode[] = vg.visible.map((n) => {
      const o = g.node(n.id);
      return {
        id: n.id,
        x: o.x - o.width / 2,
        y: o.y - o.height / 2,
        w: o.width,
        h: o.height,
      };
    });

    const clusterBounds: LaidOutNode[] = vg.clusters.map((c) => {
      const o = g.node(c.id);
      return {
        id: c.id,
        x: o.x - o.width / 2,
        y: o.y - o.height / 2,
        w: o.width,
        h: o.height,
      };
    });

    const edgePoints: LaidOutEdge[] = vg.visibleEdges.map((e) => {
      const o = g.edge(e.from, e.to);
      return {
        from: e.from,
        to: e.to,
        points: o?.points ?? [],
        raws: e.raws,
      };
    });

    const gr = g.graph();
    const bounds = {
      width: gr.width ?? 0,
      height: gr.height ?? 0,
    };

    return {
      positions,
      clusterBounds,
      edgePoints,
      bounds,
      visible: vg.visible,
      clusters: vg.clusters,
    };
  }, [normalized, expanded, direction, rankSep, nodeSep, clusterPadding]);
}
