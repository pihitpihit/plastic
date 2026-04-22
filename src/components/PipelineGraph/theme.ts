import type { PipelineGraphTheme, PipelineNodeStatus } from "./PipelineGraph.types";

export interface PipelinePalette {
  canvasBg: string;
  cardBg: string;
  border: string;
  fg: string;
  mutedFg: string;
  selectionRing: string;
  edgeFg: string;
  edgeFgDim: string;
  edgeArrowFill: string;
  clusterBg: string;
  clusterBorder: string;
  inspectorBg: string;
  inspectorBorder: string;
  tooltipBg: string;
  tooltipFg: string;
  controlBg: string;
  controlFg: string;
  controlHoverBg: string;
}

export interface StatusTokens {
  accent: string;
  fg: string;
  icon: string;
}

export const palette: Record<PipelineGraphTheme, PipelinePalette> = {
  light: {
    canvasBg: "#f9fafb",
    cardBg: "#ffffff",
    border: "rgba(0,0,0,0.10)",
    fg: "#111827",
    mutedFg: "#6b7280",
    selectionRing: "#2563eb",
    edgeFg: "rgba(0,0,0,0.45)",
    edgeFgDim: "rgba(0,0,0,0.18)",
    edgeArrowFill: "#4b5563",
    clusterBg: "rgba(0,0,0,0.025)",
    clusterBorder: "rgba(0,0,0,0.10)",
    inspectorBg: "#ffffff",
    inspectorBorder: "rgba(0,0,0,0.08)",
    tooltipBg: "rgba(17,24,39,0.95)",
    tooltipFg: "#f9fafb",
    controlBg: "rgba(255,255,255,0.9)",
    controlFg: "#374151",
    controlHoverBg: "rgba(0,0,0,0.06)",
  },
  dark: {
    canvasBg: "#0b0f19",
    cardBg: "#1a1f2e",
    border: "rgba(255,255,255,0.10)",
    fg: "#e5e7eb",
    mutedFg: "#9ca3af",
    selectionRing: "#60a5fa",
    edgeFg: "rgba(255,255,255,0.55)",
    edgeFgDim: "rgba(255,255,255,0.22)",
    edgeArrowFill: "#cbd5e1",
    clusterBg: "rgba(255,255,255,0.03)",
    clusterBorder: "rgba(255,255,255,0.10)",
    inspectorBg: "#111827",
    inspectorBorder: "rgba(255,255,255,0.10)",
    tooltipBg: "rgba(249,250,251,0.95)",
    tooltipFg: "#111827",
    controlBg: "rgba(26,31,46,0.9)",
    controlFg: "#d1d5db",
    controlHoverBg: "rgba(255,255,255,0.06)",
  },
};

export const statusPalette: Record<PipelineGraphTheme, Record<PipelineNodeStatus, StatusTokens>> = {
  light: {
    pending: { accent: "#9ca3af", fg: "#374151", icon: "●" },
    running: { accent: "#3b82f6", fg: "#1e3a8a", icon: "▶" },
    success: { accent: "#10b981", fg: "#065f46", icon: "✓" },
    failed: { accent: "#ef4444", fg: "#7f1d1d", icon: "✕" },
    skipped: { accent: "#d1d5db", fg: "#6b7280", icon: "↷" },
    cancelled: { accent: "#f59e0b", fg: "#92400e", icon: "⏹" },
  },
  dark: {
    pending: { accent: "#6b7280", fg: "#9ca3af", icon: "●" },
    running: { accent: "#60a5fa", fg: "#93c5fd", icon: "▶" },
    success: { accent: "#34d399", fg: "#6ee7b7", icon: "✓" },
    failed: { accent: "#f87171", fg: "#fca5a5", icon: "✕" },
    skipped: { accent: "#9ca3af", fg: "#d1d5db", icon: "↷" },
    cancelled: { accent: "#fbbf24", fg: "#fcd34d", icon: "⏹" },
  },
};

export const Z = {
  cluster: 0,
  nodes: 1,
  edges: 2,
  controls: 10,
  inspector: 20,
  tooltip: 30,
} as const;
