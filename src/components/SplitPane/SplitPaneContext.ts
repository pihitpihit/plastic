import { createContext, useContext } from "react";
import type {
  SplitPaneCollapsible,
  SplitPaneDirection,
  SplitPaneTheme,
} from "./SplitPane.types";

export interface SplitPaneContextValue {
  direction: SplitPaneDirection;
  sizePx: number;
  containerPx: number;
  minPx: number;
  maxPx: number;
  collapsible: SplitPaneCollapsible;
  collapsedSize: number;
  isCollapsedStart: boolean;
  isCollapsedEnd: boolean;
  disabled: boolean;
  theme: SplitPaneTheme;
  onDividerPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDividerKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  toggleCollapse: (which: "start" | "end") => void;
  isDragging: boolean;
  rtl: boolean;
  dividerRef: React.MutableRefObject<HTMLDivElement | null>;
  startPaneId: string;
  endPaneId: string;
  dividerLabel: string;
}

export const SplitPaneContext = createContext<SplitPaneContextValue | null>(null);

export function useSplitPaneContext(): SplitPaneContextValue {
  const ctx = useContext(SplitPaneContext);
  if (ctx === null) {
    throw new Error(
      "SplitPane compound components must be used within <SplitPane.Root>",
    );
  }
  return ctx;
}
