import { useCallback, useMemo, useRef, useState } from "react";
import type { RefObject, UIEvent } from "react";

export interface UseVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  viewportHeight: number;
  overscan?: number | undefined;
  threshold?: number | undefined;
}

export interface UseVirtualListReturn {
  enabled: boolean;
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
  visibleCount: number;
  onScroll: (e: UIEvent<HTMLElement>) => void;
  scrollTo: (index: number) => void;
  scrollRef: RefObject<HTMLDivElement | null>;
}

export function useVirtualList(
  options: UseVirtualListOptions,
): UseVirtualListReturn {
  const { itemCount, itemHeight, viewportHeight, overscan = 5, threshold = 100 } =
    options;

  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const enabled = itemCount >= threshold && itemHeight > 0 && viewportHeight > 0;

  const totalHeight = itemCount * itemHeight;
  const visibleCount = itemHeight > 0 ? Math.ceil(viewportHeight / itemHeight) : 0;

  const startIndex = useMemo(() => {
    if (!enabled) return 0;
    const raw = Math.floor(scrollTop / itemHeight);
    return Math.max(0, raw - overscan);
  }, [enabled, scrollTop, itemHeight, overscan]);

  const endIndex = useMemo(() => {
    if (!enabled) return itemCount;
    const raw = Math.floor(scrollTop / itemHeight) + visibleCount;
    return Math.min(itemCount, raw + overscan);
  }, [enabled, scrollTop, itemHeight, visibleCount, itemCount, overscan]);

  const offsetY = enabled ? startIndex * itemHeight : 0;

  const onScroll = useCallback((e: UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const scrollTo = useCallback(
    (index: number) => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    },
    [itemHeight],
  );

  return {
    enabled,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
    visibleCount,
    onScroll,
    scrollTo,
    scrollRef,
  };
}
