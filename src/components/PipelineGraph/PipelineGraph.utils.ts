import type {
  PipelineEdge,
  PipelineNode,
  PipelineNodeKind,
  PipelineNodeStatus,
  PipelineNodeTiming,
  PipelineGraphViewport,
} from "./PipelineGraph.types";

const WARN_PREFIX = "[PipelineGraph]";

function warn(msg: string): void {
  // eslint-disable-next-line no-console
  console.warn(`${WARN_PREFIX} ${msg}`);
}

export interface NormalizedNode {
  id: string;
  label: string;
  kind: PipelineNodeKind;
  status: PipelineNodeStatus;
  parent: string | null;
  children: string[];
  iterations: number | null;
  currentIteration: number | null;
  timing: PipelineNodeTiming | null;
  raw: PipelineNode;
}

export interface Normalized {
  byId: Map<string, NormalizedNode>;
  topoNodes: NormalizedNode[];
  edges: PipelineEdge[];
}

export function normalize(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): Normalized {
  const byId = new Map<string, NormalizedNode>();
  const topoNodes: NormalizedNode[] = [];

  // 1. id 중복 제거 + 1차 변환
  for (const n of nodes) {
    if (byId.has(n.id)) {
      warn(`duplicate node id "${n.id}" — later entry dropped`);
      continue;
    }
    const kind = n.kind ?? "task";
    const iterations = kind === "loop"
      ? (n.iterations ?? (warn(`loop "${n.id}" missing iterations — defaulting to 1`), 1))
      : null;
    const nn: NormalizedNode = {
      id: n.id,
      label: n.label,
      kind,
      status: n.status ?? "pending",
      parent: n.parent ?? null,
      children: n.children ? [...n.children] : [],
      iterations,
      currentIteration: n.currentIteration ?? null,
      timing: n.timing ?? null,
      raw: n,
    };
    byId.set(n.id, nn);
    topoNodes.push(nn);
  }

  // 2. parent/children 양방향 보강 + 불일치 검증
  for (const n of topoNodes) {
    if (n.parent && !byId.has(n.parent)) {
      warn(`node "${n.id}" parent "${n.parent}" not found — promoted to top-level`);
      n.parent = null;
      continue;
    }
    if (n.parent) {
      const p = byId.get(n.parent)!;
      if (!p.children.includes(n.id)) p.children.push(n.id);
    }
  }
  for (const n of topoNodes) {
    if (n.kind !== "group" && n.kind !== "loop") continue;
    for (const childId of n.children) {
      const c = byId.get(childId);
      if (!c) {
        warn(`group "${n.id}" references missing child "${childId}"`);
        continue;
      }
      if (c.parent && c.parent !== n.id) {
        warn(
          `child "${childId}" parent mismatch (${c.parent} vs ${n.id}) — using children array`,
        );
      }
      c.parent = n.id;
    }
  }

  // 3. 엣지 유효성 + cycle 검사 (Kahn)
  const validEdges: PipelineEdge[] = [];
  const inDeg = new Map<string, number>();
  for (const n of topoNodes) inDeg.set(n.id, 0);
  for (const e of edges) {
    if (!byId.has(e.from)) {
      warn(`edge from "${e.from}" — source node not found, dropped`);
      continue;
    }
    if (!byId.has(e.to)) {
      warn(`edge to "${e.to}" — target node not found, dropped`);
      continue;
    }
    validEdges.push(e);
    inDeg.set(e.to, (inDeg.get(e.to) ?? 0) + 1);
  }

  // Kahn: in-degree 0 부터 BFS. 남은 엣지가 cycle 후보.
  const queue: string[] = [];
  const remain = new Map(inDeg);
  for (const [id, d] of remain) if (d === 0) queue.push(id);
  const seen = new Set<string>();
  const outMap = new Map<string, PipelineEdge[]>();
  for (const e of validEdges) {
    const arr = outMap.get(e.from) ?? [];
    arr.push(e);
    outMap.set(e.from, arr);
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    seen.add(id);
    for (const e of outMap.get(id) ?? []) {
      const d = (remain.get(e.to) ?? 0) - 1;
      remain.set(e.to, d);
      if (d === 0) queue.push(e.to);
    }
  }
  const kept: PipelineEdge[] = [];
  for (const e of validEdges) {
    if (seen.has(e.from) && seen.has(e.to)) {
      kept.push(e);
    } else {
      warn(`cycle detected, dropped edge ${e.from}->${e.to}`);
    }
  }

  return { byId, topoNodes, edges: kept };
}

/* ─────────────────────────────────────────────────────────── */

export interface VisibleNode {
  id: string;
  kind: PipelineNodeKind;
  label: string;
}

export interface VisibleEdge {
  from: string;
  to: string;
  raws: PipelineEdge[];
}

export interface ClusterInfo {
  id: string;
  childIds: string[];
  kind: "group" | "loop";
}

export interface VisibleGraph {
  visible: VisibleNode[];
  visibleEdges: VisibleEdge[];
  clusters: ClusterInfo[];
  visibleAncestorOf: Map<string, string>;
}

export function buildVisibleGraph(n: Normalized, expanded: Set<string>): VisibleGraph {
  const visibleAncestorOf = new Map<string, string>();
  for (const node of n.topoNodes) {
    let cur = node.id;
    let ptr: NormalizedNode | null = node;
    while (ptr && ptr.parent) {
      const parent = n.byId.get(ptr.parent);
      if (!parent) break;
      if (!expanded.has(parent.id)) cur = parent.id;
      ptr = parent;
    }
    visibleAncestorOf.set(node.id, cur);
  }

  const shownIds = new Set(visibleAncestorOf.values());
  const visible: VisibleNode[] = [];
  for (const id of shownIds) {
    const nn = n.byId.get(id);
    if (!nn) continue;
    if ((nn.kind === "group" || nn.kind === "loop") && expanded.has(id)) continue;
    visible.push({ id: nn.id, kind: nn.kind, label: nn.label });
  }

  const clusters: ClusterInfo[] = [];
  for (const id of shownIds) {
    const nn = n.byId.get(id);
    if (!nn) continue;
    if ((nn.kind === "group" || nn.kind === "loop") && expanded.has(id)) {
      clusters.push({
        id,
        kind: nn.kind,
        childIds: nn.children.filter((c) => shownIds.has(c)),
      });
    }
  }

  const isExpandedCluster = (id: string): boolean => {
    const nn = n.byId.get(id);
    if (!nn) return false;
    return (nn.kind === "group" || nn.kind === "loop") && expanded.has(id);
  };
  const leafOf = (clusterId: string, preferFirst: boolean): string => {
    const visited = new Set<string>();
    let cur = clusterId;
    while (isExpandedCluster(cur) && !visited.has(cur)) {
      visited.add(cur);
      const cluster = n.byId.get(cur);
      if (!cluster || cluster.children.length === 0) return cur;
      const visibleChildren = cluster.children.filter((c) => shownIds.has(c));
      if (visibleChildren.length === 0) return cur;
      const next = preferFirst
        ? visibleChildren[0]!
        : visibleChildren[visibleChildren.length - 1]!;
      cur = next;
    }
    return cur;
  };

  const seen = new Map<string, VisibleEdge>();
  for (const e of n.edges) {
    let f = visibleAncestorOf.get(e.from) ?? e.from;
    let t = visibleAncestorOf.get(e.to) ?? e.to;
    if (isExpandedCluster(f)) f = leafOf(f, false);
    if (isExpandedCluster(t)) t = leafOf(t, true);
    if (f === t) continue;
    const key = `${f}->${t}`;
    const existing = seen.get(key);
    if (existing) existing.raws.push(e);
    else seen.set(key, { from: f, to: t, raws: [e] });
  }

  return {
    visible,
    visibleEdges: [...seen.values()],
    clusters,
    visibleAncestorOf,
  };
}

/* ─────────────────────────────────────────────────────────── */

export function fmtMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export function formatDuration(n: NormalizedNode): string {
  const t = n.timing;
  if (!t) return "";
  if (t.durationMs != null) return fmtMs(t.durationMs);
  if (t.startedAt != null && t.endedAt != null) return fmtMs(t.endedAt - t.startedAt);
  if (t.startedAt != null) return "running…";
  return "";
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface Point {
  x: number;
  y: number;
}

export function catmullRom(pts: Point[], tension = 0.5): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export function midPoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const mid = Math.floor(points.length / 2);
  return points[mid]!;
}

export function labelPos(points: Point[]): Point {
  const p = midPoint(points);
  return { x: p.x, y: p.y - 6 };
}

export function fit(
  bounds: { width: number; height: number },
  container: { width: number; height: number },
  padding = 40,
): PipelineGraphViewport {
  if (bounds.width <= 0 || bounds.height <= 0 || container.width <= 0 || container.height <= 0) {
    return { x: 0, y: 0, zoom: 1 };
  }
  const zoom = Math.min(
    (container.width - padding * 2) / bounds.width,
    (container.height - padding * 2) / bounds.height,
    1.5,
  );
  const zoomClamped = Math.max(0.25, zoom);
  const x = (container.width - bounds.width * zoomClamped) / 2;
  const y = (container.height - bounds.height * zoomClamped) / 2;
  return { x, y, zoom: zoomClamped };
}

const CHAR_WIDTH = 7.2;
const CARD_PAD_X = 28;

export function measureNode(n: VisibleNode): { w: number; h: number } {
  const labelW = Math.max(96, Math.min(240, n.label.length * CHAR_WIDTH + CARD_PAD_X));
  const baseH = n.kind === "loop" ? 88 : n.kind === "group" ? 76 : 64;
  return { w: labelW, h: baseH };
}

export interface LaidOutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export function nextNodeInDirection(
  currentId: string,
  positions: LaidOutNode[],
  dir: "up" | "down" | "left" | "right",
): string | null {
  const cur = positions.find((p) => p.id === currentId);
  if (!cur) return null;
  const cx = cur.x + cur.w / 2;
  const cy = cur.y + cur.h / 2;
  const isHoriz = dir === "left" || dir === "right";
  const sign = dir === "down" || dir === "right" ? 1 : -1;

  const scored: Array<{ id: string; score: number }> = [];
  for (const p of positions) {
    if (p.id === currentId) continue;
    const px = p.x + p.w / 2;
    const py = p.y + p.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    const primary = isHoriz ? dx : dy;
    if (sign * primary <= 0) continue;
    const primaryD = Math.abs(primary);
    const secondary = isHoriz ? Math.abs(dy) : Math.abs(dx);
    scored.push({ id: p.id, score: primaryD + secondary * 2 });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.id ?? null;
}
