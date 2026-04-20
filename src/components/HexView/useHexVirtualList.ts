import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RefObject, UIEvent } from "react";

export interface UseHexVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  threshold?: number;
  /**
   * 초기 렌더 때 실제 뷰포트 높이를 아직 측정하지 못한 상태에서 사용할
   * 추정값. 이 값이 있어야 첫 페인트에서 렌더되는 행 수가 유한해진다.
   */
  initialViewportHeight?: number;
}

export interface UseHexVirtualListReturn {
  enabled: boolean;
  startIndex: number;
  endIndex: number;
  paddingTop: number;
  paddingBottom: number;
  viewportRef: RefObject<HTMLDivElement>;
  onScroll: (e: UIEvent<HTMLElement>) => void;
  viewportHeight: number;
}

/**
 * HexView 전용 행 가상화 훅.
 * - viewport 크기는 내부 ref 에서 직접 읽어 ResizeObserver 로 추적.
 * - threshold 행 이상일 때만 활성화되고, 그 미만에서는 전체 행을 렌더한다.
 */
export function useHexVirtualList(
  options: UseHexVirtualListOptions,
): UseHexVirtualListReturn {
  const {
    itemCount,
    itemHeight,
    overscan = 8,
    threshold = 512,
    initialViewportHeight = 600,
  } = options;

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h > 0) setViewportHeight(h);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // viewportHeight 가 아직 측정되지 않아도 첫 렌더가 무한 행을 만들지 않도록
  // 추정값을 섞어쓴다. 측정 후에는 실측값이 우선.
  const effectiveHeight =
    viewportHeight > 0 ? viewportHeight : initialViewportHeight;
  const enabled = itemCount >= threshold && itemHeight > 0;
  const visibleCount =
    itemHeight > 0 ? Math.ceil(effectiveHeight / itemHeight) : 0;

  const startIndex = useMemo(() => {
    if (!enabled) return 0;
    return Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  }, [enabled, scrollTop, itemHeight, overscan]);

  const endIndex = useMemo(() => {
    if (!enabled) return itemCount;
    const raw = Math.floor(scrollTop / itemHeight) + visibleCount;
    return Math.min(itemCount, raw + overscan);
  }, [enabled, scrollTop, itemHeight, visibleCount, itemCount, overscan]);

  const paddingTop = enabled ? startIndex * itemHeight : 0;
  const paddingBottom = enabled
    ? Math.max(0, (itemCount - endIndex) * itemHeight)
    : 0;

  const onScroll = useCallback((e: UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    enabled,
    startIndex,
    endIndex,
    paddingTop,
    paddingBottom,
    viewportRef,
    onScroll,
    viewportHeight,
  };
}
